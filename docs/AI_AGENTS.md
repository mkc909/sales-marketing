# AI Agents: The Agentic Workforce

## Overview

The SiteForge/EnlacePR platform conceptualizes AI not as features, but as an "Agentic Workforce"—autonomous agents that replace manual labor, enhance operations, and actively drive revenue. This document details the implementation, architecture, and business logic of our AI agent ecosystem.

## Agent Architecture

### Core Agent Framework

```typescript
// Base agent interface
interface Agent {
  id: string;
  name: string;
  type: 'operational' | 'growth' | 'devops';
  tier: 'platform' | 'premium'; // Platform included vs paid add-on
  model: 'llama-3' | 'gpt-4' | 'gemini' | 'claude';

  // Lifecycle
  trigger: TriggerConfig;
  execute: (context: AgentContext) => Promise<AgentResult>;

  // Monitoring
  metrics: AgentMetrics;
  cost: CostModel;
}

interface TriggerConfig {
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  conditions: Record<string, any>;
}

interface AgentContext {
  tenant?: Tenant;
  user?: User;
  data: Record<string, any>;
  env: Env;
}

interface AgentResult {
  success: boolean;
  output: any;
  actions: Action[];
  cost: number;
  duration: number;
}
```

## Operational Agents

### 1. Content Generator Agent

Automatically generates website content during onboarding.

```typescript
class ContentGeneratorAgent implements Agent {
  id = 'content-generator';
  name = 'AI Content Writer';
  type = 'operational';
  tier = 'platform';
  model = 'llama-3';

  trigger = {
    type: 'event',
    conditions: {
      event: 'tenant.created',
      hasContent: false
    }
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    const { tenant } = context;
    const startTime = Date.now();

    // Generate content for each section
    const sections = await Promise.all([
      this.generateHero(tenant),
      this.generateAbout(tenant),
      this.generateServices(tenant),
      this.generateCTA(tenant)
    ]);

    // Store in database
    for (const section of sections) {
      await context.env.DB.prepare(`
        INSERT INTO site_content (tenant_id, section_name, content_json, is_ai_generated)
        VALUES (?, ?, ?, TRUE)
      `).bind(tenant.id, section.name, JSON.stringify(section.content)).run();
    }

    return {
      success: true,
      output: sections,
      actions: [
        { type: 'database.insert', table: 'site_content', count: sections.length }
      ],
      cost: 0.0001, // Llama-3 on Workers AI
      duration: Date.now() - startTime
    };
  }

  private async generateHero(tenant: Tenant) {
    const prompt = this.buildPrompt('hero', tenant);

    const response = await AI.run('@cf/meta/llama-3-8b-instruct', {
      prompt,
      max_tokens: 200,
      temperature: 0.7
    });

    return {
      name: 'hero',
      content: {
        title: response.title,
        subtitle: response.subtitle,
        ctaText: response.ctaText
      }
    };
  }

  private buildPrompt(section: string, tenant: Tenant): string {
    const prompts = {
      hero: `Write a hero section for a ${tenant.industry} business in ${tenant.city}.
             Business name: ${tenant.businessName}
             Focus on: trust, reliability, quick response
             Include: compelling title (max 10 words), subtitle (max 20 words), CTA text (max 5 words)
             Language: ${tenant.locale === 'es-PR' ? 'Spanish' : 'English'}
             Tone: ${tenant.locale === 'es-PR' ? 'Warm, personal (use tú)' : 'Professional'}`,

      about: `Write an about section for ${tenant.businessName}, a ${tenant.industry} in ${tenant.city}.
              Emphasize: experience, local presence, customer service
              Maximum 100 words.
              Include specific benefits for customers.`,

      services: `List 4-6 services for a ${tenant.industry} business.
                 For each service include:
                 - Name (2-3 words)
                 - Description (max 15 words)
                 - Typical price range
                 Format as JSON array.`
    };

    return prompts[section];
  }
}
```

### 2. On-Site Chat Agent

Browser-based chat support on tenant websites.

