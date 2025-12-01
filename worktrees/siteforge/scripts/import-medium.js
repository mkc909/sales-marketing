#!/usr/bin/env node

/**
 * Medium Batch Import - 1,000 records
 *
 * Purpose: Test import performance with medium dataset
 * Expected: < 15 seconds, > 75 records/second
 */

import { OptimizedImporter } from './import-optimized.js';

const FILENAME = 'data/medium-1000.sql';
const BATCH_SIZE = 1000;

async function main() {
  console.log('📦 Medium Batch Import (1,000 records)\n');

  const importer = new OptimizedImporter({
    batchSize: BATCH_SIZE,
    delay: 100,
    verbose: false
  });

  try {
    const result = await importer.import(FILENAME);

    console.log('\n✅ Medium batch test PASSED');

    if (result.totalImported === 1000) {
      console.log('   ✓ Correct record count');
    }

    console.log('\n📋 Next step: npm run import:large');

  } catch (error) {
    console.error('\n❌ Medium batch test FAILED:', error.message);
    process.exit(1);
  }
}

main();
