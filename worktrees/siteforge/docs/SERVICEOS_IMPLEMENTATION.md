# ServiceOS Implementation Guide

## Overview

ServiceOS is a comprehensive job management system for service businesses (plumbers, HVAC, electricians, landscapers, etc.) built into EstateFlow. It provides complete job tracking, dispatch management, payment processing, and customer communication features optimized for the Puerto Rico market.

## Features Implemented

### 1. Job Links System (TICK-014)

**Purpose**: Unique 6-character codes for easy job tracking and customer portal access

**Files**:
- `app/lib/job-tracking.ts` - Core job tracking logic
- `app/routes/job.$code.tsx` - Customer portal view

**Key Features**:
- Unique 6-character job codes (e.g., `ABC123`)
- Real-time status updates
- Customer-safe data filtering
- Status history tracking
- Job statistics and reporting

**Usage**:
```typescript
// Create a job
const job = await createJob(context, {
  tenant_id: 1,
  customer_name: "Juan Pérez",
  customer_phone: "+1-787-555-0100",
  customer_address: "123 Calle Principal",
  customer_city: "San Juan",
  customer_state: "PR",
  customer_zip: "00901",
  service_type: "Plumbing Repair",
  service_description: "Leaking sink in kitchen",
  priority: "high",
});

// Customer accesses job at: /job/ABC123
```

**Customer Portal Features**:
- Bilingual support (English/Spanish)
- Service details and status timeline
- Payment information and ATH Móvil integration
- Photo gallery
- Real-time status updates

### 2. ATH Móvil Integration (TICK-015)

**Purpose**: Primary payment method for Puerto Rico market

**Files**:
- `app/lib/ath-movil.ts` - Payment processing logic
- `app/routes/api.webhooks.ath-movil.tsx` - Webhook handler
- `app/routes/api.payment.$jobCode.ath-movil.tsx` - Payment link generator

**Key Features**:
- Payment request generation
- Webhook processing for payment confirmations
- Manual payment recording (cash, card, check)
- Payment statistics and reporting
- Refund processing

**Usage**:
```typescript
// Create payment request
const paymentRequest = await createPaymentRequest(context, {
  job_id: job.id,
  tenant_id: tenant.id,
  amount: 150.00,
  customer_name: "Juan Pérez",
  customer_phone: "+1-787-555-0100",
  description: "Plumbing repair - Job ABC123",
});

// Customer pays via: /api/payment/ABC123/ath-movil
```

**Webhook Setup**:
```
POST https://your-domain.com/api/webhooks/ath-movil

Headers:
  x-ath-movil-signature: <signature>

Payload:
  {
    "transaction_id": "ATH123...",
    "status": "completed",
    "amount": 150.00,
    "reference": "ABC123"
  }
```

### 3. Dispatch Dashboard (TICK-016)

**Purpose**: Internal dashboard for technician management and job assignment

**Files**:
- `app/routes/dispatch.tsx` - Dispatch dashboard

**Key Features**:
- Kanban-style job board
- Real-time technician status
- Drag-and-drop job assignment (ready for enhancement)
- Job statistics dashboard
- Date-based filtering
- Route optimization (ready for implementation)

**Usage**:
```
Access at: /dispatch

Features:
- View all jobs organized by status
- Assign technicians to pending jobs
- Update job status
- Monitor technician availability
- Track job completion metrics
```

**Technician Management**:
- Active/inactive status
- Specializations and certifications
- Service regions
- Current job assignments
- Hourly rates

### 4. Customer Communication (TICK-017)

**Purpose**: Multi-channel messaging for job updates

**Files**:
- `app/lib/communications.ts` - Communication system

**Key Features**:
- SMS notifications via Twilio
- WhatsApp integration
- Email updates
- Bilingual templates (English/Spanish)
- Message history tracking
- Templated messages for common events

**Available Templates**:
- `job_created` - Initial confirmation
- `technician_assigned` - Technician assignment
- `technician_on_way` - ETA notification
- `job_started` - Service started
- `job_completed` - Completion with payment link
- `payment_received` - Payment confirmation
- `schedule_reminder` - Next-day reminder

**Usage**:
```typescript
// Send templated message
await sendTemplatedMessage(context, {
  job_id: job.id,
  template_key: "technician_on_way",
  type: "whatsapp",
  recipient: "+1-787-555-0100",
  language: "es",
  variables: {
    technician_name: "Carlos Rivera",
    eta: 15,
    job_code: "ABC123",
    tracking_url: "https://your-domain.com/job/ABC123",
  },
});
```

## Database Schema

**Migration**: `migrations/006_serviceos.sql`

**Tables Created**:

