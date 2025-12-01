/**
 * Viral Loops System
 *
 * Growth engineering features to create viral growth mechanisms:
 * - Powered By branding for free tier
 * - Share incentives
 * - Network invitations
 * - Success story amplification
 *
 * Target: K-factor > 0.5
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

// ============================================================================
// TYPES
// ============================================================================

export interface ShareEvent {
  id: string;
  sharerType: 'professional' | 'user' | 'anonymous';
  sharerId?: string;
  contentType: 'profile' | 'pin' | 'success_story' | 'tool_result';
  contentId: string;
  shareMethod: 'whatsapp' | 'facebook' | 'twitter' | 'email' | 'sms' | 'copy_link';
  shareUrl: string;
  pageUrl?: string;
  userAgent?: string;
  viralCoefficient?: number;
  clicksGenerated: number;
  signupsGenerated: number;
  createdAt: string;
}

export interface NetworkInvitation {
  id: string;
  inviterProfessionalId: string;
  inviterName: string;
  inviteeEmail: string;
  inviteePhone?: string;
  inviteeName?: string;
  invitationType: 'colleague' | 'referral_partner' | 'team_member';
  personalMessage?: string;
  status: 'sent' | 'opened' | 'clicked' | 'signed_up' | 'expired';
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  signedUpAt?: string;
  expiresAt: string;
  convertedProfessionalId?: string;
}

export interface SuccessStory {
  id: string;
  professionalId: string;
  title: string;
  storyText: string;
  storyType: 'lead_conversion' | 'tool_success' | 'profile_claim' | 'revenue_milestone';
  metricValue?: number;
  metricLabel?: string;
  imageUrl?: string;
  videoUrl?: string;
  isFeatured: boolean;
  featuredUntil?: string;
  shareCount: number;
  viewCount: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// ============================================================================
// SHARE TRACKING
// ============================================================================

/**
 * Track a share event
 */
export async function trackShareEvent(
  event: {
    sharerType: 'professional' | 'user' | 'anonymous';
    sharerId?: string;
    contentType: 'profile' | 'pin' | 'success_story' | 'tool_result';
    contentId: string;
    shareMethod: 'whatsapp' | 'facebook' | 'twitter' | 'email' | 'sms' | 'copy_link';
    shareUrl: string;
    pageUrl?: string;
    userAgent?: string;
  },
  context: AppLoadContext
): Promise<ShareEvent> {
  const db = context.env.DB;
  const id = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db
    .prepare(`
      INSERT INTO share_events (
        id, sharer_type, sharer_id, content_type, content_id,
        share_method, share_url, page_url, user_agent,
        clicks_generated, signups_generated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `)
    .bind(
      id,
      event.sharerType,
      event.sharerId || null,
      event.contentType,
      event.contentId,
      event.shareMethod,
      event.shareUrl,
      event.pageUrl || null,
      event.userAgent || null
    )
    .run();

  const shareEvent = await db
    .prepare('SELECT * FROM share_events WHERE id = ?')
    .bind(id)
    .first<ShareEvent>();

  return shareEvent!;
}

/**
 * Generate shareable URLs with tracking
 */
export function generateShareUrl(
  baseUrl: string,
  sharerInfo: {
    type: 'professional' | 'user' | 'anonymous';
    id?: string;
  },
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  }
): string {
  const url = new URL(baseUrl);

  // Add tracking parameters
  if (sharerInfo.id) {
    url.searchParams.set('ref', sharerInfo.id);
  }
  url.searchParams.set('ref_type', sharerInfo.type);

  // Add UTM parameters
  if (utmParams?.source) url.searchParams.set('utm_source', utmParams.source);
  if (utmParams?.medium) url.searchParams.set('utm_medium', utmParams.medium);
  if (utmParams?.campaign) url.searchParams.set('utm_campaign', utmParams.campaign);

  return url.toString();
}

/**
 * Get share templates for different platforms
 */
