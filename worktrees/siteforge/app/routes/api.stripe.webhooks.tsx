import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import {
    verifyWebhookSignature,
    handleSubscriptionUpdate,
    handleSubscriptionDeletion,
    getStripe
} from "~/lib/stripe.server";
import Stripe from 'stripe';

export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return json({ error: "Missing Stripe signature" }, { status: 400 });
        }

        // Verify webhook signature
        const event = verifyWebhookSignature(context, body, signature);

        console.log(`Processing Stripe webhook: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`Checkout session completed: ${session.id}`);

                // The subscription will be handled by the invoice.payment_succeeded event
                // But we can update the checkout session ID in metadata
                if (session.subscription && session.metadata?.userId) {
                    await context.env.DB.prepare(`
            UPDATE payment_transactions 
            SET stripe_checkout_session_id = ? 
            WHERE user_id = ? AND stripe_payment_intent_id = ?
          `).bind(
                        session.id,
                        session.metadata.userId,
                        session.payment_intent as string
                    ).run();
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`Invoice payment succeeded: ${invoice.id}`);

                if (invoice.subscription) {
                    // Get the subscription details
                    const stripe = getStripe(context);
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

                    await handleSubscriptionUpdate(context, subscription);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`Subscription updated: ${subscription.id}`);

                await handleSubscriptionUpdate(context, subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`Subscription deleted: ${subscription.id}`);

                await handleSubscriptionDeletion(context, subscription);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`Invoice payment failed: ${invoice.id}`);

                if (invoice.subscription && invoice.customer) {
                    // Update subscription status to past_due
                    await context.env.DB.prepare(`
            UPDATE users SET
              subscription_status = 'past_due',
              updated_at = datetime('now')
            WHERE stripe_customer_id = ?
          `).bind(invoice.customer).run();
                }
                break;
            }

            default:
                console.log(`Unhandled webhook event type: ${event.type}`);
        }

        return json({ received: true });

    } catch (error) {
        console.error("Webhook processing error:", error);

        if (error instanceof Error && error.message.includes('signature')) {
            return json({ error: "Invalid signature" }, { status: 401 });
        }

        return json({ error: "Webhook processing failed" }, { status: 500 });
    }
}