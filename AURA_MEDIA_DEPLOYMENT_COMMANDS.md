# 🚨 URGENT: Deploy ProGeoData to Aura Media Studios Account

## ✅ COPY AND PASTE THESE COMMANDS IN YOUR TERMINAL

Open a terminal where `npm` and `npx` work, then run these commands:

### 1️⃣ Navigate to project
```bash
cd C:\dev\GITHUB_MKC909_REPOS\sales-marketing
```

### 2️⃣ Create D1 Database in Aura Media Studios
```bash
npx wrangler d1 create progeodata-db --account-id af57e902fd9dcaad7484a7195ac0f536
```
**IMPORTANT**: Copy the `database_id` from the output! You'll need it.

### 3️⃣ Update database_id in both workers

Replace `your-database-id-here` with the actual ID in these files:
- `workers\progeodata-queue-seed\wrangler.toml`
- `workers\progeodata-queue-consumer\wrangler.toml`

### 4️⃣ Apply Migration
```bash
cd worktrees\siteforge
npx wrangler d1 execute progeodata-db --file=migrations\010_queue_tables.sql --account-id af57e902fd9dcaad7484a7195ac0f536
cd ..\..
```

### 5️⃣ Create Queues
```bash
npx wrangler queues create progeodata-scrape-queue --account-id af57e902fd9dcaad7484a7195ac0f536
npx wrangler queues create progeodata-scrape-dlq --account-id af57e902fd9dcaad7484a7195ac0f536
```

### 6️⃣ Create KV Namespace
```bash
npx wrangler kv:namespace create PROGEODATA_RATE_LIMITS --account-id af57e902fd9dcaad7484a7195ac0f536
```
**IMPORTANT**: Copy the namespace `id` and update it in both wrangler.toml files!

### 7️⃣ Deploy Seed Worker
```bash
cd workers\progeodata-queue-seed
npm install
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
cd ..\..
```

### 8️⃣ Deploy Consumer Worker
```bash
cd workers\progeodata-queue-consumer
npm install
npx wrangler deploy --account-id af57e902fd9dcaad7484a7195ac0f536
cd ..\..
```

## ✅ VERIFICATION

The workers should now be at:
- ✅ `https://progeodata-queue-seed.auramediastudios.workers.dev`
- ✅ `https://progeodata-queue-consumer.auramediastudios.workers.dev`

## 🧪 TEST WITH VASHON ISLAND

```bash
curl -X POST https://progeodata-queue-seed.auramediastudios.workers.dev/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"test\"}"
```

## 📊 CHECK DATABASE

```bash
npx wrangler d1 execute progeodata-db --command="SELECT * FROM queue_health" --account-id af57e902fd9dcaad7484a7195ac0f536
```

---

**ACCOUNT ID**: `af57e902fd9dcaad7484a7195ac0f536` (Aura Media Studios)
**DATABASE**: `progeodata-db`
**VASHON ISLAND ZIP**: `98070` (included!)