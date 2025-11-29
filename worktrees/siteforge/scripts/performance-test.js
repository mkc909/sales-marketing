#!/usr/bin/env node

/**
 * Performance Validation Tests
 * Tests query performance, import rates, and system behavior
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

// Performance thresholds from requirements
const PERFORMANCE_THRESHOLDS = {
  QUERY_TIME_MAX_MS: 100, // Maximum query time: 100ms
  IMPORT_RATE_MIN_PER_SECOND: 100, // Minimum import rate: 100 records/second
  MAX_MEMORY_USAGE_MB: 512, // Maximum memory usage: 512MB
  MAX_CPU_USAGE_PERCENT: 80 // Maximum CPU usage: 80%
};

// Test results storage
const testResults = {
  queryPerformance: [],
  importPerformance: [],
  systemMetrics: [],
  summary: {
    passed: 0,
    failed: 0,
    total: 0
  }
};

/**
 * Execute a SQL query and measure performance
 */
async function executeQuery(query, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`📝 SQL: ${query}`);
  
  const startTime = performance.now();
  
  try {
    const result = execSync(
      `wrangler d1 execute estateflow-db --remote --command="${query}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    console.log(`⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
    console.log(`📊 Result: ${result.trim()}`);
    
    const passed = executionTime <= PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    
    testResults.queryPerformance.push({
      description,
      query,
      executionTime,
      threshold: PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS,
      passed,
      status
    });
    
    console.log(`${status} (Threshold: ${PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS}ms)`);
    
    return { executionTime, passed, result };
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    
    testResults.queryPerformance.push({
      description,
      query,
      executionTime: -1,
      threshold: PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS,
      passed: false,
      status: '❌ ERROR',
      error: error.message
    });
    
    return { executionTime: -1, passed: false, error: error.message };
  }
}

/**
 * Test basic query performance
 */
async function testBasicQueries() {
  console.log('\n🚀 Testing Basic Query Performance');
  console.log('=' .repeat(50));
  
  // Test 1: Count all records
  await executeQuery(
    'SELECT COUNT(*) as total_records FROM agents',
    'Count all agents'
  );
  
  // Test 2: Simple filter with index
  await executeQuery(
    'SELECT COUNT(*) as florida_agents FROM agents WHERE state = \'FL\'',
    'Count agents by state (indexed)'
  );
  
  // Test 3: Industry filter
  await executeQuery(
    'SELECT COUNT(*) as real_estate_agents FROM agents WHERE industry = \'Real Estate\'',
    'Count agents by industry'
  );
  
  // Test 4: Complex query with multiple conditions
  await executeQuery(
    'SELECT COUNT(*) as top_agents FROM agents WHERE industry = \'Real Estate\' AND state = \'FL\' AND tier = \'Premium\'',
    'Complex filtered query'
  );
  
  // Test 5: JOIN query with industry_config
  await executeQuery(
    'SELECT a.industry, ic.display_name, COUNT(*) as count FROM agents a LEFT JOIN industry_config ic ON a.industry = ic.industry GROUP BY a.industry, ic.display_name',
    'GROUP BY with JOIN'
  );
  
  // Test 6: ORDER BY with LIMIT
  await executeQuery(
    'SELECT name, email FROM agents ORDER BY name LIMIT 10',
    'ORDER BY with LIMIT'
  );
  
  // Test 7: Text search (LIKE)
  await executeQuery(
    'SELECT COUNT(*) as search_results FROM agents WHERE name LIKE \'%John%\'',
    'Text search (LIKE)'
  );
}

/**
 * Test import performance with small dataset
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
        industry: 'Real Estate',
        state: 'FL',
        city: 'Miami'
      });
    }
    
    // Write test data to CSV
    const csvHeader = 'id,name,license_number,email,phone,industry,state,city';
    const csvData = [csvHeader, ...testData.map(record => 
      `${record.id},${record.name},${record.license_number},${record.email},${record.phone},${record.industry},${record.state},${record.city}`
    )].join('\n');
    
    require('fs').writeFileSync('test-data-performance.csv', csvData);
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
 * Test database connection and basic operations
 */
async function testDatabaseHealth() {
  console.log('\n🏥 Testing Database Health');
  console.log('=' .repeat(50));
  
  // Test database connectivity
  await executeQuery(
    'SELECT 1 as health_check',
    'Database connectivity'
  );
  
  // Test table existence
  await executeQuery(
    'SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'agents\'',
    'Agents table existence'
  );
  
  // Test indexes
  await executeQuery(
    'SELECT name FROM sqlite_master WHERE type=\'index\' AND tbl_name=\'agents\'',
    'Indexes existence'
  );
  
  // Test database size
  await executeQuery(
    'SELECT page_count * page_size as database_size_bytes FROM pragma_page_count(), pragma_page_size()',
    'Database size'
  );
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
    .filter(test => test.executionTime > 0)
    .reduce((sum, test) => sum + test.executionTime, 0) / queryTests.filter(test => test.executionTime > 0).length;
  
  console.log(`Total query tests: ${queryTests.length}`);
  console.log(`Passed: ${queryTests.filter(test => test.passed).length}`);
  console.log(`Failed: ${queryTests.filter(test => !test.passed).length}`);
  console.log(`Average query time: ${avgQueryTime.toFixed(2)}ms`);
  console.log(`Threshold: ${PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS}ms`);
  
  // Show individual query results
  queryTests.forEach(test => {
    console.log(`  ${test.status} ${test.description}: ${test.executionTime.toFixed(2)}ms`);
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
  console.log('🚀 EstateFlow Performance Validation Tests');
  console.log('=' .repeat(50));
  console.log(`📊 Performance Thresholds:`);
  console.log(`   - Query time: < ${PERFORMANCE_THRESHOLDS.QUERY_TIME_MAX_MS}ms`);
  console.log(`   - Import rate: > ${PERFORMANCE_THRESHOLDS.IMPORT_RATE_MIN_PER_SECOND} records/second`);
  console.log(`   - Memory usage: < ${PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB}MB`);
  console.log(`   - CPU usage: < ${PERFORMANCE_THRESHOLDS.MAX_CPU_USAGE_PERCENT}%`);
  
  try {
    // Run all performance tests
    await testDatabaseHealth();
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