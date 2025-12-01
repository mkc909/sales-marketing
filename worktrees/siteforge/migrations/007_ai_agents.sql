-- Migration 007: AI Automation Agents
-- Adds tables and structures for AI-powered reputation management, sales nurturing, and safety controls

-- =============================================================================
-- AI AGENT CONFIGURATIONS
-- =============================================================================

-- Store per-tenant AI agent configurations and settings
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_type TEXT NOT NULL, -- 'reputation_manager', 'sales_nurturer'
  enabled INTEGER DEFAULT 1,

  -- Configuration JSON (agent-specific settings)
  config JSON NOT NULL,

  -- Performance tracking
  total_interactions INTEGER DEFAULT 0,
  successful_interactions INTEGER DEFAULT 0,
  failed_interactions INTEGER DEFAULT 0,

  -- Rate limiting
  daily_limit INTEGER DEFAULT 100,
  monthly_limit INTEGER DEFAULT 3000,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_agent_configs_tenant ON ai_agent_configs(tenant_id);
CREATE INDEX idx_ai_agent_configs_type ON ai_agent_configs(agent_type);
CREATE UNIQUE INDEX idx_ai_agent_configs_tenant_type ON ai_agent_configs(tenant_id, agent_type);

-- =============================================================================
-- REPUTATION MANAGER: REVIEW REQUESTS
-- =============================================================================

-- Track review request campaigns
CREATE TABLE IF NOT EXISTS review_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  job_id TEXT,

  -- Request details
  delivery_method TEXT NOT NULL, -- 'sms', 'whatsapp', 'email'
  phone_number TEXT,
  email TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'clicked', 'reviewed', 'failed'
  sent_at TEXT,
  delivered_at TEXT,
  clicked_at TEXT,
  reviewed_at TEXT,

  -- Review outcome
  review_platform TEXT, -- 'google', 'yelp', 'facebook', 'trustpilot'
  review_rating INTEGER, -- 1-5 stars
  review_text TEXT,
  is_negative INTEGER DEFAULT 0, -- Flagged for interception

  -- Follow-up sequence
  sequence_step INTEGER DEFAULT 1,
  max_sequences INTEGER DEFAULT 3,
  next_followup_at TEXT,

  -- Metadata
  request_metadata JSON, -- Custom fields, job details, etc.

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_review_requests_tenant ON review_requests(tenant_id);
CREATE INDEX idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_next_followup ON review_requests(next_followup_at);
CREATE INDEX idx_review_requests_negative ON review_requests(is_negative);

-- =============================================================================
-- SALES NURTURER: LEAD RECOVERY
-- =============================================================================

-- Track lead nurturing campaigns
CREATE TABLE IF NOT EXISTS lead_nurture_sequences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,

  -- Trigger type
  trigger_type TEXT NOT NULL, -- 'missed_call', 'abandoned_quote', 'no_response', 'cold_lead'
  trigger_data JSON, -- Original trigger metadata

  -- Sequence details
  sequence_step INTEGER DEFAULT 1,
  max_steps INTEGER DEFAULT 5,
  current_template TEXT,

  -- Status tracking
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'converted', 'opted_out', 'failed'
  next_action_at TEXT,

  -- Conversation state
  last_message_sent_at TEXT,
  last_message_received_at TEXT,
  message_count INTEGER DEFAULT 0,
  lead_qualified INTEGER DEFAULT 0,
  appointment_scheduled INTEGER DEFAULT 0,

  -- Conversion tracking
  converted_at TEXT,
  conversion_value REAL DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_lead_nurture_tenant ON lead_nurture_sequences(tenant_id);
CREATE INDEX idx_lead_nurture_lead ON lead_nurture_sequences(lead_id);
CREATE INDEX idx_lead_nurture_status ON lead_nurture_sequences(status);
CREATE INDEX idx_lead_nurture_next_action ON lead_nurture_sequences(next_action_at);
CREATE INDEX idx_lead_nurture_trigger ON lead_nurture_sequences(trigger_type);

