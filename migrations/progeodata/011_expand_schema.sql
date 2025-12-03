-- Migration 011: Expand ProGeoData Schema for All US States + Industries
-- This migration creates the foundation for scaling data collection across all 50 US states and multiple industries

-- Step 1: Create States Reference Table
CREATE TABLE IF NOT EXISTS states (
  code TEXT PRIMARY KEY,        -- FL, TX, CA, etc.
  name TEXT NOT NULL,           -- Florida, Texas, California
  scraper_status TEXT DEFAULT 'not_implemented',  -- not_implemented, implemented, testing, production
  licensing_board_url TEXT,
  rate_limit_per_sec REAL DEFAULT 1.0,
  last_scraped_at TEXT,
  total_professionals INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create Industries Reference Table
CREATE TABLE IF NOT EXISTS industries (
  id TEXT PRIMARY KEY,          -- real_estate, insurance, contractor, etc.
  name TEXT NOT NULL,           -- Real Estate, Insurance, General Contractor
  category TEXT,                -- Licensed Professional, Financial, Medical, Legal
  typical_license_prefix TEXT,  -- RE, INS, CGC, etc.
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create State-Industry Scraper Config Table
CREATE TABLE IF NOT EXISTS scraper_configs (
  id TEXT PRIMARY KEY,              -- FL_real_estate, TX_insurance, etc.
  state_code TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  source_name TEXT,                 -- FL_DBPR, TX_TREC, CA_DRE, etc.
  source_url TEXT,
  scraper_status TEXT DEFAULT 'not_implemented',
  rate_limit_per_sec REAL DEFAULT 1.0,
  requires_browser_rendering INTEGER DEFAULT 0,
  last_scraped_at TEXT,
  total_records INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (state_code) REFERENCES states(code),
  FOREIGN KEY (industry_id) REFERENCES industries(id)
);

-- Step 4: Update professionals Table with proper foreign keys and indexes
-- First, check if the table exists and create it if not
CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  source_id TEXT,                   -- License number from source
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  state_code TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  license_number TEXT,
  license_status TEXT,              -- ACTIVE, EXPIRED, SUSPENDED, etc.
  license_expiry TEXT,
  business_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  county TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  specialty TEXT,                   -- Sub-specialty within industry
  years_licensed INTEGER,
  source_name TEXT,                 -- FL_DBPR, TX_TREC, etc.
  raw_data TEXT,                    -- JSON of original scraped data
  scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (state_code) REFERENCES states(code),
  FOREIGN KEY (industry_id) REFERENCES industries(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prof_state ON professionals(state_code);
CREATE INDEX IF NOT EXISTS idx_prof_industry ON professionals(industry_id);
CREATE INDEX IF NOT EXISTS idx_prof_state_industry ON professionals(state_code, industry_id);
CREATE INDEX IF NOT EXISTS idx_prof_postal ON professionals(postal_code);
CREATE INDEX IF NOT EXISTS idx_prof_city ON professionals(city, state_code);
CREATE INDEX IF NOT EXISTS idx_prof_license ON professionals(license_number, state_code);

-- Step 5: Seed States Table with all 50 US States
INSERT OR IGNORE INTO states (code, name, scraper_status, licensing_board_url) VALUES
('AL', 'Alabama', 'not_implemented', 'https://www.alabama.gov/'),
('AK', 'Alaska', 'not_implemented', 'https://www.alaska.gov/'),
('AZ', 'Arizona', 'not_implemented', 'https://www.az.gov/'),
('AR', 'Arkansas', 'not_implemented', 'https://www.arkansas.gov/'),
('CA', 'California', 'not_implemented', 'https://www.ca.gov/'),
('CO', 'Colorado', 'not_implemented', 'https://www.colorado.gov/'),
('CT', 'Connecticut', 'not_implemented', 'https://www.ct.gov/'),
('DE', 'Delaware', 'not_implemented', 'https://www.delaware.gov/'),
('FL', 'Florida', 'production', 'https://www.myfloridalicense.com/'),
('GA', 'Georgia', 'not_implemented', 'https://www.georgia.gov/'),
('HI', 'Hawaii', 'not_implemented', 'https://www.hawaii.gov/'),
('ID', 'Idaho', 'not_implemented', 'https://www.idaho.gov/'),
('IL', 'Illinois', 'not_implemented', 'https://www.illinois.gov/'),
('IN', 'Indiana', 'not_implemented', 'https://www.in.gov/'),
('IA', 'Iowa', 'not_implemented', 'https://www.iowa.gov/'),
('KS', 'Kansas', 'not_implemented', 'https://www.kansas.gov/'),
('KY', 'Kentucky', 'not_implemented', 'https://www.kentucky.gov/'),
('LA', 'Louisiana', 'not_implemented', 'https://www.louisiana.gov/'),
('ME', 'Maine', 'not_implemented', 'https://www.maine.gov/'),
('MD', 'Maryland', 'not_implemented', 'https://www.maryland.gov/'),
('MA', 'Massachusetts', 'not_implemented', 'https://www.mass.gov/'),
('MI', 'Michigan', 'not_implemented', 'https://www.michigan.gov/'),
('MN', 'Minnesota', 'not_implemented', 'https://www.mn.gov/'),
('MS', 'Mississippi', 'not_implemented', 'https://www.mississippi.gov/'),
('MO', 'Missouri', 'not_implemented', 'https://www.mo.gov/'),
('MT', 'Montana', 'not_implemented', 'https://www.mt.gov/'),
('NE', 'Nebraska', 'not_implemented', 'https://www.nebraska.gov/'),
('NV', 'Nevada', 'not_implemented', 'https://www.nv.gov/'),
('NH', 'New Hampshire', 'not_implemented', 'https://www.nh.gov/'),
('NJ', 'New Jersey', 'not_implemented', 'https://www.nj.gov/'),
('NM', 'New Mexico', 'not_implemented', 'https://www.newmexico.gov/'),
('NY', 'New York', 'not_implemented', 'https://www.ny.gov/'),
('NC', 'North Carolina', 'not_implemented', 'https://www.nc.gov/'),
('ND', 'North Dakota', 'not_implemented', 'https://www.nd.gov/'),
('OH', 'Ohio', 'not_implemented', 'https://www.ohio.gov/'),
('OK', 'Oklahoma', 'not_implemented', 'https://www.ok.gov/'),
('OR', 'Oregon', 'not_implemented', 'https://www.oregon.gov/'),
('PA', 'Pennsylvania', 'not_implemented', 'https://www.pa.gov/'),
('RI', 'Rhode Island', 'not_implemented', 'https://www.ri.gov/'),
('SC', 'South Carolina', 'not_implemented', 'https://www.sc.gov/'),
('SD', 'South Dakota', 'not_implemented', 'https://www.sd.gov/'),
('TN', 'Tennessee', 'not_implemented', 'https://www.tn.gov/'),
('TX', 'Texas', 'production', 'https://www.trec.texas.gov/'),
('UT', 'Utah', 'not_implemented', 'https://www.utah.gov/'),
('VT', 'Vermont', 'not_implemented', 'https://www.vermont.gov/'),
('VA', 'Virginia', 'not_implemented', 'https://www.virginia.gov/'),
('WA', 'Washington', 'not_implemented', 'https://www.wa.gov/'),
('WV', 'West Virginia', 'not_implemented', 'https://www.wv.gov/'),
('WI', 'Wisconsin', 'not_implemented', 'https://www.wisconsin.gov/'),
('WY', 'Wyoming', 'not_implemented', 'https://www.wyo.gov/');

-- Step 6: Seed Industries Table with 20+ industries
INSERT OR IGNORE INTO industries (id, name, category, typical_license_prefix) VALUES
('real_estate', 'Real Estate Agent/Broker', 'Licensed Professional', 'RE'),
('insurance', 'Insurance Agent', 'Financial', 'INS'),
('mortgage', 'Mortgage Broker', 'Financial', 'MB'),
('contractor_general', 'General Contractor', 'Licensed Professional', 'CGC'),
('contractor_electrical', 'Electrical Contractor', 'Licensed Professional', 'EC'),
('contractor_plumbing', 'Plumbing Contractor', 'Licensed Professional', 'PC'),
('contractor_hvac', 'HVAC Contractor', 'Licensed Professional', 'HVAC'),
('contractor_roofing', 'Roofing Contractor', 'Licensed Professional', 'RC'),
('home_inspector', 'Home Inspector', 'Licensed Professional', 'HI'),
('appraiser', 'Real Estate Appraiser', 'Licensed Professional', 'APP'),
('architect', 'Architect', 'Licensed Professional', 'ARCH'),
('engineer', 'Professional Engineer', 'Licensed Professional', 'PE'),
('accountant_cpa', 'CPA', 'Financial', 'CPA'),
('attorney', 'Attorney', 'Legal', 'ESQ'),
('nurse', 'Registered Nurse', 'Medical', 'RN'),
('dentist', 'Dentist', 'Medical', 'DDS'),
('physician', 'Physician', 'Medical', 'MD'),
('pharmacist', 'Pharmacist', 'Medical', 'RPh'),
('veterinarian', 'Veterinarian', 'Medical', 'DVM'),
('cosmetologist', 'Cosmetologist', 'Licensed Professional', 'COS');

-- Step 7: Seed Priority Scraper Configurations
INSERT OR IGNORE INTO scraper_configs (id, state_code, industry_id, source_name, scraper_status, rate_limit_per_sec) VALUES
('FL_real_estate', 'FL', 'real_estate', 'FL_DBPR', 'production', 1.0),
('TX_real_estate', 'TX', 'real_estate', 'TX_TREC', 'production', 1.0),
('CA_real_estate', 'CA', 'real_estate', 'CA_DRE', 'not_implemented', 1.0),
('WA_real_estate', 'WA', 'real_estate', 'WA_DOL', 'not_implemented', 1.0),
('AZ_real_estate', 'AZ', 'real_estate', 'AZ_ADRE', 'not_implemented', 1.0),
('NY_real_estate', 'NY', 'real_estate', 'NY_DOS', 'not_implemented', 1.0),
('FL_contractor_general', 'FL', 'contractor_general', 'FL_DBPR', 'not_implemented', 1.0),
('FL_insurance', 'FL', 'insurance', 'FL_DFS', 'not_implemented', 1.0);

-- Step 8: Record migration completion
INSERT OR REPLACE INTO schema_migrations (version, applied_at)
VALUES ('011_expand_schema', CURRENT_TIMESTAMP);