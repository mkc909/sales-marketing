/**
 * EstateFlow URL Shortener
 * Cloudflare Worker for est.at short links
 *
 * This creates the "physical lock-in" through QR codes on yard signs
 */

export interface Env {
  // KV Namespaces
  LINKS: KVNamespace;        // Stores slug -> destination mappings
  ANALYTICS: KVNamespace;    // Stores click analytics

  // D1 Database
  DB: D1Database;

  // Secrets
  POSTHOG_KEY: string;
  ADMIN_KEY: string;
}

interface LinkData {
  destination: string;
  agentId: string;
  type: 'profile' | 'qr' | 'listing' | 'calendar';
  metadata?: Record<string, any>;
  created: number;
  updated: number;
}

interface ClickEvent {
  slug: string;
  timestamp: number;
  ip: string | null;
  country: string;
  city: string;
  region: string;
  referer: string | null;
  userAgent: string | null;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, ctx);
    }

    // Handle shortlink redirection
    return handleRedirect(request, env, ctx);
  }
};

/**
 * Handle shortlink redirection
 */
async function handleRedirect(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice(1); // Remove leading slash

  if (!path) {
    // Root domain - redirect to main site
    return Response.redirect('https://estateflow.com', 302);
  }

  // Parse path: "jane-doe" or "jane-doe/open-house"
  const [slug, ...subpathParts] = path.split('/');
  const subpath = subpathParts.join('/');

  // Construct lookup key
  const lookupKey = subpath ? `${slug}:${subpath}` : slug;

  // Get destination from KV
  const linkDataStr = await env.LINKS.get(lookupKey);

  if (!linkDataStr) {
    // Try fallback to agent's main profile
    if (subpath) {
      const mainLinkStr = await env.LINKS.get(slug);
      if (mainLinkStr) {
        const mainLink: LinkData = JSON.parse(mainLinkStr);

        // Track this as a fallback
        ctx.waitUntil(
          trackClick(env, request, {
            slug,
            subpath,
            fallback: true,
            destination: mainLink.destination
          })
        );

        return Response.redirect(mainLink.destination, 302);
      }
    }

    // Not found - redirect to 404 page
    return Response.redirect('https://estateflow.com/404', 302);
  }

  const linkData: LinkData = JSON.parse(linkDataStr);

  // Track analytics asynchronously
  ctx.waitUntil(
    trackClick(env, request, {
      slug,
      subpath,
      destination: linkData.destination,
      agentId: linkData.agentId,
      linkType: linkData.type
    })
  );

  // Redirect to destination
  // Use 301 for SEO benefit on permanent links
  // Use 302 for dynamic QR destinations
  const statusCode = linkData.type === 'qr' ? 302 : 301;
  return Response.redirect(linkData.destination, statusCode);
}

/**
 * Track click analytics
 */
