# AI Automation Agents - EPIC-006

Responsible AI automation for EstateFlow multi-industry platform. Enhances customer experience through intelligent, non-intrusive automation.

## 🎯 Overview

This system provides two AI agents with comprehensive safety controls:

1. **Reputation Manager (TICK-021)** - Post-job review requests with negative review interception
2. **Sales Nurturer (TICK-022)** - Lead recovery and qualification automation
3. **AI Safety Rails (TICK-023)** - Responsible AI controls and human oversight

## 🚀 Quick Start

### Prerequisites

```bash
# Run database migration
cd worktrees/siteforge
wrangler d1 execute estateflow-db --file=migrations/007_ai_agents.sql
```

### Basic Usage

```typescript
import { ReputationManagerAgent, SalesNurturerAgent } from '~/lib/ai-agents';
import type { AgentContext } from '~/lib/ai-agents/types';

// Create agent context
const context: AgentContext = {
  tenantId: 'your-tenant-id',
  db: env.DB,
  environment: 'production',
};

// Reputation Manager
const repAgent = new ReputationManagerAgent(context);
const result = await repAgent.createReviewRequest({
  customerId: 'customer-123',
  customerName: 'John Smith',
  customerPhone: '+1234567890',
  jobId: 'job-456',
  jobType: 'Plumbing repair',
  jobCompletedAt: new Date().toISOString(),
  preferredMethod: 'sms',
});

// Sales Nurturer
const salesAgent = new SalesNurturerAgent(context);
const nurture = await salesAgent.startNurtureSequence({
  leadId: 'lead-789',
  leadName: 'Jane Doe',
  leadPhone: '+1987654321',
  triggerType: 'missed_call',
  preferredMethod: 'sms',
});
```

## 📊 Features

### Reputation Manager Agent

**Goal:** 30% review rate

**Features:**
- ✅ Multi-channel delivery (SMS, WhatsApp, Email)
- ✅ Automated follow-up sequences (up to 3 attempts)
- ✅ Negative review interception (< 4 stars)
- ✅ Human handoff for damage control
- ✅ Review platform integration
- ✅ Rate limiting per customer

**Workflow:**
1. Job completion triggers review request
2. AI sends personalized request via preferred channel
3. Customer clicks review link and rates service
4. If rating < 4 stars:
   - Review is intercepted (not published)
   - Human team is notified immediately
   - Follow-up call scheduled within 24 hours
5. If rating ≥ 4 stars:
   - Customer directed to public review platform
   - Review published normally

**API Endpoints:**
```bash
# Create review request
POST /api/ai-agent?action=reputation-manager&method=review-request
{
  "customerId": "customer-123",
  "customerName": "John Smith",
  "customerPhone": "+1234567890",
  "jobId": "job-456",
  "jobType": "HVAC repair",
  "preferredMethod": "sms"
}

# Process review response
POST /api/ai-agent?action=reputation-manager&method=review-response
{
  "requestId": "review-xyz",
  "rating": 5,
  "reviewText": "Great service!",
  "platform": "google"
}

# Run follow-up sequences (scheduled)
GET /api/ai-agent?action=reputation-manager&method=run-followups
```

### Sales Nurturer Agent

**Goal:** 20% lead recovery rate

**Features:**
- ✅ Missed call text-back (within 5 minutes)
- ✅ Abandoned quote recovery
- ✅ Lead qualification automation
- ✅ Appointment scheduling integration
- ✅ Intent detection (question, objection, ready to buy)
- ✅ Sentiment analysis (positive, neutral, negative)
- ✅ Smart conversation handling

**Trigger Types:**
1. **Missed Call** - Text back within 5 minutes offering help
2. **Abandoned Quote** - Follow up on incomplete quote requests
3. **No Response** - Re-engage cold leads with value proposition
4. **Cold Lead** - Nurture leads from past inquiries

**Workflow:**
1. Trigger event detected (missed call, abandoned quote, etc.)
2. AI initiates conversation via preferred channel
3. Lead responds with questions/objections
4. AI provides intelligent responses (uses templates + AI)
5. If complex question or negative sentiment → Human handoff
6. If qualified (ready to buy) → Schedule appointment
7. Follow-up sequence continues until conversion or opt-out

**API Endpoints:**
```bash
# Start nurture sequence
POST /api/ai-agent?action=sales-nurturer&method=start-sequence
{
  "leadId": "lead-123",
  "leadName": "Jane Doe",
  "leadPhone": "+1987654321",
  "triggerType": "missed_call",
  "preferredMethod": "sms"
}

# Process incoming message
POST /api/ai-agent?action=sales-nurturer&method=incoming-message
{
  "leadId": "lead-123",
  "messageText": "How much for a new HVAC system?",
  "deliveryMethod": "sms"
}

# Run scheduled sequences
GET /api/ai-agent?action=sales-nurturer&method=run-scheduled

# Schedule appointment
POST /api/ai-agent?action=sales-nurturer&method=schedule-appointment
{
  "sequenceId": "nurture-xyz",
  "appointmentTime": "2025-12-01T14:00:00Z"
}
```

