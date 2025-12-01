/**
 * Professionals Search API Route
 * GET /api/professionals/search?industry=real_estate&city=miami&limit=20
 * Returns: Array of professionals matching search criteria
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { ErrorTracker, ErrorLevel, ErrorCategory } from "~/lib/error-tracking";

interface SearchParams {
  industry?: string;
  city?: string;
  state?: string;
  specialty?: string;
  verified?: string;
  limit?: string;
  offset?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const tracker = new ErrorTracker(context);
  const url = new URL(request.url);

  // Parse query parameters
  const params: SearchParams = {
    industry: url.searchParams.get("industry") || undefined,
    city: url.searchParams.get("city") || undefined,
    state: url.searchParams.get("state") || undefined,
    specialty: url.searchParams.get("specialty") || undefined,
    verified: url.searchParams.get("verified") || undefined,
    limit: url.searchParams.get("limit") || "20",
    offset: url.searchParams.get("offset") || "0",
  };

  try {
    // Validate limit
    const limit = Math.min(parseInt(params.limit || "20"), 100);
    const offset = parseInt(params.offset || "0");

    // Build dynamic WHERE clause
    const conditions: string[] = ["p.status = 'active'"];
    const bindings: any[] = [];

    if (params.industry) {
      conditions.push("p.industry = ?");
      bindings.push(params.industry);
    }

    if (params.city) {
      conditions.push("LOWER(p.city) = LOWER(?)");
      bindings.push(params.city);
    }

    if (params.state) {
      conditions.push("UPPER(p.state) = UPPER(?)");
      bindings.push(params.state);
    }

    if (params.specialty) {
      conditions.push("p.primary_specialty LIKE ?");
      bindings.push(`%${params.specialty}%`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Query agents with available data
    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.industry,
        p.city,
        p.state,
        p.phone,
        p.email,
        p.bio,
        p.photo_url,
        p.specializations as specialties,
        p.license_number,
        p.years_experience,
        p.ghost_profile as verified,
        p.claimed_at,
        0 as active_listings,
        0 as review_count,
        0 as avg_rating,
        0 as sold_count
      FROM agents p
      ${whereClause}
      ORDER BY
        p.ghost_profile ASC,
        p.years_experience DESC
      LIMIT ? OFFSET ?
    `;

    const professionals = await context.env.DB.prepare(query)
      .bind(...bindings, limit, offset)
      .all();

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM agents p
      ${whereClause}
    `;

    const countResult = await context.env.DB.prepare(countQuery)
      .bind(...bindings)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    return json({
      success: true,
      data: professionals.results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: {
        industry: params.industry,
        city: params.city,
        state: params.state,
        specialty: params.specialty,
        verified: params.verified === "true",
      },
    });

  } catch (error) {
    await tracker.logError(
      error as Error,
      ErrorLevel.ERROR,
      ErrorCategory.DATABASE,
      { params }
    );

    return json(
      {
        success: false,
        error: "Failed to search professionals",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
