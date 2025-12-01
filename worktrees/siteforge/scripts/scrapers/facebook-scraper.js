/**
 * Facebook Pages Scraper
 * Extracts: page info, engagement metrics, contact details
 * Focuses on businesses without websites
 */

import axios from 'axios';

class FacebookScraper {
  constructor(accessToken, db) {
    this.accessToken = accessToken;
    this.db = db;

    // Facebook Graph API configuration
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.apiVersion = 'v18.0';

    // Rate limiting: 200 calls/hour for app-level
    this.requestInterval = 18000; // ms (20 seconds between requests)
    this.lastRequestTime = 0;

    // Batch configuration
    this.batchSize = 50; // Facebook allows up to 50 requests per batch
    this.maxRetries = 3;
    this.retryDelay = 5000; // ms
  }

  /**
   * Rate-limited API request
   */
  async rateLimitedRequest(requestFn) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestInterval) {
      const waitTime = this.requestInterval - timeSinceLastRequest;
      console.log(`[Rate Limit] Waiting ${waitTime}ms before next request`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    return await requestFn();
  }

  /**
   * Search for business pages by location and category
   */
  async searchPages(query, location, category = 'LOCAL_BUSINESS') {
    console.log(`[Search] Query: "${query}" | Location: "${location}" | Category: ${category}`);

    try {
      const results = await this.rateLimitedRequest(async () => {
        const response = await axios.get(`${this.baseUrl}/pages/search`, {
          params: {
            access_token: this.accessToken,
            q: query,
            type: 'place',
            center: await this.geocodeLocation(location),
            distance: 50000, // 50km radius
            categories: JSON.stringify([category]),
            fields: 'id,name,about,category,location,phone,website,emails',
            limit: 100,
          },
        });

        await this.logApiUsage('facebook', 'search', response.status, response);
        return response.data;
      });

      console.log(`[Search] Found ${results.data?.length || 0} pages`);
      return results.data || [];
    } catch (error) {
      console.error(`[Search] Error:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get detailed page information
   */
  async getPageDetails(pageId) {
    try {
      const result = await this.rateLimitedRequest(async () => {
        const response = await axios.get(`${this.baseUrl}/${pageId}`, {
          params: {
            access_token: this.accessToken,
            fields: [
              'id',
              'name',
              'about',
              'category',
              'category_list',
              'phone',
              'emails',
              'website',
              'single_line_address',
              'location',
              'hours',
              'rating_count',
              'overall_star_rating',
              'fan_count',
              'followers_count',
              'engagement',
              'checkins',
              'business',
              'is_verified',
              'is_published',
              'cover',
              'picture',
              'link',
            ].join(','),
          },
        });

        await this.logApiUsage('facebook', 'pageDetails', response.status, response);
        return response.data;
      });

      return result;
    } catch (error) {
      console.error(`[Details] Error for page ${pageId}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get page engagement metrics
   */
  async getPageEngagement(pageId) {
    try {
      const result = await this.rateLimitedRequest(async () => {
        const response = await axios.get(`${this.baseUrl}/${pageId}/insights`, {
          params: {
            access_token: this.accessToken,
            metric: [
              'page_impressions',
              'page_engaged_users',
              'page_post_engagements',
              'page_fans',
            ].join(','),
            period: 'days_28',
          },
        });

        await this.logApiUsage('facebook', 'pageInsights', response.status, response);
        return response.data;
      });

      return this.parseEngagementData(result.data);
    } catch (error) {
      // Insights often fail due to permissions - not critical
      console.log(`[Engagement] Unable to fetch for ${pageId} (may need page access)`);
      return null;
    }
  }

  /**
   * Parse engagement metrics
   */
  parseEngagementData(insights) {
    if (!insights || !Array.isArray(insights)) return null;

    const metrics = {};

    insights.forEach((metric) => {
      const latestValue = metric.values?.[metric.values.length - 1]?.value;
      metrics[metric.name] = latestValue || 0;
    });

    // Calculate engagement rate
    if (metrics.page_fans && metrics.page_engaged_users) {
      metrics.engagement_rate = (
        (metrics.page_engaged_users / metrics.page_fans) *
        100
      ).toFixed(2);
    }

    return metrics;
  }

  /**
   * Transform Facebook data to our schema
   */
  async transformPageData(page, engagement = null) {
    const location = page.location || {};

    // Parse phone number
    const phone = page.phone || null;

    // Parse email (Facebook provides array)
    const email = page.emails?.[0] || null;

    // Parse hours
    const hours = page.hours
      ? {
          schedule: page.hours,
        }
      : null;

    // Calculate follower growth and engagement
    const followerCount = page.followers_count || page.fan_count || 0;
    const engagementRate = engagement?.engagement_rate || 0;

    return {
      source: 'facebook',
      source_id: page.id,
      name: page.name,
      address: page.single_line_address || null,
      city: location.city || null,
      state: location.state || null,
      postal_code: location.zip || null,
      country: location.country || 'US',
      phone,
      email,
      website: page.website || null,
      facebook_url: page.link || `https://www.facebook.com/${page.id}`,
      latitude: location.latitude || null,
      longitude: location.longitude || null,
      place_id: null, // Facebook doesn't use Google Place IDs
      category: page.category || null,
      categories: JSON.stringify(page.category_list || [page.category]),
      hours: hours ? JSON.stringify(hours) : null,
      rating: page.overall_star_rating || null,
      review_count: page.rating_count || 0,
      price_level: null, // Not available from Facebook
      raw_data: JSON.stringify({
        ...page,
        engagement,
        follower_count: followerCount,
        engagement_rate: engagementRate,
      }),
      status: 'new',
    };
  }

  /**
   * Save business to database (same as Google Maps scraper)
   */
  async saveBusiness(businessData, retryCount = 0) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO raw_business_data (
          source, source_id, name, address, city, state, postal_code, country,
          phone, email, website, facebook_url, latitude, longitude, place_id,
          category, categories, hours, rating, review_count, price_level,
          raw_data, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_id) DO UPDATE SET
          name = excluded.name,
          address = excluded.address,
          city = excluded.city,
          state = excluded.state,
          postal_code = excluded.postal_code,
          phone = excluded.phone,
          email = excluded.email,
          website = excluded.website,
          facebook_url = excluded.facebook_url,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          category = excluded.category,
          categories = excluded.categories,
          hours = excluded.hours,
          rating = excluded.rating,
          review_count = excluded.review_count,
          raw_data = excluded.raw_data,
          last_updated = CURRENT_TIMESTAMP
      `);

      const result = await stmt.bind(
        businessData.source,
        businessData.source_id,
        businessData.name,
        businessData.address,
        businessData.city,
        businessData.state,
        businessData.postal_code,
        businessData.country,
        businessData.phone,
        businessData.email,
        businessData.website,
        businessData.facebook_url,
        businessData.latitude,
        businessData.longitude,
        businessData.place_id,
        businessData.category,
        businessData.categories,
        businessData.hours,
        businessData.rating,
        businessData.review_count,
        businessData.price_level,
        businessData.raw_data,
        businessData.status
      ).run();

      return result.meta.last_row_id || result.meta.changes > 0;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`[DB] Retry ${retryCount + 1}/${this.maxRetries} for ${businessData.name}`);
        await this.sleep(this.retryDelay);
        return this.saveBusiness(businessData, retryCount + 1);
      }

      console.error(`[DB] Failed to save ${businessData.name}:`, error.message);
      return false;
    }
  }

  /**
   * Log API usage
   */
  async logApiUsage(provider, endpoint, statusCode, response) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO api_usage (
          api_provider, endpoint, request_type, status_code, success,
          response_time_ms, api_calls_used, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      await stmt.bind(
        provider,
        endpoint,
        endpoint,
        statusCode,
        statusCode === 200 ? 1 : 0,
        0,
        1
      ).run();
    } catch (error) {
      console.error('[API Usage] Failed to log:', error.message);
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId, processed, success, failed) {
    try {
      const stmt = this.db.prepare(`
        UPDATE scraping_jobs
        SET total_processed = ?,
            total_success = ?,
            total_failed = ?,
            last_request_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      await stmt.bind(processed, success, failed, jobId).run();
    } catch (error) {
      console.error('[Job Update] Failed:', error.message);
    }
  }

  /**
   * Complete job
   */
  async completeJob(jobId, summary) {
    try {
      const stmt = this.db.prepare(`
        UPDATE scraping_jobs
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            results_summary = ?
        WHERE id = ?
      `);

      await stmt.bind(JSON.stringify(summary), jobId).run();
    } catch (error) {
      console.error('[Job Complete] Failed:', error.message);
    }
  }

  /**
   * Run scraping job
   */
  async runJob(jobConfig) {
    const { query, location, category, jobId } = jobConfig;

    console.log(`\n[Job ${jobId}] Starting: "${query}" in ${location}`);

    const stats = {
      total: 0,
      saved: 0,
      failed: 0,
      noWebsite: 0,
      facebookOnly: 0,
      startTime: Date.now(),
    };

    try {
      // Search for pages
      const pages = await this.searchPages(query, location, category);
      stats.total = pages.length;

      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        console.log(`\n[${i + 1}/${pages.length}] Processing: ${page.name}`);

        // Get detailed information
        const details = await this.getPageDetails(page.id);

        if (details) {
          // Get engagement metrics (optional - may fail)
          const engagement = await this.getPageEngagement(page.id);

          // Transform and save
          const businessData = await this.transformPageData(details, engagement);
          const saved = await this.saveBusiness(businessData);

          if (saved) {
            stats.saved++;

            // Track ICP signals
            if (!businessData.website) {
              stats.noWebsite++;

              // If only has Facebook, it's high-value lead
              if (businessData.facebook_url) {
                stats.facebookOnly++;
              }
            }
          } else {
            stats.failed++;
          }
        } else {
          stats.failed++;
        }

        // Update job progress every 10 records
        if ((i + 1) % 10 === 0) {
          await this.updateJobProgress(jobId, i + 1, stats.saved, stats.failed);
        }
      }

      // Complete job
      const summary = {
        ...stats,
        duration: Date.now() - stats.startTime,
        successRate: ((stats.saved / stats.total) * 100).toFixed(2) + '%',
        icpMatchRate: ((stats.facebookOnly / stats.saved) * 100).toFixed(2) + '%',
      };

      await this.completeJob(jobId, summary);

      console.log(`\n[Job ${jobId}] Completed:`, summary);
      return summary;
    } catch (error) {
      console.error(`[Job ${jobId}] Error:`, error.message);

      const stmt = this.db.prepare(`
        UPDATE scraping_jobs
        SET status = 'failed',
            error_log = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      await stmt.bind(JSON.stringify({ error: error.message }), jobId).run();

      throw error;
    }
  }

  /**
   * Geocode location to lat/lng for search
   */
  async geocodeLocation(location) {
    // Simple geocoding - in production, use Google Geocoding API or similar
    // For now, return format that Facebook expects
    return location;
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

  if (args.length < 2) {
    console.log(`
Usage: node facebook-scraper.js <query> <location> [options]

Examples:
  node facebook-scraper.js "plumber" "San Juan, PR"
  node facebook-scraper.js "food truck" "Miami, FL" --category=FOOD_BEVERAGE

Options:
  --category=<type>    Business category (default: LOCAL_BUSINESS)
  --job-id=<id>        Scraping job ID for tracking
    `);
    process.exit(1);
  }

  const query = args[0];
  const location = args[1];
  const category = args.find((a) => a.startsWith('--category='))?.split('=')[1] || 'LOCAL_BUSINESS';
  const jobId = parseInt(args.find((a) => a.startsWith('--job-id='))?.split('=')[1] || '1');

  // Get access token from environment
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Error: FACEBOOK_ACCESS_TOKEN environment variable not set');
    process.exit(1);
  }

  // Initialize scraper
  const scraper = new FacebookScraper(accessToken, null);

  // Run job
  await scraper.runJob({ query, location, category, jobId });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default FacebookScraper;