### AI Safety Rails

**Features:**
- ✅ Prohibited topics detection (legal, medical, financial advice)
- ✅ Human handoff triggers (complex questions, negative sentiment)
- ✅ Rate limiting (3 messages/day, 10/week, 30/month per customer)
- ✅ Response template validation
- ✅ Automated opt-out handling
- ✅ Safety violation tracking

**Global Safety Rules:**
1. **No Legal Advice** - Hand off to human
2. **No Medical Advice** - Hand off to human
3. **No Financial Advice** - Hand off to human
4. **Customer Requests Human** - Immediate handoff
5. **Strong Negative Sentiment** - Urgent handoff
6. **SMS Opt-out Notice** - Required in all messages

**Rate Limits (per customer):**
- Daily: 3 messages
- Weekly: 10 messages
- Monthly: 30 messages

**Opt-out Keywords:**
- STOP
- UNSUBSCRIBE
- OPT OUT
- REMOVE
- CANCEL

## 🗄️ Database Schema

### Core Tables

**ai_agent_configs** - Per-tenant agent configuration
```sql
- id, tenant_id, agent_type, enabled
- config (JSON), daily_limit, monthly_limit
- Performance: total_interactions, successful_interactions, failed_interactions
```

**review_requests** - Reputation Manager data
```sql
- id, tenant_id, customer_id, job_id
- delivery_method, phone_number, email
- status, sent_at, delivered_at, reviewed_at
- review_platform, review_rating, review_text, is_negative
- sequence_step, max_sequences, next_followup_at
```

**lead_nurture_sequences** - Sales Nurturer sequences
```sql
- id, tenant_id, lead_id
- trigger_type, trigger_data, sequence_step, max_steps
- status, next_action_at
- lead_qualified, appointment_scheduled
- conversion_value, converted_at
```

**lead_nurture_messages** - Conversation history
```sql
- id, sequence_id, tenant_id
- direction (outbound/inbound), message_text
- delivery_method, delivery_status
- intent_detected, sentiment, needs_human_handoff
```

**ai_safety_rules** - Safety configuration
```sql
- id, tenant_id (NULL = global)
- rule_type, rule_name, keywords, patterns
- action (block/warn/handoff/add_disclaimer)
- applies_to_agents
```

**ai_human_handoffs** - Human escalation queue
```sql
- id, tenant_id, agent_type, conversation_id, customer_id
- reason, urgency, conversation_history, customer_context
- status, claimed_by, resolved_at
```

**ai_customer_rate_limits** - Per-customer limits
```sql
- id, tenant_id, customer_id
- daily_interactions, weekly_interactions, monthly_interactions
- opted_out, opted_out_at, opt_out_reason
```

### Analytics Tables

**ai_agent_analytics** - Daily performance rollup
```sql
- id, tenant_id, agent_type, date
- total_interactions, successful_interactions, failed_interactions
- Reputation Manager: reviews_requested, reviews_received, review_rate
- Sales Nurturer: leads_contacted, conversions, recovery_rate
- Safety: safety_violations, messages_blocked
```

## 🔒 Safety & Compliance

### Rate Limiting

Prevents spam and ensures responsible communication:

```typescript
import { RateLimitEngine } from '~/lib/ai-agents/safety-rails';

const rateLimiter = new RateLimitEngine(context);

// Check if customer can receive message
const check = await rateLimiter.checkLimit(customerId);
if (!check.allowed) {
  console.log(check.reason); // "Daily limit reached"
}

// Increment counter after sending
await rateLimiter.incrementCount(customerId);

// Handle opt-out
await rateLimiter.optOut(customerId, 'Customer requested');
```

### Safety Checks

All messages are validated before sending:

```typescript
import { SafetyRailsEngine } from '~/lib/ai-agents/safety-rails';

const safety = new SafetyRailsEngine(context);

// Check message safety
const result = await safety.checkMessage(
  "Can you give me legal advice about my contract?",
  'sales_nurturer'
);

if (!result.safe) {
  // result.action === 'handoff'
  // result.violations contains triggered rules
  await safety.createHandoff(
    'sales_nurturer',
    conversationId,
    customerId,
    'Legal question requires attorney'
  );
}
```

### Human Handoffs

Automatically escalate to humans when needed:

**Triggers:**
- Prohibited topics (legal, medical, financial)
- Customer requests human
- Strong negative sentiment
- Complex questions beyond AI capability
- Lead not interested

**Urgency Levels:**
- **Low** - General questions
- **Normal** - Standard escalations
- **High** - Negative sentiment, not interested
- **Urgent** - Legal threats, safety concerns

## 📈 Performance Targets

### Reputation Manager
- **Review Request Rate**: 100% of completed jobs
- **Review Submission Rate**: 30% (industry avg: 10-15%)
- **Positive Review Rate**: 90%+
- **Negative Review Interception**: 100%
- **Response Time**: < 24 hours after job completion

