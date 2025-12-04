import Papa from 'papaparse';

interface Env {
  DB: D1Database;
  PURCHASE_TOKENS: KVNamespace;
}

interface Professional {
  name: string;
  license_number: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  profession: string;
  scraped_at: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Extract token from Authorization header or query param
    let token: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = url.searchParams.get('token');
    }

    // Route: Export data with authentication
    if (url.pathname.match(/^\/api\/export\/(florida|texas|all)\.(csv|json)$/) && request.method === 'GET') {
      const matches = url.pathname.match(/^\/api\/export\/(florida|texas|all)\.(csv|json)$/);
      if (!matches) {
        return new Response('Invalid path', { status: 400 });
      }

      const [, pack, format] = matches;

      // Verify token
      if (!token) {
        return new Response(JSON.stringify({
          error: 'Authentication required',
          message: 'Please provide a valid download token'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        // Verify token in KV
        const tokenData = await env.PURCHASE_TOKENS.get(token);
        if (!tokenData) {
          return new Response(JSON.stringify({
            error: 'Invalid or expired token'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const purchase = JSON.parse(tokenData);

        // Check if user has access to requested pack
        const hasAccess = (
          purchase.pack === pack ||
          (purchase.pack === 'all_states' && (pack === 'florida' || pack === 'texas'))
        );

        if (!hasAccess) {
          return new Response(JSON.stringify({
            error: 'Access denied',
            message: `Your purchase (${purchase.pack}) does not include access to ${pack} data`
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check download limit
        const downloadCount = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM download_history WHERE download_token = ?
        `).bind(token).first() as { count: number };

        if (downloadCount && downloadCount.count >= 3) {
          return new Response(JSON.stringify({
            error: 'Download limit exceeded',
            message: 'You have reached the maximum number of downloads for this purchase'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Build query based on pack
        let query: string;
        let params: string[] = [];

        if (pack === 'florida') {
          query = `
            SELECT
              name,
              source_id as license_number,
              city,
              state,
              postal_code,
              phone,
              email,
              source as company,
              category as profession,
              scraped_at
            FROM raw_business_data
            WHERE state = 'FL'
              AND name IS NOT NULL
              AND name != 'undefined'
              AND name != ''
              AND source_id NOT LIKE 'MOCK%'
            ORDER BY city, name
            LIMIT 10000
          `;
        } else if (pack === 'texas') {
          query = `
            SELECT
              name,
              source_id as license_number,
              city,
              state,
              postal_code,
              phone,
              email,
              source as company,
              category as profession,
              scraped_at
            FROM raw_business_data
            WHERE state = 'TX'
              AND name IS NOT NULL
              AND name != 'undefined'
              AND name != ''
              AND source_id NOT LIKE 'MOCK%'
            ORDER BY city, name
            LIMIT 10000
          `;
        } else {
          // All states
          query = `
            SELECT
              name,
              source_id as license_number,
              city,
              state,
              postal_code,
              phone,
              email,
              source as company,
              category as profession,
              scraped_at
            FROM raw_business_data
            WHERE state IN ('FL', 'TX')
              AND name IS NOT NULL
              AND name != 'undefined'
              AND name != ''
              AND source_id NOT LIKE 'MOCK%'
            ORDER BY state, city, name
            LIMIT 20000
          `;
        }

        // Execute query
        const result = await env.DB.prepare(query).all();
        const professionals = result.results as Professional[];

        // Record download
        await env.DB.prepare(`
          INSERT INTO download_history (download_token, pack, ip_address, user_agent)
          VALUES (?, ?, ?, ?)
        `).bind(
          token,
          pack,
          request.headers.get('CF-Connecting-IP') || 'unknown',
          request.headers.get('User-Agent') || 'unknown'
        ).run();

        // Format response based on requested format
        if (format === 'csv') {
          const csv = Papa.unparse(professionals, {
            header: true,
            columns: [
              'name',
              'license_number',
              'city',
              'state',
              'postal_code',
              'phone',
              'email',
              'company',
              'profession'
            ]
          });

          return new Response(csv, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="progeodata-${pack}-${new Date().toISOString().split('T')[0]}.csv"`
            }
          });
        } else {
          // JSON format
          return new Response(JSON.stringify({
            pack,
            count: professionals.length,
            exported_at: new Date().toISOString(),
            data: professionals
          }, null, 2), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Content-Disposition': `attachment; filename="progeodata-${pack}-${new Date().toISOString().split('T')[0]}.json"`
            }
          });
        }

      } catch (error) {
        console.error('Export failed:', error);
        return new Response(JSON.stringify({
          error: 'Export failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Get data statistics (public)
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      try {
        const stats = await env.DB.prepare(`
          SELECT
            state,
            COUNT(*) as count
          FROM raw_business_data
          WHERE name IS NOT NULL
            AND name != 'undefined'
            AND name != ''
            AND source_id NOT LIKE 'MOCK%'
          GROUP BY state
        `).all();

        const total = await env.DB.prepare(`
          SELECT COUNT(*) as total
          FROM raw_business_data
          WHERE name IS NOT NULL
            AND name != 'undefined'
            AND name != ''
            AND source_id NOT LIKE 'MOCK%'
        `).first() as { total: number };

        return new Response(JSON.stringify({
          total: total?.total || 0,
          by_state: stats.results,
          last_updated: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Stats query failed:', error);
        return new Response(JSON.stringify({
          error: 'Failed to get statistics'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Preview data (limited, no auth required)
    if (url.pathname.match(/^\/api\/preview\/(florida|texas)$/) && request.method === 'GET') {
      const matches = url.pathname.match(/^\/api\/preview\/(florida|texas)$/);
      if (!matches) {
        return new Response('Invalid path', { status: 400 });
      }

      const [, state] = matches;
      const stateCode = state === 'florida' ? 'FL' : 'TX';

      try {
        const preview = await env.DB.prepare(`
          SELECT
            name,
            city,
            state,
            category as profession
          FROM raw_business_data
          WHERE state = ?
            AND name IS NOT NULL
            AND name != 'undefined'
            AND name != ''
            AND source_id NOT LIKE 'MOCK%'
          ORDER BY RANDOM()
          LIMIT 10
        `).bind(stateCode).all();

        return new Response(JSON.stringify({
          preview: true,
          state,
          sample_size: preview.results?.length || 0,
          data: preview.results
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Preview failed:', error);
        return new Response(JSON.stringify({
          error: 'Preview failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'progeodata-export',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};