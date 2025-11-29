/**
 * API Route: Track Pin Navigation
 * Records when someone clicks to navigate to a pin location
 */

import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { trackPinNavigation } from "~/models/pin.server";

export async function action({ params, request, context }: ActionFunctionArgs) {
  const { shortCode } = params;

  if (!shortCode) {
    return json({ error: "Pin not found" }, { status: 404 });
  }

  try {
    await trackPinNavigation(shortCode, context);

    // Optional: Get navigation app from request body
    const body = await request.json().catch(() => ({}));
    const navigationApp = body.app || 'unknown';

    // Optional: Send analytics event with more details
    if (context.env.ANALYTICS_ENDPOINT) {
      // Fire and forget analytics
      fetch(context.env.ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'pin_navigation',
          properties: {
            short_code: shortCode,
            navigation_app: navigationApp,
            timestamp: new Date().toISOString(),
            tenant: context.tenant?.id
          }
        })
      }).catch(console.error);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Failed to track navigation:", error);
    return json({ error: "Failed to track navigation" }, { status: 500 });
  }
}