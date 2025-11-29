-- Migration 003: Multi-Industry Platform Support
-- Transforms real estate-only platform to support lawyers, insurance, mortgage, financial, contractors

-- Step 1: Rename agents table to professionals (if not already done)
ALTER TABLE agents RENAME TO professionals_backup;

-- Step 2: Create new universal professionals table
CREATE TABLE professionals (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,

  -- Industry Classification
  industry TEXT NOT NULL, -- 'real_estate', 'legal', 'insurance', 'mortgage', 'financial', 'medical', 'contractor'
  profession TEXT NOT NULL, -- 'agent', 'attorney', 'broker', 'advisor', 'doctor', 'plumber'
  specializations JSON DEFAULT '[]',

  -- Identity
  name TEXT NOT NULL,
  company_name TEXT,

  -- Licensing & Compliance
  license_number TEXT,
  license_state TEXT,
  license_type TEXT,
  license_status TEXT DEFAULT 'active',
  license_expiry DATE,

  -- Additional Certifications
  certifications JSON DEFAULT '[]',
  professional_memberships JSON DEFAULT '[]',

  -- Geographic Service Area
  primary_state TEXT NOT NULL,
  primary_city TEXT,
  primary_region TEXT,
  primary_county TEXT,
  service_regions JSON DEFAULT '[]',
  service_zipcodes JSON DEFAULT '[]',
  service_radius_miles INTEGER DEFAULT 25,
  remote_services BOOLEAN DEFAULT false,

  -- Contact Information
  email TEXT,
  phone TEXT,
  cell_phone TEXT,
  office_phone TEXT,
  website TEXT,
  office_address TEXT,

  -- Professional Details
  years_experience INTEGER DEFAULT 0,
  education JSON DEFAULT '[]',
  language_capabilities JSON DEFAULT '["English"]',

  -- Business Metrics (Industry-specific interpretation)
  total_clients INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_transaction_value DECIMAL(12,2),
  total_volume DECIMAL(14,2),
  response_time_hours INTEGER DEFAULT 24,
  transactions_ytd INTEGER DEFAULT 0,
  avg_days_to_close INTEGER,

  -- Profile Information
  bio TEXT,
  bio_tone TEXT DEFAULT 'professional',
  content_style TEXT DEFAULT 'informative',
  photo_url TEXT,
  video_intro_url TEXT,
  unique_value_props JSON DEFAULT '[]',

  -- Platform Integration
  subscription_tier TEXT DEFAULT 'ghost',
  tier_started_at TIMESTAMP,
  tier_expires_at TIMESTAMP,
  ghost_profile BOOLEAN DEFAULT true,
  claimed_at TIMESTAMP,
  claimed_by TEXT,
  profile_views INTEGER DEFAULT 0,
  fake_leads_count INTEGER DEFAULT 7,

  -- Feature Flags & Settings
  features JSON DEFAULT '{}',
  tools_config JSON DEFAULT '{}',
  compliance_settings JSON DEFAULT '{}',

  -- Metadata
  source TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enriched_at TIMESTAMP
);

-- Step 3: Copy data from backup to new structure
INSERT INTO professionals (
  id, slug, industry, profession, name, company_name,
  license_number, license_state, license_status,
  primary_state, primary_city, primary_region, primary_county,
  service_regions, service_zipcodes, service_radius_miles,
  email, phone, cell_phone, office_phone,
  years_experience, language_capabilities,
  bio, bio_tone, content_style, photo_url, unique_value_props,
  subscription_tier, tier_started_at, tier_expires_at,
  ghost_profile, claimed_at, claimed_by, profile_views, fake_leads_count,
  features, source, created_at, updated_at, enriched_at
)
SELECT
  id, slug, industry, 'agent', name, brokerage,
  license_number, state, status,
  state, city, primary_region, primary_county,
  service_regions, service_zipcodes, service_radius_miles,
  email, phone, cell_phone, office_phone,
  years_experience, language_capabilities,
  bio, bio_tone, content_style, photo_url, unique_value_props,
  subscription_tier, tier_started_at, tier_expires_at,
  ghost_profile, claimed_at, claimed_by, profile_views, fake_leads_count,
  features, source, created_at, updated_at, enriched_at
FROM professionals_backup;

-- Step 4: Create industry-specific extension tables

