/**
 * Sales Nurturer Agent - TICK-022
 * AI-powered lead recovery and nurturing automation
 *
 * Features:
 * - Missed call text-back
 * - Abandoned quote recovery
 * - Lead qualification bot
 * - Appointment scheduling
 * - Target: 20% lead recovery rate
 */

import type {
  AgentContext,
  LeadNurtureSequence,
  LeadNurtureMessage,
  LeadNurtureInput,
  NurtureStatus,
  NurtureTrigger,
  MessageIntent,
  MessageSentiment,
  DeliveryMethod,
  MessageDeliveryResult,
  AgentResult,
} from './types';
import { SafetyRailsEngine, RateLimitEngine, TemplateEngine } from './safety-rails';

// =============================================================================
// SALES NURTURER AGENT
// =============================================================================

export class SalesNurturerAgent {
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
   * Start nurture sequence for a lead
   */
  async startNurtureSequence(
    input: LeadNurtureInput
  ): Promise<AgentResult<LeadNurtureSequence>> {
    try {
      // 1. Check rate limits
      const rateLimitCheck = await this.rateLimit.checkLimit(input.leadId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          metadata: { rateLimits: rateLimitCheck.limits },
        };
      }

      // 2. Check if sequence already exists for this lead
      const existing = await this.getActiveSequence(input.leadId);
      if (existing) {
        return {
          success: false,
          error: 'Active nurture sequence already exists for this lead',
          data: existing,
        };
      }

      // 3. Create sequence
      const sequence = await this.createSequence(input);

      // 4. Send initial message
      const messageResult = await this.sendSequenceMessage(sequence, input);

      if (!messageResult.success) {
        await this.updateSequenceStatus(sequence.id, 'failed');
        return {
          success: false,
          error: messageResult.error || 'Failed to send initial message',
        };
      }

      // 5. Update rate limit
      await this.rateLimit.incrementCount(input.leadId);

      return {
        success: true,
        data: sequence,
      };
    } catch (error) {
      console.error('SalesNurturerAgent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process incoming message from lead
   */
  async processIncomingMessage(
    leadId: string,
    messageText: string,
    deliveryMethod: DeliveryMethod
  ): Promise<AgentResult<{ reply?: string; handoff?: boolean }>> {
    try {
      const sequence = await this.getActiveSequence(leadId);
      if (!sequence) {
        return {
          success: false,
          error: 'No active sequence found for this lead',
        };
      }

      // 1. Save incoming message
      const incomingMsg = await this.saveMessage(sequence.id, {
        direction: 'inbound',
        messageText,
        deliveryMethod,
      });

      // 2. Analyze intent and sentiment
      const analysis = this.analyzeMessage(messageText);

      // 3. Update message with analysis
      await this.updateMessageAnalysis(incomingMsg.id, analysis);

      // 4. Check for handoff triggers
      const safetyCheck = await this.safetyRails.checkMessage(
        messageText,
        'sales_nurturer',
        { leadId, sequenceId: sequence.id }
      );

      if (safetyCheck.action === 'handoff' || analysis.intent === 'not_interested') {
        await this.createHandoff(sequence, messageText, analysis);
        return {
          success: true,
          data: {
            handoff: true,
            reply:
              'Thank you for your message. A team member will be in touch with you shortly.',
          },
        };
      }

      // 5. Check for opt-out keywords
      if (this.isOptOut(messageText)) {
        await this.handleOptOut(sequence, leadId);
        return {
          success: true,
          data: {
            reply: "You've been unsubscribed from our automated messages. Thank you!",
          },
        };
      }

      // 6. Check for qualification signals
      if (analysis.intent === 'ready_to_buy') {
        await this.markAsQualified(sequence.id);
      }

      // 7. Generate intelligent response
      const reply = await this.generateResponse(sequence, messageText, analysis);

      // 8. Send response
      const deliveryResult = await this.sendMessage(
        sequence,
        reply,
        deliveryMethod,
        'auto_response'
      );

      if (!deliveryResult.success) {
        return {
          success: false,
          error: 'Failed to send response',
        };
      }

      // 9. Update sequence
      await this.updateLastMessageReceived(sequence.id);

      return {
        success: true,
        data: { reply },
      };
    } catch (error) {
      console.error('Error processing incoming message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run scheduled nurture sequences
   */
  async runScheduledSequences(): Promise<AgentResult<{ processed: number }>> {
    try {
      const now = new Date().toISOString();

      // Get sequences due for next action
      const sequences = await this.context.db
        .prepare(
          `SELECT * FROM lead_nurture_sequences
           WHERE tenant_id = ?
           AND status = 'active'
           AND next_action_at <= ?
           AND sequence_step < max_steps
           ORDER BY next_action_at ASC
           LIMIT 50`
        )
        .bind(this.context.tenantId, now)
        .all<{
          id: string;
          lead_id: string;
          trigger_type: NurtureTrigger;
          trigger_data: string | null;
          sequence_step: number;
        }>();

      let processed = 0;

      for (const seq of sequences.results || []) {
        // Generate next message in sequence
        const message = await this.generateSequenceMessage(
          seq.sequence_step + 1,
          seq.trigger_type,
          JSON.parse(seq.trigger_data || '{}')
        );

        // Send message
        const deliveryResult = await this.sendMessage(
          { id: seq.id } as LeadNurtureSequence,
          message,
          'sms', // TODO: Get from sequence config
          `sequence_step_${seq.sequence_step + 1}`
        );

        if (deliveryResult.success) {
          // Advance sequence
          await this.advanceSequence(seq.id);
          processed++;
        }
      }

      return {
        success: true,
        data: { processed },
      };
    } catch (error) {
      console.error('Error running scheduled sequences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule appointment for qualified lead
   */
  async scheduleAppointment(
    sequenceId: string,
    appointmentTime: string
  ): Promise<AgentResult<void>> {
    try {
      const now = new Date().toISOString();

      await this.context.db
        .prepare(
          `UPDATE lead_nurture_sequences
           SET appointment_scheduled = 1,
               status = 'converted',
               converted_at = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .bind(now, now, sequenceId)
        .run();

      // TODO: Integrate with calendar system (Google Calendar, Calendly, etc.)

      return { success: true };
    } catch (error) {
      console.error('Error scheduling appointment:', error);
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
   * Create nurture sequence
   */
  private async createSequence(input: LeadNurtureInput): Promise<LeadNurtureSequence> {
    const id = `nurture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const sequence: LeadNurtureSequence = {
      id,
      tenantId: this.context.tenantId,
      leadId: input.leadId,
      triggerType: input.triggerType,
      triggerData: input.triggerData,
      sequenceStep: 1,
      maxSteps: 5,
      status: 'active',
      messageCount: 0,
      leadQualified: false,
      appointmentScheduled: false,
      conversionValue: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.context.db
      .prepare(
        `INSERT INTO lead_nurture_sequences (
          id, tenant_id, lead_id, trigger_type, trigger_data,
          sequence_step, max_steps, status, message_count,
          lead_qualified, appointment_scheduled, conversion_value,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        sequence.id,
        sequence.tenantId,
        sequence.leadId,
        sequence.triggerType,
        JSON.stringify(sequence.triggerData || {}),
        sequence.sequenceStep,
        sequence.maxSteps,
        sequence.status,
        sequence.messageCount,
        sequence.leadQualified ? 1 : 0,
        sequence.appointmentScheduled ? 1 : 0,
        sequence.conversionValue,
        sequence.createdAt,
        sequence.updatedAt
      )
      .run();

    return sequence;
  }

  /**
   * Send initial sequence message
   */
  private async sendSequenceMessage(
    sequence: LeadNurtureSequence,
    input: LeadNurtureInput
  ): Promise<AgentResult<LeadNurtureMessage>> {
    const message = await this.generateSequenceMessage(
      1,
      input.triggerType,
      {
        leadName: input.leadName,
        ...input.triggerData,
      }
    );

    // Safety check
    const safetyCheck = await this.safetyRails.checkMessage(
      message,
      'sales_nurturer',
      { leadId: input.leadId }
    );

    if (!safetyCheck.safe) {
      return {
        success: false,
        error: 'Message failed safety check',
        metadata: { violations: safetyCheck.violations },
      };
    }

    const finalMessage = safetyCheck.modifiedMessage || message;

    // Send message
    const deliveryResult = await this.sendMessage(
      sequence,
      finalMessage,
      input.preferredMethod,
      'initial'
    );

    if (!deliveryResult.success) {
      return {
        success: false,
        error: deliveryResult.error || 'Failed to send message',
      };
    }

    // Get the saved message
    const savedMessage = await this.getLatestMessage(sequence.id);

    return {
      success: true,
      data: savedMessage!,
    };
  }

  /**
   * Generate message for sequence step
   */
  private async generateSequenceMessage(
    step: number,
    trigger: NurtureTrigger,
    context: Record<string, unknown>
  ): Promise<string> {
    const templateName = `${trigger}_step_${step}`;
    const template = await this.templates.getTemplate('sales_nurturer', templateName);

    if (template) {
      return this.templates.renderTemplate(template, {
        leadName: (context.leadName as string) || 'there',
        businessName: 'our team', // TODO: Get from tenant
        ...context,
      });
    }

    // Fallback messages by trigger type
    const fallbacks: Record<NurtureTrigger, string[]> = {
      missed_call: [
        `Hi ${context.leadName || 'there'}! I noticed you called us earlier. How can we help you today? Reply with your question or say YES to schedule a call back.`,
        `Just following up on your call. We're here to help! What service are you interested in?`,
        `Still interested in our services? Let us know and we'll get you taken care of right away.`,
      ],
      abandoned_quote: [
        `Hi ${context.leadName || 'there'}! I see you started a quote request. Can I help you complete it? Just reply YES and I'll assist you.`,
        `Your quote is ready! Reply YES to see it or let me know if you have any questions.`,
        `Still need that quote? We're here to help. Just say the word!`,
      ],
      no_response: [
        `Hi ${context.leadName || 'there'}! Just checking in. Are you still looking for ${context.service || 'our services'}?`,
        `Wanted to follow up. Do you have any questions about our services?`,
        `We're here when you're ready. Let us know how we can help!`,
      ],
      cold_lead: [
        `Hi ${context.leadName || 'there'}! We noticed you were interested in ${context.service || 'our services'}. Can we help you today?`,
        `Just reaching out to see if you're still looking for ${context.service || 'help with your project'}?`,
        `We'd love to help with your project. Are you still interested?`,
      ],
    };

    const messages = fallbacks[trigger] || fallbacks.missed_call;
    const stepIndex = Math.min(step - 1, messages.length - 1);

    return messages[stepIndex] + '\n\nReply STOP to opt out.';
  }

  /**
   * Generate intelligent response based on lead message
   */
  private async generateResponse(
    sequence: LeadNurtureSequence,
    leadMessage: string,
    analysis: { intent: MessageIntent; sentiment: MessageSentiment }
  ): Promise<string> {
    // TODO: Use actual AI (Cloudflare Workers AI or OpenAI) for intelligent responses
    // For now, use rule-based responses

    const messageLower = leadMessage.toLowerCase();

    // Question detection
    if (messageLower.includes('?') || analysis.intent === 'question') {
      return `Great question! Our team specializes in that. Would you like to schedule a quick call to discuss your specific needs? Reply YES to book a time.`;
    }

    // Pricing inquiry
    if (
      messageLower.includes('price') ||
      messageLower.includes('cost') ||
      messageLower.includes('how much')
    ) {
      return `Pricing varies based on your specific needs. I'd love to provide you with an accurate quote. Can we schedule a brief call to understand your requirements? Reply YES to book.`;
    }

    // Availability inquiry
    if (
      messageLower.includes('available') ||
      messageLower.includes('schedule') ||
      messageLower.includes('when')
    ) {
      return `We have availability this week! What day works best for you? Reply with a day (Monday, Tuesday, etc.) and I'll check our schedule.`;
    }

    // Ready to move forward
    if (
      messageLower.includes('yes') ||
      messageLower.includes('interested') ||
      analysis.intent === 'ready_to_buy'
    ) {
      return `Excellent! Let's get you scheduled. What day works best for you this week? Reply with your preferred day and time.`;
    }

    // General response
    return `Thanks for getting back to me! I'd love to help you with this. Would you like to schedule a call to discuss? Reply YES or let me know what questions you have.`;
  }

  /**
   * Analyze message for intent and sentiment
   */
  private analyzeMessage(message: string): {
    intent: MessageIntent;
    sentiment: MessageSentiment;
  } {
    // TODO: Use actual AI for analysis (Cloudflare Workers AI)
    // For now, use simple keyword matching

    const messageLower = message.toLowerCase();

    // Intent detection
    let intent: MessageIntent = 'unclear';

    if (
      messageLower.includes('yes') ||
      messageLower.includes('interested') ||
      messageLower.includes('schedule') ||
      messageLower.includes('book')
    ) {
      intent = 'ready_to_buy';
    } else if (
      messageLower.includes('no') ||
      messageLower.includes('not interested') ||
      messageLower.includes('stop') ||
      messageLower.includes('unsubscribe')
    ) {
      intent = 'not_interested';
    } else if (messageLower.includes('?')) {
      intent = 'question';
    } else if (
      messageLower.includes('but') ||
      messageLower.includes('however') ||
      messageLower.includes('expensive')
    ) {
      intent = 'objection';
    }

    // Sentiment detection
    let sentiment: MessageSentiment = 'neutral';

    const positiveWords = ['great', 'awesome', 'perfect', 'excellent', 'love', 'thanks'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'never'];

    if (positiveWords.some((word) => messageLower.includes(word))) {
      sentiment = 'positive';
    } else if (negativeWords.some((word) => messageLower.includes(word))) {
      sentiment = 'negative';
    }

    return { intent, sentiment };
  }

  /**
   * Send message
   */
  private async sendMessage(
    sequence: LeadNurtureSequence,
    message: string,
    method: DeliveryMethod,
    templateUsed?: string
  ): Promise<MessageDeliveryResult> {
    // Save message first
    const savedMessage = await this.saveMessage(sequence.id, {
      direction: 'outbound',
      messageText: message,
      deliveryMethod: method,
      templateUsed,
    });

    // TODO: Integrate with actual messaging providers
    if (this.context.environment === 'development') {
      console.log(`[DEV] Would send ${method}:`);
      console.log(message);

      await this.updateMessageDelivery(savedMessage.id, 'delivered');

      return {
        success: true,
        messageId: savedMessage.id,
        deliveryMethod: method,
        deliveredAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      deliveryMethod: method,
      error: 'No messaging provider configured',
    };
  }

  /**
   * Save message to database
   */
  private async saveMessage(
    sequenceId: string,
    data: {
      direction: 'outbound' | 'inbound';
      messageText: string;
      deliveryMethod: DeliveryMethod;
      templateUsed?: string;
    }
  ): Promise<LeadNurtureMessage> {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const message: LeadNurtureMessage = {
      id,
      sequenceId,
      tenantId: this.context.tenantId,
      direction: data.direction,
      messageText: data.messageText,
      templateUsed: data.templateUsed,
      deliveryMethod: data.deliveryMethod,
      deliveryStatus: 'pending',
      needsHumanHandoff: false,
      createdAt: now,
    };

    await this.context.db
      .prepare(
        `INSERT INTO lead_nurture_messages (
          id, sequence_id, tenant_id, direction, message_text,
          template_used, delivery_method, delivery_status,
          needs_human_handoff, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        message.id,
        message.sequenceId,
        message.tenantId,
        message.direction,
        message.messageText,
        message.templateUsed || null,
        message.deliveryMethod,
        message.deliveryStatus,
        message.needsHumanHandoff ? 1 : 0,
        message.createdAt
      )
      .run();

    // Update sequence message count
    await this.context.db
      .prepare(
        `UPDATE lead_nurture_sequences
         SET message_count = message_count + 1,
             ${data.direction === 'outbound' ? 'last_message_sent_at' : 'last_message_received_at'} = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(now, now, sequenceId)
      .run();

    return message;
  }

  /**
   * Update message analysis
   */
  private async updateMessageAnalysis(
    messageId: string,
    analysis: { intent: MessageIntent; sentiment: MessageSentiment }
  ): Promise<void> {
    await this.context.db
      .prepare(
        `UPDATE lead_nurture_messages
         SET intent_detected = ?,
             sentiment = ?
         WHERE id = ?`
      )
      .bind(analysis.intent, analysis.sentiment, messageId)
      .run();
  }

  /**
   * Update message delivery status
   */
  private async updateMessageDelivery(
    messageId: string,
    status: 'sent' | 'delivered' | 'failed'
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE lead_nurture_messages
         SET delivery_status = ?,
             ${status === 'sent' ? 'sent_at' : 'delivered_at'} = ?
         WHERE id = ?`
      )
      .bind(status, now, messageId)
      .run();
  }

  /**
   * Get active sequence for lead
   */
  private async getActiveSequence(leadId: string): Promise<LeadNurtureSequence | null> {
    const result = await this.context.db
      .prepare(
        `SELECT * FROM lead_nurture_sequences
         WHERE tenant_id = ? AND lead_id = ? AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(this.context.tenantId, leadId)
      .first<{
        id: string;
        tenant_id: string;
        lead_id: string;
        trigger_type: NurtureTrigger;
        trigger_data: string | null;
        sequence_step: number;
        max_steps: number;
        current_template: string | null;
        status: NurtureStatus;
        next_action_at: string | null;
        last_message_sent_at: string | null;
        last_message_received_at: string | null;
        message_count: number;
        lead_qualified: number;
        appointment_scheduled: number;
        converted_at: string | null;
        conversion_value: number;
        created_at: string;
        updated_at: string;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      tenantId: result.tenant_id,
      leadId: result.lead_id,
      triggerType: result.trigger_type,
      triggerData: result.trigger_data ? JSON.parse(result.trigger_data) : undefined,
      sequenceStep: result.sequence_step,
      maxSteps: result.max_steps,
      currentTemplate: result.current_template || undefined,
      status: result.status,
      nextActionAt: result.next_action_at || undefined,
      lastMessageSentAt: result.last_message_sent_at || undefined,
      lastMessageReceivedAt: result.last_message_received_at || undefined,
      messageCount: result.message_count,
      leadQualified: result.lead_qualified === 1,
      appointmentScheduled: result.appointment_scheduled === 1,
      convertedAt: result.converted_at || undefined,
      conversionValue: result.conversion_value,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  /**
   * Get latest message for sequence
   */
  private async getLatestMessage(
    sequenceId: string
  ): Promise<LeadNurtureMessage | null> {
    const result = await this.context.db
      .prepare(
        `SELECT * FROM lead_nurture_messages
         WHERE sequence_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(sequenceId)
      .first<any>();

    if (!result) return null;

    return {
      id: result.id,
      sequenceId: result.sequence_id,
      tenantId: result.tenant_id,
      direction: result.direction,
      messageText: result.message_text,
      templateUsed: result.template_used || undefined,
      deliveryMethod: result.delivery_method,
      deliveryStatus: result.delivery_status,
      intentDetected: result.intent_detected || undefined,
      sentiment: result.sentiment || undefined,
      needsHumanHandoff: result.needs_human_handoff === 1,
      sentAt: result.sent_at || undefined,
      deliveredAt: result.delivered_at || undefined,
      createdAt: result.created_at,
    };
  }

  /**
   * Update sequence status
   */
  private async updateSequenceStatus(
    sequenceId: string,
    status: NurtureStatus
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE lead_nurture_sequences
         SET status = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(status, now, sequenceId)
      .run();
  }

  /**
   * Update last message received timestamp
   */
  private async updateLastMessageReceived(sequenceId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE lead_nurture_sequences
         SET last_message_received_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(now, now, sequenceId)
      .run();
  }

  /**
   * Mark lead as qualified
   */
  private async markAsQualified(sequenceId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE lead_nurture_sequences
         SET lead_qualified = 1, updated_at = ?
         WHERE id = ?`
      )
      .bind(now, sequenceId)
      .run();
  }

  /**
   * Advance sequence to next step
   */
  private async advanceSequence(sequenceId: string): Promise<void> {
    const now = new Date().toISOString();
    const nextActionHours = 24; // TODO: Get from config

    await this.context.db
      .prepare(
        `UPDATE lead_nurture_sequences
         SET sequence_step = sequence_step + 1,
             next_action_at = datetime('now', '+' || ? || ' hours'),
             updated_at = ?
         WHERE id = ?`
      )
      .bind(nextActionHours, now, sequenceId)
      .run();
  }

  /**
   * Check if message is opt-out request
   */
  private isOptOut(message: string): boolean {
    const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove', 'cancel'];
    const messageLower = message.toLowerCase().trim();

    return optOutKeywords.some((keyword) => messageLower === keyword);
  }

  /**
   * Handle opt-out request
   */
  private async handleOptOut(sequence: LeadNurtureSequence, leadId: string): Promise<void> {
    await this.updateSequenceStatus(sequence.id, 'opted_out');
    await this.rateLimit.optOut(leadId, 'Customer requested opt-out');
  }

  /**
   * Create human handoff
   */
  private async createHandoff(
    sequence: LeadNurtureSequence,
    leadMessage: string,
    analysis: { intent: MessageIntent; sentiment: MessageSentiment }
  ): Promise<void> {
    // Get conversation history
    const messages = await this.context.db
      .prepare(
        `SELECT direction, message_text, created_at
         FROM lead_nurture_messages
         WHERE sequence_id = ?
         ORDER BY created_at ASC`
      )
      .bind(sequence.id)
      .all<{
        direction: 'outbound' | 'inbound';
        message_text: string;
        created_at: string;
      }>();

    const conversationHistory = (messages.results || []).map((msg) => ({
      role: msg.direction === 'outbound' ? ('agent' as const) : ('customer' as const),
      message: msg.message_text,
      timestamp: msg.created_at,
    }));

    await this.safetyRails.createHandoff(
      'sales_nurturer',
      sequence.id,
      sequence.leadId,
      analysis.intent === 'not_interested'
        ? 'Lead not interested'
        : 'Complex question requires human',
      {
        urgency: analysis.sentiment === 'negative' ? 'high' : 'normal',
        conversationHistory,
        customerContext: {
          triggerType: sequence.triggerType,
          leadQualified: sequence.leadQualified,
          messageCount: sequence.messageCount,
          lastMessage: leadMessage,
          intent: analysis.intent,
          sentiment: analysis.sentiment,
        },
        suggestedActions: [
          'Review conversation history',
          'Address customer concerns',
          analysis.intent === 'ready_to_buy' ? 'Schedule appointment' : 'Provide information',
          'Follow up within 4 hours',
        ],
      }
    );
  }
}