```typescript
class OnSiteChatAgent implements Agent {
  id = 'onsite-chat';
  name = 'Website Chat Assistant';
  type = 'operational';
  tier = 'platform';
  model = 'llama-3';

  trigger = {
    type: 'webhook',
    conditions: {
      endpoint: '/api/chat',
      source: 'website-widget'
    }
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    const { message, tenant, sessionId } = context.data;

    // Get conversation history
    const history = await this.getConversationHistory(sessionId);

    // Build context from tenant data
    const tenantContext = await this.getTenantContext(tenant.id);

    // Generate response
    const response = await this.generateResponse(
      message,
      history,
      tenantContext
    );

    // Store conversation
    await this.storeMessage(sessionId, message, response);

    return {
      success: true,
      output: {
        message: response,
        suggestedActions: this.extractActions(response)
      },
      actions: [
        { type: 'chat.response', sessionId, message: response }
      ],
      cost: 0.0001,
      duration: Date.now() - context.startTime
    };
  }

  private async generateResponse(
    message: string,
    history: ChatMessage[],
    context: TenantContext
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant for ${context.businessName}.
      Available services: ${JSON.stringify(context.services)}
      Business hours: ${context.hours}
      Contact: ${context.phone}

      Guidelines:
      - Be helpful and friendly
      - Provide specific information about services
      - Encourage booking/contact
      - Use ${context.locale === 'es-PR' ? 'Spanish (tú form)' : 'English'}
      - Keep responses under 100 words`;

    const conversation = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-5), // Last 5 messages
      { role: 'user', content: message }
    ];

    const response = await AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: conversation,
      max_tokens: 150,
      temperature: 0.6
    });

    return response.response;
  }

  private extractActions(response: string): Action[] {
    const actions = [];

    // Detect booking intent
    if (response.includes('schedule') || response.includes('appointment')) {
      actions.push({
        type: 'show_booking',
        label: 'Book Now'
      });
    }

    // Detect contact intent
    if (response.includes('call') || response.includes('contact')) {
      actions.push({
        type: 'show_contact',
        label: 'Contact Us'
      });
    }

    return actions;
  }
}
```

### 3. WhatsApp Bot Agent

Dual-role WhatsApp automation for directory and business.

```typescript
class WhatsAppBotAgent implements Agent {
  id = 'whatsapp-bot';
  name = 'WhatsApp Business Assistant';
  type = 'operational';
  tier = 'premium'; // $89/mo add-on
  model = 'gpt-4'; // Better multilingual support

  trigger = {
    type: 'webhook',
    conditions: {
      endpoint: '/api/whatsapp/webhook',
      source: 'twilio'
    }
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    const { from, to, body } = context.data;

    // Determine bot type
    const botType = await this.determineBotType(to);

    let response;
    if (botType === 'concierge') {
      response = await this.handleConciergeBot(from, body);
    } else {
      const tenant = await this.getTenantByPhone(to);
      response = await this.handleBusinessBot(tenant, from, body);
    }

    // Send WhatsApp response
    await this.sendWhatsAppMessage(from, response);

    return {
      success: true,
      output: { response, botType },
      actions: [
        { type: 'whatsapp.send', to: from, message: response }
      ],
      cost: 0.002, // GPT-4 cost
      duration: Date.now() - context.startTime
    };
  }

  private async handleConciergeBot(from: string, message: string) {
    // Extract intent and location
    const intent = await this.extractIntent(message);

    if (intent.type === 'find_service') {
      const businesses = await this.findBusinesses(
        intent.service,
        intent.location
      );

      return this.formatBusinessList(businesses);
    }

    if (intent.type === 'business_info') {
      const business = await this.getBusinessInfo(intent.businessId);
      return this.formatBusinessInfo(business);
    }

    return "Hola! Soy tu asistente de EnlacePR. Puedo ayudarte a encontrar servicios. Por ejemplo: 'Necesito un plomero en Caguas'";
  }

