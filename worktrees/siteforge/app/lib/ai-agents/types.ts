/**
 * AI Agent Type Definitions
 * Shared types for all AI automation agents
 */

import type { D1Database } from '@cloudflare/workers-types';

// =============================================================================
// CORE AGENT TYPES
// =============================================================================

export type AgentType = 'reputation_manager' | 'sales_nurturer';

export type DeliveryMethod = 'sms' | 'whatsapp' | 'email';

export interface AgentContext {
  tenantId: string;
  db: D1Database;
  environment: 'production' | 'development';
}

export interface AgentConfig {
  id: string;
  tenantId: string;
  agentType: AgentType;
  enabled: boolean;
  config: Record<string, unknown>;
  dailyLimit: number;
  monthlyLimit: number;
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
}

// =============================================================================
// REPUTATION MANAGER TYPES
// =============================================================================

export type ReviewRequestStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'clicked'
  | 'reviewed'
  | 'failed';

export type ReviewPlatform = 'google' | 'yelp' | 'facebook' | 'trustpilot';

export interface ReviewRequest {
  id: string;
  tenantId: string;
  customerId: string;
  jobId?: string;
  deliveryMethod: DeliveryMethod;
  phoneNumber?: string;
  email?: string;
  status: ReviewRequestStatus;
  sentAt?: string;
  deliveredAt?: string;
  clickedAt?: string;
  reviewedAt?: string;
  reviewPlatform?: ReviewPlatform;
  reviewRating?: number;
  reviewText?: string;
  isNegative: boolean;
  sequenceStep: number;
  maxSequences: number;
  nextFollowupAt?: string;
  requestMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequestInput {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  jobId?: string;
  jobType?: string;
  jobCompletedAt?: string;
  preferredMethod: DeliveryMethod;
  metadata?: Record<string, unknown>;
}

export interface ReputationManagerConfig {
  enabled: boolean;
  autoSendAfterJobCompletion: boolean;
  delayHours: number; // Wait X hours after job completion
  maxFollowups: number;
  followupIntervalDays: number;
  negativeThreshold: number; // Stars below this trigger interception
  deliveryMethods: DeliveryMethod[];
  reviewPlatforms: ReviewPlatform[];
  smsProvider?: 'twilio' | 'messagebird';
  targetReviewRate: number; // Goal: 30%
}

// =============================================================================
// SALES NURTURER TYPES
// =============================================================================

export type NurtureStatus =
  | 'active'
  | 'completed'
  | 'converted'
  | 'opted_out'
  | 'failed';

export type NurtureTrigger =
  | 'missed_call'
  | 'abandoned_quote'
  | 'no_response'
  | 'cold_lead';

export type MessageIntent =
  | 'question'
  | 'objection'
  | 'ready_to_buy'
  | 'not_interested'
  | 'unclear';

export type MessageSentiment = 'positive' | 'neutral' | 'negative';

export interface LeadNurtureSequence {
  id: string;
  tenantId: string;
  leadId: string;
  triggerType: NurtureTrigger;
  triggerData?: Record<string, unknown>;
  sequenceStep: number;
  maxSteps: number;
  currentTemplate?: string;
  status: NurtureStatus;
  nextActionAt?: string;
  lastMessageSentAt?: string;
  lastMessageReceivedAt?: string;
  messageCount: number;
  leadQualified: boolean;
  appointmentScheduled: boolean;
  convertedAt?: string;
  conversionValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadNurtureMessage {
  id: string;
  sequenceId: string;
  tenantId: string;
  direction: 'outbound' | 'inbound';
  messageText: string;
  templateUsed?: string;
  deliveryMethod: DeliveryMethod;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  intentDetected?: MessageIntent;
  sentiment?: MessageSentiment;
  needsHumanHandoff: boolean;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface LeadNurtureInput {
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  triggerType: NurtureTrigger;
  triggerData?: Record<string, unknown>;
  preferredMethod: DeliveryMethod;
}

export interface SalesNurturerConfig {
  enabled: boolean;
  triggers: {
    missedCall: boolean;
    abandonedQuote: boolean;
    noResponse: boolean;
    coldLead: boolean;
  };
  maxSequenceSteps: number;
  stepIntervalHours: number;
  qualificationCriteria: {
    budgetConfirmed: boolean;
    timelineConfirmed: boolean;
    authorityConfirmed: boolean;
  };
  appointmentScheduling: {
    enabled: boolean;
    calendarIntegration?: 'google' | 'outlook' | 'calendly';
  };
  targetRecoveryRate: number; // Goal: 20%
}

// =============================================================================
// SAFETY RAILS TYPES
// =============================================================================

export type SafetyRuleType =
  | 'prohibited_topic'
  | 'required_disclaimer'
  | 'handoff_trigger';

export type SafetyAction = 'block' | 'warn' | 'handoff' | 'add_disclaimer';

export interface SafetyRule {
  id: string;
  tenantId?: string; // NULL = global rule
  ruleType: SafetyRuleType;
  ruleName: string;
  ruleDescription?: string;
  keywords?: string[];
  patterns?: string[];
  action: SafetyAction;
  actionMetadata?: Record<string, unknown>;
  appliesToAgents: AgentType[];
  isActive: boolean;
  createdAt: string;
}

export interface SafetyCheckResult {
  safe: boolean;
  violations: SafetyViolation[];
  action: SafetyAction | null;
  modifiedMessage?: string;
}

export interface SafetyViolation {
  ruleId: string;
  ruleName: string;
  ruleType: SafetyRuleType;
  triggeredBy: string; // Keyword or pattern that triggered
  action: SafetyAction;
  metadata?: Record<string, unknown>;
}

export interface ResponseTemplate {
  id: string;
  tenantId: string;
  agentType: AgentType;
  templateName: string;
  templateCategory: string;
  templateText: string;
  variables?: string[];
  usageCount: number;
  successRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HumanHandoff {
  id: string;
  tenantId: string;
  agentType: AgentType;
  conversationId: string;
  customerId: string;
  reason: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  conversationHistory?: Array<{
    role: 'agent' | 'customer';
    message: string;
    timestamp: string;
  }>;
  customerContext?: Record<string, unknown>;
  suggestedActions?: string[];
  status: 'pending' | 'claimed' | 'resolved' | 'escalated';
  claimedBy?: string;
  claimedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RATE LIMITING TYPES
// =============================================================================

export interface CustomerRateLimit {
  id: string;
  tenantId: string;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  dailyInteractions: number;
  weeklyInteractions: number;
  monthlyInteractions: number;
  optedOut: boolean;
  optedOutAt?: string;
  optOutReason?: string;
  lastInteractionAt?: string;
  lastResetAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  limits: {
    daily: { current: number; max: number };
    weekly: { current: number; max: number };
    monthly: { current: number; max: number };
  };
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface AgentAnalytics {
  id: string;
  tenantId: string;
  agentType: AgentType;
  date: string; // YYYY-MM-DD
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
  humanHandoffs: number;
  // Reputation Manager
  reviewsRequested?: number;
  reviewsReceived?: number;
  positiveReviews?: number;
  negativeReviewsIntercepted?: number;
  reviewRate?: number;
  // Sales Nurturer
  leadsContacted?: number;
  leadsQualified?: number;
  appointmentsScheduled?: number;
  conversions?: number;
  conversionValue?: number;
  recoveryRate?: number;
  // Safety
  safetyViolations?: number;
  messagesBlocked?: number;
  createdAt: string;
}

// =============================================================================
// MESSAGE DELIVERY TYPES (Integrations)
// =============================================================================

export interface MessageDeliveryResult {
  success: boolean;
  messageId?: string;
  deliveryMethod: DeliveryMethod;
  deliveredAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<MessageDeliveryResult>;
  getDeliveryStatus(messageId: string): Promise<'pending' | 'sent' | 'delivered' | 'failed'>;
}

export interface WhatsAppProvider {
  sendMessage(to: string, message: string): Promise<MessageDeliveryResult>;
  getDeliveryStatus(messageId: string): Promise<'pending' | 'sent' | 'delivered' | 'failed'>;
}

export interface EmailProvider {
  sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<MessageDeliveryResult>;
  getDeliveryStatus(messageId: string): Promise<'pending' | 'sent' | 'delivered' | 'failed'>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}
