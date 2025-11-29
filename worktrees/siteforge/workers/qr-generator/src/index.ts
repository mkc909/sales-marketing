/**
 * EstateFlow QR Code Generator
 * Cloudflare Worker for dynamic QR codes on yard signs
 *
 * The genius: QR pattern never changes, destination updates dynamically
 */

import QRCode from 'qrcode';

export interface Env {
  LINKS: KVNamespace;
  DB: D1Database;
  ADMIN_KEY: string;
}

interface QRRequest {
  agentId: string;
  purpose: 'yard_sign' | 'business_card' | 'flyer' | 'open_house';
  property?: string;
  destination: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: Generate new QR code
    if (url.pathname === '/generate' && request.method === 'POST') {
      return handleGenerateQR(request, env, corsHeaders);
    }

    // Route: Get QR code image
    if (url.pathname.startsWith('/qr/') && request.method === 'GET') {
      return handleGetQR(request, env, corsHeaders);
    }

    // Route: Update QR destination
    if (url.pathname === '/update' && request.method === 'PUT') {
      return handleUpdateDestination(request, env, corsHeaders);
    }

    // Route: Get QR analytics
    if (url.pathname.startsWith('/analytics/') && request.method === 'GET') {
      return handleGetAnalytics(request, env, corsHeaders);
    }

    return new Response('Not found', {
      status: 404,
      headers: corsHeaders
    });
  }
};

/**
 * Generate a new QR code
 */
async function handleGenerateQR(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const body: QRRequest = await request.json();

    // Validate agent
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.includes(body.agentId)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      });
    }

    // Generate unique QR ID
    const qrId = generateQRId(body.agentId, body.purpose);

    // Create shortlink for this QR
    const shortSlug = `${body.agentId}/${body.purpose}`;
    const shortUrl = `https://est.at/${shortSlug}`;

    // Store shortlink mapping
    const linkData = {
      destination: body.destination,
      agentId: body.agentId,
      type: 'qr',
      purpose: body.purpose,
      property: body.property,
      created: Date.now(),
      updated: Date.now()
    };

    await env.LINKS.put(shortSlug, JSON.stringify(linkData));

    // Generate QR code image
    const qrOptions = {
      errorCorrectionLevel: 'H' as const, // High error correction for outdoor use
      type: 'svg' as const,
      width: 1000,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const qrSvg = await QRCode.toString(shortUrl, qrOptions);

    // Store QR metadata in D1
    await env.DB.prepare(`
      INSERT INTO qr_codes (
        id, agent_id, shortlink, purpose, property_address,
        destination, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      qrId,
      body.agentId,
      shortSlug,
      body.purpose,
      body.property || null,
      body.destination,
      new Date().toISOString()
    ).run();

    // Generate print-ready formats
    const printFormats = {
      svg: qrSvg,
      pngUrl: `/qr/${qrId}.png`,
      pdfUrl: `/qr/${qrId}.pdf`,
      shortUrl: shortUrl
    };

    return new Response(JSON.stringify({
      success: true,
      qrId,
      shortUrl,
      formats: printFormats,
      instructions: getPrintInstructions(body.purpose)
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('QR generation error:', error);
    return new Response('Internal error', {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * Get QR code image
 */
async function handleGetQR(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice(4); // Remove '/qr/'
  const [qrId, format] = path.split('.');

  if (!qrId) {
    return new Response('QR ID required', {
      status: 400,
      headers: corsHeaders
    });
  }

  // Get QR metadata from D1
  const qrData = await env.DB.prepare(`
    SELECT * FROM qr_codes WHERE id = ?
  `).bind(qrId).first();

  if (!qrData) {
    return new Response('QR code not found', {
      status: 404,
      headers: corsHeaders
    });
  }

  // Generate QR code
  const shortUrl = `https://est.at/${qrData.shortlink}`;

  if (format === 'png') {
    const qrBuffer = await QRCode.toBuffer(shortUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 2000, // High res for printing
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return new Response(qrBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache forever
        'Content-Disposition': `inline; filename="${qrData.agent_id}-${qrData.purpose}.png"`,
        ...corsHeaders
      }
    });
  }

  // Default to SVG
  const qrSvg = await QRCode.toString(shortUrl, {
    errorCorrectionLevel: 'H',
    type: 'svg',
    width: 2000,
    margin: 4
  });

  return new Response(qrSvg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${qrData.agent_id}-${qrData.purpose}.svg"`,
      ...corsHeaders
    }
  });
}

/**
 * Update QR code destination
 */
