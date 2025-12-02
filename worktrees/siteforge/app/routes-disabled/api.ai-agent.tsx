/**
 * AI Agent Execution API Endpoint
 * Handles execution of AI automation agents
 *
 * Endpoints:
 * POST /api/ai-agent/reputation-manager/review-request - Create review request
 * POST /api/ai-agent/reputation-manager/review-response - Process review submission
 * GET /api/ai-agent/reputation-manager/run-followups - Run follow-up sequences
 *
 * POST /api/ai-agent/sales-nurturer/start-sequence - Start nurture sequence
 * POST /api/ai-agent/sales-nurturer/incoming-message - Process incoming message
 * GET /api/ai-agent/sales-nurturer/run-scheduled - Run scheduled sequences
 * POST /api/ai-agent/sales-nurturer/schedule-appointment - Schedule appointment
 */

import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { ReputationManagerAgent } from '~/lib/ai-agents/reputation-manager';
import { SalesNurturerAgent } from '~/lib/ai-agents/sales-nurturer';
import type { AgentContext } from '~/lib/ai-agents/types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create agent context from request
 */
function createAgentContext(context: ActionFunctionArgs['context']): AgentContext {
  // TODO: Get tenant from hostname or auth token
  const tenantId = 'default-tenant'; // Placeholder

  return {
    tenantId,
    db: context.env.DB,
    environment: context.env.ENVIRONMENT === 'production' ? 'production' : 'development',
  };
}

/**
 * Validate API key (optional authentication)
 */
function validateApiKey(request: Request): boolean {
  // TODO: Implement API key validation
  // For now, allow all requests in development
  const apiKey = request.headers.get('X-API-Key');

  // In production, validate against stored API keys
  // For development, allow requests without API key
  return true;
}

/**
 * Parse and validate JSON body
 */
async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    return null;
  }
}

// =============================================================================
// REPUTATION MANAGER ENDPOINTS
// =============================================================================

/**
 * Create review request
 * POST /api/ai-agent?action=reputation-manager&method=review-request
 */
