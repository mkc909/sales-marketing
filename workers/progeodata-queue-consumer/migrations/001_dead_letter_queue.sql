-- Migration 001: Dead Letter Queue Table
-- Creates table for messages that exceeded max retries

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Original Message
  message_id TEXT NOT NULL,
  message_body TEXT NOT NULL, -- JSON of original ScrapeMessage

  -- Failure Information
  zip_code TEXT NOT NULL,
  state TEXT NOT NULL,
  source_type TEXT NOT NULL,
  profession TEXT,

  -- Error Details
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  original_scheduled_at TIMESTAMP,

  -- Metadata
  worker_version TEXT,
  source_metadata JSON,

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  resolution_notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON dead_letter_queue(failed_at);
CREATE INDEX IF NOT EXISTS idx_dlq_source ON dead_letter_queue(source_type, state);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_queue(resolved);
CREATE INDEX IF NOT EXISTS idx_dlq_zip ON dead_letter_queue(zip_code);

-- View for unresolved DLQ messages
CREATE VIEW IF NOT EXISTS dlq_unresolved AS
SELECT
  id,
  message_id,
  zip_code,
  state,
  source_type,
  error_message,
  retry_count,
  failed_at,
  ROUND((julianday('now') - julianday(failed_at)) * 24, 2) as hours_since_failure
FROM dead_letter_queue
WHERE resolved = FALSE
ORDER BY failed_at DESC;