  private async handleBusinessBot(tenant: Tenant, from: string, message: string) {
    // Get conversation context
    const context = await this.getConversationContext(tenant.id, from);

    // Determine response type
    const responseType = await this.classifyMessage(message);

    switch (responseType) {
      case 'pricing':
        return this.generatePricingResponse(tenant);

      case 'availability':
        return this.generateAvailabilityResponse(tenant);

      case 'booking':
        return await this.initiateBooking(tenant, from, message);

      case 'location':
        return this.generateLocationResponse(tenant);

      default:
        return this.generateGeneralResponse(tenant, message);
    }
  }

  private async generatePricingResponse(tenant: Tenant): Promise<string> {
    const services = await this.getTenantServices(tenant.id);

    let response = `💰 *Precios de ${tenant.businessName}*\n\n`;

    for (const service of services) {
      response += `• *${service.name}*: ${service.priceRange || 'Consultar'}\n`;
    }

    response += `\n📞 Para cotización exacta, llama al ${tenant.phone}`;

    return response;
  }

  private formatBusinessList(businesses: Business[]): string {
    if (businesses.length === 0) {
      return "No encontré servicios en esa área. ¿Puedes ser más específico?";
    }

    let response = `Encontré ${businesses.length} opciones:\n\n`;

    businesses.slice(0, 5).forEach((b, i) => {
      response += `${i + 1}. *${b.name}* ⭐${b.rating || 'N/A'}\n`;
      response += `   📍 ${b.city}\n`;
      response += `   📞 ${b.phone || 'No disponible'}\n`;
      if (b.whatsapp) {
        response += `   💬 wa.me/${b.whatsapp.replace(/\D/g, '')}\n`;
      }
      response += '\n';
    });

    response += "Responde con el número para más información.";

    return response;
  }
}
```

## Growth Engine Agents

### 4. Reputation Manager Agent

Automated review request system.

```typescript
class ReputationManagerAgent implements Agent {
  id = 'reputation-manager';
  name = 'Review Request Automator';
  type = 'growth';
  tier = 'premium';
  model = 'llama-3';

  trigger = {
    type: 'event',
    conditions: {
      event: 'job.status.changed',
      newStatus: 'paid'
    }
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    const { job, tenant } = context.data;

    // Wait 24 hours after job completion
    await this.scheduleDelay('24h');

    // Generate personalized message
    const message = await this.generateReviewRequest(job, tenant);

    // Send SMS
    await this.sendSMS(job.customerPhone, message);

    // Log review request
    await this.logReviewRequest(job.id, tenant.id);

    // Schedule follow-up if no review after 7 days
    await this.scheduleFollowUp(job.id, '7d');

    return {
      success: true,
      output: { message, scheduled: true },
      actions: [
        { type: 'sms.sent', to: job.customerPhone },
        { type: 'review.requested', jobId: job.id }
      ],
      cost: 0.01, // SMS cost
      duration: 1000
    };
  }

  private async generateReviewRequest(job: Job, tenant: Tenant): string {
    const templates = {
      'es-PR': `Hola ${job.customerName}! Gracias por confiar en ${tenant.businessName}.
                ¿Cómo fue tu experiencia con ${job.serviceType}?
                Déjanos una reseña: ${this.getReviewLink(tenant)}
                Tu opinión nos ayuda a mejorar! 🌟`,

      'en-US': `Hi ${job.customerName}! Thank you for choosing ${tenant.businessName}.
                How was your ${job.serviceType} service?
                Leave us a review: ${this.getReviewLink(tenant)}
                Your feedback helps us improve! ⭐`
    };

    return templates[tenant.locale] || templates['en-US'];
  }

  private getReviewLink(tenant: Tenant): string {
    // Generate short link for Google Business Profile review
    return `${tenant.customDomain || tenant.subdomain}/review`;
  }

