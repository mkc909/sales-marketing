/**
 * ProGeoData x402 API Endpoint
 * Payment-gated API that proxies to the existing scraper-api
 * Implements x402 payment protocol for monetization
 */

import { Router } from 'itty-router';

// Create router
const router = Router();

// Configuration
const CONFIG = {
    X402_VERSION: 1,
    PRICING: {
        search: '0.02',      // $0.02 per search
        enriched: '0.10',    // $0.10 per enriched result
        bulk: '0.01'         // $0.01 per bulk record
    },
    SUPPORTED_ENDPOINTS: ['/v1/search', '/v1/enriched', '/v1/bulk'],
    ACCEPTED_ASSETS: ['base'],
    PAY_TO_ADDRESS: '0x402PaymentAddress' // Replace with actual payment address
};

/**
 * Generate x402 response format
 */
function generateX402Response(accepts) {
    return {
        x402Version: CONFIG.X402_VERSION,
        accepts: accepts,
        payer: 'ProGeoData x402 API'
    };
}

/**
 * Generate accepts array for x402 protocol
 */
function generateAcceptsArray(endpoint, pricing) {
    return [{
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: pricing,
        resource: endpoint,
        description: `ProGeoData ${endpoint.replace('/v1/', '')} API access`,
        mimeType: 'application/json',
        payTo: CONFIG.PAY_TO_ADDRESS,
        maxTimeoutSeconds: 30,
        asset: 'base',
        outputSchema: {
            input: {
                type: 'http',
                method: 'POST',
                bodyType: 'json',
                bodyFields: {
                    // Common fields for all endpoints
                    state: { type: 'string', required: true, description: 'State code (e.g., FL)' },
                    profession: { type: 'string', required: true, description: 'Profession type' },
                    zip: { type: 'string', required: true, description: 'ZIP code' },
                    limit: { type: 'number', description: 'Maximum results to return' }
                }
            },
            output: {
                success: { type: 'boolean', description: 'Request success status' },
                data: { type: 'array', description: 'Search results' },
                source: { type: 'string', description: 'Data source' },
                timestamp: { type: 'string', description: 'Response timestamp' }
            }
        }
    }];
}

/**
 * x402 middleware - handles payment gating
 */
async function x402Middleware(request, env) {
    // Check if this is an x402 payment request
    const paymentHeader = request.headers.get('x-402-payment');

    if (paymentHeader) {
        // This is a paid request - verify payment and proxy to scraper API
        try {
            const paymentData = JSON.parse(paymentHeader);

            // Validate payment (simplified - in production would verify on-chain)
            if (!paymentData || !paymentData.amount || !paymentData.txHash) {
                return new Response(JSON.stringify({
                    error: 'Invalid payment data',
                    x402Version: CONFIG.X402_VERSION
                }), {
                    status: 402,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Proxy the request to the scraper API
            const url = new URL(request.url);
            const path = url.pathname.replace('/v1/', '/');

            const scraperResponse = await env.SCRAPER_API.fetch(new Request(`https://scraper-api.internal${path}`, {
                method: request.method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-ProGeoData-Paid': 'true',
                    'X-Payment-Tx': paymentData.txHash,
                    'X-Payment-Amount': paymentData.amount
                },
                body: request.body
            }));

            // Add payment metadata to response
            const responseData = await scraperResponse.json();
            responseData.payment = {
                txHash: paymentData.txHash,
                amount: paymentData.amount,
                asset: paymentData.asset || 'base'
            };

            return new Response(JSON.stringify(responseData), {
                status: scraperResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Payment processing failed',
                message: error.message,
                x402Version: CONFIG.X402_VERSION
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } else {
        // This is an initial x402 request - return payment requirements
        const url = new URL(request.url);
        const endpoint = url.pathname;

        if (!CONFIG.SUPPORTED_ENDPOINTS.includes(endpoint)) {
            return new Response(JSON.stringify({
                error: 'Endpoint not found',
                x402Version: CONFIG.X402_VERSION
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Determine pricing based on endpoint
        let pricing;
        if (endpoint.includes('enriched')) {
            pricing = CONFIG.PRICING.enriched;
        } else if (endpoint.includes('bulk')) {
            pricing = CONFIG.PRICING.bulk;
        } else {
            pricing = CONFIG.PRICING.search;
        }

        const accepts = generateAcceptsArray(endpoint, pricing);
        return new Response(JSON.stringify(generateX402Response(accepts)), {
            status: 402,
            headers: {
                'Content-Type': 'application/json',
                'X-402-Version': CONFIG.X402_VERSION.toString()
            }
        });
    }
}

/**
 * Health check endpoint
 */
router.get('/health', async (request, env) => {
    return new Response(JSON.stringify({
        status: 'healthy',
        x402Version: CONFIG.X402_VERSION,
        pricing: CONFIG.PRICING,
        endpoints: CONFIG.SUPPORTED_ENDPOINTS,
        timestamp: new Date().toISOString()
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
});

/**
 * x402 endpoints
 */
CONFIG.SUPPORTED_ENDPOINTS.forEach(endpoint => {
    router.all(endpoint, async (request, env) => {
        return x402Middleware(request, env);
    });
});

/**
 * 404 handler
 */
router.all('*', () => {
    return new Response(JSON.stringify({
        error: 'Not found',
        x402Version: CONFIG.X402_VERSION
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
            console.error('x402 API error:', error);

            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                x402Version: CONFIG.X402_VERSION
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};