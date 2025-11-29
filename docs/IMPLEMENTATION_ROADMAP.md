# Implementation Roadmap: EnlacePR/TownLink Platform

## Executive Summary

This document outlines the comprehensive implementation plan for the multi-phase rollout of EnlacePR/TownLink, focusing on rapid market entry through the PinExacto wedge, automated acquisition via ghost profiles, and systematic monetization through ServiceOS and AI agents.

## Phase Architecture

```
Track A: Frontend/UX     Track B: Data Pipeline    Track C: Platform
├─ Landing Pages        ├─ Scrapers              ├─ Ghost Directory
├─ Dynamic Content      ├─ Enrichment            ├─ ServiceOS
└─ Native APIs          └─ Lead Scoring          └─ AI Agents
```

## Phase 1: Enhanced Wedge & Landing System (Week 1-2)

### 1.1 Dynamic Landing Page System

#### Target Niches (Priority Order)

**Real Estate Agents** (Gateway to Locals)
- Pain Point: "Buyers can't find the property"
- Hook: Professional agent page with reviews
- Viral Loop: Agent → Home sellers → Service providers

**Trade Services**
1. Plumbers ("Emergency plumber can't find your leak")
2. Electricians ("Power out? We find you in the dark")
3. HVAC ("AC broken? We arrive before you melt")
4. Roofers ("Leak today, fixed today")
5. Landscapers ("Your yard, our GPS")
6. Pool Service ("Crystal clear location")
7. Pest Control ("Bugs gone, no wrong turns")
8. Handyman ("Jack of all trades, master of directions")

**Healthcare & Wellness**
1. Home Healthcare ("Nurses find grandma's door")
2. Mobile Vets ("Fido's doctor comes to you")
3. Massage Therapists ("Relaxation delivered")
4. Personal Trainers ("Gym comes to your gate")

**Food & Delivery**
1. Food Trucks ("Today's location, always accurate")
2. Catering ("Party found, food delivered")
3. Meal Prep ("Fresh to your fridge")
4. Mobile Bar ("Cocktails at your coordinates")

**Professional Services**
1. Mobile Notary ("Documents to your door")
2. Tax Preparers ("Receipts to refunds")
3. Insurance Adjusters ("Claims at your coordinates")
4. Home Inspectors ("Inspection precision")

### 1.2 Technical Implementation

#### Dynamic Route Structure
```typescript
// app/routes/$industry.$city.tsx
// Examples:
// /plumber/san-juan
// /real-estate-agent/ponce
// /food-truck/bayamon

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { industry, city } = params;

  // Get industry-specific content
  const industryConfig = getIndustryConfig(industry);
  const cityData = getCityData(city);

  // Get ghost profiles for this industry/city
  const ghostProfiles = await getGhostProfiles(industry, city);

  return json({
    industry: industryConfig,
    city: cityData,
    profiles: ghostProfiles,
    stats: getLocalStats(industry, city)
  });
}
```

#### Native API Integration

**Popover API for Lead Capture**
```html
<!-- Zero-JS modal for ghost profile claims -->
<button popovertarget="claim-modal">
  Claim This Business
</button>

<div id="claim-modal" popover>
  <form method="post" action="/api/claim">
    <h2>Is this your business?</h2>
    <p>Claim it now to unlock leads</p>
    <!-- Form fields -->
  </form>
</div>
```

**View Transitions for Premium Feel**
```css
/* Directory to profile morph */
.business-card {
  view-transition-name: var(--business-id);
}

.profile-header {
  view-transition-name: var(--business-id);
}

/* Smooth expansion animation */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}
```

## Phase 2: Data Pipeline & Ghost Directory (Week 2-3)

### 2.1 Scraping Infrastructure

#### Multi-Source Data Collection
```typescript
interface ScraperConfig {
  sources: {
    googleMaps: {
      priority: 1,
      fields: ['name', 'address', 'phone', 'category', 'reviews'],
      signals: ['no_website', 'complex_address', 'mobile_category']
    },
    facebook: {
      priority: 2,
      fields: ['page_name', 'likes', 'phone', 'hours'],
      signals: ['high_engagement', 'no_website_link']
    },
    yellowPages: {
      priority: 3,
      fields: ['business_name', 'services', 'years_in_business'],
      signals: ['established_business']
    }
  }
}
```

#### ICP Signal Detection
```typescript
interface ICPSignals {
  unmappable: {
    triggers: [
      'address.includes("Int")',
      'address.includes("Km")',
      'address.length > 50',
      'reviews.includes("hard to find")'
    ],
    score: 10
  },
  mobile: {
    triggers: [
      'category.includes("Mobile")',
      'category.includes("Food Truck")',
      'address.type === "residential"'
    ],
    score: 8
  },
  digitalGhost: {
    triggers: [
      'website === null',
      'website.includes("facebook.com")',
      'last_updated > 365 days'
    ],
    score: 9
  }
}
```

### 2.2 Lead Enrichment Pipeline

