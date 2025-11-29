# 📊 Data Import Testing Guide

**IMPORTANT**: Test with small datasets first! This guide ensures safe, progressive data import with verification at each stage.

## 🎯 Testing Philosophy

**Progressive Scale Testing:**
1. **Test Import**: 10 records → Verify everything works
2. **Small Batch**: 100 records → Check performance
3. **Medium Batch**: 1,000 records → Monitor resources
4. **Large Batch**: 10,000 records → Validate at scale
5. **Full Import**: 500,000+ records → Production import

**Never skip stages!** Each stage validates different aspects of the system.

## 📋 Pre-Import Checklist

### System Requirements
- [ ] D1 database created and migrations run
- [ ] KV namespaces created
- [ ] R2 buckets created
- [ ] Worker deployed successfully
- [ ] Wrangler tail running for monitoring
- [ ] Backup of empty database schema

### Resource Limits Check
```bash
# Check D1 limits
wrangler d1 info estateflow-db
# Free tier: 500MB storage, 5M rows read/day, 100k rows written/day

# Check KV limits
# Free tier: 100k reads/day, 1k writes/day

# Check R2 limits
# Free tier: 10GB storage, 10M Class A operations
```

## 🧪 Stage 1: Test Import (10 Records)

### Create Test Data File
Create `test-data-10.csv`:
```csv
id,name,license_number,email,phone,industry,state,city
1,"John Smith","RE123456","john@example.com","555-0001","real_estate","FL","Miami"
2,"Jane Doe","RE123457","jane@example.com","555-0002","real_estate","FL","Orlando"
3,"Bob Johnson","LAW98765","bob@example.com","555-0003","legal","FL","Tampa"
4,"Alice Brown","INS45678","alice@example.com","555-0004","insurance","FL","Jacksonville"
5,"Charlie Wilson","MTG34567","charlie@example.com","555-0005","mortgage","FL","Miami"
6,"Diana Martinez","FIN23456","diana@example.com","555-0006","financial","FL","Orlando"
7,"Eric Garcia","CON12345","eric@example.com","555-0007","contractor","FL","Tampa"
8,"Frank Lopez","RE123458","frank@example.com","555-0008","real_estate","TX","Houston"
9,"Grace Kim","LAW98766","grace@example.com","555-0009","legal","TX","Dallas"
10,"Henry Chen","INS45679","henry@example.com","555-0010","insurance","TX","Austin"
```

### Import Script
Create `worktrees/siteforge/scripts/import-test.js`:
```javascript
// Test Import Script - Start with 10 records
const fs = require('fs');
const csv = require('csv-parse/sync');

const WRANGLER_DB = 'estateflow-db';
const BATCH_SIZE = 10;

async function importTestData(filename) {
  console.log('🧪 Starting TEST import with 10 records...\n');

  try {
    // Read and parse CSV
    const data = fs.readFileSync(filename, 'utf-8');
    const records = csv.parse(data, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`📊 Found ${records.length} records in ${filename}`);

    // Validate data
    console.log('\n✅ Validating data...');
    for (const record of records) {
      if (!record.license_number || !record.email) {
        throw new Error(`Invalid record: ${JSON.stringify(record)}`);
      }
    }
    console.log('Data validation passed!');

    // Generate SQL
    const values = records.map(r =>
      `('${r.id}', '${r.name}', '${r.license_number}', '${r.email}',
        '${r.phone}', '${r.industry}', '${r.state}', '${r.city}',
        'ghost', datetime('now'), datetime('now'))`
    ).join(',\n');

    const sql = `
      INSERT INTO professionals (
        id, name, license_number, email, phone,
        industry, state, city, subscription_tier,
        created_at, updated_at
      ) VALUES ${values};
    `;

    // Write SQL to file for inspection
    fs.writeFileSync('test-import.sql', sql);
    console.log('\n📝 SQL written to test-import.sql for review');

    // Execute import
    console.log('\n🚀 Executing import...');
    const { execSync } = require('child_process');

    const result = execSync(
      `wrangler d1 execute ${WRANGLER_DB} --file=test-import.sql`,
      { encoding: 'utf-8' }
    );

    console.log('Import result:', result);

    // Verify import
    console.log('\n🔍 Verifying import...');
    const verifyResult = execSync(
      `wrangler d1 execute ${WRANGLER_DB} --command="SELECT COUNT(*) as count, industry FROM professionals GROUP BY industry;"`,
      { encoding: 'utf-8' }
    );

    console.log('Database contents:', verifyResult);

    console.log('\n✅ TEST IMPORT SUCCESSFUL!');
    console.log('Next step: Run import-test-100.js for 100 records');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if D1 database exists: wrangler d1 list');
    console.log('2. Check if migrations were run');
    console.log('3. Review test-import.sql for syntax errors');
    console.log('4. Check wrangler tail for detailed errors');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const filename = process.argv[2] || 'test-data-10.csv';
  importTestData(filename);
}

module.exports = { importTestData };
```

