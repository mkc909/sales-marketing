-- Multi-Tenant Platform Database Schema
-- SiteForge/EnlacePR/TownLink
-- Platform: Cloudflare D1

-- ============================================================================
-- CORE TENANT MANAGEMENT
-- ============================================================================

-- Users table (platform admins and clients)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    preferred_language TEXT DEFAULT 'en-US',
    role TEXT DEFAULT 'client', -- 'admin', 'client', 'agent'
    permissions TEXT, -- JSON array of permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Multi-brand tenant support
CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Brand & Locale
    brand TEXT DEFAULT 'GLOBAL', -- 'PR' (EnlacePR), 'US' (TownLink), 'GLOBAL' (SiteForge)
    locale TEXT DEFAULT 'en-US', -- 'es-PR', 'en-US'
    timezone TEXT DEFAULT 'America/New_York',

    -- Domain Settings
    subdomain TEXT UNIQUE NOT NULL, -- e.g., 'joes-plumbing'
    custom_domain TEXT UNIQUE, -- e.g., 'joesplumbing.com'
    domain_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'failed'
    ssl_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'failed'
    cloudflare_zone_id TEXT,

    -- Business Info
    business_name TEXT NOT NULL,
    business_name_slug TEXT UNIQUE,
    industry TEXT NOT NULL, -- 'plumber', 'hvac', 'landscaper', 'electrician', 'roofer'
    business_license TEXT,
    tax_id TEXT,

    -- Contact
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    website_previous TEXT, -- Previous website before migration

    -- Location (with PR-specific fields)
    address TEXT,
    address_line2 TEXT,
    urbanization TEXT, -- PR-specific
    km_marker TEXT, -- PR-specific: "Km 7.3"
    interior_number TEXT, -- PR-specific: "Int 456"
    city TEXT,
    municipality TEXT, -- PR uses municipalities not counties
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'US',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Gate/Delivery Instructions (PR-specific)
    gate_instructions TEXT,
    has_gate_photo BOOLEAN DEFAULT FALSE,
    delivery_notes TEXT,
    entrance_type TEXT, -- 'main', 'side', 'back', 'complex'

    -- Payment Processing
    payment_processor TEXT DEFAULT 'stripe', -- 'stripe', 'ath_movil', 'paypal'
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    ath_movil_merchant_id TEXT, -- PR-specific
    payment_currency TEXT DEFAULT 'USD',

    -- Customization
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#f59e0b',
    font_family TEXT DEFAULT 'Inter',
    logo_url TEXT,
    favicon_url TEXT,
    banner_url TEXT,

    -- Subscription
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'professional', 'ai_admin', 'enterprise'
    subscription_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'suspended'
    subscription_price DECIMAL(10,2),
    trial_ends_at TIMESTAMP,
    next_billing_date TIMESTAMP,
    cancellation_date TIMESTAMP,
    cancellation_reason TEXT,

    -- Features & Limits
    features TEXT, -- JSON array of enabled features
    monthly_lead_limit INTEGER DEFAULT 100,
    monthly_sms_limit INTEGER DEFAULT 100,
    storage_limit_gb INTEGER DEFAULT 1,
    team_member_limit INTEGER DEFAULT 1,

    -- Metadata
    source TEXT, -- 'organic', 'ghost_claim', 'paid_ad', 'referral'
    campaign TEXT, -- Campaign that acquired this tenant
    referrer_tenant_id INTEGER,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step TEXT DEFAULT 'business_info',
    verified_business BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,

    -- Status
    status TEXT DEFAULT 'active', -- 'ghost', 'claimed', 'active', 'inactive', 'suspended'
    ghost_created_at TIMESTAMP,
    claimed_at TIMESTAMP,
    activated_at TIMESTAMP,
    suspended_at TIMESTAMP,
    suspended_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (referrer_tenant_id) REFERENCES tenants(id)
);

