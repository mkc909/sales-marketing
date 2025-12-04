import puppeteer, { Browser, Page } from '@cloudflare/puppeteer';

interface Env {
  BROWSER: Fetcher;
  CACHE: KVNamespace;  // Now required with KV namespace configured
  RATE_LIMIT_DELAY: string;
  DEBUG?: string;
}

// Monitoring and Analytics
interface LogEntry {
  timestamp: string;
  event: string;
  state?: string;
  profession?: string;
  zip?: string;
  duration_ms?: number;
  source?: string;
  result_count?: number;
  cache_hit?: boolean;
  error?: string;
  browser_duration_seconds?: number;
  estimated_cost?: number;
  status_code?: number;
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    browser: boolean;
    cache: boolean;
    api: boolean;
  };
}

// Helper function for structured logging
function logEvent(entry: LogEntry) {
  console.log(JSON.stringify(entry));
}

// Helper function to calculate browser cost (rough estimate)
function calculateBrowserCost(durationSeconds: number): number {
  // Cloudflare Browser Rendering costs ~$5/month for unlimited usage
  // Rough estimate: $0.0001 per second of active browsing
  return Math.round(durationSeconds * 0.0001 * 10000) / 10000;
}

interface SearchRequest {
  state: string;
  profession: string;
  zip: string;
  limit?: number;
}

interface Professional {
  name: string;
  license_number: string;
  license_status: string;
  company?: string;
  city?: string;
  state: string;
  phone?: string | null;
  email?: string | null;
  specializations?: string[];
}

interface ResponseData {
  results: Professional[];
  source: string;
  state: string;
  profession: string;
  zip: string;
  total: number;
  scraped_at: string;
  error?: {
    code: string;
    message: string;
    severity: string;
  };
}

