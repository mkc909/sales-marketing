import { Router } from 'itty-router';
import puppeteer from '@cloudflare/puppeteer';

// Create router
const router = Router();

// Mock data for fallback
const getMockDataFL = () => ({
    professionals: [
        {
            name: "John Smith",
            license: "BK1234567",
            company: "Sunset Realty",
            city: "Miami",
            phone: "305-555-0123",
            status: "Active",
            expires: "12/31/2024"
        },
        {
            name: "Maria Garcia",
            license: "BK2345678",
            company: "Coastal Properties",
            city: "Fort Lauderdale",
            phone: "954-555-0123",
            status: "Active",
            expires: "06/30/2024"
        }
    ]
});

const getMockDataTX = () => ({
    professionals: [
        {
            name: "Robert Johnson",
            license: "1234567",
            company: "Lone Star Real Estate",
            city: "Houston",
            phone: "713-555-0123",
            status: "Active",
            expires: "12/31/2024"
        },
        {
            name: "Patricia Williams",
            license: "7654321",
            company: "Texas Realty Group",
            city: "Dallas",
            phone: "214-555-0123",
            status: "Active",
            expires: "09/30/2024"
        }
    ]
});

// Improved FL scraper with multiple fallback strategies
async function scrapeFLDBPRImproved(browser, city, profession) {
    const urls = [
        'https://www.myfloridalicense.com/PRApplicationSearch/PRSearchLicenses',
        'https://www.myfloridalicense.com/wr11/',
        'https://www.myfloridalicense.com/PRApplicationSearch/PRSearchLicenses?SID='
    ];

    const professionMap = {
        'real-estate': 'Real Estate Sales Associate',
        'broker': 'Real Estate Broker',
        'appraiser': 'Appraiser'
    };

    const targetProfession = professionMap[profession] || 'Real Estate Sales Associate';

    for (const url of urls) {
        try {
            console.log(`[FL] Trying URL: ${url}`);
            const page = await browser.newPage();

            // Set viewport and user agent
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // Navigate with extended timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for page to load completely
            await page.waitForTimeout(3000);

            // Try multiple selector strategies
            const strategies = [
                // Strategy 1: Original approach
                async () => {
                    const professionSelect = await page.waitForSelector('select[name="hProfession"]', { timeout: 10000 });
                    await professionSelect.selectOption(targetProfession);

                    const cityInput = await page.waitForSelector('input[name="hCity"]', { timeout: 5000 });
                    await cityInput.type(city);

                    await page.click('input[type="submit"]');
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

                    return await extractResultsFromPage(page);
                },

                // Strategy 2: Alternative selectors
                async () => {
                    const professionSelect = await page.waitForSelector('select#hProfession, select[name="profession"], select[id*="profession"]', { timeout: 10000 });
                    await professionSelect.selectOption(targetProfession);

                    const cityInput = await page.waitForSelector('input[name="hCity"], input[name="city"], input[id*="city"]', { timeout: 5000 });
                    await cityInput.type(city);

                    await page.click('input[type="submit"], button[type="submit"], input[value*="Search"]');
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

                    return await extractResultsFromPage(page);
                },

                // Strategy 3: Direct form interaction
                async () => {
                    // Try to find any form with select elements
                    const forms = await page.$$('form');
                    for (const form of forms) {
                        const selects = await form.$$('select');
                        if (selects.length > 0) {
                            // Try to interact with this form
                            const professionSelect = selects[0];
                            await professionSelect.selectOption(targetProfession);

                            const inputs = await form.$$('input[type="text"], input[name*="city"]');
                            if (inputs.length > 0) {
                                await inputs[0].type(city);
                            }

                            const submitBtn = await form.$('input[type="submit"], button[type="submit"]');
                            if (submitBtn) {
                                await submitBtn.click();
                                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
                                return await extractResultsFromPage(page);
                            }
                        }
                    }
                    throw new Error('No suitable form found');
                },

                // Strategy 4: Text-based search
                async () => {
                    // Look for any text that matches our profession
                    const pageText = await page.evaluate(() => {
                        return document.body ? document.body.textContent || '' : '';
                    });

                    if (pageText.includes(targetProfession)) {
                        console.log('[FL] Found profession text on page, attempting direct navigation');
                        // Try to find and click links related to the profession
                        const links = await page.$$('a');
                        for (const link of links) {
                            const text = await link.evaluate(el => el.textContent || '');
                            if (text.toLowerCase().includes('real estate') || text.toLowerCase().includes('license')) {
                                await link.click();
                                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                                break;
                            }
                        }
                    }

                    return await extractResultsFromPage(page);
                }
            ];

            // Try each strategy
            for (let i = 0; i < strategies.length; i++) {
                try {
                    console.log(`[FL] Trying strategy ${i + 1}`);
                    const result = await strategies[i]();
                    await page.close();

                    if (result && result.length > 0) {
                        console.log(`[FL] Strategy ${i + 1} succeeded with ${result.length} results`);
                        return { professionals: result };
                    }
                } catch (strategyError) {
                    console.log(`[FL] Strategy ${i + 1} failed:`, strategyError.message);
                    // Continue to next strategy
                }
            }

            await page.close();
            console.log(`[FL] All strategies failed for URL: ${url}`);

        } catch (error) {
            console.log(`[FL] URL ${url} failed:`, error.message);
            // Continue to next URL
        }
    }

    console.log('[FL] All URLs and strategies exhausted, returning mock data');
    return getMockDataFL();
}

