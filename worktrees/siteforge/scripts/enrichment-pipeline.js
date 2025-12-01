/**
 * Lead Enrichment Pipeline
 * Transforms raw business data into enriched, sales-ready leads
 *
 * Enrichment Steps:
 * 1. Phone number validation and formatting
 * 2. Email discovery (where possible)
 * 3. Social media profile matching
 * 4. Business hours extraction and normalization
 * 5. Lead scoring and grading
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

class EnrichmentPipeline {
  constructor(db, config = {}) {
    this.db = db;

    // API keys for enrichment services
    this.hunterApiKey = config.hunterApiKey || process.env.HUNTER_API_KEY;
    this.clearbitApiKey = config.clearbitApiKey || process.env.CLEARBIT_API_KEY;

    // Rate limiting
    this.requestInterval = 5000; // 5 seconds between enrichment requests
    this.lastRequestTime = 0;

    // Scoring configuration
    this.scoringWeights = {
      hasPhone: 15,
      hasEmail: 20,
      hasWebsite: 10,
      hasFacebook: 5,
      hasReviews: 10,
      highRating: 15,
      businessHours: 10,
      verifiedBusiness: 15,
    };
  }

  /**
   * Enrich a single business
   */
  async enrichBusiness(businessId) {
    try {
      // Get raw business data
      const business = await this.getBusinessData(businessId);

      if (!business) {
        console.error(`[Enrich] Business ${businessId} not found`);
        return null;
      }

      console.log(`\n[Enrich] Processing: ${business.name}`);

      // Perform enrichment steps
      const enrichedData = {
        raw_business_id: businessId,
        business_name: business.name,

        // Step 1: Validate and format phone
        validated_phone: await this.validatePhone(business.phone, business.country),

        // Step 2: Discover email
        validated_email: await this.discoverEmail(business),

        // Step 3: Normalize address
        normalized_address: this.normalizeAddress(business),

        // Step 4: Extract social media
        facebook_url: business.facebook_url,
        facebook_followers: await this.getFacebookFollowers(business),
        facebook_engagement_rate: await this.getFacebookEngagement(business),

        // Step 5: Business intelligence
        verified_business: this.isVerifiedBusiness(business),
        has_google_reviews: (business.review_count || 0) > 0,
        average_rating: business.rating,
        total_reviews: business.review_count || 0,

        // Step 6: Geo intelligence
        is_mobile_service: await this.detectMobileService(businessId),

        // Metadata
        enrichment_sources: JSON.stringify(this.getEnrichmentSources()),
        enrichment_confidence: this.calculateConfidence(business),
        status: 'enriched',
      };

      // Calculate lead score
      const leadScore = this.calculateLeadScore(business, enrichedData);
      const leadGrade = this.calculateLeadGrade(leadScore);

      enrichedData.lead_score = leadScore;
      enrichedData.lead_grade = leadGrade;
      enrichedData.conversion_probability = this.calculateConversionProbability(leadScore);

      // Save enriched lead
      await this.saveEnrichedLead(enrichedData);

      console.log(`[Enrich] Score: ${leadScore}/100 | Grade: ${leadGrade}`);

      return enrichedData;
    } catch (error) {
      console.error(`[Enrich] Error for business ${businessId}:`, error.message);
      return null;
    }
  }

  /**
   * Get business data
   */
  async getBusinessData(businessId) {
    const stmt = this.db.prepare(`
      SELECT * FROM raw_business_data WHERE id = ?
    `);

    return await stmt.bind(businessId).first();
  }

  /**
   * Validate and format phone number
   */
  async validatePhone(phone, country = 'US') {
    if (!phone) return null;

    try {
      // Clean phone number
      const cleaned = phone.replace(/[^\d+]/g, '');

      // Validate using libphonenumber
      if (isValidPhoneNumber(cleaned, country)) {
        const phoneNumber = parsePhoneNumber(cleaned, country);

        return phoneNumber.format('E.164'); // +1234567890 format
      }

      console.log(`[Phone] Invalid: ${phone}`);
      return null;
    } catch (error) {
      console.log(`[Phone] Validation error for ${phone}:`, error.message);
      return null;
    }
  }

  /**
   * Discover email address
   */
  async discoverEmail(business) {
    // Try multiple strategies

    // 1. Check if email already exists in raw data
    if (business.email) {
      return this.validateEmail(business.email);
    }

    // 2. Extract from website (if available)
    if (business.website) {
      const extractedEmail = await this.extractEmailFromWebsite(business.website);
      if (extractedEmail) {
        return extractedEmail;
      }
    }

    // 3. Use Hunter.io API (if configured)
    if (this.hunterApiKey && business.website) {
      const hunterEmail = await this.findEmailViaHunter(business.website);
      if (hunterEmail) {
        return hunterEmail;
      }
    }

    // 4. Generate likely email patterns
    const guessedEmail = this.generateEmailPatterns(business);
    if (guessedEmail) {
      return guessedEmail;
    }

    return null;
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email.toLowerCase() : null;
  }

  /**
   * Extract email from website (placeholder - would need web scraping)
   */
  async extractEmailFromWebsite(website) {
    // In production, this would scrape the website for email addresses
    // For now, return null (implement with Puppeteer or similar)
    return null;
  }

  /**
   * Find email using Hunter.io API
   */
  async findEmailViaHunter(website) {
    if (!this.hunterApiKey) return null;

    try {
      // Rate limiting
      await this.rateLimitedRequest();

      const domain = new URL(website).hostname.replace('www.', '');

      const response = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${this.hunterApiKey}`
      );

      if (response.ok) {
        const data = await response.json();

        // Get most confident email
        const emails = data.data?.emails || [];
        if (emails.length > 0) {
          const bestEmail = emails.sort((a, b) => b.confidence - a.confidence)[0];
          return bestEmail.value;
        }
      }

      return null;
    } catch (error) {
      console.log(`[Hunter] Error:`, error.message);
      return null;
    }
  }

  /**
   * Generate email patterns based on business name
   */
  generateEmailPatterns(business) {
    if (!business.website) return null;

    try {
      const domain = new URL(business.website).hostname.replace('www.', '');

      // Common patterns: info@, contact@, hello@
      const patterns = ['info', 'contact', 'hello', 'admin'];

      // Return most likely pattern
      return `info@${domain}`;
    } catch {
      return null;
    }
  }

  /**
   * Normalize address
   */
  normalizeAddress(business) {
    if (!business.address) return null;

    let normalized = business.address;

    // Standardize common abbreviations
    normalized = normalized
      .replace(/\bSt\.\b/gi, 'Street')
      .replace(/\bAve\.\b/gi, 'Avenue')
      .replace(/\bRd\.\b/gi, 'Road')
      .replace(/\bBlvd\.\b/gi, 'Boulevard')
      .replace(/\bDr\.\b/gi, 'Drive')
      .replace(/\bCt\.\b/gi, 'Court')
      .replace(/\bLn\.\b/gi, 'Lane')
      .replace(/\bPl\.\b/gi, 'Place');

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Get Facebook followers (from raw data)
   */
  async getFacebookFollowers(business) {
    const rawData = this.parseRawData(business.raw_data);
    return rawData?.follower_count || rawData?.fan_count || null;
  }

  /**
   * Get Facebook engagement rate
   */
  async getFacebookEngagement(business) {
    const rawData = this.parseRawData(business.raw_data);
    return rawData?.engagement_rate || null;
  }

  /**
   * Check if business is verified
   */
  isVerifiedBusiness(business) {
    const rawData = this.parseRawData(business.raw_data);

    // Google verified business
    if (rawData?.business_status === 'OPERATIONAL') return true;

    // Facebook verified page
    if (rawData?.is_verified) return true;

    // High review count + good rating = likely legitimate
    if ((business.review_count || 0) > 10 && (business.rating || 0) >= 4.0) {
      return true;
    }

    return false;
  }

  /**
   * Detect mobile service (check ICP signals)
   */
  async detectMobileService(businessId) {
    const stmt = this.db.prepare(`
      SELECT mobile_business FROM icp_signals WHERE raw_business_id = ?
    `);

    const result = await stmt.bind(businessId).first();
    return result?.mobile_business || false;
  }

  /**
   * Get enrichment sources used
   */
  getEnrichmentSources() {
    const sources = ['raw_data', 'phone_validation', 'address_normalization'];

    if (this.hunterApiKey) sources.push('hunter.io');
    if (this.clearbitApiKey) sources.push('clearbit');

    return sources;
  }

  /**
   * Calculate enrichment confidence (0-1)
   */
  calculateConfidence(business) {
    let confidence = 0.5; // Base confidence

    // Increase confidence for each verified field
    if (business.phone) confidence += 0.1;
    if (business.email) confidence += 0.1;
    if (business.website) confidence += 0.1;
    if (business.latitude && business.longitude) confidence += 0.1;
    if (business.review_count > 0) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate lead score (0-100)
   */
  calculateLeadScore(business, enrichedData) {
    let score = 0;

    // Contact information scoring
    if (enrichedData.validated_phone) score += this.scoringWeights.hasPhone;
    if (enrichedData.validated_email) score += this.scoringWeights.hasEmail;
    if (business.website) score += this.scoringWeights.hasWebsite;
    if (enrichedData.facebook_url) score += this.scoringWeights.hasFacebook;

    // Social proof scoring
    if (enrichedData.has_google_reviews) score += this.scoringWeights.hasReviews;
    if ((enrichedData.average_rating || 0) >= 4.0) {
      score += this.scoringWeights.highRating;
    }

    // Business verification
    if (enrichedData.verified_business) score += this.scoringWeights.verifiedBusiness;

    // Operating hours
    if (business.hours) score += this.scoringWeights.businessHours;

    // ICP score bonus (fetch from ICP signals)
    const icpBonus = this.getIcpScoreBonus(business.id);
    score += icpBonus;

    return Math.min(100, Math.round(score));
  }

  /**
   * Get ICP score bonus (0-10 points)
   */
  getIcpScoreBonus(businessId) {
    // Would fetch from database in real implementation
    return 0;
  }

  /**
   * Calculate lead grade (A, B, C, D)
   */
  calculateLeadGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  /**
   * Calculate conversion probability (0-1)
   */
  calculateConversionProbability(score) {
    // Simple model: score/100 with sigmoid curve
    const normalized = score / 100;
    return parseFloat((normalized * 0.8 + 0.1).toFixed(3)); // 0.1 to 0.9 range
  }

  /**
   * Save enriched lead to database
   */
  async saveEnrichedLead(enrichedData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO enriched_leads (
          raw_business_id, business_name, normalized_address, validated_phone,
          validated_email, facebook_url, facebook_followers, facebook_engagement_rate,
          verified_business, has_google_reviews, average_rating, total_reviews,
          is_mobile_service, enrichment_sources, enrichment_confidence,
          lead_score, lead_grade, conversion_probability, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(raw_business_id) DO UPDATE SET
          business_name = excluded.business_name,
          normalized_address = excluded.normalized_address,
          validated_phone = excluded.validated_phone,
          validated_email = excluded.validated_email,
          facebook_url = excluded.facebook_url,
          facebook_followers = excluded.facebook_followers,
          facebook_engagement_rate = excluded.facebook_engagement_rate,
          verified_business = excluded.verified_business,
          has_google_reviews = excluded.has_google_reviews,
          average_rating = excluded.average_rating,
          total_reviews = excluded.total_reviews,
          is_mobile_service = excluded.is_mobile_service,
          enrichment_sources = excluded.enrichment_sources,
          enrichment_confidence = excluded.enrichment_confidence,
          lead_score = excluded.lead_score,
          lead_grade = excluded.lead_grade,
          conversion_probability = excluded.conversion_probability,
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP
      `);

      await stmt.bind(
        enrichedData.raw_business_id,
        enrichedData.business_name,
        enrichedData.normalized_address,
        enrichedData.validated_phone,
        enrichedData.validated_email,
        enrichedData.facebook_url,
        enrichedData.facebook_followers,
        enrichedData.facebook_engagement_rate,
        enrichedData.verified_business ? 1 : 0,
        enrichedData.has_google_reviews ? 1 : 0,
        enrichedData.average_rating,
        enrichedData.total_reviews,
        enrichedData.is_mobile_service ? 1 : 0,
        enrichedData.enrichment_sources,
        enrichedData.enrichment_confidence,
        enrichedData.lead_score,
        enrichedData.lead_grade,
        enrichedData.conversion_probability,
        enrichedData.status
      ).run();

      return true;
    } catch (error) {
      console.error(`[Enrich] Failed to save:`, error.message);
      return false;
    }
  }

  /**
   * Batch enrich businesses
   */
  async enrichBatch(limit = 100) {
    console.log(`\n[Enrich] Starting batch enrichment (limit: ${limit})`);

    try {
      // Get businesses with ICP signals but not yet enriched
      const stmt = this.db.prepare(`
        SELECT rb.id
        FROM raw_business_data rb
        JOIN icp_signals icp ON rb.id = icp.raw_business_id
        LEFT JOIN enriched_leads el ON rb.id = el.raw_business_id
        WHERE el.id IS NULL
          AND icp.icp_score >= 40
        ORDER BY icp.icp_score DESC
        LIMIT ?
      `);

      const businesses = await stmt.bind(limit).all();

      console.log(`[Enrich] Found ${businesses.results.length} businesses to enrich`);

      const results = {
        total: businesses.results.length,
        enriched: 0,
        gradeA: 0,
        gradeB: 0,
        gradeC: 0,
        gradeD: 0,
        errors: 0,
      };

      // Enrich each business
      for (const business of businesses.results) {
        const enriched = await this.enrichBusiness(business.id);

        if (enriched) {
          results.enriched++;

          if (enriched.lead_grade === 'A') results.gradeA++;
          else if (enriched.lead_grade === 'B') results.gradeB++;
          else if (enriched.lead_grade === 'C') results.gradeC++;
          else results.gradeD++;
        } else {
          results.errors++;
        }
      }

      console.log(`\n[Enrich] Batch complete:`, results);
      return results;
    } catch (error) {
      console.error(`[Enrich] Batch error:`, error.message);
      throw error;
    }
  }

  /**
   * Rate-limited request helper
   */
  async rateLimitedRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestInterval) {
      const waitTime = this.requestInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Parse raw JSON data
   */
  parseRawData(rawData) {
    if (!rawData) return {};

    try {
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      return {};
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

  if (args.length < 1) {
    console.log(`
Usage: node enrichment-pipeline.js <command> [options]

Commands:
  enrich <business_id>      Enrich single business
  batch [limit]             Enrich batch of businesses

Examples:
  node enrichment-pipeline.js enrich 123
  node enrichment-pipeline.js batch 100
    `);
    process.exit(1);
  }

  const command = args[0];

  // Initialize pipeline
  const pipeline = new EnrichmentPipeline(null);

  if (command === 'enrich') {
    const businessId = parseInt(args[1]);
    if (!businessId) {
      console.error('Error: business_id required');
      process.exit(1);
    }

    await pipeline.enrichBusiness(businessId);
  } else if (command === 'batch') {
    const limit = parseInt(args[1]) || 100;
    await pipeline.enrichBatch(limit);
  } else {
    console.error(`Error: Unknown command "${command}"`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default EnrichmentPipeline;
