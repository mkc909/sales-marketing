/**
 * API Test Route (Development Only)
 * GET /api/test
 * Tests all API endpoints and database connections
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "warning";
  duration: number;
  message?: string;
  error?: string;
  data?: any;
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  // Only allow in development
  const url = new URL(request.url);
  const isDev = url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1");

  if (!isDev) {
    return json(
      { error: "API test route only available in development" },
      { status: 403 }
    );
  }

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Database Connection
  try {
    const dbStart = Date.now();
    const result = await context.env.DB.prepare(`SELECT 1 as test`).first();
    results.push({
      name: "Database Connection",
      status: result?.test === 1 ? "pass" : "fail",
      duration: Date.now() - dbStart,
      data: result,
    });
  } catch (error) {
    results.push({
      name: "Database Connection",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 2: Professionals Table
  try {
    const profStart = Date.now();
    const professionals = await context.env.DB.prepare(`
      SELECT COUNT(*) as count FROM professionals
    `).first<{ count: number }>();

    results.push({
      name: "Professionals Table",
      status: "pass",
      duration: Date.now() - profStart,
      data: { count: professionals?.count || 0 },
    });
  } catch (error) {
    results.push({
      name: "Professionals Table",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 3: Listings Table
  try {
    const listStart = Date.now();
    const listings = await context.env.DB.prepare(`
      SELECT COUNT(*) as count FROM listings
    `).first<{ count: number }>();

    results.push({
      name: "Listings Table",
      status: "pass",
      duration: Date.now() - listStart,
      data: { count: listings?.count || 0 },
    });
  } catch (error) {
    results.push({
      name: "Listings Table",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 4: Leads Table
  try {
    const leadStart = Date.now();
    const leads = await context.env.DB.prepare(`
      SELECT COUNT(*) as count FROM leads
    `).first<{ count: number }>();

    results.push({
      name: "Leads Table",
      status: "pass",
      duration: Date.now() - leadStart,
      data: { count: leads?.count || 0 },
    });
  } catch (error) {
    results.push({
      name: "Leads Table",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 5: Reviews Table
  try {
    const revStart = Date.now();
    const reviews = await context.env.DB.prepare(`
      SELECT COUNT(*) as count FROM reviews
    `).first<{ count: number }>();

    results.push({
      name: "Reviews Table",
      status: "pass",
      duration: Date.now() - revStart,
      data: { count: reviews?.count || 0 },
    });
  } catch (error) {
    results.push({
      name: "Reviews Table",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 6: KV (PINS) Connection
  try {
    const kvStart = Date.now();
    await context.env.PINS.list({ limit: 1 });
    results.push({
      name: "KV (PINS) Connection",
      status: "pass",
      duration: Date.now() - kvStart,
    });
  } catch (error) {
    results.push({
      name: "KV (PINS) Connection",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 7: Error Tracking Table
  try {
    const errStart = Date.now();
    const errors = await context.env.DB.prepare(`
      SELECT COUNT(*) as count FROM error_logs
    `).first<{ count: number }>();

    results.push({
      name: "Error Tracking Table",
      status: "pass",
      duration: Date.now() - errStart,
      data: { count: errors?.count || 0 },
    });
  } catch (error) {
    results.push({
      name: "Error Tracking Table",
      status: "warning",
      duration: 0,
      message: "Error tracking table may not exist yet",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 8: Complex Query Performance
  try {
    const complexStart = Date.now();
    const complexQuery = await context.env.DB.prepare(`
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT l.id) as listings,
        COUNT(DISTINCT r.id) as reviews,
        AVG(r.rating) as avg_rating
      FROM professionals p
      LEFT JOIN listings l ON p.id = l.professional_id
      LEFT JOIN reviews r ON p.id = r.professional_id
      GROUP BY p.id
      LIMIT 10
    `).all();

    const duration = Date.now() - complexStart;
    results.push({
      name: "Complex Join Query",
      status: duration < 1000 ? "pass" : "warning",
      duration,
      message: duration > 1000 ? "Query took longer than 1 second" : undefined,
      data: { rowCount: complexQuery.results.length },
    });
  } catch (error) {
    results.push({
      name: "Complex Join Query",
      status: "fail",
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Calculate summary
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const warnings = results.filter(r => r.status === "warning").length;

  return json({
    summary: {
      total: results.length,
      passed,
      failed,
      warnings,
      duration: totalDuration,
      status: failed === 0 ? (warnings === 0 ? "healthy" : "degraded") : "unhealthy",
    },
    tests: results,
    environment: {
      region: context.region || "unknown",
      timestamp: new Date().toISOString(),
    },
  });
}
