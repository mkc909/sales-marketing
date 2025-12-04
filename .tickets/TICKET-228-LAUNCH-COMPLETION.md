# Ticket #228 - ProGeoData Production Launch Completion

## Priority: 🔴 CRITICAL - BLOCKING REVENUE

## Objective:
Complete ProGeoData system for immediate production launch with Stripe payments and real data only.

## Current Blockers:

### 1. ❌ Mock Data Contamination (CRITICAL)
**Problem**: Scraper returns mock data for unsupported states instead of proper errors
**Solution**:
- Remove ALL mock data code from scraper-browser worker
- Return proper error responses for unsupported states
- Clean existing mock data from database

```sql
-- Clean mock data
DELETE FROM raw_business_data
WHERE state IN ('CA', 'WA')
AND (name IS NULL OR name = 'undefined' OR source_id LIKE 'MOCK%');
```

### 2. ❌ Stripe Integration Missing (CRITICAL)
**Problem**: Can't charge customers for data packs
**Solution**: Implement Stripe checkout flow

```typescript
// Required endpoints
POST /api/checkout/create-session
- Create Stripe checkout session for data pack
- Products: FL Pack ($99), TX Pack ($79), All States ($299)

POST /api/stripe/webhook
- Handle successful payment
- Grant access to data download

GET /api/download/:pack/:token
- Verify purchase token
- Export data as CSV/JSON
```

### 3. ❌ Data Export API Missing
**Problem**: No way to deliver data to customers
**Solution**: Build export endpoints

```typescript
// Export endpoints needed
GET /api/export/florida.csv
GET /api/export/texas.csv
GET /api/export/all.json

// With authentication
Headers: Authorization: Bearer {stripe_purchase_token}
```

### 4. ❌ CA/WA Scraper Implementation
**Problem**: These states return mock data
**Options**:
- A) Implement real scraping for CA_DRE and WA_DOL
- B) Remove these states from system until ready
- C) Show "Coming Soon" for these states

**Recommendation**: Option B - Remove until properly implemented

## Implementation Tasks:

### Phase 1: Clean System (TODAY)
- [ ] Remove mock data code from scraper-browser
- [ ] Add proper error handling (return 404 for unsupported states)
- [ ] Clean contaminated data from database
- [ ] Update consumer to skip failed states gracefully

### Phase 2: Stripe Integration (TOMORROW)
- [ ] Add Stripe test keys to environment
- [ ] Create checkout endpoint
- [ ] Create webhook handler
- [ ] Add purchase verification
- [ ] Test payment flow

### Phase 3: Data Delivery (DAY 3)
- [ ] Build export API endpoints
- [ ] Add CSV generation
- [ ] Add JSON export
- [ ] Add download tokens
- [ ] Create download page

### Phase 4: Production Launch (DAY 4)
- [ ] Switch to Stripe live keys
- [ ] Deploy all changes
- [ ] Test complete flow
- [ ] Launch ProGeoData.com sales page

## Code Changes Needed:

### 1. Fix scraper-browser/src/index.ts
```typescript
// REMOVE THIS MOCK DATA CODE:
if (!professionals || professionals.length === 0) {
  // DO NOT RETURN MOCK DATA
  return new Response(JSON.stringify({
    success: false,
    error: 'State not supported',
    results: []
  }), { status: 404 });
}
```

### 2. Add Stripe checkout (new file: api/stripe.ts)
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function createCheckout(pack: string) {
  const prices = {
    'florida': 'price_florida_99',
    'texas': 'price_texas_79',
    'all': 'price_all_299'
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: prices[pack],
      quantity: 1
    }],
    mode: 'payment',
    success_url: 'https://progeodata.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://progeodata.com/pricing',
    metadata: { pack }
  });

  return session;
}
```

### 3. Data export API
```typescript
export async function exportData(state: string, format: 'csv' | 'json') {
  const data = await env.DB.prepare(`
    SELECT name, source_id as license_number, city, state, postal_code, phone, email
    FROM raw_business_data
    WHERE state = ? AND name IS NOT NULL
    ORDER BY city, name
  `).bind(state.toUpperCase()).all();

  if (format === 'csv') {
    return convertToCSV(data.results);
  }
  return JSON.stringify(data.results);
}
```

## Success Criteria:
- [ ] NO mock data in database
- [ ] Stripe test payments working
- [ ] Data export working
- [ ] Can purchase and download FL data pack
- [ ] Can purchase and download TX data pack
- [ ] Error messages for unsupported states
- [ ] Clean data only (no undefined/null names)

## Testing Checklist:
- [ ] Purchase FL pack with test card
- [ ] Download FL data as CSV
- [ ] Verify data quality (no mock data)
- [ ] Try CA (should show "not available")
- [ ] Check webhook handling
- [ ] Verify download tokens expire

## Revenue Impact:
- **Current**: $0 (can't charge)
- **After Launch**: $99/FL pack × 10 sales/day = $990/day potential
- **Monthly Potential**: $30,000+

## Timeline:
- Day 1 (TODAY): Clean mock data
- Day 2: Stripe integration
- Day 3: Export API
- Day 4: Production launch

## Dependencies:
- Stripe account with test/live keys
- Clean database (no mock data)
- Working scraper for FL/TX only
- ProGeoData.com frontend for checkout

---

**This is BLOCKING REVENUE. Every day without Stripe = lost sales.**