async function trackClick(env: Env, request: Request, data: any): Promise<void> {
  const clickEvent: ClickEvent = {
    slug: data.slug,
    timestamp: Date.now(),
    ip: request.headers.get('CF-Connecting-IP'),
    country: request.cf?.country as string || 'unknown',
    city: request.cf?.city as string || 'unknown',
    region: request.cf?.region as string || 'unknown',
    referer: request.headers.get('Referer'),
    userAgent: request.headers.get('User-Agent'),
    deviceType: getDeviceType(request.headers.get('User-Agent') || '')
  };

  // Store in KV for later aggregation
  const analyticsKey = `clicks:${data.slug}:${Date.now()}:${Math.random()}`;
  await env.ANALYTICS.put(analyticsKey, JSON.stringify({
    ...clickEvent,
    ...data
  }), {
    expirationTtl: 30 * 24 * 60 * 60 // Keep for 30 days
  });

  // Also store in D1 for complex queries
  try {
    await env.DB.prepare(`
      INSERT INTO clicks (
        slug, subpath, timestamp, ip_address, country, city, region,
        referer, user_agent, device_type, agent_id, destination
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.slug,
      data.subpath || null,
      clickEvent.timestamp,
      clickEvent.ip,
      clickEvent.country,
      clickEvent.city,
      clickEvent.region,
      clickEvent.referer,
      clickEvent.userAgent,
      clickEvent.deviceType,
      data.agentId || null,
      data.destination
    ).run();
  } catch (error) {
    console.error('Failed to store click in D1:', error);
  }

  // Send to PostHog for real-time analytics
  if (env.POSTHOG_KEY) {
    try {
      await fetch('https://app.posthog.com/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: env.POSTHOG_KEY,
          event: 'shortlink_click',
          distinct_id: clickEvent.ip || 'anonymous',
          properties: {
            ...clickEvent,
            ...data
          }
        })
      });
    } catch (error) {
      console.error('Failed to send to PostHog:', error);
    }
  }

  // Update click counter in KV
  const countKey = `count:${data.slug}`;
  const currentCount = await env.LINKS.get(countKey);
  const newCount = (parseInt(currentCount || '0') + 1).toString();
  await env.LINKS.put(countKey, newCount);
}

/**
 * Handle API routes
 */
async function handleAPI(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  // Require admin key for API access
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${env.ADMIN_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Route handling
  if (url.pathname === '/api/create' && request.method === 'POST') {
    return handleCreateLink(request, env);
  }

  if (url.pathname === '/api/update' && request.method === 'PUT') {
    return handleUpdateLink(request, env);
  }

  if (url.pathname.startsWith('/api/analytics/') && request.method === 'GET') {
    return handleGetAnalytics(request, env);
  }

  return new Response('Not found', { status: 404 });
}

/**
 * Create a new short link
 */
async function handleCreateLink(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    slug: string;
    destination: string;
    agentId: string;
    type: 'profile' | 'qr' | 'listing' | 'calendar';
    metadata?: Record<string, any>;
  };

  // Validate slug format (alphanumeric and hyphens only)
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return new Response('Invalid slug format', { status: 400 });
  }

  // Check if slug already exists
  const existing = await env.LINKS.get(body.slug);
  if (existing) {
    return new Response('Slug already exists', { status: 409 });
  }

  // Create link data
  const linkData: LinkData = {
    destination: body.destination,
    agentId: body.agentId,
    type: body.type,
    metadata: body.metadata || {},
    created: Date.now(),
    updated: Date.now()
  };

  // Store in KV
  await env.LINKS.put(body.slug, JSON.stringify(linkData));

  // Store in D1 for queries
  await env.DB.prepare(`
    INSERT INTO shortlinks (
      slug, agent_id, destination, type, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    body.slug,
    body.agentId,
    body.destination,
    body.type,
    JSON.stringify(body.metadata || {}),
    new Date(linkData.created).toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    slug: body.slug,
    url: `https://est.at/${body.slug}`
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Update an existing short link destination
 */
async function handleUpdateLink(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    slug: string;
    destination: string;
  };

  // Get existing link
  const existingStr = await env.LINKS.get(body.slug);
  if (!existingStr) {
    return new Response('Link not found', { status: 404 });
  }

  const existing: LinkData = JSON.parse(existingStr);

  // Update destination
  existing.destination = body.destination;
  existing.updated = Date.now();

  // Save updated data
  await env.LINKS.put(body.slug, JSON.stringify(existing));

  // Update D1
  await env.DB.prepare(`
    UPDATE shortlinks
    SET destination = ?, updated_at = ?
    WHERE slug = ?
  `).bind(
    body.destination,
    new Date(existing.updated).toISOString(),
    body.slug
  ).run();

  // Log the change
  await env.DB.prepare(`
    INSERT INTO destination_changes (
      slug, old_destination, new_destination, changed_at
    ) VALUES (?, ?, ?, ?)
  `).bind(
    body.slug,
    existing.destination,
    body.destination,
    new Date().toISOString()
  ).run();

  return new Response(JSON.stringify({
    success: true,
    slug: body.slug,
    destination: body.destination
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get analytics for a short link
 */
async function handleGetAnalytics(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').pop();

  if (!slug) {
    return new Response('Slug required', { status: 400 });
  }

  // Get click count from KV
  const clickCount = await env.LINKS.get(`count:${slug}`) || '0';

  // Get recent clicks from D1
  const recentClicks = await env.DB.prepare(`
    SELECT * FROM clicks
    WHERE slug = ?
    ORDER BY timestamp DESC
    LIMIT 100
  `).bind(slug).all();

  // Get unique visitors count
  const uniqueVisitors = await env.DB.prepare(`
    SELECT COUNT(DISTINCT ip_address) as count
    FROM clicks
    WHERE slug = ?
  `).bind(slug).first();

  // Get top referrers
  const topReferrers = await env.DB.prepare(`
    SELECT referer, COUNT(*) as count
    FROM clicks
    WHERE slug = ? AND referer IS NOT NULL
    GROUP BY referer
    ORDER BY count DESC
    LIMIT 10
  `).bind(slug).all();

  // Get device breakdown
  const deviceBreakdown = await env.DB.prepare(`
    SELECT device_type, COUNT(*) as count
    FROM clicks
    WHERE slug = ?
    GROUP BY device_type
  `).bind(slug).all();

  return new Response(JSON.stringify({
    slug,
    totalClicks: parseInt(clickCount),
    uniqueVisitors: uniqueVisitors?.count || 0,
    recentClicks: recentClicks.results,
    topReferrers: topReferrers.results,
    deviceBreakdown: deviceBreakdown.results
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Detect device type from user agent
 */
function getDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
  const ua = userAgent.toLowerCase();

  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}