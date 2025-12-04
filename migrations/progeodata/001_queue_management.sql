-- Queue state tracking
CREATE TABLE IF NOT EXISTS queue_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_name TEXT NOT NULL UNIQUE,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  last_seed_time TEXT,
  last_process_time TEXT,
  status TEXT DEFAULT 'idle',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL UNIQUE,
  requests_per_second REAL DEFAULT 1.0,
  last_request_time INTEGER,
  request_count INTEGER DEFAULT 0,
  reset_time INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Processing log
CREATE TABLE IF NOT EXISTS processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL,
  records_found INTEGER DEFAULT 0,
  records_saved INTEGER DEFAULT 0,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSON,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Worker health
CREATE TABLE IF NOT EXISTS worker_health (
  worker_id TEXT PRIMARY KEY,
  worker_type TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  last_heartbeat TEXT,
  items_processed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  average_processing_time_ms REAL,
  context JSON,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_state_status ON queue_state(status);
CREATE INDEX IF NOT EXISTS idx_rate_limits_source ON rate_limits(source);
CREATE INDEX IF NOT EXISTS idx_processing_log_zip ON processing_log(zip_code, state);
CREATE INDEX IF NOT EXISTS idx_processing_log_created ON processing_log(created_at);
CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log(created_at);
CREATE INDEX IF NOT EXISTS idx_worker_health_status ON worker_health(status);

-- Initial data
INSERT OR IGNORE INTO queue_state (queue_name, status)
VALUES ('progeodata-zip-queue', 'idle');

INSERT OR IGNORE INTO rate_limits (source, requests_per_second)
VALUES
  ('FL_DBPR', 1.0),
  ('TX_TREC', 1.0),
  ('CA_DRE', 1.0);