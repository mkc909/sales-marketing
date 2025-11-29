/**
 * API Route: Track Pin Share
 * Records when a pin is shared via any method
 */

import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { trackPinShare } from "~/models/pin.server";

export async function action({ params, context }: ActionFunctionArgs) {
  const { shortCode } = params;

  if (!shortCode) {
    return json({ error: "Pin not found" }, { status: 404 });
  }

  try {
    await trackPinShare(shortCode, context);

    // Optional: Send analytics event
    if (context.env.ANALYTICS_ENDPOINT) {
      // Fire and forget analytics
      fetch(context.env.ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'pin_shared',
          properties: {
            short_code: shortCode,
            timestamp: new Date().toISOString(),
            tenant: context.tenant?.id
          }
        })
      }).catch(console.error);
    }

    return json({ success: true });
  } catch (error) {
    console.error("Failed to track share:", error);
    return json({ error: "Failed to track share" }, { status: 500 });
  }
}