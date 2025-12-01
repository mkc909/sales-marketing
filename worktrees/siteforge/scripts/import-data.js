#!/usr/bin/env node

/**
 * ProGeoData Progressive Import Script
 *
 * Safely imports test data with verification, rollback, and progress tracking.
 * Follows progressive testing methodology to prevent quota exhaustion.
 *
 * Usage:
 *   npm run import:test      # Import 10 test records
 *   npm run import:small     # Import 100 records
 *   npm run import:medium    # Import 1,000 records
 *   npm run import:large     # Import 10,000 records
 *   npm run import:verify    # Verify import results
 *   npm run import:rollback  # Rollback last import
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  databaseName: 'estateflow-db',
  dataDir: path.join(__dirname, '..', 'data'),
  backupDir: path.join(__dirname, '..', 'backups'),
  logFile: path.join(__dirname, '..', 'import-log.json')
};

const IMPORT_LEVELS = {
  test: {
    file: 'test-10.sql',
    description: 'Test import (10 records)',
    expectedCount: 10,
    maxDuration: 30000 // 30 seconds
  },
  small: {
    file: 'small-100.sql',
    description: 'Small batch (100 records)',
    expectedCount: 100,
    maxDuration: 60000 // 1 minute
  },
  medium: {
    file: 'medium-1000.sql',
    description: 'Medium batch (1,000 records)',
    expectedCount: 1000,
    maxDuration: 300000 // 5 minutes
  },
  large: {
    file: 'large-10000.sql',
    description: 'Large batch (10,000 records)',
    expectedCount: 10000,
    maxDuration: 900000 // 15 minutes
  }
};

// ============================================================================
// LOGGING
// ============================================================================

function loadLog() {
  if (fs.existsSync(CONFIG.logFile)) {
    return JSON.parse(fs.readFileSync(CONFIG.logFile, 'utf8'));
  }
  return { imports: [], backups: [] };
}

function saveLog(log) {
  fs.writeFileSync(CONFIG.logFile, JSON.stringify(log, null, 2), 'utf8');
}

function logImport(level, success, details) {
  const log = loadLog();
  log.imports.push({
    timestamp: new Date().toISOString(),
    level,
    success,
    ...details
  });
  saveLog(log);
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

function execWrangler(command, silent = false) {
  try {
    const output = execSync(`wrangler ${command}`, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr
    };
  }
}

function getRecordCount() {
  console.log('📊 Querying database...');
  const result = execWrangler(
    `d1 execute ${CONFIG.databaseName} --command="SELECT COUNT(*) as count FROM professionals;"`,
    true
  );

  if (!result.success) {
    throw new Error('Failed to query database: ' + result.error);
  }

  // Parse wrangler output
  const match = result.output.match(/count[|\s]+(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  throw new Error('Could not parse record count from output');
}

function getIndustryDistribution() {
  console.log('📊 Analyzing distribution...');
  const result = execWrangler(
    `d1 execute ${CONFIG.databaseName} --command="SELECT industry, COUNT(*) as count FROM professionals GROUP BY industry ORDER BY industry;"`,
    true
  );

  if (!result.success) {
    return null;
  }

  // Parse distribution from output
  const distribution = {};
  const lines = result.output.split('\n');
  lines.forEach(line => {
    const match = line.match(/(\w+)\s+[|\s]+(\d+)/);
    if (match) {
      distribution[match[1]] = parseInt(match[2], 10);
    }
  });

  return distribution;
}

function createBackup(label) {
  console.log('💾 Creating backup...');

  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(CONFIG.backupDir, `backup-${label}-${timestamp}.sql`);

  // Export current data
  const result = execWrangler(
    `d1 export ${CONFIG.databaseName} --output="${backupFile}"`,
    true
  );

  if (result.success) {
    const log = loadLog();
    log.backups.push({
      timestamp: new Date().toISOString(),
      label,
      file: backupFile
    });
    saveLog(log);

    console.log(`   ✅ Backup created: ${backupFile}`);
    return backupFile;
  } else {
    console.warn('   ⚠️  Backup failed (continuing anyway)');
    return null;
  }
}

function executeSQL(filepath) {
  console.log(`📥 Executing SQL: ${path.basename(filepath)}`);

  const result = execWrangler(
    `d1 execute ${CONFIG.databaseName} --file="${filepath}"`
  );

  return result.success;
}

// ============================================================================
// VERIFICATION
// ============================================================================

function verifyImport(level, preCount) {
  console.log('\n🔍 Verifying import...\n');

  const levelConfig = IMPORT_LEVELS[level];
  const postCount = getRecordCount();
  const imported = postCount - preCount;

  console.log(`   Pre-import:  ${preCount.toLocaleString()} records`);
  console.log(`   Post-import: ${postCount.toLocaleString()} records`);
  console.log(`   Imported:    ${imported.toLocaleString()} records`);
  console.log(`   Expected:    ${levelConfig.expectedCount.toLocaleString()} records\n`);

  if (imported !== levelConfig.expectedCount) {
    console.error(`   ❌ Import count mismatch!`);
    console.error(`   Expected ${levelConfig.expectedCount} but imported ${imported}\n`);
    return false;
  }

  // Check distribution
  const distribution = getIndustryDistribution();
  if (distribution) {
    console.log('   Industry Distribution:');
    Object.entries(distribution).forEach(([industry, count]) => {
      console.log(`      ${industry.padEnd(15)} ${count.toString().padStart(6)} records`);
    });
    console.log('');
  }

  console.log('   ✅ Import verification passed!\n');
  return true;
}

// ============================================================================
// IMPORT LEVELS
// ============================================================================

function importLevel(level) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  ProGeoData Progressive Import - ${level.toUpperCase().padEnd(33)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const levelConfig = IMPORT_LEVELS[level];
  if (!levelConfig) {
    console.error(`❌ Unknown import level: ${level}`);
    console.error(`Available levels: ${Object.keys(IMPORT_LEVELS).join(', ')}\n`);
    process.exit(1);
  }

  const filepath = path.join(CONFIG.dataDir, levelConfig.file);

  // Check file exists
  if (!fs.existsSync(filepath)) {
    console.error(`❌ SQL file not found: ${filepath}`);
    console.error(`\nRun: npm run generate-data\n`);
    process.exit(1);
  }

  console.log(`📋 Import Level: ${levelConfig.description}`);
  console.log(`📁 SQL File: ${levelConfig.file}`);
  console.log(`📊 Expected Records: ${levelConfig.expectedCount.toLocaleString()}\n`);

  // Get pre-import count
  const preCount = getRecordCount();
  console.log(`   Current records: ${preCount.toLocaleString()}\n`);

  // Create backup
  const backupFile = createBackup(level);

  // Confirm import
  console.log('\n⚠️  Ready to import. This will modify the database.\n');

  // Execute import
  const startTime = Date.now();
  const success = executeSQL(filepath);
  const duration = Date.now() - startTime;

  if (!success) {
    console.error('\n❌ Import failed!\n');
    logImport(level, false, { preCount, duration, backupFile });
    process.exit(1);
  }

  console.log(`\n✅ SQL executed successfully (${(duration / 1000).toFixed(1)}s)\n`);

  // Verify import
  const verified = verifyImport(level, preCount);

  // Log result
  const postCount = getRecordCount();
  logImport(level, verified, {
    preCount,
    postCount,
    imported: postCount - preCount,
    expected: levelConfig.expectedCount,
    duration,
    backupFile
  });

  if (verified) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ IMPORT SUCCESSFUL                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Suggest next step
    const levels = Object.keys(IMPORT_LEVELS);
    const currentIndex = levels.indexOf(level);
    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      console.log(`🔄 Next step: npm run import:${nextLevel}\n`);
    } else {
      console.log('🎉 All import levels complete!\n');
    }
  } else {
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                    ❌ IMPORT FAILED                         ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error(`💾 Backup available: ${backupFile}`);
    console.error(`🔄 Rollback: npm run import:rollback\n`);
    process.exit(1);
  }
}

// ============================================================================
// VERIFY COMMAND
// ============================================================================

function verifyDatabase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Database Verification Report                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const totalCount = getRecordCount();
    console.log(`📊 Total Records: ${totalCount.toLocaleString()}\n`);

    const distribution = getIndustryDistribution();
    if (distribution) {
      console.log('📈 Industry Distribution:\n');
      Object.entries(distribution).forEach(([industry, count]) => {
        const percentage = ((count / totalCount) * 100).toFixed(1);
        console.log(`   ${industry.padEnd(15)} ${count.toString().padStart(6)} (${percentage}%)`);
      });
      console.log('');
    }

    // Check for data quality issues
    console.log('🔍 Data Quality Checks:\n');

    const checks = [
      {
        name: 'Unique IDs',
        query: 'SELECT COUNT(DISTINCT id) as unique_ids, COUNT(*) as total FROM professionals;'
      },
      {
        name: 'Valid Emails',
        query: `SELECT COUNT(*) as count FROM professionals WHERE email LIKE '%@%.%';`
      },
      {
        name: 'Valid Phones',
        query: `SELECT COUNT(*) as count FROM professionals WHERE phone LIKE '(%)%-%';`
      },
      {
        name: 'Active Professionals',
        query: `SELECT COUNT(*) as count FROM professionals WHERE active = 1;`
      }
    ];

    checks.forEach(check => {
      const result = execWrangler(
        `d1 execute ${CONFIG.databaseName} --command="${check.query}"`,
        true
      );

      if (result.success) {
        const match = result.output.match(/(\d+)/);
        const count = match ? parseInt(match[1], 10) : 0;
        const status = count === totalCount ? '✅' : '⚠️';
        console.log(`   ${status} ${check.name}: ${count.toLocaleString()}`);
      }
    });

    console.log('\n✅ Verification complete\n');

  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}\n`);
    process.exit(1);
  }
}

// ============================================================================
// ROLLBACK COMMAND
// ============================================================================

function rollbackImport() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  Database Rollback                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const log = loadLog();

  if (!log.backups || log.backups.length === 0) {
    console.error('❌ No backups available for rollback\n');
    process.exit(1);
  }

  const lastBackup = log.backups[log.backups.length - 1];
  console.log(`💾 Last Backup: ${lastBackup.label}`);
  console.log(`📅 Created: ${lastBackup.timestamp}`);
  console.log(`📁 File: ${lastBackup.file}\n`);

  if (!fs.existsSync(lastBackup.file)) {
    console.error(`❌ Backup file not found: ${lastBackup.file}\n`);
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will restore the database to the backup state.');
  console.log('   All data imported after the backup will be lost.\n');

  // Note: Actual rollback would require DROP TABLE and re-import
  console.log('🔄 To rollback manually:');
  console.log(`   1. wrangler d1 execute ${CONFIG.databaseName} --command="DELETE FROM professionals;"`);
  console.log(`   2. wrangler d1 execute ${CONFIG.databaseName} --file="${lastBackup.file}"\n`);

  console.log('⚠️  Automated rollback not implemented for safety.');
  console.log('   Use the manual steps above if rollback is needed.\n');
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function showUsage() {
  console.log('ProGeoData Progressive Import Tool\n');
  console.log('Usage:');
  console.log('  npm run import:test      Import 10 test records');
  console.log('  npm run import:small     Import 100 records');
  console.log('  npm run import:medium    Import 1,000 records');
  console.log('  npm run import:large     Import 10,000 records');
  console.log('  npm run import:verify    Verify database contents');
  console.log('  npm run import:rollback  Show rollback instructions\n');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    showUsage();
    process.exit(1);
  }

  switch (command) {
    case 'test':
    case 'small':
    case 'medium':
    case 'large':
      importLevel(command);
      break;

    case 'verify':
      verifyDatabase();
      break;

    case 'rollback':
      rollbackImport();
      break;

    default:
      console.error(`❌ Unknown command: ${command}\n`);
      showUsage();
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  importLevel,
  verifyDatabase,
  rollbackImport
};
