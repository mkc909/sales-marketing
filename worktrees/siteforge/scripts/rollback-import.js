// Rollback Failed Imports
const { execSync } = require('child_process');
const fs = require('fs');

const WRANGLER_DB = 'estateflow-db';

class ImportRollback {
  constructor() {
    this.backupFile = 'db-backup-before-import.sql';
  }

  // Create backup before import
  async createBackup() {
    console.log('💾 Creating database backup...');

    try {
      // Export current data
      const tables = ['professionals', 'pins', 'leads', 'error_logs'];
      const backup = [];

      for (const table of tables) {
        const result = execSync(
          `wrangler d1 execute ${WRANGLER_DB} --command="SELECT * FROM ${table};"`,
          { encoding: 'utf-8' }
        );

        backup.push({
          table: table,
          data: result
        });
      }

      fs.writeFileSync(this.backupFile, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup saved to ${this.backupFile}`);

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  // Rollback to specific timestamp
  async rollbackToTimestamp(timestamp) {
    console.log(`⏪ Rolling back imports after ${timestamp}...`);

    const sql = `
      DELETE FROM professionals
      WHERE created_at > '${timestamp}';
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --command="${sql}"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ Rollback complete:', result);

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  // Remove test data
  async cleanTestData() {
    console.log('🧹 Cleaning test data...');

    const sql = `
      DELETE FROM professionals
      WHERE email LIKE '%example.com%'
         OR email LIKE '%test%'
         OR name LIKE 'Test%';
    `;

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --command="${sql}"`,
        { encoding: 'utf-8' }
      );

      console.log('✅ Test data cleaned:', result);

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  // Full reset
  async fullReset() {
    console.log('🔄 FULL DATABASE RESET');
    console.log('⚠️  This will DELETE ALL DATA!');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('Type "RESET" to confirm: ', resolve);
    });
    readline.close();

    if (answer !== 'RESET') {
      console.log('Reset cancelled.');
      return;
    }

    console.log('Resetting database...');

    try {
      // Truncate all tables
      const tables = ['professionals', 'pins', 'leads', 'error_logs'];

      for (const table of tables) {
        const sql = `DELETE FROM ${table};`;
        execSync(
          `wrangler d1 execute ${WRANGLER_DB} --command="${sql}"`,
          { encoding: 'utf-8' }
        );
        console.log(`✅ Cleared table: ${table}`);
      }

      console.log('\n✅ Database reset complete!');

    } catch (error) {
      console.error('❌ Reset failed:', error.message);
    }
  }
}

// CLI
if (require.main === module) {
  const rollback = new ImportRollback();
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      rollback.createBackup();
      break;
    case 'rollback':
      const timestamp = process.argv[3] || new Date(Date.now() - 3600000).toISOString();
      rollback.rollbackToTimestamp(timestamp);
      break;
    case 'clean':
      rollback.cleanTestData();
      break;
    case 'reset':
      rollback.fullReset();
      break;
    default:
      console.log('Usage:');
      console.log('  node rollback-import.js backup');
      console.log('  node rollback-import.js rollback [timestamp]');
      console.log('  node rollback-import.js clean');
      console.log('  node rollback-import.js reset');
  }
}

module.exports = ImportRollback;