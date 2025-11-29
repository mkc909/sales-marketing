/**
 * PinExacto Data Model
 * The wedge product for user acquisition - free location fixing utility
 */

import type { AppLoadContext } from "@remix-run/cloudflare";

export interface Pin {
  id: string;
  tenant_id: number;
  business_id?: number;

  // Core location data
  latitude: number;
  longitude: number;
  address?: string;

  // Pin metadata
  name: string;
  description?: string;
  instructions?: string;

  // Visual verification
  photo_url?: string;
  gate_photo_id?: number;

  // Sharing
  short_code: string;
  share_url: string;
  qr_code_url?: string;

  // Usage tracking
  view_count: number;
  share_count: number;
  navigation_count: number;

  // Verification
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
}

export interface CreatePinInput {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  instructions?: string;
  photo?: File;
  business_id?: number;
}

/**
 * Generate a unique short code for the pin
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new pin
 */
export async function createPin(
  input: CreatePinInput,
  context: AppLoadContext
): Promise<Pin> {
  const db = context.env.DB;
  const tenantId = context.tenant?.id || 1;

  // Generate unique short code
  let shortCode: string;
  let attempts = 0;
  do {
    shortCode = generateShortCode();
    const existing = await db
      .prepare('SELECT id FROM pins WHERE short_code = ?')
      .bind(shortCode)
      .first();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new Error('Failed to generate unique short code');
  }

  // Upload photo if provided
  let photoUrl: string | null = null;
  if (input.photo) {
    const key = `pins/${shortCode}/${input.photo.name}`;
    await context.env.R2.put(key, input.photo.stream());
    photoUrl = `https://cdn.enlacepr.com/${key}`;
  }

  // Create the pin
  const pin = await db
    .prepare(`
      INSERT INTO pins (
        tenant_id, business_id, latitude, longitude, address,
        name, description, instructions, photo_url,
        short_code, share_url, view_count, share_count, navigation_count,
        is_verified, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 0, 0, 0,
        0, datetime('now'), datetime('now')
      ) RETURNING *
    `)
    .bind(
      tenantId,
      input.business_id || null,
      input.latitude,
      input.longitude,
      input.address || null,
      input.name,
      input.description || null,
      input.instructions || null,
      photoUrl,
      shortCode,
      `${context.env.BASE_URL}/pin/${shortCode}`
    )
    .first<Pin>();

  if (!pin) {
    throw new Error('Failed to create pin');
  }

  // Generate QR code asynchronously
  generateQRCode(pin.id, pin.share_url, context).catch(console.error);

  return pin;
}

/**
 * Get a pin by short code
 */
export async function getPinByShortCode(
  shortCode: string,
  context: AppLoadContext
): Promise<Pin | null> {
  const db = context.env.DB;

  const pin = await db
    .prepare(`
      SELECT * FROM pins
      WHERE short_code = ?
      LIMIT 1
    `)
    .bind(shortCode)
    .first<Pin>();

  if (pin) {
    // Update view count and last viewed timestamp
    await db
      .prepare(`
        UPDATE pins
        SET view_count = view_count + 1,
            last_viewed_at = datetime('now')
        WHERE id = ?
      `)
      .bind(pin.id)
      .run();
  }

  return pin;
}

/**
 * Get pins for a business
 */
export async function getBusinessPins(
  businessId: number,
  context: AppLoadContext
): Promise<Pin[]> {
  const db = context.env.DB;

  const { results } = await db
    .prepare(`
      SELECT * FROM pins
      WHERE business_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `)
    .bind(businessId)
    .all<Pin>();

  return results;
}

/**
 * Update pin verification status
 */
export async function verifyPin(
  pinId: string,
  verifiedBy: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare(`
      UPDATE pins
      SET is_verified = 1,
          verified_by = ?,
          verified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(verifiedBy, pinId)
    .run();
}

/**
 * Track pin share
 */
export async function trackPinShare(
  shortCode: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare(`
      UPDATE pins
      SET share_count = share_count + 1
      WHERE short_code = ?
    `)
    .bind(shortCode)
    .run();
}

/**
 * Track pin navigation (when someone clicks to open in maps)
 */
export async function trackPinNavigation(
  shortCode: string,
  context: AppLoadContext
): Promise<void> {
  const db = context.env.DB;

  await db
    .prepare(`
      UPDATE pins
      SET navigation_count = navigation_count + 1
      WHERE short_code = ?
    `)
    .bind(shortCode)
    .run();
}

/**
 * Generate QR code for a pin (async)
 */
async function generateQRCode(
  pinId: string,
  shareUrl: string,
  context: AppLoadContext
): Promise<void> {
  try {
    // Using Cloudflare Workers AI to generate QR code
    // This would be implemented with a QR library or service
    // For now, we'll use a placeholder
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shareUrl)}`;

    await context.env.DB
      .prepare('UPDATE pins SET qr_code_url = ? WHERE id = ?')
      .bind(qrCodeUrl, pinId)
      .run();
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }
}

/**
 * Get popular pins (for discovery)
 */
export async function getPopularPins(
  context: AppLoadContext,
  limit = 10
): Promise<Pin[]> {
  const db = context.env.DB;
  const tenantId = context.tenant?.id || 1;

  const { results } = await db
    .prepare(`
      SELECT * FROM pins
      WHERE tenant_id = ?
        AND is_verified = 1
      ORDER BY (view_count + share_count * 2 + navigation_count * 3) DESC
      LIMIT ?
    `)
    .bind(tenantId, limit)
    .all<Pin>();

  return results;
}