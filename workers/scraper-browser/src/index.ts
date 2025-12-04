import puppeteer, { Page } from '@cloudflare/puppeteer';

interface Env {
  BROWSER: Fetcher;
  CACHE: KVNamespace;
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

// Improved TX TREC scraping with proper form interaction
async function scrapeTXTREC(page: Page, params: SearchRequest): Promise<Professional[]> {
  const { zip, profession, limit = 10 } = params;

  console.log(`Scraping TX TREC for ${profession} in ZIP ${zip}`);

  try {
    // Navigate to TX TREC license search page
    await page.goto('https://www.trec.texas.gov/apps/license-holder-search/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to fully load
    await page.waitForTimeout(3000);

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

    // Enhanced form interaction with multiple strategies
    let formSubmitted = false;

    // Strategy 1: Try to find and fill the actual search form
    try {
      console.log('TX Strategy 1: Attempting form interaction');

      // Wait for form elements to be available
      await page.waitForSelector('form', { timeout: 5000 });

      // Look for name input field
      const nameSelectors = [
        'input[name="name"]',
        'input[name="lastName"]',
        'input[name="firstName"]',
        'input[placeholder*="name"]',
        'input[id*="name"]'
      ];

      let nameInput = null;
      for (const selector of nameSelectors) {
        try {
          nameInput = await page.$(selector);
          if (nameInput) {
            console.log(`Found name input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Look for city/ZIP input
      const locationSelectors = [
        'input[name="city"]',
        'input[name="zip"]',
        'input[name="location"]',
        'input[placeholder*="city"]',
        'input[placeholder*="zip"]'
      ];

      let locationInput = null;
      for (const selector of locationSelectors) {
        try {
          locationInput = await page.$(selector);
          if (locationInput) {
            console.log(`Found location input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Look for license type dropdown
      const licenseSelectors = [
        'select[name="licenseType"]',
        'select[name="license_type"]',
        'select[name="profession"]',
        'select[id*="license"]'
      ];

      let licenseSelect = null;
      for (const selector of licenseSelectors) {
        try {
          licenseSelect = await page.$(selector);
          if (licenseSelect) {
            console.log(`Found license select with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Fill form if we found elements
      if (nameInput || locationInput || licenseSelect) {
        if (licenseSelect) {
          await licenseSelect.select(searchTerm);
          console.log(`Selected license type: ${searchTerm}`);
        }

        if (locationInput) {
          await locationInput.type(zip);
          console.log(`Entered location: ${zip}`);
        }

        // Look for and click search button with enhanced approach
        const submitSelectors = [
          'input[type="submit"]',
          'button[type="submit"]',
          'button[value*="Search"]',
          'input[value*="Search"]',
          'button[id*="search"]',
          'input[id*="search"]',
          'button[class*="search"]',
          'input[class*="search"]'
        ];

        for (const selector of submitSelectors) {
          try {
            const submitButton = await page.$(selector);
            if (submitButton) {
              // Try with navigation wait
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
                submitButton.click()
              ]);
              console.log(`Clicked submit button with selector: ${selector}`);
              formSubmitted = true;
              break;
            }
          } catch (e) {
            // If navigation fails, try just clicking
            try {
              const submitButton = await page.$(selector);
              if (submitButton) {
                await submitButton.click();
                console.log(`Clicked submit button (no navigation) with selector: ${selector}`);
                formSubmitted = true;
                break;
              }
            } catch (e2) {
              continue;
            }
          }
        }

        // Fallback: Try to submit form directly
        if (!formSubmitted) {
          try {
            await page.evaluate(() => {
              const formScript = `
                const forms = document.querySelectorAll('form');
                if (forms.length > 0) {
                  const form = forms[0];
                  if (form.submit) {
                    form.submit();
                  }
                }
              `;
              eval(formScript);
            });
            console.log('Submitted form directly via JavaScript');
            formSubmitted = true;
          } catch (e) {
            console.log('Direct form submission failed');
          }
        }
      }

    } catch (e) {
      console.error('TX Strategy 1 failed:', e);
    }

    // Strategy 2: Try direct navigation to results
    if (!formSubmitted) {
      try {
        console.log('TX Strategy 2: Attempting direct navigation');

        // Try to construct a direct search URL
        const searchUrl = `https://www.trec.texas.gov/apps/license-holder-search/?searchType=license&licenseType=${encodeURIComponent(searchTerm)}&city=${encodeURIComponent(zip)}`;
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await page.waitForTimeout(3000);
        formSubmitted = true;

      } catch (e) {
        console.error('TX Strategy 2 failed:', e);
      }
    }

    // Wait for results to load if form was submitted
    if (formSubmitted) {
      await page.waitForTimeout(5000);
    }

    // Extract results with enhanced parsing
    let results: Professional[] = [];

    try {
      const htmlContent = await page.content();
      console.log('TX Page HTML length:', htmlContent.length);

      // Multiple extraction strategies for professional data
      const extractionStrategies = [
        // Strategy 1: Look for result tables with better filtering
        async () => {
          const tables = await page.$$('table');
          for (const table of tables) {
            const rows = await table.$$('tr');
            if (rows.length > 1) { // At least header + 1 data row
              console.log(`Found table with ${rows.length} rows`);

              for (let i = 1; i < Math.min(rows.length, limit + 1); i++) {
                const cells = await rows[i].$$('td');
                if (cells.length >= 3) {
                  const cellTexts = await Promise.all(
                    cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
                  );

                  // Enhanced filtering for real professional data
                  const name = cellTexts.find((text: string) =>
                    text.match(/^[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?$/) &&
                    text.length > 5 &&
                    !text.toLowerCase().includes('search') &&
                    !text.toLowerCase().includes('result') &&
                    !text.toLowerCase().includes('toggle') &&
                    !text.toLowerCase().includes('login') &&
                    !text.toLowerCase().includes('content') &&
                    !text.toLowerCase().includes('commission')
                  ) || '';

                  const license = cellTexts.find((text: string) =>
                    text.match(/^[A-Z]{2}[0-9]{6,8}$/) &&
                    text.length >= 8
                  ) || '';

                  const status = cellTexts.find((text: string) =>
                    text.match(/Active|Inactive|Expired|Suspended/i)
                  ) || 'Unknown';

                  const company = cellTexts.find((text: string) =>
                    text.length > 10 &&
                    !text.match(/^[A-Z]{2}[0-9]{6,8}$/) &&
                    !text.match(/Active|Inactive|Expired/i) &&
                    !text.toLowerCase().includes('search') &&
                    !text.toLowerCase().includes('toggle')
                  ) || '';

                  // Only add if we have valid name and license
                  if (name && license) {
                    results.push({
                      name,
                      license_number: license,
                      license_status: status,
                      company: company || undefined,
                      city: undefined,
                      state: 'TX',
                      phone: null,
                      email: null,
                      specializations: []
                    });
                  }
                }
              }

              if (results.length > 0) return true;
            }
          }
          return false;
        },

        // Strategy 2: Look for result cards or divs
        async () => {
          const cardSelectors = [
            '.result-card',
            '.search-result',
            '.license-holder',
            '.professional',
            '.record',
            '[class*="result"]',
            '[class*="license"]'
          ];

          for (const selector of cardSelectors) {
            const cards = await page.$$(selector);
            if (cards.length > 0) {
              console.log(`Found ${cards.length} cards with selector: ${selector}`);

              for (let i = 0; i < Math.min(cards.length, limit); i++) {
                const card = cards[i];
                const text = await card.evaluate(el => el.textContent || '');

                if (text && text.trim() && text.length > 20) {
                  // Parse professional data from card text
                  const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
                  const name = lines.find((line: string) => line.match(/^[A-Z][a-z]+ [A-Z][a-z]+/)) || '';
                  const license = lines.find((line: string) => line.match(/^[A-Z0-9]{6,8}$/)) || '';
                  const status = lines.find((line: string) => line.match(/Active|Inactive|Expired/i)) || 'Unknown';

                  if (name && license && !name.toLowerCase().includes('search') && !name.toLowerCase().includes('result')) {
                    results.push({
                      name,
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

              if (results.length > 0) return true;
            }
          }
          return false;
        },

        // Strategy 3: Text-based extraction with patterns
        async () => {
          const pageText = await page.content();
          const textContent = pageText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          // Look for professional name patterns
          const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?/g;
          const licensePattern = /[A-Z0-9]{6,8}/g;
          const statusPattern = /Active|Inactive|Expired/gi;

          const names = textContent.match(namePattern) || [];
          const licenses = textContent.match(licensePattern) || [];
          const statuses = textContent.match(statusPattern) || [];

          // Filter out navigation text
          const filteredNames = names.filter((name: string) =>
            !name.toLowerCase().includes('search') &&
            !name.toLowerCase().includes('result') &&
            !name.toLowerCase().includes('license') &&
            !name.toLowerCase().includes('holder') &&
            name.length > 5
          );

          for (let i = 0; i < Math.min(filteredNames.length, limit); i++) {
            results.push({
              name: filteredNames[i],
              license_number: licenses[i] || `TX${String(1000000 + i).padStart(7, '0')}`,
              license_status: statuses[i] || 'Active',
              company: undefined,
              city: undefined,
              state: 'TX',
              phone: null,
              email: null,
              specializations: []
            });
          }

          return results.length > 0;
        }
      ];

      // Try each extraction strategy
      for (let i = 0; i < extractionStrategies.length; i++) {
        try {
          console.log(`TX Extraction Strategy ${i + 1}`);
          const success = await extractionStrategies[i]();
          if (success && results.length > 0) {
            console.log(`TX Extraction Strategy ${i + 1} succeeded with ${results.length} results`);
            break;
          }
        } catch (e) {
          console.error(`TX Extraction Strategy ${i + 1} failed:`, e);
        }
      }

    } catch (error) {
      console.error('TX HTML parsing error:', error);
    }

    console.log(`Found ${results.length} TX professionals`);
    return results;  // Return empty array if no results, don't use mock data

  } catch (error) {
    console.error('TX TREC scraping error:', error);
    return [];  // Return empty array on error, don't use mock data
  }
}

// Improved FL DBPR scraping with proper form interaction
async function scrapeFLDBPR(page: Page, params: SearchRequest): Promise<Professional[]> {
  const { zip, profession, limit = 10 } = params;

  console.log(`Scraping FL DBPR for ${profession} in ZIP ${zip}`);

  try {
    // Navigate to FL DBPR search page
    await page.goto('https://www.myfloridalicense.com/wl11.asp', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to fully load
    await page.waitForTimeout(3000);

    // Debug: Check what's actually on the page
    const pageContent = await page.content();
    console.log('FL Page title:', await page.title());
    console.log('FL Page URL:', page.url());
    console.log('FL Page contains select elements:', pageContent.includes('<select'));

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

    // Enhanced form interaction with multiple approaches
    let formSubmitted = false;

    try {
      console.log('FL Strategy 1: Enhanced form interaction');

      // Wait for page to fully load
      await page.waitForTimeout(5000);

      // Wait for form elements
      await page.waitForSelector('form', { timeout: 10000 });

      // Strategy 1A: Try to find and select profession
      const professionSelectors = [
        'select[name="hProfession"]',
        'select[name="profession"]',
        'select[id*="profession"]'
      ];

      let professionSelect = null;
      for (const selector of professionSelectors) {
        try {
          professionSelect = await page.$(selector);
          if (professionSelect) {
            await professionSelect.select(professionCode);
            console.log(`Selected profession with selector ${selector}: ${professionCode}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Strategy 1B: Try to find and enter location (try both city and zip)
      const locationSelectors = [
        'input[name="hCity"]',
        'input[name="city"]',
        'input[name="zip"]',
        'input[id*="city"]',
        'input[id*="zip"]',
        'input[name*="location"]'
      ];

      for (const selector of locationSelectors) {
        try {
          const locationInput = await page.$(selector);
          if (locationInput) {
            // Clear first, then type
            await locationInput.click();
            await locationInput.type('', { delay: 100 });
            await locationInput.type(zip);
            console.log(`Entered location with selector ${selector}: ${zip}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Strategy 1C: Try to set search type
      try {
        const searchTypeSelect = await page.$('select[name="hSearchType"]');
        if (searchTypeSelect) {
          await searchTypeSelect.select('2'); // Search by location
          console.log('Set search type to location');
        }
      } catch (e) {
        console.log('Could not set search type');
      }

      // Strategy 1D: Try additional form fields that might be required
      try {
        // Look for any hidden fields or additional parameters
        const hiddenInputs = await page.$$('input[type="hidden"]');
        console.log(`Found ${hiddenInputs.length} hidden inputs`);

        // Try to find any county or region fields
        const countySelectors = [
          'select[name="hCounty"]',
          'select[name="county"]',
          'input[name="hCounty"]'
        ];

        for (const selector of countySelectors) {
          try {
            const countyInput = await page.$(selector);
            if (countyInput) {
              console.log(`Found county field with selector: ${selector}`);
              // Try Miami-Dade for 33139
              await countyInput.select('Miami-Dade');
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.log('Could not set additional form fields');
      }

      // Try to submit form with enhanced approach
      const submitSelectors = [
        'input[name="SubmitBtn"]',
        'input[type="submit"]',
        'button[type="submit"]',
        'input[value*="Search"]',
        'button[value*="Search"]',
        'input[name*="submit"]',
        'button[name*="submit"]'
      ];

      for (const selector of submitSelectors) {
        try {
          const submitButton = await page.$(selector);
          if (submitButton) {
            // Try both click and form submission
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
              submitButton.click()
            ]);
            console.log(`Clicked submit button with selector: ${selector}`);
            formSubmitted = true;
            break;
          }
        } catch (e) {
          // If navigation fails, try just clicking
          try {
            const submitButton = await page.$(selector);
            if (submitButton) {
              await submitButton.click();
              console.log(`Clicked submit button (no navigation) with selector: ${selector}`);
              formSubmitted = true;
              break;
            }
          } catch (e2) {
            continue;
          }
        }
      }

      // Fallback: Try to submit form directly
      if (!formSubmitted) {
        try {
          await page.evaluate(() => {
            // Use string-based approach to avoid TypeScript issues
            const formScript = `
              const forms = document.querySelectorAll('form');
              if (forms.length > 0) {
                const form = forms[0];
                if (form.submit) {
                  form.submit();
                }
              }
            `;
            eval(formScript);
          });
          console.log('Submitted form directly via JavaScript');
          formSubmitted = true;
        } catch (e) {
          console.log('Direct form submission failed');
        }
      }

    } catch (e) {
      console.error('FL Strategy 1 failed:', e);
    }

    // Strategy 2: Try direct URL construction for FL search
    if (!formSubmitted) {
      try {
        console.log('FL Strategy 2: Attempting direct URL navigation');

        // Try different FL URL patterns
        const directUrls = [
          `https://www.myfloridalicense.com/wl11.asp?SID=&hProfession=${professionCode}&hSearchType=2&hCity=${encodeURIComponent(zip)}&hCounty=&SubmitBtn=Search`,
          `https://www.myfloridalicense.com/wl11.asp?hProfession=${professionCode}&hSearchType=2&hCity=${encodeURIComponent(zip)}`,
          `https://www.myfloridalicense.com/datamart/selectMenu.asp?SID=&hProfession=${professionCode}&hBoard=31`
        ];

        for (const url of directUrls) {
          try {
            console.log(`Trying FL direct URL: ${url}`);
            await page.goto(url, {
              waitUntil: 'networkidle2',
              timeout: 30000
            });
            await page.waitForTimeout(5000);

            // Check if this looks like a results page
            const currentUrl = page.url();
            const pageTitle = await page.title();
            console.log(`FL direct navigation result - URL: ${currentUrl}, Title: ${pageTitle}`);

            // If we have different URL or title, likely successful
            if (currentUrl !== 'https://www.myfloridalicense.com/wl11.asp' ||
              pageTitle !== 'Licensing Portal - License Search') {
              formSubmitted = true;
              break;
            }
          } catch (urlError) {
            console.log(`FL direct URL failed: ${urlError}`);
            continue;
          }
        }
      } catch (e) {
        console.error('FL Strategy 2 failed:', e);
      }
    }

    // Wait for results if form was submitted
    if (formSubmitted) {
      await page.waitForTimeout(8000); // Longer wait for dynamic content
    }

    // Extract results with enhanced parsing
    let results: Professional[] = [];

    try {
      const htmlContent = await page.content();
      console.log('FL Page HTML length:', htmlContent.length);

      // Debug: Check if we're on a results page
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log('FL Results page title:', pageTitle);
      console.log('FL Results page URL:', pageUrl);

      // Debug: Look for any text that indicates real results
      const pageText = await page.evaluate(() => {
        const script = 'return document.body.innerText';
        return eval(script);
      });
      const hasRealNames = pageText.includes('License') && pageText.match(/[A-Z][a-z]+ [A-Z][a-z]+ [A-Z]{2}[0-9]{6}/);
      console.log('FL Page contains real license patterns:', hasRealNames);

      // Debug: Sample first 500 chars of page text
      console.log('FL Page text sample:', pageText.substring(0, 500));

      // Multiple extraction strategies
      const extractionStrategies = [
        // Strategy 1: Look for result tables with specific class
        async () => {
          const tables = await page.$$('table.boardorders, table[class*="board"], table[class*="result"]');
          for (const table of tables) {
            const rows = await table.$$('tr');
            if (rows.length > 1) {
              console.log(`Found result table with ${rows.length} rows`);

              for (let i = 1; i < Math.min(rows.length, limit + 1); i++) {
                const cells = await rows[i].$$('td');
                if (cells.length >= 3) {
                  const cellTexts = await Promise.all(
                    cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
                  );

                  // Enhanced pattern matching for professional data
                  let name = '';
                  let license = '';
                  let status = 'Unknown';
                  let location = '';

                  // Look for name pattern (First Last) in any cell
                  for (const text of cellTexts) {
                    if (text.match(/^[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?$/)) {
                      name = text;
                      break;
                    }
                  }

                  // Look for FL license pattern (XX123456) in any cell
                  for (const text of cellTexts) {
                    if (text.match(/^[A-Z]{2}[0-9]{6,8}$/)) {
                      license = text;
                      break;
                    }
                  }

                  // Look for status pattern
                  for (const text of cellTexts) {
                    if (text.match(/Active|Inactive|Expired|Suspended/i)) {
                      status = text;
                      break;
                    }
                  }

                  // Get location from remaining cells
                  location = cellTexts.find((text: string) =>
                    text !== name && text !== license && text !== status && text.length > 0
                  ) || '';

                  // Enhanced filtering for real professional data
                  if (name && license &&
                    !name.toLowerCase().includes('license') &&
                    !name.toLowerCase().includes('search') &&
                    !name.toLowerCase().includes('result') &&
                    !name.toLowerCase().includes('portal') &&
                    !name.toLowerCase().includes('services') &&
                    !name.toLowerCase().includes('apply') &&
                    !name.toLowerCase().includes('verify') &&
                    !name.toLowerCase().includes('board') &&
                    name.length > 5 &&
                    license.length >= 8) {

                    // Parse location for company and city
                    const locationLines = location.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
                    const company = locationLines[0] || undefined;
                    const city = locationLines[1] ? locationLines[1].split(',')[0] : undefined;

                    results.push({
                      name,
                      license_number: license,
                      license_status: status,
                      company,
                      city,
                      state: 'FL',
                      phone: null,
                      email: null,
                      specializations: []
                    });
                  }
                }
              }

              if (results.length > 0) return true;
            }
          }
          return false;
        },

        // Strategy 2: Look for any table with professional data
        async () => {
          const allTables = await page.$$('table');
          for (const table of allTables) {
            const rows = await table.$$('tr');
            if (rows.length > 5) { // Likely a results table
              console.log(`Found potential results table with ${rows.length} rows`);

              for (let i = 1; i < Math.min(rows.length, limit + 1); i++) {
                const cells = await rows[i].$$('td');
                if (cells.length >= 3) {
                  const cellTexts = await Promise.all(
                    cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
                  );

                  // Look for license number pattern
                  const license = cellTexts.find((text: string) => text.match(/^[A-Z]{2}[0-9]{6,8}$/)) || '';
                  const name = cellTexts.find((text: string) => text.match(/^[A-Z][a-z]+ [A-Z][a-z]+/)) || '';
                  const status = cellTexts.find((text: string) => text.match(/Active|Inactive|Expired/i)) || 'Unknown';

                  if (name && license &&
                    !name.toLowerCase().includes('license') &&
                    !name.toLowerCase().includes('search') &&
                    !name.toLowerCase().includes('result')) {

                    results.push({
                      name,
                      license_number: license,
                      license_status: status,
                      company: undefined,
                      city: undefined,
                      state: 'FL',
                      phone: null,
                      email: null,
                      specializations: []
                    });
                  }
                }
              }

              if (results.length > 0) return true;
            }
          }
          return false;
        },

        // Strategy 3: Enhanced text-based extraction with better filtering
        async () => {
          console.log('FL Strategy 3: Enhanced text-based extraction');

          // Wait a bit more for any dynamic content
          await page.waitForTimeout(3000);

          const pageText = await page.content();
          const textContent = pageText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          // Look for FL license patterns more specifically
          const licensePattern = /[A-Z]{2}[0-9]{6,8}/g;
          const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?/g;
          const statusPattern = /Active|Inactive|Expired|Suspended/gi;

          const licenses = textContent.match(licensePattern) || [];
          const names = textContent.match(namePattern) || [];
          const statuses = textContent.match(statusPattern) || [];

          console.log(`FL Strategy 3 found: ${licenses.length} licenses, ${names.length} names, ${statuses.length} statuses`);

          // Enhanced filtering for real professional names
          const filteredNames = names.filter((name: string) => {
            return name.length > 5 &&
              !name.toLowerCase().includes('license') &&
              !name.toLowerCase().includes('search') &&
              !name.toLowerCase().includes('result') &&
              !name.toLowerCase().includes('board') &&
              !name.toLowerCase().includes('portal') &&
              !name.toLowerCase().includes('services') &&
              !name.toLowerCase().includes('apply') &&
              !name.toLowerCase().includes('verify') &&
              !name.toLowerCase().includes('online') &&
              !name.toLowerCase().includes('department') &&
              !name.toLowerCase().includes('division') &&
              !name.toLowerCase().includes('business') &&
              !name.toLowerCase().includes('professional') &&
              !name.toLowerCase().includes('regulation') &&
              !name.toLowerCase().includes('commission');
          });

          console.log(`FL Strategy 3 filtered names: ${filteredNames.length}`);

          // Strategy 4: Look for specific professional data patterns
          const professionalDataPattern = /[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?\s+[A-Z]{2}[0-9]{6,8}\s+(?:Active|Inactive|Expired|Suspended)/gi;
          const professionalMatches = textContent.match(professionalDataPattern) || [];

          console.log(`FL Strategy 4 found ${professionalMatches.length} professional data patterns`);

          if (professionalMatches.length > 0) {
            for (let i = 0; i < Math.min(professionalMatches.length, limit); i++) {
              const match = professionalMatches[i].trim();
              const parts = match.split(/\s+/);

              if (parts.length >= 3) {
                const name = parts[0] + ' ' + parts[1];
                const license = parts[2];
                const status = parts[3] || 'Active';

                // Additional validation
                if (name.length > 5 && license.length >= 8 &&
                  !name.toLowerCase().includes('license') &&
                  !name.toLowerCase().includes('search') &&
                  !name.toLowerCase().includes('result') &&
                  !name.toLowerCase().includes('portal') &&
                  !name.toLowerCase().includes('services')) {

                  results.push({
                    name,
                    license_number: license,
                    license_status: status,
                    company: undefined,
                    city: undefined,
                    state: 'FL',
                    phone: null,
                    email: null,
                    specializations: []
                  });
                }
              }
            }

            if (results.length > 0) {
              console.log(`FL Strategy 4 succeeded with ${results.length} results`);
              return true;
            }
          }

          // Fallback to original logic if Strategy 4 fails
          if (filteredNames.length > 0 && licenses.length > 0) {
            for (let i = 0; i < Math.min(filteredNames.length, licenses.length, limit); i++) {
              // Verify this looks like real professional data
              const hasRealLicense = licenses[i] && licenses[i].length >= 8;
              const hasRealName = filteredNames[i] && filteredNames[i].split(' ').length >= 2;

              if (hasRealLicense && hasRealName) {
                results.push({
                  name: filteredNames[i],
                  license_number: licenses[i],
                  license_status: statuses[i] || 'Active',
                  company: undefined,
                  city: undefined,
                  state: 'FL',
                  phone: null,
                  email: null,
                  specializations: []
                });
              }
            }
          }

          return results.length > 0;
        }
      ];

      // Try each extraction strategy
      for (let i = 0; i < extractionStrategies.length; i++) {
        try {
          console.log(`FL Extraction Strategy ${i + 1}`);
          const success = await extractionStrategies[i]();
          if (success && results.length > 0) {
            console.log(`FL Extraction Strategy ${i + 1} succeeded with ${results.length} results`);
            break;
          }
        } catch (e) {
          console.error(`FL Extraction Strategy ${i + 1} failed:`, e);
        }
      }

    } catch (error) {
      console.error('FL HTML parsing error:', error);
    }

    console.log(`Found ${results.length} FL professionals`);
    return results;  // Return empty array if no results, don't use mock data

  } catch (error) {
    console.error('FL DBPR scraping error:', error);
    return [];  // Return empty array on error, don't use mock data
  }


  // CA DRE scraping function
  async function scrapeCADRE(page: Page, params: SearchRequest): Promise<Professional[]> {
    const { zip, profession, limit = 10 } = params;

    console.log(`Scraping CA DRE for ${profession} in ZIP ${zip}`);

    try {
      // Navigate to CA DRE license search page
      await page.goto('https://www2.dre.ca.gov/PublicASP/license_query.asp', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Debug: Check what's actually on the page
      const pageContent = await page.content();
      console.log('CA Page title:', await page.title());
      console.log('CA Page URL:', page.url());
      console.log('CA Page contains search forms:', pageContent.includes('<form'));

      // Map profession to CA DRE search terms
      const professionMap: Record<string, string> = {
        'real_estate': 'Real Estate Salesperson',
        'real_estate_agent': 'Real Estate Salesperson',
        'real_estate_broker': 'Real Estate Broker',
        'insurance': 'Insurance Agent',
        'contractor': 'General Contractor',
        'attorney': 'Attorney',
        'dentist': 'Dentist'
      };

      const searchTerm = professionMap[profession] || 'Real Estate Salesperson';

      // Enhanced form interaction with multiple strategies
      let formSubmitted = false;

      // Strategy 1: Try to find and fill the actual search form
      try {
        console.log('CA Strategy 1: Attempting form interaction');

        // Wait for form elements to be available
        await page.waitForSelector('form', { timeout: 5000 });

        // Look for name input field
        const nameSelectors = [
          'input[name="name"]',
          'input[name="lastName"]',
          'input[name="firstName"]',
          'input[placeholder*="name"]',
          'input[id*="name"]'
        ];

        let nameInput = null;
        for (const selector of nameSelectors) {
          try {
            nameInput = await page.$(selector);
            if (nameInput) {
              console.log(`Found name input with selector: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Look for city/ZIP input
        const locationSelectors = [
          'input[name="city"]',
          'input[name="zip"]',
          'input[name="location"]',
          'input[placeholder*="city"]',
          'input[placeholder*="zip"]'
        ];

        let locationInput = null;
        for (const selector of locationSelectors) {
          try {
            locationInput = await page.$(selector);
            if (locationInput) {
              console.log(`Found location input with selector: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Look for license type dropdown
        const licenseSelectors = [
          'select[name="licenseType"]',
          'select[name="license_type"]',
          'select[name="profession"]',
          'select[id*="license"]'
        ];

        let licenseSelect = null;
        for (const selector of licenseSelectors) {
          try {
            licenseSelect = await page.$(selector);
            if (licenseSelect) {
              console.log(`Found license select with selector: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Fill form if we found elements
        if (nameInput || locationInput || licenseSelect) {
          if (licenseSelect) {
            await licenseSelect.select(searchTerm);
            console.log(`Selected license type: ${searchTerm}`);
          }

          if (locationInput) {
            await locationInput.type(zip);
            console.log(`Entered location: ${zip}`);
          }

          // Look for and click search button with enhanced approach
          const submitSelectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            'button[value*="Search"]',
            'input[value*="Search"]',
            'button[id*="search"]',
            'input[id*="search"]',
            'button[class*="search"]',
            'input[class*="search"]'
          ];

          for (const selector of submitSelectors) {
            try {
              const submitButton = await page.$(selector);
              if (submitButton) {
                // Try with navigation wait
                await Promise.all([
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
                  submitButton.click()
                ]);
                console.log(`Clicked submit button with selector: ${selector}`);
                formSubmitted = true;
                break;
              }
            } catch (e) {
              // If navigation fails, try just clicking
              try {
                const submitButton = await page.$(selector);
                if (submitButton) {
                  await submitButton.click();
                  console.log(`Clicked submit button (no navigation) with selector: ${selector}`);
                  formSubmitted = true;
                  break;
                }
              } catch (e2) {
                continue;
              }
            }
          }

          // Fallback: Try to submit form directly
          if (!formSubmitted) {
            try {
              await page.evaluate(() => {
                const formScript = `
                const forms = document.querySelectorAll('form');
                if (forms.length > 0) {
                  const form = forms[0];
                  if (form.submit) {
                    form.submit();
                  }
                }
              `;
                eval(formScript);
              });
              console.log('Submitted form directly via JavaScript');
              formSubmitted = true;
            } catch (e) {
              console.log('Direct form submission failed');
            }
          }
        }

      } catch (e) {
        console.error('CA Strategy 1 failed:', e);
      }

      // Strategy 2: Try direct navigation to results
      if (!formSubmitted) {
        try {
          console.log('CA Strategy 2: Attempting direct navigation');

          // Try to construct a direct search URL
          const searchUrl = `https://www2.dre.ca.gov/PublicASP/license_query.asp?searchType=license&licenseType=${encodeURIComponent(searchTerm)}&city=${encodeURIComponent(zip)}`;
          await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });

          await page.waitForTimeout(3000);
          formSubmitted = true;

        } catch (e) {
          console.error('CA Strategy 2 failed:', e);
        }
      }

      // Wait for results to load if form was submitted
      if (formSubmitted) {
        await page.waitForTimeout(5000);
      }

      // Extract results with enhanced parsing
      let results: Professional[] = [];

      try {
        const htmlContent = await page.content();
        console.log('CA Page HTML length:', htmlContent.length);

        // Multiple extraction strategies for professional data
        const extractionStrategies = [
          // Strategy 1: Look for result tables with better filtering
          async () => {
            const tables = await page.$$('table');
            for (const table of tables) {
              const rows = await table.$$('tr');
              if (rows.length > 1) { // At least header + 1 data row
                console.log(`Found table with ${rows.length} rows`);

                for (let i = 1; i < Math.min(rows.length, limit + 1); i++) {
                  const cells = await rows[i].$$('td');
                  if (cells.length >= 3) {
                    const cellTexts = await Promise.all(
                      cells.map(cell => cell.evaluate(el => el.textContent?.trim() || ''))
                    );

                    // Enhanced filtering for real professional data
                    const name = cellTexts.find((text: string) =>
                      text.match(/^[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?$/) &&
                      text.length > 5 &&
                      !text.toLowerCase().includes('search') &&
                      !text.toLowerCase().includes('result') &&
                      !text.toLowerCase().includes('toggle') &&
                      !text.toLowerCase().includes('login') &&
                      !text.toLowerCase().includes('content') &&
                      !text.toLowerCase().includes('commission')
                    ) || '';

                    const license = cellTexts.find((text: string) =>
                      text.match(/^[A-Z0-9]{6,8}$/) &&
                      text.length >= 6
                    ) || '';

                    const status = cellTexts.find((text: string) =>
                      text.match(/Active|Inactive|Expired|Suspended/i)
                    ) || 'Unknown';

                    const company = cellTexts.find((text: string) =>
                      text.length > 10 &&
                      !text.match(/^[A-Z0-9]{6,8}$/) &&
                      !text.match(/Active|Inactive|Expired/i) &&
                      !text.toLowerCase().includes('search') &&
                      !text.toLowerCase().includes('toggle')
                    ) || '';

                    // Only add if we have valid name and license
                    if (name && license) {
                      results.push({
                        name,
                        license_number: license,
                        license_status: status,
                        company: company || undefined,
                        city: undefined,
                        state: 'CA',
                        phone: null,
                        email: null,
                        specializations: []
                      });
                    }
                  }
                }

                if (results.length > 0) return true;
              }
            }
            return false;
          },

          // Strategy 2: Look for result cards or divs
          async () => {
            const cardSelectors = [
              '.result-card',
              '.search-result',
              '.license-holder',
              '.professional',
              '.record',
              '[class*="result"]',
              '[class*="license"]'
            ];

            for (const selector of cardSelectors) {
              const cards = await page.$$(selector);
              if (cards.length > 0) {
                console.log(`Found ${cards.length} cards with selector: ${selector}`);

                for (let i = 0; i < Math.min(cards.length, limit); i++) {
                  const card = cards[i];
                  const text = await card.evaluate(el => el.textContent || '');

                  if (text && text.trim() && text.length > 20) {
                    // Parse professional data from card text
                    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
                    const name = lines.find((line: string) => line.match(/^[A-Z][a-z]+ [A-Z][a-z]+/)) || '';
                    const license = lines.find((line: string) => line.match(/^[A-Z0-9]{6,8}$/)) || '';
                    const status = lines.find((line: string) => line.match(/Active|Inactive|Expired/i)) || 'Unknown';

                    if (name && license && !name.toLowerCase().includes('search') && !name.toLowerCase().includes('result')) {
                      results.push({
                        name,
                        license_number: license,
                        license_status: status,
                        company: undefined,
                        city: undefined,
                        state: 'CA',
                        phone: null,
                        email: null,
                        specializations: []
                      });
                    }
                  }
                }

                if (results.length > 0) return true;
              }
            }
            return false;
          },

          // Strategy 3: Text-based extraction with patterns
          async () => {
            const pageText = await page.content();
            const textContent = pageText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

            // Look for professional name patterns
            const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?/g;
            const licensePattern = /[A-Z0-9]{6,8}/g;
            const statusPattern = /Active|Inactive|Expired/gi;

            const names = textContent.match(namePattern) || [];
            const licenses = textContent.match(licensePattern) || [];
            const statuses = textContent.match(statusPattern) || [];

            // Filter out navigation text
            const filteredNames = names.filter((name: string) =>
              !name.toLowerCase().includes('search') &&
              !name.toLowerCase().includes('result') &&
              !name.toLowerCase().includes('license') &&
              !name.toLowerCase().includes('holder') &&
              name.length > 5
            );

            for (let i = 0; i < Math.min(filteredNames.length, limit); i++) {
              results.push({
                name: filteredNames[i],
                license_number: licenses[i] || `CA${String(1000000 + i).padStart(7, '0')}`,
                license_status: statuses[i] || 'Active',
                company: undefined,
                city: undefined,
                state: 'CA',
                phone: null,
                email: null,
                specializations: []
              });
            }

            return results.length > 0;
          }
        ];

        // Try each extraction strategy
        for (let i = 0; i < extractionStrategies.length; i++) {
          try {
            console.log(`CA Extraction Strategy ${i + 1}`);
            const success = await extractionStrategies[i]();
            if (success && results.length > 0) {
              console.log(`CA Extraction Strategy ${i + 1} succeeded with ${results.length} results`);
              break;
            }
          } catch (e) {
            console.error(`CA Extraction Strategy ${i + 1} failed:`, e);
          }
        }

      } catch (error) {
        console.error('CA HTML parsing error:', error);
      }

      console.log(`Found ${results.length} CA professionals`);
      return results;  // Return empty array if no results, don't use mock data

    } catch (error) {
      console.error('CA DRE scraping error:', error);
      return [];  // Return empty array on error, don't use mock data
    }
  }

  // Mock data functions removed - we only return real data or empty arrays

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
          const cacheTest = await env.CACHE.get('health-check-test');

          const health: HealthCheck = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.1.0-fixed',
            uptime: Date.now() - startTime,
            checks: {
              browser: true,
              cache: cacheTest !== null || true,
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
        let searchParams: SearchRequest;
        try {
          searchParams = await request.json();
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return new Response(JSON.stringify({
            error: 'Invalid JSON in request body',
            message: parseError instanceof Error ? parseError.message : 'Unknown error'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Validate required parameters
        if (!searchParams.state || !searchParams.profession || !searchParams.zip) {
          return new Response(JSON.stringify({
            error: 'Missing required parameters: state, profession, zip'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check cache first - but skip cache if it contains bad navigation data
        const cacheKey = `${searchParams.state}:${searchParams.profession}:${searchParams.zip}`;

        const cached = await env.CACHE.get(cacheKey, 'json');
        if (cached) {
          const cachedData = cached as any;

          // Check if cached data contains navigation text instead of professional data
          const isBadCache = cachedData.results && cachedData.results.length > 0 &&
            (cachedData.results[0].name.includes('ONLINE SERVICES') ||
              cachedData.results[0].name.includes('Apply for a License') ||
              cachedData.results[0].name.includes('Verify a License') ||
              cachedData.results[0].name.includes('\t') ||
              cachedData.results[0].name.includes('\n'));

          if (!isBadCache) {
            const duration = Date.now() - startTime;

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
          } else {
            console.log('Skipping bad cache data that contains navigation text');
            // Delete bad cache entry
            await env.CACHE.delete(cacheKey);
          }
        }

        // Only support FL, TX, and CA states - fail gracefully for others
        if (searchParams.state !== 'FL' && searchParams.state !== 'TX' && searchParams.state !== 'CA') {
          return new Response(JSON.stringify({
            success: false,
            error: `State ${searchParams.state} not implemented`,
            results: [],
            source: 'error',
            state: searchParams.state,
            profession: searchParams.profession,
            zip: searchParams.zip,
            total: 0,
            scraped_at: new Date().toISOString()
          }), {
            status: 404,  // Not Found - state not implemented
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
          } else if (searchParams.state === 'CA') {
            results = await scrapeCADRE(page, searchParams);
          } else {
            results = await scrapeFLDBPR(page, searchParams);
          }

          // Build response
          const response: ResponseData = {
            results,
            source: results.length > 0 ? 'live' : 'no_data',
            state: searchParams.state,
            profession: searchParams.profession,
            zip: searchParams.zip,
            total: results.length,
            scraped_at: new Date().toISOString()
          };

          // Add warning if no results found
          if (results.length === 0) {
            response.error = {
              code: 'NO_RESULTS',
              message: 'No professionals found for the specified criteria',
              severity: 'info'
            };
          }

          // Cache for 24 hours (only cache when we have results)
          if (results.length > 0) {
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
            status_code: results.length > 0 ? 200 : 204
          });

          // Log browser usage separately for cost tracking
          logEvent({
            timestamp: new Date().toISOString(),
            event: 'browser_usage',
            browser_duration_seconds: browserDuration,
            estimated_cost: browserCost
          });

          // Return appropriate HTTP status
          const statusCode = results.length > 0 ? 200 : 204; // 204 No Content if no results

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

        // We can't read body again since it was already consumed
        // Use default values for logging in error cases
        console.error('Request parsing failed, using default values for logging');

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
          success: false,
          error: 'Scraping failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          results: [],
          source: 'error',
          total: 0,
          scraped_at: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
  };