-- Legal professionals extension
CREATE TABLE IF NOT EXISTS legal_profiles (
  professional_id TEXT PRIMARY KEY,
  bar_admissions JSON,
  federal_admissions JSON,
  primary_practice_area TEXT,
  practice_areas JSON,
  cases_won INTEGER DEFAULT 0,
  cases_total INTEGER DEFAULT 0,
  settlements_total DECIMAL(14,2),
  avg_case_duration_days INTEGER,
  verdict_amount_total DECIMAL(14,2),
  handles_litigation BOOLEAN DEFAULT false,
  handles_transactions BOOLEAN DEFAULT false,
  offers_contingency BOOLEAN DEFAULT false,
  free_consultation BOOLEAN DEFAULT true,
  malpractice_insurance BOOLEAN DEFAULT true,
  trust_account_compliant BOOLEAN DEFAULT true,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Insurance professionals extension
CREATE TABLE IF NOT EXISTS insurance_profiles (
  professional_id TEXT PRIMARY KEY,
  insurance_licenses JSON,
  appointed_carriers JSON,
  product_lines JSON,
  primary_market TEXT,
  policies_written INTEGER DEFAULT 0,
  policies_active INTEGER DEFAULT 0,
  annual_premium_volume DECIMAL(12,2),
  retention_rate DECIMAL(5,2),
  claims_assistance_provided INTEGER DEFAULT 0,
  offers_bundling BOOLEAN DEFAULT true,
  bilingual_service BOOLEAN DEFAULT false,
  mobile_quotes BOOLEAN DEFAULT true,
  claims_support_247 BOOLEAN DEFAULT false,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Mortgage professionals extension
CREATE TABLE IF NOT EXISTS mortgage_profiles (
  professional_id TEXT PRIMARY KEY,
  nmls_number TEXT UNIQUE,
  nmls_state_licenses JSON,
  loan_types JSON,
  primary_market TEXT,
  loans_closed_ytd INTEGER DEFAULT 0,
  loans_closed_total INTEGER DEFAULT 0,
  total_volume_funded DECIMAL(14,2),
  avg_closing_days INTEGER,
  avg_rate_offered DECIMAL(5,3),
  primary_lender TEXT,
  lender_network JSON,
  direct_lender BOOLEAN DEFAULT false,
  broker BOOLEAN DEFAULT true,
  first_time_buyers BOOLEAN DEFAULT true,
  veterans BOOLEAN DEFAULT false,
  self_employed BOOLEAN DEFAULT false,
  foreign_nationals BOOLEAN DEFAULT false,
  hard_money BOOLEAN DEFAULT false,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Financial advisor extension
CREATE TABLE IF NOT EXISTS financial_profiles (
  professional_id TEXT PRIMARY KEY,
  registrations JSON,
  finra_number TEXT,
  sec_registered BOOLEAN DEFAULT false,
  state_registrations JSON,
  advisory_services JSON,
  minimum_investment DECIMAL(12,2),
  fee_structure TEXT,
  aum_total DECIMAL(14,2),
  clients_total INTEGER DEFAULT 0,
  avg_portfolio_size DECIMAL(12,2),
  client_retention_years DECIMAL(4,2),
  serves_individuals BOOLEAN DEFAULT true,
  serves_businesses BOOLEAN DEFAULT false,
  retirement_planning BOOLEAN DEFAULT true,
  estate_planning BOOLEAN DEFAULT false,
  tax_planning BOOLEAN DEFAULT false,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Contractor/Trade professional extension
CREATE TABLE IF NOT EXISTS contractor_profiles (
  professional_id TEXT PRIMARY KEY,
  contractor_license TEXT,
  liability_insurance BOOLEAN DEFAULT true,
  bonded BOOLEAN DEFAULT false,
  workers_comp BOOLEAN DEFAULT false,
  trade_type TEXT,
  services_offered JSON,
  commercial_work BOOLEAN DEFAULT false,
  residential_work BOOLEAN DEFAULT true,
  emergency_service BOOLEAN DEFAULT false,
  jobs_completed INTEGER DEFAULT 0,
  avg_job_value DECIMAL(10,2),
  warranty_offered TEXT,
  scheduling_lead_time_days INTEGER DEFAULT 7,
  same_day_service BOOLEAN DEFAULT false,
  weekend_service BOOLEAN DEFAULT false,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Real estate specific (migrate from existing)
CREATE TABLE IF NOT EXISTS real_estate_profiles (
  professional_id TEXT PRIMARY KEY,
  mls_id TEXT,
  brokerage TEXT,
  brokerage_license TEXT,
  property_types JSON DEFAULT '["single_family", "condo"]',
  price_ranges JSON DEFAULT '{}',
  client_focus TEXT DEFAULT 'both',
  primary_specialty TEXT DEFAULT 'general',
  secondary_specialties JSON DEFAULT '[]',
  total_sales INTEGER DEFAULT 0,
  avg_sale_price DECIMAL(12,2),
  avg_dom INTEGER,
  listing_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Migrate real estate specific data
INSERT INTO real_estate_profiles (
  professional_id, mls_id, brokerage,
  property_types, price_ranges, client_focus,
  primary_specialty, secondary_specialties
)
SELECT
  id, mls_id, brokerage,
  property_types, price_ranges, client_focus,
  primary_specialty, secondary_specialties
FROM professionals_backup
WHERE industry = 'real_estate' OR brokerage IS NOT NULL;

-- Step 5: Create industry configuration table
CREATE TABLE IF NOT EXISTS industry_config (
  industry TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  professions JSON NOT NULL,
  required_licenses BOOLEAN DEFAULT true,
  compliance_fields JSON,
  specializations JSON,
  tools JSON,
  lead_types JSON,
  metrics JSON,
  content_templates JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert industry configurations
INSERT INTO industry_config (industry, display_name, professions, required_licenses, specializations, tools, lead_types) VALUES
('real_estate', 'Real Estate',
  '["agent", "broker", "appraiser"]',
  true,
  '["luxury", "commercial", "first_time", "investment", "foreclosure"]',
  '["mortgage_calculator", "home_value_estimator", "school_finder", "market_analysis"]',
  '["buyer", "seller", "renter", "investor"]'
),
('legal', 'Legal Services',
  '["attorney", "paralegal", "mediator"]',
  true,
  '["personal_injury", "family", "criminal", "corporate", "estate", "immigration", "bankruptcy", "employment"]',
  '["case_evaluator", "settlement_calculator", "statute_limitations", "document_generator", "court_finder"]',
  '["plaintiff", "defendant", "business_client", "consultation"]'
),
('insurance', 'Insurance',
  '["agent", "broker", "adjuster"]',
  true,
  '["auto", "home", "life", "health", "commercial", "umbrella"]',
  '["quote_calculator", "coverage_analyzer", "claims_tracker", "risk_assessment", "bundle_optimizer"]',
  '["new_policy", "renewal", "claim", "quote_comparison"]'
),
('mortgage', 'Mortgage Services',
  '["loan_officer", "broker", "processor"]',
  true,
  '["purchase", "refinance", "fha", "va", "jumbo", "reverse", "commercial"]',
  '["rate_calculator", "affordability_checker", "refinance_analyzer", "closing_cost_estimator", "pre_approval_wizard"]',
  '["purchase", "refinance", "pre_approval", "rate_shopping"]'
),
('financial', 'Financial Advisory',
  '["advisor", "planner", "cpa", "tax_pro"]',
  true,
  '["retirement", "investment", "tax", "estate", "college", "business"]',
  '["retirement_calculator", "investment_analyzer", "tax_estimator", "portfolio_builder", "risk_assessment"]',
  '["individual", "business", "retirement", "investment"]'
),
('contractor', 'Home Services',
  '["plumber", "electrician", "hvac", "roofer", "general", "handyman"]',
  true,
  '["emergency", "commercial", "new_construction", "renovation", "green"]',
  '["estimate_calculator", "project_scheduler", "permit_checker", "warranty_tracker", "before_after_gallery"]',
  '["emergency", "repair", "installation", "maintenance"]'
);

-- Step 6: Create unified lead routing table
CREATE TABLE IF NOT EXISTS lead_routing_rules (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  lead_type TEXT,
  specialty_required TEXT,
  price_range_min DECIMAL(12,2),
  price_range_max DECIMAL(12,2),
  region TEXT,
  city TEXT,
  state TEXT,
  required_tier TEXT,
  max_professionals_to_notify INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Update error tracking tables for Wrangler tail system
CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT, -- JSON
  fingerprint TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT false,
  resolved_at INTEGER,
  resolved_by TEXT,
  notes TEXT,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS error_metrics (
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (date, hour, category, level)
);

CREATE TABLE IF NOT EXISTS performance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  operation TEXT NOT NULL,
  duration INTEGER NOT NULL,
  url TEXT,
  user_id TEXT
);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_professionals_industry ON professionals(industry, profession);
CREATE INDEX IF NOT EXISTS idx_professionals_location ON professionals(primary_state, primary_city, primary_region);
CREATE INDEX IF NOT EXISTS idx_professionals_tier ON professionals(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_professionals_ghost ON professionals(ghost_profile, claimed_at);
CREATE INDEX IF NOT EXISTS idx_professionals_license ON professionals(license_number, license_state);
CREATE INDEX IF NOT EXISTS idx_routing ON lead_routing_rules(industry, active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fingerprint ON error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_level_category ON error_logs(level, category);
CREATE INDEX IF NOT EXISTS idx_resolved ON error_logs(resolved, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_timestamp ON performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_operation ON performance_logs(operation, duration DESC);

-- Step 9: Clean up
DROP TABLE IF EXISTS professionals_backup;

-- Migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('003_multi_industry_platform', CURRENT_TIMESTAMP);