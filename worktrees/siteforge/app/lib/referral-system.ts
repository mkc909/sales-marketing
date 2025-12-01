/**
 * Referral System
 *
 * Growth engineering feature for generating referral codes,
 * tracking attribution, managing rewards, and maintaining leaderboards.
 *
 * Target: 10% referral rate
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

// ============================================================================
// TYPES
// ============================================================================

export interface ReferralCode {
  id: string;
  professionalId: string;
  code: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  totalUses: number;
  totalSignups: number;
  totalConversions: number;
  rewardsEarned: number;
  rewardsPaid: number;
}

export interface ReferralAttribution {
  id: string;
  referralCode: string;
  referrerId: string;
  referredUserId?: string;
  referredProfessionalId?: string;
  attributionType: 'click' | 'signup' | 'conversion';
  ipAddress?: string;
  userAgent?: string;
  referrerUrl?: string;
  landingPage?: string;
  converted: boolean;
  conversionValue?: number;
  conversionDate?: string;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  professionalId: string;
  referralCode: string;
  attributionId: string;
  rewardType: 'credit' | 'cash' | 'discount' | 'feature_unlock';
  rewardAmount: number;
  rewardStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  professionalId: string;
  professionalName?: string;
  period: 'all_time' | 'yearly' | 'monthly' | 'weekly';
  periodStart?: string;
  periodEnd?: string;
  rank: number;
  totalReferrals: number;
  totalConversions: number;
  conversionRate: number;
  totalRewardsEarned: number;
  badgeTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  isTopReferrer: boolean;
  updatedAt: string;
}

// ============================================================================
// REFERRAL CODE GENERATION
// ============================================================================

/**
 * Generate a unique referral code for a professional
 */
export async function generateReferralCode(
  professionalId: string,
  context: AppLoadContext
): Promise<ReferralCode> {
  const db = context.env.DB;

  // Generate a unique code (6 characters alphanumeric)
  const code = generateUniqueCode();
  const id = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Check if professional already has an active code
  const existing = await db
    .prepare('SELECT * FROM referral_codes WHERE professional_id = ? AND is_active = true')
    .bind(professionalId)
    .first<ReferralCode>();

  if (existing) {
    return existing;
  }

  // Create new code
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

  await db
    .prepare(`
      INSERT INTO referral_codes (
        id, professional_id, code, expires_at, is_active,
        total_uses, total_signups, total_conversions,
        rewards_earned, rewards_paid
      ) VALUES (?, ?, ?, ?, true, 0, 0, 0, 0, 0)
    `)
    .bind(id, professionalId, code, expiresAt.toISOString())
    .run();

  const newCode = await db
    .prepare('SELECT * FROM referral_codes WHERE id = ?')
    .bind(id)
    .first<ReferralCode>();

  return newCode!;
}

/**
 * Generate a unique 6-character alphanumeric code
 */
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// ATTRIBUTION TRACKING
// ============================================================================

/**
 * Track a referral click attribution
 */
export async function trackReferralClick(
  referralCode: string,
  context: AppLoadContext,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrerUrl?: string;
    landingPage?: string;
  }
): Promise<ReferralAttribution> {
  const db = context.env.DB;

  // Get referral code details
  const codeData = await db
    .prepare('SELECT * FROM referral_codes WHERE code = ? AND is_active = true')
    .bind(referralCode)
    .first<ReferralCode>();

  if (!codeData) {
    throw new Error('Invalid or inactive referral code');
  }

  const id = `attr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db
    .prepare(`
      INSERT INTO referral_attributions (
        id, referral_code, referrer_id, attribution_type,
        ip_address, user_agent, referrer_url, landing_page,
        converted
      ) VALUES (?, ?, ?, 'click', ?, ?, ?, ?, false)
    `)
    .bind(
      id,
      referralCode,
      codeData.professionalId,
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.referrerUrl || null,
      metadata.landingPage || null
    )
    .run();

  // Increment total uses
  await db
    .prepare('UPDATE referral_codes SET total_uses = total_uses + 1 WHERE code = ?')
    .bind(referralCode)
    .run();

  const attribution = await db
    .prepare('SELECT * FROM referral_attributions WHERE id = ?')
    .bind(id)
    .first<ReferralAttribution>();

  return attribution!;
}

/**
 * Track a referral signup attribution
 */
export async function trackReferralSignup(
  referralCode: string,
  referredProfessionalId: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  const id = `attr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const codeData = await db
    .prepare('SELECT * FROM referral_codes WHERE code = ?')
    .bind(referralCode)
    .first<ReferralCode>();

  if (!codeData) return;

  await db
    .prepare(`
      INSERT INTO referral_attributions (
        id, referral_code, referrer_id, referred_professional_id,
        attribution_type, converted
      ) VALUES (?, ?, ?, ?, 'signup', false)
    `)
    .bind(id, referralCode, codeData.professionalId, referredProfessionalId)
    .run();

  // Update referral code stats
  await db
    .prepare('UPDATE referral_codes SET total_signups = total_signups + 1 WHERE code = ?')
    .bind(referralCode)
    .run();
}