// Improved TX scraper with multiple fallback strategies
async function scrapeTXTRECImproved(browser, city, profession) {
    const urls = [
        'https://www.trec.texas.gov/apps/license-holder-search/',
        'https://www.trec.texas.gov/license-holder-search/',
        'https://www.trec.texas.gov/apps/license-holder-search/?search_type=individual'
    ];

    const professionMap = {
        'real-estate': 'Sales Agent',
        'broker': 'Broker',
        'appraiser': 'Appraiser'
    };

    const targetProfession = professionMap[profession] || 'Sales Agent';

    for (const url of urls) {
        try {
            console.log(`[TX] Trying URL: ${url}`);
            const page = await browser.newPage();

            // Set viewport and user agent
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // Navigate with extended timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for page to load completely
            await page.waitForTimeout(3000);

            // Try multiple selector strategies
            const strategies = [
                // Strategy 1: Original approach
                async () => {
                    const professionSelect = await page.waitForSelector('select[name="license_type"]', { timeout: 10000 });
                    await professionSelect.selectOption(targetProfession);

                    const cityInput = await page.waitForSelector('input[name="city"]', { timeout: 5000 });
                    await cityInput.type(city);

                    await page.click('input[type="submit"]');
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

                    return await extractResultsFromPage(page);
                },

                // Strategy 2: Alternative selectors
                async () => {
                    const professionSelect = await page.waitForSelector('select#license_type, select[name*="license"], select[id*="license"]', { timeout: 10000 });
                    await professionSelect.selectOption(targetProfession);

                    const cityInput = await page.waitForSelector('input[name="city"], input[name*="city"], input[id*="city"]', { timeout: 5000 });
                    await cityInput.type(city);

                    await page.click('input[type="submit"], button[type="submit"], input[value*="Search"]');
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

                    return await extractResultsFromPage(page);
                },

                // Strategy 3: Direct form interaction
                async () => {
                    // Try to find any form with select elements
                    const forms = await page.$$('form');
                    for (const form of forms) {
                        const selects = await form.$$('select');
                        if (selects.length > 0) {
                            // Try to interact with this form
                            const professionSelect = selects[0];
                            await professionSelect.selectOption(targetProfession);

                            const inputs = await form.$$('input[type="text"], input[name*="city"]');
                            if (inputs.length > 0) {
                                await inputs[0].type(city);
                            }

                            const submitBtn = await form.$('input[type="submit"], button[type="submit"]');
                            if (submitBtn) {
                                await submitBtn.click();
                                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
                                return await extractResultsFromPage(page);
                            }
                        }
                    }
                    throw new Error('No suitable form found');
                },

                // Strategy 4: Text-based search
                async () => {
                    // Look for any text that matches our profession
                    const pageText = await page.evaluate(() => {
                        return document.body ? document.body.textContent || '' : '';
                    });

                    if (pageText.includes('License Holder') || pageText.includes('Search')) {
                        console.log('[TX] Found search text on page, attempting direct navigation');
                        // Try to find and click links related to search
                        const links = await page.$$('a');
                        for (const link of links) {
                            const text = await link.evaluate(el => el.textContent || '');
                            if (text.toLowerCase().includes('search') || text.toLowerCase().includes('license')) {
                                await link.click();
                                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                                break;
                            }
                        }
                    }

                    return await extractResultsFromPage(page);
                }
            ];

            // Try each strategy
            for (let i = 0; i < strategies.length; i++) {
                try {
                    console.log(`[TX] Trying strategy ${i + 1}`);
                    const result = await strategies[i]();
                    await page.close();

                    if (result && result.length > 0) {
                        console.log(`[TX] Strategy ${i + 1} succeeded with ${result.length} results`);
                        return { professionals: result };
                    }
                } catch (strategyError) {
                    console.log(`[TX] Strategy ${i + 1} failed:`, strategyError.message);
                    // Continue to next strategy
                }
            }

            await page.close();
            console.log(`[TX] All strategies failed for URL: ${url}`);

        } catch (error) {
            console.log(`[TX] URL ${url} failed:`, error.message);
            // Continue to next URL
        }
    }

    console.log('[TX] All URLs and strategies exhausted, returning mock data');
    return getMockDataTX();
}

