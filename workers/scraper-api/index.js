/**
 * Scraper API Edge Worker
 * Provides edge caching and rate limiting for the live scraping system
 */

import { Router } from 'itty-router';

// Create router
const router = Router();

// Configuration
const CONFIG = {
    // Browser agent URL - Cloudflare Browser Rendering Worker
    BROWSER_AGENT_URL: 'https://scraper-browser.magicmike.workers.dev',

    // Cache settings
    CACHE_TTL: 86400, // 24 hours in seconds
    CACHE_KEY_PREFIX: 'scraper:',

    // Rate limiting
    RATE_LIMIT_WINDOW: 60, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 10,

    // Supported professions
    SUPPORTED_PROFESSIONS: [
        'real_estate_agent',
        'insurance_agent',
        'dentist',
        'attorney',
        'contractor'
    ]
};

/**
 * Generate cache key
 */
function getCacheKey(zip, profession, name = null) {
    const key = name ? `${name}-${profession}-${zip}` : `${profession}-${zip}`;
    return CONFIG.CACHE_KEY_PREFIX + key;
}

/**
 * Check rate limit using KV
 */
async function checkRateLimit(request, env) {
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;

    // Get existing requests for this IP
    const existingKey = `rate_limit:${clientIP}`;
    const existing = await env.SCRAPER_KV.get(existingKey);

    let requests = [];
    if (existing) {
        try {
            requests = JSON.parse(existing);
        } catch (e) {
            requests = [];
        }
    }

    // Filter out old requests
    requests = requests.filter(timestamp => timestamp > windowStart);

    // Check if rate limit exceeded
    if (requests.length >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
        return {
            allowed: false,
            retryAfter: CONFIG.RATE_LIMIT_WINDOW,
            currentCount: requests.length
        };
    }

    // Add current request
    requests.push(now);

    // Store updated requests
    await env.SCRAPER_KV.put(existingKey, JSON.stringify(requests), {
        expirationTtl: CONFIG.RATE_LIMIT_WINDOW + 60
    });

    return {
        allowed: true,
        remainingRequests: CONFIG.RATE_LIMIT_MAX_REQUESTS - requests.length
    };
}

/**
 * Get cached results
 */
async function getCachedResults(cacheKey, env) {
    try {
        const cached = await env.SCRAPER_KV.get(cacheKey, 'json');
        if (cached) {
            return {
                data: cached.data,
                cached: true,
                cachedAt: cached.timestamp
            };
        }
    } catch (e) {
        console.error('Cache get error:', e);
    }
    return null;
}

/**
 * Cache results
 */
async function cacheResults(cacheKey, data, env) {
    try {
        await env.SCRAPER_KV.put(cacheKey, JSON.stringify({
            data,
            timestamp: Math.floor(Date.now() / 1000)
        }), {
            expirationTtl: CONFIG.CACHE_TTL
        });
    } catch (e) {
        console.error('Cache set error:', e);
    }
}

/**
 * Forward request to browser rendering worker
 */
