import type { AppLoadContext } from "@remix-run/cloudflare";
import { createHash, randomBytes } from "crypto";

// Simple authentication system using D1 and sessions
export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    creditsRemaining: number;
    stripeCustomerId?: string;
    emailVerified: boolean;
}

export interface Session {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
}

// Database user operations
export async function createUser(
    context: AppLoadContext,
    userData: {
        email: string;
        firstName?: string;
        lastName?: string;
        passwordHash?: string;
        googleId?: string;
        stripeCustomerId?: string;
    }
) {
    const userId = crypto.randomUUID();

    await context.env.DB.prepare(`
    INSERT INTO users (
      id, email, first_name, last_name, password_hash, google_id,
      stripe_customer_id, subscription_tier, credits_remaining,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'free', 10, datetime('now'), datetime('now'))
  `).bind(
        userId,
        userData.email.toLowerCase(),
        userData.firstName || null,
        userData.lastName || null,
        userData.passwordHash || null,
        userData.googleId || null,
        userData.stripeCustomerId || null
    ).run();

    return userId;
}

export async function getUserByEmail(context: AppLoadContext, email: string) {
    return await context.env.DB.prepare(`
    SELECT * FROM users WHERE email = ?
  `).bind(email.toLowerCase()).first();
}

export async function getUserById(context: AppLoadContext, id: string) {
    return await context.env.DB.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(id).first();
}

export async function getUserByGoogleId(context: AppLoadContext, googleId: string) {
    return await context.env.DB.prepare(`
    SELECT * FROM users WHERE google_id = ?
  `).bind(googleId).first();
}