-- Team members for multi-user tenants
CREATE TABLE team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    permissions TEXT, -- JSON array of specific permissions
    invited_by INTEGER,
    invited_at TIMESTAMP,
    accepted_at TIMESTAMP,
    removed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(tenant_id, user_id)
);

-- ============================================================================
-- CONTENT & PAGES
-- ============================================================================

-- Site content with versioning
CREATE TABLE site_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    section_name TEXT NOT NULL, -- 'hero', 'about', 'services', 'features', 'testimonials', 'cta'
    content_json TEXT NOT NULL, -- JSON blob for flexibility
    content_html TEXT, -- Rendered HTML cache
    is_ai_generated BOOLEAN DEFAULT TRUE,
    ai_model TEXT, -- 'llama-3', 'gpt-4', etc.
    language TEXT DEFAULT 'en',
    version INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(tenant_id, section_name, version)
);

-- Custom pages beyond the template
CREATE TABLE custom_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT,
    content_json TEXT,
    content_html TEXT,
    template TEXT DEFAULT 'default',
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, slug)
);

-- ============================================================================
-- SERVICES & PRODUCTS
-- ============================================================================

-- Services offered by each business
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_es TEXT, -- Spanish translation
    description TEXT,
    description_es TEXT,
    category TEXT,
    price_type TEXT DEFAULT 'range', -- 'fixed', 'range', 'quote', 'hourly'
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    price_hourly DECIMAL(10,2),
    duration_min INTEGER, -- In minutes
    duration_max INTEGER,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_emergency BOOLEAN DEFAULT FALSE,
    availability TEXT, -- JSON: { "days": ["mon", "tue"], "hours": "9-17" }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ============================================================================
-- LEADS & CUSTOMERS
-- ============================================================================

-- Leads captured from forms
CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Lead Info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    preferred_contact TEXT DEFAULT 'phone', -- 'phone', 'whatsapp', 'email'
    language TEXT DEFAULT 'en',

    -- Request Details
    message TEXT,
    service_interested TEXT,
    urgency TEXT DEFAULT 'normal', -- 'emergency', 'urgent', 'normal', 'planning'
    preferred_date DATE,
    preferred_time TEXT,
    budget_range TEXT,

    -- Location (for service calls)
    service_address TEXT,
    service_urbanization TEXT,
    service_km TEXT,
    service_gate_instructions TEXT,
    service_lat DECIMAL(10, 8),
    service_lng DECIMAL(11, 8),

    -- Lead Source
    source TEXT DEFAULT 'website', -- 'website', 'phone', 'whatsapp', 'social', 'directory'
    landing_page TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,

    -- Lead Status
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'scheduled', 'converted', 'lost'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    quality_score DECIMAL(3,2), -- 0.00 to 1.00 AI-calculated

    -- Assignment & Follow-up
    assigned_to INTEGER,
    assigned_at TIMESTAMP,
    first_contact_at TIMESTAMP,
    last_contact_at TIMESTAMP,
    next_followup_at TIMESTAMP,
    followup_count INTEGER DEFAULT 0,

    -- AI Interaction
    auto_responded BOOLEAN DEFAULT FALSE,
    auto_response_sent_at TIMESTAMP,
    ai_conversation_id TEXT,
    conversation_history TEXT, -- JSON array of messages

    -- Conversion Tracking
    converted_at TIMESTAMP,
    conversion_value DECIMAL(10,2),
    customer_id INTEGER,
    job_id INTEGER,
    lost_reason TEXT,
    lost_at TIMESTAMP,

    -- Notes
    internal_notes TEXT,
    tags TEXT, -- JSON array

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Customers (converted leads)
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    lead_id INTEGER,

    -- Customer Info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,

    -- Additional Details
    company_name TEXT,
    tax_id TEXT,

    -- Lifetime Value
    total_jobs INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_job_value DECIMAL(10,2),
    last_job_date DATE,

    -- Status
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'blocked'
    vip_customer BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- ============================================================================
-- JOBS & INVOICES
-- ============================================================================