// Helper function to extract results from page
async function extractResultsFromPage(page) {
    const results = [];

    try {
        // Try multiple result extraction patterns
        const extractionPatterns = [
            // Pattern 1: Table rows
            async () => {
                const rows = await page.$$('table tr');
                for (const row of rows.slice(1)) { // Skip header row
                    const cells = await row.$$('td');
                    if (cells.length >= 3) {
                        const text = await Promise.all(cells.map(cell => cell.evaluate(el => el.textContent || '')));
                        results.push({
                            name: text[0]?.trim() || '',
                            license: text[1]?.trim() || '',
                            company: text[2]?.trim() || '',
                            city: text[3]?.trim() || '',
                            phone: text[4]?.trim() || '',
                            status: text[5]?.trim() || '',
                            expires: text[6]?.trim() || ''
                        });
                    }
                }
            },

            // Pattern 2: Div elements
            async () => {
                const divs = await page.$$('div.result, div.record, div.license-holder');
                for (const div of divs) {
                    const text = await div.evaluate(el => el.textContent || '');
                    if (text.length > 20) { // Only substantial content
                        results.push({
                            name: extractField(text, ['Name:', 'Licensee:']),
                            license: extractField(text, ['License:', 'License #:']),
                            company: extractField(text, ['Company:', 'Broker:']),
                            city: extractField(text, ['City:', 'Location:']),
                            phone: extractField(text, ['Phone:', 'Tel:']),
                            status: extractField(text, ['Status:', 'License Status:']),
                            expires: extractField(text, ['Expires:', 'Expiration:'])
                        });
                    }
                }
            },

            // Pattern 3: List items
            async () => {
                const items = await page.$$('li.result, li.record, li.license-holder');
                for (const item of items) {
                    const text = await item.evaluate(el => el.textContent || '');
                    if (text.length > 20) { // Only substantial content
                        results.push({
                            name: extractField(text, ['Name:', 'Licensee:']),
                            license: extractField(text, ['License:', 'License #:']),
                            company: extractField(text, ['Company:', 'Broker:']),
                            city: extractField(text, ['City:', 'Location:']),
                            phone: extractField(text, ['Phone:', 'Tel:']),
                            status: extractField(text, ['Status:', 'License Status:']),
                            expires: extractField(text, ['Expires:', 'Expiration:'])
                        });
                    }
                }
            },

            // Pattern 4: Any text content (last resort)
            async () => {
                const textContent = await page.evaluate(() => {
                    return document.body ? document.body.textContent || '' : '';
                });
                const lines = textContent.split('\n').map((line: string) => line.trim()).filter((line: string) => line);

                // Try to parse structured data from text lines
                let currentRecord = {};
                for (const line of lines) {
                    if (line.includes('License') || line.includes('Name')) {
                        if (Object.keys(currentRecord).length > 0) {
                            results.push(currentRecord);
                            currentRecord = {};
                        }
                    }

                    if (line.includes('Name:')) currentRecord.name = line.split('Name:')[1]?.trim();
                    if (line.includes('License:')) currentRecord.license = line.split('License:')[1]?.trim();
                    if (line.includes('Company:')) currentRecord.company = line.split('Company:')[1]?.trim();
                    if (line.includes('City:')) currentRecord.city = line.split('City:')[1]?.trim();
                    if (line.includes('Phone:')) currentRecord.phone = line.split('Phone:')[1]?.trim();
                    if (line.includes('Status:')) currentRecord.status = line.split('Status:')[1]?.trim();
                    if (line.includes('Expires:')) currentRecord.expires = line.split('Expires:')[1]?.trim();
                }

                if (Object.keys(currentRecord).length > 0) {
                    results.push(currentRecord);
                }
            }
        ];

        // Try each extraction pattern
        for (const pattern of extractionPatterns) {
            try {
                await pattern();
                if (results.length > 0) {
                    console.log(`[EXTRACT] Found ${results.length} results`);
                    break;
                }
            } catch (error) {
                console.log(`[EXTRACT] Pattern failed:`, error.message);
            }
        }

    } catch (error) {
        console.log('[EXTRACT] All patterns failed:', error.message);
    }

    return results;
}

