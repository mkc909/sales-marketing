/**
 * Google Maps Places API Scraper
 * Target: 100 businesses/hour with rate limiting
 * Extracts: name, address, phone, hours, website, ICP signals
 */

import { Client } from '@googlemaps/google-maps-services-js';

class GoogleMapsScraper {
  constructor(apiKey, db) {
    this.client = new Client({});
    this.apiKey = apiKey;
    this.db = db;

    // Rate limiting: 100 requests/hour = 1 request every 36 seconds
    this.requestInterval = 36000; // ms
    this.lastRequestTime = 0;

    // Batch configuration
    this.batchSize = 20; // Places per search
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
   * Search for businesses by category and location
   */
  async searchBusinesses(query, location, radius = 50000) {
    console.log(`[Search] Query: "${query}" | Location: "${location}" | Radius: ${radius}m`);

    let allResults = [];
    let nextPageToken = null;
    let pageCount = 0;

    try {
      do {
        const results = await this.rateLimitedRequest(async () => {
          const response = await this.client.textSearch({
            params: {
              query: `${query} in ${location}`,
              key: this.apiKey,
              radius,
              pagetoken: nextPageToken,
            },
          });

          await this.logApiUsage('google_maps', 'textSearch', response.status, response);
          return response;
        });

        if (results.data.status === 'OK') {
          allResults = allResults.concat(results.data.results);
          nextPageToken = results.data.next_page_token;
          pageCount++;

          console.log(`[Search] Page ${pageCount}: Found ${results.data.results.length} businesses`);

          // Google requires 2-second delay before using next_page_token
          if (nextPageToken) {
            await this.sleep(2000);
          }
        } else {
          console.error(`[Search] API Error: ${results.data.status}`);
          break;
        }

        // Limit to 3 pages (60 results) per search to avoid quota exhaustion
        if (pageCount >= 3) {
          console.log(`[Search] Reached page limit (${pageCount} pages)`);
          break;
        }
      } while (nextPageToken);

      console.log(`[Search] Total results: ${allResults.length}`);
      return allResults;
    } catch (error) {
      console.error(`[Search] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Get detailed information for a place
   */
  async getPlaceDetails(placeId) {
    try {
      const result = await this.rateLimitedRequest(async () => {
        const response = await this.client.placeDetails({
          params: {
            place_id: placeId,
            key: this.apiKey,
            fields: [
              'name',
              'formatted_address',
              'address_components',
              'geometry',
              'formatted_phone_number',
              'international_phone_number',
              'website',
              'opening_hours',
              'rating',
              'user_ratings_total',
              'price_level',
              'types',
              'business_status',
              'photos',
            ],
          },
        });

        await this.logApiUsage('google_maps', 'placeDetails', response.status, response);
        return response;
      });

      if (result.data.status === 'OK') {
        return result.data.result;
      } else {
        console.error(`[Details] Error for place ${placeId}: ${result.data.status}`);
        return null;
      }
    } catch (error) {
      console.error(`[Details] Error for place ${placeId}:`, error.message);
      return null;
    }
  }

  /**
   * Transform Google Maps data to our schema
   */
  transformPlaceData(place, details = null) {
    const data = details || place;

    // Parse address components
    const addressComponents = data.address_components || [];
    const getAddressComponent = (types) => {
      const component = addressComponents.find((c) =>
        types.some((t) => c.types.includes(t))
      );
      return component?.long_name || null;
    };

    // Extract business hours
    const hours = data.opening_hours?.weekday_text
      ? {
          weekday_text: data.opening_hours.weekday_text,
          open_now: data.opening_hours.open_now,
        }
      : null;

    return {
      source: 'google_maps',
      source_id: data.place_id,
      name: data.name,
      address: data.formatted_address,
      city: getAddressComponent(['locality', 'sublocality']),
      state: getAddressComponent(['administrative_area_level_1']),
      postal_code: getAddressComponent(['postal_code']),
      country: getAddressComponent(['country']) || 'US',
      phone: data.formatted_phone_number || data.international_phone_number,
      email: null, // Not available from Google Maps API
      website: data.website || null,
      facebook_url: null,
      latitude: data.geometry?.location?.lat,
      longitude: data.geometry?.location?.lng,
      place_id: data.place_id,
      category: data.types?.[0] || null,
      categories: JSON.stringify(data.types || []),
      hours: hours ? JSON.stringify(hours) : null,
      rating: data.rating || null,
      review_count: data.user_ratings_total || 0,
      price_level: data.price_level || null,
      raw_data: JSON.stringify(data),
      status: 'new',
    };
  }

  /**
   * Save business to database
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
          website = excluded.website,
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
   * Log API usage for monitoring
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
        0, // Response time not tracked here
        1
      ).run();
    } catch (error) {
      console.error('[API Usage] Failed to log:', error.message);
    }
  }

  /**
   * Update scraping job progress
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
   * Complete scraping job
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
    const { query, location, radius, jobId } = jobConfig;

    console.log(`\n[Job ${jobId}] Starting: "${query}" in ${location}`);

    const stats = {
      total: 0,
      saved: 0,
      failed: 0,
      icpMatches: 0,
      startTime: Date.now(),
    };

    try {
      // Search for businesses
      const places = await this.searchBusinesses(query, location, radius);
      stats.total = places.length;

      // Process each place
      for (let i = 0; i < places.length; i++) {
        const place = places[i];

        console.log(`\n[${i + 1}/${places.length}] Processing: ${place.name}`);

        // Get detailed information
        const details = await this.getPlaceDetails(place.place_id);

        if (details) {
          // Transform and save
          const businessData = this.transformPlaceData(place, details);
          const saved = await this.saveBusiness(businessData);

          if (saved) {
            stats.saved++;

            // Detect ICP signals
            const icpMatch = this.detectIcpSignals(businessData);
            if (icpMatch) {
              stats.icpMatches++;
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
   * Quick ICP signal detection (more detailed analysis in icp-detector.js)
   */
  detectIcpSignals(businessData) {
    const signals = [];

    // No website = high ICP match
    if (!businessData.website) {
      signals.push('no_website');
    }

    // Complex/unmappable address
    const address = businessData.address || '';
    if (
      address.includes('Int ') ||
      address.includes('Km ') ||
      address.includes('Bo ') ||
      address.length > 100
    ) {
      signals.push('unmappable_address');
    }

    // Mobile business indicators
    const name = businessData.name.toLowerCase();
    if (
      name.includes('food truck') ||
      name.includes('mobile') ||
      name.includes('delivery')
    ) {
      signals.push('mobile_business');
    }

    return signals.length > 0;
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
Usage: node google-maps-scraper.js <query> <location> [options]

Examples:
  node google-maps-scraper.js "plumber" "San Juan, PR"
  node google-maps-scraper.js "food truck" "Miami, FL" --radius=25000

Options:
  --radius=<meters>    Search radius (default: 50000)
  --job-id=<id>        Scraping job ID for tracking
    `);
    process.exit(1);
  }

  const query = args[0];
  const location = args[1];
  const radius = parseInt(args.find((a) => a.startsWith('--radius='))?.split('=')[1] || '50000');
  const jobId = parseInt(args.find((a) => a.startsWith('--job-id='))?.split('=')[1] || '1');

  // Get API key from environment
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_MAPS_API_KEY environment variable not set');
    process.exit(1);
  }

  // Initialize scraper (database connection would be passed in real usage)
  const scraper = new GoogleMapsScraper(apiKey, null);

  // Run job
  await scraper.runJob({ query, location, radius, jobId });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default GoogleMapsScraper;
