-- Migration 005: Scraping Pipeline - Triple D1 Architecture
-- DB_INGEST: Raw scraped data
-- DB_STAGING: Enriched and validated leads
-- DB_PROD: Ghost profiles ready for production

-- ============================================================================
-- DB_INGEST: Raw Scraped Data
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_business_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL, -- 'google_maps', 'facebook', 'manual'
  source_id TEXT, -- External ID from source platform

  -- Basic Information
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',

  -- Contact Information
  phone TEXT,
  email TEXT,
  website TEXT,
  facebook_url TEXT,

  -- Location Data
  latitude REAL,
  longitude REAL,
  place_id TEXT, -- Google Maps Place ID

  -- Business Details
  category TEXT, -- Primary business category
  categories JSON, -- All categories
  hours JSON, -- Operating hours
  rating REAL,
  review_count INTEGER,
  price_level INTEGER, -- 1-4 scale

  -- Metadata
  raw_data JSON, -- Complete raw response
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'processed', 'enriched', 'rejected'
  error_message TEXT,

  -- Indexes
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_business_status ON raw_business_data(status);
CREATE INDEX IF NOT EXISTS idx_raw_business_source ON raw_business_data(source);
CREATE INDEX IF NOT EXISTS idx_raw_business_scraped ON raw_business_data(scraped_at);
CREATE INDEX IF NOT EXISTS idx_raw_business_city ON raw_business_data(city);

-- ============================================================================
-- ICP Signal Detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS icp_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_business_id INTEGER NOT NULL,

  -- Signal Types
  no_website BOOLEAN DEFAULT FALSE,
  unmappable_address BOOLEAN DEFAULT FALSE, -- Contains "Int", "Km", etc.
  mobile_business BOOLEAN DEFAULT FALSE, -- Food truck, mobile service
  ghost_business BOOLEAN DEFAULT FALSE, -- No website + social only
  complex_address BOOLEAN DEFAULT FALSE, -- Long, hard-to-find address

  -- Specific Indicators
  has_facebook_only BOOLEAN DEFAULT FALSE,
  has_instagram_only BOOLEAN DEFAULT FALSE,
  address_complexity_score INTEGER, -- 0-100
  findability_score INTEGER, -- 0-100 (lower = harder to find)

  -- ICP Match Score
  icp_score INTEGER, -- 0-100 (higher = better ICP match)
  icp_category TEXT, -- 'high', 'medium', 'low'

  -- Detailed Signals
  signals JSON, -- Array of detected signals with details

  -- Metadata
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  detector_version TEXT DEFAULT 'v1.0',

  FOREIGN KEY (raw_business_id) REFERENCES raw_business_data(id)
);

CREATE INDEX IF NOT EXISTS idx_icp_signals_business ON icp_signals(raw_business_id);
CREATE INDEX IF NOT EXISTS idx_icp_signals_score ON icp_signals(icp_score);
CREATE INDEX IF NOT EXISTS idx_icp_signals_category ON icp_signals(icp_category);

-- ============================================================================
-- DB_STAGING: Enriched Leads
-- ============================================================================

CREATE TABLE IF NOT EXISTS enriched_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_business_id INTEGER NOT NULL,

  -- Validated Information
  business_name TEXT NOT NULL,
  normalized_address TEXT,
  validated_phone TEXT,
  validated_email TEXT,

  -- Enriched Data
  owner_name TEXT,
  owner_email TEXT,
  owner_linkedin TEXT,
  employee_count INTEGER,
  annual_revenue_estimate INTEGER,

  -- Social Media
  facebook_url TEXT,
  facebook_followers INTEGER,
  facebook_engagement_rate REAL,
  instagram_url TEXT,
  instagram_followers INTEGER,
  tiktok_url TEXT,

  -- Business Intelligence
  years_in_business INTEGER,
  verified_business BOOLEAN DEFAULT FALSE,
  has_google_reviews BOOLEAN DEFAULT FALSE,
  average_rating REAL,
  total_reviews INTEGER,

  -- Geo Intelligence
  service_area_radius INTEGER, -- Miles
  serves_multiple_locations BOOLEAN DEFAULT FALSE,
  is_mobile_service BOOLEAN DEFAULT FALSE,

  -- Enrichment Metadata
  enrichment_sources JSON, -- Array of enrichment sources used
  enrichment_confidence REAL, -- 0-1 confidence score
  last_enriched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Lead Scoring
  lead_score INTEGER, -- 0-100
  lead_grade TEXT, -- 'A', 'B', 'C', 'D'
  conversion_probability REAL, -- 0-1

  -- Status
  status TEXT DEFAULT 'enriched', -- 'enriched', 'validated', 'ready', 'rejected'
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (raw_business_id) REFERENCES raw_business_data(id),
  UNIQUE(raw_business_id)
);

CREATE INDEX IF NOT EXISTS idx_enriched_leads_status ON enriched_leads(status);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_score ON enriched_leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_grade ON enriched_leads(lead_grade);

