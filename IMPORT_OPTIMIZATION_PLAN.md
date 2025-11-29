# 📈 Import Optimization Plan for 500k+ Records

## Current Performance Analysis

### ✅ Database Performance: EXCEPTIONAL
- **Query Speed**: 0.82ms average (122x faster than requirement)
- **All Tests Passed**: 7/7 query tests successful
- **Production Ready**: Database can handle millions of records

### ❌ Import Performance: NEEDS OPTIMIZATION
- **Current Speed**: 9.04 records/second
- **Target Speed**: 100+ records/second
- **500k Import Time**: ~15.4 hours (current) vs 1.4 hours (target)

## 🔧 Optimization Strategy

### 1. Increase Batch Size (Quick Win)
```javascript
// Current configuration
const BATCH_SIZE = 1000;  // Too conservative

// Optimized configuration
const BATCH_SIZE = 10000;  // 10x larger batches
const DELAY_MS = 100;      // Reduce delay between batches
```

### 2. Use Bulk Insert with Prepared Statements
```javascript
// Instead of individual INSERTs, use bulk operations
const sql = `
  INSERT INTO agents (id, slug, name, license_number, email, phone,
                      industry, state, city, subscription_tier,
                      created_at, updated_at)
  SELECT * FROM json_each(?)
`;
```

### 3. Disable Autocommit During Import
```javascript
// Wrap large imports in transaction
await db.run('BEGIN TRANSACTION');
// ... perform all inserts ...
await db.run('COMMIT');
```

### 4. Parallel Processing with Workers
```javascript
// Use multiple workers for different data chunks
const WORKER_COUNT = 4;
const chunkSize = Math.ceil(totalRecords / WORKER_COUNT);

const workers = [];
for (let i = 0; i < WORKER_COUNT; i++) {
  workers.push(
    importChunk(data.slice(i * chunkSize, (i + 1) * chunkSize))
  );
}
await Promise.all(workers);
```

### 5. Direct D1 API Instead of Wrangler CLI
```javascript
// Use the D1 API directly to avoid CLI overhead
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sql: insertQuery,
    params: values
  })
});
```

## 📊 Expected Results After Optimization

| Optimization | Expected Speed | 500k Import Time |
|--------------|---------------|------------------|
| Current | 9 rec/sec | 15.4 hours |
| Batch Size 10k | 45 rec/sec | 3.1 hours |
| + Transactions | 75 rec/sec | 1.9 hours |
| + Direct API | 100 rec/sec | 1.4 hours |
| + Parallel Workers | 150+ rec/sec | < 1 hour |

## 🚀 Implementation Plan

### Phase 1: Quick Optimizations (30 minutes)
1. Increase batch size to 10,000
2. Reduce delay to 100ms
3. Test with 10k records

### Phase 2: Transaction Optimization (1 hour)
1. Implement transaction wrapping
2. Disable autocommit during bulk inserts
3. Test with 50k records

### Phase 3: API Integration (2 hours)
1. Switch from Wrangler CLI to D1 API
2. Implement proper error handling
3. Test with 100k records

### Phase 4: Parallel Processing (3 hours)
1. Implement worker pool
2. Add progress tracking
3. Full test with 500k records

## 📝 Optimized Import Script

Create `scripts/import-optimized.js`:

```javascript
import { D1Client } from '@cloudflare/d1-client';

class OptimizedImporter {
  constructor(config) {
    this.client = new D1Client(config);
    this.BATCH_SIZE = 10000;
    this.WORKER_COUNT = 4;
  }

  async import(csvFile) {
    console.log('🚀 Starting optimized import...');

    const data = await this.parseCSV(csvFile);
    const chunks = this.splitIntoChunks(data, this.WORKER_COUNT);

    // Process chunks in parallel
    const workers = chunks.map(chunk =>
      this.processChunk(chunk)
    );

    const results = await Promise.all(workers);

    // Aggregate results
    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    const totalTime = results.reduce((max, r) => Math.max(max, r.time), 0);

    const rate = totalImported / (totalTime / 1000);
    console.log(`✅ Imported ${totalImported} records at ${rate.toFixed(2)} records/second`);

    return { totalImported, rate };
  }

  async processChunk(records) {
    const startTime = Date.now();
    let imported = 0;

    // Start transaction
    await this.client.execute('BEGIN TRANSACTION');

    try {
      // Process in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);

        // Build bulk insert
        const values = batch.map(r => `(${this.formatRecord(r)})`).join(',');
        const sql = `
          INSERT INTO agents (
            id, slug, name, license_number, email, phone,
            industry, state, city, subscription_tier,
            created_at, updated_at
          ) VALUES ${values}
        `;

        await this.client.execute(sql);
        imported += batch.length;

        // Progress update
        if (imported % 10000 === 0) {
          console.log(`  Worker ${this.workerId}: ${imported} records imported`);
        }
      }

      // Commit transaction
      await this.client.execute('COMMIT');

    } catch (error) {
      await this.client.execute('ROLLBACK');
      throw error;
    }

    const time = Date.now() - startTime;
    return { imported, time };
  }

  formatRecord(record) {
    // Format record for SQL insert
    const slug = this.generateSlug(record.name);
    return `
      '${record.id}',
      '${slug}',
      '${record.name.replace(/'/g, "''")}',
      '${record.license_number}',
      '${record.email}',
      '${record.phone}',
      '${record.industry}',
      '${record.state}',
      '${record.city}',
      'ghost',
      datetime('now'),
      datetime('now')
    `;
  }

  generateSlug(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// Usage
const importer = new OptimizedImporter({
  accountId: process.env.CF_ACCOUNT_ID,
  databaseId: process.env.D1_DATABASE_ID,
  apiToken: process.env.CF_API_TOKEN
});

await importer.import('florida-agents.csv');
```

## ⏱️ Timeline for 500k Import

### With Optimizations
1. **Phase 1 (Batch 10k)**: 3.1 hours
2. **Phase 2 (+ Transactions)**: 1.9 hours
3. **Phase 3 (+ Direct API)**: 1.4 hours
4. **Phase 4 (+ Parallel)**: < 1 hour ✅

### Recommendation
Implement at least Phase 1-2 optimizations before production import to achieve sub-2-hour import time.

## ✅ Success Criteria
- Import rate > 100 records/second
- 500k records imported in < 2 hours
- Zero data corruption
- Progress tracking and resumability
- Automatic rollback on failure

## 🎯 Next Steps
1. Implement Phase 1 optimizations (30 min)
2. Test with 50k record sample
3. If successful, proceed with full 500k import
4. Monitor and adjust as needed

---

**Note**: The database performance is exceptional. Only the import process needs optimization, which is a one-time operation.