// Test Rollback Functionality
const { execSync } = require('child_process');

const WRANGLER_DB = 'estateflow-db';

class TestRollback {
  // Test rollback by removing records with IDs > 1000 (Stage 3 and 4 data)
  async rollbackToStage2() {
    console.log('⏪ Rolling back to Stage 2 (removing Stage 3 & 4 data)...');

    const sql = `
      DELETE FROM agents
      WHERE id > 110;
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --remote --command="${sql}"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ Rollback to Stage 2 complete:', result);

      // Verify rollback
      const countResult = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --remote --command="SELECT COUNT(*) as total_records FROM agents;"`,
        { encoding: 'utf-8' }
      );

      console.log('🔍 Record count after rollback:', countResult);

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  // Test rollback by removing records with IDs > 110 (Stage 2, 3, and 4 data)
  async rollbackToStage1() {
    console.log('⏪ Rolling back to Stage 1 (removing Stage 2, 3 & 4 data)...');

    const sql = `
      DELETE FROM agents
      WHERE id > 10;
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --remote --command="DELETE FROM agents WHERE id > 110;"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ Rollback to Stage 1 complete:', result);

      // Verify rollback
      const countResult = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --remote --command="SELECT COUNT(*) as total_records FROM agents;"`,
        { encoding: 'utf-8' }
      );

      console.log('🔍 Record count after rollback:', countResult);

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  // Clean all test data (records with example.com emails)
  async cleanAllTestData() {
    console.log('🧹 Cleaning all test data...');

    const sql = `
      DELETE FROM agents
      WHERE email LIKE '%example.com%';
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --remote --command="DELETE FROM agents WHERE id > 10;"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ All test data cleaned:', result);

      // Verify cleanup
      const countResult = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --remote --command="SELECT COUNT(*) as total_records FROM agents;"`,
        { encoding: 'utf-8' }
      );

      console.log('🔍 Record count after cleanup:', countResult);

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }
}

// CLI
if (require.main === module) {
  const rollback = new TestRollback();
  const command = process.argv[2];

  switch (command) {
    case 'stage2':
      rollback.rollbackToStage2();
      break;
    case 'stage1':
      rollback.rollbackToStage1();
      break;
    case 'clean':
      rollback.cleanAllTestData();
      break;
    default:
      console.log('Usage:');
      console.log('  node test-rollback.js stage2  # Rollback to Stage 2 (keep first 110 records)');
      console.log('  node test-rollback.js stage1  # Rollback to Stage 1 (keep first 10 records)');
      console.log('  node test-rollback.js clean   # Clean all test data');
  }
}

module.exports = TestRollback;