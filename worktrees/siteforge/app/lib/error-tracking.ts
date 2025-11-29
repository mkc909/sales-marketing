/**
 * Cloudflare Wrangler Tail Error Tracking System
 * Replaces Sentry with native Cloudflare logging and analytics
 * Zero external dependencies, full control over data
 */

import type { AppLoadContext, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';

/**
 * Error severity levels
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  DATABASE = 'database',
  API = 'api',
  AUTH = 'auth',
  PAYMENT = 'payment',
  VALIDATION = 'validation',
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  THIRD_PARTY = 'third_party',
  USER = 'user_error',
  SYSTEM = 'system'
}

/**
 * Enhanced error context
 */
interface ErrorContext {
  // Request information
  url: string;
  method: string;
  headers: Record<string, string>;
  ip?: string;
  country?: string;
  region?: string;

  // User context
  userId?: string;
  userType?: string;
  subscriptionTier?: string;

  // Application context
  route?: string;
  action?: string;
  industry?: string;
  professionalId?: string;

  // Performance
  duration?: number;
  memoryUsage?: number;

  // Custom metadata
  metadata?: Record<string, any>;
}

/**
 * Error record structure for D1 storage
 */
interface ErrorRecord {
  id: string;
  timestamp: number;
  level: ErrorLevel;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Main Error Tracking Service
 */
export class ErrorTracker {
  private context: AppLoadContext;
  private startTime: number;

  constructor(context: AppLoadContext | LoaderFunctionArgs | ActionFunctionArgs) {
    this.context = 'context' in context ? context.context : context as AppLoadContext;
    this.startTime = Date.now();
  }

  /**
   * Log error to Wrangler tail and D1
   */
  async logError(
    error: Error | unknown,
    level: ErrorLevel = ErrorLevel.ERROR,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    metadata?: Record<string, any>
  ): Promise<string> {
    const errorRecord = this.createErrorRecord(error, level, category, metadata);

    // Log to console for Wrangler tail
    this.logToWranglerTail(errorRecord);

    // Store in D1 for persistence
    await this.storeInD1(errorRecord);

    // Send critical alerts
    if (level === ErrorLevel.CRITICAL) {
      await this.sendCriticalAlert(errorRecord);
    }

    // Track metrics
    await this.trackErrorMetrics(errorRecord);

    return errorRecord.id;
  }

  /**
   * Create structured error record
   */
  private createErrorRecord(
    error: Error | unknown,
    level: ErrorLevel,
    category: ErrorCategory,
    metadata?: Record<string, any>
  ): ErrorRecord {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const request = this.context.request;

    const context: ErrorContext = {
      url: request?.url || 'unknown',
      method: request?.method || 'unknown',
      headers: this.sanitizeHeaders(request?.headers),
      ip: request?.headers.get('CF-Connecting-IP') || undefined,
      country: request?.cf?.country as string || undefined,
      region: this.context.region || undefined,
      duration: Date.now() - this.startTime,
      metadata
    };

    // Add user context if available
    const ctx = this.context as any;
    if (ctx.user) {
      context.userId = ctx.user.id;
      context.userType = ctx.user.type;
      context.subscriptionTier = ctx.user.tier;
    }

    const fingerprint = this.generateFingerprint(errorObj, category);

    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level,
      category,
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      fingerprint,
      count: 1,
      resolved: false
    };
  }

  /**
   * Log to console for Wrangler tail visibility
   */
  private logToWranglerTail(error: ErrorRecord): void {
    const logData = {
      '🚨 ERROR': error.level.toUpperCase(),
      id: error.id,
      category: error.category,
      message: error.message,
      url: error.context.url,
      method: error.context.method,
      user: error.context.userId || 'anonymous',
      region: error.context.region || 'unknown',
      duration: `${error.context.duration}ms`,
      timestamp: new Date(error.timestamp).toISOString(),
      fingerprint: error.fingerprint,
      metadata: error.context.metadata
    };

    // Use appropriate console method based on level
    switch (error.level) {
      case ErrorLevel.DEBUG:
        console.debug('🔍 DEBUG:', JSON.stringify(logData, null, 2));
        break;
      case ErrorLevel.INFO:
        console.info('ℹ️ INFO:', JSON.stringify(logData, null, 2));
        break;
      case ErrorLevel.WARNING:
        console.warn('⚠️ WARNING:', JSON.stringify(logData, null, 2));
        break;
      case ErrorLevel.ERROR:
        console.error('❌ ERROR:', JSON.stringify(logData, null, 2));
        if (error.stack) {
          console.error('Stack Trace:', error.stack);
        }
        break;
      case ErrorLevel.CRITICAL:
        console.error('🔥 CRITICAL:', JSON.stringify(logData, null, 2));
        if (error.stack) {
          console.error('Stack Trace:', error.stack);
        }
        break;
    }
  }

  /**
   * Store error in D1 for persistence and querying
   */
  private async storeInD1(error: ErrorRecord): Promise<void> {
    try {
      // Check if this error already exists
      const existing = await this.context.env.DB.prepare(`
        SELECT id, count FROM error_logs
        WHERE fingerprint = ?
        AND resolved = false
        AND timestamp > ?
      `).bind(
        error.fingerprint,
        Date.now() - 3600000 // Within last hour
      ).first();

      if (existing) {
        // Increment count for existing error
        await this.context.env.DB.prepare(`
          UPDATE error_logs
          SET count = count + 1,
              last_seen = ?
          WHERE id = ?
        `).bind(Date.now(), existing.id).run();
      } else {
        // Insert new error
        await this.context.env.DB.prepare(`
          INSERT INTO error_logs (
            id, timestamp, level, category, message, stack,
            context, fingerprint, count, resolved, last_seen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          error.id,
          error.timestamp,
          error.level,
          error.category,
          error.message,
          error.stack || null,
          JSON.stringify(error.context),
          error.fingerprint,
          1,
          false,
          error.timestamp
        ).run();
      }
    } catch (dbError) {
      // If D1 fails, at least log to console
      console.error('Failed to store error in D1:', dbError);
    }
  }

  /**
   * Send critical alerts via webhook or email
   */
  private async sendCriticalAlert(error: ErrorRecord): Promise<void> {
    // Use Cloudflare Email Workers or webhook
    if (this.context.env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(this.context.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 CRITICAL ERROR in ${error.context.region || 'production'}`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Error', value: error.message, short: false },
                { title: 'Category', value: error.category, short: true },
                { title: 'URL', value: error.context.url, short: true },
                { title: 'User', value: error.context.userId || 'anonymous', short: true },
                { title: 'Time', value: new Date(error.timestamp).toISOString(), short: true }
              ]
            }]
          })
        });
      } catch (alertError) {
        console.error('Failed to send critical alert:', alertError);
      }
    }
  }

  /**
   * Track error metrics in Analytics Engine or D1
   */
  private async trackErrorMetrics(error: ErrorRecord): Promise<void> {
    try {
      await this.context.env.DB.prepare(`
        INSERT INTO error_metrics (
          date, hour, category, level, count
        ) VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(date, hour, category, level) DO UPDATE
        SET count = count + 1
      `).bind(
        new Date(error.timestamp).toISOString().split('T')[0],
        new Date(error.timestamp).getHours(),
        error.category,
        error.level
      ).run();
    } catch (metricsError) {
      console.error('Failed to track metrics:', metricsError);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate fingerprint for error deduplication
   */
  private generateFingerprint(error: Error, category: ErrorCategory): string {
    const parts = [
      category,
      error.message.substring(0, 100),
      error.stack?.split('\n')[1]?.trim().substring(0, 100) || 'no-stack'
    ];
    return parts.join('|').replace(/[^a-zA-Z0-9|]/g, '');
  }

  /**
   * Sanitize headers to remove sensitive data
   */
  private sanitizeHeaders(headers?: Headers): Record<string, string> {
    if (!headers) return {};

    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    headers.forEach((value, key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Convenience methods for different error types
   */

  async logDatabaseError(error: Error, query?: string): Promise<string> {
    return this.logError(error, ErrorLevel.ERROR, ErrorCategory.DATABASE, { query });
  }

  async logPaymentError(error: Error, paymentData?: any): Promise<string> {
    return this.logError(error, ErrorLevel.CRITICAL, ErrorCategory.PAYMENT, {
      amount: paymentData?.amount,
      method: paymentData?.method,
      // Don't log sensitive payment details
    });
  }

  async logAuthError(error: Error, attemptedAction?: string): Promise<string> {
    return this.logError(error, ErrorLevel.WARNING, ErrorCategory.AUTH, { attemptedAction });
  }

  async logValidationError(field: string, value: any, reason: string): Promise<string> {
    const error = new Error(`Validation failed for ${field}: ${reason}`);
    return this.logError(error, ErrorLevel.INFO, ErrorCategory.VALIDATION, { field, value: String(value) });
  }

  async logApiError(error: Error, endpoint: string, statusCode?: number): Promise<string> {
    return this.logError(error, ErrorLevel.ERROR, ErrorCategory.API, { endpoint, statusCode });
  }

  /**
   * Performance tracking
   */
  async trackPerformance(operation: string, duration: number): Promise<void> {
    if (duration > 1000) { // Log slow operations over 1 second
      console.warn(`⏱️ SLOW OPERATION: ${operation} took ${duration}ms`);

      await this.context.env.DB.prepare(`
        INSERT INTO performance_logs (
          timestamp, operation, duration, url, user_id
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        Date.now(),
        operation,
        duration,
        this.context.request?.url || 'unknown',
        (this.context as any).user?.id || null
      ).run();
    }
  }
}

/**
 * Error boundary wrapper for routes
 */
export function withErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  category: ErrorCategory = ErrorCategory.SYSTEM
): T {
  return (async (...args: Parameters<T>) => {
    const context = args[0]?.context || args[0];
    const tracker = new ErrorTracker(context);

    try {
      const startTime = Date.now();
      const result = await fn(...args);

      // Track performance
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        await tracker.trackPerformance(fn.name || 'unknown', duration);
      }

      return result;
    } catch (error) {
      await tracker.logError(error, ErrorLevel.ERROR, category);
      throw error; // Re-throw to maintain original behavior
    }
  }) as T;
}

/**
 * D1 Schema for error tracking
 */
export const ERROR_TRACKING_SCHEMA = `
-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT, -- JSON
  fingerprint TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT false,
  resolved_at INTEGER,
  resolved_by TEXT,
  notes TEXT,
  last_seen INTEGER NOT NULL,

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_fingerprint (fingerprint),
  INDEX idx_level_category (level, category),
  INDEX idx_resolved (resolved, timestamp DESC)
);

-- Error metrics for aggregation
CREATE TABLE IF NOT EXISTS error_metrics (
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  count INTEGER DEFAULT 0,

  PRIMARY KEY (date, hour, category, level)
);

-- Performance logs
CREATE TABLE IF NOT EXISTS performance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  operation TEXT NOT NULL,
  duration INTEGER NOT NULL,
  url TEXT,
  user_id TEXT,

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_operation (operation, duration DESC)
);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_id TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  alert_type TEXT NOT NULL,
  recipient TEXT,
  status TEXT,

  FOREIGN KEY (error_id) REFERENCES error_logs(id)
);
`;

/**
 * Error Analytics Dashboard Data
 */
export class ErrorAnalytics {
  constructor(private db: D1Database) { }

  async getErrorSummary(hours: number = 24): Promise<any> {
    const since = Date.now() - (hours * 3600000);

    const summary = await this.db.prepare(`
      SELECT
        level,
        category,
        COUNT(*) as count,
        COUNT(DISTINCT fingerprint) as unique_errors,
        MAX(timestamp) as last_seen
      FROM error_logs
      WHERE timestamp > ?
      GROUP BY level, category
      ORDER BY count DESC
    `).bind(since).all();

    return summary.results;
  }

  async getTopErrors(limit: number = 10): Promise<any> {
    const errors = await this.db.prepare(`
      SELECT
        fingerprint,
        message,
        category,
        level,
        SUM(count) as total_count,
        MAX(last_seen) as last_seen,
        resolved
      FROM error_logs
      WHERE timestamp > ?
      GROUP BY fingerprint
      ORDER BY total_count DESC
      LIMIT ?
    `).bind(Date.now() - 86400000, limit).all();

    return errors.results;
  }

  async getErrorTrends(days: number = 7): Promise<any> {
    const trends = await this.db.prepare(`
      SELECT
        date,
        SUM(count) as total_errors,
        SUM(CASE WHEN level = 'critical' THEN count ELSE 0 END) as critical_errors,
        SUM(CASE WHEN level = 'error' THEN count ELSE 0 END) as errors,
        SUM(CASE WHEN level = 'warning' THEN count ELSE 0 END) as warnings
      FROM error_metrics
      WHERE date > date('now', '-${days} days')
      GROUP BY date
      ORDER BY date DESC
    `).all();

    return trends.results;
  }

  async getSlowOperations(limit: number = 20): Promise<any> {
    const operations = await this.db.prepare(`
      SELECT
        operation,
        COUNT(*) as count,
        AVG(duration) as avg_duration,
        MAX(duration) as max_duration,
        MIN(duration) as min_duration
      FROM performance_logs
      WHERE timestamp > ?
      GROUP BY operation
      ORDER BY avg_duration DESC
      LIMIT ?
    `).bind(Date.now() - 86400000, limit).all();

    return operations.results;
  }
}