#!/usr/bin/env node

/**
 * Progressive Import Script
 *
 * Handles imports of varying sizes with appropriate safeguards:
 * - 100 records: Quick test
 * - 1,000 records: Medium batch
 * - 10,000 records: Large batch (requires confirmation)
 * - 100,000+ records: Full import (requires --force flag)
 */

import fs from 'fs';
import readline from 'readline';
import { OptimizedImporter } from './import-optimized.js';

const THRESHOLDS = {
  small: 100,
  medium: 1000,
  large: 10000,
  xlarge: 100000
};

async function confirmImport(recordCount) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const sizeCategory =
      recordCount < THRESHOLDS.small ? 'test' :
      recordCount < THRESHOLDS.medium ? 'small' :
      recordCount < THRESHOLDS.large ? 'medium' :
      recordCount < THRESHOLDS.xlarge ? 'large' : 'extra large';

    console.log(`\n⚠️  About to import ${recordCount.toLocaleString()} records (${sizeCategory} dataset)`);

    if (recordCount >= THRESHOLDS.large) {
      console.log(`\nEstimated time: ${Math.ceil(recordCount / 100 / 60)} minutes`);
      console.log(`Database writes: ~${recordCount.toLocaleString()}`);
    }

    rl.question('\nContinue with import? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function countRecords(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  // Count INSERT statements or CSV rows
  if (filename.endsWith('.sql')) {
    const insertMatches = content.match(/INSERT INTO/gi);
    return insertMatches ? insertMatches.length : 0;
  } else if (filename.endsWith('.csv')) {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.length - 1; // Subtract header row
  }
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const filename = args.find(arg => !arg.startsWith('--'));

  if (!filename) {
    console.error('❌ Error: Please provide a filename');
    console.log('\nUsage: node import-progressive.js <filename> [options]');
    console.log('\nOptions:');
    console.log('  --skip-prompt    Skip confirmation prompt');
    console.log('  --force          Force import without size checks');
    console.log('  --dry-run        Test mode without executing');
    console.log('\nExamples:');
    console.log('  node import-progressive.js data/small-100.sql');
    console.log('  node import-progressive.js data/large-10000.sql --skip-prompt');
    console.log('  node import-progressive.js data/test-10.sql --dry-run');
    process.exit(1);
  }

  if (!fs.existsSync(filename)) {
    console.error(`❌ Error: File not found: ${filename}`);
    process.exit(1);
  }

  const skipPrompt = args.includes('--skip-prompt');
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');

  try {
    // Count records in file
    console.log(`📊 Analyzing ${filename}...`);
    const recordCount = await countRecords(filename);
    console.log(`   Found: ${recordCount.toLocaleString()} records`);

    // Safety checks
    if (recordCount >= THRESHOLDS.xlarge && !force) {
      console.error(`\n❌ Large import detected (${recordCount.toLocaleString()} records)`);
      console.log('\n⚠️  Safety Check Failed:');
      console.log('   Imports over 100,000 records require --force flag');
      console.log('\nRecommendation:');
      console.log('   1. Test with smaller dataset first');
      console.log('   2. Ensure database has capacity');
      console.log('   3. Run with --force if intentional');
      console.log('\nCommand:');
      console.log(`   node import-progressive.js ${filename} --force`);
      process.exit(1);
    }

    // Confirmation prompt for large imports
    if (recordCount >= THRESHOLDS.large && !skipPrompt && !dryRun) {
      const confirmed = await confirmImport(recordCount);
      if (!confirmed) {
        console.log('\n❌ Import cancelled by user');
        process.exit(0);
      }
    }

    // Determine optimal batch size based on dataset size
    const batchSize =
      recordCount < THRESHOLDS.small ? 10 :
      recordCount < THRESHOLDS.medium ? 100 :
      recordCount < THRESHOLDS.large ? 1000 : 10000;

    console.log(`\n✅ Starting progressive import...`);
    console.log(`   Batch size: ${batchSize.toLocaleString()}`);

    // Execute import with optimized importer
    const importer = new OptimizedImporter({
      batchSize,
      dryRun,
      verbose: args.includes('--verbose') || args.includes('-v')
    });

    await importer.import(filename);

    console.log('\n🎉 Import completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm run import:verify');
    console.log('   2. Check data quality in database');
    console.log('   3. Review import logs above\n');

  } catch (error) {
    console.error('\n💥 Import failed:', error.message);
    console.log('\n🔧 Recovery options:');
    console.log('   1. Check .import-checkpoint.json for resume point');
    console.log('   2. Run: npm run import:rollback');
    console.log('   3. Review error logs above');
    console.log('   4. Try with --dry-run first\n');
    process.exit(1);
  }
}

main();