### Verification Script
Create `worktrees/siteforge/scripts/verify-import.js`:
```javascript
// Verification Script - Check data integrity
const { execSync } = require('child_process');

const WRANGLER_DB = 'estateflow-db';

function verifyImport() {
  console.log('🔍 Verifying Data Import...\n');

  const checks = [
    {
      name: 'Total record count',
      query: 'SELECT COUNT(*) as count FROM professionals;'
    },
    {
      name: 'Records by industry',
      query: 'SELECT industry, COUNT(*) as count FROM professionals GROUP BY industry;'
    },
    {
      name: 'Records by state',
      query: 'SELECT state, COUNT(*) as count FROM professionals GROUP BY state;'
    },
    {
      name: 'Check for duplicates',
      query: 'SELECT license_number, COUNT(*) as count FROM professionals GROUP BY license_number HAVING count > 1;'
    },
    {
      name: 'Verify email format',
      query: "SELECT COUNT(*) as invalid FROM professionals WHERE email NOT LIKE '%@%.%';"
    },
    {
      name: 'Check subscription tiers',
      query: 'SELECT subscription_tier, COUNT(*) as count FROM professionals GROUP BY subscription_tier;'
    },
    {
      name: 'Recent imports (last 10)',
      query: 'SELECT id, name, industry, created_at FROM professionals ORDER BY created_at DESC LIMIT 10;'
    }
  ];

  for (const check of checks) {
    console.log(`\n📊 ${check.name}:`);
    console.log('─'.repeat(50));

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --command="${check.query}"`,
        { encoding: 'utf-8' }
      );
      console.log(result);
    } catch (error) {
      console.error(`❌ Check failed: ${error.message}`);
    }
  }

  console.log('\n✅ Verification complete!');
}

