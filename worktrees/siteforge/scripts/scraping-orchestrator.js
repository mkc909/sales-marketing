/**
 * Scraping Pipeline Orchestrator
 * Coordinates the entire scraping and enrichment pipeline
 *
 * Pipeline Flow:
 * 1. Scrape businesses (Google Maps + Facebook)
 * 2. Detect ICP signals
 * 3. Enrich high-value leads
 * 4. Generate ghost profiles
 * 5. Report results
 */

import GoogleMapsScraper from './scrapers/google-maps-scraper.js';
import FacebookScraper from './scrapers/facebook-scraper.js';
import IcpDetector from './icp-detector.js';
import EnrichmentPipeline from './enrichment-pipeline.js';
import GhostProfileGenerator from './ghost-profile-generator.js';

class ScrapingOrchestrator {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;

    // Initialize all components
    this.googleScraper = new GoogleMapsScraper(
      config.googleApiKey || process.env.GOOGLE_MAPS_API_KEY,
      db
    );

    this.facebookScraper = new FacebookScraper(
      config.facebookToken || process.env.FACEBOOK_ACCESS_TOKEN,
      db
    );

    this.icpDetector = new IcpDetector(db);

    this.enrichmentPipeline = new EnrichmentPipeline(db, {
      hunterApiKey: config.hunterApiKey || process.env.HUNTER_API_KEY,
    });