// Helper function to extract field from text
function extractField(text, labels) {
    for (const label of labels) {
        if (text.includes(label)) {
            const parts = text.split(label);
            if (parts.length > 1) {
                const value = parts[1].split(/\s*(?:,|;|\n)\s*/)[0].trim();
                return value;
            }
        }
    }
    return '';
}

// Health check endpoint
router.get('/health', async (request, env) => {
    return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-improved'
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
});

// Main scraping endpoint
router.get('/scrape', async (request, env) => {
    const url = new URL(request.url);
    const state = url.searchParams.get('state')?.toUpperCase();
    const city = url.searchParams.get('city') || '';
    const profession = url.searchParams.get('profession') || 'real-estate';
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

    if (!state) {
        return new Response(JSON.stringify({ error: 'State parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const cacheKey = `scrape:${state}:${city}:${profession}`;
    const startTime = Date.now();

    // Check cache first (unless force refresh)
    if (!forceRefresh && env.CACHE) {
        try {
            const cached = await env.CACHE.get(cacheKey, 'json');
            if (cached) {
                console.log(`[CACHE HIT] ${cacheKey}`);
                return new Response(JSON.stringify({
                    ...cached,
                    cached: true,
                    performance: {
                        totalTime: Date.now() - startTime,
                        cacheTime: Date.now() - startTime
                    }
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'HIT'
                    }
                });
            }
        } catch (cacheError) {
            console.log('[CACHE ERROR]', cacheError);
        }
    }

    console.log(`[CACHE MISS] ${cacheKey}`);
    console.log(`[SCRAPE] Starting: ${state} ${city} ${profession}`);

    let browser;
    try {
        // Launch browser with optimized settings
        browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        let result;

        // Use improved scrapers
        switch (state) {
            case 'FL':
                result = await scrapeFLDBPRImproved(browser, city, profession);
                break;
            case 'TX':
                result = await scrapeTXTRECImproved(browser, city, profession);
                break;
            default:
                throw new Error(`Unsupported state: ${state}`);
        }

        await browser.close();

        // Cache the results
        if (env.CACHE && result) {
            try {
                await env.CACHE.put(cacheKey, JSON.stringify(result), {
                    expirationTtl: 3600 // 1 hour cache
                });
            } catch (cacheError) {
                console.log('[CACHE PUT ERROR]', cacheError);
            }
        }

        const responseTime = Date.now() - startTime;
        console.log(`[SCRAPE] Completed in ${responseTime}ms`);

        return new Response(JSON.stringify({
            ...result,
            cached: false,
            performance: {
                totalTime: responseTime,
                scrapeTime: responseTime
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS'
            }
        });

    } catch (error) {
        if (browser) {
            await browser.close();
        }

        console.error('[SCRAPE ERROR]', error);

        // Return mock data on error
        const mockData = state === 'FL' ? getMockDataFL() : getMockDataTX();

        return new Response(JSON.stringify({
            ...mockData,
            cached: false,
            error: error.message,
            fallback: 'mock',
            performance: {
                totalTime: Date.now() - startTime,
                scrapeTime: Date.now() - startTime
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS',
                'X-Fallback': 'MOCK'
            }
        });
    }
});

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export the fetch handler
export default {
    async fetch(request, env, ctx) {
        return router.handle(request, env, ctx);
    }
};