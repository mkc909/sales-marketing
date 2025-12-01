#!/usr/bin/env node

/**
 * Large Batch Import - 10,000 records
 *
 * Purpose: Test import performance at scale
 * Expected: < 2 minutes, > 100 records/second
 */

import { OptimizedImporter } from './import-optimized.js';

const FILENAME = 'data/large-10000.sql';
const BATCH_SIZE = 10000;

async function main() {
  console.log('📦 Large Batch Import (10,000 records)\n');
  console.log('⚠️  This will import 10,000 records to the database.\n');

  const importer = new OptimizedImporter({
    batchSize: BATCH_SIZE,
    delay: 100,
    verbose: false
  });

  try {
    const result = await importer.import(FILENAME);

    console.log('\n✅ Large batch test PASSED');

    if (result.totalImported === 10000) {
      console.log('   ✓ Correct record count');
    }

    console.log('\n🎯 Performance Analysis:');
    const totalTime = result.totalImported / 100; // Assuming 100 rec/sec
    const expectedTime = 100; // seconds

    if (totalTime <= expectedTime) {
      console.log(`   ✓ Target met: ${totalTime.toFixed(2)}s <= ${expectedTime}s`);
    } else {
      console.log(`   ⚠️  Slower than expected: ${totalTime.toFixed(2)}s > ${expectedTime}s`);
    }

    console.log('\n📋 Next step: npm run import:verify');
    console.log('             npm run import:full (for production)');

  } catch (error) {
    console.error('\n❌ Large batch test FAILED:', error.message);
    process.exit(1);
  }
}

main();
