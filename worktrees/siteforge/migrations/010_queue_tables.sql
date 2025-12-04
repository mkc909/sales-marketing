-- Migration 010: ProGeoData Queue Tables for 24/7 Automated Scraping
-- Creates tables for queue state tracking and rate limiting

-- ============================================================================
-- Scrape Queue State - Track ZIP code processing status
-- ============================================================================

CREATE TABLE IF NOT EXISTS scrape_queue_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Location Identification
  zip_code TEXT NOT NULL,
  state TEXT NOT NULL, -- 'FL', 'TX', 'CA'
  city TEXT, -- Optional, populated after first scrape

  -- Processing Status
  status TEXT DEFAULT 'pending', -- 'pending', 'queued', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important

  -- Source Configuration
  source_type TEXT NOT NULL, -- 'FL_DBPR', 'TX_TREC', 'CA_DRE', 'WA_DOL'
  profession TEXT DEFAULT 'real_estate', -- Default to real estate agents

  -- Progress Tracking
  total_attempts INTEGER DEFAULT 0,
  successful_scrapes INTEGER DEFAULT 0,
  failed_scrapes INTEGER DEFAULT 0,
  last_result_count INTEGER DEFAULT 0, -- Number of records from last scrape

  -- Timing
  queued_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_attempted_at TIMESTAMP,
  next_retry_at TIMESTAMP, -- For failed items

  -- Error Tracking
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,

  -- Results
  total_professionals_found INTEGER DEFAULT 0,
  last_scrape_duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(zip_code, state, source_type, profession)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scrape_queue_status ON scrape_queue_state(status);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_state ON scrape_queue_state(state);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_priority ON scrape_queue_state(priority DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_next_retry ON scrape_queue_state(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_scrape_queue_zip ON scrape_queue_state(zip_code);

-- ============================================================================
-- Rate Limits - Track API rate limiting per source
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Source Identification
  source_type TEXT NOT NULL, -- 'FL_DBPR', 'TX_TREC', 'CA_DRE', 'browser_rendering'
  source_key TEXT NOT NULL, -- Additional key for granular limits (e.g., state, API endpoint)

  -- Rate Limit Configuration
  requests_per_second REAL DEFAULT 1.0, -- Max requests per second
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 100,
  requests_per_day INTEGER DEFAULT 1000,

  -- Current Window Tracking
  current_second_count INTEGER DEFAULT 0,
  current_minute_count INTEGER DEFAULT 0,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,

  -- Window Reset Timestamps
  second_reset_at TIMESTAMP,
  minute_reset_at TIMESTAMP,
  hour_reset_at TIMESTAMP,
  day_reset_at TIMESTAMP,

  -- Last Request Tracking
  last_request_at TIMESTAMP,
  last_request_duration_ms INTEGER,

  -- Status
  is_throttled BOOLEAN DEFAULT FALSE,
  throttled_until TIMESTAMP,
  throttle_reason TEXT,

  -- Statistics
  total_requests INTEGER DEFAULT 0,
  total_throttled INTEGER DEFAULT 0,
  average_request_duration_ms REAL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(source_type, source_key)
);

-- Indexes for rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_source ON rate_limits(source_type, source_key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_throttled ON rate_limits(is_throttled);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated ON rate_limits(updated_at);

-- ============================================================================
-- Queue Messages - Log of all queue messages processed
-- ============================================================================

CREATE TABLE IF NOT EXISTS queue_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Message Identification
  message_id TEXT UNIQUE NOT NULL,
  queue_name TEXT NOT NULL, -- 'progeodata-scrape-queue'

  -- Message Content
  zip_code TEXT NOT NULL,
  state TEXT NOT NULL,
  source_type TEXT NOT NULL,
  profession TEXT NOT NULL,

  -- Processing Status
  status TEXT DEFAULT 'received', -- 'received', 'processing', 'completed', 'failed', 'retried'
  attempt_number INTEGER DEFAULT 1,

  -- Timing
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_processing_at TIMESTAMP,
  completed_at TIMESTAMP,
  processing_duration_ms INTEGER,

  -- Results
  result_count INTEGER, -- Number of professionals found
  stored_count INTEGER, -- Number actually stored in DB

  -- Error Tracking
  error_message TEXT,
  error_stack TEXT,

  -- Retry Information
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,

  -- Browser Metrics (if applicable)
  browser_duration_seconds REAL,
  browser_cost_estimate REAL,

  -- Metadata
  worker_version TEXT DEFAULT 'v1.0',
  source_metadata JSON -- Additional context about the scrape
);

-- Indexes for queue message tracking
CREATE INDEX IF NOT EXISTS idx_queue_messages_status ON queue_messages(status);
CREATE INDEX IF NOT EXISTS idx_queue_messages_zip ON queue_messages(zip_code);
CREATE INDEX IF NOT EXISTS idx_queue_messages_state ON queue_messages(state);
CREATE INDEX IF NOT EXISTS idx_queue_messages_received ON queue_messages(received_at);
CREATE INDEX IF NOT EXISTS idx_queue_messages_retry ON queue_messages(next_retry_at);

-- ============================================================================
-- Scrape Schedule - Define when and how often to scrape each source
-- ============================================================================

CREATE TABLE IF NOT EXISTS scrape_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Schedule Identification
  schedule_name TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Target Configuration
  state TEXT NOT NULL, -- 'FL', 'TX', 'CA', 'ALL'
  source_type TEXT NOT NULL,
  profession TEXT DEFAULT 'real_estate',

  -- ZIP Code Selection Strategy
  zip_selection_strategy TEXT DEFAULT 'all', -- 'all', 'priority', 'failed', 'random_sample'
  zip_limit_per_run INTEGER, -- NULL = no limit, process all

  -- Schedule Configuration
  cron_expression TEXT, -- Standard cron format
  frequency_hours INTEGER, -- Alternative to cron: run every N hours
  enabled BOOLEAN DEFAULT TRUE,

  -- Execution Windows
  start_time TIME, -- Daily start time (e.g., '09:00:00')
  end_time TIME, -- Daily end time (e.g., '17:00:00')
  allowed_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', -- Comma-separated

  -- Rate Limiting
  max_concurrent_requests INTEGER DEFAULT 1,
  delay_between_requests_ms INTEGER DEFAULT 1000,

  -- Last Execution
  last_run_at TIMESTAMP,
  last_run_status TEXT, -- 'success', 'partial', 'failed'
  last_run_result_count INTEGER,
  next_run_at TIMESTAMP,

  -- Statistics
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  total_records_scraped INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

-- Indexes for schedule queries
CREATE INDEX IF NOT EXISTS idx_scrape_schedule_enabled ON scrape_schedule(enabled);
CREATE INDEX IF NOT EXISTS idx_scrape_schedule_next_run ON scrape_schedule(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scrape_schedule_state ON scrape_schedule(state);

-- ============================================================================
-- Initial Data - Seed schedules for FL, TX, CA
-- ============================================================================

-- Florida Real Estate Daily Scrape
INSERT OR IGNORE INTO scrape_schedule (
  schedule_name,
  description,
  state,
  source_type,
  profession,
  zip_selection_strategy,
  zip_limit_per_run,
  frequency_hours,
  enabled,
  start_time,
  end_time,
  max_concurrent_requests,
  delay_between_requests_ms
) VALUES (
  'FL_Daily_Real_Estate',
  'Daily scrape of Florida real estate agents from DBPR',
  'FL',
  'FL_DBPR',
  'real_estate',
  'priority',
  100, -- Process 100 ZIPs per run
  24, -- Run every 24 hours
  TRUE,
  '08:00:00',
  '20:00:00',
  1,
  1000
);

-- Texas Real Estate Daily Scrape
INSERT OR IGNORE INTO scrape_schedule (
  schedule_name,
  description,
  state,
  source_type,
  profession,
  zip_selection_strategy,
  zip_limit_per_run,
  frequency_hours,
  enabled,
  start_time,
  end_time,
  max_concurrent_requests,
  delay_between_requests_ms
) VALUES (
  'TX_Daily_Real_Estate',
  'Daily scrape of Texas real estate agents from TREC',
  'TX',
  'TX_TREC',
  'real_estate',
  'priority',
  100,
  24,
  TRUE,
  '08:00:00',
  '20:00:00',
  1,
  1000
);

-- California Real Estate Daily Scrape
INSERT OR IGNORE INTO scrape_schedule (
  schedule_name,
  description,
  state,
  source_type,
  profession,
  zip_selection_strategy,
  zip_limit_per_run,
  frequency_hours,
  enabled,
  start_time,
  end_time,
  max_concurrent_requests,
  delay_between_requests_ms
) VALUES (
  'CA_Daily_Real_Estate',
  'Daily scrape of California real estate agents from DRE',
  'CA',
  'CA_DRE',
  'real_estate',
  'priority',
  100,
  24,
  TRUE,
  '08:00:00',
  '20:00:00',
  1,
  1000
);

-- ============================================================================
-- Initial Rate Limits - Configure default rate limits
-- ============================================================================

-- Florida DBPR rate limits
INSERT OR IGNORE INTO rate_limits (
  source_type,
  source_key,
  requests_per_second,
  requests_per_minute,
  requests_per_hour,
  requests_per_day
) VALUES (
  'FL_DBPR',
  'default',
  1.0,
  60,
  100,
  1000
);

-- Texas TREC rate limits
INSERT OR IGNORE INTO rate_limits (
  source_type,
  source_key,
  requests_per_second,
  requests_per_minute,
  requests_per_hour,
  requests_per_day
) VALUES (
  'TX_TREC',
  'default',
  1.0,
  60,
  100,
  1000
);

-- California DRE rate limits
INSERT OR IGNORE INTO rate_limits (
  source_type,
  source_key,
  requests_per_second,
  requests_per_minute,
  requests_per_hour,
  requests_per_day
) VALUES (
  'CA_DRE',
  'default',
  1.0,
  60,
  100,
  1000
);

-- Browser rendering rate limits (more conservative due to cost)
INSERT OR IGNORE INTO rate_limits (
  source_type,
  source_key,
  requests_per_second,
  requests_per_minute,
  requests_per_hour,
  requests_per_day
) VALUES (
  'browser_rendering',
  'default',
  0.5, -- 1 request every 2 seconds
  30,
  50,
  500
);

-- ============================================================================
-- Views for Reporting and Monitoring
-- ============================================================================

-- Queue health overview
CREATE VIEW IF NOT EXISTS queue_health AS
SELECT
  state,
  source_type,
  COUNT(*) as total_zips,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
  SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(total_professionals_found) as total_professionals,
  AVG(last_scrape_duration_ms) as avg_scrape_duration_ms,
  MAX(updated_at) as last_updated
FROM scrape_queue_state
GROUP BY state, source_type;

-- Recent queue messages
CREATE VIEW IF NOT EXISTS recent_queue_activity AS
SELECT
  message_id,
  state,
  zip_code,
  source_type,
  status,
  attempt_number,
  result_count,
  processing_duration_ms,
  browser_duration_seconds,
  browser_cost_estimate,
  error_message,
  received_at
FROM queue_messages
ORDER BY received_at DESC
LIMIT 100;

-- Rate limit status
CREATE VIEW IF NOT EXISTS rate_limit_status AS
SELECT
  source_type,
  source_key,
  requests_per_second,
  current_second_count,
  current_minute_count,
  current_hour_count,
  current_day_count,
  is_throttled,
  throttled_until,
  last_request_at,
  total_requests,
  total_throttled,
  ROUND(average_request_duration_ms, 2) as avg_duration_ms
FROM rate_limits
ORDER BY source_type, source_key;

-- Schedule execution status
CREATE VIEW IF NOT EXISTS schedule_status AS
SELECT
  schedule_name,
  state,
  source_type,
  enabled,
  frequency_hours,
  last_run_at,
  last_run_status,
  last_run_result_count,
  next_run_at,
  total_runs,
  successful_runs,
  failed_runs,
  total_records_scraped,
  ROUND(CAST(successful_runs AS REAL) / NULLIF(total_runs, 0) * 100, 2) as success_rate_percent
FROM scrape_schedule
ORDER BY next_run_at;
