/**
 * AI Safety Rails - Responsible AI Controls
 * TICK-023: Ensures AI agents operate safely and responsibly
 *
 * Features:
 * - Response template validation
 * - Prohibited topics detection
 * - Human handoff triggers
 * - Rate limiting per customer
 * - Opt-out management
 */

import type {
  AgentContext,
  AgentType,
  SafetyRule,
  SafetyCheckResult,
  SafetyViolation,
  SafetyAction,
  ResponseTemplate,
  HumanHandoff,
  CustomerRateLimit,
  RateLimitCheck,
} from './types';

// =============================================================================
// SAFETY RULES ENGINE
// =============================================================================

export class SafetyRailsEngine {
  private context: AgentContext;
  private cachedRules: SafetyRule[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Check message against all safety rules
   */
  async checkMessage(
    message: string,
    agentType: AgentType,
    customerContext?: Record<string, unknown>
  ): Promise<SafetyCheckResult> {
    const rules = await this.getActiveRules(agentType);
    const violations: SafetyViolation[] = [];

    for (const rule of rules) {
      const violation = this.checkRule(message, rule);
      if (violation) {
        violations.push(violation);
      }
    }

    if (violations.length === 0) {
      return {
        safe: true,
        violations: [],
        action: null,
      };
    }

    // Determine action based on highest priority violation
    const action = this.determineAction(violations);

    // Apply action to message
    let modifiedMessage = message;
    if (action === 'add_disclaimer') {
      modifiedMessage = this.addDisclaimers(message, violations);
    }

    return {
      safe: action !== 'block',
      violations,
      action,
      modifiedMessage: modifiedMessage !== message ? modifiedMessage : undefined,
    };
  }

  /**
   * Check single rule against message
   */
  private checkRule(message: string, rule: SafetyRule): SafetyViolation | null {
    const messageLower = message.toLowerCase();

    // Check keywords
    if (rule.keywords && rule.keywords.length > 0) {
      for (const keyword of rule.keywords) {
        if (messageLower.includes(keyword.toLowerCase())) {
          return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            triggeredBy: keyword,
            action: rule.action,
            metadata: rule.actionMetadata,
          };
        }
      }
    }

    // Check regex patterns
    if (rule.patterns && rule.patterns.length > 0) {
      for (const pattern of rule.patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(message)) {
            return {
              ruleId: rule.id,
              ruleName: rule.ruleName,
              ruleType: rule.ruleType,
              triggeredBy: pattern,
              action: rule.action,
              metadata: rule.actionMetadata,
            };
          }
        } catch (e) {
          console.error(`Invalid regex pattern in rule ${rule.id}:`, pattern);
        }
      }
    }

    return null;
  }

  /**
   * Determine highest priority action from violations
   */
  private determineAction(violations: SafetyViolation[]): SafetyAction {
    const priorityOrder: SafetyAction[] = ['block', 'handoff', 'warn', 'add_disclaimer'];

    for (const action of priorityOrder) {
      if (violations.some((v) => v.action === action)) {
        return action;
      }
    }

    return 'warn';
  }

  /**
   * Add disclaimers to message
   */
  private addDisclaimers(message: string, violations: SafetyViolation[]): string {
    const disclaimers: string[] = [];

    for (const violation of violations) {
      if (violation.action === 'add_disclaimer' && violation.metadata?.disclaimer) {
        disclaimers.push(violation.metadata.disclaimer as string);
      }
    }

    if (disclaimers.length === 0) {
      return message;
    }

    return `${message}\n\n${disclaimers.join('\n\n')}`;
  }

  /**
   * Get active safety rules for agent type
   */
  private async getActiveRules(agentType: AgentType): Promise<SafetyRule[]> {
    // Check cache
    if (this.cachedRules && Date.now() < this.cacheExpiry) {
      return this.cachedRules.filter((r) => r.appliesToAgents.includes(agentType));
    }

    // Load from database
    const result = await this.context.db
      .prepare(
        `SELECT * FROM ai_safety_rules
         WHERE is_active = 1
         AND (tenant_id = ? OR tenant_id IS NULL)
         ORDER BY tenant_id NULLS LAST`
      )
      .bind(this.context.tenantId)
      .all<{
        id: string;
        tenant_id: string | null;
        rule_type: string;
        rule_name: string;
        rule_description: string | null;
        keywords: string | null;
        patterns: string | null;
        action: SafetyAction;
        action_metadata: string | null;
        applies_to_agents: string;
        is_active: number;
        created_at: string;
      }>();

    const rules: SafetyRule[] = (result.results || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id || undefined,
      ruleType: row.rule_type as SafetyRule['ruleType'],
      ruleName: row.rule_name,
      ruleDescription: row.rule_description || undefined,
      keywords: row.keywords ? JSON.parse(row.keywords) : undefined,
      patterns: row.patterns ? JSON.parse(row.patterns) : undefined,
      action: row.action,
      actionMetadata: row.action_metadata ? JSON.parse(row.action_metadata) : undefined,
      appliesToAgents: JSON.parse(row.applies_to_agents),
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    }));

    // Update cache
    this.cachedRules = rules;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return rules.filter((r) => r.appliesToAgents.includes(agentType));
  }

  /**
   * Create human handoff
   */
  async createHandoff(
    agentType: AgentType,
    conversationId: string,
    customerId: string,
    reason: string,
    context?: {
      urgency?: HumanHandoff['urgency'];
      conversationHistory?: HumanHandoff['conversationHistory'];
      customerContext?: Record<string, unknown>;
      suggestedActions?: string[];
    }
  ): Promise<HumanHandoff> {
    const id = `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const handoff: HumanHandoff = {
      id,
      tenantId: this.context.tenantId,
      agentType,
      conversationId,
      customerId,
      reason,
      urgency: context?.urgency || 'normal',
      conversationHistory: context?.conversationHistory,
      customerContext: context?.customerContext,
      suggestedActions: context?.suggestedActions,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await this.context.db
      .prepare(
        `INSERT INTO ai_human_handoffs (
          id, tenant_id, agent_type, conversation_id, customer_id,
          reason, urgency, conversation_history, customer_context,
          suggested_actions, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        handoff.id,
        handoff.tenantId,
        handoff.agentType,
        handoff.conversationId,
        handoff.customerId,
        handoff.reason,
        handoff.urgency,
        JSON.stringify(handoff.conversationHistory || []),
        JSON.stringify(handoff.customerContext || {}),
        JSON.stringify(handoff.suggestedActions || []),
        handoff.status,
        handoff.createdAt,
        handoff.updatedAt
      )
      .run();

    return handoff;
  }
}