async function forwardToBrowserAgent(body, env) {
    // Transform request for browser rendering worker
    const browserRequest = {
        state: 'FL',  // Default to FL for now
        profession: body.profession.replace('_agent', ''),  // Normalize profession name
        zip: body.zip,
        limit: body.limit || 10
    };

    const response = await fetch(CONFIG.BROWSER_AGENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'EstateFlow-Scraper-Worker/1.0'
        },
        body: JSON.stringify(browserRequest)
    });

    if (!response.ok) {
        throw new Error(`Browser rendering worker returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform response to match expected format
    return {
        success: true,
        data: data.results || [],
        source: data.source || 'live',
        scraped_at: data.scraped_at
    };
}

/**
 * Handle CORS
 */
function handleCORS(request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    return corsHeaders;
}

/**
 * New search endpoint (simpler interface)
 */
router.post('/search', async (request, env) => {
    try {
        const corsHeaders = handleCORS(request);
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const body = await request.json();
        const { state, profession, zip, limit = 10 } = body;

        // Validate required fields
        if (!state || !profession || !zip) {
            return new Response(JSON.stringify({
                error: 'Missing required parameters: state, profession, zip'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Forward directly to browser rendering worker
        const response = await fetch(CONFIG.BROWSER_AGENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ state, profession, zip, limit })
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Search error:', error);
        const corsHeaders = handleCORS(request);
        return new Response(JSON.stringify({
            error: 'Search failed',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Main scrape endpoint (legacy)
 */
router.post('/api/scrape', async (request, env) => {
    try {
        // Handle CORS
        const corsHeaders = handleCORS(request);
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Parse request body
        const body = await request.json();
        const { zip, profession, name, useCache = true } = body;

        // Validate required fields
        if (!zip || !profession) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required parameters: zip and profession'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate profession
        if (!CONFIG.SUPPORTED_PROFESSIONS.includes(profession)) {
            return new Response(JSON.stringify({
                success: false,
                error: `Unsupported profession: ${profession}. Supported: ${CONFIG.SUPPORTED_PROFESSIONS.join(', ')}`
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check rate limit
        const rateLimit = await checkRateLimit(request, env);
        if (!rateLimit.allowed) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: rateLimit.retryAfter,
                currentCount: rateLimit.currentCount
            }), {
                status: 429,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Retry-After': rateLimit.retryAfter.toString()
                }
            });
        }

        // Check cache first
        const cacheKey = getCacheKey(zip, profession, name);
        if (useCache) {
            const cached = await getCachedResults(cacheKey, env);
            if (cached) {
                return new Response(JSON.stringify({
                    success: true,
                    data: cached.data,
                    cached: true,
                    cachedAt: cached.cachedAt,
                    source: 'edge_cache'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Forward to browser agent
        const result = await forwardToBrowserAgent(body, env);

        // Cache successful results
        if (result.success && result.data && result.data.length > 0) {
            await cacheResults(cacheKey, result.data, env);
        }

        // Add edge metadata
        result.edgeCached = false;
        result.rateLimitRemaining = rateLimit.remainingRequests;

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Scrape error:', error);

        const corsHeaders = handleCORS(request);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Health check endpoint
 */
router.get('/health', async (request, env) => {
    try {
        // Check KV connectivity
        const testKey = 'health_check';
        await env.SCRAPER_KV.put(testKey, 'ok', { expirationTtl: 60 });
        const kvResult = await env.SCRAPER_KV.get(testKey);

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            kv: kvResult === 'ok' ? 'connected' : 'disconnected',
            browserAgent: CONFIG.BROWSER_AGENT_URL,
            version: '1.0.0'
        };

        return new Response(JSON.stringify(health), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            status: 'unhealthy',
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Cache stats endpoint
 */
router.get('/api/cache/stats', async (request, env) => {
    try {
        // Get cache keys
        const list = await env.SCRAPER_KV.list({ prefix: CONFIG.CACHE_KEY_PREFIX });

        const stats = {
            totalKeys: list.keys.length,
            cacheTTL: CONFIG.CACHE_TTL,
            prefix: CONFIG.CACHE_KEY_PREFIX,
            keys: list.keys.map(key => ({
                name: key.name,
                expiration: key.expiration
            }))
        };

        return new Response(JSON.stringify(stats), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Failed to get cache stats',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Clear cache endpoint
 */
router.post('/api/cache/clear', async (request, env) => {
    try {
        // Get all cache keys
        const list = await env.SCRAPER_KV.list({ prefix: CONFIG.CACHE_KEY_PREFIX });

        // Delete all cache keys
        const deletePromises = list.keys.map(key => env.SCRAPER_KV.delete(key.name));
        await Promise.all(deletePromises);

        return new Response(JSON.stringify({
            success: true,
            deletedKeys: list.keys.length,
            message: 'Cache cleared successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to clear cache',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Supported professions endpoint
 */
router.get('/api/supported', async (request, env) => {
    const data = {
        professions: CONFIG.SUPPORTED_PROFESSIONS,
        cacheTTL: CONFIG.CACHE_TTL,
        rateLimit: {
            window: CONFIG.RATE_LIMIT_WINDOW,
            maxRequests: CONFIG.RATE_LIMIT_MAX_REQUESTS
        }
    };

    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
});

/**
 * 404 handler
 */
router.all('*', () => {
    return new Response(JSON.stringify({
        error: 'Not found',
        message: 'Endpoint not found'
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
});

/**
 * Main fetch handler
 */
export default {
    async fetch(request, env, ctx) {
        try {
            return await router.handle(request, env, ctx);
        } catch (error) {
            console.error('Worker error:', error);

            return new Response(JSON.stringify({
                error: 'Internal worker error',
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};