-- Store individual messages in nurture sequences
CREATE TABLE IF NOT EXISTS lead_nurture_messages (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Message details
  direction TEXT NOT NULL, -- 'outbound', 'inbound'
  message_text TEXT NOT NULL,
  template_used TEXT,

  -- Delivery
  delivery_method TEXT NOT NULL, -- 'sms', 'whatsapp', 'email'
  delivery_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'

  -- AI analysis
  intent_detected TEXT, -- 'question', 'objection', 'ready_to_buy', 'not_interested'
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  needs_human_handoff INTEGER DEFAULT 0,

  sent_at TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (sequence_id) REFERENCES lead_nurture_sequences(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_lead_nurture_messages_sequence ON lead_nurture_messages(sequence_id);
CREATE INDEX idx_lead_nurture_messages_direction ON lead_nurture_messages(direction);
CREATE INDEX idx_lead_nurture_messages_handoff ON lead_nurture_messages(needs_human_handoff);

-- =============================================================================
-- AI SAFETY RAILS
-- =============================================================================

-- Response templates for AI agents
CREATE TABLE IF NOT EXISTS ai_response_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,

  -- Template details
  template_name TEXT NOT NULL,
  template_category TEXT NOT NULL, -- 'greeting', 'review_request', 'followup', 'objection_handling'
  template_text TEXT NOT NULL,

  -- Personalization variables
  variables JSON, -- List of allowed {{variables}}

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,

  -- Status
  is_active INTEGER DEFAULT 1,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_templates_tenant ON ai_response_templates(tenant_id);
CREATE INDEX idx_ai_templates_agent ON ai_response_templates(agent_type);
CREATE INDEX idx_ai_templates_category ON ai_response_templates(template_category);

-- Prohibited topics and safety rules
CREATE TABLE IF NOT EXISTS ai_safety_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,

  -- Rule details
  rule_type TEXT NOT NULL, -- 'prohibited_topic', 'required_disclaimer', 'handoff_trigger'
  rule_name TEXT NOT NULL,
  rule_description TEXT,

  -- Pattern matching
  keywords JSON, -- List of keywords to match
  patterns JSON, -- Regex patterns

  -- Action to take
  action TEXT NOT NULL, -- 'block', 'warn', 'handoff', 'add_disclaimer'
  action_metadata JSON,

  -- Scope
  applies_to_agents JSON, -- List of agent types this applies to

  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_safety_rules_tenant ON ai_safety_rules(tenant_id);
CREATE INDEX idx_ai_safety_rules_type ON ai_safety_rules(rule_type);

-- Human handoff queue
CREATE TABLE IF NOT EXISTS ai_human_handoffs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Source context
  agent_type TEXT NOT NULL,
  conversation_id TEXT NOT NULL, -- Links to sequence_id or request_id
  customer_id TEXT NOT NULL,

  -- Handoff details
  reason TEXT NOT NULL, -- 'safety_rule_triggered', 'customer_request', 'complex_question', 'negative_sentiment'
  urgency TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Context for human
  conversation_history JSON,
  customer_context JSON,
  suggested_actions JSON,

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'claimed', 'resolved', 'escalated'
  claimed_by TEXT,
  claimed_at TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_handoffs_tenant ON ai_human_handoffs(tenant_id);
CREATE INDEX idx_ai_handoffs_status ON ai_human_handoffs(status);
CREATE INDEX idx_ai_handoffs_urgency ON ai_human_handoffs(urgency);
CREATE INDEX idx_ai_handoffs_created ON ai_human_handoffs(created_at);

-- =============================================================================
-- RATE LIMITING & COMPLIANCE
-- =============================================================================

-- Track per-customer interaction limits (prevent spam)
CREATE TABLE IF NOT EXISTS ai_customer_rate_limits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,

  -- Interaction counts
  daily_interactions INTEGER DEFAULT 0,
  weekly_interactions INTEGER DEFAULT 0,
  monthly_interactions INTEGER DEFAULT 0,

  -- Opt-out status
  opted_out INTEGER DEFAULT 0,
  opted_out_at TEXT,
  opt_out_reason TEXT,

  -- Last interaction tracking
  last_interaction_at TEXT,
  last_reset_at TEXT DEFAULT (datetime('now')),

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_ai_rate_limits_tenant ON ai_customer_rate_limits(tenant_id);
CREATE INDEX idx_ai_rate_limits_customer ON ai_customer_rate_limits(customer_id);
CREATE INDEX idx_ai_rate_limits_opted_out ON ai_customer_rate_limits(opted_out);

-- =============================================================================
-- ANALYTICS & REPORTING
-- =============================================================================

-- Daily rollup of AI agent performance
CREATE TABLE IF NOT EXISTS ai_agent_analytics (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD

  -- Volume metrics
  total_interactions INTEGER DEFAULT 0,
  successful_interactions INTEGER DEFAULT 0,
  failed_interactions INTEGER DEFAULT 0,
  human_handoffs INTEGER DEFAULT 0,

  -- Reputation Manager specific
  reviews_requested INTEGER DEFAULT 0,
  reviews_received INTEGER DEFAULT 0,
  positive_reviews INTEGER DEFAULT 0,
  negative_reviews_intercepted INTEGER DEFAULT 0,
  review_rate REAL DEFAULT 0,

  -- Sales Nurturer specific
  leads_contacted INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  appointments_scheduled INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value REAL DEFAULT 0,
  recovery_rate REAL DEFAULT 0,

  -- Safety metrics
  safety_violations INTEGER DEFAULT 0,
  messages_blocked INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, agent_type, date)
);

CREATE INDEX idx_ai_analytics_tenant ON ai_agent_analytics(tenant_id);
CREATE INDEX idx_ai_analytics_agent ON ai_agent_analytics(agent_type);
CREATE INDEX idx_ai_analytics_date ON ai_agent_analytics(date);

-- =============================================================================
-- DEFAULT SAFETY RULES (Platform-level)
-- =============================================================================

-- Insert global safety rules (tenant_id = NULL means applies to all)
INSERT INTO ai_safety_rules (id, tenant_id, rule_type, rule_name, rule_description, keywords, action, applies_to_agents, is_active) VALUES
  ('global-001', NULL, 'prohibited_topic', 'No Legal Advice', 'Prevent AI from providing legal advice',
   '["legal advice", "lawsuit", "sue", "attorney", "lawyer", "litigation", "court"]',
   'handoff', '["reputation_manager", "sales_nurturer"]', 1),

  ('global-002', NULL, 'prohibited_topic', 'No Medical Advice', 'Prevent AI from providing medical advice',
   '["medical advice", "diagnosis", "prescription", "doctor", "health issue"]',
   'handoff', '["reputation_manager", "sales_nurturer"]', 1),

  ('global-003', NULL, 'prohibited_topic', 'No Financial Advice', 'Prevent AI from providing financial advice',
   '["financial advice", "invest", "stock", "trading", "tax advice"]',
   'handoff', '["reputation_manager", "sales_nurturer"]', 1),

  ('global-004', NULL, 'handoff_trigger', 'Customer Requests Human', 'Hand off when customer wants to speak to human',
   '["speak to person", "talk to human", "real person", "agent", "manager", "supervisor"]',
   'handoff', '["reputation_manager", "sales_nurturer"]', 1),

  ('global-005', NULL, 'handoff_trigger', 'Strong Negative Sentiment', 'Hand off when customer is very upset',
   '["terrible", "worst", "hate", "lawsuit", "scam", "fraud", "disgusting", "unacceptable"]',
   'handoff', '["reputation_manager", "sales_nurturer"]', 1),

  ('global-006', NULL, 'required_disclaimer', 'SMS Opt-out Notice', 'Include opt-out instructions in SMS',
   '[]',
   'add_disclaimer', '["reputation_manager", "sales_nurturer"]', 1);

-- =============================================================================
-- DEFAULT RESPONSE TEMPLATES
-- =============================================================================

-- Note: These are inserted per-tenant on tenant creation, not here
-- See app/lib/ai-agents/templates.ts for default template library

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Migration success marker
SELECT 'Migration 007: AI Automation Agents completed successfully' as status;
