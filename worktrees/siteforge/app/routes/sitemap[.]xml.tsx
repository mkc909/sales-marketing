/**
 * Sitemap XML Route
 *
 * Generates dynamic XML sitemap for all SEO pages, blog posts, and static routes.
 * Critical for SEO - ensures Google discovers and indexes all programmatic pages.
 *
 * Route: /sitemap.xml (brackets escape the dot in Remix routing)
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { generateSitemap } from "~/lib/seo-engine";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    const sitemapXml = await generateSitemap(context, baseUrl);

    return new Response(sitemapXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
