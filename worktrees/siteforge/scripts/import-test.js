// Test Import Script - Start with 10 records
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { execSync } from 'child_process';

const WRANGLER_DB = 'estateflow-db';
const BATCH_SIZE = 10;

async function importTestData(filename) {
  console.log('🧪 Starting TEST import with 10 records...\n');

  try {
    // Read and parse CSV
    const data = fs.readFileSync(filename, 'utf-8');
    const records = parse(data, {
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
    const values = records.map(r => {
      // Generate slug from name
      const slug = r.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      return `('${r.id}', '${slug}', '${r.name}', '${r.license_number}', '${r.email}',
        '${r.phone}', '${r.industry}', '${r.state}', '${r.city}',
        'ghost', datetime('now'), datetime('now'))`;
    }).join(',\n');

    const sql = `
      INSERT INTO agents (
        id, slug, name, license_number, email, phone,
        industry, state, city, subscription_tier,
        created_at, updated_at
      ) VALUES ${values};
    `;

    // Write SQL to file for inspection
    fs.writeFileSync('test-import.sql', sql);
    console.log('\n📝 SQL written to test-import.sql for review');

    // Execute import
    console.log('\n🚀 Executing import...');

    const result = execSync(
      `wrangler d1 execute ${WRANGLER_DB} --env=production --remote --file=test-import.sql`,
      { encoding: 'utf-8' }
    );

    console.log('Import result:', result);

    // Verify import
    console.log('\n🔍 Verifying import...');
    const verifyResult = execSync(
      `wrangler d1 execute ${WRANGLER_DB} --env=production --remote --command="SELECT COUNT(*) as count, industry FROM agents GROUP BY industry;"`,
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
const filename = process.argv[2] || 'test-data-10.csv';
importTestData(filename);

export { importTestData };