1. **jobs** - Main job tracking
   - Unique 6-character codes
   - Customer information
   - Service details
   - Status and payment tracking
   - Scheduling information

2. **job_status_history** - Audit trail
   - All status changes
   - Who made the change
   - Location data (for field updates)

3. **payments** - Transaction records
   - ATH Móvil transactions
   - Manual payments (cash, card)
   - Refund tracking

4. **technicians** - Technician profiles
   - Contact information
   - Specializations and certifications
   - Vehicle information
   - Real-time location tracking

5. **job_communications** - Message history
   - SMS, WhatsApp, Email tracking
   - Delivery status
   - Read receipts

6. **technician_availability** - Schedule management
   - Weekly availability
   - Time blocks

7. **technician_time_off** - Time off tracking
   - Vacation, sick leave
   - Approval workflow

## Setup Instructions

### 1. Run Database Migration

```bash
cd worktrees/siteforge

# Run migration
wrangler d1 execute estateflow-db --file=migrations/006_serviceos.sql

# Verify tables created
wrangler d1 execute estateflow-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'job%' OR name LIKE 'tech%' OR name = 'payments'"
```

### 2. Configure Environment Variables

Add to `wrangler.toml`:

```toml
[env.production.vars]
# Twilio (SMS and WhatsApp)
TWILIO_ACCOUNT_SID = "your_account_sid"
TWILIO_AUTH_TOKEN = "your_auth_token"
TWILIO_PHONE_NUMBER = "+1-787-XXX-XXXX"  # Your Twilio number
TWILIO_WHATSAPP_NUMBER = "+1-787-XXX-XXXX"  # WhatsApp-enabled number

# ATH Móvil (Puerto Rico payments)
ATH_MOVIL_MERCHANT_ID = "your_merchant_id"
ATH_MOVIL_API_KEY = "your_api_key"
ATH_MOVIL_API_SECRET = "your_api_secret"
ATH_MOVIL_ENVIRONMENT = "production"  # or "sandbox"
ATH_MOVIL_WEBHOOK_SECRET = "your_webhook_secret"
```

Or use Wrangler secrets for sensitive data:

```bash
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put ATH_MOVIL_API_SECRET
wrangler secret put ATH_MOVIL_WEBHOOK_SECRET
```

### 3. Setup Twilio (SMS/WhatsApp)

1. Create account at https://www.twilio.com/
2. Get a Puerto Rico phone number (+1-787)
3. Enable WhatsApp sandbox: https://www.twilio.com/console/sms/whatsapp/sandbox
4. Configure webhook for status updates:
   - URL: `https://your-domain.com/api/webhooks/twilio`
   - Method: POST

### 4. Setup ATH Móvil

1. Apply for merchant account: https://evertecinc.com/ath-movil-business/
2. Get API credentials (sandbox for testing)
3. Configure webhook URL: `https://your-domain.com/api/webhooks/ath-movil`
4. Test with sandbox environment first

### 5. Create Test Data

```sql
-- Create a test technician
INSERT INTO technicians (
  id, tenant_id, first_name, last_name, phone, status,
  specializations, languages, created_at, updated_at
) VALUES (
  'tech-001',
  1,
  'Carlos',
  'Rivera',
  '+1-787-555-0200',
  'active',
  '["plumbing", "hvac"]',
  '["es", "en"]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Create a test job
-- Use the createJob() function in your code instead
```

## API Endpoints

### Customer-Facing

- `GET /job/:code` - Customer portal for job tracking
- `GET /api/payment/:jobCode/ath-movil` - Generate ATH Móvil payment link
- `POST /api/payment/:jobCode/ath-movil` - Create payment (API)

### Internal (Require Authentication)

- `GET /dispatch` - Dispatch dashboard
- `POST /dispatch` - Job assignment and status updates

### Webhooks (External Services)

- `POST /api/webhooks/ath-movil` - ATH Móvil payment notifications
- `POST /api/webhooks/twilio` - Twilio status updates (future)

## Integration Examples

### Creating a Job and Sending Confirmation

```typescript
// 1. Create job
const job = await createJob(context, {
  tenant_id: tenant.id,
  customer_name: "María González",
  customer_phone: "+1-787-555-0100",
  customer_address: "456 Calle Sol",
  customer_city: "Bayamón",
  customer_state: "PR",
  customer_zip: "00961",
  service_type: "A/C Repair",
  service_description: "Unit not cooling",
  priority: "high",
  scheduled_date: "2025-12-01",
  scheduled_time_start: "14:00",
  estimated_duration_minutes: 90,
});

// 2. Send confirmation SMS
await sendTemplatedMessage(context, {
  job_id: job.id,
  template_key: "job_created",
  type: "sms",
  recipient: job.customer_phone,
  language: "es",
  variables: {
    customer_name: job.customer_name,
    job_code: job.job_code,
    service_type: job.service_type,
    scheduled_date: "1 de diciembre",
    scheduled_time: "2:00 PM",
    tracking_url: `https://your-domain.com/job/${job.job_code}`,
  },
});
```

### Assigning Technician and Notifying Customer

```typescript
// 1. Assign technician
await updateJob(context, job.id, {
  technician_id: "tech-001",
  status: "assigned",
}, "dispatch_admin", "admin");