async function handleReviewRequest(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const body = await parseBody<{
    customerId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    jobId?: string;
    jobType?: string;
    jobCompletedAt?: string;
    preferredMethod: 'sms' | 'whatsapp' | 'email';
    metadata?: Record<string, unknown>;
  }>(request);

  if (!body) {
    return json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.customerId || !body.customerName || !body.preferredMethod) {
    return json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const agentContext = createAgentContext(context);
  const agent = new ReputationManagerAgent(agentContext);

  const result = await agent.createReviewRequest({
    customerId: body.customerId,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail,
    jobId: body.jobId,
    jobType: body.jobType,
    jobCompletedAt: body.jobCompletedAt,
    preferredMethod: body.preferredMethod,
    metadata: body.metadata,
  });

  return json(result, { status: result.success ? 200 : 400 });
}

/**
 * Process review response
 * POST /api/ai-agent?action=reputation-manager&method=review-response
 */
async function handleReviewResponse(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const body = await parseBody<{
    requestId: string;
    rating: number;
    reviewText?: string;
    platform?: string;
  }>(request);

  if (!body) {
    return json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.requestId || !body.rating) {
    return json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const agentContext = createAgentContext(context);
  const agent = new ReputationManagerAgent(agentContext);

  const result = await agent.processReviewResponse(
    body.requestId,
    body.rating,
    body.reviewText,
    body.platform
  );

  return json(result, { status: result.success ? 200 : 400 });
}

/**
 * Run follow-up sequences
 * GET /api/ai-agent?action=reputation-manager&method=run-followups
 */
async function handleRunFollowups(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const agentContext = createAgentContext(context);
  const agent = new ReputationManagerAgent(agentContext);

  const result = await agent.runFollowupSequence();

  return json(result, { status: result.success ? 200 : 500 });
}

// =============================================================================
// SALES NURTURER ENDPOINTS
// =============================================================================

/**
 * Start nurture sequence
 * POST /api/ai-agent?action=sales-nurturer&method=start-sequence
 */
async function handleStartSequence(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const body = await parseBody<{
    leadId: string;
    leadName: string;
    leadPhone?: string;
    leadEmail?: string;
    triggerType: 'missed_call' | 'abandoned_quote' | 'no_response' | 'cold_lead';
    triggerData?: Record<string, unknown>;
    preferredMethod: 'sms' | 'whatsapp' | 'email';
  }>(request);

  if (!body) {
    return json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.leadId || !body.leadName || !body.triggerType || !body.preferredMethod) {
    return json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const agentContext = createAgentContext(context);
  const agent = new SalesNurturerAgent(agentContext);

  const result = await agent.startNurtureSequence({
    leadId: body.leadId,
    leadName: body.leadName,
    leadPhone: body.leadPhone,
    leadEmail: body.leadEmail,
    triggerType: body.triggerType,
    triggerData: body.triggerData,
    preferredMethod: body.preferredMethod,
  });

  return json(result, { status: result.success ? 200 : 400 });
}

/**
 * Process incoming message from lead
 * POST /api/ai-agent?action=sales-nurturer&method=incoming-message
 */
async function handleIncomingMessage(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const body = await parseBody<{
    leadId: string;
    messageText: string;
    deliveryMethod: 'sms' | 'whatsapp' | 'email';
  }>(request);

  if (!body) {
    return json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.leadId || !body.messageText || !body.deliveryMethod) {
    return json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const agentContext = createAgentContext(context);
  const agent = new SalesNurturerAgent(agentContext);

  const result = await agent.processIncomingMessage(
    body.leadId,
    body.messageText,
    body.deliveryMethod
  );

  return json(result, { status: result.success ? 200 : 400 });
}

/**
 * Run scheduled sequences
 * GET /api/ai-agent?action=sales-nurturer&method=run-scheduled
 */
async function handleRunScheduled(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const agentContext = createAgentContext(context);
  const agent = new SalesNurturerAgent(agentContext);

  const result = await agent.runScheduledSequences();

  return json(result, { status: result.success ? 200 : 500 });
}

/**
 * Schedule appointment
 * POST /api/ai-agent?action=sales-nurturer&method=schedule-appointment
 */
async function handleScheduleAppointment(
  request: Request,
  context: ActionFunctionArgs['context']
): Promise<Response> {
  const body = await parseBody<{
    sequenceId: string;
    appointmentTime: string;
  }>(request);

  if (!body) {
    return json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.sequenceId || !body.appointmentTime) {
    return json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const agentContext = createAgentContext(context);
  const agent = new SalesNurturerAgent(agentContext);

  const result = await agent.scheduleAppointment(
    body.sequenceId,
    body.appointmentTime
  );

  return json(result, { status: result.success ? 200 : 400 });
}

// =============================================================================
// MAIN ROUTER
// =============================================================================

export async function action({ request, context }: ActionFunctionArgs) {
  // Validate API key
  if (!validateApiKey(request)) {
    return json(
      { success: false, error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  // Parse query parameters
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const method = url.searchParams.get('method');

  if (!action || !method) {
    return json(
      {
        success: false,
        error: 'Missing action or method query parameters',
        usage: {
          reputationManager: {
            'review-request': 'POST /api/ai-agent?action=reputation-manager&method=review-request',
            'review-response': 'POST /api/ai-agent?action=reputation-manager&method=review-response',
            'run-followups': 'GET /api/ai-agent?action=reputation-manager&method=run-followups',
          },
          salesNurturer: {
            'start-sequence': 'POST /api/ai-agent?action=sales-nurturer&method=start-sequence',
            'incoming-message': 'POST /api/ai-agent?action=sales-nurturer&method=incoming-message',
            'run-scheduled': 'GET /api/ai-agent?action=sales-nurturer&method=run-scheduled',
            'schedule-appointment': 'POST /api/ai-agent?action=sales-nurturer&method=schedule-appointment',
          },
        },
      },
      { status: 400 }
    );
  }

  try {
    // Route to appropriate handler
    if (action === 'reputation-manager') {
      switch (method) {
        case 'review-request':
          return await handleReviewRequest(request, context);
        case 'review-response':
          return await handleReviewResponse(request, context);
        case 'run-followups':
          return await handleRunFollowups(request, context);
        default:
          return json(
            { success: false, error: `Unknown method: ${method}` },
            { status: 400 }
          );
      }
    } else if (action === 'sales-nurturer') {
      switch (method) {
        case 'start-sequence':
          return await handleStartSequence(request, context);
        case 'incoming-message':
          return await handleIncomingMessage(request, context);
        case 'run-scheduled':
          return await handleRunScheduled(request, context);
        case 'schedule-appointment':
          return await handleScheduleAppointment(request, context);
        default:
          return json(
            { success: false, error: `Unknown method: ${method}` },
            { status: 400 }
          );
      }
    } else {
      return json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('AI Agent API error:', error);
    return json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Support GET for scheduled tasks (Cloudflare Cron Triggers)
export async function loader({ request, context }: ActionFunctionArgs) {
  // Only allow GET for scheduled operations
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const method = url.searchParams.get('method');

  if (
    (action === 'reputation-manager' && method === 'run-followups') ||
    (action === 'sales-nurturer' && method === 'run-scheduled')
  ) {
    return await action({ request, context });
  }

  return json(
    {
      success: false,
      error: 'GET method only supported for scheduled operations',
      supportedEndpoints: [
        'GET /api/ai-agent?action=reputation-manager&method=run-followups',
        'GET /api/ai-agent?action=sales-nurturer&method=run-scheduled',
      ],
    },
    { status: 405 }
  );
}