  async trackReviewConversion(tenant: Tenant): Promise<ReviewMetrics> {
    const result = await DB.prepare(`
      SELECT
        COUNT(*) as requests_sent,
        COUNT(review_received_at) as reviews_received,
        AVG(review_rating) as avg_rating,
        COUNT(review_received_at) * 100.0 / COUNT(*) as conversion_rate
      FROM review_requests
      WHERE tenant_id = ?
      AND created_at > datetime('now', '-30 days')
    `).bind(tenant.id).first();

    return result as ReviewMetrics;
  }
}
```

### 5. Sales Nurturer Agent

24/7 lead engagement and nurturing.

```typescript
class SalesNurturerAgent implements Agent {
  id = 'sales-nurturer';
  name = '24/7 Sales Assistant';
  type = 'growth';
  tier = 'premium';
  model = 'gpt-4';

  trigger = {
    type: 'multiple',
    conditions: [
      { event: 'missed_call' },
      { event: 'incomplete_form' },
      { event: 'quote_requested' },
      { event: 'lead_inactive_3days' }
    ]
  };

  async execute(context: AgentContext): Promise<AgentResult> {
    const { triggerType, lead, tenant } = context.data;

    let response;
    switch (triggerType) {
      case 'missed_call':
        response = await this.handleMissedCall(lead, tenant);
        break;

      case 'incomplete_form':
        response = await this.handleIncompleteForm(lead, tenant);
        break;

      case 'quote_requested':
        response = await this.handleQuoteRequest(lead, tenant);
        break;

      case 'lead_inactive_3days':
        response = await this.handleInactiveLead(lead, tenant);
        break;
    }

    return {
      success: true,
      output: response,
      actions: response.actions,
      cost: response.cost,
      duration: Date.now() - context.startTime
    };
  }

  private async handleMissedCall(lead: Lead, tenant: Tenant) {
    // Immediate SMS response (within 1 minute)
    const message = await this.generateMissedCallMessage(lead, tenant);

    await this.sendSMS(lead.phone, message);

    // Log interaction
    await this.logLeadInteraction(lead.id, 'missed_call_response', message);

    // Schedule follow-up
    await this.scheduleFollowUp(lead.id, '30m');

    return {
      actions: [
        { type: 'sms.sent', leadId: lead.id },
        { type: 'follow_up.scheduled', delay: '30m' }
      ],
      cost: 0.01
    };
  }

  private async handleIncompleteForm(lead: Lead, tenant: Tenant) {
    // Wait 10 minutes then reach out
    await this.scheduleDelay('10m');

    const missingFields = await this.identifyMissingFields(lead);

    const message = this.generateIncompleteFormMessage(
      lead,
      tenant,
      missingFields
    );

    // Send via preferred channel
    if (lead.whatsapp) {
      await this.sendWhatsApp(lead.whatsapp, message);
    } else if (lead.phone) {
      await this.sendSMS(lead.phone, message);
    }

    return {
      actions: [
        { type: 'incomplete_form.reminder', leadId: lead.id }
      ],
      cost: 0.01
    };
  }

  private async handleQuoteRequest(lead: Lead, tenant: Tenant) {
    // Generate instant ballpark quote
    const quote = await this.generateQuote(lead, tenant);

    // Send quote
    const message = this.formatQuoteMessage(quote, tenant);
    await this.sendSMS(lead.phone, message);

    // Create calendar link for consultation
    const calendarLink = await this.createCalendarLink(tenant, lead);

    // Send follow-up with booking link
    const followUp = `📅 Schedule a consultation: ${calendarLink}`;
    await this.scheduleMessage(lead.phone, followUp, '1h');

    return {
      actions: [
        { type: 'quote.sent', leadId: lead.id, quoteId: quote.id },
        { type: 'calendar.link_sent', leadId: lead.id }
      ],
      cost: 0.02
    };
  }

  private async generateQuote(lead: Lead, tenant: Tenant) {
    const prompt = `Generate a ballpark quote for:
      Service: ${lead.serviceRequested}
      Business: ${tenant.businessName} (${tenant.industry})
      Details: ${lead.description}

      Include:
      - Price range (min-max)
      - What's included
      - Timeline estimate
      - Any caveats

      Keep under 160 characters for SMS.`;

    const response = await AI.run('@cf/openai/gpt-4', {
      prompt,
      max_tokens: 100,
      temperature: 0.3
    });

    return {
      id: generateId(),
      priceRange: response.priceRange,
      timeline: response.timeline,
      includes: response.includes,
      message: response.message
    };
  }

