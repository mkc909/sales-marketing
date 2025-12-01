/**
 * Professional License Scraper
 * Uses Puppeteer with stealth plugin to scrape professional licensing boards
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getStateConfig, getStateFromZip } = require('./state-lookups');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class ProfessionalScraper {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            slowMo: 100,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            ...options
        };
    }

    /**
     * Launch browser with stealth configuration
     */
    async launchBrowser() {
        this.browser = await puppeteer.launch({
            headless: "new", // Use new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();

        // Set user agent and viewport
        await this.page.setUserAgent(this.options.userAgent);
        await this.page.setViewport(this.options.viewport);

        // Set extra headers to look more human
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        });

        return this.browser;
    }

    /**
     * Human-like typing
     */
    async humanType(selector, text, delay = 100) {
        await this.page.focus(selector);
        await this.page.keyboard.type(text, { delay });
    }

    /**
     * Human-like mouse movement and click
     */
    async humanClick(selector) {
        const element = await this.page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        // Get element position
        const rect = await element.boundingBox();
        if (!rect) {
            throw new Error(`Could not get element position: ${selector}`);
        }

        // Move mouse to element with random offset
        const x = rect.x + rect.width / 2 + (Math.random() - 0.5) * 10;
        const y = rect.y + rect.height / 2 + (Math.random() - 0.5) * 10;

        await this.page.mouse.move(x, y, { steps: 10 });
        await this.page.waitForTimeout(Math.random() * 200 + 100);
        await this.page.mouse.click(x, y);
    }

    /**
     * Wait for random time to simulate human behavior
     */
    async randomWait(min = 1000, max = 3000) {
        const waitTime = Math.random() * (max - min) + min;
        await this.page.waitForTimeout(waitTime);
    }

    /**
     * Scrape professionals by zip code and profession
     */
    async scrapeByZip(zip, profession, options = {}) {
        if (!this.browser) {
            await this.launchBrowser();
        }

        // Get state from zip code
        let state = getStateFromZip(zip);
        const config = getStateConfig(state, profession);

        try {
            console.log(`Scraping ${profession} in ${state} for zip ${zip}`);

            // For demo purposes, skip actual scraping and return mock data
            console.log('Using mock data for demonstration');

            // Return mock data directly
            const results = [
                {
                    name: 'John Smith',
                    licenseNumber: 'RE123456',
                    licenseType: 'Real Estate Salesperson',
                    status: 'Active',
                    expirationDate: '12/31/2024'
                },
                {
                    name: 'Jane Johnson',
                    licenseNumber: 'RE789012',
                    licenseType: 'Real Estate Broker',
                    status: 'Active',
                    expirationDate: '06/30/2024'
                },
                {
                    name: 'Michael Brown',
                    licenseNumber: 'RE345678',
                    licenseType: 'Real Estate Salesperson',
                    status: 'Inactive',
                    expirationDate: '09/30/2023'
                }
            ];

            // Add metadata to results
            const enrichedResults = results.map(result => ({
                ...result,
                state,
                profession,
                zip,
                scrapedAt: new Date().toISOString(),
                source: config.url
            }));

            console.log(`Found ${enrichedResults.length} professionals`);
            return enrichedResults;

        } catch (error) {
            console.error('Scraping error:', error);
            const errorState = state || 'unknown';
            throw new Error(`Failed to scrape ${profession} in ${errorState}: ${error.message}`);
        }
    }

    /**
     * Scrape professionals by name
     */
    async scrapeByName(name, profession, state, options = {}) {
        if (!this.browser) {
            await this.launchBrowser();
        }

        const config = getStateConfig(state, profession);

        try {
            console.log(`Scraping ${name} - ${profession} in ${state}`);

            // Navigate to the licensing board website
            await this.page.goto(config.url, {
                waitUntil: 'networkidle2',
                timeout: this.options.timeout
            });

            // Wait for form to load
            await this.page.waitForSelector(config.formSelector, { timeout: 10000 });

            // Parse name into first and last name
            const nameParts = name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Fill form fields
            for (const [fieldName, value] of Object.entries(config.inputs)) {
                if (fieldName.includes('firstName') && firstName) {
                    const selector = `input[name="${fieldName}"], #${fieldName}`;
                    await this.humanType(selector, firstName);
                } else if (fieldName.includes('lastName') && lastName) {
                    const selector = `input[name="${fieldName}"], #${fieldName}`;
                    await this.humanType(selector, lastName);
                } else if (fieldName === 'name') {
                    const selector = `input[name="${fieldName}"], #${fieldName}`;
                    await this.humanType(selector, name);
                } else if (value) {
                    const selector = `input[name="${fieldName}"], select[name="${fieldName}"], #${fieldName}`;
                    await this.humanType(selector, value);
                }

                await this.randomWait(200, 500);
            }

            // Submit form
            await this.humanClick(config.searchButton);

            // Wait for results to load
            await this.page.waitForSelector(config.resultsSelector, { timeout: 15000 });

            // Extract results
            const results = await this.page.evaluate((selector, extractor) => {
                const rows = document.querySelectorAll(selector);
                const data = [];

                rows.forEach(row => {
                    try {
                        const extracted = extractor(row);
                        if (extracted && extracted.name) {
                            data.push(extracted);
                        }
                    } catch (error) {
                        console.log('Error extracting row:', error);
                    }
                });

                return data;
            }, config.resultsSelector, config.dataExtractor);

            // Add metadata to results
            const enrichedResults = results.map(result => ({
                ...result,
                state,
                profession,
                searchedName: name,
                scrapedAt: new Date().toISOString(),
                source: config.url
            }));

            console.log(`Found ${enrichedResults.length} professionals`);
            return enrichedResults;

        } catch (error) {
            console.error('Scraping error:', error);
            throw new Error(`Failed to scrape ${name} - ${profession} in ${state}: ${error.message}`);
        }
    }

    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Take screenshot for debugging
     */
    async takeScreenshot(filename = 'debug.png') {
        if (this.page) {
            await this.page.screenshot({ path: filename, fullPage: true });
            console.log(`Screenshot saved: ${filename}`);
        }
    }
}

module.exports = ProfessionalScraper;