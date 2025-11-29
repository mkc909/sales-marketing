-- Migration 001: Initial Agents Table
-- Creates the basic agents table for real estate professionals

-- Create agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  
  -- Basic Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cell_phone TEXT,
  office_phone TEXT,
  
  -- Licensing
  license_number TEXT,
  mls_id TEXT,
  state TEXT NOT NULL,
  city TEXT,
  
  -- Brokerage
  brokerage TEXT,
  brokerage_license TEXT,
  
  -- Profile
  bio TEXT,
  photo_url TEXT,
  video_intro_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'active',
  ghost_profile BOOLEAN DEFAULT true,
  claimed_at TIMESTAMP,
  claimed_by TEXT,
  profile_views INTEGER DEFAULT 0,
  fake_leads_count INTEGER DEFAULT 7,
  
  -- Metadata
  source TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enriched_at TIMESTAMP
);

-- Create basic indexes
CREATE INDEX idx_state_city ON agents(state, city);
CREATE INDEX idx_slug ON agents(slug);
CREATE INDEX idx_license ON agents(license_number);
CREATE INDEX idx_mls ON agents(mls_id);
CREATE INDEX idx_brokerage ON agents(brokerage);
CREATE INDEX idx_status ON agents(status);
CREATE INDEX idx_ghost ON agents(ghost_profile, claimed_at);

-- Migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('001_initial_agents', CURRENT_TIMESTAMP);