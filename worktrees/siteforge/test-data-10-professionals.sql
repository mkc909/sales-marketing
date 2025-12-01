-- Test Data: 10 Sample Professional Records
-- Mix of industries: real_estate (4), legal (2), insurance (2), mortgage (1), contractor (1)
-- For use with estateflow-db-dev database

-- Real Estate Professionals
INSERT INTO professionals (
  id, slug, industry, profession, name, company_name,
  license_number, license_state, primary_state, primary_city,
  email, phone, years_experience, bio,
  subscription_tier, ghost_profile, source
) VALUES
('prof-re-001', 'sarah-johnson-miami', 'real_estate', 'agent', 'Sarah Johnson', 'Coastal Realty Group',
  'FL-RE-123456', 'FL', 'FL', 'Miami',
  'sarah.johnson@coastalrealty.com', '305-555-0101', 8, 'Luxury waterfront specialist in Miami Beach and Brickell with 8 years of experience.',
  'professional', false, 'test_data'
),
('prof-re-002', 'michael-chen-austin', 'real_estate', 'agent', 'Michael Chen', 'Hill Country Properties',
  'TX-RE-789012', 'TX', 'TX', 'Austin',
  'mchen@hillcountryprop.com', '512-555-0202', 5, 'First-time buyer specialist helping young professionals find their dream homes in Austin.',
  'basic', true, 'test_data'
),
('prof-re-003', 'jennifer-williams-orlando', 'real_estate', 'broker', 'Jennifer Williams', 'Sunshine Homes Realty',
  'FL-BK-345678', 'FL', 'FL', 'Orlando',
  'jwilliams@sunshinehomes.com', '407-555-0303', 15, 'Investment property expert with deep knowledge of vacation rental market in Central Florida.',
  'premium', false, 'test_data'
),
('prof-re-004', 'david-martinez-houston', 'real_estate', 'agent', 'David Martinez', 'Metro Houston Homes',
  'TX-RE-901234', 'TX', 'TX', 'Houston',
  'dmartinez@metrohouston.com', '713-555-0404', 3, 'Commercial real estate specialist focusing on office and retail properties.',
  'ghost', true, 'test_data'
);

-- Legal Professionals
INSERT INTO professionals (
  id, slug, industry, profession, name, company_name,
  license_number, license_state, primary_state, primary_city,
  email, phone, years_experience, bio,
  subscription_tier, ghost_profile, source
) VALUES
('prof-legal-001', 'robert-thompson-tampa', 'legal', 'attorney', 'Robert Thompson', 'Thompson & Associates',
  'FL-BAR-567890', 'FL', 'FL', 'Tampa',
  'rthompson@thompsonlaw.com', '813-555-0505', 20, 'Personal injury attorney with proven track record in complex litigation cases.',
  'professional', false, 'test_data'
),
('prof-legal-002', 'amanda-garcia-dallas', 'legal', 'attorney', 'Amanda Garcia', 'Garcia Family Law',
  'TX-BAR-234567', 'TX', 'TX', 'Dallas',
  'agarcia@garciafamilylaw.com', '214-555-0606', 12, 'Family law specialist handling divorce, custody, and adoption cases with compassion.',
  'basic', true, 'test_data'
);

-- Insurance Professionals
INSERT INTO professionals (
  id, slug, industry, profession, name, company_name,
  license_number, license_state, primary_state, primary_city,
  email, phone, years_experience, bio,
  subscription_tier, ghost_profile, source
) VALUES
('prof-ins-001', 'james-wilson-miami', 'insurance', 'agent', 'James Wilson', 'Secure Florida Insurance',
  'FL-INS-876543', 'FL', 'FL', 'Miami',
  'jwilson@securefl.com', '305-555-0707', 10, 'Multi-line insurance specialist offering home, auto, and umbrella coverage.',
  'basic', false, 'test_data'
),
('prof-ins-002', 'lisa-brown-san-antonio', 'insurance', 'broker', 'Lisa Brown', 'Texas Insurance Solutions',
  'TX-INS-345678', 'TX', 'TX', 'San Antonio',
  'lbrown@txinssolutions.com', '210-555-0808', 7, 'Independent broker helping businesses find the right commercial insurance packages.',
  'professional', false, 'test_data'
);

