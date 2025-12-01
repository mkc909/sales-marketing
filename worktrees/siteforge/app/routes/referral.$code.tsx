/**
 * Referral Code Landing Route
 *
 * Tracks referral attribution when users click referral links.
 * Records the referral code in session/cookie for attribution to signup.
 *
 * Example: /referral/ABC123 -> Home page with referral code tracked
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { trackReferralClick } from "~/lib/referral-system";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { code } = params;

  if (!code) {
    return redirect('/');
  }

  try {
    // Track the referral click
    const url = new URL(request.url);
    const metadata = {
      ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
      referrerUrl: request.headers.get('Referer') || undefined,
      landingPage: url.pathname
    };

    await trackReferralClick(code, context, metadata);

    // Store referral code in session for later attribution
    // (Will be used when they sign up)
    const headers = new Headers();
    headers.set(
      'Set-Cookie',
      `referral_code=${code}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax` // 30 day cookie
    );

    // Redirect to signup page with referral context
    return redirect(`/claim?ref=${code}`, { headers });
  } catch (error) {
    console.error('Error tracking referral:', error);
    // Even if tracking fails, redirect to home
    return redirect('/');
  }
}
