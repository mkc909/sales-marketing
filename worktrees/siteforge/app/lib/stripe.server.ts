import Stripe from 'stripe';
import type { AppLoadContext } from "@remix-run/cloudflare";

// Initialize Stripe with environment variables
export function getStripe(context: AppLoadContext): Stripe {
    const stripeSecretKey = context.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    return new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
    });
}

// Plan configuration matching the pricing page
export const STRIPE_PLANS = {
    starter: {
        name: 'Starter',
        priceId: 'price_starter_monthly', // Will be set from environment
        amount: 2400, // $24 in cents (updated from $29)
        credits: 500,
        features: [
            '500 searches per month',
            'Advanced search filters',
            'Priority email support',
            'Search history (90 days)',
            'Bulk export (CSV)',
            'All professions included'
        ]
    },
    growth: {
        name: 'Growth',
        priceId: 'price_growth_monthly', // Will be set from environment
        amount: 7400, // $74 in cents (updated from $99)
        credits: 2500,
        features: [
            '2,500 searches per month',
            'Advanced search filters',
            'Priority support',
            'Unlimited search history',
            'Bulk export (CSV, Excel)',
            'All professions included',
            'Team collaboration tools',
            'Custom reports'
        ]
    },
    agency: {
        name: 'Agency',
        priceId: 'price_agency_monthly', // Will be set from environment
        amount: 14900, // $149 in cents (updated from $299)
        credits: 10000,
        features: [
            '10,000 searches per month',
            'Advanced search filters',
            'Dedicated support',
            'Unlimited search history',
            'Bulk export (all formats)',
            'All professions included',
            'Team collaboration tools',
            'Custom reports',
            'API access',
            'White-label options',
            'Custom integrations'
        ]
    }
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;

// Create a Stripe checkout session
export async function createCheckoutSession(
    context: AppLoadContext,
    params: {
        userId: string;
        planType: PlanType;
        couponCode?: string;
        successUrl: string;
        cancelUrl: string;
    }
) {
    const stripe = getStripe(context);
    const plan = STRIPE_PLANS[params.planType];

    if (!plan) {
        throw new Error(`Invalid plan type: ${params.planType}`);
    }

    // Get or create Stripe customer
    const user = await context.env.DB.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(params.userId).first();

    if (!user) {
        throw new Error('User not found');
    }

    let customerId = user.stripe_customer_id as string;

    if (!customerId) {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
            email: user.email as string,
            name: user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : undefined,
            metadata: {
                userId: params.userId
            }
        });

        customerId = customer.id;

        // Update user with Stripe customer ID
        await context.env.DB.prepare(`
      UPDATE users SET stripe_customer_id = ? WHERE id = ?
    `).bind(customerId, params.userId).run();
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
            {
                price: plan.priceId,
                quantity: 1,
            },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
            userId: params.userId,
            planType: params.planType,
        },
        subscription_data: {
            metadata: {
                userId: params.userId,
                planType: params.planType,
            },
        },
    };

    // Add discount if coupon code is provided
    if (params.couponCode) {
        // Try to find the coupon
        try {
            const promotions = await stripe.promotionCodes.list({
                code: params.couponCode,
                active: true,
                limit: 1,
            });

            if (promotions.data.length > 0) {
                sessionParams.discounts = [{ promotion_code: promotions.data[0].id }];
            }
        } catch (error) {
            console.warn(`Failed to find coupon ${params.couponCode}:`, error);
            // Continue without coupon if not found
        }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return session;
}

// Verify Stripe webhook signature
export function verifyWebhookSignature(
    context: AppLoadContext,
    body: string,
    signature: string
): Stripe.Event {
    const stripe = getStripe(context);
    const webhookSecret = context.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }

    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

// Handle subscription creation/update
export async function handleSubscriptionUpdate(
    context: AppLoadContext,
    subscription: Stripe.Subscription
) {
    const userId = subscription.metadata?.userId;
    const planType = subscription.metadata?.planType;

    if (!userId || !planType) {
        console.error('Missing metadata in subscription:', subscription.id);
        return;
    }

    const customerId = subscription.customer as string;
    const status = subscription.status;
    const plan = STRIPE_PLANS[planType as PlanType];

    if (!plan) {
        console.error('Invalid plan type in subscription metadata:', planType);
        return;
    }

    // Update user subscription info
    await context.env.DB.prepare(`
    UPDATE users SET
      stripe_customer_id = ?,
      subscription_id = ?,
      subscription_tier = ?,
      subscription_status = ?,
      subscription_expires = ?,
      credits_remaining = credits_remaining + ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
        customerId,
        subscription.id,
        planType,
        status,
        new Date(subscription.current_period_end * 1000).toISOString(),
        plan.credits,
        userId
    ).run();

    // Record payment transaction
    const transactionId = crypto.randomUUID();
    await context.env.DB.prepare(`
    INSERT INTO payment_transactions (
      id, user_id, stripe_payment_intent_id, stripe_checkout_session_id,
      amount, currency, status, subscription_tier, billing_period,
      created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
        transactionId,
        userId,
        subscription.latest_invoice as string,
        subscription.metadata?.checkoutSessionId || null,
        plan.amount / 100, // Convert from cents
        'USD',
        'completed',
        planType,
        'month'
    ).run();
}

// Handle subscription deletion/cancellation
export async function handleSubscriptionDeletion(
    context: AppLoadContext,
    subscription: Stripe.Subscription
) {
    const userId = subscription.metadata?.userId;

    if (!userId) {
        console.error('Missing userId in subscription metadata:', subscription.id);
        return;
    }

    // Downgrade to free plan
    await context.env.DB.prepare(`
    UPDATE users SET
      subscription_tier = 'free',
      subscription_status = 'cancelled',
      subscription_expires = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
        new Date(subscription.current_period_end * 1000).toISOString(),
        userId
    ).run();
}

// Get user's active subscriptions from Stripe
export async function getUserSubscriptions(
    context: AppLoadContext,
    customerId: string
) {
    const stripe = getStripe(context);

    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10,
    });

    return subscriptions.data;
}