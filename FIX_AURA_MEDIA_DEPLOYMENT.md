# 🔥 CRITICAL FIX: Deploy to Aura Media Studios Account

## Problem Identified
Workers were deployed to wrong account (`magicmike`) instead of **Aura Media Studios**.

## ✅ Fix Applied
1. **Account ID already correct** in wrangler.toml files: `af57e902fd9dcaad7484a7195ac0f536`
2. **Database name fixed**: Changed from `estateflow-db` to `progeodata-db`
3. **Redeployment script created**: `REDEPLOY_TO_AURA_MEDIA.bat`

## 🚀 IMMEDIATE ACTION REQUIRED

### Run this command NOW:

```bash
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing
.\REDEPLOY_TO_AURA_MEDIA.bat
```

This will:
1. Create `progeodata-db` in Aura Media Studios account
2. Apply migrations
3. Create queues in correct account
4. Create KV namespace in correct account
5. Deploy both workers to Aura Media Studios

## 📝 Manual Steps if Script Fails

### 1. Create D1 Database
```bash
npx wrangler d1 create progeodata-db --account-id af57e902fd9dcaad7484a7195ac0f536
```
**Copy the database_id from output!**

### 2. Update Database IDs in Workers
Edit both files and replace `your-database-id-here`:
- `workers\progeodata-queue-seed\wrangler.toml`
- `workers\progeodata-queue-consumer\wrangler.toml`

### 3. Apply Migration
```bash
cd worktrees\siteforge
npx wrangler d1 execute progeodata-db --file=migrations\010_queue_tables.sql --account-id af57e902fd9dcaad7484a7195ac0f536
```

### 4. Create Queues
```bash
npx wrangler queues create progeodata-scrape-queue --account-id af57e902fd9dcaad7484a7195ac0f536
npx wrangler queues create progeodata-scrape-dlq --account-id af57e902fd9dcaad7484a7195ac0f536
```

### 5. Create KV Namespace
```bash
npx wrangler kv:namespace create PROGEODATA_RATE_LIMITS --account-id af57e902fd9dcaad7484a7195ac0f536
```
**Copy the namespace ID and update wrangler.toml files!**

### 6. Deploy Seed Worker
```bash
cd workers\progeodata-queue-seed
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
```

### 7. Deploy Consumer Worker
```bash
cd workers\progeodata-queue-consumer
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
```

## ✅ Verification

After deployment, the URLs should be:
- ✅ `https://progeodata-queue-seed.auramediastudios.workers.dev`
- ✅ `https://progeodata-queue-consumer.auramediastudios.workers.dev`

**NOT:**
- ❌ `https://progeodata-queue-seed.magicmike.workers.dev`
- ❌ `https://progeodata-queue-consumer.magicmike.workers.dev`

## 🧪 Test Correct Deployment

```bash
# Test seed worker health
curl https://progeodata-queue-seed.auramediastudios.workers.dev/health

# Trigger test seed
curl -X POST https://progeodata-queue-seed.auramediastudios.workers.dev/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"test\"}"

# Check database (in Aura Media Studios)
npx wrangler d1 execute progeodata-db --command="SELECT * FROM queue_health" --account-id af57e902fd9dcaad7484a7195ac0f536
```

## 📊 Expected Results

1. Workers respond on `*.auramediastudios.workers.dev`
2. Database created in Aura Media Studios account
3. Queues visible in Aura Media Studios dashboard
4. Test seed queues 20 ZIP codes including Vashon Island (98070)

## 🔴 IMPORTANT NOTES

1. **Account ID is CORRECT**: `af57e902fd9dcaad7484a7195ac0f536`
2. **Database name FIXED**: Now using `progeodata-db`
3. **Both workers configured**: Ready for Aura Media Studios deployment
4. **Washington state included**: With Vashon Island (98070) as first ZIP

---

**ACTION**: Run `.\REDEPLOY_TO_AURA_MEDIA.bat` immediately to fix deployment!