import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { getSessionByToken } from "~/lib/auth.server";
import { createCheckoutSession, STRIPE_PLANS, type PlanType } from "~/lib/stripe.server";

interface CheckoutRequest {
    planType: string;
    couponCode?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    // Only allow POST requests for checkout
    return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        // Get session token from cookies
        const cookieHeader = request.headers.get("Cookie");
        const sessionToken = cookieHeader
            ?.split(";")
            .find((cookie) => cookie.trim().startsWith("session_token="))
            ?.split("=")[1];

        if (!sessionToken) {
            return json({ error: "Authentication required" }, { status: 401 });
        }

        // Verify session
        const session = await getSessionByToken(context, sessionToken);
        if (!session) {
            return json({ error: "Invalid session" }, { status: 401 });
        }

        // Parse request body
        const body = await request.json() as CheckoutRequest;
        const { planType, couponCode } = body;

        if (!planType || !STRIPE_PLANS[planType as PlanType]) {
            return json({ error: "Invalid plan type" }, { status: 400 });
        }

        // Get base URL for success/cancel redirects
        const baseUrl = context.env.BASE_URL || 'http://localhost:8788';
        const successUrl = `${baseUrl}/dashboard?checkout=success&plan=${planType}`;
        const cancelUrl = `${baseUrl}/pricing?checkout=cancelled`;

        // Create Stripe checkout session
        const checkoutSession = await createCheckoutSession(context, {
            userId: session.userId,
            planType: planType as PlanType,
            couponCode: couponCode || undefined,
            successUrl,
            cancelUrl,
        });

        return json({
            sessionId: checkoutSession.id,
            url: checkoutSession.url,
        });

    } catch (error) {
        console.error("Checkout session creation error:", error);
        return json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}