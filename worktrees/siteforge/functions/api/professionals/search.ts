/**
 * Direct API handler for professionals search
 * Bypasses build issues by implementing directly as a Cloudflare Function
 */

interface Env {
    DB: D1Database;
    LINKS: KVNamespace;
    PINS: KVNamespace;
    CACHE: KVNamespace;
    ANALYTICS_BUFFER: KVNamespace;
    ESTATEFLOW_ASSETS: R2Bucket;
    PROFILE_PHOTOS: R2Bucket;
    PROPERTY_IMAGES: R2Bucket;
    DOCUMENTS: R2Bucket;
    QR_CODES: R2Bucket;
    ENVIRONMENT?: string;
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
    try {
        const url = new URL(context.request.url);
        const searchQuery = url.searchParams.get("q") || "";
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        // Build the SQL query to search the agents table
        let sql = `
          SELECT
            id,
            slug,
            name,
            email,
            phone,
            photo_url as website,
            city,
            state,
            bio,
            photo_url as headshot_url,
            specializations as specialties,
            license_number,
            language_capabilities as languages,
            years_experience,
            ghost_profile as verified,
            status,
            created_at,
            updated_at
          FROM agents
          WHERE status = 'active'
        `;

        const bindings: any[] = [];

        if (searchQuery) {
            sql += ` AND (
        name LIKE ? OR
        city LIKE ? OR
        state LIKE ? OR
        specializations LIKE ?
      )`;
            const searchTerm = `%${searchQuery}%`;
            bindings.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ` ORDER BY profile_views DESC LIMIT ? OFFSET ?`;
        bindings.push(limit, offset);

        // Execute the query
        const result = await context.env.DB.prepare(sql).bind(...bindings).all();

        // Return the results
        return new Response(JSON.stringify({
            success: true,
            data: result.results || [],
            total: result.results?.length || 0,
            query: searchQuery,
            limit,
            offset
        }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });

    } catch (error) {
        console.error("Search error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
}