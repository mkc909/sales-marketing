# Execution Tickets System

## 🎯 Sprint 1: Foundation (Week 1)

### EPIC-001: Dynamic Landing Page System
**Priority:** P0 | **Size:** L | **Owner:** Frontend Team

#### Tickets:

**TICK-001: Create Industry Configuration System**
- Create `/app/config/industries.ts`
- Define all service industries with metadata
- Include pain points, hooks, and CTAs per industry
- **Acceptance:** 20+ industries configured

**TICK-002: Build Dynamic Route Handler**
- Create `/app/routes/$industry.$city.tsx`
- Implement dynamic content loading
- Add SEO meta tags generation
- **Acceptance:** Routes respond to /plumber/san-juan format

**TICK-003: Implement Popover API for Lead Capture**
- Native modal implementation (zero JS)
- Lead form with industry-specific fields
- SMS/Email notification on submission
- **Acceptance:** Popover works without JavaScript

**TICK-004: Add View Transitions for Premium Feel**
- Card to profile morph animation
- Smooth page transitions
- Mobile-optimized animations
- **Acceptance:** Buttery smooth transitions

**TICK-005: Create Real Estate Agent Portal**
- Agent-specific landing template
- Review system (not property listings)
- Preferred vendor network
- **Acceptance:** /real-estate-agent/* pages live

---

### EPIC-002: Scraping & Data Pipeline
**Priority:** P0 | **Size:** XL | **Owner:** Backend Team

#### Tickets:

**TICK-006: Build Google Maps Scraper**
- Implement Places API integration
- Extract business data (name, address, phone, hours)
- Detect ICP signals (no website, complex address)
- Rate limiting and error handling
- **Acceptance:** Can scrape 100 businesses/hour

**TICK-007: Create Facebook Pages Scraper**
- OAuth integration for public pages
- Extract engagement metrics
- Identify businesses without websites
- **Acceptance:** Can enrich Google data with social

**TICK-008: Implement ICP Signal Detector**
```typescript
signals = {
  unmappable: ['Int', 'Km', 'long_address'],
  mobile: ['Food Truck', 'Mobile', 'no_fixed'],
  ghost: ['no_website', 'facebook_only']
}
```
- **Acceptance:** 90% accuracy on test set

**TICK-009: Build Lead Enrichment Pipeline**
- Phone number validation
- Email finder (where possible)
- Social media profile matching
- Business hours extraction
- **Acceptance:** 50% enrichment rate

**TICK-010: Create Double D1 Database Schema**
- DB_INGEST for raw data
- DB_STAGING for enriched leads
- DB_PROD for ghost profiles
- Migration scripts
- **Acceptance:** Schema deployed to D1

---

### EPIC-003: Ghost Directory System
**Priority:** P0 | **Size:** L | **Owner:** Full Stack Team

#### Tickets:

**TICK-011: Create Ghost Profile Generator**
- Auto-generate SEO-optimized pages
- Include structured data (Schema.org)
- Add "Claim This Business" CTA
- **Acceptance:** Can generate 1000 profiles/hour

**TICK-012: Build Lead Trap System**
- Capture form on ghost profiles
- Store leads with business association
- Email/SMS notification to admin
- Show "X leads waiting" to business owner
- **Acceptance:** Lead capture rate >5%

**TICK-013: Implement Claim Workflow**
- Verification via phone/email
- Instant profile activation
- Unlock captured leads
- Upgrade prompt to paid tiers
- **Acceptance:** <2 min claim process

---

## 🚀 Sprint 2: Monetization (Week 2)

### EPIC-004: ServiceOS Core
**Priority:** P1 | **Size:** L | **Owner:** Platform Team

#### Tickets:

**TICK-014: Build Job Links System**
- Create job tracking data model
- Generate unique 6-char codes
- Customer portal view
- Real-time status updates
- **Acceptance:** Job lifecycle tracked

**TICK-015: Implement ATH Móvil Integration**
- Payment request generation
- Webhook handlers
- Transaction recording
- Refund capability
- **Acceptance:** Can process PR payments

**TICK-016: Create Dispatch Dashboard**
- Technician assignment
- Route optimization
- Time tracking
- Job notes and photos
- **Acceptance:** Can manage 10+ jobs/day

**TICK-017: Build Customer Communication**
- SMS notifications
- WhatsApp integration
- Email updates
- ETA sharing
- **Acceptance:** Multi-channel messaging works

---

### EPIC-005: Agent Network
**Priority:** P1 | **Size:** M | **Owner:** Growth Team

#### Tickets:

**TICK-018: Create Agent Onboarding Flow**
- Simple 3-step signup
- License verification (optional)
- Profile builder wizard
- Instant page generation
- **Acceptance:** <5 min onboarding

**TICK-019: Build Vendor Network Feature**
- Agent can add preferred vendors
- Vendors get referral notifications
- Track referral conversions
- Commission/referral system (future)
- **Acceptance:** Network effects visible

**TICK-020: Implement Agent Analytics**
- Profile views tracking
- Lead quality scoring
- Conversion metrics
- Monthly performance email
- **Acceptance:** Agents see their impact

---

## 💡 Sprint 3: Intelligence (Week 3-4)

### EPIC-006: AI Automation
**Priority:** P2 | **Size:** XL | **Owner:** AI Team

#### Tickets:

**TICK-021: Build Reputation Manager Agent**
- Post-job review requests
- Multi-channel delivery (SMS/WhatsApp)
- Negative review interception
- Follow-up sequences
- **Acceptance:** 30% review rate

**TICK-022: Create Sales Nurturer Agent**
- Missed call text-back
- Abandoned quote recovery
- Lead qualification bot
- Appointment scheduling
- **Acceptance:** 20% lead recovery

**TICK-023: Implement AI Safety Rails**
- Response templates
- Prohibited topics list
- Human handoff triggers
- Rate limiting per customer
- **Acceptance:** Zero inappropriate responses

---

### EPIC-007: Growth Engineering
**Priority:** P2 | **Size:** M | **Owner:** Growth Team

#### Tickets:

**TICK-024: Build Referral System**
- Unique referral codes
- Track attribution
- Reward distribution
- Leaderboard
- **Acceptance:** 10% referral rate

**TICK-025: Create Viral Loops**
- "Powered by" on free pins
- Share incentives
- Network invitations
- Success story amplification
- **Acceptance:** K-factor > 0.5

**TICK-026: Implement SEO Engine**
- Programmatic page generation
- City + service combinations
- Blog content system
- Backlink opportunities
- **Acceptance:** 10,000 indexed pages

---

## 📊 Backlog (Future Sprints)

### EPIC-008: Enterprise Features
- Multi-location management
- Team permissions
- API access
- White-label options
- Custom contracts

### EPIC-009: Advanced AI
- Voice AI receptionist
- Predictive scheduling
- Dynamic pricing
- Churn prediction
- Upsell recommendations

### EPIC-010: Infrastructure
- Cloudflare edge optimization
- Multi-region deployment
- Real-time sync
- Backup and recovery
- Security hardening

---

## Ticket Sizing Guide

| Size | Story Points | Time Estimate | Description |
|------|-------------|--------------|-------------|
| **XS** | 1 | 2-4 hours | Config change, small fix |
| **S** | 2 | 1 day | Single file feature |
| **M** | 3 | 2-3 days | Multi-file feature |
| **L** | 5 | 1 week | Full feature |
| **XL** | 8 | 2 weeks | Complex system |

## Priority Matrix

| Priority | Description | SLA |
|----------|------------|-----|
| **P0** | Critical path, blocks others | Immediate |
| **P1** | Core features, high impact | This sprint |
| **P2** | Important, not blocking | Next sprint |
| **P3** | Nice to have | Backlog |

## Sprint Velocity Targets

- **Sprint 1:** 40 points (Foundation)
- **Sprint 2:** 45 points (Monetization)
- **Sprint 3:** 50 points (Intelligence)
- **Sprint 4:** 55 points (Scale)

## Success Metrics per Sprint

### Sprint 1 Success
- ✅ 10 landing pages live
- ✅ 100 businesses scraped
- ✅ 50 ghost profiles created
- ✅ First lead captured

### Sprint 2 Success
- ✅ First paid customer
- ✅ 500 ghost profiles
- ✅ Job management working
- ✅ Payment processing live

### Sprint 3 Success
- ✅ AI agents deployed
- ✅ 50 paying customers
- ✅ $2,000 MRR
- ✅ 20% automation rate

## Team Assignments

| Team | Focus | Sprint 1 | Sprint 2 | Sprint 3 |
|------|-------|----------|----------|----------|
| **Frontend** | UX/UI | Landing pages | Portal views | Analytics dashboard |
| **Backend** | Infrastructure | Scrapers, D1 | Payments | AI pipeline |
| **Full Stack** | Features | Ghost profiles | ServiceOS | Automation |
| **Growth** | Acquisition | Agent onboarding | Viral loops | SEO engine |
| **AI** | Intelligence | Data prep | Basic agents | Advanced AI |

## Daily Standup Format

```
Yesterday: [What was completed]
Today: [What will be worked on]
Blockers: [What's preventing progress]
Metrics: [Key numbers from yesterday]
```

## Definition of Done

- [ ] Code complete and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner approved
- [ ] Metrics tracking added
- [ ] Deployed to production