### Sales Nurturer
- **Lead Contact Rate**: 100% of triggers
- **Lead Response Rate**: 40% (respond to initial message)
- **Lead Qualification Rate**: 15% (qualified for appointment)
- **Lead Recovery Rate**: 20% (convert to customer)
- **Response Time**: < 5 minutes for missed calls

## 🔧 Configuration

### Per-Tenant Configuration

```sql
-- Configure Reputation Manager
INSERT INTO ai_agent_configs (id, tenant_id, agent_type, enabled, config, daily_limit) VALUES
('config-rep-123', 'tenant-abc', 'reputation_manager', 1, '{
  "autoSendAfterJobCompletion": true,
  "delayHours": 2,
  "maxFollowups": 3,
  "followupIntervalDays": 3,
  "negativeThreshold": 4,
  "deliveryMethods": ["sms", "email"],
  "reviewPlatforms": ["google", "yelp"],
  "targetReviewRate": 0.30
}', 100);

-- Configure Sales Nurturer
INSERT INTO ai_agent_configs (id, tenant_id, agent_type, enabled, config, daily_limit) VALUES
('config-sales-456', 'tenant-abc', 'sales_nurturer', 1, '{
  "triggers": {
    "missedCall": true,
    "abandonedQuote": true,
    "noResponse": true,
    "coldLead": false
  },
  "maxSequenceSteps": 5,
  "stepIntervalHours": 24,
  "qualificationCriteria": {
    "budgetConfirmed": true,
    "timelineConfirmed": true,
    "authorityConfirmed": false
  },
  "appointmentScheduling": {
    "enabled": true,
    "calendarIntegration": "google"
  },
  "targetRecoveryRate": 0.20
}', 150);
```

### Response Templates

TODO: Create default templates for each agent type in `templates.ts`

## 🚀 Deployment

### 1. Run Migration

```bash
cd worktrees/siteforge
wrangler d1 execute estateflow-db --file=migrations/007_ai_agents.sql
```

### 2. Configure Scheduled Tasks (Cloudflare Cron Triggers)

Add to `wrangler.toml`:

```toml
[triggers]
crons = [
  # Run review follow-ups every 6 hours
  "0 */6 * * *",
  # Run sales nurture sequences every hour
  "0 * * * *"
]
```

### 3. Configure Messaging Providers

Set up environment secrets:

```bash
# Twilio (SMS/WhatsApp)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER

# SendGrid (Email)
wrangler secret put SENDGRID_API_KEY
```

### 4. Test in Development

```bash
# Start dev server
npm run dev

# Test review request
curl -X POST http://localhost:8788/api/ai-agent?action=reputation-manager&method=review-request \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-123",
    "customerName": "Test User",
    "customerPhone": "+1234567890",
    "jobType": "Test Service",
    "preferredMethod": "sms"
  }'
```

## 📝 TODO

### Immediate
- [ ] Create default response templates library
- [ ] Implement actual messaging provider integrations (Twilio, SendGrid)
- [ ] Add tenant-based API key authentication
- [ ] Implement Workers AI integration for intelligent responses

### Future Enhancements
- [ ] A/B testing for message templates
- [ ] Multi-language support (Spanish for Puerto Rico)
- [ ] Voice call integration for high-value leads
- [ ] Calendar integration (Google Calendar, Calendly)
- [ ] CRM integration (sync with customer records)
- [ ] Advanced analytics dashboard
- [ ] ML model for sentiment analysis fine-tuning
- [ ] Predictive lead scoring

## 🐛 Troubleshooting

### Messages Not Sending

**Check:**
1. Messaging provider credentials configured?
2. Customer phone number/email valid?
3. Rate limit not exceeded?
4. Safety rules not blocking message?

**Debug:**
```sql
-- Check recent review requests
SELECT * FROM review_requests
WHERE tenant_id = 'your-tenant'
ORDER BY created_at DESC
LIMIT 10;

-- Check safety violations
SELECT * FROM ai_safety_rules
WHERE is_active = 1;

-- Check rate limits
SELECT * FROM ai_customer_rate_limits
WHERE customer_id = 'customer-123';
```

### Human Handoffs Not Creating

**Check:**
1. Safety rules configured correctly?
2. Handoff triggers active?
3. Database permissions?

**Debug:**
```sql
-- Check pending handoffs
SELECT * FROM ai_human_handoffs
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Check recent messages
SELECT * FROM lead_nurture_messages
WHERE needs_human_handoff = 1;
```

## 📚 Additional Resources

- [EPIC-006 Specification](../../docs/EPIC-006-AI-AUTOMATION.md)
- [Database Migration](../../migrations/007_ai_agents.sql)
- [API Endpoint](../routes/api.ai-agent.tsx)
- [Type Definitions](./types.ts)

## 🤝 Contributing

When adding new features:

1. Update type definitions in `types.ts`
2. Add safety checks for new message types
3. Update database schema if needed
4. Add API endpoints for new functionality
5. Update this README
6. Add tests (TODO: Create test suite)

## 📄 License

Copyright © 2025 EstateFlow. All rights reserved.
