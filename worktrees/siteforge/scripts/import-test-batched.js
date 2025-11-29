import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { execSync } from 'child_process';

const BATCH_SIZE = 50; // Process 50 records at a time to avoid SQLITE_TOOBIG error

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function createBatchInsert(records, startIndex) {
  const values = records.map((record, index) => {
    const actualIndex = startIndex + index;
    const slug = generateSlug(record.name);
    return `('${actualIndex}', '${slug}', '${record.name.replace(/'/g, "''")}', '${record.license_number}', '${record.email}', '${record.phone}', '${record.industry}', '${record.state}', '${record.city}', 'ghost', datetime('now'), datetime('now'))`;
  }).join(',\n');
  
  return `INSERT INTO agents (id, slug, name, license_number, email, phone, industry, state, city, subscription_tier, created_at, updated_at) VALUES\n${values};`;
}

async function importBatchedData(csvFile) {
  console.log(`🧪 Starting BATCHED import with ${BATCH_SIZE} records per batch...`);
  
  try {
    // Read and parse CSV
    const csvData = fs.readFileSync(csvFile, 'utf-8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📊 Found ${records.length} records in ${csvFile}`);
    
    // Validate data
    if (records.length === 0) {
      throw new Error('No records found in CSV file');
    }
    
    console.log('✅ Validating data...');
    
    for (const [index, record] of records.entries()) {
      if (!record.id || !record.name || !record.email) {
        throw new Error(`Missing required fields in record ${index + 1}`);
      }
    }
    
    console.log('Data validation passed!');
    
    // Process in batches
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);
    console.log(`🔄 Processing ${records.length} records in ${totalBatches} batches of ${BATCH_SIZE}...`);
    
    let totalProcessed = 0;
    let totalTime = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, records.length);
      const batch = records.slice(startIndex, endIndex);
      
      console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${batch.length} records)...`);
      
      // Create batch SQL
      const sql = createBatchInsert(batch, parseInt(batch[0].id));
      
      // Write batch SQL to file
      const batchFile = `test-import-batch-${i + 1}.sql`;
      fs.writeFileSync(batchFile, sql);
      
      // Execute batch
      const startTime = Date.now();
      try {
        const result = execSync(`wrangler d1 execute estateflow-db --env=production --remote --file=${batchFile}`, { 
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const duration = Date.now() - startTime;
        totalTime += duration;
        totalProcessed += batch.length;
        
        console.log(`✅ Batch ${i + 1} completed: ${batch.length} records in ${duration}ms`);
        
        // Clean up batch file
        fs.unlinkSync(batchFile);
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error.message);
        throw error;
      }
    }
    
    console.log(`\n🎉 BATCHED IMPORT SUCCESSFUL!`);
    console.log(`📊 Total processed: ${totalProcessed} records`);
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`🚀 Average rate: ${(totalProcessed / (totalTime / 1000)).toFixed(2)} records/second`);
    
    // Verify import
    console.log('\n🔍 Verifying import...');
    const verifyResult = execSync('wrangler d1 execute estateflow-db --env=production --remote --command="SELECT COUNT(*) as total_records FROM agents;"', { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log('Database contents:', verifyResult);
    
    return {
      success: true,
      totalRecords: totalProcessed,
      totalTime,
      averageRate: totalProcessed / (totalTime / 1000)
    };
    
  } catch (error) {
    console.error('❌ Batched import failed:', error.message);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if D1 database exists: wrangler d1 list');
    console.log('2. Check if migrations were run');
    console.log('3. Review CSV file format');
    console.log('4. Check wrangler tail for detailed errors');
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Main execution
const csvFile = process.argv[2];
if (!csvFile) {
  console.error('Usage: node import-test-batched.js <csv-file> [--remote]');
  process.exit(1);
}

const isRemote = process.argv.includes('--remote');

if (isRemote) {
  console.log('🌐 Running in REMOTE mode (production database)');
} else {
  console.log('🏠 Running in LOCAL mode (development database)');
}

importBatchedData(csvFile);