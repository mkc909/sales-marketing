-- Migration 002: Agent Profile System V2
-- Adds geographic focus, specialties, tiers, and content customization

-- Drop existing indexes if they exist (for clean migration)
DROP INDEX IF EXISTS idx_state_city;
DROP INDEX IF EXISTS idx_slug;
DROP INDEX IF EXISTS idx_license;
DROP INDEX IF EXISTS idx_mls;
DROP INDEX IF EXISTS idx_brokerage;
DROP INDEX IF EXISTS idx_status;
DROP INDEX IF EXISTS idx_ghost;

-- Add new columns to agents table
ALTER TABLE agents ADD COLUMN primary_region TEXT;
ALTER TABLE agents ADD COLUMN primary_county TEXT;
ALTER TABLE agents ADD COLUMN service_regions JSON DEFAULT '[]';
ALTER TABLE agents ADD COLUMN service_zipcodes JSON DEFAULT '[]';
ALTER TABLE agents ADD COLUMN service_radius_miles INTEGER DEFAULT 25;

-- Specialties and focus
ALTER TABLE agents ADD COLUMN primary_specialty TEXT DEFAULT 'general';
ALTER TABLE agents ADD COLUMN secondary_specialties JSON DEFAULT '[]';
ALTER TABLE agents ADD COLUMN property_types JSON DEFAULT '["single_family", "condo"]';
ALTER TABLE agents ADD COLUMN price_ranges JSON DEFAULT '{}';
ALTER TABLE agents ADD COLUMN client_focus TEXT DEFAULT 'both';
ALTER TABLE agents ADD COLUMN language_capabilities JSON DEFAULT '["English"]';