-- ============================================================================
-- DB_PROD: Ghost Business Profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS ghost_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enriched_lead_id INTEGER NOT NULL,

  -- Business Identity
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe slug
  display_name TEXT,

  -- Location
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  latitude REAL,
  longitude REAL,

  -- Contact
  phone TEXT,
  formatted_phone TEXT, -- (555) 123-4567
  email TEXT,
  website TEXT,

  -- Categories
  primary_category TEXT NOT NULL,
  categories JSON,
  services JSON,

  -- Profile Content
  description TEXT, -- Auto-generated SEO description
  about TEXT, -- Auto-generated about section
  specialties JSON,
  service_areas JSON,

  -- SEO Data
  meta_title TEXT,
  meta_description TEXT,
  keywords JSON,
  schema_org JSON, -- LocalBusiness schema

  -- Social Proof
  rating REAL,
  review_count INTEGER,
  years_in_business INTEGER,

  -- Media
  logo_url TEXT,
  cover_image_url TEXT,
  photos JSON,

  -- Claim Status
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP,
  claimed_by_user_id INTEGER,

  -- SEO Performance
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  claim_request_count INTEGER DEFAULT 0,

  -- Publishing
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (enriched_lead_id) REFERENCES enriched_leads(id)
);

CREATE INDEX IF NOT EXISTS idx_ghost_profiles_slug ON ghost_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_ghost_profiles_city_state ON ghost_profiles(city, state);
CREATE INDEX IF NOT EXISTS idx_ghost_profiles_published ON ghost_profiles(published);
CREATE INDEX IF NOT EXISTS idx_ghost_profiles_claimed ON ghost_profiles(is_claimed);
CREATE INDEX IF NOT EXISTS idx_ghost_profiles_category ON ghost_profiles(primary_category);

-- ============================================================================
-- Scraping Jobs & Scheduling
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Job Configuration
  job_type TEXT NOT NULL, -- 'google_maps', 'facebook', 'enrichment'
  job_name TEXT,

  -- Search Parameters
  search_query TEXT,
  location TEXT,
  radius INTEGER, -- Miles
  categories JSON,

  -- Execution
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'paused'
  priority INTEGER DEFAULT 5, -- 1-10

  -- Progress
  total_expected INTEGER,
  total_processed INTEGER DEFAULT 0,
  total_success INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,

  -- Rate Limiting
  rate_limit INTEGER DEFAULT 100, -- Requests per hour
  last_request_at TIMESTAMP,

  -- Results
  results_summary JSON,
  error_log JSON,

  -- Scheduling
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  next_run_at TIMESTAMP, -- For recurring jobs

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_type ON scraping_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_scheduled ON scraping_jobs(scheduled_at);

-- ============================================================================
-- API Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- API Details
  api_provider TEXT NOT NULL, -- 'google_maps', 'facebook', 'hunter.io', etc.
  endpoint TEXT,

  -- Request
  request_type TEXT, -- 'search', 'details', 'enrich'
  request_params JSON,

  -- Response
  status_code INTEGER,
  success BOOLEAN,
  response_time_ms INTEGER,

  -- Rate Limiting
  rate_limit_remaining INTEGER,
  rate_limit_reset TIMESTAMP,

  -- Costs
  api_calls_used INTEGER DEFAULT 1,
  estimated_cost REAL,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage(api_provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);

-- ============================================================================
-- Lead Conversion Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Lead Reference
  ghost_profile_id INTEGER NOT NULL,

  -- Conversion Event
  event_type TEXT NOT NULL, -- 'claim_request', 'phone_click', 'email_click', 'website_visit'
  conversion_source TEXT, -- 'organic', 'paid', 'referral'

  -- Visitor Data
  visitor_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,

  -- Geo Data
  visitor_city TEXT,
  visitor_state TEXT,
  visitor_country TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (ghost_profile_id) REFERENCES ghost_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_profile ON lead_conversions(ghost_profile_id);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_event ON lead_conversions(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_created ON lead_conversions(created_at);

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- High-value ICP leads ready for outreach
CREATE VIEW IF NOT EXISTS high_value_leads AS
SELECT
  el.*,
  rb.name,
  rb.city,
  rb.state,
  icp.icp_score,
  icp.signals
FROM enriched_leads el
JOIN raw_business_data rb ON el.raw_business_id = rb.id
JOIN icp_signals icp ON icp.raw_business_id = rb.id
WHERE el.lead_grade IN ('A', 'B')
  AND icp.icp_score >= 70
  AND el.status = 'ready'
ORDER BY el.lead_score DESC;

-- Ghost profiles ready for publishing
CREATE VIEW IF NOT EXISTS publishable_profiles AS
SELECT
  gp.*,
  el.lead_score,
  el.lead_grade
FROM ghost_profiles gp
JOIN enriched_leads el ON gp.enriched_lead_id = el.id
WHERE gp.published = FALSE
  AND gp.meta_title IS NOT NULL
  AND gp.schema_org IS NOT NULL
ORDER BY el.lead_score DESC;

-- Scraping job performance
CREATE VIEW IF NOT EXISTS job_performance AS
SELECT
  job_type,
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
  SUM(total_processed) as total_records_processed,
  SUM(total_success) as total_records_success,
  AVG(CAST((julianday(completed_at) - julianday(started_at)) * 24 * 60 AS INTEGER)) as avg_duration_minutes
FROM scraping_jobs
GROUP BY job_type;
