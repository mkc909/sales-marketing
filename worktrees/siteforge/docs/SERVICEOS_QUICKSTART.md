# ServiceOS Quick Start Guide

Get ServiceOS running in 15 minutes.

## Prerequisites

- Cloudflare Workers account
- D1 database created
- Node.js 18+ installed
- Wrangler CLI configured

## Step 1: Run Migration (2 minutes)

```bash
cd worktrees/siteforge

# Apply ServiceOS schema
wrangler d1 execute estateflow-db --file=migrations/006_serviceos.sql

# Verify
wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM jobs"
# Should return 0
```

## Step 2: Create Test Technician (1 minute)

```bash
wrangler d1 execute estateflow-db --command="
INSERT INTO technicians (
  id, tenant_id, first_name, last_name, phone, status,
  specializations, languages, created_at, updated_at
) VALUES (
  'tech-demo-001',
  1,
  'Carlos',
  'Rivera',
  '+1-787-555-0200',
  'active',
  '[\"plumbing\", \"hvac\"]',
  '[\"es\", \"en\"]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)"
```

## Step 3: Test Job Creation (5 minutes)

Create `test-job.js`:

```javascript
// test-job.js
import { createJob } from './app/lib/job-tracking';

const testJob = {
  tenant_id: 1,
  customer_name: "María González",
  customer_phone: "+1-787-555-0100",
  customer_address: "123 Calle Principal",
  customer_city: "San Juan",
  customer_state: "PR",
  customer_zip: "00901",
  service_type: "Plumbing Repair",
  service_description: "Kitchen sink leak",
  priority: "high",
  scheduled_date: new Date().toISOString().split('T')[0],
  scheduled_time_start: "14:00",
  scheduled_time_end: "16:00",
  estimated_duration_minutes: 90,
};

console.log("Test job data:", testJob);
```

Or create directly via SQL:

```bash
wrangler d1 execute estateflow-db --command="
INSERT INTO jobs (
  id, job_code, tenant_id, customer_name, customer_phone,
  customer_address, customer_city, customer_state, customer_zip,
  service_type, priority, status, created_at, updated_at
) VALUES (
  'job-test-001',
  'TEST01',
  1,
  'María González',
  '+1-787-555-0100',
  '123 Calle Principal',
  'San Juan',
  'PR',
  '00901',
  'Plumbing Repair',
  'high',
  'pending',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)"
```

## Step 4: Start Development Server (2 minutes)

```bash
npm run dev
```

## Step 5: Test Features (5 minutes)

### Customer Portal
```
http://localhost:5173/job/TEST01
```

**Expected**: Job details page with:
- Job code: TEST01
- Customer name
- Service type
- Status badge
- Timeline

### Dispatch Dashboard
```
http://localhost:5173/dispatch
```

**Expected**: Dashboard showing:
- Job statistics
- Kanban board with test job in "Pending" column
- Technician list with Carlos Rivera

### Assign Technician
1. In dispatch dashboard, find TEST01 job
2. Click "Assign technician" dropdown
3. Select "Carlos Rivera"
4. Job should move to "Assigned" column

## Optional: Configure Communications

### Twilio SMS (5 minutes)

```bash
# Set secrets
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
```

Test SMS:

```javascript
import { sendMessage } from './app/lib/communications';

await sendMessage(context, {
  job_id: 'job-test-001',
  type: 'sms',
  recipient: '+1-787-555-0100',
  message: 'Test message from ServiceOS',
});
```

## Verify Everything Works

### Checklist

- [x] Migration completed
- [x] Test technician created
- [x] Test job created
- [x] Customer portal loads
- [x] Dispatch dashboard loads
- [x] Can assign technician
- [x] Status updates work

## Common Issues

### "Table not found"
```bash
# Re-run migration
wrangler d1 execute estateflow-db --file=migrations/006_serviceos.sql
```

### "Tenant not found"
```bash
# Make sure you have a tenant with id=1
wrangler d1 execute estateflow-db --command="SELECT * FROM tenants WHERE id = 1"
```

### Customer portal shows 404
- Check job_code is correct (case-sensitive)
- Verify job exists in database
- Check route is `/job/:code` not `/jobs/:code`

## Next Steps

1. **Read Full Documentation**: `docs/SERVICEOS_IMPLEMENTATION.md`
2. **Setup ATH Móvil**: For payment testing
3. **Configure Twilio**: For SMS/WhatsApp
4. **Create Real Technicians**: Add your team
5. **Customize Templates**: Update message templates
6. **Add Authentication**: Protect dispatch dashboard

## Production Deployment

```bash
# Build
npm run build

# Deploy
wrangler pages deploy ./build/client

# Run migration on production D1
wrangler d1 execute estateflow-db --env production --file=migrations/006_serviceos.sql
```

## Quick Reference

**Job Codes**: 6 uppercase characters (ABC123)

**Phone Format**: E.164 (+1-787-XXX-XXXX)

**Date Format**: ISO 8601 (YYYY-MM-DD)

**Time Format**: HH:MM (24-hour)

**Currency**: USD

**Default Language**: Spanish (es) for PR

## Getting Help

- Implementation Guide: `docs/SERVICEOS_IMPLEMENTATION.md`
- Database Schema: `migrations/006_serviceos.sql`
- Type Definitions: `app/lib/serviceos-types.ts`
- GitHub Issues: Tag with `serviceos`

## Success! 🎉

You now have a working ServiceOS installation. Start creating jobs, assigning technicians, and tracking payments!