#### Double D1 Architecture
```sql
-- DB_INGEST: Raw scraped data
CREATE TABLE raw_leads (
  id INTEGER PRIMARY KEY,
  source TEXT,
  data JSON,
  scraped_at TIMESTAMP,
  processing_status TEXT
);

-- DB_STAGING: Enriched & scored
CREATE TABLE enriched_leads (
  id INTEGER PRIMARY KEY,
  business_name TEXT,
  industry TEXT,
  icp_score INTEGER,
  signals JSON,
  enriched_data JSON,
  ready_for_outreach BOOLEAN
);

-- DB_PROD: Active ghost profiles
CREATE TABLE ghost_profiles (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  business_data JSON,
  claim_token TEXT,
  leads_captured INTEGER DEFAULT 0,
  created_at TIMESTAMP
);
```

### 2.3 Ghost Profile System

#### Auto-Generated SEO Pages
```typescript
// Generate thousands of local pages
interface GhostProfile {
  title: `${businessName} - ${service} in ${city}`;
  metaDescription: `Looking for ${businessName}? Get directions, hours, and contact info for ${service} in ${city}, ${state}`;

  // Schema.org for AI engines
  jsonLd: {
    "@type": "LocalBusiness",
    name: businessName,
    address: structuredAddress,
    geo: coordinates,
    hasMap: pinExactoUrl
  };

  // Lead trap
  leadForm: {
    visible: true,
    fields: ['name', 'phone', 'service_needed'],
    notification: 'business_owner_sms'
  };
}
```

## Phase 3: ServiceOS Core (Week 3-4)

### 3.1 Job Management System

#### Job Links Architecture
```typescript
interface JobLink {
  id: string;
  shortCode: string; // 6-char like "JOB123"

  // Job details
  customer: {
    name: string;
    phone: string;
    address: string;
    pinUrl?: string;
  };

  // Service details
  service: string;
  scheduledFor: Date;
  estimatedDuration: number;
  price: number;

  // Status tracking
  status: 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'paid';

  // Real-time updates
  technician?: {
    name: string;
    photo: string;
    eta: number;
    location?: Coordinates;
  };

  // Payment
  paymentLink?: string;
  paymentMethod?: 'ath_movil' | 'cash' | 'card';
}
```

#### Customer Portal View
```typescript
// /job/JOB123 - What customer sees
interface CustomerJobView {
  header: "Your ${service} Service";

  status: {
    current: "Technician en route",
    eta: "Arrives in 12 minutes",
    progress: 60 // percentage
  };

  technician: {
    name: "Carlos Rodriguez",
    photo: "verified_photo_url",
    rating: 4.8,
    completedJobs: 234
  };

  actions: {
    callTechnician: boolean;
    sendMessage: boolean;
    updateLocation: boolean;
    makePayment: boolean;
  };

  // Live map if en route
  map?: {
    technicianLocation: Coordinates;
    customerLocation: Coordinates;
    route: RouteData;
  };
}
```

### 3.2 Payment Integration

#### ATH Móvil (Puerto Rico Priority)
```typescript
interface ATHMovilConfig {
  businessToken: string;

  // Payment request
  createPaymentRequest(job: JobLink): {
    amount: number;
    description: string;
    expiresIn: number; // minutes
    callbackUrl: string;
    metadata: {
      jobId: string;
      customerId: string;
    };
  };

  // Payment notification webhook
  handleWebhook(payload: ATHWebhook): {
    status: 'completed' | 'failed';
    transactionId: string;
    updateJob: () => void;
  };
}
```

## Phase 4: Real Estate Agent Portal (Week 3-4)

### 4.1 Agent-Specific Features

#### Agent Profile Structure
```typescript
interface AgentProfile {
  // Basic info
  name: string;
  license: string;
  agency?: string;

  // Specializations
  areas: string[]; // ["Condado", "Santurce", "Isla Verde"]
  propertyTypes: string[]; // ["Condos", "Houses", "Commercial"]
  languages: string[]; // ["English", "Spanish", "French"]

  // Not about listings - about connections
  services: [
    "Buyer Representation",
    "Seller Consultation",
    "Property Valuation",
    "Relocation Assistance",
    "Investment Analysis"
  ];

  // Social proof
  reviews: Review[];
  yearsExperience: number;
  totalTransactions: number;

  // The hook - Easy contact
  instantContact: {
    whatsapp: string;
    calendar: string; // Calendly-style booking
    responseTime: "< 5 minutes";
  };

  // Network effect
  preferredVendors: [
    { type: "inspector", name: string, pinUrl: string },
    { type: "mortgage", name: string, pinUrl: string },
    { type: "moving", name: string, pinUrl: string },
    { type: "handyman", name: string, pinUrl: string }
  ];
}
```

#### Agent Acquisition Strategy
```typescript
interface AgentAcquisition {
  // The pitch
  messaging: {
    subject: "Stop losing clients to Zillow agents",
    pain: "Buyers contact random agents on Zillow",
    solution: "Your own professional page that ranks #1 for your name",
    proof: "Maria Gonzalez got 47 leads in first month"
  };

  // Viral mechanics
  agentToVendor: {
    trigger: "Agent needs home inspector",
    action: "Shares PinExacto with vendor",
    result: "Vendor signs up for directory"
  };

  agentToSeller: {
    trigger: "Listing appointment",
    action: "Creates property pin for seller",
    result: "Seller shares with contractors"
  };
}
```