-- Jobs/Work Orders
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    lead_id INTEGER,

    -- Job Details
    job_number TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    service_type TEXT,

    -- Scheduling
    scheduled_date DATE,
    scheduled_time TEXT,
    duration_estimated INTEGER, -- Minutes
    duration_actual INTEGER,

    -- Location
    service_address TEXT,
    gate_photo_id INTEGER,

    -- Status
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'paid'
    priority TEXT DEFAULT 'normal',

    -- Team Assignment
    assigned_to INTEGER,
    team_members TEXT, -- JSON array of user IDs

    -- Completion
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    completion_notes TEXT,
    completion_photos TEXT, -- JSON array of photo URLs
    customer_signature_url TEXT,

    -- Billing
    invoice_id INTEGER,
    quoted_amount DECIMAL(10,2),
    final_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue'
    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (gate_photo_id) REFERENCES gate_photos(id)
);

-- ============================================================================
-- PUERTO RICO SPECIFIC
-- ============================================================================

-- Gate Photos for delivery verification
CREATE TABLE gate_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Photo Details
    photo_url TEXT NOT NULL, -- R2 storage URL
    thumbnail_url TEXT,

    -- Location
    address TEXT,
    urbanization TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Instructions
    instructions TEXT,
    instructions_es TEXT,
    entrance_type TEXT, -- 'main', 'side', 'back', 'parking'

    -- Verification
    uploaded_by INTEGER,
    verification_count INTEGER DEFAULT 0,
    verified_by_community BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP,

    -- Usage Stats
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2), -- Success rate of deliveries

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- PinExacto/ExactPin Location Pins (Wedge Product)
CREATE TABLE pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    business_id INTEGER, -- Optional link to business

    -- Core Location Data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,

    -- Pin Metadata
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,

    -- Visual Verification
    photo_url TEXT, -- R2 storage URL
    gate_photo_id INTEGER, -- Link to gate_photos table

    -- Sharing
    short_code TEXT UNIQUE NOT NULL, -- 6-char unique code
    share_url TEXT NOT NULL,
    qr_code_url TEXT,

    -- Usage Tracking
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    navigation_count INTEGER DEFAULT 0,

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (gate_photo_id) REFERENCES gate_photos(id),
    INDEX idx_pins_short_code (short_code),
    INDEX idx_pins_business (business_id),
    INDEX idx_pins_tenant (tenant_id)
);

-- ATH Móvil Transactions
CREATE TABLE ath_movil_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Transaction Details
    transaction_id TEXT UNIQUE,
    reference_number TEXT,

    -- Payment Info
    amount DECIMAL(10,2) NOT NULL,
    fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),

    -- Customer Info
    customer_phone TEXT,
    customer_name TEXT,

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'

    -- Metadata
    description TEXT,
    invoice_id INTEGER,
    job_id INTEGER,

    -- Timestamps
    initiated_at TIMESTAMP,
    completed_at TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

-- WhatsApp Conversations
CREATE TABLE whatsapp_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,

    -- Participants
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    business_number TEXT,

    -- Thread Management
    thread_id TEXT UNIQUE,
    wa_conversation_id TEXT, -- WhatsApp's conversation ID

    -- Status
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'archived'
    last_message_at TIMESTAMP,
    last_message_direction TEXT, -- 'inbound', 'outbound'
    unread_count INTEGER DEFAULT 0,

    -- AI Context
    ai_enabled BOOLEAN DEFAULT FALSE,
    ai_personality TEXT, -- 'professional', 'friendly', 'concise'
    context TEXT, -- JSON conversation context

    -- Assignment
    assigned_to INTEGER,
    bot_handled BOOLEAN DEFAULT TRUE,
    escalated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- SMS/WhatsApp Messages
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    conversation_id INTEGER,

    -- Message Details
    message_id TEXT UNIQUE,
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    channel TEXT NOT NULL, -- 'sms', 'whatsapp', 'email'

    -- Content
    body TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,

    -- Participants
    from_number TEXT,
    to_number TEXT,

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
    error_code TEXT,
    error_message TEXT,

    -- AI Processing
    ai_processed BOOLEAN DEFAULT FALSE,
    intent TEXT, -- AI-detected intent
    sentiment TEXT, -- 'positive', 'neutral', 'negative'

    -- Timestamps
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id)
);