// Performance check
function checkPerformance() {
  console.log('\n⚡ Performance Check...\n');

  const queries = [
    {
      name: 'Simple SELECT',
      query: 'SELECT * FROM professionals LIMIT 1;'
    },
    {
      name: 'Complex JOIN (if applicable)',
      query: 'SELECT p.*, COUNT(l.id) as lead_count FROM professionals p LEFT JOIN leads l ON p.id = l.professional_id GROUP BY p.id LIMIT 10;'
    },
    {
      name: 'Full table scan',
      query: 'SELECT COUNT(*) FROM professionals;'
    }
  ];

  for (const query of queries) {
    console.log(`Testing: ${query.name}`);
    const start = Date.now();

    try {
      execSync(
        `wrangler d1 execute ${WRANGLER_DB} --command="${query.query}"`,
        { encoding: 'utf-8', stdio: 'ignore' }
      );
      const duration = Date.now() - start;
      console.log(`✅ Completed in ${duration}ms`);

      if (duration > 1000) {
        console.log('⚠️  Warning: Query took over 1 second!');
      }
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }
}

// Run verification
if (require.main === module) {
  verifyImport();
  checkPerformance();
}

module.exports = { verifyImport, checkPerformance };
```

## 🚦 Stage 2: Small Batch (100 Records)

### Generate Test Data
Create `worktrees/siteforge/scripts/generate-test-data.js`:
```javascript
// Generate larger test datasets
const fs = require('fs');
const faker = require('@faker-js/faker').faker;

const industries = ['real_estate', 'legal', 'insurance', 'mortgage', 'financial', 'contractor'];
const states = ['FL', 'TX', 'CA', 'NY', 'IL'];
const tiers = ['ghost', 'ghost', 'ghost', 'free', 'professional', 'enterprise'];

function generateRecords(count) {
  const records = [];

  for (let i = 1; i <= count; i++) {
    const industry = industries[Math.floor(Math.random() * industries.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];

    const prefix = {
      real_estate: 'RE',
      legal: 'LAW',
      insurance: 'INS',
      mortgage: 'MTG',
      financial: 'FIN',
      contractor: 'CON'
    }[industry];

    records.push({
      id: i,
      name: faker.person.fullName(),
      license_number: `${prefix}${faker.number.int({ min: 100000, max: 999999 })}`,
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number('###-###-####'),
      industry: industry,
      state: state,
      city: faker.location.city(),
      address: faker.location.streetAddress(),
      zip: faker.location.zipCode('#####'),
      subscription_tier: tier,
      website: tier !== 'ghost' ? faker.internet.url() : null,
      bio: tier !== 'ghost' ? faker.lorem.paragraph() : null
    });
  }

  return records;
}

function saveAsCSV(records, filename) {
  const headers = Object.keys(records[0]).join(',');
  const rows = records.map(r =>
    Object.values(r).map(v =>
      v === null ? '' : `"${String(v).replace(/"/g, '""')}"`
    ).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  fs.writeFileSync(filename, csv);
  console.log(`✅ Generated ${records.length} records in ${filename}`);
}

// Generate datasets
if (require.main === module) {
  console.log('🎲 Generating test datasets...\n');

  // Small batch
  saveAsCSV(generateRecords(100), 'test-data-100.csv');

  // Medium batch
  saveAsCSV(generateRecords(1000), 'test-data-1000.csv');

  // Large batch
  saveAsCSV(generateRecords(10000), 'test-data-10000.csv');

  console.log('\n📊 Test datasets ready!');
  console.log('Start with: npm run import:test test-data-100.csv');
}

module.exports = { generateRecords, saveAsCSV };
```

## 🏭 Stage 3: Progressive Import (Batched)

### Batched Import Script
Create `worktrees/siteforge/scripts/import-progressive.js`:
```javascript
// Progressive Import with Batching and Progress Tracking
const fs = require('fs');
const csv = require('csv-parse/sync');
const { execSync } = require('child_process');

const WRANGLER_DB = 'estateflow-db';
const BATCH_SIZE = 1000; // D1 optimal batch size
const PROGRESS_FILE = 'import-progress.json';

class ProgressiveImporter {
  constructor() {
    this.progress = this.loadProgress();
    this.stats = {
      totalRecords: 0,
      imported: 0,
      failed: 0,
      duplicates: 0,
      startTime: Date.now()
    };
  }

  loadProgress() {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch {
      return { lastBatch: 0, imported: [] };
    }
  }

  saveProgress() {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
  }

  async importFile(filename, options = {}) {
    console.log('🚀 Starting Progressive Import');
    console.log(`📁 File: ${filename}`);
    console.log(`📦 Batch size: ${BATCH_SIZE}`);
    console.log(`🔄 Resume from batch: ${this.progress.lastBatch}\n`);

    // Read and parse CSV
    const data = fs.readFileSync(filename, 'utf-8');
    const records = csv.parse(data, {
      columns: true,
      skip_empty_lines: true
    });

    this.stats.totalRecords = records.length;
    console.log(`📊 Total records to import: ${this.stats.totalRecords}`);

    // Check if we should continue
    if (!options.force && this.stats.totalRecords > 10000) {
      console.log('\n⚠️  WARNING: Large dataset detected!');
      console.log('This will import more than 10,000 records.');
      console.log('Use --force to proceed or test with smaller dataset first.');

      if (!options.skipPrompt) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question('Continue? (y/N): ', resolve);
        });
        readline.close();

        if (answer.toLowerCase() !== 'y') {
          console.log('Import cancelled.');
          return;
        }
      }
    }

    // Process in batches
    const batches = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📦 Processing ${batches.length} batches...`);

    for (let i = this.progress.lastBatch; i < batches.length; i++) {
      await this.importBatch(batches[i], i + 1, batches.length);

      // Update progress
      this.progress.lastBatch = i + 1;
      this.saveProgress();

      // Rate limiting - prevent overwhelming D1
      if (i < batches.length - 1) {
        await this.sleep(500); // 500ms between batches
      }
    }

    // Final report
    this.printReport();
  }

  async importBatch(records, batchNum, totalBatches) {
    const progress = Math.round((batchNum / totalBatches) * 100);
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${progress}%)`);

    try {
      // Generate SQL with conflict handling
      const values = records.map(r => {
        const email = r.email.toLowerCase().replace(/'/g, "''");
        const name = r.name.replace(/'/g, "''");
        const license = r.license_number.replace(/'/g, "''");

        return `('${this.generateId()}', '${name}', '${license}', '${email}',
          '${r.phone || ''}', '${r.industry}', '${r.state}', '${r.city || ''}',
          'ghost', datetime('now'), datetime('now'))`;
      }).join(',\n');

      const sql = `
        INSERT OR IGNORE INTO professionals (
          id, name, license_number, email, phone,
          industry, state, city, subscription_tier,
          created_at, updated_at
        ) VALUES ${values};
      `;

      // Write SQL for debugging
      fs.writeFileSync(`batch-${batchNum}.sql`, sql);

      // Execute import
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --file=batch-${batchNum}.sql`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      // Parse result
      const imported = records.length; // Approximate
      this.stats.imported += imported;

      console.log(`✅ Imported ${imported} records`);

      // Clean up SQL file
      fs.unlinkSync(`batch-${batchNum}.sql`);

    } catch (error) {
      console.error(`❌ Batch ${batchNum} failed:`, error.message);
      this.stats.failed += records.length;

      // Save failed batch for retry
      fs.writeFileSync(
        `failed-batch-${batchNum}.json`,
        JSON.stringify(records, null, 2)
      );
    }
  }

  generateId() {
    return `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printReport() {
    const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
    const rate = Math.round(this.stats.imported / duration);

    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total Records: ${this.stats.totalRecords}`);
    console.log(`Imported: ${this.stats.imported}`);
    console.log(`Failed: ${this.stats.failed}`);
    console.log(`Duration: ${duration} seconds`);
    console.log(`Rate: ${rate} records/second`);
    console.log('='.repeat(50));

    // Cleanup progress file on success
    if (this.stats.failed === 0) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('\n✅ Import successful! Progress file cleaned up.');
    } else {
      console.log('\n⚠️  Some records failed. Check failed-batch-*.json files');
    }
  }
}

// CLI
if (require.main === module) {
  const filename = process.argv[2];
  const options = {
    force: process.argv.includes('--force'),
    skipPrompt: process.argv.includes('--skip-prompt')
  };

  if (!filename) {
    console.log('Usage: node import-progressive.js <filename> [--force] [--skip-prompt]');
    process.exit(1);
  }

  const importer = new ProgressiveImporter();
  importer.importFile(filename, options);
}

module.exports = ProgressiveImporter;
```

## 🔧 Rollback Procedures

### Rollback Script
Create `worktrees/siteforge/scripts/rollback-import.js`:
```javascript
// Rollback Failed Imports
const { execSync } = require('child_process');
const fs = require('fs');

const WRANGLER_DB = 'estateflow-db';

class ImportRollback {
  constructor() {
    this.backupFile = 'db-backup-before-import.sql';
  }

  // Create backup before import
  async createBackup() {
    console.log('💾 Creating database backup...');

    try {
      // Export current data
      const tables = ['professionals', 'pins', 'leads', 'error_logs'];
      const backup = [];

      for (const table of tables) {
        const result = execSync(
          `wrangler d1 execute ${WRANGLER_DB} --command="SELECT * FROM ${table};"`,
          { encoding: 'utf-8' }
        );

        backup.push({
          table: table,
          data: result
        });
      }

      fs.writeFileSync(this.backupFile, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup saved to ${this.backupFile}`);

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  // Rollback to specific timestamp
  async rollbackToTimestamp(timestamp) {
    console.log(`⏪ Rolling back imports after ${timestamp}...`);

    const sql = `
      DELETE FROM professionals
      WHERE created_at > '${timestamp}';
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --command="${sql}"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ Rollback complete:', result);

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  // Remove test data
  async cleanTestData() {
    console.log('🧹 Cleaning test data...');

    const sql = `
      DELETE FROM professionals
      WHERE email LIKE '%example.com%'
         OR email LIKE '%test%'
         OR name LIKE 'Test%';
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --command="${sql}"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ Test data cleaned:', result);

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  // Full reset
  async fullReset() {
    console.log('🔄 FULL DATABASE RESET');
    console.log('⚠️  This will DELETE ALL DATA!');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('Type "RESET" to confirm: ', resolve);
    });
    readline.close();

    if (answer !== 'RESET') {
      console.log('Reset cancelled.');
      return;
    }

    console.log('Resetting database...');

    try {
      // Truncate all tables
      const tables = ['professionals', 'pins', 'leads', 'error_logs'];

      for (const table of tables) {
        const sql = `DELETE FROM ${table};`;
        execSync(
          `wrangler d1 execute ${WRANGLER_DB} --command="${sql}"`,
          { encoding: 'utf-8' }
        );
        console.log(`✅ Cleared table: ${table}`);
      }

      console.log('\n✅ Database reset complete!');

    } catch (error) {
      console.error('❌ Reset failed:', error.message);
    }
  }
}

// CLI
if (require.main === module) {
  const rollback = new ImportRollback();
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      rollback.createBackup();
      break;
    case 'rollback':
      const timestamp = process.argv[3] || new Date(Date.now() - 3600000).toISOString();
      rollback.rollbackToTimestamp(timestamp);
      break;
    case 'clean':
      rollback.cleanTestData();
      break;
    case 'reset':
      rollback.fullReset();
      break;
    default:
      console.log('Usage:');
      console.log('  node rollback-import.js backup');
      console.log('  node rollback-import.js rollback [timestamp]');
      console.log('  node rollback-import.js clean');
      console.log('  node rollback-import.js reset');
  }
}

module.exports = ImportRollback;
```

## 📊 Testing Stages Summary

| Stage | Records | Purpose | Commands | Time |
|-------|---------|---------|----------|------|
| **Test** | 10 | Verify basic functionality | `npm run import:test` | 1 min |
| **Small** | 100 | Check performance | `npm run import:small` | 2 min |
| **Medium** | 1,000 | Monitor resources | `npm run import:medium` | 5 min |
| **Large** | 10,000 | Validate at scale | `npm run import:large` | 15 min |
| **Full** | 500,000+ | Production import | `npm run import:full` | 2-3 hours |

## 🎯 Success Criteria

### Stage 1 (10 records) ✅
- [ ] All 10 records imported
- [ ] No duplicate errors
- [ ] Query performance < 100ms
- [ ] All industries represented
- [ ] Error logs empty

### Stage 2 (100 records) ✅
- [ ] Import completes in < 2 minutes
- [ ] No memory errors
- [ ] Verification queries work
- [ ] No data corruption
- [ ] Can query by industry/state

### Stage 3 (1,000 records) ✅
- [ ] Batch processing works
- [ ] Progress tracking accurate
- [ ] Can resume from failure
- [ ] Performance acceptable
- [ ] No timeouts

### Stage 4 (10,000 records) ✅
- [ ] Import rate > 100 records/second
- [ ] D1 limits not exceeded
- [ ] Indexes working properly
- [ ] Can rollback if needed
- [ ] Memory usage stable

### Stage 5 (Full import) ✅
- [ ] Complete within 3 hours
- [ ] All records imported
- [ ] System remains responsive
- [ ] Can query efficiently
- [ ] Backup created first

## 🚨 Monitoring During Import

### Terminal 1: Run Import
```bash
node scripts/import-progressive.js real-agents-florida.csv
```

### Terminal 2: Monitor Errors
```bash
wrangler tail --format pretty | grep ERROR
```

### Terminal 3: Watch Database
```bash
watch -n 10 'wrangler d1 execute estateflow-db --command="SELECT COUNT(*) FROM professionals;"'
```

### Terminal 4: System Resources
```bash
# Windows
wmic process where name="node.exe" get WorkingSetSize,PageFileUsage,PageFaults

# Mac/Linux
top -p $(pgrep node)
```

## 🆘 Troubleshooting

### "Database locked" Error
```bash
# Wait and retry
sleep 5
# Reduce batch size to 500
```

### "Out of memory" Error
```bash
# Increase Node memory
node --max-old-space-size=4096 scripts/import-progressive.js data.csv
```

### "Rate limit exceeded"
```bash
# Add delay between batches
# Modify BATCH_SIZE to 500
# Add sleep(1000) between batches
```

### Import Stuck
```bash
# Check progress file
cat import-progress.json

# Resume from last batch
node scripts/import-progressive.js data.csv
```

### Data Corruption
```bash
# Rollback to timestamp
node scripts/rollback-import.js rollback "2024-11-28T10:00:00Z"

# Or full reset
node scripts/rollback-import.js reset
```

## ✅ Ready to Test!

1. **Start Small**: Begin with `test-data-10.csv`
2. **Verify Each Stage**: Run verification after each import
3. **Monitor Everything**: Keep wrangler tail running
4. **Document Issues**: Note any problems for troubleshooting
5. **Scale Gradually**: Only proceed to next stage after success

**Remember**: It's much easier to fix issues with 10 records than 500,000!

---

**Safety First**: Always backup before large imports!
```bash
node scripts/rollback-import.js backup
```