## Phase 5: AI Automation Layer (Month 2)

### 5.1 The Agentic Workforce

#### Agent Architecture
```typescript
interface AIAgent {
  id: string;
  type: 'reputation' | 'sales' | 'support';

  triggers: Trigger[];
  actions: Action[];
  personality: 'professional' | 'friendly' | 'concise';
  language: 'es-PR' | 'en-US';

  limits: {
    messagesPerDay: number;
    hoursActive: string[]; // ["9:00", "21:00"]
    blacklistWords: string[];
  };
}
```

#### The Reputation Manager
```typescript
class ReputationManager {
  // Triggered when job.status = 'paid'
  async onJobCompleted(job: JobLink) {
    // Wait 2 hours
    await delay(hours(2));

    // Send review request
    const message = this.crafted({
      template: 'review_request',
      language: job.customer.language,
      personalization: {
        name: job.customer.firstName,
        service: job.service
      }
    });

    // Multi-channel delivery
    await this.send(message, {
      sms: job.customer.phone,
      whatsapp: job.customer.whatsapp,
      email: job.customer.email
    });

    // If no response in 24h, gentle reminder
    await this.scheduleFollowUp(hours(24));
  }

  // Intercept negative reviews
  async onRatingReceived(rating: number) {
    if (rating <= 3) {
      // Redirect to internal feedback
      return redirect('/feedback/internal');
    } else {
      // Send to Google Reviews
      return redirect('https://g.page/review/...');
    }
  }
}
```

#### The Sales Nurturer
```typescript
class SalesNurturer {
  // Missed call recovery
  async onMissedCall(call: MissedCall) {
    const message = `Hi! Sorry we missed your call at ${call.time}.
                    How can we help you today?
                    Reply 1 for emergency service
                    Reply 2 for a quote
                    Reply 3 to schedule`;

    await sms.send(call.from, message);
    await this.createLeadRecord(call);
  }

  // Abandoned quote recovery
  async onQuoteAbandoned(lead: Lead) {
    await delay(hours(24));

    const message = this.personalized({
      template: 'quote_recovery',
      data: {
        service: lead.serviceRequested,
        originalQuote: lead.quoteAmount,
        discount: '10%'
      }
    });

    await whatsapp.send(lead.phone, message);
  }
}
```

## Implementation Priorities Matrix

| Priority | Component | Complexity | Impact | Timeline |
|----------|-----------|-----------|---------|----------|
| **P0** | Dynamic Landing Pages | Medium | Critical | Week 1 |
| **P0** | Google Maps Scraper | High | Critical | Week 1 |
| **P0** | Ghost Profiles | Medium | Critical | Week 1-2 |
| **P0** | Real Estate Portal | Low | High | Week 2 |
| **P1** | Lead Enrichment | Medium | High | Week 2 |
| **P1** | Job Links | Medium | High | Week 3 |
| **P1** | ATH Móvil | High | Critical (PR) | Week 3 |
| **P2** | AI Reputation | Medium | Medium | Week 4 |
| **P2** | Sales Nurturer | High | High | Month 2 |
| **P3** | Team Dispatch | High | Medium | Month 2 |
| **P3** | AEO Intelligence | Low | Future | Month 3 |

## Success Metrics

### Week 1 Targets
- [ ] 10 niche landing pages live
- [ ] 100 businesses scraped
- [ ] 50 ghost profiles created
- [ ] 10 real estate agents onboarded

### Week 2 Targets
- [ ] 500 businesses scraped
- [ ] 200 ghost profiles
- [ ] 50 leads captured
- [ ] 5 profile claims

### Month 1 Targets
- [ ] 2,000 ghost profiles
- [ ] 500 leads captured
- [ ] 50 paying subscribers
- [ ] $2,000 MRR

### Quarter 1 Targets
- [ ] 10,000 ghost profiles
- [ ] 5,000 leads captured
- [ ] 500 paying subscribers
- [ ] $25,000 MRR

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| Scraping blocks | Multiple data sources, residential proxies |
| Low claim rate | More aggressive lead notifications |
| Payment failures | Multiple processors, manual fallback |
| AI hallucinations | Strict templates, human review queue |
| Scaling costs | Edge caching, query optimization |

## Next Actions

1. **Immediate (Today)**
   - Set up landing page routes
   - Create industry configurations
   - Design agent portal

2. **Tomorrow**
   - Build scraper prototype
   - Test Popover/Transitions APIs
   - Create ghost profile template

3. **This Week**
   - Launch 10 landing pages
   - Scrape 100 businesses
   - Onboard 5 beta agents

## Conclusion

This roadmap balances rapid market entry with sustainable platform building. The key is parallel execution across tracks while maintaining focus on the core wedge product (PinExacto) and primary viral loop (agents → locals → services).