// 2. Get technician details
const tech = await context.env.DB.prepare(
  "SELECT * FROM technicians WHERE id = ?"
).bind("tech-001").first();

// 3. Send assignment notification
await sendTemplatedMessage(context, {
  job_id: job.id,
  template_key: "technician_assigned",
  type: "whatsapp",
  recipient: job.customer_phone,
  language: "es",
  variables: {
    customer_name: job.customer_name,
    technician_name: `${tech.first_name} ${tech.last_name}`,
    technician_phone: tech.phone,
    scheduled_date: "1 de diciembre",
    scheduled_time: "2:00 PM",
    tracking_url: `https://your-domain.com/job/${job.job_code}`,
  },
});
```

### Processing Payment

```typescript
// 1. Complete job and request payment
await updateJob(context, job.id, {
  status: "completed",
  total_amount: 175.00,
  payment_status: "unpaid",
}, "tech-001", "technician");

// 2. Send completion message with payment link
await sendTemplatedMessage(context, {
  job_id: job.id,
  template_key: "job_completed",
  type: "sms",
  recipient: job.customer_phone,
  language: "es",
  variables: {
    customer_name: job.customer_name,
    service_type: job.service_type,
    completed_at: "1 de diciembre, 3:45 PM",
    total_amount: "175.00",
    payment_url: `https://your-domain.com/api/payment/${job.job_code}/ath-movil`,
    tracking_url: `https://your-domain.com/job/${job.job_code}`,
  },
});

// 3. Customer clicks payment link → redirects to ATH Móvil
// 4. ATH Móvil webhook confirms payment
// 5. System auto-sends payment confirmation
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Can create jobs with unique codes
- [ ] Customer portal loads at /job/:code
- [ ] Dispatch dashboard accessible at /dispatch
- [ ] Can assign technicians to jobs
- [ ] Job status updates work
- [ ] ATH Móvil payment link generates
- [ ] Webhook handler processes test data
- [ ] SMS sends successfully (if Twilio configured)
- [ ] WhatsApp messages work (if configured)
- [ ] Bilingual templates render correctly
- [ ] Payment statistics calculate correctly

## Future Enhancements

### Phase 2 (Future)
- [ ] Real-time GPS tracking for technicians
- [ ] Automated route optimization
- [ ] Customer ratings and reviews
- [ ] Recurring service scheduling
- [ ] Parts inventory management
- [ ] Invoice generation (PDF)
- [ ] Mobile app for technicians
- [ ] AI-powered scheduling
- [ ] Predictive maintenance alerts
- [ ] Multi-language support (beyond EN/ES)

### Integration Opportunities
- [ ] QuickBooks integration
- [ ] Google Maps API for routing
- [ ] Stripe for US credit card payments
- [ ] Calendly for scheduling
- [ ] Zapier for workflow automation

## Support & Documentation

- **Implementation**: EPIC-004 in GitHub project
- **Database Schema**: `migrations/006_serviceos.sql`
- **Type Definitions**: `app/lib/serviceos-types.ts`
- **API Documentation**: This file

## Notes

- All monetary amounts are in USD
- Phone numbers should be in E.164 format (+1-787-XXX-XXXX)
- Job codes are uppercase, 6 characters, no ambiguous characters (I, O, 0, 1)
- Default language for Puerto Rico is Spanish ("es")
- ATH Móvil is the primary payment method in PR (95%+ adoption)
- Twilio credentials are optional (system works without notifications)
- All dates/times are in ISO 8601 format
- Customer portal is public (no authentication required)
- Dispatch dashboard should require authentication (TODO)

## Troubleshooting

### Payment Links Not Working
- Verify ATH Móvil credentials in environment
- Check webhook URL is publicly accessible
- Review payment table for pending transactions

### SMS Not Sending
- Confirm Twilio credentials are correct
- Verify phone number format (+1-787-XXX-XXXX)
- Check Twilio account balance
- Review job_communications table for errors

### Job Creation Fails
- Verify all required fields are provided
- Check tenant_id exists in tenants table
- Review database constraints in migration

### Dispatch Dashboard Empty
- Confirm jobs exist for today's date
- Check technicians are marked as "active"
- Verify tenant_id matches current tenant