  // Lead scoring and prioritization
  async scoreAndPrioritizeLead(lead: Lead): Promise<LeadScore> {
    const factors = {
      hasPhone: lead.phone ? 10 : 0,
      hasEmail: lead.email ? 5 : 0,
      formCompleted: lead.formCompleted ? 15 : 0,
      serviceValue: this.estimateServiceValue(lead.serviceRequested),
      responseTime: this.calculateResponseScore(lead.createdAt),
      engagement: await this.calculateEngagementScore(lead.id)
    };

    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);

    return {
      leadId: lead.id,
      score: totalScore,
      priority: totalScore > 70 ? 'high' : totalScore > 40 ? 'medium' : 'low',
      factors
    };
  }
}
```

## DevOps Agents

### 6. Gemini Code Reviewer Agent

Automated PR review for security and quality.

```yaml
# .github/actions/gemini-reviewer/action.yml
name: 'Gemini Code Reviewer'
description: 'AI-powered code review using Google Gemini'

runs:
  using: 'composite'
  steps:
    - name: Review PR
      uses: actions/github-script@v7
      with:
        script: |
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          // Get PR diff
          const { data: files } = await github.rest.pulls.listFiles({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: context.issue.number
          });

          const issues = [];

          for (const file of files) {
            if (!file.patch) continue;

            const prompt = `Review this code change for:
              1. Security vulnerabilities (XSS, SQL injection, etc.)
              2. Hardcoded strings that should be i18n
              3. N+1 database queries
              4. Missing error handling
              5. Performance issues

              File: ${file.filename}
              Diff:
              ${file.patch}

              Return issues as JSON array with:
              - line: line number
              - severity: critical|major|minor
              - type: security|i18n|performance|quality
              - message: description
              - suggestion: how to fix
            `;

            const result = await model.generateContent(prompt);
            const fileIssues = JSON.parse(result.response.text());

            for (const issue of fileIssues) {
              issues.push({
                path: file.filename,
                ...issue
              });
            }
          }

          // Post review comments
          for (const issue of issues) {
            const comment = `**${issue.severity.toUpperCase()}: ${issue.type}**

              ${issue.message}

              **Suggestion:** ${issue.suggestion}`;

            await github.rest.pulls.createReviewComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              path: issue.path,
              line: issue.line,
              body: comment,
              side: 'RIGHT'
            });
          }

          // Post summary
          const summary = `## 🤖 AI Review Summary

          Found ${issues.length} potential issues:
          - Critical: ${issues.filter(i => i.severity === 'critical').length}
          - Major: ${issues.filter(i => i.severity === 'major').length}
          - Minor: ${issues.filter(i => i.severity === 'minor').length}

          Please review the inline comments for details.`;

          await github.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
            body: summary
          });
```

### 7. Changelog Generator Agent

Automated documentation updates.

```typescript
// .github/actions/changelog-generator/index.ts
class ChangelogGeneratorAgent {
  async generateChangelog(pr: PullRequest): Promise<string> {
    const prompt = `Generate a changelog entry for this PR:

      Title: ${pr.title}
      Description: ${pr.body}
      Files changed: ${pr.filesChanged}
      Diff stats: +${pr.additions} -${pr.deletions}

      Categories: Added, Changed, Fixed, Removed, Security, Performance

      Format:
      ## [Version] - Date
      ### Category
      - Clear, user-facing description

      Be concise and focus on impact, not implementation details.`;

    const response = await gemini.generateContent(prompt);

    return response.text;
  }