async function handleUpdateDestination(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const body = await request.json() as {
      qrId: string;
      agentId: string;
      newDestination: string;
    };

    // Verify ownership
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.includes(body.agentId)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      });
    }

    // Get QR data
    const qrData = await env.DB.prepare(`
      SELECT * FROM qr_codes
      WHERE id = ? AND agent_id = ?
    `).bind(body.qrId, body.agentId).first();

    if (!qrData) {
      return new Response('QR code not found', {
        status: 404,
        headers: corsHeaders
      });
    }

    // Update shortlink destination
    const linkDataStr = await env.LINKS.get(qrData.shortlink);
    if (linkDataStr) {
      const linkData = JSON.parse(linkDataStr);
      linkData.destination = body.newDestination;
      linkData.updated = Date.now();

      await env.LINKS.put(qrData.shortlink, JSON.stringify(linkData));
    }

    // Log the change
    await env.DB.prepare(`
      INSERT INTO qr_destination_changes (
        qr_id, old_destination, new_destination, changed_at
      ) VALUES (?, ?, ?, ?)
    `).bind(
      body.qrId,
      qrData.destination,
      body.newDestination,
      new Date().toISOString()
    ).run();

    // Update QR record
    await env.DB.prepare(`
      UPDATE qr_codes
      SET destination = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      body.newDestination,
      new Date().toISOString(),
      body.qrId
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'QR destination updated',
      qrId: body.qrId,
      newDestination: body.newDestination
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Update error:', error);
    return new Response('Internal error', {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * Get QR code analytics
 */
async function handleGetAnalytics(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const url = new URL(request.url);
  const qrId = url.pathname.split('/').pop();

  if (!qrId) {
    return new Response('QR ID required', {
      status: 400,
      headers: corsHeaders
    });
  }

  // Get QR data
  const qrData = await env.DB.prepare(`
    SELECT * FROM qr_codes WHERE id = ?
  `).bind(qrId).first();

  if (!qrData) {
    return new Response('QR code not found', {
      status: 404,
      headers: corsHeaders
    });
  }

  // Get scan analytics
  const scanStats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_scans,
      COUNT(DISTINCT ip_address) as unique_scanners,
      COUNT(CASE WHEN converted_to_lead THEN 1 END) as conversions,
      MAX(timestamp) as last_scan
    FROM clicks
    WHERE slug = ?
  `).bind(qrData.shortlink).first();

  // Get scan timeline
  const scanTimeline = await env.DB.prepare(`
    SELECT
      DATE(timestamp / 1000, 'unixepoch') as date,
      COUNT(*) as scans
    FROM clicks
    WHERE slug = ?
    GROUP BY date
    ORDER BY date DESC
    LIMIT 30
  `).bind(qrData.shortlink).all();

  // Get location breakdown
  const locationBreakdown = await env.DB.prepare(`
    SELECT
      city,
      COUNT(*) as count
    FROM clicks
    WHERE slug = ? AND city IS NOT NULL
    GROUP BY city
    ORDER BY count DESC
    LIMIT 10
  `).bind(qrData.shortlink).all();

  return new Response(JSON.stringify({
    qrId,
    purpose: qrData.purpose,
    property: qrData.property_address,
    created: qrData.created_at,
    stats: scanStats,
    timeline: scanTimeline.results,
    locations: locationBreakdown.results
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Generate unique QR ID
 */
function generateQRId(agentId: string, purpose: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `${agentId}-${purpose}-${timestamp}-${random}`;
}

/**
 * Get print instructions based on purpose
 */
function getPrintInstructions(purpose: string): string {
  const instructions: Record<string, string> = {
    yard_sign: `
      YARD SIGN PRINTING INSTRUCTIONS:
      1. Download the PNG file (high resolution)
      2. Minimum size: 6" x 6" for scanning from car
      3. Use weather-resistant material
      4. Place at eye level on sign
      5. Test scan from 10 feet away
    `,
    business_card: `
      BUSINESS CARD PRINTING INSTRUCTIONS:
      1. Download the SVG file (vector format)
      2. Recommended size: 1" x 1" minimum
      3. Place on back of card
      4. Include text: "Scan for my info"
      5. Test with multiple phones
    `,
    flyer: `
      FLYER PRINTING INSTRUCTIONS:
      1. Download the PNG file
      2. Recommended size: 3" x 3"
      3. Place prominently on flyer
      4. Add call-to-action text
      5. Print on matte paper (less glare)
    `,
    open_house: `
      OPEN HOUSE SIGN INSTRUCTIONS:
      1. Download the PNG file
      2. Print at 8" x 8" minimum
      3. Place at entrance and by property
      4. Include "Scan for details" text
      5. Update destination before each open house
    `
  };

  return instructions[purpose] || 'Print at high resolution for best results.';
}