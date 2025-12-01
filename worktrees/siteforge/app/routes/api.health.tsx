/**
 * Health Check API Route
 * GET /api/health
 * Returns: System health status including database connectivity
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

export async function loader({ context }: LoaderFunctionArgs) {
  const startTime = Date.now();

  try {
    // Test database connection
    const dbTest = await context.env.DB.prepare(
      `SELECT 1 as test`
    ).first();

    const dbStatus = dbTest?.test === 1 ? "connected" : "error";

    // Test KV binding (PINS)
    let kvStatus = "unknown";
    try {
      await context.env.PINS.list({ limit: 1 });
      kvStatus = "connected";
    } catch (e) {
      kvStatus = "error";
      // Simplified error handling for now
      console.error("KV error:", e);
    }

    const responseTime = Date.now() - startTime;

    const response = {
      status: dbStatus === "connected" && kvStatus === "connected" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        kv: kvStatus,
      },
      performance: {
        responseTimeMs: responseTime,
      },
      version: "1.0.0",
      region: context.region || "unknown",
    };

    return json(response, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);

    return json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        services: {
          database: "error",
          kv: "error",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