-- Mortgage Professional
INSERT INTO professionals (
  id, slug, industry, profession, name, company_name,
  license_number, license_state, primary_state, primary_city,
  email, phone, years_experience, bio,
  subscription_tier, ghost_profile, source
) VALUES
('prof-mtg-001', 'kevin-anderson-orlando', 'mortgage', 'loan_officer', 'Kevin Anderson', 'First Home Lending',
  'NMLS-123456', 'FL', 'FL', 'Orlando',
  'kanderson@firsthomelending.com', '407-555-0909', 6, 'First-time buyer specialist helping families secure the best mortgage rates.',
  'basic', true, 'test_data'
);

-- Contractor Professional
INSERT INTO professionals (
  id, slug, industry, profession, name, company_name,
  license_number, license_state, primary_state, primary_city,
  email, phone, years_experience, bio,
  subscription_tier, ghost_profile, source
) VALUES
('prof-cont-001', 'carlos-rodriguez-austin', 'contractor', 'general', 'Carlos Rodriguez', 'Rodriguez Construction',
  'TX-CONT-987654', 'TX', 'TX', 'Austin',
  'crodriguez@rodriguezconst.com', '512-555-1010', 18, 'General contractor specializing in home remodeling and kitchen/bath renovations.',
  'professional', false, 'test_data'
);

-- Insert real estate profile extensions for real estate professionals
INSERT INTO real_estate_profiles (
  professional_id, mls_id, brokerage, property_types, client_focus, primary_specialty
) VALUES
('prof-re-001', 'MIAMI-MLS-12345', 'Coastal Realty Group', '["luxury", "waterfront", "condo"]', 'both', 'luxury'),
('prof-re-002', 'AUSTIN-MLS-67890', 'Hill Country Properties', '["single_family", "condo", "townhouse"]', 'buyer', 'first_time'),
('prof-re-003', 'ORLANDO-MLS-34567', 'Sunshine Homes Realty', '["investment", "vacation_rental", "single_family"]', 'investor', 'investment'),
('prof-re-004', 'HOUSTON-MLS-90123', 'Metro Houston Homes', '["commercial", "office", "retail"]', 'business', 'commercial');

-- Insert legal profile extensions
INSERT INTO legal_profiles (
  professional_id, bar_admissions, primary_practice_area, practice_areas,
  handles_litigation, offers_contingency, free_consultation
) VALUES
('prof-legal-001', '["FL", "Federal_Southern_District_FL"]', 'personal_injury', '["personal_injury", "medical_malpractice", "wrongful_death"]',
  true, true, true),
('prof-legal-002', '["TX"]', 'family', '["family", "divorce", "child_custody", "adoption"]',
  true, false, true);

-- Insert insurance profile extensions
INSERT INTO insurance_profiles (
  professional_id, insurance_licenses, product_lines, primary_market,
  offers_bundling, mobile_quotes
) VALUES
('prof-ins-001', '["property_casualty", "life_health"]', '["auto", "home", "life", "umbrella"]', 'personal',
  true, true),
('prof-ins-002', '["property_casualty", "commercial"]', '["commercial_property", "liability", "workers_comp", "commercial_auto"]', 'business',
  true, true);

-- Insert mortgage profile extension
INSERT INTO mortgage_profiles (
  professional_id, nmls_number, loan_types, primary_market,
  first_time_buyers, broker
) VALUES
('prof-mtg-001', 'NMLS-123456', '["conventional", "fha", "va", "usda"]', 'residential',
  true, true);

-- Insert contractor profile extension
INSERT INTO contractor_profiles (
  professional_id, contractor_license, trade_type, services_offered,
  liability_insurance, residential_work, commercial_work
) VALUES
('prof-cont-001', 'TX-CONT-987654', 'general', '["remodeling", "kitchen", "bathroom", "additions", "roofing"]',
  true, true, false);
