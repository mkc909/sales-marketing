/**
 * Reputation Manager Agent - TICK-021
 * AI-powered review request automation with negative review interception
 *
 * Features:
 * - Post-job review requests (SMS/WhatsApp/Email)
 * - Multi-channel delivery
 * - Negative review interception
 * - Automated follow-up sequences
 * - Target: 30% review rate
 */

import type {
  AgentContext,
  ReviewRequest,
  ReviewRequestInput,
  ReviewRequestStatus,
  ReputationManagerConfig,
  DeliveryMethod,
  MessageDeliveryResult,
  AgentResult,
} from './types';
import { SafetyRailsEngine, RateLimitEngine, TemplateEngine } from './safety-rails';

// =============================================================================
// REPUTATION MANAGER AGENT
// =============================================================================

export class ReputationManagerAgent {
  private context: AgentContext;
  private safetyRails: SafetyRailsEngine;
  private rateLimit: RateLimitEngine;
  private templates: TemplateEngine;

  constructor(context: AgentContext) {
    this.context = context;
    this.safetyRails = new SafetyRailsEngine(context);
    this.rateLimit = new RateLimitEngine(context);
    this.templates = new TemplateEngine(context);
  }

  /**
   * Create and send a review request
   */
  async createReviewRequest(
    input: ReviewRequestInput
  ): Promise<AgentResult<ReviewRequest>> {
    try {
      // 1. Check rate limits
      const rateLimitCheck = await this.rateLimit.checkLimit(input.customerId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          metadata: { rateLimits: rateLimitCheck.limits },
        };
      }

      // 2. Create review request record
      const request = await this.createRequest(input);

      // 3. Generate personalized message
      const message = await this.generateMessage(request, input);

      // 4. Safety check
      const safetyCheck = await this.safetyRails.checkMessage(
        message,
        'reputation_manager',
        {
          customerId: input.customerId,
          customerName: input.customerName,
        }
      );

      if (!safetyCheck.safe) {
        await this.updateRequestStatus(request.id, 'failed');
        return {
          success: false,
          error: 'Message failed safety check',
          metadata: { violations: safetyCheck.violations },
        };
      }

      const finalMessage = safetyCheck.modifiedMessage || message;

      // 5. Send message
      const deliveryResult = await this.sendMessage(
        request,
        finalMessage,
        input.preferredMethod
      );

      if (!deliveryResult.success) {
        await this.updateRequestStatus(request.id, 'failed');
        return {
          success: false,
          error: deliveryResult.error || 'Failed to send message',
        };
      }

      // 6. Update request status and rate limit
      await this.updateRequestStatus(request.id, 'sent');
      await this.rateLimit.incrementCount(input.customerId);

      // 7. Schedule follow-up if needed
      await this.scheduleFollowup(request);

      return {
        success: true,
        data: request,
        metadata: { deliveryResult },
      };
    } catch (error) {
      console.error('ReputationManagerAgent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process review response (when customer clicks link or submits review)
   */
  async processReviewResponse(
    requestId: string,
    rating: number,
    reviewText?: string,
    platform?: string
  ): Promise<AgentResult<{ intercepted: boolean }>> {
    try {
      const request = await this.getRequest(requestId);
      if (!request) {
        return { success: false, error: 'Review request not found' };
      }

      const isNegative = rating < 4; // 3 stars or below is negative

      if (isNegative) {
        // Negative review interception
        await this.interceptNegativeReview(request, rating, reviewText);

        return {
          success: true,
          data: { intercepted: true },
          metadata: {
            message:
              'We appreciate your feedback. A team member will contact you shortly to address your concerns.',
          },
        };
      }

      // Positive review - direct to platform
      await this.context.db
        .prepare(
          `UPDATE review_requests
           SET status = 'reviewed',
               review_rating = ?,
               review_text = ?,
               review_platform = ?,
               reviewed_at = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .bind(
          rating,
          reviewText || null,
          platform || null,
          new Date().toISOString(),
          new Date().toISOString(),
          requestId
        )
        .run();

      return {
        success: true,
        data: { intercepted: false },
        metadata: {
          message: 'Thank you for your positive review!',
          redirectUrl: this.getReviewPlatformUrl(platform || 'google'),
        },
      };
    } catch (error) {
      console.error('Error processing review response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run follow-up sequence for pending reviews
   */
  async runFollowupSequence(): Promise<AgentResult<{ processed: number }>> {
    try {
      const now = new Date().toISOString();

      // Get requests needing follow-up
      const requests = await this.context.db
        .prepare(
          `SELECT * FROM review_requests
           WHERE tenant_id = ?
           AND status IN ('sent', 'delivered')
           AND next_followup_at <= ?
           AND sequence_step < max_sequences
           ORDER BY next_followup_at ASC
           LIMIT 50`
        )
        .bind(this.context.tenantId, now)
        .all<{
          id: string;
          customer_id: string;
          phone_number: string | null;
          email: string | null;
          sequence_step: number;
          delivery_method: DeliveryMethod;
          request_metadata: string | null;
        }>();

      let processed = 0;

      for (const req of requests.results || []) {
        // Generate follow-up message
        const message = await this.generateFollowupMessage(
          req.sequence_step + 1,
          JSON.parse(req.request_metadata || '{}')
        );

        // Send follow-up
        const deliveryResult = await this.sendMessage(
          { id: req.id } as ReviewRequest,
          message,
          req.delivery_method
        );

        if (deliveryResult.success) {
          // Update sequence step and schedule next follow-up
          await this.context.db
            .prepare(
              `UPDATE review_requests
               SET sequence_step = sequence_step + 1,
                   next_followup_at = datetime('now', '+' || ? || ' days'),
                   updated_at = ?
               WHERE id = ?`
            )
            .bind(this.getFollowupIntervalDays(), new Date().toISOString(), req.id)
            .run();

          processed++;
        }
      }

      return {
        success: true,
        data: { processed },
      };
    } catch (error) {
      console.error('Error running follow-up sequence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Create review request in database
   */
  private async createRequest(input: ReviewRequestInput): Promise<ReviewRequest> {
    const id = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const request: ReviewRequest = {
      id,
      tenantId: this.context.tenantId,
      customerId: input.customerId,
      jobId: input.jobId,
      deliveryMethod: input.preferredMethod,
      phoneNumber: input.customerPhone,
      email: input.customerEmail,
      status: 'pending',
      isNegative: false,
      sequenceStep: 1,
      maxSequences: 3,
      requestMetadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    await this.context.db
      .prepare(
        `INSERT INTO review_requests (
          id, tenant_id, customer_id, job_id, delivery_method,
          phone_number, email, status, is_negative, sequence_step,
          max_sequences, request_metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        request.id,
        request.tenantId,
        request.customerId,
        request.jobId || null,
        request.deliveryMethod,
        request.phoneNumber || null,
        request.email || null,
        request.status,
        request.isNegative ? 1 : 0,
        request.sequenceStep,
        request.maxSequences,
        JSON.stringify(request.requestMetadata || {}),
        request.createdAt,
        request.updatedAt
      )
      .run();

    return request;
  }

  /**
   * Generate personalized review request message
   */
  private async generateMessage(
    request: ReviewRequest,
    input: ReviewRequestInput
  ): Promise<string> {
    const template = await this.templates.getTemplate(
      'reputation_manager',
      'initial_review_request'
    );

    if (!template) {
      // Fallback template
      return `Hi ${input.customerName}! We hope you're happy with the ${input.jobType || 'service'} we completed for you${input.jobCompletedAt ? ` on ${new Date(input.jobCompletedAt).toLocaleDateString()}` : ''}. Would you mind leaving us a quick review? It helps us improve and helps others find great service! Click here: [review link]\n\nReply STOP to opt out.`;
    }

    const reviewLink = this.generateReviewLink(request.id);

    return this.templates.renderTemplate(template, {
      customerName: input.customerName,
      jobType: input.jobType || 'service',
      jobDate: input.jobCompletedAt
        ? new Date(input.jobCompletedAt).toLocaleDateString()
        : 'recently',
      reviewLink,
      businessName: 'our team', // TODO: Get from tenant
    });
  }

  /**
   * Generate follow-up message
   */
  private async generateFollowupMessage(
    sequenceStep: number,
    metadata: Record<string, unknown>
  ): Promise<string> {
    const templateName = `followup_${sequenceStep}`;
    const template = await this.templates.getTemplate('reputation_manager', templateName);

    if (!template) {
      // Generic follow-up
      return `Just following up on our review request. Your feedback means a lot to us! [review link]\n\nReply STOP to opt out.`;
    }

    return this.templates.renderTemplate(template, {
      customerName: (metadata.customerName as string) || 'there',
      reviewLink: metadata.reviewLink as string,
    });
  }

  /**
   * Send message via preferred channel
   */
  private async sendMessage(
    request: ReviewRequest,
    message: string,
    method: DeliveryMethod
  ): Promise<MessageDeliveryResult> {
    // TODO: Integrate with actual SMS/WhatsApp/Email providers
    // For now, simulate successful delivery

    if (this.context.environment === 'development') {
      console.log(`[DEV] Would send ${method} to ${request.phoneNumber || request.email}:`);
      console.log(message);

      return {
        success: true,
        messageId: `dev-${Date.now()}`,
        deliveryMethod: method,
        deliveredAt: new Date().toISOString(),
      };
    }

    // Production would integrate with:
    // - SMS: Twilio, MessageBird
    // - WhatsApp: Twilio WhatsApp API
    // - Email: SendGrid, AWS SES

    return {
      success: false,
      deliveryMethod: method,
      error: 'No messaging provider configured',
    };
  }

  /**
   * Intercept negative review
   */
  private async interceptNegativeReview(
    request: ReviewRequest,
    rating: number,
    reviewText?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Mark as negative and update status
    await this.context.db
      .prepare(
        `UPDATE review_requests
         SET status = 'reviewed',
             is_negative = 1,
             review_rating = ?,
             review_text = ?,
             reviewed_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(rating, reviewText || null, now, now, request.id)
      .run();

    // Create human handoff for damage control
    await this.safetyRails.createHandoff(
      'reputation_manager',
      request.id,
      request.customerId,
      'Negative review intercepted',
      {
        urgency: 'high',
        customerContext: {
          rating,
          reviewText,
          jobId: request.jobId,
        },
        suggestedActions: [
          'Call customer within 24 hours',
          'Understand concerns and offer resolution',
          'Follow up to ensure satisfaction',
          'Request review update if issue resolved',
        ],
      }
    );
  }

  /**
   * Update request status
   */
  private async updateRequestStatus(
    requestId: string,
    status: ReviewRequestStatus
  ): Promise<void> {
    const statusField = `${status}_at`;
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE review_requests
         SET status = ?,
             ${status === 'sent' ? 'sent_at' : status === 'delivered' ? 'delivered_at' : 'updated_at'} = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(status, now, now, requestId)
      .run();
  }

  /**
   * Schedule follow-up
   */
  private async scheduleFollowup(request: ReviewRequest): Promise<void> {
    const followupDays = this.getFollowupIntervalDays();

    await this.context.db
      .prepare(
        `UPDATE review_requests
         SET next_followup_at = datetime('now', '+' || ? || ' days')
         WHERE id = ?`
      )
      .bind(followupDays, request.id)
      .run();
  }

  /**
   * Get request by ID
   */
  private async getRequest(requestId: string): Promise<ReviewRequest | null> {
    const result = await this.context.db
      .prepare('SELECT * FROM review_requests WHERE id = ?')
      .bind(requestId)
      .first<{
        id: string;
        tenant_id: string;
        customer_id: string;
        job_id: string | null;
        delivery_method: DeliveryMethod;
        phone_number: string | null;
        email: string | null;
        status: ReviewRequestStatus;
        sent_at: string | null;
        delivered_at: string | null;
        clicked_at: string | null;
        reviewed_at: string | null;
        review_platform: string | null;
        review_rating: number | null;
        review_text: string | null;
        is_negative: number;
        sequence_step: number;
        max_sequences: number;
        next_followup_at: string | null;
        request_metadata: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      tenantId: result.tenant_id,
      customerId: result.customer_id,
      jobId: result.job_id || undefined,
      deliveryMethod: result.delivery_method,
      phoneNumber: result.phone_number || undefined,
      email: result.email || undefined,
      status: result.status,
      sentAt: result.sent_at || undefined,
      deliveredAt: result.delivered_at || undefined,
      clickedAt: result.clicked_at || undefined,
      reviewedAt: result.reviewed_at || undefined,
      reviewPlatform: result.review_platform as ReviewRequest['reviewPlatform'],
      reviewRating: result.review_rating || undefined,
      reviewText: result.review_text || undefined,
      isNegative: result.is_negative === 1,
      sequenceStep: result.sequence_step,
      maxSequences: result.max_sequences,
      nextFollowupAt: result.next_followup_at || undefined,
      requestMetadata: result.request_metadata
        ? JSON.parse(result.request_metadata)
        : undefined,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  /**
   * Generate review link
   */
  private generateReviewLink(requestId: string): string {
    // TODO: Generate actual review page URL
    return `https://estateflow.com/review/${requestId}`;
  }

  /**
   * Get review platform URL
   */
  private getReviewPlatformUrl(platform: string): string {
    // TODO: Get actual business URLs from tenant config
    const urls: Record<string, string> = {
      google: 'https://g.page/r/YOUR_GOOGLE_PLACE_ID/review',
      yelp: 'https://www.yelp.com/writeareview/biz/YOUR_YELP_ID',
      facebook: 'https://www.facebook.com/YOUR_PAGE/reviews',
      trustpilot: 'https://www.trustpilot.com/evaluate/YOUR_DOMAIN',
    };

    return urls[platform] || urls.google;
  }

  /**
   * Get follow-up interval in days
   */
  private getFollowupIntervalDays(): number {
    // TODO: Load from tenant config
    return 3; // Default: 3 days between follow-ups
  }
}