  async updateDocs(pr: PullRequest): Promise<void> {
    const changelog = await this.generateChangelog(pr);

    // Update CHANGELOG.md
    const currentChangelog = await fs.readFile('CHANGELOG.md', 'utf-8');
    const updatedChangelog = this.insertEntry(currentChangelog, changelog);
    await fs.writeFile('CHANGELOG.md', updatedChangelog);

    // Update API docs if needed
    if (pr.filesChanged.some(f => f.includes('/api/'))) {
      await this.updateApiDocs(pr);
    }

    // Commit changes
    await exec('git add CHANGELOG.md docs/');
    await exec(`git commit -m "docs: Update changelog for PR #${pr.number}"`);
    await exec('git push');
  }
}
```

## Agent Orchestration

### Agent Manager

```typescript
class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private queue: Queue<AgentTask> = new Queue();

  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);

    // Set up triggers
    await this.setupTriggers(agent);

    // Initialize metrics
    await this.initMetrics(agent);
  }

  async executeAgent(
    agentId: string,
    context: AgentContext
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    // Check rate limits
    await this.checkRateLimits(agent, context.tenant);

    // Check permissions
    await this.checkPermissions(agent, context);

    // Execute with monitoring
    const result = await this.executeWithMonitoring(agent, context);

    // Bill tenant if premium
    if (agent.tier === 'premium') {
      await this.billTenant(context.tenant, agent, result.cost);
    }

    // Update metrics
    await this.updateMetrics(agent, result);

    return result;
  }

  private async executeWithMonitoring(
    agent: Agent,
    context: AgentContext
  ): Promise<AgentResult> {
    const span = tracer.startSpan(`agent.${agent.id}`);

    try {
      // Add timeout
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Agent timeout')), 30000)
      );

      const execution = agent.execute(context);

      const result = await Promise.race([execution, timeout]) as AgentResult;

      span.setStatus({ code: SpanStatusCode.OK });
      return result;

    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });

      // Log to Sentry
      Sentry.captureException(error, {
        tags: { agent: agent.id },
        extra: { context }
      });

      throw error;

    } finally {
      span.end();
    }
  }

  // Circuit breaker for agent failures
  private circuitBreakers = new Map<string, CircuitBreaker>();

  async executeWithCircuitBreaker(
    agent: Agent,
    context: AgentContext
  ): Promise<AgentResult> {
    let breaker = this.circuitBreakers.get(agent.id);

    if (!breaker) {
      breaker = new CircuitBreaker({
        timeout: 30000,
        errorThreshold: 50,
        resetTimeout: 60000
      });
      this.circuitBreakers.set(agent.id, breaker);
    }

    return breaker.execute(() => agent.execute(context));
  }
}
```

## Cost Management

### Agent Cost Tracking

```typescript
interface AgentCostModel {
  // AI model costs (per 1k tokens)
  modelCosts: {
    'llama-3': 0.0001,
    'gpt-4': 0.03,
    'gpt-3.5': 0.002,
    'gemini': 0.00025,
    'claude': 0.008
  };

  // Infrastructure costs
  computeCost: 0.000024; // per GB-second
  storageCost: 0.015; // per GB-month

  // External API costs
  smsCost: 0.01; // per message
  whatsappCost: 0.005; // per message
  emailCost: 0.0001; // per email
}

class AgentCostCalculator {
  calculateCost(agent: Agent, usage: AgentUsage): number {
    let cost = 0;

    // Model cost
    const modelCost = this.modelCosts[agent.model];
    cost += (usage.tokens / 1000) * modelCost;

    // Compute cost
    cost += usage.computeSeconds * this.computeCost;

    // External API costs
    cost += usage.smsCount * this.smsCost;
    cost += usage.whatsappCount * this.whatsappCost;
    cost += usage.emailCount * this.emailCost;

    return cost;
  }

