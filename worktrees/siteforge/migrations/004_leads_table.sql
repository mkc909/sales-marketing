-- Migration 004: Create Leads Table
-- Purpose: Store lead captures from all industry landing pages
-- Date: 2025-11-30

-- Drop existing table if needed (careful in production!)
-- DROP TABLE IF EXISTS leads;

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Contact Information
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  -- Lead Details
  message TEXT,
  service TEXT,
  business_id TEXT,
  industry TEXT NOT NULL,
  city TEXT,

  -- Metadata
  is_emergency INTEGER DEFAULT 0,
  source TEXT NOT NULL,  -- 'instant_quote' or 'contact_form'
  status TEXT DEFAULT 'new',  -- 'new', 'contacted', 'qualified', 'won', 'lost'

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT,
  contacted_at TEXT,

  -- Assignment & Management
  assigned_to TEXT,
  notes TEXT,

  -- Conversion Tracking
  conversion_value REAL,
  conversion_date TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_emergency ON leads(is_emergency) WHERE is_emergency = 1;

-- Create composite index for business dashboard queries
CREATE INDEX IF NOT EXISTS idx_leads_business_status ON leads(business_id, status);

-- Lead response times tracking table (optional)
CREATE TABLE IF NOT EXISTS lead_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  responded_at TEXT NOT NULL,
  response_time_seconds INTEGER NOT NULL,
  responder_id TEXT,
  response_channel TEXT,  -- 'sms', 'email', 'phone', 'platform'

  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lead_responses_lead_id ON lead_responses(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_responses_responded_at ON lead_responses(responded_at DESC);

-- Sample query examples (commented out)
/*

-- Get all new leads for a business
SELECT * FROM leads
WHERE business_id = 'business-123'
  AND status = 'new'
ORDER BY created_at DESC;

-- Get emergency leads
SELECT * FROM leads
WHERE is_emergency = 1
  AND status = 'new'
ORDER BY created_at DESC;

-- Get leads by industry and city
SELECT * FROM leads
WHERE industry = 'plumber'
  AND city = 'san-juan'
  AND status = 'new'
ORDER BY created_at DESC;

-- Calculate average response time
SELECT
  business_id,
  AVG(response_time_seconds) / 60.0 as avg_response_minutes,
  COUNT(*) as total_leads
FROM lead_responses
GROUP BY business_id
ORDER BY avg_response_minutes ASC;

-- Lead conversion rate by industry
SELECT
  industry,
  COUNT(*) as total_leads,
  SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_leads,
  ROUND(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate
FROM leads
GROUP BY industry
ORDER BY conversion_rate DESC;

-- Revenue by industry
SELECT
  industry,
  SUM(conversion_value) as total_revenue,
  COUNT(CASE WHEN conversion_value > 0 THEN 1 END) as paid_conversions,
  AVG(conversion_value) as avg_deal_size
FROM leads
WHERE status = 'won'
GROUP BY industry
ORDER BY total_revenue DESC;

*/
