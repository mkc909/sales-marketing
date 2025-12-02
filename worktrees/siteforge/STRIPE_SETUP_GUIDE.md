# Stripe Integration Setup Guide

This guide covers the complete Stripe integration for ProGeoData Phase 3B.

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `wrangler.toml` under `[vars]` section:

```toml
[vars]
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 2. Stripe Dashboard Setup

1. **Create Products & Prices**
   - Go to Stripe Dashboard → Products
   - Create 3 products: Starter, Growth, Agency
   - Create monthly prices for each:
     - Starter: $24.00 (price_starter_monthly)
     - Growth: $74.00 (price_growth_monthly) 
     - Agency: $149.00 (price_agency_monthly)

2. **Create HOLIDAY50 Coupon**
   - Go to Stripe Dashboard → Coupons
   - Create new coupon:
     - Code: `HOLIDAY50`
     - Type: Percentage
     - Amount: 50%
     - Duration: First time payment
     - Limit: 1000 uses

3. **Setup Webhooks**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhooks`
   - Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### 3. Update Code Configuration

Update `app/lib/stripe.server.ts` with your actual Stripe price IDs:

```typescript
export const STRIPE_PLANS = {
  starter: {
    name: 'Starter',
    priceId: 'price_1234567890...', // Replace with actual price ID
    amount: 2400, // $24 in cents
    // ...
  },
  growth: {
    name: 'Growth', 
    priceId: 'price_1234567891...', // Replace with actual price ID
    amount: 7400, // $74 in cents
    // ...
  },
  agency: {
    name: 'Agency',
    priceId: 'price_1234567892...', // Replace with actual price ID
    amount: 14900, // $149 in cents
    // ...
  }
};
```

## 🧪 Testing

### Run E2E Tests

```bash
# Install Playwright for testing
npm install playwright

# Run tests against local development
node test-stripe-flow.js dev

# Run tests against production (requires real credentials)
node test-stripe-flow.js prod
```

### Manual Testing Checklist

- [ ] User can sign up via Google OAuth
- [ ] User can navigate to pricing page
- [ ] User can click "Get Started" on a plan
- [ ] User is redirected to Stripe checkout
- [ ] User can apply HOLIDAY50 coupon
- [ ] Payment completes successfully
- [ ] User is redirected back to dashboard
- [ ] Success message appears on dashboard
- [ ] Credits are added to user account
- [ ] Subscription status shows as "active"
- [ ] Plan tier is updated correctly
- [ ] User can cancel subscription
- [ ] User can upgrade plan
- [ ] Webhook events are processed correctly

## 🔧 API Endpoints

### Checkout Session Creation
```
POST /api/stripe/checkout
Content-Type: application/json

{
  "planType": "starter|growth|agency",
  "couponCode": "HOLIDAY50" // optional
}
```

Response:
```json
{
  "sessionId": "cs_123...",
  "url": "https://checkout.stripe.com/pay/cs_123..."
}
```

### Subscription Management
```
POST /api/stripe/manage
Content-Type: application/json

{
  "action": "cancel|update|reactivate",
  "planType": "starter|growth|agency" // required for update action
}
```

### Webhook Handler
```
POST /api/stripe/webhooks
Stripe-Signature: [signature]
Content-Type: application/json

// Stripe webhook events
```

## 📊 Database Schema

The integration uses these tables from migration `009_user_auth_system.sql`:

- `users` - User accounts with subscription info
- `subscription_plans` - Plan configurations
- `payment_transactions` - Payment records
- `credits_usage` - Credit consumption tracking
- `search_history` - User search activity

## 🔒 Security Considerations

1. **Webhook Signature Verification**
   - Always verify Stripe signatures
   - Reject requests with invalid signatures
   - Use HTTPS for webhook endpoint

2. **Rate Limiting**
   - Checkout endpoint requires authentication
   - Webhook processing is idempotent
   - Failed payment attempts are logged

3. **Data Validation**
   - Plan types are validated against known values
   - Coupon codes are verified before application
   - User permissions are checked before actions

## 🚨 Error Handling

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: STRIPE_SECRET_KEY environment variable is not set
   ```
   Solution: Add to wrangler.toml and deploy

2. **Invalid Price IDs**
   ```
   Error: No such price: 'price_...'
   ```
   Solution: Update price IDs in stripe.server.ts

3. **Webhook Signature Mismatch**
   ```
   Error: Invalid signature
   ```
   Solution: Update webhook secret in wrangler.toml

4. **Coupon Not Found**
   ```
   Coupon 'HOLIDAY50' not found
   ```
   Solution: Create coupon in Stripe Dashboard

## 📈 Monitoring

### Key Metrics to Track

- Checkout conversion rate
- Payment success rate
- Subscription churn rate
- Coupon usage rate
- Webhook processing time

### Logs to Monitor

- Checkout session creation errors
- Webhook processing failures
- Payment failures
- Subscription updates

## 🔄 Deployment

1. **Update Environment Variables**
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

2. **Deploy Changes**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Test Webhook Endpoint**
   ```bash
   # Use Stripe CLI to test webhooks
   stripe listen --forward-to localhost:8788/api/stripe/webhooks
   ```

## 🆘 Troubleshooting

### Debug Mode

Enable debug logging by setting:
```toml
[vars]
DEBUG_STRIPE="true"
```

### Common Debugging Steps

1. Check Stripe Dashboard for failed payments
2. Verify webhook endpoint is accessible
3. Check D1 database for subscription updates
4. Review browser console for JavaScript errors
5. Check Cloudflare Workers logs

### Support

- Stripe Dashboard: https://dashboard.stripe.com
- API Documentation: https://stripe.com/docs/api
- Support: https://support.stripe.com