/**
 * Track a referral conversion (paid signup)
 */
export async function trackReferralConversion(
  referralCode: string,
  referredProfessionalId: string,
  conversionValue: number,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  // Find the signup attribution
  const attribution = await db
    .prepare(`
      SELECT * FROM referral_attributions
      WHERE referral_code = ?
        AND referred_professional_id = ?
        AND attribution_type = 'signup'
      LIMIT 1
    `)
    .bind(referralCode, referredProfessionalId)
    .first<ReferralAttribution>();

  if (!attribution) return;

  // Update attribution to converted
  await db
    .prepare(`
      UPDATE referral_attributions
      SET converted = true,
          conversion_value = ?,
          conversion_date = datetime('now')
      WHERE id = ?
    `)
    .bind(conversionValue, attribution.id)
    .run();

  // Update referral code stats
  await db
    .prepare('UPDATE referral_codes SET total_conversions = total_conversions + 1 WHERE code = ?')
    .bind(referralCode)
    .run();

  // Create reward
  await createReferralReward(attribution.referrerId, referralCode, attribution.id, conversionValue, context);
}

// ============================================================================
// REWARD MANAGEMENT
// ============================================================================

/**
 * Create a referral reward
 */
async function createReferralReward(
  professionalId: string,
  referralCode: string,
  attributionId: string,
  conversionValue: number,
  context: AppLoadContext
): Promise<ReferralReward> {
  const db = context.env.DB;

  // Calculate reward (20% of first month subscription or $50, whichever is higher)
  const rewardAmount = Math.max(conversionValue * 0.2, 50);
  const id = `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db
    .prepare(`
      INSERT INTO referral_rewards (
        id, professional_id, referral_code, attribution_id,
        reward_type, reward_amount, reward_status
      ) VALUES (?, ?, ?, ?, 'credit', ?, 'pending')
    `)
    .bind(id, professionalId, referralCode, attributionId, rewardAmount)
    .run();

  // Update total rewards earned
  await db
    .prepare('UPDATE referral_codes SET rewards_earned = rewards_earned + ? WHERE code = ?')
    .bind(rewardAmount, referralCode)
    .run();

  const reward = await db
    .prepare('SELECT * FROM referral_rewards WHERE id = ?')
    .bind(id)
    .first<ReferralReward>();

  return reward!;
}

/**
 * Get pending rewards for a professional
 */
export async function getPendingRewards(
  professionalId: string,
  context: AppLoadContext
): Promise<ReferralReward[]> {
  const db = context.env.DB;

  const result = await db
    .prepare('SELECT * FROM referral_rewards WHERE professional_id = ? AND reward_status = "pending"')
    .bind(professionalId)
    .all<ReferralReward>();

  return result.results;
}

// ============================================================================
// LEADERBOARD
// ============================================================================

/**
 * Get referral leaderboard for a period
 */
export async function getReferralLeaderboard(
  period: 'all_time' | 'yearly' | 'monthly' | 'weekly',
  limit: number = 100,
  context: AppLoadContext
): Promise<LeaderboardEntry[]> {
  const db = context.env.DB;

  const result = await db
    .prepare(`
      SELECT
        l.*,
        p.name as professional_name
      FROM referral_leaderboard l
      JOIN professionals p ON l.professional_id = p.id
      WHERE l.period = ?
      ORDER BY l.rank ASC
      LIMIT ?
    `)
    .bind(period, limit)
    .all<LeaderboardEntry & { professional_name: string }>();

  return result.results.map(entry => ({
    ...entry,
    professionalName: entry.professional_name
  }));
}

/**
 * Update leaderboard rankings (run daily via cron)
 */
export async function updateLeaderboard(
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  // Calculate rankings for each period
  const periods: Array<{ period: string; daysBack: number }> = [
    { period: 'weekly', daysBack: 7 },
    { period: 'monthly', daysBack: 30 },
    { period: 'yearly', daysBack: 365 },
    { period: 'all_time', daysBack: 9999 }
  ];

  for (const { period, daysBack } of periods) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get top referrers
    const topReferrers = await db
      .prepare(`
        SELECT
          rc.professional_id,
          COUNT(DISTINCT CASE WHEN ra.attribution_type = 'signup' THEN ra.id END) as total_referrals,
          COUNT(DISTINCT CASE WHEN ra.converted = true THEN ra.id END) as total_conversions,
          SUM(CASE WHEN rr.reward_status IN ('approved', 'paid') THEN rr.reward_amount ELSE 0 END) as total_rewards
        FROM referral_codes rc
        LEFT JOIN referral_attributions ra ON rc.code = ra.referral_code
        LEFT JOIN referral_rewards rr ON rc.professional_id = rr.professional_id
        WHERE ra.created_at >= ?
        GROUP BY rc.professional_id
        HAVING total_referrals > 0
        ORDER BY total_conversions DESC, total_referrals DESC
        LIMIT 1000
      `)
      .bind(startDate.toISOString())
      .all<{
        professional_id: string;
        total_referrals: number;
        total_conversions: number;
        total_rewards: number;
      }>();

    // Update or insert leaderboard entries
    let rank = 1;
    for (const referrer of topReferrers.results) {
      const conversionRate = referrer.total_referrals > 0
        ? (referrer.total_conversions / referrer.total_referrals) * 100
        : 0;

      const badgeTier = getBadgeTier(referrer.total_conversions);
      const isTopReferrer = rank <= 10;

      const id = `${period}-${referrer.professional_id}`;

      await db
        .prepare(`
          INSERT OR REPLACE INTO referral_leaderboard (
            id, professional_id, period, period_start, period_end,
            rank, total_referrals, total_conversions, conversion_rate,
            total_rewards_earned, badge_tier, is_top_referrer, updated_at
          ) VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(
          id,
          referrer.professional_id,
          period,
          startDate.toISOString(),
          referrer.total_referrals,
          referrer.total_conversions,
          conversionRate,
          referrer.total_rewards,
          badgeTier,
          isTopReferrer ? 1 : 0,
          rank
        )
        .run();

      rank++;
    }
  }
}

