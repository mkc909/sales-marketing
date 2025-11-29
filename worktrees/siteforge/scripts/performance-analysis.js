#!/usr/bin/env node

/**
 * Performance Analysis - Corrected Version
 * Analyzes actual database performance from wrangler output
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';

// Performance thresholds from requirements
const PERFORMANCE_THRESHOLDS = {
  QUERY_TIME_MAX_MS: 100, // Maximum query time: 100ms
  IMPORT_RATE_MIN_PER_SECOND: 100, // Minimum import rate: 100 records/second
};

// Test results storage
const testResults = {
  queryPerformance: [],
  importPerformance: [],
  summary: {
    passed: 0,
    failed: 0,
    total: 0
  }
};

/**
 * Execute a SQL query and extract actual SQL execution time from wrangler output
 */
async function executeQueryWithTiming(query, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`📝 SQL: ${query}`);
  
  const startTime = performance.now();
  
  try {
    const result = execSync(
      `wrangler d1 execute estateflow-db --remote --command="${query}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Extract actual SQL execution time from wrangler output
    const sqlDurationMatch = result.match(/"sql_duration_ms":\s*([\d.]+)/);
    const actualSqlTime = sqlDurationMatch ? parseFloat(sqlDurationMatch[1]) : -1;
    
    console.log(`⏱️  Total time: ${totalTime.toFixed(2)}ms (including CLI overhead)`);
    console.log(`🚀 SQL time: ${actualSqlTime.toFixed(2)}ms (actual database performance)`);
    
    const passed = actualSqlTime <= PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    testResults.queryPerformance.push({
      description,
      query,
      totalTime,
      actualSqlTime,
      threshold: PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS,
      passed,
      status
    });
    
    console.log(`${status} (Threshold: ${PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS}ms)`);
    
    return { totalTime, actualSqlTime, passed, result };
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    
    testResults.queryPerformance.push({
      description,
      query,
      totalTime: -1,
      actualSqlTime: -1,
      threshold: PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS,
      passed: false,
      status: '❌ ERROR',
      error: error.message
    });
    
    return { totalTime: -1, actualSqlTime: -1, passed: false, error: error.message };
  }
}

/**
 * Test basic query performance with corrected schema
 */
async function testBasicQueries() {
  console.log('\n🚀 Testing Basic Query Performance');
  console.log('=' .repeat(50));
  
  // Test 1: Count all records
  await executeQueryWithTiming(
    'SELECT COUNT(*) as total_records FROM agents',
    'Count all agents'
  );
  
  // Test 2: Simple filter with index
  await executeQueryWithTiming(
    'SELECT COUNT(*) as florida_agents FROM agents WHERE state = \'FL\'',
    'Count agents by state (indexed)'
  );
  
  // Test 3: Industry filter
  await executeQueryWithTiming(
    'SELECT COUNT(*) as real_estate_agents FROM agents WHERE industry = \'real_estate\'',
    'Count agents by industry (corrected)'
  );
  
  // Test 4: Complex query with multiple conditions (without tier)
  await executeQueryWithTiming(
    'SELECT COUNT(*) as florida_real_estate FROM agents WHERE industry = \'real_estate\' AND state = \'FL\'',
    'Complex filtered query (corrected)'
  );
  
  // Test 5: JOIN query with industry_config
  await executeQueryWithTiming(
    'SELECT a.industry, ic.display_name, COUNT(*) as count FROM agents a LEFT JOIN industry_config ic ON a.industry = ic.industry GROUP BY a.industry, ic.display_name',
    'GROUP BY with JOIN'
  );
  
  // Test 6: ORDER BY with LIMIT
  await executeQueryWithTiming(
    'SELECT name, email FROM agents ORDER BY name LIMIT 10',
    'ORDER BY with LIMIT'
  );
  
  // Test 7: Text search (LIKE)
  await executeQueryWithTiming(
    'SELECT COUNT(*) as search_results FROM agents WHERE name LIKE \'%John%\'',
    'Text search (LIKE)'
  );
}

/**
 * Test import performance with ES modules
 */
async function testImportPerformance() {
  console.log('\n📦 Testing Import Performance');
  console.log('=' .repeat(50));
  
  try {
    // Create a small test dataset for performance testing
    console.log('📝 Creating performance test dataset...');
    
    const testData = [];
    const baseId = 99999; // Use high IDs to avoid conflicts
    
    for (let i = 0; i < 50; i++) {
      testData.push({
        id: baseId + i,
        name: `Perf Test Agent ${i + 1}`,
        license_number: `PERF${String(i + 1).padStart(6, '0')}`,
        email: `perf${i + 1}@test.com`,
        phone: `555-010${String(i).padStart(3, '0')}`,
        industry: 'real_estate',
        state: 'FL',
        city: 'Miami'
      });
    }
    
    // Write test data to CSV
    const csvHeader = 'id,name,license_number,email,phone,industry,state,city';
    const csvData = [csvHeader, ...testData.map(record => 
      `${record.id},${record.name},${record.license_number},${record.email},${record.phone},${record.industry},${record.state},${record.city}`
    )].join('\n');
    
    fs.writeFileSync('test-data-performance.csv', csvData);
    console.log('✅ Created test-data-performance.csv with 50 records');
    
    // Measure import performance
    console.log('\n📥 Measuring import performance...');
    const importStartTime = performance.now();
    
    execSync('node scripts/import-test.js test-data-performance.csv --remote', {
      stdio: 'pipe'
    });
    
    const importEndTime = performance.now();
    const importTime = importEndTime - importStartTime;
    const importRate = 50 / (importTime / 1000); // records per second
    
    console.log(`⏱️  Import time: ${importTime.toFixed(2)}ms`);
    console.log(`📊 Import rate: ${importRate.toFixed(2)} records/second`);
    
    const passed = importRate >= PERFORMANCE_THRESHOLDS.IMPORT_RATE_MIN_PER_SECOND;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    testResults.importPerformance.push({
      description: '50 records import',
      recordCount: 50,
      importTime,
      importRate,
      threshold: PERFORMANCE_THRESHOLDS.IMPORT_RATE_MIN_PER_SECOND,
      passed,
      status
    });
    
    console.log(`${status} (Threshold: ${PERFORMANCE_THRESHOLDS.IMPORT_RATE_MIN_PER_SECOND} records/second)`);
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    execSync(`wrangler d1 execute estateflow-db --remote --command="DELETE FROM agents WHERE id >= ${baseId};"`, {
      stdio: 'pipe'
    });
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.log(`❌ Import test failed: ${error.message}`);
    
    testResults.importPerformance.push({
      description: '50 records import',
      recordCount: 50,
      importTime: -1,
      importRate: 0,
      threshold: PERFORMANCE_THRESHOLDS.IMPORT_RATE_MIN_PER_SECOND,
      passed: false,
      status: '❌ ERROR',
      error: error.message
    });
  }
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('\n📋 PERFORMANCE TEST REPORT');
  console.log('=' .repeat(60));
  
  // Calculate summary
  const allTests = [
    ...testResults.queryPerformance,
    ...testResults.importPerformance
  ];
  
  testResults.summary.total = allTests.length;
  testResults.summary.passed = allTests.filter(test => test.passed).length;
  testResults.summary.failed = allTests.filter(test => !test.passed).length;
  
  // Query Performance Summary
  console.log('\n🔍 QUERY PERFORMANCE SUMMARY');
  console.log('-'.repeat(40));
  
  const queryTests = testResults.queryPerformance;
  const avgQueryTime = queryTests
    .filter(test => test.actualSqlTime > 0)
    .reduce((sum, test) => sum + test.actualSqlTime, 0) / queryTests.filter(test => test.actualSqlTime > 0).length;
  
  console.log(`Total query tests: ${queryTests.length}`);
  console.log(`Passed: ${queryTests.filter(test => test.passed).length}`);
  console.log(`Failed: ${queryTests.filter(test => !test.passed).length}`);
  console.log(`Average SQL query time: ${avgQueryTime.toFixed(2)}ms`);
  console.log(`Threshold: ${PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS}ms`);
  
  // Show individual query results
  queryTests.forEach(test => {
    console.log(`  ${test.status} ${test.description}: ${test.actualSqlTime.toFixed(2)}ms SQL time`);
  });
  
  // Import Performance Summary
  console.log('\n📦 IMPORT PERFORMANCE SUMMARY');
  console.log('-'.repeat(40));
  
  const importTests = testResults.importPerformance;
  importTests.forEach(test => {
    console.log(`  ${test.status} ${test.description}: ${test.importRate.toFixed(2)} records/second`);
  });
  
  // Overall Summary
  console.log('\n📊 OVERALL SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Total tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Success rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  if (testResults.summary.failed === 0) {
    console.log('✅ All performance tests passed!');
    console.log('✅ System is ready for production deployment');
    console.log('✅ Can proceed with 500k+ record import');
  } else {
    console.log('❌ Some performance tests failed:');
    console.log('   - Review failed tests and optimize queries');
    console.log('   - Consider adding additional indexes');
    console.log('   - Optimize import process for better throughput');
    console.log('   - Address performance issues before production import');
  }
  
  return testResults.summary.failed === 0;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 EstateFlow Performance Analysis (Corrected)');
  console.log('=' .repeat(50));
  console.log(`📊 Performance Thresholds:`);
  console.log(`   - SQL query time: < ${PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS}ms`);
  console.log(`   - Import rate: > ${PERFORMANCE_THRESHOLDS.IMPORT_RATE_MIN_PER_SECOND} records/second`);
  console.log(`   - Note: Measuring actual SQL execution time, not CLI overhead`);
  
  try {
    // Run all performance tests
    await testBasicQueries();
    await testImportPerformance();
    
    // Generate final report
    const allTestsPassed = generateReport();
    
    // Exit with appropriate code
    process.exit(allTestsPassed ? 0 : 1);
    
  } catch (error) {
    console.error(`❌ Performance test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the performance tests
main().catch(console.error);