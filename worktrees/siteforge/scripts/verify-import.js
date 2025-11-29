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