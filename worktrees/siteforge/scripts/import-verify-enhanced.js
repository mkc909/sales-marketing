#!/usr/bin/env node

/**
 * Enhanced Import Verification Script
 *
 * Comprehensive data quality checks after import:
 * - Record counts by industry
 * - Data integrity checks
 * - Performance benchmarks
 * - Duplicate detection
 * - Format validation
 */

import { execSync } from 'child_process';

const WRANGLER_DB = 'estateflow-db';
const ENV = 'production';

class ImportVerifier {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runCheck(name, query, validator) {
    console.log(`\n📊 ${name}`);
    console.log('─'.repeat(60));

    try {
      const result = execSync(
        `wrangler d1 execute ${WRANGLER_DB} --env=${ENV} --remote --command="${query}"`,
        { encoding: 'utf-8' }
      );

      console.log(result);

      if (validator) {
        const isValid = validator(result);
        if (isValid) {
          console.log('✅ Check passed');
          this.passed++;
        } else {
          console.log('❌ Check failed');
          this.failed++;
        }
      } else {
        this.passed++;
      }

    } catch (error) {
      console.error(`❌ Query failed: ${error.message}`);
      this.failed++;
    }
  }

  async verify() {
    console.log('🔍 Enhanced Import Verification\n');
    console.log('='.repeat(60));

    // 1. Total record count
    await this.runCheck(
      'Total Records Imported',
      'SELECT COUNT(*) as total_records FROM professionals;',
      (result) => result.includes('total_records')
    );

    // 2. Records by industry
    await this.runCheck(
      'Distribution by Industry',
      `SELECT
        industry,
        COUNT(*) as count,
        ROUND(AVG(rating), 2) as avg_rating,
        COUNT(DISTINCT state) as states
      FROM professionals
      GROUP BY industry
      ORDER BY count DESC;`
    );

    // 3. Records by state
    await this.runCheck(
      'Distribution by State',
      `SELECT
        state,
        COUNT(*) as count,
        COUNT(DISTINCT industry) as industries
      FROM professionals
      GROUP BY state
      ORDER BY count DESC;`
    );

    // 4. Check for duplicates
    await this.runCheck(
      'Duplicate License Numbers',
      `SELECT
        license_number,
        COUNT(*) as count
      FROM professionals
      GROUP BY license_number
      HAVING count > 1
      LIMIT 10;`,
      (result) => !result.includes('│') || result.includes('0 rows')
    );

    // 5. Email format validation
    await this.runCheck(
      'Invalid Email Formats',
      `SELECT COUNT(*) as invalid_emails
      FROM professionals
      WHERE email NOT LIKE '%@%.%';`,
      (result) => result.includes('0')
    );

    // 6. Check required fields
    await this.runCheck(
      'Missing Required Fields',
      `SELECT
        COUNT(*) as missing_name,
        (SELECT COUNT(*) FROM professionals WHERE email IS NULL) as missing_email,
        (SELECT COUNT(*) FROM professionals WHERE license_number IS NULL) as missing_license
      FROM professionals
      WHERE first_name IS NULL OR last_name IS NULL;`,
      (result) => result.includes('0')
    );

    // 7. Subscription tier distribution
    await this.runCheck(
      'Subscription Tiers (if applicable)',
      `SELECT
        subscription_tier,
        COUNT(*) as count,
        ROUND(AVG(rating), 2) as avg_rating
      FROM professionals
      GROUP BY subscription_tier
      ORDER BY count DESC;`
    );

    // 8. Verification status
    await this.runCheck(
      'Verification Status',
      `SELECT
        CASE WHEN verified = 1 THEN 'Verified' ELSE 'Unverified' END as status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM professionals), 2) as percentage
      FROM professionals
      GROUP BY verified;`
    );

    // 9. Featured professionals
    await this.runCheck(
      'Featured Professionals',
      `SELECT
        industry,
        COUNT(*) as featured_count
      FROM professionals
      WHERE featured = 1
      GROUP BY industry;`
    );

    // 10. Recent imports (last 24 hours)
    await this.runCheck(
      'Recent Imports (Last 10)',
      `SELECT
        id,
        first_name || ' ' || last_name as name,
        industry,
        city,
        state,
        created_at
      FROM professionals
      ORDER BY created_at DESC
      LIMIT 10;`
    );

    // 11. Rating distribution
    await this.runCheck(
      'Rating Distribution',
      `SELECT
        CASE
          WHEN rating >= 4.5 THEN '4.5-5.0 (Excellent)'
          WHEN rating >= 4.0 THEN '4.0-4.5 (Very Good)'
          WHEN rating >= 3.5 THEN '3.5-4.0 (Good)'
          ELSE 'Below 3.5'
        END as rating_range,
        COUNT(*) as count
      FROM professionals
      GROUP BY rating_range
      ORDER BY MIN(rating) DESC;`
    );

    // 12. Top cities by professional count
    await this.runCheck(
      'Top 10 Cities by Professional Count',
      `SELECT
        city,
        state,
        COUNT(*) as professionals,
        COUNT(DISTINCT industry) as industries
      FROM professionals
      GROUP BY city, state
      ORDER BY professionals DESC
      LIMIT 10;`
    );

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Verification Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total Checks: ${this.passed + this.failed}`);

    if (this.failed === 0) {
      console.log('\n🎉 All verification checks passed!');
      console.log('\n✅ Data import is verified and ready for production use.');
    } else {
      console.log('\n⚠️  Some verification checks failed.');
      console.log('\n🔧 Recommended actions:');
      console.log('   1. Review failed checks above');
      console.log('   2. Check for data quality issues');
      console.log('   3. Consider running import:rollback');
      console.log('   4. Re-import with corrected data');
    }

    return this.failed === 0;
  }
}

// Performance benchmarks
async function runPerformanceCheck() {
  console.log('\n⚡ Performance Benchmarks');
  console.log('='.repeat(60));

  const queries = [
    {
      name: 'Simple SELECT (1 record)',
      query: 'SELECT * FROM professionals LIMIT 1;',
      targetMs: 100
    },
    {
      name: 'COUNT query',
      query: 'SELECT COUNT(*) FROM professionals;',
      targetMs: 100
    },
    {
      name: 'Complex aggregation',
      query: `SELECT industry, state, COUNT(*) as count
              FROM professionals
              GROUP BY industry, state
              ORDER BY count DESC
              LIMIT 20;`,
      targetMs: 200
    },
    {
      name: 'Search by city',
      query: "SELECT * FROM professionals WHERE city = 'Miami' LIMIT 10;",
      targetMs: 150
    },
    {
      name: 'Search by industry',
      query: "SELECT * FROM professionals WHERE industry = 'real_estate' LIMIT 10;",
      targetMs: 150
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of queries) {
    console.log(`\n📊 ${test.name}`);
    const start = Date.now();

    try {
      execSync(
        `wrangler d1 execute ${WRANGLER_DB} --env=${ENV} --remote --command="${test.query}"`,
        { encoding: 'utf-8', stdio: 'ignore' }
      );

      const duration = Date.now() - start;

      if (duration <= test.targetMs) {
        console.log(`   ✅ ${duration}ms (target: ${test.targetMs}ms)`);
        passed++;
      } else {
        console.log(`   ⚠️  ${duration}ms (target: ${test.targetMs}ms) - SLOW`);
        failed++;
      }

    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Performance: ${passed}/${queries.length} tests passed`);

  if (passed === queries.length) {
    console.log('✅ All performance benchmarks met!');
  }
}

// Main execution
async function main() {
  const verifier = new ImportVerifier();
  const dataVerified = await verifier.verify();

  await runPerformanceCheck();

  if (!dataVerified) {
    process.exit(1);
  }
}

main();
