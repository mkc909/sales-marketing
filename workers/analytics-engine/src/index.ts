/**
 * Analytics Engine Worker
 *
 * Provides HTTP endpoints for writing analytics data to the ANALYTICS_ENGINE
 * dataset. Includes sample writeDataPoint() implementation for tracking
 * user events, page views, and custom metrics.
 *
 * Responsibilities:
 * - Write data points to Analytics Engine
 * - Provide REST API for analytics data ingestion
 * - Support batch data writes
 * - Validate and format analytics events
 */

interface Env {
    ANALYTICS_ENGINE: any; // Analytics Engine dataset binding
    WORKER_VERSION: string;
    DEBUG?: string;
}

interface AnalyticsEvent {
    event_name: string;
    event_timestamp: number;
    user_id?: string;
    session_id?: string;
    properties?: Record<string, any>;
    user_agent?: string;
    ip_address?: string;
    url?: string;
    referrer?: string;
}

interface WriteDataPointRequest {
    blobs: string[];
    doubles: number[];
    indexes: number[];
}

/**
 * Write a single data point to Analytics Engine
 */
async function writeDataPoint(
    env: Env,
    event: AnalyticsEvent
): Promise<void> {
    try {
        // Convert event timestamp to nanoseconds (Analytics Engine expects nanoseconds)
        const timestampNanos = event.event_timestamp * 1_000_000;

        // Prepare data point fields
        const dataPoint: WriteDataPointRequest = {
            blobs: [
                event.event_name,
                event.user_id || '',
                event.session_id || '',
                event.user_agent || '',
                event.ip_address || '',
                event.url || '',
                event.referrer || '',
                JSON.stringify(event.properties || {})
            ],
            doubles: [
                timestampNanos,
                event.properties?.duration || 0,
                event.properties?.value || 0,
                event.properties?.count || 1
            ],
            indexes: [
                hashString(event.event_name) // Analytics Engine only supports 1 index
            ]
        };

        // Write to Analytics Engine
        await env.ANALYTICS_ENGINE.writeDataPoint(dataPoint);

        if (env.DEBUG) {
            console.log(`Analytics event written: ${event.event_name}`, {
                user_id: event.user_id,
                timestamp: new Date(event.event_timestamp * 1000).toISOString()
            });
        }
    } catch (error) {
        console.error('Error writing analytics data point:', error);
        throw error;
    }
}

/**
 * Simple hash function for creating indexes
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Validate analytics event data
 */
function validateEvent(event: any): AnalyticsEvent {
    if (!event.event_name || typeof event.event_name !== 'string') {
        throw new Error('event_name is required and must be a string');
    }

    if (!event.event_timestamp || typeof event.event_timestamp !== 'number') {
        throw new Error('event_timestamp is required and must be a number');
    }

    // Ensure timestamp is in seconds
    if (event.event_timestamp > 1e10) {
        throw new Error('event_timestamp should be in seconds (Unix timestamp)');
    }

    return event as AnalyticsEvent;
}

/**
 * HTTP handler for analytics data ingestion
 */
export default {
    /**
     * Main fetch handler
     */
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: corsHeaders,
            });
        }

        try {
            // Health check endpoint
            if (path === '/health') {
                return new Response(
                    JSON.stringify({
                        status: 'healthy',
                        version: env.WORKER_VERSION,
                        timestamp: new Date().toISOString(),
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders,
                        },
                    }
                );
            }

            // Write single event endpoint
            if (path === '/event' && request.method === 'POST') {
                const body = await request.json();
                const event = validateEvent(body);

                await writeDataPoint(env, event);

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Event written successfully',
                        event_name: event.event_name,
                        timestamp: new Date().toISOString(),
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders,
                        },
                    }
                );
            }

            // Batch write events endpoint
            if (path === '/events' && request.method === 'POST') {
                const body = await request.json();

                if (!Array.isArray(body.events)) {
                    throw new Error('events must be an array');
                }

                const results = [];
                for (const eventData of body.events) {
                    try {
                        const event = validateEvent(eventData);
                        await writeDataPoint(env, event);
                        results.push({ success: true, event_name: event.event_name });
                    } catch (error) {
                        results.push({
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            event_data: eventData
                        });
                    }
                }

                const successCount = results.filter(r => r.success).length;
                const failureCount = results.length - successCount;

                return new Response(
                    JSON.stringify({
                        success: failureCount === 0,
                        message: `Processed ${results.length} events`,
                        success_count: successCount,
                        failure_count: failureCount,
                        results: results,
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders,
                        },
                    }
                );
            }

            // Page view tracking helper endpoint
            if (path === '/pageview' && request.method === 'POST') {
                const body = await request.json();

                const pageViewEvent: AnalyticsEvent = {
                    event_name: 'page_view',
                    event_timestamp: body.timestamp || Math.floor(Date.now() / 1000),
                    user_id: body.user_id,
                    session_id: body.session_id,
                    properties: {
                        page: body.page,
                        title: body.title,
                        referrer: body.referrer,
                        ...body.properties
                    },
                    user_agent: request.headers.get('User-Agent') || undefined,
                    ip_address: request.headers.get('CF-Connecting-IP') || undefined,
                    url: body.url,
                    referrer: body.referrer
                };

                await writeDataPoint(env, pageViewEvent);

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Page view tracked successfully',
                        page: body.page,
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders,
                        },
                    }
                );
            }

            // Custom event tracking helper endpoint
            if (path === '/track' && request.method === 'POST') {
                const body = await request.json();

                if (!body.event_name) {
                    throw new Error('event_name is required');
                }

                const customEvent: AnalyticsEvent = {
                    event_name: body.event_name,
                    event_timestamp: body.timestamp || Math.floor(Date.now() / 1000),
                    user_id: body.user_id,
                    session_id: body.session_id,
                    properties: body.properties,
                    user_agent: request.headers.get('User-Agent') || undefined,
                    ip_address: request.headers.get('CF-Connecting-IP') || undefined,
                    url: body.url,
                    referrer: body.referrer
                };

                await writeDataPoint(env, customEvent);

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Event tracked successfully',
                        event_name: body.event_name,
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders,
                        },
                    }
                );
            }

            // API documentation endpoint
            if (path === '/' || path === '/docs') {
                return new Response(
                    `Analytics Engine Worker v${env.WORKER_VERSION}

Endpoints:
- GET  /health - Health check
- POST /event - Write single analytics event
- POST /events - Write multiple analytics events (batch)
- POST /pageview - Track page view (helper endpoint)
- POST /track - Track custom event (helper endpoint)

Example event payload:
{
  "event_name": "user_signup",
  "event_timestamp": 1701234567,
  "user_id": "user_123",
  "session_id": "session_456",
  "properties": {
    "plan": "premium",
    "source": "google"
  }
}

Example pageview payload:
{
  "page": "/dashboard",
  "title": "Dashboard",
  "user_id": "user_123",
  "session_id": "session_456"
}`,
                    {
                        headers: {
                            'Content-Type': 'text/plain',
                            ...corsHeaders,
                        },
                    }
                );
            }

            // 404 for unknown endpoints
            return new Response('Not Found', {
                status: 404,
                headers: corsHeaders,
            });

        } catch (error) {
            console.error('Analytics Engine Worker Error:', error);

            return new Response(
                JSON.stringify({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                }
            );
        }
    },
};