# Component Usage Guide - EstateFlow Dynamic Landing Pages

## Table of Contents

1. [LeadCaptureModal Component](#leadcapturemodal-component)
2. [Industry Configuration](#industry-configuration)
3. [Dynamic Routes](#dynamic-routes)
4. [Real Estate Agent Portal](#real-estate-agent-portal)
5. [Lead Notification API](#lead-notification-api)

---

## LeadCaptureModal Component

### Import

```tsx
import LeadCaptureModal from "~/components/LeadCaptureModal";
```

### Basic Usage

```tsx
<LeadCaptureModal
  id="contact-modal"
  title="Get a Free Quote"
  description="We'll respond within 15 minutes"
  action="quote"
  isSpanish={false}
/>
```

### With Service Selection

```tsx
const plumbingServices = [
  {
    id: 'leak-repair',
    name: { es: 'Reparación de Fugas', en: 'Leak Repair' },
    priceRange: '$150-$500'
  },
  {
    id: 'drain-cleaning',
    name: { es: 'Destape de Tuberías', en: 'Drain Cleaning' },
    priceRange: '$100-$300'
  }
];

<LeadCaptureModal
  id="plumber-quote"
  title="Emergency Plumbing Quote"
  description="24/7 service available"
  action="quote"
  businessId="business-123"
  industry="plumber"
  services={plumbingServices}
  showEmergency={true}
  isSpanish={false}
/>
```

### Custom Trigger Button

```tsx
<LeadCaptureModal
  id="custom-contact"
  title="Contact Us"
  description="We're here to help"
  action="contact"
  triggerButton={
    <button className="custom-button">
      <Phone className="w-5 h-5" />
      Custom Contact Button
    </button>
  }
/>
```

### Spanish Version

```tsx
<LeadCaptureModal
  id="contacto-modal"
  title="Obtén una Cotización Gratis"
  description="Responderemos en 15 minutos"
  action="quote"
  isSpanish={true}
  showEmergency={true}
/>
```

### Props Reference

```typescript
interface LeadCaptureModalProps {
  // Required
  id: string;                    // Unique ID for popover
  title: string;                 // Modal heading
  description: string;           // Subtitle/description

  // Optional
  action?: 'quote' | 'contact';  // Form action type (default: 'contact')
  businessId?: string;           // Business identifier
  industry?: string;             // Industry context
  services?: Array<{             // Service dropdown options
    id: string;
    name: { es: string; en: string };
    priceRange: string;
  }>;
  showEmergency?: boolean;       // Show emergency checkbox (default: false)
  isSpanish?: boolean;           // Use Spanish labels (default: false)
  triggerButton?: React.ReactNode; // Custom trigger button
}
```

---

## Industry Configuration

### Get Industry Config

```tsx
import { getIndustryConfig } from "~/config/industries";

const plumberConfig = getIndustryConfig('plumber');

console.log(plumberConfig);
// {
//   id: 'plumber',
//   name: 'Plumber',
//   namePlural: 'Plumbers',
//   category: 'trade',
//   headline: { es: '...', en: '...' },
//   services: [...],
//   ...
// }
```

### Get All Industries

```tsx
import { getAllIndustries } from "~/config/industries";

const allIndustries = getAllIndustries();
// Returns array of all 22 industry configs
```

### Get Industries by Category

```tsx
import { getIndustriesByCategory } from "~/config/industries";

const tradeServices = getIndustriesByCategory('trade');
// Returns: plumber, electrician, hvac, etc.

const professionals = getIndustriesByCategory('professional');
// Returns: attorney, insurance-agent, mortgage-broker, etc.
```

### Generate SEO Meta Tags

```tsx
import { generateIndustryMetaTags } from "~/config/industries";

const industry = getIndustryConfig('plumber');
const metaTags = generateIndustryMetaTags(industry, 'San Juan', false);

// Returns:
// {
//   title: "Plumbers in San Juan | ExactPin",
//   description: "Find the best plumbers in San Juan. Your plumber finds your home without confusing calls",
//   keywords: "plumber, plumbing, leak, pipe, drain, water, emergency, san juan, near me, local",
//   ogTitle: "Plumbers in San Juan",
//   ogDescription: "...",
//   ogType: "website",
//   jsonLd: { ... }
// }
```

### Available Industries

**Trade Services (9):**
- `plumber`
- `electrician`
- `hvac`
- `roofer`
- `landscaper`
- `pool-service`
- `handyman`
- `pest-control`
- `general-contractor`
- `cleaning-service` ✨ NEW

**Professional Services (6):**
- `attorney` ✨ NEW
- `insurance-agent` ✨ NEW
- `mortgage-broker` ✨ NEW
- `financial-advisor` ✨ NEW
- `accountant` ✨ NEW
- `mobile-notary`

**Healthcare & Wellness (3):**
- `home-healthcare`
- `mobile-vet`
- `personal-trainer` ✨ NEW

**Food & Delivery (2):**
- `food-truck`
- `catering`

**Real Estate (2):**
- `real-estate-agent`
- `contractor` (duplicate of general-contractor)

---

## Dynamic Routes

### Industry Landing Page

**Route:** `/$industry.$city.tsx`

**URL Examples:**
- `/plumber/san-juan`
- `/real-estate-agent/miami`
- `/attorney/ponce`
- `/hvac/carolina`

**Route Params:**
```tsx
// In loader
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { industry, city } = params;
  // industry: 'plumber'
  // city: 'san-juan'
}
```

**Form Submission:**
```tsx
<Form method="post">
  <input type="hidden" name="action" value="quote" />
  <input type="hidden" name="industry" value={industry.id} />
  {/* ... other fields ... */}
  <button type="submit">Get Quote</button>
</Form>
```

**Action Handler Response:**
```tsx
// Success
{
  success: true,
  message: "Quote request received! We'll contact you shortly."
}

// Error
{
  success: false,
  error: "Failed to submit request. Please try again."
}
```

**Using Action Data in Component:**
```tsx
const actionData = useActionData<typeof action>();

{actionData?.success && (
  <div className="success-message">
    {actionData.message}
  </div>
)}

{actionData?.error && (
  <div className="error-message">
    {actionData.error}
  </div>
)}
```

---

## Real Estate Agent Portal

### Route

**File:** `app/routes/real-estate-agent.$slug.tsx`

**URL Pattern:** `/real-estate-agent/{slug}`

**Examples:**
- `/real-estate-agent/maria-rodriguez`
- `/real-estate-agent/john-smith`
- `/real-estate-agent/ana-garcia`

### Data Structure

```typescript
interface Agent {
  // Identity
  id: string;
  slug: string;
  name: string;
  title: string;
  company: string;
  photo: string;

  // Contact
  phone: string;
  email: string;

  // Location
  city: string;
  state: string;
  servingAreas: string[];
  hasExactPin: boolean;
  officeAddress: string;

  // Experience
  yearsExperience: number;
  licenseNumber: string;
  specializations: string[];
  languages: string[];

  // Stats
  rating: number;
  reviewCount: number;
  propertiesSold: number;
  avgSalePrice: number;
  avgDaysOnMarket: number;

  // Bio
  bio: string;

  // Achievements
  certifications: string[];
  awards: string[];

  // Services
  services: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;

  // Vendor Network
  preferredVendors: Array<{
    type: string;
    name: string;
    verified: boolean;
  }>;
}
```

### Database Query (Production)

```typescript
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { slug } = params;

  const agent = await context.env.DB.prepare(`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM reviews WHERE professional_id = p.id) as review_count,
      (SELECT AVG(rating) FROM reviews WHERE professional_id = p.id) as avg_rating
    FROM professionals p
    WHERE p.slug = ?
      AND p.industry = 'real-estate'
      AND p.status = 'active'
    LIMIT 1
  `).bind(slug).first();

  if (!agent) {
    throw new Response('Agent Not Found', { status: 404 });
  }

  // Get reviews
  const reviews = await context.env.DB.prepare(`
    SELECT * FROM reviews
    WHERE professional_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).bind(agent.id).all();

  return json({ agent, reviews: reviews.results });
}
```

### Linking to Agent Portal

```tsx
// From industry landing page
<Link to={`/real-estate-agent/${agent.slug}`}>
  View Full Profile
</Link>

// From search results
{agents.map(agent => (
  <Link key={agent.id} to={`/real-estate-agent/${agent.slug}`}>
    {agent.name}
  </Link>
))}
```

---

## Lead Notification API

### Endpoint

**URL:** `/api/leads/notify`

**Methods:** GET (cron trigger), POST (manual trigger)

### Authentication

**Option 1: Cron Header (Cloudflare Cron)**
```
Cron: <cloudflare-cron-token>
```

**Option 2: Bearer Token**
```
Authorization: Bearer YOUR_API_SECRET
```

### Manual Trigger

```bash
# Using curl
curl https://your-domain.com/api/leads/notify \
  -H "Authorization: Bearer YOUR_API_SECRET"

# Using fetch in browser console (for testing)
fetch('/api/leads/notify', {
  headers: {
    'Authorization': 'Bearer YOUR_API_SECRET'
  }
}).then(r => r.json()).then(console.log);
```

### Response Format

```json
{
  "success": true,
  "processed": 5,
  "successful": 5,
  "failed": 0,
  "timestamp": "2025-11-30T12:00:00.000Z"
}
```

### Setting Up Cron

**In `wrangler.toml`:**
```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

**Cron Schedule Examples:**
- `"*/5 * * * *"` - Every 5 minutes
- `"*/15 * * * *"` - Every 15 minutes
- `"0 * * * *"` - Every hour
- `"0 9 * * *"` - Daily at 9:00 AM

### Environment Configuration

**Set up secrets:**
```bash
# SMS (Twilio)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER

# Email (Resend)
wrangler secret put RESEND_API_KEY

# Admin Notifications
wrangler secret put ADMIN_PHONE
wrangler secret put ADMIN_EMAIL

# API Security
wrangler secret put API_SECRET
```

**Verify secrets:**
```bash
wrangler secret list
```

### Testing Notification Flow

**1. Create Test Lead:**
```bash
# Submit form on any industry landing page
# OR manually add to KV queue:
wrangler kv:key put --binding=ANALYTICS_BUFFER \
  "lead:$(date +%s)" \
  '{"name":"Test User","phone":"555-0123","email":"test@example.com","industry":"plumber","city":"san-juan","emergency":false}'
```

**2. Trigger Notification:**
```bash
curl https://your-domain.com/api/leads/notify \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

**3. Verify:**
- Check SMS received
- Check email received
- Verify lead removed from KV queue
- Check console logs

### Notification Templates

**SMS Format:**
```
New Lead! John Smith (555-0123) interested in Leak Repair. Message: Emergency leak in basement. Reply ASAP!
```

**Email Format:**
```
Subject: New Lead from Instant Quote - John Smith

New Lead Received!

Contact Information:
- Name: John Smith
- Phone: 555-0123
- Email: john@example.com

Service Details:
- Service: Leak Repair
- Industry: plumber
- City: san-juan

Message:
Emergency leak in basement, need immediate help

Lead Source: instant_quote
Received: 11/30/2025, 12:00 PM

Please respond within 15 minutes for best conversion rates.

---
EstateFlow Multi-Industry Platform
https://estateflow.com
```

**Emergency Lead:**
```
🚨 EMERGENCY New Lead! Jane Doe (555-9999) interested in AC Repair. Message: AC completely stopped, 95° inside. Reply IMMEDIATELY!
```

---

## Complete Integration Example

### Full Landing Page with Lead Capture

```tsx
import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getIndustryConfig } from "~/config/industries";
import LeadCaptureModal from "~/components/LeadCaptureModal";

export async function loader({ params }: LoaderFunctionArgs) {
  const industry = getIndustryConfig(params.industry || '');
  if (!industry) throw new Response('Not Found', { status: 404 });

  return json({ industry });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'quote') {
    const leadData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || '',
      service: formData.get('service') as string || '',
      industry: params.industry || '',
      timestamp: new Date().toISOString(),
      source: 'instant_quote'
    };

    // Save to database
    await context.env.DB.prepare(`
      INSERT INTO leads (name, phone, email, service, industry, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(...Object.values(leadData)).run();

    // Queue notification
    await context.env.ANALYTICS_BUFFER.put(
      `lead:${Date.now()}`,
      JSON.stringify(leadData),
      { expirationTtl: 3600 }
    );

    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function IndustryPage() {
  const { industry } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>{industry.headline.en}</h1>

      <LeadCaptureModal
        id="instant-quote"
        title="Get Instant Quote"
        description={`Connect with ${industry.namePlural.toLowerCase()}`}
        action="quote"
        industry={industry.id}
        services={industry.services}
        showEmergency={industry.urgencyLevel === 'emergency'}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Always Use TypeScript

```tsx
// Good ✅
import type { IndustryConfig } from "~/config/industries";

const industry: IndustryConfig | null = getIndustryConfig('plumber');

// Bad ❌
const industry = getIndustryConfig('plumber');
```

### 2. Validate Form Data

```tsx
// Good ✅
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name');
  const phone = formData.get('phone');

  if (!name || !phone) {
    return json({ error: 'Name and phone required' }, { status: 400 });
  }

  // Continue processing...
}
```

### 3. Handle Errors Gracefully

```tsx
// Good ✅
try {
  await context.env.DB.prepare(sql).bind(data).run();
  return json({ success: true });
} catch (error) {
  console.error('Database error:', error);
  return json({ error: 'Failed to save' }, { status: 500 });
}
```

### 4. Use Environment-Specific Config

```tsx
// Good ✅
const isDevelopment = context.env.ENVIRONMENT === 'development';
const smsProvider = isDevelopment ? 'mock' : 'twilio';
```

### 5. Mobile-First Design

```tsx
// Good ✅
<button className="w-full sm:w-auto px-6 py-3">
  Contact Now
</button>

// Bad ❌
<button className="px-6 py-3">
  Contact Now
</button>
```

---

## Troubleshooting

### Popover Not Showing

**Problem:** Modal doesn't open when clicking trigger button

**Solution:**
```html
<!-- Ensure popover target matches modal ID -->
<button popovertarget="my-modal">Open</button>
<div id="my-modal" popover="auto">...</div>
```

### Form Not Submitting

**Problem:** Form submission doesn't call action handler

**Solution:**
```tsx
// Ensure Form from Remix is used, not <form>
import { Form } from "@remix-run/react";

<Form method="post">
  {/* ... */}
</Form>
```

### Leads Not Saving

**Problem:** Leads don't appear in database

**Solution:**
```bash
# Check migration ran
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name='leads'"

# Check table structure
wrangler d1 execute estateflow-db --command="PRAGMA table_info(leads)"

# Check recent leads
wrangler d1 execute estateflow-db --command="SELECT * FROM leads ORDER BY created_at DESC LIMIT 5"
```

### Notifications Not Sending

**Problem:** SMS/Email not received

**Solution:**
```bash
# Check environment variables
wrangler secret list

# Test API directly
curl https://your-domain.com/api/leads/notify \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -v

# Check KV queue
wrangler kv:key list --binding=ANALYTICS_BUFFER --prefix="lead:"
```

---

## Additional Resources

- [Remix Documentation](https://remix.run/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)

---

## Support

For questions or issues:
1. Check this guide first
2. Review inline code comments
3. Check `EPIC-001_IMPLEMENTATION_SUMMARY.md`
4. Consult CLAUDE.md in repo root