    this.ghostGenerator = new GhostProfileGenerator(db, {
      useAI: config.useAI || false,
      siteBaseUrl: config.siteBaseUrl || process.env.SITE_BASE_URL,
      siteName: config.siteName || process.env.SITE_NAME,
    });
  }

  /**
   * Run complete pipeline for a specific search
   */
  async runPipeline(searchConfig) {
    console.log('\n' + '='.repeat(80));
    console.log('SCRAPING PIPELINE ORCHESTRATOR');
    console.log('='.repeat(80));

    const { query, location, sources = ['google', 'facebook'] } = searchConfig;

    console.log(`\nSearch: "${query}" in ${location}`);
    console.log(`Sources: ${sources.join(', ')}`);

    const results = {
      startTime: Date.now(),
      scraping: {},
      icp: {},
      enrichment: {},
      profiles: {},
      summary: {},
    };

    try {
      // Step 1: Create scraping job
      const jobId = await this.createScrapingJob(query, location, sources);
      console.log(`\n[Job ${jobId}] Created`);

      // Step 2: Scrape businesses
      console.log('\n' + '-'.repeat(80));
      console.log('STEP 1: SCRAPING BUSINESSES');
      console.log('-'.repeat(80));

      if (sources.includes('google')) {
        const googleResults = await this.googleScraper.runJob({
          query,
          location,
          radius: searchConfig.radius || 50000,
          jobId,
        });

        results.scraping.google = googleResults;
      }

      if (sources.includes('facebook')) {
        const facebookResults = await this.facebookScraper.runJob({
          query,
          location,
          category: searchConfig.category || 'LOCAL_BUSINESS',
          jobId,
        });

        results.scraping.facebook = facebookResults;
      }

      // Step 3: Detect ICP signals
      console.log('\n' + '-'.repeat(80));
      console.log('STEP 2: DETECTING ICP SIGNALS');
      console.log('-'.repeat(80));

      results.icp = await this.icpDetector.analyzeBatch(200);

      // Step 4: Enrich high-value leads
      console.log('\n' + '-'.repeat(80));
      console.log('STEP 3: ENRICHING LEADS');
      console.log('-'.repeat(80));

      results.enrichment = await this.enrichmentPipeline.enrichBatch(100);

      // Step 5: Generate ghost profiles
      console.log('\n' + '-'.repeat(80));
      console.log('STEP 4: GENERATING GHOST PROFILES');
      console.log('-'.repeat(80));

      results.profiles = await this.ghostGenerator.generateBatch(50);

      // Step 6: Generate summary
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;
      results.summary = this.generateSummary(results);

      // Print final report
      this.printReport(results);

      // Save pipeline results
      await this.savePipelineResults(jobId, results);

      return results;
    } catch (error) {
      console.error('\n[Pipeline] Error:', error.message);
      throw error;
    }
  }

  /**
   * Create scraping job record
   */
  async createScrapingJob(query, location, sources) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO scraping_jobs (
          job_type, job_name, search_query, location,
          status, priority, created_at, scheduled_at
        ) VALUES (?, ?, ?, ?, 'running', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const result = await stmt.bind(
        'full_pipeline',
        `${query} in ${location}`,
        query,
        location
      ).run();

      return result.meta.last_row_id;
    } catch (error) {
      console.error('[Job] Failed to create job:', error.message);
      return 1; // Default job ID
    }
  }

  /**
   * Save pipeline results
   */
  async savePipelineResults(jobId, results) {
    try {
      const stmt = this.db.prepare(`
        UPDATE scraping_jobs
        SET status = 'completed',
            results_summary = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      await stmt.bind(JSON.stringify(results.summary), jobId).run();
    } catch (error) {
      console.error('[Job] Failed to save results:', error.message);
    }
  }

  /**
   * Generate pipeline summary
   */
  generateSummary(results) {
    const summary = {
      duration_seconds: Math.round(results.duration / 1000),

      // Scraping totals
      total_scraped: 0,
      google_scraped: results.scraping.google?.saved || 0,
      facebook_scraped: results.scraping.facebook?.saved || 0,

      // ICP analysis
      icp_analyzed: results.icp?.analyzed || 0,
      icp_high: results.icp?.high || 0,
      icp_medium: results.icp?.medium || 0,
      icp_low: results.icp?.low || 0,

      // Enrichment
      leads_enriched: results.enrichment?.enriched || 0,
      grade_a: results.enrichment?.gradeA || 0,
      grade_b: results.enrichment?.gradeB || 0,
      grade_c: results.enrichment?.gradeC || 0,
      grade_d: results.enrichment?.gradeD || 0,

      // Profiles
      profiles_generated: results.profiles?.generated || 0,

      // Conversion metrics
      scrape_to_profile_rate: 0,
      icp_match_rate: 0,
    };

    summary.total_scraped = summary.google_scraped + summary.facebook_scraped;

    if (summary.total_scraped > 0) {
      summary.scrape_to_profile_rate = (
        (summary.profiles_generated / summary.total_scraped) *
        100
      ).toFixed(2);
    }

    if (summary.icp_analyzed > 0) {
      summary.icp_match_rate = (
        (summary.icp_high / summary.icp_analyzed) *
        100
      ).toFixed(2);
    }

    return summary;
  }

  /**
   * Print final report
   */
  printReport(results) {
    const s = results.summary;

    console.log('\n' + '='.repeat(80));
    console.log('PIPELINE COMPLETE - FINAL REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 SCRAPING RESULTS:');
    console.log(`   Total Businesses Scraped: ${s.total_scraped}`);
    console.log(`   ├─ Google Maps: ${s.google_scraped}`);
    console.log(`   └─ Facebook: ${s.facebook_scraped}`);

    console.log('\n🎯 ICP ANALYSIS:');
    console.log(`   Total Analyzed: ${s.icp_analyzed}`);
    console.log(`   ├─ High ICP Match: ${s.icp_high} (${s.icp_match_rate}%)`);
    console.log(`   ├─ Medium ICP Match: ${s.icp_medium}`);
    console.log(`   └─ Low ICP Match: ${s.icp_low}`);

    console.log('\n💎 LEAD ENRICHMENT:');
    console.log(`   Total Enriched: ${s.leads_enriched}`);
    console.log(`   ├─ Grade A: ${s.grade_a}`);
    console.log(`   ├─ Grade B: ${s.grade_b}`);
    console.log(`   ├─ Grade C: ${s.grade_c}`);
    console.log(`   └─ Grade D: ${s.grade_d}`);

    console.log('\n👻 GHOST PROFILES:');
    console.log(`   Profiles Generated: ${s.profiles_generated}`);
    console.log(`   Conversion Rate: ${s.scrape_to_profile_rate}%`);

    console.log('\n⏱️  PERFORMANCE:');
    console.log(`   Total Duration: ${s.duration_seconds}s`);
    console.log(`   Throughput: ${(s.total_scraped / (s.duration_seconds / 60)).toFixed(1)} businesses/minute`);

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Run daily automation
   */
  async runDailyAutomation() {
    console.log('\n🤖 DAILY AUTOMATION STARTED');

    // Predefined searches for Puerto Rico
    const searches = [
      { query: 'plumber', location: 'San Juan, PR', sources: ['google', 'facebook'] },
      { query: 'electrician', location: 'Bayamón, PR', sources: ['google', 'facebook'] },
      { query: 'food truck', location: 'Ponce, PR', sources: ['google'] },
      { query: 'landscaper', location: 'Caguas, PR', sources: ['google', 'facebook'] },
      { query: 'contractor', location: 'Carolina, PR', sources: ['google'] },
    ];

    const allResults = [];

    for (const search of searches) {
      try {
        const results = await this.runPipeline(search);
        allResults.push(results);

        // Wait 5 minutes between searches to respect rate limits
        console.log('\n⏳ Waiting 5 minutes before next search...');
        await this.sleep(5 * 60 * 1000);
      } catch (error) {
        console.error(`\n❌ Search failed: ${search.query} in ${search.location}`, error.message);
      }
    }

    // Generate daily report
    this.printDailyReport(allResults);

    return allResults;
  }

  /**
   * Print daily automation report
   */
  printDailyReport(allResults) {
    console.log('\n' + '='.repeat(80));
    console.log('DAILY AUTOMATION REPORT');
    console.log('='.repeat(80));

    const totals = {
      searches: allResults.length,
      scraped: 0,
      icpHigh: 0,
      enriched: 0,
      profiles: 0,
    };

    allResults.forEach((result) => {
      totals.scraped += result.summary.total_scraped;
      totals.icpHigh += result.summary.icp_high;
      totals.enriched += result.summary.leads_enriched;
      totals.profiles += result.summary.profiles_generated;
    });

    console.log(`\n✅ Total Searches Completed: ${totals.searches}`);
    console.log(`📊 Total Businesses Scraped: ${totals.scraped}`);
    console.log(`🎯 High ICP Matches: ${totals.icpHigh}`);
    console.log(`💎 Leads Enriched: ${totals.enriched}`);
    console.log(`👻 Ghost Profiles Generated: ${totals.profiles}`);
    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Get pipeline statistics
   */
  async getStatistics() {
    try {
      const stats = {};

      // Total businesses scraped
      const scrapedStmt = this.db.prepare(`
        SELECT
          source,
          COUNT(*) as count,
          COUNT(CASE WHEN website IS NULL THEN 1 END) as no_website
        FROM raw_business_data
        GROUP BY source
      `);
      stats.scraped = await scrapedStmt.all();

      // ICP distribution
      const icpStmt = this.db.prepare(`
        SELECT
          icp_category,
          COUNT(*) as count,
          AVG(icp_score) as avg_score
        FROM icp_signals
        GROUP BY icp_category
      `);
      stats.icp = await icpStmt.all();

      // Lead grades
      const leadsStmt = this.db.prepare(`
        SELECT
          lead_grade,
          COUNT(*) as count,
          AVG(lead_score) as avg_score,
          AVG(conversion_probability) as avg_conversion
        FROM enriched_leads
        GROUP BY lead_grade
      `);
      stats.leads = await leadsStmt.all();

      // Ghost profiles
      const profilesStmt = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN published = 1 THEN 1 END) as published,
          COUNT(CASE WHEN is_claimed = 1 THEN 1 END) as claimed,
          AVG(view_count) as avg_views,
          AVG(click_count) as avg_clicks
        FROM ghost_profiles
      `);
      stats.profiles = await profilesStmt.first();

      return stats;
    } catch (error) {
      console.error('[Stats] Error:', error.message);
      return null;
    }
  }

  /**
   * Utility: Sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// CLI Usage
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (command === 'help') {
    console.log(`
Scraping Pipeline Orchestrator

Commands:
  run <query> <location>    Run single pipeline
  daily                     Run daily automation
  stats                     Show pipeline statistics

Examples:
  node scraping-orchestrator.js run "plumber" "San Juan, PR"
  node scraping-orchestrator.js daily
  node scraping-orchestrator.js stats
    `);
    process.exit(0);
  }

  // Initialize orchestrator (database connection would be passed in real usage)
  const orchestrator = new ScrapingOrchestrator(null, {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    facebookToken: process.env.FACEBOOK_ACCESS_TOKEN,
    hunterApiKey: process.env.HUNTER_API_KEY,
    siteBaseUrl: process.env.SITE_BASE_URL || 'https://estateflow.com',
    siteName: process.env.SITE_NAME || 'EstateFlow',
  });

  if (command === 'run') {
    const query = args[1];
    const location = args[2];

    if (!query || !location) {
      console.error('Error: query and location required');
      console.log('Usage: node scraping-orchestrator.js run <query> <location>');
      process.exit(1);
    }

    await orchestrator.runPipeline({ query, location });
  } else if (command === 'daily') {
    await orchestrator.runDailyAutomation();
  } else if (command === 'stats') {
    const stats = await orchestrator.getStatistics();
    console.log('\n📊 PIPELINE STATISTICS:\n');
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.error(`Error: Unknown command "${command}"`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ScrapingOrchestrator;