// =============================================================================
// RATE LIMITING ENGINE
// =============================================================================

export class RateLimitEngine {
  private context: AgentContext;

  // Default limits (can be overridden per tenant)
  private readonly DEFAULT_DAILY_LIMIT = 3;
  private readonly DEFAULT_WEEKLY_LIMIT = 10;
  private readonly DEFAULT_MONTHLY_LIMIT = 30;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Check if customer can receive another message
   */
  async checkLimit(customerId: string): Promise<RateLimitCheck> {
    const limits = await this.getOrCreateLimits(customerId);

    // Check opt-out first
    if (limits.optedOut) {
      return {
        allowed: false,
        reason: 'Customer has opted out of automated messages',
        limits: this.formatLimits(limits),
      };
    }

    // Reset counters if needed
    await this.resetIfNeeded(limits);

    // Check limits
    if (limits.dailyInteractions >= this.DEFAULT_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: 'Daily limit reached',
        limits: this.formatLimits(limits),
      };
    }

    if (limits.weeklyInteractions >= this.DEFAULT_WEEKLY_LIMIT) {
      return {
        allowed: false,
        reason: 'Weekly limit reached',
        limits: this.formatLimits(limits),
      };
    }

    if (limits.monthlyInteractions >= this.DEFAULT_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason: 'Monthly limit reached',
        limits: this.formatLimits(limits),
      };
    }

    return {
      allowed: true,
      limits: this.formatLimits(limits),
    };
  }

  /**
   * Increment interaction count
   */
  async incrementCount(customerId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE ai_customer_rate_limits
         SET daily_interactions = daily_interactions + 1,
             weekly_interactions = weekly_interactions + 1,
             monthly_interactions = monthly_interactions + 1,
             last_interaction_at = ?,
             updated_at = ?
         WHERE tenant_id = ? AND customer_id = ?`
      )
      .bind(now, now, this.context.tenantId, customerId)
      .run();
  }

  /**
   * Mark customer as opted out
   */
  async optOut(customerId: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `UPDATE ai_customer_rate_limits
         SET opted_out = 1,
             opted_out_at = ?,
             opt_out_reason = ?,
             updated_at = ?
         WHERE tenant_id = ? AND customer_id = ?`
      )
      .bind(now, reason || 'Customer request', now, this.context.tenantId, customerId)
      .run();
  }

  /**
   * Get or create rate limit record
   */
  private async getOrCreateLimits(customerId: string): Promise<CustomerRateLimit> {
    const result = await this.context.db
      .prepare(
        `SELECT * FROM ai_customer_rate_limits
         WHERE tenant_id = ? AND customer_id = ?`
      )
      .bind(this.context.tenantId, customerId)
      .first<{
        id: string;
        tenant_id: string;
        customer_id: string;
        customer_phone: string | null;
        customer_email: string | null;
        daily_interactions: number;
        weekly_interactions: number;
        monthly_interactions: number;
        opted_out: number;
        opted_out_at: string | null;
        opt_out_reason: string | null;
        last_interaction_at: string | null;
        last_reset_at: string;
        created_at: string;
        updated_at: string;
      }>();

    if (result) {
      return {
        id: result.id,
        tenantId: result.tenant_id,
        customerId: result.customer_id,
        customerPhone: result.customer_phone || undefined,
        customerEmail: result.customer_email || undefined,
        dailyInteractions: result.daily_interactions,
        weeklyInteractions: result.weekly_interactions,
        monthlyInteractions: result.monthly_interactions,
        optedOut: result.opted_out === 1,
        optedOutAt: result.opted_out_at || undefined,
        optOutReason: result.opt_out_reason || undefined,
        lastInteractionAt: result.last_interaction_at || undefined,
        lastResetAt: result.last_reset_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    }

    // Create new record
    const id = `limit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.context.db
      .prepare(
        `INSERT INTO ai_customer_rate_limits (
          id, tenant_id, customer_id, daily_interactions,
          weekly_interactions, monthly_interactions, opted_out,
          last_reset_at, created_at, updated_at
        ) VALUES (?, ?, ?, 0, 0, 0, 0, ?, ?, ?)`
      )
      .bind(id, this.context.tenantId, customerId, now, now, now)
      .run();

    return {
      id,
      tenantId: this.context.tenantId,
      customerId,
      dailyInteractions: 0,
      weeklyInteractions: 0,
      monthlyInteractions: 0,
      optedOut: false,
      lastResetAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Reset counters if time period has elapsed
   */
  private async resetIfNeeded(limits: CustomerRateLimit): Promise<void> {
    const now = new Date();
    const lastReset = new Date(limits.lastResetAt);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    let needsReset = false;
    const updates: string[] = [];
    const bindings: unknown[] = [];

    // Reset daily (every day)
    if (daysSinceReset >= 1) {
      updates.push('daily_interactions = 0');
      needsReset = true;
    }

    // Reset weekly (every 7 days)
    if (daysSinceReset >= 7) {
      updates.push('weekly_interactions = 0');
      needsReset = true;
    }

    // Reset monthly (every 30 days)
    if (daysSinceReset >= 30) {
      updates.push('monthly_interactions = 0');
      needsReset = true;
    }

    if (needsReset) {
      updates.push('last_reset_at = ?');
      updates.push('updated_at = ?');
      bindings.push(now.toISOString(), now.toISOString());

      await this.context.db
        .prepare(
          `UPDATE ai_customer_rate_limits
           SET ${updates.join(', ')}
           WHERE id = ?`
        )
        .bind(...bindings, limits.id)
        .run();
    }
  }

  /**
   * Format limits for response
   */
  private formatLimits(limits: CustomerRateLimit): RateLimitCheck['limits'] {
    return {
      daily: {
        current: limits.dailyInteractions,
        max: this.DEFAULT_DAILY_LIMIT,
      },
      weekly: {
        current: limits.weeklyInteractions,
        max: this.DEFAULT_WEEKLY_LIMIT,
      },
      monthly: {
        current: limits.monthlyInteractions,
        max: this.DEFAULT_MONTHLY_LIMIT,
      },
    };
  }
}

// =============================================================================
// RESPONSE TEMPLATE ENGINE
// =============================================================================

export class TemplateEngine {
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Get template by name
   */
  async getTemplate(
    agentType: AgentType,
    templateName: string
  ): Promise<ResponseTemplate | null> {
    const result = await this.context.db
      .prepare(
        `SELECT * FROM ai_response_templates
         WHERE tenant_id = ? AND agent_type = ? AND template_name = ? AND is_active = 1`
      )
      .bind(this.context.tenantId, agentType, templateName)
      .first<{
        id: string;
        tenant_id: string;
        agent_type: string;
        template_name: string;
        template_category: string;
        template_text: string;
        variables: string | null;
        usage_count: number;
        success_rate: number;
        is_active: number;
        created_at: string;
        updated_at: string;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      tenantId: result.tenant_id,
      agentType: result.agent_type as AgentType,
      templateName: result.template_name,
      templateCategory: result.template_category,
      templateText: result.template_text,
      variables: result.variables ? JSON.parse(result.variables) : undefined,
      usageCount: result.usage_count,
      successRate: result.success_rate,
      isActive: result.is_active === 1,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: ResponseTemplate, variables: Record<string, string>): string {
    let rendered = template.templateText;

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }

    return rendered;
  }

  /**
   * Track template usage
   */
  async trackUsage(templateId: string, successful: boolean): Promise<void> {
    await this.context.db
      .prepare(
        `UPDATE ai_response_templates
         SET usage_count = usage_count + 1,
             success_rate = (success_rate * usage_count + ?) / (usage_count + 1),
             updated_at = ?
         WHERE id = ?`
      )
      .bind(successful ? 1 : 0, new Date().toISOString(), templateId)
      .run();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { SafetyRailsEngine, RateLimitEngine, TemplateEngine };
