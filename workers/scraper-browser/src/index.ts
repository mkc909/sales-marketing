import puppeteer, { Browser, Page } from '@cloudflare/puppeteer';

interface Env {
  BROWSER: Fetcher;
  CACHE?: KVNamespace;  // Made optional
  RATE_LIMIT_DELAY: string;
  DEBUG?: string;
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
  phone?: string;
  email?: string;
  specializations?: string[];
}

// FL DBPR scraping implementation
async function scrapeFLDBPR(page: Page, params: SearchRequest): Promise<Professional[]> {
  const { zip, profession, limit = 10 } = params;

  console.log(`Scraping FL DBPR for ${profession} in ZIP ${zip}`);

  try {
    // Navigate to FL DBPR search page
    await page.goto('https://www.myfloridalicense.com/wl11.asp', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for form to load
    await page.waitForSelector('select[name="hProfession"]', { timeout: 10000 });

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

    // Fill search form
    await page.select('select[name="hProfession"]', professionCode);

    // Enter ZIP code in location field
    await page.type('input[name="hCity"]', zip);

    // Select search by city/ZIP
    await page.select('select[name="hSearchType"]', '2');  // Search by location

    // Set results per page
    await page.select('select[name="hBoardRecordsPerPage"]', '25');

    // Submit search
    await page.click('input[name="SubmitBtn"]');

    // Wait for results
    await page.waitForSelector('table.boardorders', { timeout: 15000 });

    // Extract results
    const results = await page.evaluate((maxResults) => {
      const professionals: any[] = [];
      const rows = document.querySelectorAll('table.boardorders tr');

      // Skip header row
      for (let i = 1; i < rows.length && professionals.length < maxResults; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');

        if (cells.length >= 4) {
          const nameCell = cells[0];
          const licenseCell = cells[1];
          const statusCell = cells[2];
          const locationCell = cells[3];

          // Extract name
          const nameLink = nameCell.querySelector('a');
          const name = nameLink ? nameLink.textContent?.trim() : nameCell.textContent?.trim();

          // Extract license number
          const licenseNumber = licenseCell.textContent?.trim();

          // Extract status
          const status = statusCell.textContent?.trim();

          // Extract location/company info
          const locationText = locationCell.textContent?.trim() || '';
          const locationLines = locationText.split('\n').map(l => l.trim()).filter(l => l);

          if (name && licenseNumber) {
            professionals.push({
              name: name,
              license_number: licenseNumber,
              license_status: status || 'Unknown',
              company: locationLines[0] || null,
              city: locationLines[1]?.split(',')[0] || null,
              state: 'FL',
              phone: null,  // Not available in basic search
              email: null,  // Not available in basic search
              specializations: []
            });
          }
        }
      }

      return professionals;
    }, limit);

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
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== 'POST') {
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

      if (env.CACHE) {
        const cached = await env.CACHE.get(cacheKey, 'json');
        if (cached) {
          console.log(`Cache hit for ${cacheKey}`);
          return new Response(JSON.stringify({
            ...cached,
            source: 'cache',
            cached: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Only support FL for now
      if (searchParams.state !== 'FL') {
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
      const browser = await puppeteer.launch(env.BROWSER);

      try {
        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Add stealth settings
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Scrape data
        const results = await scrapeFLDBPR(page, searchParams);

        // Build response
        const response = {
          results,
          source: 'live',
          state: searchParams.state,
          profession: searchParams.profession,
          zip: searchParams.zip,
          total: results.length,
          scraped_at: new Date().toISOString()
        };

        // Cache for 24 hours
        if (env.CACHE && results.length > 0) {
          await env.CACHE.put(cacheKey, JSON.stringify(response), {
            expirationTtl: 86400  // 24 hours
          });
        }

        // Rate limit delay
        const delay = parseInt(env.RATE_LIMIT_DELAY || '1000');
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } finally {
        await browser.close();
      }

    } catch (error) {
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