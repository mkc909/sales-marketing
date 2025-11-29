-- SiteForge Multi-tenant Database Schema
-- Platform: Cloudflare D1

-- Users table (platform admins and clients)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'client', -- 'admin', 'client'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table (each business is a tenant)
CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Domain Settings
    subdomain TEXT UNIQUE NOT NULL, -- e.g., 'joes-plumbing'
    custom_domain TEXT UNIQUE, -- e.g., 'joesplumbing.com'
    domain_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'failed'
    ssl_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'failed'

    -- Business Info
    business_name TEXT NOT NULL,
    industry TEXT NOT NULL, -- 'plumber', 'hvac', 'landscaper', 'electrician', 'roofer'
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,

    -- Customization
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#f59e0b',
    logo_url TEXT,
    favicon_url TEXT,

    -- Subscription
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'professional', 'ai_admin'
    subscription_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    trial_ends_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_published_at TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Site content (AI-generated and user-edited)
CREATE TABLE site_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    section_name TEXT NOT NULL, -- 'hero', 'about', 'services', 'features', 'testimonials', 'cta'
    content_json TEXT NOT NULL, -- JSON blob for flexibility
    is_ai_generated BOOLEAN DEFAULT 1,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, section_name, version)
);

-- Services offered by each business
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_range TEXT, -- e.g., '$100-$500'
    duration TEXT, -- e.g., '2-4 hours'
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Leads captured from forms
CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,

    -- Lead Info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    message TEXT,
    service_interested TEXT,

    -- Lead Source
    source TEXT DEFAULT 'website', -- 'website', 'phone', 'social'
    landing_page TEXT,
    referrer TEXT,

    -- Lead Status
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

    -- AI Interaction
    auto_responded BOOLEAN DEFAULT 0,
    auto_response_sent_at TIMESTAMP,
    conversation_history TEXT, -- JSON array of messages

    -- Conversion Tracking
    converted_at TIMESTAMP,
    conversion_value DECIMAL(10,2),
    lost_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Analytics events
CREATE TABLE analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'page_view', 'form_submit', 'phone_click', 'direction_click'
    event_data TEXT, -- JSON blob with event-specific data
    visitor_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Industry templates
CREATE TABLE industry_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    industry TEXT UNIQUE NOT NULL,

    -- Default Content
    hero_template TEXT,
    about_template TEXT,
    services_template TEXT,

    -- Default Colors
    primary_color TEXT,
    secondary_color TEXT,

    -- Common Services
    default_services TEXT, -- JSON array

    -- SEO Defaults
    meta_keywords TEXT,
    meta_description_template TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI prompt templates
CREATE TABLE ai_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    prompt_template TEXT NOT NULL,
    model TEXT DEFAULT 'llama-3-8b-instruct',
    max_tokens INTEGER DEFAULT 500,
    temperature DECIMAL(2,1) DEFAULT 0.7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_site_content_tenant ON site_content(tenant_id);
CREATE INDEX idx_analytics_tenant ON analytics(tenant_id);
CREATE INDEX idx_analytics_event ON analytics(event_type);

-- Insert default industry templates
INSERT INTO industry_templates (industry, hero_template, primary_color, secondary_color, default_services) VALUES
('plumber', 'Emergency Plumbing Services in {city}', '#0ea5e9', '#f59e0b', '["Leak Repair", "Drain Cleaning", "Water Heater Installation", "Emergency Services"]'),
('hvac', 'Heating & Cooling Experts in {city}', '#dc2626', '#0ea5e9', '["AC Installation", "Heating Repair", "Maintenance Plans", "Emergency Service"]'),
('landscaper', 'Beautiful Landscapes in {city}', '#16a34a', '#84cc16', '["Lawn Care", "Garden Design", "Tree Trimming", "Irrigation"]'),
('electrician', 'Licensed Electricians in {city}', '#facc15', '#1f2937', '["Wiring", "Panel Upgrades", "Lighting Installation", "Emergency Repairs"]'),
('roofer', 'Professional Roofing in {city}', '#7c3aed', '#dc2626', '["Roof Repair", "Replacement", "Inspection", "Storm Damage"]');

-- Insert default AI prompts
INSERT INTO ai_prompts (name, prompt_template) VALUES
('hero_generator', 'Write a compelling hero section for a {industry} business in {city}. Focus on trust, reliability, and quick response. Maximum 2 sentences.'),
('about_generator', 'Write an about section for a {industry} business called {business_name} in {city}. Emphasize experience, local presence, and customer service. Maximum 100 words.'),
('service_description', 'Write a brief description for the {service_name} service offered by a {industry}. Focus on benefits and outcomes. Maximum 50 words.');