/**
 * Determine badge tier based on total conversions
 */
function getBadgeTier(totalConversions: number): string {
  if (totalConversions >= 100) return 'diamond';
  if (totalConversions >= 50) return 'platinum';
  if (totalConversions >= 25) return 'gold';
  if (totalConversions >= 10) return 'silver';
  return 'bronze';
}

// ============================================================================
// REFERRAL ANALYTICS
// ============================================================================

/**
 * Get referral stats for a professional
 */
export async function getReferralStats(
  professionalId: string,
  context: AppLoadContext
): Promise<{
  code: string;
  totalUses: number;
  totalSignups: number;
  totalConversions: number;
  conversionRate: number;
  rewardsEarned: number;
  rewardsPending: number;
  rewardsPaid: number;
  currentRank?: number;
  badgeTier?: string;
}> {
  const db = context.env.DB;

  const code = await db
    .prepare('SELECT * FROM referral_codes WHERE professional_id = ? AND is_active = true')
    .bind(professionalId)
    .first<ReferralCode>();

  if (!code) {
    throw new Error('No active referral code found');
  }

  const pendingRewards = await getPendingRewards(professionalId, context);
  const rewardsPending = pendingRewards.reduce((sum, r) => sum + r.rewardAmount, 0);

  const leaderboard = await db
    .prepare('SELECT * FROM referral_leaderboard WHERE professional_id = ? AND period = "monthly"')
    .bind(professionalId)
    .first<LeaderboardEntry>();

  const conversionRate = code.totalSignups > 0
    ? (code.totalConversions / code.totalSignups) * 100
    : 0;

  return {
    code: code.code,
    totalUses: code.totalUses,
    totalSignups: code.totalSignups,
    totalConversions: code.totalConversions,
    conversionRate,
    rewardsEarned: code.rewardsEarned,
    rewardsPending,
    rewardsPaid: code.rewardsPaid,
    currentRank: leaderboard?.rank,
    badgeTier: leaderboard?.badgeTier
  };
}
