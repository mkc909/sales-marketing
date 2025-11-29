/**
 * Sentry Error Tracking Integration
 * Comprehensive error monitoring for PinExacto/TruePoint platform
 * Covers PR, FL, TX markets with regional context
 */

import * as Sentry from '@sentry/remix';
import type { AppLoadContext } from '@remix-run/cloudflare';

interface ErrorContext {
  region: 'PR' | 'FL' | 'TX' | 'US';
  product_name: 'PinExacto' | 'TruePoint';
  user_type?: 'agent' | 'homeowner' | 'service_provider' | 'anonymous';
  feature?: string;
  agent_id?: string;
  pin_id?: string;
  property_id?: string;
}

/**
 * Initialize Sentry for the application
 */
export function initSentry(env: any, region: string) {
  if (!env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  const productName = region === 'PR' ? 'PinExacto' : 'TruePoint';

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT || 'development',

    // Performance Monitoring
    tracesSampleRate: env.ENVIRONMENT === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay (for understanding user actions leading to errors)
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when error occurs

    // Release tracking
    release: env.RELEASE_VERSION || 'unknown',

    // Global tags for filtering
    initialScope: {
      tags: {
        region,
        product: productName,
        edge_location: env.CF_PLACEMENT || 'unknown',
        deployment: env.DEPLOYMENT_ID || 'unknown'
      },
      context: {
        cloudflare: {
          colo: env.CF_COLO || 'unknown',
          request_id: env.CF_REQUEST_ID || 'unknown',
          ray_id: env.CF_RAY_ID || 'unknown'
        }
      }
    },

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Trace navigation and interactions
        routingInstrumentation: Sentry.remixRouterInstrumentation(
          // Will be configured in root.tsx
        ),
        // Sample rate for navigation transactions
        tracePropagationTargets: [
          'localhost',
          'pinexacto.com',
          'truepoint.app',
          'estateflow.com',
          /^\//
        ]
      }),
      new Sentry.Replay({
        // Mask sensitive content
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
        // Sampling
        sessionSampleRate: 0.01,
        errorSampleRate: 1.0
      })
    ],

    // Data scrubbing
    beforeSend(event, hint) {
      // Remove sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }

      // Scrub access codes and gate codes
      if (event.extra) {
        const scrubKeys = ['access_code', 'gate_code', 'lockbox_code', 'password', 'token'];
        scrubKeys.forEach(key => {
          if (event.extra![key]) {
            event.extra![key] = '[REDACTED]';
          }
        });
      }

      // Add regional context
      if (!event.tags) event.tags = {};
      event.tags.product = productName;

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser errors we can't control
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // User-caused errors
      'User denied geolocation',
      'User cancelled',
      // Extension errors
      'Extension context invalidated'
    ]
  });
}

/**
 * Error tracking service
 */
export class ErrorTracker {
  private region: string;
  private productName: string;

  constructor(private context: AppLoadContext) {
    this.region = context.region || 'US';
    this.productName = this.region === 'PR' ? 'PinExacto' : 'TruePoint';
  }

  /**
   * Core Error Types
   */

