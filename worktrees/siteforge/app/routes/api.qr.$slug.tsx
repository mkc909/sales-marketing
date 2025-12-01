/**
 * QR Code Generation API Route
 * GET /api/qr/[slug].png
 * Returns: PNG image of QR code for professional profile
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { ErrorTracker, ErrorLevel, ErrorCategory } from "~/lib/error-tracking";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const tracker = new ErrorTracker(context);
  const slug = params.slug;

  if (!slug) {
    return new Response("Slug is required", { status: 400 });
  }

  try {
    // Get professional to verify existence
    const professional = await context.env.DB.prepare(`
      SELECT id, name, slug FROM professionals WHERE slug = ?
    `).bind(slug).first();

    if (!professional) {
      return new Response("Professional not found", { status: 404 });
    }

    // Generate URL for QR code
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const profileUrl = `${baseUrl}/agent/${slug}`;

    // Generate QR code using Cloudflare Workers
    // Using a simple QR code API service (you can replace with your own implementation)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`;

    // Fetch QR code image
    const qrResponse = await fetch(qrApiUrl);

    if (!qrResponse.ok) {
      throw new Error("Failed to generate QR code");
    }

    const qrImage = await qrResponse.arrayBuffer();

    // Return image with caching headers
    return new Response(qrImage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
        "X-Professional-Id": professional.id as string,
        "X-Professional-Name": professional.name as string,
      },
    });

  } catch (error) {
    await tracker.logError(
      error as Error,
      ErrorLevel.ERROR,
      ErrorCategory.API,
      { slug, action: "generate_qr" }
    );

    return new Response("Failed to generate QR code", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
