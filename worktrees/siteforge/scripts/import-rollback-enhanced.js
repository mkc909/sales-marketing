#!/usr/bin/env node

/**
 * Enhanced Rollback Script
 *
 * Provides multiple rollback strategies:
 * - Rollback last import (based on timestamps)
 * - Rollback by date range
 * - Rollback by industry
 * - Full database reset
 * - Backup before rollback
 */

import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';

const WRANGLER_DB = 'estateflow-db';
const ENV = 'production';
const BACKUP_DIR = 'backups';

class RollbackManager {
  constructor() {
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  async confirmAction(message) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(`${message} (yes/no): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  executeQuery(query, description) {
    console.log(`\n📝 ${description}...`);

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --env=${ENV} --remote --command="${query}"`,
        { encoding: 'utf-8' }
      );

      console.log(result);
      console.log('✅ Done');
      return result;

    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      throw error;
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${BACKUP_DIR}/backup-${timestamp}.sql`;

    console.log('\n💾 Creating backup before rollback...');

    try {
      // Export current data
      const data = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --env=${ENV} --remote --command="SELECT * FROM professionals;"`,
        { encoding: 'utf-8' }
      );

      fs.writeFileSync(backupFile, data);
      console.log(`✅ Backup created: ${backupFile}`);

      return backupFile;

    } catch (error) {
      console.error(`❌ Backup failed: ${error.message}`);
      throw error;
    }
  }

  async rollbackLastImport(hours = 24) {
    console.log('\n🔄 Rollback Last Import\n');
    console.log(`Rolling back records created in the last ${hours} hours...`);

    // Check how many records will be affected
    const countQuery = `
      SELECT COUNT(*) as count
      FROM professionals
      WHERE created_at >= datetime('now', '-${hours} hours');
    `;

    const countResult = this.executeQuery(countQuery, 'Checking affected records');

    const confirmed = await this.confirmAction(
      '\n⚠️  This will delete these records. Continue?'
    );

    if (!confirmed) {
      console.log('❌ Rollback cancelled');
      return false;
    }

    // Create backup
    await this.createBackup();

    // Execute rollback
    const deleteQuery = `
      DELETE FROM professionals
      WHERE created_at >= datetime('now', '-${hours} hours');
    `;

    this.executeQuery(deleteQuery, 'Rolling back records');

    console.log('\n✅ Rollback completed successfully');
    return true;
  }

  async rollbackByDateRange(startDate, endDate) {
    console.log('\n🔄 Rollback by Date Range\n');
    console.log(`Rolling back records from ${startDate} to ${endDate}...`);

    // Check affected records
    const countQuery = `
      SELECT COUNT(*) as count
      FROM professionals
      WHERE created_at BETWEEN '${startDate}' AND '${endDate}';
    `;

    this.executeQuery(countQuery, 'Checking affected records');

    const confirmed = await this.confirmAction(
      '\n⚠️  This will delete these records. Continue?'
    );

    if (!confirmed) {
      console.log('❌ Rollback cancelled');
      return false;
    }

    // Create backup
    await this.createBackup();

    // Execute rollback
    const deleteQuery = `
      DELETE FROM professionals
      WHERE created_at BETWEEN '${startDate}' AND '${endDate}';
    `;

    this.executeQuery(deleteQuery, 'Rolling back records');

    console.log('\n✅ Rollback completed successfully');
    return true;
  }

  async rollbackByIndustry(industry) {
    console.log(`\n🔄 Rollback by Industry: ${industry}\n`);

    // Check affected records
    const countQuery = `
      SELECT COUNT(*) as count
      FROM professionals
      WHERE industry = '${industry}';
    `;

    this.executeQuery(countQuery, 'Checking affected records');

    const confirmed = await this.confirmAction(
      `\n⚠️  This will delete all ${industry} records. Continue?`
    );

    if (!confirmed) {
      console.log('❌ Rollback cancelled');
      return false;
    }

    // Create backup
    await this.createBackup();

    // Execute rollback
    const deleteQuery = `DELETE FROM professionals WHERE industry = '${industry}';`;

    this.executeQuery(deleteQuery, 'Rolling back records');

    console.log('\n✅ Rollback completed successfully');
    return true;
  }

  async resetDatabase() {
    console.log('\n🔄 Full Database Reset\n');
    console.log('⚠️  WARNING: This will delete ALL data from the professionals table!');

    // Show current count
    this.executeQuery(
      'SELECT COUNT(*) as total FROM professionals;',
      'Current record count'
    );

    const confirmed = await this.confirmAction(
      '\n⚠️  Are you ABSOLUTELY SURE you want to delete all data?'
    );

    if (!confirmed) {
      console.log('❌ Reset cancelled');
      return false;
    }

    // Create backup
    await this.createBackup();

    // Execute reset
    this.executeQuery('DELETE FROM professionals;', 'Deleting all records');

    // Reset auto-increment (if applicable)
    this.executeQuery(
      'DELETE FROM sqlite_sequence WHERE name = "professionals";',
      'Resetting auto-increment'
    );

    console.log('\n✅ Database reset completed');
    console.log('💾 Backup saved in:', BACKUP_DIR);

    return true;
  }

  async showStatus() {
    console.log('\n📊 Database Status\n');
    console.log('='.repeat(60));

    // Total records
    this.executeQuery(
      'SELECT COUNT(*) as total_records FROM professionals;',
      'Total Records'
    );

    // By industry
    this.executeQuery(
      `SELECT
        industry,
        COUNT(*) as count,
        MIN(created_at) as first_import,
        MAX(created_at) as last_import
      FROM professionals
      GROUP BY industry;`,
      'Records by Industry'
    );

    // Recent imports
    this.executeQuery(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as records
      FROM professionals
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7;`,
      'Recent Imports (Last 7 Days)'
    );

    // Backups
    console.log('\n💾 Available Backups:');
    const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));

    if (backups.length === 0) {
      console.log('   No backups found');
    } else {
      backups.forEach(backup => {
        const stats = fs.statSync(`${BACKUP_DIR}/${backup}`);
        console.log(`   - ${backup} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new RollbackManager();

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Enhanced Rollback Script

Usage:
  node import-rollback-enhanced.js <command> [options]

Commands:
  status              Show current database status and backups
  last [hours]        Rollback last import (default: 24 hours)
  date <start> <end>  Rollback by date range (YYYY-MM-DD format)
  industry <name>     Rollback specific industry
  reset               Full database reset (delete all data)
  backup              Create backup only

Examples:
  node import-rollback-enhanced.js status
  node import-rollback-enhanced.js last
  node import-rollback-enhanced.js last 48
  node import-rollback-enhanced.js date 2025-11-01 2025-11-15
  node import-rollback-enhanced.js industry real_estate
  node import-rollback-enhanced.js reset
  node import-rollback-enhanced.js backup
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'status':
        await manager.showStatus();
        break;

      case 'last':
        const hours = parseInt(args[1]) || 24;
        await manager.rollbackLastImport(hours);
        break;

      case 'date':
        if (!args[1] || !args[2]) {
          console.error('❌ Error: Please provide start and end dates');
          console.log('Usage: node import-rollback-enhanced.js date <start> <end>');
          process.exit(1);
        }
        await manager.rollbackByDateRange(args[1], args[2]);
        break;

      case 'industry':
        if (!args[1]) {
          console.error('❌ Error: Please provide industry name');
          console.log('Usage: node import-rollback-enhanced.js industry <name>');
          process.exit(1);
        }
        await manager.rollbackByIndustry(args[1]);
        break;

      case 'reset':
        await manager.resetDatabase();
        break;

      case 'backup':
        await manager.createBackup();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run with --help for usage information');
        process.exit(1);
    }

    console.log('\n✨ Operation completed successfully\n');

  } catch (error) {
    console.error('\n💥 Operation failed:', error.message);
    process.exit(1);
  }
}

main();
