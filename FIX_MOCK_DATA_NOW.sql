-- EMERGENCY: Remove Mock Data from ProGeoData Database

-- 1. Check contamination level
SELECT 'Mock Data Audit' as report;
SELECT state,
       COUNT(*) as total_records,
       SUM(CASE WHEN name IS NULL OR name = 'undefined' THEN 1 ELSE 0 END) as null_names,
       SUM(CASE WHEN source_id LIKE 'MOCK%' OR source_id LIKE '%undefined%' THEN 1 ELSE 0 END) as mock_ids
FROM raw_business_data
GROUP BY state;

-- 2. Backup before deletion (just the IDs)
CREATE TABLE IF NOT EXISTS mock_data_backup AS
SELECT id, state, name, source_id, scraped_at
FROM raw_business_data
WHERE state IN ('CA', 'WA')
   OR name IS NULL
   OR name = 'undefined'
   OR source_id LIKE 'MOCK%'
   OR source_id LIKE '%undefined%';

-- 3. DELETE ALL MOCK DATA
DELETE FROM raw_business_data
WHERE state IN ('CA', 'WA')  -- These states not implemented
   OR name IS NULL
   OR name = 'undefined'
   OR name = ''
   OR source_id LIKE 'MOCK%'
   OR source_id LIKE '%undefined%'
   OR source_id IS NULL;

-- 4. Clean queue_messages of failed attempts
UPDATE queue_messages
SET status = 'failed'
WHERE state IN ('CA', 'WA')
AND status != 'failed';

-- 5. Mark CA/WA as unsupported in queue state
UPDATE scrape_queue_state
SET status = 'unsupported',
    last_error = 'State not implemented in scraper',
    updated_at = CURRENT_TIMESTAMP
WHERE state IN ('CA', 'WA');

-- 6. Verify clean data
SELECT 'Clean Data Report' as report;
SELECT state,
       COUNT(*) as total_records,
       MIN(name) as sample_name,
       MIN(source_id) as sample_license
FROM raw_business_data
WHERE name IS NOT NULL
  AND name != 'undefined'
  AND source_id NOT LIKE 'MOCK%'
GROUP BY state;

-- 7. Final counts
SELECT 'Final Status' as report;
SELECT
  (SELECT COUNT(*) FROM raw_business_data WHERE state = 'FL') as FL_professionals,
  (SELECT COUNT(*) FROM raw_business_data WHERE state = 'TX') as TX_professionals,
  (SELECT COUNT(*) FROM raw_business_data WHERE state = 'CA') as CA_should_be_zero,
  (SELECT COUNT(*) FROM raw_business_data WHERE state = 'WA') as WA_should_be_zero,
  (SELECT COUNT(*) FROM raw_business_data) as total_clean_records;