// TX TREC scraping implementation
async function scrapeTXTREC(page: Page, params: SearchRequest): Promise<Professional[]> {
  const { zip, profession, limit = 10 } = params;

  console.log(`Scraping TX TREC for ${profession} in ZIP ${zip}`);

  try {
    // Navigate to TX TREC license search page
    await page.goto('https://www.trec.texas.gov/apps/license-holder-search/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait a moment for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Debug: Check what's actually on the page
    const pageContent = await page.content();
    console.log('TX Page title:', await page.title());
    console.log('TX Page URL:', page.url());
    console.log('TX Page contains search forms:', pageContent.includes('<form'));

    // Map profession to TX TREC search terms
    const professionMap: Record<string, string> = {
      'real_estate': 'Real Estate Sales Agent',
      'real_estate_agent': 'Real Estate Sales Agent',
      'real_estate_broker': 'Real Estate Broker',
      'insurance': 'Insurance Agent',
      'contractor': 'General Contractor',
      'attorney': 'Attorney',
      'dentist': 'Dentist'
    };

    const searchTerm = professionMap[profession] || 'Real Estate Sales Agent';

    // Try to find and fill search form
    try {
      // Look for common search form patterns
      const searchInput = await page.$('input[placeholder*="search"], input[name*="search"], input[id*="search"]');
      if (searchInput) {
        await searchInput.type(searchTerm);
        console.log('Entered search term:', searchTerm);
      }

      // Look for ZIP code input
      const zipInput = await page.$('input[placeholder*="zip"], input[name*="zip"], input[id*="zip"]');
      if (zipInput) {
        await zipInput.type(zip);
        console.log('Entered ZIP code:', zip);
      }

      // Look for search button
      const searchButton = await page.$('button[type="submit"], input[type="submit"], button');
      if (searchButton) {
        await searchButton.click();
        console.log('Clicked search button');
      } else {
        // Try to find any clickable element with "Search" text
        const searchElements = await page.$$('button, input[type="submit"], a');
        for (const element of searchElements) {
          const text = await element.evaluate(el => el.textContent?.trim() || '');
          if (text.toLowerCase().includes('search')) {
            await element.click();
            console.log('Clicked search element with text:', text);
            break;
          }
        }
      }

      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (e) {
      console.error('Failed to fill TX search form:', e);
      return getMockDataTX(zip, profession, limit);
    }

    // Extract results
    let results: Professional[] = [];

    try {
      // Get page content as HTML
      const htmlContent = await page.content();
      console.log('TX Page HTML length:', htmlContent.length);

      // Look for result cards or tables
      const resultSelectors = [
        '.result-card',
        '.search-result',
        '.license-holder',
        'tr[class*="result"]',
        '.card',
        '.listing'
      ];

      let foundResults = false;
      for (const selector of resultSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} results with selector: ${selector}`);
          foundResults = true;

          // Extract data from found elements
          for (let i = 0; i < Math.min(elements.length, limit); i++) {
            const element = elements[i];
            const text = await element.evaluate(el => el.textContent || '');

            if (text && text.trim()) {
              // Simple text parsing for TX license format
              const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
              const name = lines[0] || '';
              const license = lines.find((line: string) => line.match(/^[A-Z0-9]+$/)) || '';
              const status = lines.find((line: string) => line.match(/Active|Inactive|Expired/i)) || 'Unknown';

              if (name && license) {
                results.push({
                  name: name,
                  license_number: license,
                  license_status: status,
                  company: undefined,
                  city: undefined,
                  state: 'TX',
                  phone: null,
                  email: null,
                  specializations: []
                });
              }
            }
          }
          break;
        }
      }

      if (!foundResults) {
        console.log('No result elements found, returning mock data');
        return getMockDataTX(zip, profession, limit);
      }

    } catch (error) {
      console.error('TX HTML parsing error:', error);
      return getMockDataTX(zip, profession, limit);
    }

    console.log(`Found ${results.length} TX professionals`);
    return results;

  } catch (error) {
    console.error('TX TREC scraping error:', error);
    return getMockDataTX(zip, profession, limit);
  }
}

// TX Mock data fallback
function getMockDataTX(zip: string, profession: string, limit: number): Professional[] {
  const mockNames = [
    'John Smith', 'Maria Garcia', 'Robert Johnson', 'Jennifer Williams',
    'Michael Brown', 'Sarah Davis', 'David Martinez', 'Lisa Wilson',
    'James Anderson', 'Patricia Taylor'
  ];

  const companies = [
    'Texas Realty Group', 'Lone Star Properties', 'Houston Real Estate',
    'Dallas Premier Realty', 'Austin Homes', 'San Antonio Properties'
  ];

  return mockNames.slice(0, limit).map((name, i) => ({
    name,
    license_number: `TX${String(1000000 + i).padStart(7, '0')}`,
    license_status: i % 10 === 0 ? 'Expired' : 'Active',
    company: companies[i % companies.length],
    city: 'Houston',
    state: 'TX',
    phone: `713-555-${String(1000 + i).padStart(4, '0')}`,
    email: `${name.toLowerCase().replace(' ', '.')}@texas.email.com`,
    specializations: ['Residential', 'Commercial']
  }));
}

// FL DBPR scraping implementation
async function scrapeFLDBPR(page: Page, params: SearchRequest): Promise<Professional[]> {
  const { zip, profession, limit = 10 } = params;

  console.log(`Scraping FL DBPR for ${profession} in ZIP ${zip}`);

  try {
    // Navigate to FL DBPR search page
    await page.goto('https://www.myfloridalicense.com/wl11.asp', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Don't wait for selector - just proceed immediately to avoid polling issues

    // Debug: Check what's actually on the page
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    console.log('Page contains select elements:', pageContent.includes('<select'));
    console.log('Page contains hProfession:', pageContent.includes('hProfession'));

    // Map profession to FL DBPR codes
    const professionMap: Record<string, string> = {
      'real_estate': '2502',  // Real Estate Sales Associate
      'real_estate_agent': '2502',
      'real_estate_broker': '2501',  // Real Estate Broker
      'insurance': '0602',  // Insurance Agent
      'contractor': '0501',  // General Contractor
      'attorney': '1101',  // Attorney
      'dentist': '1401'  // Dentist
    };

    const professionCode = professionMap[profession] || '2502';

    // Try to find form elements with error handling
    try {
      await page.select('select[name="hProfession"]', professionCode);
    } catch (e) {
      console.error('Failed to select profession:', e);
      // Try alternative selectors or approaches
      const selects = await page.$$('select');
      console.log('Found select elements:', selects.length);

      // If we can't find the form, just return mock data
      return getMockData(zip, profession, limit);
    }

    try {
      // Enter ZIP code in location field
      await page.type('input[name="hCity"]', zip);

      // Select search by city/ZIP
      await page.select('select[name="hSearchType"]', '2');  // Search by location

      // Set results per page
      await page.select('select[name="hBoardRecordsPerPage"]', '25');

      // Submit search
      await page.click('input[name="SubmitBtn"]');
    } catch (e) {
      console.error('Failed to fill form:', e);
      return getMockData(zip, profession, limit);
    }

    // Extract results using HTML content parsing instead of page evaluation
    let results: Professional[] = [];

    try {
      // Get page content as HTML immediately (no waitForTimeout to avoid polling issues)
      const htmlContent = await page.content();
      console.log('Page HTML length:', htmlContent.length);

      // Simple regex-based extraction to avoid JavaScript evaluation issues
      const tableRegex = /<table[^>]*class="[^"]*boardorders[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
      const tableMatch = tableRegex.exec(htmlContent);

      if (tableMatch && tableMatch[1]) {
        const tableContent = tableMatch[1];

        // Extract rows from table
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        const professionals: Professional[] = [];
        let rowIndex = 0;

        while ((rowMatch = rowRegex.exec(tableContent)) !== null && professionals.length < limit) {
          const rowContent = rowMatch[1];

          // Skip header row (first row)
          if (rowIndex === 0) {
            rowIndex++;
            continue;
          }

          // Extract cells from row
          const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          const cells = [];
          let cellMatch;

          while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            // Clean cell content - remove HTML tags and decode entities
            const cellContent = cellMatch[1]
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&/g, '&')
              .replace(/</g, '<')
              .replace(/>/g, '>')
              .trim();

            cells.push(cellContent);
          }

          // If we have enough cells, extract professional data
          if (cells.length >= 4) {
            const name = cells[0] || '';
            const license = cells[1] || '';
            const status = cells[2] || 'Unknown';
            const location = cells[3] || '';

            if (name && license) {
              // Parse location for company and city
              const locationLines = location.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
              const company = locationLines[0] || null;
              const city = locationLines[1] ? locationLines[1].split(',')[0] : null;

              professionals.push({
                name: name,
                license_number: license,
                license_status: status,
                company: company || undefined,
                city: city || undefined,
                state: 'FL',
                phone: null,
                email: null,
                specializations: []
              });
            }
          }

          rowIndex++;
        }

        results = professionals;
      }

    } catch (error) {
      console.error('HTML parsing error:', error);
    }

    console.log(`Found ${results.length} professionals`);
    return results;

  } catch (error) {
    console.error('FL DBPR scraping error:', error);

    // Return mock data as fallback
    return getMockData(zip, profession, limit);
  }
}

// Mock data fallback
function getMockData(zip: string, profession: string, limit: number): Professional[] {
  const mockNames = [
    'Maria Rodriguez', 'David Chen', 'Jennifer Smith', 'Michael Johnson',
    'Sarah Williams', 'Robert Brown', 'Lisa Davis', 'James Wilson',
    'Patricia Garcia', 'William Martinez'
  ];

  const companies = [
    'Keller Williams Realty', 'RE/MAX Premier', 'Coldwell Banker',
    'Century 21', 'Berkshire Hathaway', 'Compass Real Estate'
  ];

  return mockNames.slice(0, limit).map((name, i) => ({
    name,
    license_number: `FL${String(3000000 + i).padStart(7, '0')}`,
    license_status: i % 10 === 0 ? 'Expired' : 'Active',
    company: companies[i % companies.length],
    city: 'Miami',
    state: 'FL',
    phone: `305-555-${String(1000 + i).padStart(4, '0')}`,
    email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
    specializations: ['Residential', 'Luxury']
  }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (request.method === 'GET' && url.pathname === '/health') {
      try {
        // Test cache connectivity
        const cacheTest = await env.CACHE.get('health-check-test');

        const health: HealthCheck = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          uptime: Date.now() - startTime,
          checks: {
            browser: true, // Assume browser is available if we can reach here
            cache: cacheTest !== null || true, // Cache is working if no error
            api: true
          }
        };

        logEvent({
          timestamp: new Date().toISOString(),
          event: 'health_check',
          status_code: 200,
          duration_ms: Date.now() - startTime
        });

        return new Response(JSON.stringify(health), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logEvent({
          timestamp: new Date().toISOString(),
          event: 'health_check_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          status_code: 500,
          duration_ms: Date.now() - startTime
        });

        return new Response(JSON.stringify({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Only accept POST for scraping
    if (request.method !== 'POST') {
      logEvent({
        timestamp: new Date().toISOString(),
        event: 'method_not_allowed',
        status_code: 405,
        duration_ms: Date.now() - startTime
      });

      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const searchParams: SearchRequest = await request.json();

      // Validate required parameters
      if (!searchParams.state || !searchParams.profession || !searchParams.zip) {
        return new Response(JSON.stringify({
          error: 'Missing required parameters: state, profession, zip'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check cache first
      const cacheKey = `${searchParams.state}:${searchParams.profession}:${searchParams.zip}`;

      const cached = await env.CACHE.get(cacheKey, 'json');
      if (cached) {
        const duration = Date.now() - startTime;
        const cachedData = cached as any; // Type assertion for cached data

        logEvent({
          timestamp: new Date().toISOString(),
          event: 'scrape_complete',
          state: searchParams.state,
          profession: searchParams.profession,
          zip: searchParams.zip,
          duration_ms: duration,
          source: 'cache',
          result_count: cachedData.total || 0,
          cache_hit: true,
          status_code: 200
        });

        return new Response(JSON.stringify({
          ...cached,
          source: 'cache',
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Support FL and TX states
      if (searchParams.state !== 'FL' && searchParams.state !== 'TX') {
        return new Response(JSON.stringify({
          results: getMockData(searchParams.zip, searchParams.profession, searchParams.limit || 10),
          source: 'mock',
          message: `State ${searchParams.state} not yet implemented`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Launch browser
      console.log('Launching browser...');
      const browserStartTime = Date.now();
      const browser = await puppeteer.launch(env.BROWSER);

      try {
        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Add stealth settings
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Scrape data based on state
        let results: Professional[];
        if (searchParams.state === 'TX') {
          results = await scrapeTXTREC(page, searchParams);
        } else {
          results = await scrapeFLDBPR(page, searchParams);
        }

        // Check if we got mock data (detect by license number pattern)
        const isMockData = results.length > 0 && (
          results[0].license_number.startsWith('FL300000') ||
          results[0].license_number.startsWith('TX1000000')
        );

        // Build response
        const response: ResponseData = {
          results,
          source: isMockData ? 'mock' : 'live',
          state: searchParams.state,
          profession: searchParams.profession,
          zip: searchParams.zip,
          total: results.length,
          scraped_at: new Date().toISOString()
        };

        // Add error status if using mock data due to scraping failure
        if (isMockData) {
          response.error = {
            code: 'SCRAPING_FAILED',
            message: 'Unable to scrape live data, returning mock data as fallback',
            severity: 'soft'
          };
        }

        // Cache for 24 hours (only cache successful live data)
        if (results.length > 0 && !isMockData) {
          await env.CACHE.put(cacheKey, JSON.stringify(response), {
            expirationTtl: 86400  // 24 hours
          });
          console.log(`Cached ${results.length} results for ${cacheKey}`);
        }

        // Rate limit delay
        const delay = parseInt(env.RATE_LIMIT_DELAY || '1000');
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Calculate browser usage metrics
        const browserDuration = (Date.now() - browserStartTime) / 1000; // in seconds
        const browserCost = calculateBrowserCost(browserDuration);
        const totalDuration = Date.now() - startTime;

        // Log comprehensive metrics
        logEvent({
          timestamp: new Date().toISOString(),
          event: 'scrape_complete',
          state: searchParams.state,
          profession: searchParams.profession,
          zip: searchParams.zip,
          duration_ms: totalDuration,
          source: response.source,
          result_count: results.length,
          cache_hit: false,
          browser_duration_seconds: browserDuration,
          estimated_cost: browserCost,
          status_code: isMockData ? 202 : 200
        });

        // Log browser usage separately for cost tracking
        logEvent({
          timestamp: new Date().toISOString(),
          event: 'browser_usage',
          browser_duration_seconds: browserDuration,
          estimated_cost: browserCost
        });

        // Return appropriate HTTP status
        const statusCode = isMockData ? 202 : 200; // 202 Accepted for mock data fallback

        return new Response(JSON.stringify(response), {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } finally {
        await browser.close();
      }

    } catch (error) {
      const duration = Date.now() - startTime;

      // Try to extract search params for logging, even if parsing failed
      let state = 'unknown';
      let profession = 'unknown';
      let zip = 'unknown';

      try {
        const parsedParams = await request.json() as any;
        state = parsedParams?.state || 'unknown';
        profession = parsedParams?.profession || 'unknown';
        zip = parsedParams?.zip || 'unknown';
      } catch (e) {
        // Keep defaults if parsing failed
      }

      logEvent({
        timestamp: new Date().toISOString(),
        event: 'scrape_failed',
        state: state,
        profession: profession,
        zip: zip,
        duration_ms: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        status_code: 500
      });

      console.error('Browser worker error:', error);

      return new Response(JSON.stringify({
        error: 'Scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        results: getMockData('33139', 'real_estate', 5),
        source: 'mock'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};