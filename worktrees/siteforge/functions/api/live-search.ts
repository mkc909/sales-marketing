/**
 * Live Search API Endpoint
 * Combines live scraping with database fallback for professional data search
 */

import { json } from '@remix-run/cloudflare';

// Configuration
const CONFIG = {
    // Scraper API URL - update this to your deployed scraper worker
    SCRAPER_API_URL: 'https://scraper-api.magicmike.workers.dev/api/scrape',

    // Database fallback settings
    DATABASE_LIMIT: 50,

    // Supported professions
    SUPPORTED_PROFESSIONS: [
        'real_estate_agent',
        'insurance_agent',
        'dentist',
        'attorney',
        'contractor'
    ],

    // Cache settings
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
};

interface Professional {
    name: string;
    licenseNumber?: string;
    licenseType?: string;
    status?: string;
    expirationDate?: string;
    state?: string;
    profession?: string;
    zip?: string;
    scrapedAt?: string;
    source?: string;
    // Database fields
    id?: string;
    specialties?: string[];
    verified?: boolean;
    website?: string;
    headshot_url?: string;
    profile_views?: number;
}

interface LiveSearchRequest {
    zip: string;
    profession: string;
    name?: string;
    useLiveSearch?: boolean;
    useDatabase?: boolean;
    limit?: number;
}

interface LiveSearchResponse {
    success: boolean;
    data: Professional[];
    sources: {
        live?: number;
        database?: number;
        total: number;
    };
    metadata: {
        zip: string;
        profession: string;
        name?: string;
        executionTime: number;
        cached?: boolean;
        errors?: string[];
    };
}

/**
 * Call live scraper API
 */
async function callLiveScraper(
    zip: string,
    profession: string,
    name?: string
): Promise<{ data: Professional[], cached?: boolean }> {
    try {
        const response = await fetch(CONFIG.SCRAPER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EstateFlow-LiveSearch/1.0'
            },
            body: JSON.stringify({
                zip,
                profession,
                name,
                useCache: true
            })
        });

        if (!response.ok) {
            throw new Error(`Scraper API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as any;

        if (!result.success) {
            throw new Error(result.error || 'Scraper API failed');
        }

        return {
            data: result.data || [],
            cached: result.cached
        };
    } catch (error) {
        console.error('Live scraper error:', error);
        throw error;
    }
}

/**
 * Get professionals from database
 */
async function getFromDatabase(
    zip: string,
    profession: string,
    limit: number = CONFIG.DATABASE_LIMIT,
    context: any
): Promise<Professional[]> {
    try {
        // Query tenants table for businesses matching the profession and zip
        const db = context.env.DB;
        const { results } = await db
            .prepare(`
            SELECT
              id,
              business_name as name,
              industry as profession,
              phone,
              email,
              website_previous as website,
              address,
              city,
              state,
              zip,
              latitude,
              longitude,
              created_at
            FROM tenants
            WHERE zip = ?
              AND industry = ?
              AND status = 'active'
            ORDER BY business_name
            LIMIT ?
          `)
            .bind(zip, profession.replace('_', ''), limit)
            .all();

        return results.map((prof: any) => ({
            ...prof,
            source: 'database',
            profession: prof.profession || profession,
            verified: true
        }));
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

/**
 * Deduplicate results by license number or name
 */
function deduplicateResults(liveResults: Professional[], dbResults: Professional[]): Professional[] {
    const seen = new Set();
    const deduplicated: Professional[] = [];

    // Process live results first (higher priority)
    for (const result of liveResults) {
        const key = result.licenseNumber || result.name;
        if (!seen.has(key)) {
            seen.add(key);
            deduplicated.push(result);
        }
    }

    // Process database results
    for (const result of dbResults) {
        const key = result.licenseNumber || result.name;
        if (!seen.has(key)) {
            seen.add(key);
            deduplicated.push(result);
        }
    }

    return deduplicated;
}

/**
 * Main live search handler
 */
export async function action({ request }: { request: Request }) {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
        // Parse request body
        const body: LiveSearchRequest = await request.json();
        const { zip, profession, name, useLiveSearch = true, useDatabase = true, limit = 50 } = body;

        // Validate required fields
        if (!zip || !profession) {
            return json<LiveSearchResponse>({
                success: false,
                data: [],
                sources: { total: 0 },
                metadata: {
                    zip,
                    profession,
                    executionTime: Date.now() - startTime,
                    errors: ['Missing required parameters: zip and profession']
                }
            }, { status: 400 });
        }

        // Validate profession
        if (!CONFIG.SUPPORTED_PROFESSIONS.includes(profession)) {
            return json<LiveSearchResponse>({
                success: false,
                data: [],
                sources: { total: 0 },
                metadata: {
                    zip,
                    profession,
                    executionTime: Date.now() - startTime,
                    errors: [`Unsupported profession: ${profession}`]
                }
            }, { status: 400 });
        }

        let liveResults: Professional[] = [];
        let dbResults: Professional[] = [];
        let cached = false;
        const sources = { live: 0, database: 0, total: 0 };

        // Try live search first
        if (useLiveSearch) {
            try {
                const liveData = await callLiveScraper(zip, profession, name);
                liveResults = liveData.data;
                cached = liveData.cached || false;
                sources.live = liveResults.length;
            } catch (error) {
                console.error('Live search failed:', error);
                errors.push(`Live search failed: ${(error as Error).message}`);
            }
        }

        // Fallback to database
        if (useDatabase && (liveResults.length === 0 || !useLiveSearch)) {
            try {
                dbResults = await getFromDatabase(zip, profession, limit, { env: { DB: (globalThis as any).DB } });
                sources.database = dbResults.length;
            } catch (error) {
                console.error('Database search failed:', error);
                errors.push(`Database search failed: ${(error as Error).message}`);
            }
        }

        // Combine and deduplicate results
        const allResults = deduplicateResults(liveResults, dbResults);
        sources.total = allResults.length;

        // Limit results
        const limitedResults = allResults.slice(0, limit);

        return json<LiveSearchResponse>({
            success: true,
            data: limitedResults,
            sources,
            metadata: {
                zip,
                profession,
                name,
                executionTime: Date.now() - startTime,
                cached,
                errors: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error) {
        console.error('Live search error:', error);

        return json<LiveSearchResponse>({
            success: false,
            data: [],
            sources: { total: 0 },
            metadata: {
                zip: '',
                profession: '',
                executionTime: Date.now() - startTime,
                errors: [`Internal server error: ${(error as Error).message}`]
            }
        }, { status: 500 });
    }
}

/**
 * GET handler for testing
 */
export async function loader({ request }: { request: Request }) {
    const url = new URL(request.url);
    const zip = url.searchParams.get('zip');
    const profession = url.searchParams.get('profession');
    const name = url.searchParams.get('name');

    if (!zip || !profession) {
        return json({
            success: false,
            error: 'Missing required parameters: zip and profession',
            usage: {
                method: 'POST',
                endpoint: '/api/live-search',
                body: {
                    zip: '33139',
                    profession: 'real_estate_agent',
                    name: 'John Doe', // optional
                    useLiveSearch: true, // optional
                    useDatabase: true, // optional
                    limit: 50 // optional
                },
                supportedProfessions: CONFIG.SUPPORTED_PROFESSIONS
            }
        }, { status: 400 });
    }

    // Convert GET to POST for processing
    const mockRequest = new Request(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            zip,
            profession,
            name,
            useLiveSearch: true,
            useDatabase: true,
            limit: 50
        })
    });

    return action({ request: mockRequest });
}