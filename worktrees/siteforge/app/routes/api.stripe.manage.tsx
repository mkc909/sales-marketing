import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getSessionByToken, getUserById } from "../lib/auth.server";
import { getStripe, getUserSubscriptions } from "../lib/stripe.server";

interface SubscriptionManageRequest {
    action: 'cancel' | 'update' | 'reactivate';
    planType?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    // Only allow POST requests for subscription management
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

        // Get user from session
        const user = await getUserById(context, session.userId);
        if (!user || !user.stripe_customer_id) {
            return json({ error: "No active subscription found" }, { status: 404 });
        }

        // Parse request body
        const body = await request.json() as SubscriptionManageRequest;
        const { action: actionType, planType } = body;

        const stripe = getStripe(context);

        switch (actionType) {
            case 'cancel': {
                // Get active subscriptions
                const subscriptions = await getUserSubscriptions(context, user.stripe_customer_id as string);

                if (subscriptions.length === 0) {
                    return json({ error: "No active subscription found" }, { status: 404 });
                }

                // Cancel subscription at period end
                const subscription = await stripe.subscriptions.update(subscriptions[0].id, {
                    cancel_at_period_end: true,
                    metadata: {
                        ...subscriptions[0].metadata,
                        cancelled_by: session.userId,
                        cancelled_at: new Date().toISOString()
                    }
                });

                return json({
                    success: true,
                    message: "Subscription will be cancelled at the end of the billing period",
                    cancelledAt: subscription.cancel_at_period_end
                });
            }

            case 'update': {
                if (!planType) {
                    return json({ error: "Plan type is required for updates" }, { status: 400 });
                }

                // Get active subscriptions
                const subscriptions = await getUserSubscriptions(context, user.stripe_customer_id as string);

                if (subscriptions.length === 0) {
                    return json({ error: "No active subscription found" }, { status: 404 });
                }

                // For now, we'll redirect to checkout for plan changes
                // In a production environment, you might want to handle this differently
                return json({
                    success: false,
                    message: "Plan changes require checkout process",
                    redirectTo: `/pricing?plan=${planType}&change=true`
                });
            }

            case 'reactivate': {
                // Get cancelled subscriptions
                const subscriptions = await stripe.subscriptions.list({
                    customer: user.stripe_customer_id as string,
                    status: 'canceled',
                    limit: 1
                });

                if (subscriptions.data.length === 0) {
                    return json({ error: "No cancelled subscription found" }, { status: 404 });
                }

                // Reactivate subscription
                const subscription = await stripe.subscriptions.update(subscriptions.data[0].id, {
                    cancel_at_period_end: false,
                    metadata: {
                        ...subscriptions.data[0].metadata,
                        reactivated_by: session.userId,
                        reactivated_at: new Date().toISOString()
                    }
                });

                return json({
                    success: true,
                    message: "Subscription reactivated successfully",
                    status: subscription.status
                });
            }

            default:
                return json({ error: "Invalid action" }, { status: 400 });
        }

    } catch (error) {
        console.error("Subscription management error:", error);
        return json(
            { error: "Failed to manage subscription" },
            { status: 500 }
        );
    }
}