  async trackPinCreationError(error: Error, pinData: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'pin_creation',
        pin_type: pinData.pinType,
        region: this.region
      },
      extra: {
        latitude: pinData.latitude,
        longitude: pinData.longitude,
        has_photo: !!pinData.photoUrl,
        has_access_code: !!pinData.accessCode,
        error_phase: this.detectErrorPhase(error)
      },
      level: 'error',
      fingerprint: ['pin-creation', error.message]
    });
  }

  async trackNavigationError(error: Error, pinId: string, userAgent?: string) {
    Sentry.captureException(error, {
      tags: {
        feature: 'navigation',
        region: this.region,
        device_type: this.detectDeviceType(userAgent)
      },
      extra: {
        pin_id: pinId,
        user_agent: userAgent,
        maps_provider: this.detectMapsProvider(userAgent)
      },
      level: 'warning',
      fingerprint: ['navigation', error.message]
    });
  }

  async trackQRGenerationError(error: Error, qrData: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'qr_generation',
        purpose: qrData.purpose,
        region: this.region
      },
      extra: {
        agent_id: qrData.agentId,
        property_id: qrData.propertyId,
        destination: qrData.destination
      },
      level: 'error',
      fingerprint: ['qr-generation', qrData.purpose, error.message]
    });
  }

  async trackPhotoUploadError(error: Error, fileInfo: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'photo_upload',
        file_type: fileInfo.type,
        region: this.region
      },
      extra: {
        file_size: fileInfo.size,
        file_name: fileInfo.name,
        pin_id: fileInfo.pinId,
        upload_phase: this.detectUploadPhase(error)
      },
      level: 'error',
      fingerprint: ['photo-upload', error.message]
    });
  }

  /**
   * Real Estate Specific Errors
   */

  async trackAgentSignupError(error: Error, agentData: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'agent_signup',
        signup_source: agentData.source,
        region: this.region,
        state: agentData.licenseState
      },
      extra: {
        brokerage: agentData.brokerage,
        has_mls: !!agentData.mlsNumber,
        error_field: this.detectValidationField(error)
      },
      level: 'error',
      fingerprint: ['agent-signup', agentData.source, error.message]
    });
  }

  async trackMLSImportError(error: Error, importData: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'mls_import',
        mls_source: importData.source,
        region: this.region,
        state: importData.state
      },
      extra: {
        total_listings: importData.totalListings,
        failed_count: importData.failedCount,
        batch_id: importData.batchId,
        error_type: this.detectImportErrorType(error)
      },
      level: 'error',
      fingerprint: ['mls-import', importData.source, error.message]
    });
  }

  /**
   * Payment & Subscription Errors
   */

  async trackPaymentError(error: Error, paymentData: any) {
    const isATHMovil = this.region === 'PR' && paymentData.method === 'ath_movil';

    Sentry.captureException(error, {
      tags: {
        feature: 'payment',
        payment_method: paymentData.method,
        region: this.region,
        subscription_tier: paymentData.tier
      },
      extra: {
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        is_ath_movil: isATHMovil,
        error_code: paymentData.errorCode,
        processor_message: paymentData.processorMessage
      },
      level: 'critical', // Payment errors are critical
      fingerprint: ['payment', paymentData.method, error.message]
    });

    // Alert for payment errors
    if (this.context.env.ENVIRONMENT === 'production') {
      await this.sendPaymentAlert(error, paymentData);
    }
  }

  /**
   * AI Agent Errors
   */

  async trackAIAgentError(error: Error, agentData: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'ai_agent',
        agent_type: agentData.agentType,
        region: this.region
      },
      extra: {
        user_id: agentData.userId,
        prompt_length: agentData.promptLength,
        token_count: agentData.tokenCount,
        model: agentData.model || 'cf-workers-ai',
        error_phase: agentData.phase // 'generation', 'parsing', 'validation'
      },
      level: 'error',
      fingerprint: ['ai-agent', agentData.agentType, error.message]
    });
  }

  /**
   * Database & Infrastructure Errors
   */

  async trackD1Error(error: Error, queryInfo: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'database',
        database: queryInfo.database,
        operation: queryInfo.operation,
        region: this.region
      },
      extra: {
        table: queryInfo.table,
        query_type: queryInfo.type, // SELECT, INSERT, UPDATE, DELETE
        error_code: error.message.match(/D1_ERROR_(\d+)/)?.[1],
        is_transaction: queryInfo.isTransaction
      },
      level: 'error',
      fingerprint: ['d1', queryInfo.operation, error.message]
    });
  }

  async trackR2Error(error: Error, storageInfo: any) {
    Sentry.captureException(error, {
      tags: {
        feature: 'storage',
        bucket: storageInfo.bucket,
        operation: storageInfo.operation,
        region: this.region
      },
      extra: {
        key: storageInfo.key,
        size: storageInfo.size,
        content_type: storageInfo.contentType,
        error_phase: storageInfo.phase // 'upload', 'download', 'delete'
      },
      level: 'error',
      fingerprint: ['r2', storageInfo.operation, error.message]
    });
  }

  /**
   * Performance Monitoring
   */

  startTransaction(name: string, op: string = 'navigation') {
    return Sentry.startTransaction({
      name,
      op,
      tags: {
        region: this.region,
        product: this.productName
      }
    });
  }

  /**
   * User Feedback
   */

  async captureUserFeedback(feedback: {
    userId?: string;
    email?: string;
    name?: string;
    comments: string;
    associatedEventId?: string;
  }) {
    const user = Sentry.getCurrentHub().getScope()?.getUser();

    Sentry.captureUserFeedback({
      event_id: feedback.associatedEventId || Sentry.lastEventId(),
      name: feedback.name || user?.username || 'Anonymous',
      email: feedback.email || user?.email || 'unknown@example.com',
      comments: feedback.comments
    });
  }

  /**
   * Helper Methods
   */

  private detectErrorPhase(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes('validation')) return 'validation';
    if (message.includes('network')) return 'network';
    if (message.includes('permission')) return 'permission';
    if (message.includes('timeout')) return 'timeout';
    return 'unknown';
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Android/i.test(userAgent)) return 'android';
    if (/Windows Phone/i.test(userAgent)) return 'windows_phone';
    return 'desktop';
  }

  private detectMapsProvider(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'apple_maps';
    if (/Android/i.test(userAgent)) return 'google_maps';
    return 'web';
  }

  private detectUploadPhase(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes('size')) return 'validation_size';
    if (message.includes('type')) return 'validation_type';
    if (message.includes('network')) return 'network';
    if (message.includes('storage')) return 'storage';
    return 'unknown';
  }

  private detectValidationField(error: Error): string {
    const message = error.message.toLowerCase();
    const fields = ['email', 'phone', 'license', 'mls', 'brokerage', 'name'];
    for (const field of fields) {
      if (message.includes(field)) return field;
    }
    return 'unknown';
  }

  private detectImportErrorType(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes('parse')) return 'parsing';
    if (message.includes('validate')) return 'validation';
    if (message.includes('duplicate')) return 'duplicate';
    if (message.includes('format')) return 'format';
    if (message.includes('auth')) return 'authentication';
    return 'unknown';
  }

  private async sendPaymentAlert(error: Error, paymentData: any) {
    // Send critical alert for payment failures
    // This could integrate with PagerDuty, Slack, etc.
    console.error('CRITICAL: Payment error', {
      error: error.message,
      payment: paymentData,
      region: this.region,
      timestamp: new Date().toISOString()
    });

    // Could also send to a webhook
    // await fetch(env.ALERT_WEBHOOK_URL, { ... })
  }

  /**
   * Breadcrumbs for debugging
   */

  addBreadcrumb(message: string, category: string, data?: any) {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data: {
        ...data,
        region: this.region,
        product: this.productName
      },
      timestamp: Date.now() / 1000
    });
  }

  /**
   * User Context
   */

  setUser(user: {
    id: string;
    email?: string;
    username?: string;
    type?: 'agent' | 'homeowner' | 'service_provider';
    region?: string;
  }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      segment: user.type,
      ip_address: '{{auto}}', // Sentry will detect
      region: user.region || this.region
    });
  }

  clearUser() {
    Sentry.setUser(null);
  }
}