export function getShareTemplates(
  contentType: 'profile' | 'pin' | 'success_story' | 'tool_result',
  contentDetails: {
    title: string;
    description?: string;
    url: string;
  }
): Record<string, { text: string; url: string }> {
  const encodedUrl = encodeURIComponent(contentDetails.url);
  const encodedText = encodeURIComponent(contentDetails.title);

  return {
    whatsapp: {
      text: `${contentDetails.title}\n\n${contentDetails.description || ''}\n\nCheck it out: ${contentDetails.url}`,
      url: `https://wa.me/?text=${encodeURIComponent(`${contentDetails.title}\n\n${contentDetails.url}`)}`
    },
    facebook: {
      text: contentDetails.title,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    twitter: {
      text: contentDetails.title,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    linkedin: {
      text: contentDetails.title,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    },
    email: {
      text: contentDetails.title,
      url: `mailto:?subject=${encodedText}&body=${encodeURIComponent(contentDetails.description || '')}\n\n${encodedUrl}`
    }
  };
}

// ============================================================================
// POWERED BY BRANDING
// ============================================================================

/**
 * Track Powered By click (viral loop for free tier)
 */
export async function trackPoweredByClick(
  sourceProfessionalId: string,
  sourceUrl: string,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrerUrl?: string;
  },
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;
  const id = `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db
    .prepare(`
      INSERT INTO powered_by_clicks (
        id, source_professional_id, source_url,
        ip_address, user_agent, referrer_url,
        viewed_pricing, signed_up
      ) VALUES (?, ?, ?, ?, ?, ?, false, false)
    `)
    .bind(
      id,
      sourceProfessionalId,
      sourceUrl,
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.referrerUrl || null
    )
    .run();
}

/**
 * Update Powered By conversion tracking
 */
export async function trackPoweredByConversion(
  clickId: string,
  convertedProfessionalId: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare(`
      UPDATE powered_by_clicks
      SET signed_up = true,
          converted_professional_id = ?
      WHERE id = ?
    `)
    .bind(convertedProfessionalId, clickId)
    .run();
}

// ============================================================================
// NETWORK INVITATIONS
// ============================================================================

/**
 * Send network invitation
 */
export async function sendNetworkInvitation(
  invitation: {
    inviterProfessionalId: string;
    inviterName: string;
    inviteeEmail: string;
    inviteePhone?: string;
    inviteeName?: string;
    invitationType: 'colleague' | 'referral_partner' | 'team_member';
    personalMessage?: string;
  },
  context: AppLoadContext
): Promise<NetworkInvitation> {
  const db = context.env.DB;
  const id = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Check if already invited
  const existing = await db
    .prepare('SELECT * FROM network_invitations WHERE inviter_professional_id = ? AND invitee_email = ?')
    .bind(invitation.inviterProfessionalId, invitation.inviteeEmail)
    .first<NetworkInvitation>();

  if (existing && existing.status !== 'expired') {
    return existing;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days to accept

  await db
    .prepare(`
      INSERT INTO network_invitations (
        id, inviter_professional_id, inviter_name,
        invitee_email, invitee_phone, invitee_name,
        invitation_type, personal_message, status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)
    `)
    .bind(
      id,
      invitation.inviterProfessionalId,
      invitation.inviterName,
      invitation.inviteeEmail,
      invitation.inviteePhone || null,
      invitation.inviteeName || null,
      invitation.invitationType,
      invitation.personalMessage || null,
      expiresAt.toISOString()
    )
    .run();

  const newInvitation = await db
    .prepare('SELECT * FROM network_invitations WHERE id = ?')
    .bind(id)
    .first<NetworkInvitation>();

  // TODO: Send actual email via Cloudflare Email Workers or external service

  return newInvitation!;
}

/**
 * Track invitation status updates
 */
export async function updateInvitationStatus(
  invitationId: string,
  status: 'opened' | 'clicked' | 'signed_up',
  convertedProfessionalId?: string,
  context?: AppLoadContext
): Promise<void> {
  const db = context!.env.DB;

  const statusColumn = status === 'opened' ? 'opened_at'
    : status === 'clicked' ? 'clicked_at'
    : 'signed_up_at';

  let query = `UPDATE network_invitations SET status = ?, ${statusColumn} = datetime('now')`;
  let bindings = [status, invitationId];

  if (convertedProfessionalId) {
    query += ', converted_professional_id = ? WHERE id = ?';
    bindings = [status, convertedProfessionalId, invitationId];
  } else {
    query += ' WHERE id = ?';
  }

  await db.prepare(query).bind(...bindings).run();
}

// ============================================================================
// SUCCESS STORIES
// ============================================================================

/**
 * Submit a success story
 */
export async function submitSuccessStory(
  story: {
    professionalId: string;
    title: string;
    storyText: string;
    storyType: 'lead_conversion' | 'tool_success' | 'profile_claim' | 'revenue_milestone';
    metricValue?: number;
    metricLabel?: string;
    imageUrl?: string;
    videoUrl?: string;
  },
  context: AppLoadContext
): Promise<SuccessStory> {
  const db = context.env.DB;
  const id = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db
    .prepare(`
      INSERT INTO success_stories (
        id, professional_id, title, story_text, story_type,
        metric_value, metric_label, image_url, video_url,
        is_featured, share_count, view_count, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, 0, 0, 'pending')
    `)
    .bind(
      id,
      story.professionalId,
      story.title,
      story.storyText,
      story.storyType,
      story.metricValue || null,
      story.metricLabel || null,
      story.imageUrl || null,
      story.videoUrl || null
    )
    .run();

  const newStory = await db
    .prepare('SELECT * FROM success_stories WHERE id = ?')
    .bind(id)
    .first<SuccessStory>();

  return newStory!;
}

/**
 * Get featured success stories
 */
export async function getFeaturedSuccessStories(
  limit: number = 10,
  context: AppLoadContext
): Promise<SuccessStory[]> {
  const db = context.env.DB;

  const result = await db
    .prepare(`
      SELECT * FROM success_stories
      WHERE status = 'approved'
        AND (is_featured = true OR featured_until > datetime('now'))
      ORDER BY share_count DESC, view_count DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<SuccessStory>();

  return result.results;
}

/**
 * Increment success story view count
 */
export async function incrementStoryView(
  storyId: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare('UPDATE success_stories SET view_count = view_count + 1 WHERE id = ?')
    .bind(storyId)
    .run();
}

/**
 * Increment success story share count
 */
export async function incrementStoryShare(
  storyId: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare('UPDATE success_stories SET share_count = share_count + 1 WHERE id = ?')
    .bind(storyId)
    .run();
}

// ============================================================================
// VIRAL COEFFICIENT CALCULATION
// ============================================================================

/**
 * Calculate K-factor (viral coefficient)
 * K = (# invites sent per user) × (conversion rate)
 * Target: K > 0.5 for sustainable viral growth
 */
export async function calculateKFactor(
  timeframeDays: number,
  context: AppLoadContext
): Promise<number> {
  const db = context.env.DB;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframeDays);

  // Get total professionals who joined in timeframe
  const newProfessionals = await db
    .prepare('SELECT COUNT(*) as count FROM professionals WHERE created_at >= ?')
    .bind(startDate.toISOString())
    .first<{ count: number }>();

  // Get total shares from those professionals
  const totalShares = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM share_events
      WHERE sharer_type = 'professional'
        AND created_at >= ?
    `)
    .bind(startDate.toISOString())
    .first<{ count: number }>();

  // Get signups generated from shares
  const shareSignups = await db
    .prepare(`
      SELECT SUM(signups_generated) as total
      FROM share_events
      WHERE created_at >= ?
    `)
    .bind(startDate.toISOString())
    .first<{ total: number }>();

  const avgInvitesPerUser = newProfessionals!.count > 0
    ? totalShares!.count / newProfessionals!.count
    : 0;

  const conversionRate = totalShares!.count > 0
    ? (shareSignups?.total || 0) / totalShares!.count
    : 0;

  const kFactor = avgInvitesPerUser * conversionRate;

  return Math.round(kFactor * 1000) / 1000; // Round to 3 decimals
}