export async function updateUserStripeInfo(
    context: AppLoadContext,
    userId: string,
    stripeData: {
        customerId: string;
        subscriptionId?: string;
        subscriptionTier?: string;
        subscriptionStatus?: string;
        subscriptionExpires?: Date;
    }
) {
    await context.env.DB.prepare(`
    UPDATE users SET
      stripe_customer_id = ?,
      subscription_id = ?,
      subscription_tier = ?,
      subscription_status = ?,
      subscription_expires = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
        stripeData.customerId,
        stripeData.subscriptionId || null,
        stripeData.subscriptionTier || null,
        stripeData.subscriptionStatus || null,
        stripeData.subscriptionExpires?.toISOString() || null,
        userId
    ).run();
}

// Session management
export async function createSession(
    context: AppLoadContext,
    userId: string,
    ipAddress?: string,
    userAgent?: string
): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await context.env.DB.prepare(`
    INSERT INTO user_sessions (
      id, user_id, session_token, ip_address, user_agent, 
      last_activity, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
  `).bind(
        crypto.randomUUID(), // ID for the session record
        userId,
        sessionId,
        ipAddress || null,
        userAgent || null,
        expiresAt.toISOString()
    ).run();

    return sessionId;
}

export async function getSessionByToken(
    context: AppLoadContext,
    token: string
): Promise<Session | null> {
    const session = await context.env.DB.prepare(`
    SELECT * FROM user_sessions 
    WHERE session_token = ? AND expires_at > datetime('now')
  `).bind(token).first();

    if (session) {
        // Update last activity
        await context.env.DB.prepare(`
        UPDATE user_sessions SET last_activity = datetime('now')
        WHERE id = ?
      `).bind(session.id).run();

        return {
            id: String(session.id),
            userId: String(session.user_id),
            expiresAt: new Date(String(session.expires_at)),
            ipAddress: session.ip_address ? String(session.ip_address) : undefined,
            userAgent: session.user_agent ? String(session.user_agent) : undefined
        };
    }

    return null;
}

export async function deleteSession(
    context: AppLoadContext,
    token: string
) {
    await context.env.DB.prepare(`
    DELETE FROM user_sessions WHERE session_token = ?
  `).bind(token).run();
}

export async function deleteAllUserSessions(
    context: AppLoadContext,
    userId: string
) {
    await context.env.DB.prepare(`
    DELETE FROM user_sessions WHERE user_id = ?
  `).bind(userId).run();
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
        .update(password + salt)
        .digest('hex');
    return `${salt}:${hash}`;
}

export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const computedHash = createHash('sha256')
        .update(password + salt)
        .digest('hex');
    return hash === computedHash;
}

// Credits management
export async function consumeCredits(
    context: AppLoadContext,
    userId: string,
    amount: number,
    usageType: 'search' | 'bulk_export' | 'api_call',
    metadata?: any
) {
    const db = context.env.DB;

    // Check if user has enough credits
    const user = await db.prepare(`
    SELECT credits_remaining, subscription_tier FROM users WHERE id = ?
  `).bind(userId).first();

    if (!user || Number(user.credits_remaining) < amount) {
        throw new Error('Insufficient credits');
    }

    // Start transaction
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours();

    // Deduct credits
    await db.prepare(`
    UPDATE users SET
      credits_remaining = credits_remaining - ?,
      credits_used_today = CASE WHEN DATE(last_credit_reset) = DATE(?) THEN credits_used_today + ? ELSE ? END,
      credits_used_this_month = credits_used_this_month + ?,
      last_credit_reset = CASE WHEN DATE(last_credit_reset) = DATE(?) THEN last_credit_reset ELSE ? END,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
        amount, today, amount, amount, amount, today, today, userId
    ).run();

    // Record usage
    const usageId = crypto.randomUUID();
    await db.prepare(`
    INSERT INTO credits_usage (
      id, user_id, usage_type, credits_consumed, metadata,
      ip_address, user_agent, date, hour, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
        usageId,
        userId,
        usageType,
        amount,
        metadata ? JSON.stringify(metadata) : null,
        metadata?.ipAddress || null,
        metadata?.userAgent || null,
        today,
        hour
    ).run();

    return usageId;
}

export async function resetDailyCredits(context: AppLoadContext, userId: string) {
    const db = context.env.DB;
    const user = await db.prepare(`
    SELECT subscription_tier FROM users WHERE id = ?
  `).bind(userId).first();

    if (!user) return;

    // Get daily credits for subscription tier
    const plan = await db.prepare(`
    SELECT daily_credits FROM subscription_plans WHERE id = ?
  `).bind(user.subscription_tier).first();

    const dailyCredits = Number(plan?.daily_credits) || 0;

    await db.prepare(`
    UPDATE users SET
      credits_remaining = credits_remaining + ?,
      credits_used_today = 0,
      last_credit_reset = DATE('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(dailyCredits, userId).run();
}

export async function recordSearchHistory(
    context: AppLoadContext,
    userId: string,
    searchData: {
        state: string;
        profession: string;
        zipCode?: string;
        searchQuery?: string;
        resultsCount: number;
        searchDuration?: number;
    }
) {
    const historyId = crypto.randomUUID();

    await context.env.DB.prepare(`
    INSERT INTO search_history (
      id, user_id, state, profession, zip_code, search_query,
      results_count, search_duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
        historyId,
        userId,
        searchData.state,
        searchData.profession,
        searchData.zipCode || null,
        searchData.searchQuery || null,
        searchData.resultsCount,
        searchData.searchDuration || null
    ).run();

    return historyId;
}

export async function getUserSearchHistory(
    context: AppLoadContext,
    userId: string,
    limit: number = 50
) {
    return await context.env.DB.prepare(`
    SELECT * FROM search_history 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).bind(userId, limit).all();
}

export async function getUserSubscription(context: AppLoadContext, userId: string) {
    const user = await context.env.DB.prepare(`
    SELECT u.*, p.daily_credits, p.monthly_credits, p.features, p.api_access, p.api_rate_limit_hourly
    FROM users u
    LEFT JOIN subscription_plans p ON u.subscription_tier = p.id
    WHERE u.id = ?
  `).bind(userId).first();

    return user;
}

// Rate limiting with KV
export async function checkRateLimit(
    context: AppLoadContext,
    key: string,
    limit: number,
    windowMs: number = 3600000 // 1 hour default
) {
    const kv = context.env.CACHE;
    if (!kv) return { allowed: true, remaining: limit };

    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const kvKey = `rate_limit:${key}:${window}`;

    const current = await kv.get(kvKey);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
        return { allowed: false, remaining: 0, resetTime: (window + 1) * windowMs };
    }

    // Increment counter
    await kv.put(kvKey, String(count + 1), { expirationTtl: Math.ceil(windowMs / 1000) });

    return { allowed: true, remaining: limit - count, resetTime: (window + 1) * windowMs };
}

// Google OAuth utilities
export function generateGoogleAuthUrl(context: AppLoadContext, redirectUri?: string) {
    const env = context?.env || {};
    const clientId = env.GOOGLE_CLIENT_ID || '';
    const baseUrl = env.BASE_URL || 'http://localhost:8788';
    const callbackUrl = redirectUri || `${baseUrl}/auth/google`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'email profile',
        access_type: 'offline'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForTokens(
    context: AppLoadContext,
    code: string,
    redirectUri: string
) {
    const clientId = context.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = context.env.GOOGLE_CLIENT_SECRET || '';

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) {
        throw new Error('Failed to exchange Google code for tokens');
    }

    return await response.json();
}

export async function createOrUpdateGoogleUser(
    context: AppLoadContext,
    googleUserData: {
        googleId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
        emailVerified: boolean;
    }
) {
    // Check if user already exists by Google ID
    let user = await getUserByGoogleId(context, googleUserData.googleId);

    if (user) {
        // Update existing user
        await context.env.DB.prepare(`
            UPDATE users SET
                email = ?,
                first_name = ?,
                last_name = ?,
                avatar_url = ?,
                email_verified = ?,
                updated_at = datetime('now')
            WHERE google_id = ?
        `).bind(
            googleUserData.email.toLowerCase(),
            googleUserData.firstName || null,
            googleUserData.lastName || null,
            googleUserData.avatarUrl || null,
            googleUserData.emailVerified,
            googleUserData.googleId
        ).run();

        return user.id;
    }

    // Check if user exists by email (but no Google ID)
    user = await getUserByEmail(context, googleUserData.email);

    if (user) {
        // Link Google account to existing user
        await context.env.DB.prepare(`
            UPDATE users SET
                google_id = ?,
                email_verified = ?,
                avatar_url = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            googleUserData.googleId,
            googleUserData.emailVerified,
            googleUserData.avatarUrl || null,
            user.id
        ).run();

        return user.id;
    }

    // Create new user with Google account
    return await createUser(context, {
        email: googleUserData.email,
        firstName: googleUserData.firstName,
        lastName: googleUserData.lastName,
        googleId: googleUserData.googleId
    });
}

export async function getGoogleUserInfo(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get Google user info');
    }

    return await response.json();
}