/**
 * Cloudflare Worker Error Handler
 */
export async function handleWorkerError(
  error: Error,
  request: Request,
  env: any
): Promise<Response> {
  // Capture in Sentry
  const eventId = Sentry.captureException(error, {
    tags: {
      worker: true,
      url: request.url,
      method: request.method
    },
    extra: {
      headers: Object.fromEntries(request.headers.entries()),
      cf: request.cf
    }
  });

  // Return error response
  const isDev = env.ENVIRONMENT !== 'production';

  return new Response(
    JSON.stringify({
      error: isDev ? error.message : 'Internal Server Error',
      eventId,
      timestamp: new Date().toISOString(),
      region: env.REGION || 'US'
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Event-ID': eventId || 'unknown'
      }
    }
  );
}

/**
 * Express-style error boundary
 */
export function errorBoundary(error: Error, origin: string) {
  Sentry.withScope((scope) => {
    scope.setTag('error_boundary', true);
    scope.setTag('origin', origin);
    scope.setLevel('error');
    Sentry.captureException(error);
  });
}

/**
 * Performance monitoring utilities
 */
export const performance = {
  // Mark important timings
  mark(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`sentry-${name}`);
    }
  },

  // Measure between marks
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.measure(
        `sentry-${name}`,
        `sentry-${startMark}`,
        endMark ? `sentry-${endMark}` : undefined
      );

      // Send to Sentry
      const measure = window.performance.getEntriesByName(`sentry-${name}`)[0];
      if (measure) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: name,
          data: {
            duration: measure.duration,
            start: measure.startTime
          }
        });
      }
    }
  }
};

export default {
  initSentry,
  ErrorTracker,
  handleWorkerError,
  errorBoundary,
  performance
};