  async trackTenantUsage(
    tenantId: number,
    agentId: string,
    cost: number
  ): Promise<void> {
    await DB.prepare(`
      INSERT INTO agent_usage (tenant_id, agent_id, cost, used_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(tenantId, agentId, cost).run();

    // Check if over limit
    const usage = await this.getTenantMonthlyUsage(tenantId);
    if (usage.total > usage.limit) {
      await this.notifyOverage(tenantId, usage);
    }
  }
}
```

## Performance Metrics

### Agent Analytics Dashboard

```sql
-- Agent performance metrics
CREATE VIEW agent_performance AS
SELECT
    a.id as agent_id,
    a.name as agent_name,
    a.type as agent_type,
    COUNT(*) as total_executions,
    AVG(ar.duration) as avg_duration_ms,
    MAX(ar.duration) as max_duration_ms,
    MIN(ar.duration) as min_duration_ms,
    SUM(CASE WHEN ar.success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate,
    SUM(ar.cost) as total_cost,
    AVG(ar.cost) as avg_cost
FROM agents a
LEFT JOIN agent_results ar ON a.id = ar.agent_id
WHERE ar.executed_at > datetime('now', '-30 days')
GROUP BY a.id, a.name, a.type;

-- Tenant agent usage
CREATE VIEW tenant_agent_usage AS
SELECT
    t.id as tenant_id,
    t.business_name,
    t.subscription_tier,
    COUNT(DISTINCT au.agent_id) as unique_agents_used,
    COUNT(*) as total_agent_calls,
    SUM(au.cost) as total_cost,
    SUM(CASE WHEN a.tier = 'premium' THEN au.cost ELSE 0 END) as premium_cost
FROM tenants t
LEFT JOIN agent_usage au ON t.id = au.tenant_id
LEFT JOIN agents a ON au.agent_id = a.id
WHERE au.used_at > datetime('now', '-30 days')
GROUP BY t.id, t.business_name, t.subscription_tier
ORDER BY total_cost DESC;

-- Agent error tracking
CREATE VIEW agent_errors AS
SELECT
    agent_id,
    error_type,
    COUNT(*) as error_count,
    MAX(occurred_at) as last_occurrence,
    sample_context
FROM agent_errors
WHERE occurred_at > datetime('now', '-7 days')
GROUP BY agent_id, error_type
ORDER BY error_count DESC;
```

## Agent Configuration

### Environment Variables

```typescript
// wrangler.toml
[vars]
# AI Models
WORKERS_AI_ENABLED = "true"
OPENAI_API_KEY = "@OPENAI_API_KEY"
GEMINI_API_KEY = "@GEMINI_API_KEY"
ANTHROPIC_API_KEY = "@ANTHROPIC_API_KEY"

# Communication APIs
TWILIO_ACCOUNT_SID = "@TWILIO_ACCOUNT_SID"
TWILIO_AUTH_TOKEN = "@TWILIO_AUTH_TOKEN"
WHATSAPP_BUSINESS_TOKEN = "@WHATSAPP_BUSINESS_TOKEN"

# Agent Configuration
AGENT_RATE_LIMIT = "100" # per tenant per hour
AGENT_TIMEOUT_SECONDS = "30"
AGENT_RETRY_ATTEMPTS = "3"
AGENT_CIRCUIT_BREAKER_THRESHOLD = "50" # percentage

# Cost Limits
FREE_TIER_AGENT_CREDITS = "10" # per month
PRO_TIER_AGENT_CREDITS = "1000"
PREMIUM_TIER_AGENT_CREDITS = "10000"
```

## Future Agent Roadmap

### Planned Agents

1. **Voice Agent** (Q2 2025)
   - Phone call handling
   - Voicemail transcription
   - Appointment booking by phone

2. **Video Verification Agent** (Q3 2025)
   - Gate Photo validation
   - Service completion verification
   - Quality assurance

3. **Predictive Analytics Agent** (Q3 2025)
   - Lead scoring optimization
   - Churn prediction
   - Demand forecasting

4. **Translation Agent** (Q4 2025)
   - Real-time message translation
   - Website localization
   - Multi-language support

5. **Compliance Agent** (Q4 2025)
   - HIPAA compliance checking
   - PII detection and masking
   - Audit log generation

---

The Agentic Workforce transforms the platform from a tool into an active partner that works 24/7 to grow tenant businesses while maintaining operational excellence.