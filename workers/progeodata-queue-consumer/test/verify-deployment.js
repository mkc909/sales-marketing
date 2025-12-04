/**
 * Deployment Verification Script
 * Tests the queue consumer worker is properly configured
 */

const WORKER_URL = process.env.WORKER_URL || 'http://127.0.0.1:8787';

async function verifyEndpoint(path, description) {
  console.log(`\n✓ Testing ${description}...`);
  try {
    const response = await fetch(`${WORKER_URL}${path}`);
    const data = await response.json();

    if (response.ok) {
      console.log(`  ✅ ${response.status} - ${description} OK`);
      console.log(`  Response:`, JSON.stringify(data, null, 2).split('\n').slice(0, 10).join('\n'));
      return true;
    } else {
      console.log(`  ❌ ${response.status} - ${description} FAILED`);
      console.log(`  Error:`, data);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${description} ERROR:`, error.message);
    return false;
  }
}

async function runVerification() {
  console.log('='.repeat(60));
  console.log('ProGeoData Queue Consumer - Deployment Verification');
  console.log('='.repeat(60));
  console.log(`\nWorker URL: ${WORKER_URL}`);

  const tests = [
    { path: '/health', description: 'Health Check' },
    { path: '/stats', description: 'Queue Statistics' },
  ];

  const results = [];
  for (const test of tests) {
    const result = await verifyEndpoint(test.path, test.description);
    results.push({ ...test, passed: result });
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Results Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.description}`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Worker is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check configuration.');
    process.exit(1);
  }
}

runVerification().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