-- ============================================================================
-- DATA PIPELINE
-- ============================================================================

-- Raw ingested business data
CREATE TABLE raw_businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Source Tracking
    source TEXT NOT NULL, -- 'google_maps', 'facebook', 'yellow_pages', 'manual'
    source_id TEXT,
    source_url TEXT,
    campaign TEXT, -- 'unmappable', 'digital_ghosts', 'high_value'

    -- Raw Data
    raw_json TEXT NOT NULL,

    -- Processing Status
    status TEXT DEFAULT 'unprocessed', -- 'unprocessed', 'processing', 'processed', 'failed', 'quarantined'
    process_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    processed_at TIMESTAMP,

    -- Quality Metrics
    completeness_score DECIMAL(3,2),
    confidence_score DECIMAL(3,2),

    -- Metadata
    scraper_version TEXT,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quarantined businesses that failed validation
CREATE TABLE quarantined_businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_business_id INTEGER,

    -- Attempted Data
    attempted_data TEXT, -- JSON of cleaned data

    -- Validation Errors
    validation_errors TEXT, -- JSON array of errors
    error_severity TEXT, -- 'critical', 'major', 'minor'

    -- Review Status
    needs_review BOOLEAN DEFAULT TRUE,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    review_action TEXT, -- 'approve', 'reject', 'modify'
    review_notes TEXT,

    -- Recovery
    recovery_attempts INTEGER DEFAULT 0,
    recoverable BOOLEAN DEFAULT TRUE,

    quarantined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (raw_business_id) REFERENCES raw_businesses(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Campaign configuration for scrapers
CREATE TABLE scraper_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,

    -- Configuration
    source TEXT NOT NULL,
    search_query TEXT,
    filters TEXT, -- JSON filter criteria

    -- ICP Targeting
    icp_tags TEXT, -- JSON array
    target_count INTEGER,

    -- Scheduling
    schedule TEXT, -- Cron expression
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,

    -- Performance
    total_scraped INTEGER DEFAULT 0,
    total_converted INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AI AGENTS
-- ============================================================================

-- Agent definitions
CREATE TABLE agents (
    id TEXT PRIMARY KEY, -- e.g., 'content-generator', 'sales-nurturer'
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'operational', 'growth', 'devops'
    tier TEXT NOT NULL, -- 'platform', 'premium'
    model TEXT NOT NULL, -- 'llama-3', 'gpt-4', 'gemini'

    -- Configuration
    config TEXT, -- JSON configuration
    triggers TEXT, -- JSON trigger conditions

    -- Cost Model
    cost_per_execution DECIMAL(10,4),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent execution results
CREATE TABLE agent_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    tenant_id INTEGER,

    -- Execution Details
    trigger_type TEXT,
    input_data TEXT, -- JSON
    output_data TEXT, -- JSON

    -- Performance
    success BOOLEAN,
    duration_ms INTEGER,
    tokens_used INTEGER,
    cost DECIMAL(10,4),

    -- Error Tracking
    error_type TEXT,
    error_message TEXT,
    error_stack TEXT,

    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Agent usage tracking for billing
CREATE TABLE agent_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    agent_id TEXT NOT NULL,

    -- Usage Metrics
    execution_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,

    -- Billing Period
    billing_period_start DATE,
    billing_period_end DATE,

    -- Limits
    token_limit INTEGER,
    cost_limit DECIMAL(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    UNIQUE(tenant_id, agent_id, billing_period_start)
);

-- ============================================================================
-- ANALYTICS & METRICS
-- ============================================================================

-- Page analytics events
CREATE TABLE analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Event Details
    event_type TEXT NOT NULL, -- 'page_view', 'form_submit', 'phone_click', 'whatsapp_click'
    event_category TEXT,
    event_action TEXT,
    event_label TEXT,
    event_value INTEGER,

    -- Page Info
    page_url TEXT,
    page_title TEXT,

    -- Visitor Info
    visitor_id TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,

    -- UTM Parameters
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,

    -- Device Info
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    browser TEXT,
    os TEXT,

    -- Location
    country TEXT,
    region TEXT,
    city TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Conversion tracking
CREATE TABLE conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Conversion Details
    type TEXT NOT NULL, -- 'lead', 'customer', 'sale', 'review'
    value DECIMAL(10,2),

    -- Attribution
    source TEXT,
    medium TEXT,
    campaign TEXT,

    -- Related Entities
    lead_id INTEGER,
    customer_id INTEGER,
    job_id INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- ============================================================================
-- COMPLIANCE & AUDIT
-- ============================================================================

-- Data residency requirements
CREATE TABLE data_residency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Compliance Requirements
    jurisdiction TEXT NOT NULL, -- 'PR', 'US', 'EU'
    compliance_level TEXT, -- 'standard', 'healthcare', 'government'

    -- Data Location Constraints
    data_location TEXT, -- Edge location constraint
    processing_location TEXT,
    backup_location TEXT,

    -- Audit
    audit_required BOOLEAN DEFAULT FALSE,
    audit_frequency TEXT, -- 'monthly', 'quarterly', 'annual'
    last_audit_at TIMESTAMP,
    next_audit_at TIMESTAMP,

    -- Documentation
    compliance_docs TEXT, -- JSON array of document URLs

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Audit log for compliance
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Actor
    user_id INTEGER,
    tenant_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,

    -- Action
    action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'export'
    resource_type TEXT NOT NULL, -- 'tenant', 'lead', 'customer', 'job'
    resource_id INTEGER,

    -- Details
    changes TEXT, -- JSON diff of changes
    reason TEXT,

    -- Compliance
    requires_audit BOOLEAN DEFAULT FALSE,
    compliance_tags TEXT, -- JSON array

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tenant lookups
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_brand ON tenants(brand);
CREATE INDEX idx_tenants_user_id ON tenants(user_id);

-- Lead management
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_phone ON leads(phone);

-- Content retrieval
CREATE INDEX idx_site_content_tenant ON site_content(tenant_id);
CREATE INDEX idx_site_content_section ON site_content(section_name);

-- Analytics queries
CREATE INDEX idx_analytics_tenant ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- Puerto Rico specific
CREATE INDEX idx_gate_photos_tenant ON gate_photos(tenant_id);
CREATE INDEX idx_gate_photos_location ON gate_photos(latitude, longitude);
CREATE INDEX idx_ath_movil_tenant ON ath_movil_transactions(tenant_id);

-- Communication
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_whatsapp_phone ON whatsapp_conversations(customer_phone);

-- Pipeline
CREATE INDEX idx_raw_businesses_status ON raw_businesses(status);
CREATE INDEX idx_raw_businesses_campaign ON raw_businesses(campaign);

-- Agent tracking
CREATE INDEX idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_tenant ON agent_executions(tenant_id);
CREATE INDEX idx_agent_usage_tenant ON agent_usage(tenant_id);

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default agents
INSERT INTO agents (id, name, description, type, tier, model, cost_per_execution) VALUES
('content-generator', 'AI Content Writer', 'Generates website content during onboarding', 'operational', 'platform', 'llama-3', 0.0001),
('onsite-chat', 'Website Chat Assistant', 'Browser-based chat support', 'operational', 'platform', 'llama-3', 0.0001),
('whatsapp-bot', 'WhatsApp Business Assistant', 'Automated WhatsApp responses', 'operational', 'premium', 'gpt-4', 0.002),
('reputation-manager', 'Review Request Automator', 'Sends review requests after job completion', 'growth', 'premium', 'llama-3', 0.01),
('sales-nurturer', '24/7 Sales Assistant', 'Nurtures leads automatically', 'growth', 'premium', 'gpt-4', 0.002),
('gemini-reviewer', 'Code Review Assistant', 'Reviews PRs for security and quality', 'devops', 'platform', 'gemini', 0.0005);

-- Insert industry templates
INSERT INTO industry_templates (industry, hero_template, primary_color, secondary_color, default_services) VALUES
('plumber', 'Emergency Plumbing Services in {city}', '#0ea5e9', '#f59e0b', '["Leak Repair", "Drain Cleaning", "Water Heater Installation", "Emergency Services"]'),
('hvac', 'Heating & Cooling Experts in {city}', '#dc2626', '#0ea5e9', '["AC Installation", "Heating Repair", "Maintenance Plans", "Emergency Service"]'),
('landscaper', 'Beautiful Landscapes in {city}', '#16a34a', '#84cc16', '["Lawn Care", "Garden Design", "Tree Trimming", "Irrigation"]'),
('electrician', 'Licensed Electricians in {city}', '#facc15', '#1f2937', '["Wiring", "Panel Upgrades", "Lighting Installation", "Emergency Repairs"]'),
('roofer', 'Professional Roofing in {city}', '#7c3aed', '#dc2626', '["Roof Repair", "Replacement", "Inspection", "Storm Damage"]');

-- Insert scraper campaigns
INSERT INTO scraper_campaigns (name, source, search_query, icp_tags, schedule, target_count) VALUES
('Unmappable Puerto Rico', 'google_maps', 'plomero OR electricista Puerto Rico', '["unmappable", "high_value"]', '0 2 * * *', 500),
('Digital Ghosts PR', 'yellow_pages', 'site:paginasamarillas.pr', '["digital_ghost", "needs_website"]', '0 3 * * 1', 1000),
('High Value Services', 'google_maps', 'abogado OR medico OR dentista Puerto Rico', '["high_value", "premium_target"]', '0 4 * * 3', 300);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Tenant health overview
CREATE VIEW tenant_health AS
SELECT
    t.id,
    t.business_name,
    t.brand,
    t.subscription_tier,
    t.status,
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'converted') as converted_leads,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT j.id) as total_jobs,
    SUM(j.final_amount) as total_revenue,
    MAX(l.created_at) as last_lead_date,
    MAX(j.created_at) as last_job_date