-- Experience indicators
ALTER TABLE agents ADD COLUMN years_experience INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN transactions_ytd INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN total_volume_sold DECIMAL(12,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN avg_days_to_close INTEGER;

-- Tier system
ALTER TABLE agents ADD COLUMN subscription_tier TEXT DEFAULT 'ghost';
ALTER TABLE agents ADD COLUMN tier_started_at TIMESTAMP;
ALTER TABLE agents ADD COLUMN tier_expires_at TIMESTAMP;

-- Content customization
ALTER TABLE agents ADD COLUMN bio_tone TEXT DEFAULT 'professional';
ALTER TABLE agents ADD COLUMN content_style TEXT DEFAULT 'informative';
ALTER TABLE agents ADD COLUMN unique_value_props JSON DEFAULT '[]';

-- Feature flags
ALTER TABLE agents ADD COLUMN features JSON DEFAULT '{}';

-- Create new indexes for performance
CREATE INDEX idx_geo ON agents(state, city, primary_region);
CREATE INDEX idx_specialty ON agents(primary_specialty, client_focus);
CREATE INDEX idx_tier ON agents(subscription_tier);
CREATE INDEX idx_state_city ON agents(state, city);
CREATE INDEX idx_slug ON agents(slug);
CREATE INDEX idx_license ON agents(license_number);
CREATE INDEX idx_mls ON agents(mls_id);
CREATE INDEX idx_brokerage ON agents(brokerage);
CREATE INDEX idx_status ON agents(status);
CREATE INDEX idx_ghost ON agents(ghost_profile, claimed_at);

-- Geographic areas table
CREATE TABLE IF NOT EXISTS geographic_areas (
  id TEXT PRIMARY KEY,
  area_name TEXT NOT NULL,
  city TEXT NOT NULL,
  county TEXT,
  state TEXT NOT NULL,

  -- Area characteristics
  median_price INTEGER,
  median_income INTEGER,
  population INTEGER,
  school_rating DECIMAL(3,1),

  -- Content generation data
  area_description TEXT,
  lifestyle_tags JSON DEFAULT '[]',
  demographics JSON DEFAULT '{}',
  amenities JSON DEFAULT '[]',

  -- Market data
  avg_dom INTEGER, -- Average days on market
  inventory_level TEXT, -- 'low', 'normal', 'high'
  price_trend TEXT, -- 'rising', 'stable', 'declining'
  demand_score INTEGER, -- 1-100

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_area_location ON geographic_areas(state, city, area_name);
CREATE INDEX idx_area_price ON geographic_areas(median_price);

-- Tier features configuration
CREATE TABLE IF NOT EXISTS tier_features (
  tier TEXT PRIMARY KEY,

  -- Lead management
  monthly_leads_included INTEGER DEFAULT 0,
  lead_response_time TEXT DEFAULT '24_hours',
  lead_qualification BOOLEAN DEFAULT false,
  lead_nurturing BOOLEAN DEFAULT false,

  -- Tools and content
  buyer_tools JSON DEFAULT '[]',
  seller_tools JSON DEFAULT '[]',
  investor_tools JSON DEFAULT '[]',

  -- AI agents
  ai_agents_included JSON DEFAULT '[]',
  ai_responses_monthly INTEGER DEFAULT 0,

  -- Profile features
  custom_domain BOOLEAN DEFAULT false,
  video_profiles BOOLEAN DEFAULT false,
  virtual_tours BOOLEAN DEFAULT false,
  market_reports BOOLEAN DEFAULT false,

  -- Marketing
  social_media_posts INTEGER DEFAULT 0,
  email_campaigns INTEGER DEFAULT 0,
  print_materials BOOLEAN DEFAULT false,

  -- Analytics
  analytics_level TEXT DEFAULT 'basic',

  -- Pricing
  price_monthly DECIMAL(6,2) DEFAULT 0,
  price_annual DECIMAL(7,2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tier configurations
INSERT INTO tier_features (
  tier, monthly_leads_included, lead_response_time,
  buyer_tools, seller_tools, price_monthly
) VALUES
(
  'ghost',
  0,
  'manual',
  '["mortgage_calculator"]',
  '["home_value_estimator"]',
  0
),
(
  'basic',
  10,
  '1_hour',
  '["mortgage_calculator", "affordability_checker", "closing_cost_estimator"]',
  '["home_value_estimator", "net_proceeds_calculator", "pricing_optimizer"]',
  49
),
(
  'professional',
  30,
  'instant',
  '["mortgage_calculator", "affordability_checker", "closing_cost_estimator", "school_finder", "commute_analyzer", "neighborhood_scorer"]',
  '["home_value_estimator", "net_proceeds_calculator", "pricing_optimizer", "staging_visualizer", "market_timing_advisor", "marketing_campaign_builder"]',
  149
),
(
  'premium',
  100,
  'instant',
  '["all_tools"]',
  '["all_tools"]',
  299
),
(
  'enterprise',
  -1, -- unlimited
  'instant',
  '["all_tools", "custom_tools"]',
  '["all_tools", "custom_tools"]',
  999
);

-- Content templates table
CREATE TABLE IF NOT EXISTS content_templates (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  specialty TEXT,
  tone TEXT,

  template_text TEXT NOT NULL,
  variables JSON DEFAULT '[]',

  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  performance_score DECIMAL(3,2), -- 0.00 to 1.00

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_content_type ON content_templates(content_type, specialty, tone);
CREATE INDEX idx_content_usage ON content_templates(usage_count, last_used);

-- Agent content history for rotation tracking
CREATE TABLE IF NOT EXISTS agent_content_history (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  template_id TEXT,

  content_hash TEXT, -- To detect duplicates
  generated_content TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- When content should be refreshed

  -- Performance metrics
  views INTEGER DEFAULT 0,
  engagement_time INTEGER DEFAULT 0, -- seconds
  conversions INTEGER DEFAULT 0,

  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (template_id) REFERENCES content_templates(id)
);

CREATE INDEX idx_agent_content ON agent_content_history(agent_id, content_type);
CREATE INDEX idx_content_expires ON agent_content_history(expires_at);

-- Agent specialties reference table
CREATE TABLE IF NOT EXISTS agent_specialties (
  specialty_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'primary', 'property_type', 'client_type'

  description TEXT,
  keywords JSON DEFAULT '[]', -- For SEO

  -- Content hints
  buyer_focus TEXT,
  seller_focus TEXT,

  -- Typical client profile
  typical_price_range JSON,
  typical_client_age TEXT,
  typical_transaction_time INTEGER, -- days

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert specialty definitions
INSERT INTO agent_specialties (
  specialty_key, display_name, category, description,
  buyer_focus, seller_focus
) VALUES
('luxury', 'Luxury Properties', 'primary',
  'High-end residential properties with premium amenities',
  'Exclusive access to off-market properties and white-glove service',
  'Global marketing reach and sophisticated staging strategies'),

('first_time', 'First-Time Buyers', 'primary',
  'Guiding new buyers through their first purchase',
  'Patient education and step-by-step guidance through the process',
  'Pricing strategies for entry-level market segments'),

('investment', 'Investment Properties', 'primary',
  'Rental properties and fix-and-flip opportunities',
  'ROI analysis and cash flow projections for every property',
  '1031 exchange expertise and portfolio optimization'),

('waterfront', 'Waterfront Properties', 'property_type',
  'Oceanfront, lakefront, and riverfront properties',
  'Understanding of flood zones, insurance, and dock rights',
  'Marketing to luxury and lifestyle-focused buyers'),

('condos', 'Condominiums', 'property_type',
  'High-rise and low-rise condominium units',
  'HOA analysis and assessment review expertise',
  'Understanding of condo docs and association health'),

('commercial', 'Commercial Real Estate', 'primary',
  'Office, retail, and industrial properties',
  'Cap rate analysis and tenant quality evaluation',
  'Lease negotiation and property repositioning strategies');

-- Agent tools usage tracking
CREATE TABLE IF NOT EXISTS agent_tools_usage (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_category TEXT NOT NULL, -- 'buyer', 'seller', 'general'

  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Engagement metrics
  avg_time_spent INTEGER, -- seconds
  completions INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,

  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_tool_usage ON agent_tools_usage(agent_id, tool_name);
CREATE INDEX idx_tool_performance ON agent_tools_usage(leads_generated DESC);

-- Lead routing rules based on specialty and region
CREATE TABLE IF NOT EXISTS lead_routing_rules (
  id TEXT PRIMARY KEY,

  -- Matching criteria
  lead_type TEXT, -- 'buyer', 'seller', 'investor'
  property_type TEXT,
  price_range_min DECIMAL(12,2),
  price_range_max DECIMAL(12,2),
  region TEXT,
  city TEXT,
  state TEXT,

  -- Routing configuration
  required_specialty TEXT,
  required_tier TEXT, -- Minimum tier required
  max_agents_to_notify INTEGER DEFAULT 3,

  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routing_rules ON lead_routing_rules(active, priority DESC);

-- Sample data for Miami luxury market
INSERT INTO geographic_areas (
  id, area_name, city, county, state,
  median_price, median_income, school_rating,
  area_description, lifestyle_tags
) VALUES
(
  'miami-beach-south',
  'South Beach',
  'Miami Beach',
  'Miami-Dade',
  'FL',
  850000,
  75000,
  7.5,
  'World-famous beach community known for Art Deco architecture and vibrant nightlife',
  '["beachfront", "nightlife", "walkable", "tourist_destination", "luxury"]'
),
(
  'coral-gables',
  'Coral Gables',
  'Coral Gables',
  'Miami-Dade',
  'FL',
  1200000,
  95000,
  9.0,
  'Planned community with tree-lined streets, historic architecture, and top-rated schools',
  '["family_friendly", "historic", "upscale", "excellent_schools", "quiet"]'
),
(
  'brickell',
  'Brickell',
  'Miami',
  'Miami-Dade',
  'FL',
  650000,
  85000,
  7.0,
  'Miami\'s financial district with luxury high-rises and urban lifestyle',
  '["urban", "high_rise", "walkable", "business_district", "nightlife"]'
);

-- Sample data for Austin tech corridor
INSERT INTO geographic_areas (
  id, area_name, city, county, state,
  median_price, median_income, school_rating,
  area_description, lifestyle_tags
) VALUES
(
  'austin-downtown',
  'Downtown Austin',
  'Austin',
  'Travis',
  'TX',
  750000,
  90000,
  7.5,
  'Urban core with tech companies, music venues, and foodie scene',
  '["urban", "tech_hub", "music_scene", "walkable", "young_professionals"]'
),
(
  'westlake',
  'Westlake',
  'West Lake Hills',
  'Travis',
  'TX',
  1500000,
  150000,
  10.0,
  'Affluent suburb with top-rated schools and hill country views',
  '["luxury", "excellent_schools", "family_friendly", "suburban", "gated_communities"]'
),
(
  'east-austin',
  'East Austin',
  'Austin',
  'Travis',
  'TX',
  550000,
  70000,
  6.5,
  'Rapidly gentrifying area with arts scene and diverse food options',
  '["arts_district", "gentrifying", "diverse", "trendy", "food_scene"]'
);

-- Migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('002_agent_profile_v2', CURRENT_TIMESTAMP);