-- Emergency Fix: Create missing raw_business_data table
CREATE TABLE IF NOT EXISTS raw_business_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT NOT NULL,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  category TEXT,
  raw_data TEXT,
  status TEXT DEFAULT 'new',
  scraped_at TEXT,
  last_updated TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source, source_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_business_data_source ON raw_business_data(source);
CREATE INDEX IF NOT EXISTS idx_raw_business_data_state ON raw_business_data(state);
CREATE INDEX IF NOT EXISTS idx_raw_business_data_postal ON raw_business_data(postal_code);
CREATE INDEX IF NOT EXISTS idx_raw_business_data_status ON raw_business_data(status);

-- Create pros table if it doesn't exist
CREATE TABLE IF NOT EXISTS pros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  license_number TEXT,
  state TEXT NOT NULL,
  city TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  profession TEXT DEFAULT 'real_estate',
  source TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pros_state ON pros(state);
CREATE INDEX IF NOT EXISTS idx_pros_zip ON pros(zip);
CREATE INDEX IF NOT EXISTS idx_pros_license ON pros(license_number);

-- Emergency ETL: Copy data from raw_business_data to pros
INSERT INTO pros (name, license_number, state, city, zip, phone, email, profession, source)
SELECT
  name,
  source_id as license_number,
  state,
  city,
  postal_code as zip,
  phone,
  email,
  category as profession,
  source
FROM raw_business_data
WHERE status = 'new'
AND name IS NOT NULL
AND state IS NOT NULL
ON CONFLICT DO NOTHING;

-- Mark processed records
UPDATE raw_business_data
SET status = 'processed'
WHERE status = 'new'
AND name IS NOT NULL
AND state IS NOT NULL;

-- Check results
SELECT 'raw_business_data' as table_name, COUNT(*) as count FROM raw_business_data
UNION ALL
SELECT 'pros' as table_name, COUNT(*) as count FROM pros;

-- Check data quality
SELECT state, COUNT(*) as count
FROM pros
GROUP BY state
ORDER BY count DESC;