FROM tenants t
LEFT JOIN leads l ON t.id = l.tenant_id
LEFT JOIN customers c ON t.id = c.tenant_id
LEFT JOIN jobs j ON t.id = j.tenant_id
GROUP BY t.id;

-- Pipeline conversion funnel
CREATE VIEW pipeline_funnel AS
SELECT
    COUNT(*) FILTER (WHERE status = 'unprocessed') as raw_businesses,
    COUNT(*) FILTER (WHERE status = 'processed') as processed,
    COUNT(*) FILTER (WHERE status = 'quarantined') as quarantined,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ghost') as ghost_profiles,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'claimed') as claimed,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tenants
FROM raw_businesses rb
CROSS JOIN tenants t;

-- Agent performance metrics
CREATE VIEW agent_metrics AS
SELECT
    a.id as agent_id,
    a.name,
    a.type,
    a.tier,
    COUNT(ae.id) as total_executions,
    COUNT(ae.id) FILTER (WHERE ae.success = TRUE) as successful_executions,
    AVG(ae.duration_ms) as avg_duration_ms,
    SUM(ae.tokens_used) as total_tokens,
    SUM(ae.cost) as total_cost,
    COUNT(ae.id) FILTER (WHERE ae.success = TRUE) * 100.0 / NULLIF(COUNT(ae.id), 0) as success_rate
FROM agents a
LEFT JOIN agent_executions ae ON a.id = ae.agent_id
WHERE ae.executed_at > datetime('now', '-30 days')
GROUP BY a.id, a.name, a.type, a.tier;