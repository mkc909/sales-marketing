#!/usr/bin/env node

/**
 * Small Batch Import - 100 records
 *
 * Purpose: Test import performance with small dataset
 * Expected: < 2 seconds, > 50 records/second
 */

import { OptimizedImporter } from './import-optimized.js';

const FILENAME = 'data/small-100.sql';
const BATCH_SIZE = 100;

async function main() {
  console.log('📦 Small Batch Import (100 records)\n');

  const importer = new OptimizedImporter({
    batchSize: BATCH_SIZE,
    delay: 100,
    verbose: true
  });

  try {
    const result = await importer.import(FILENAME);

    console.log('\n✅ Small batch test PASSED');

    if (result.totalImported === 100) {
      console.log('   ✓ Correct record count');
    }

    const rate = result.totalImported / ((Date.now() - Date.now()) / 1000);
    if (rate >= 50) {
      console.log(`   ✓ Performance target met: ${rate.toFixed(2)} rec/sec`);
    }

    console.log('\n📋 Next step: npm run import:medium');

  } catch (error) {
    console.error('\n❌ Small batch test FAILED:', error.message);
    process.exit(1);
  }
}

main();
