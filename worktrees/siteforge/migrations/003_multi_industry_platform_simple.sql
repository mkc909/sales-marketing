-- Migration 003: Multi-Industry Platform Support (Simple Version)
-- Adds basic multi-industry support to existing agents table

-- Add industry column if not exists (already added manually)
-- ALTER TABLE agents ADD COLUMN industry TEXT DEFAULT 'real_estate';

-- Add profession column
ALTER TABLE agents ADD COLUMN profession TEXT DEFAULT 'agent';

-- Add specializations column
ALTER TABLE agents ADD COLUMN specializations JSON DEFAULT '[]';

-- Create industry configuration table
CREATE TABLE IF NOT EXISTS industry_config (
  industry TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  professions JSON NOT NULL,
  required_licenses BOOLEAN DEFAULT true,
  specializations JSON,
  tools JSON,
  lead_types JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert industry configurations
INSERT INTO industry_config (industry, display_name, professions, required_licenses, specializations, tools, lead_types) VALUES
('real_estate', 'Real Estate',
 '["agent", "broker", "appraiser"]',
 true,
 '["luxury", "commercial", "first_time", "investment", "foreclosure"]',
 '["mortgage_calculator", "home_value_estimator", "school_finder", "market_analysis"]',
 '["buyer", "seller", "renter", "investor"]'
),
('legal', 'Legal Services',
 '["attorney", "paralegal", "mediator"]',
 true,
 '["personal_injury", "family", "criminal", "corporate", "estate", "immigration", "bankruptcy", "employment"]',
 '["case_evaluator", "settlement_calculator", "statute_limitations", "document_generator", "court_finder"]',
 '["plaintiff", "defendant", "business_client", "consultation"]'
),
('insurance', 'Insurance',
 '["agent", "broker", "adjuster"]',
 true,
 '["auto", "home", "life", "health", "commercial", "umbrella"]',
 '["quote_calculator", "coverage_analyzer", "claims_tracker", "risk_assessment", "bundle_optimizer"]',
 '["new_policy", "renewal", "claim", "quote_comparison"]'
),
('mortgage', 'Mortgage Services',
 '["loan_officer", "broker", "processor"]',
 true,
 '["purchase", "refinance", "fha", "va", "jumbo", "reverse", "commercial"]',
 '["rate_calculator", "affordability_checker", "refinance_analyzer", "closing_cost_estimator", "pre_approval_wizard"]',
 '["purchase", "refinance", "pre_approval", "rate_shopping"]'
),
('financial', 'Financial Advisory',
 '["advisor", "planner", "cpa", "tax_pro"]',
 true,
 '["retirement", "investment", "tax", "estate", "college", "business"]',
 '["retirement_calculator", "investment_analyzer", "tax_estimator", "portfolio_builder", "risk_assessment"]',
 '["individual", "business", "retirement", "investment"]'
),
('contractor', 'Home Services',
 '["plumber", "electrician", "hvac", "roofer", "general", "handyman"]',
 true,
 '["emergency", "commercial", "new_construction", "renovation", "green"]',
 '["estimate_calculator", "project_scheduler", "permit_checker", "warranty_tracker", "before_after_gallery"]',
 '["emergency", "repair", "installation", "maintenance"]'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_industry ON agents(industry, profession);
CREATE INDEX IF NOT EXISTS idx_agents_location ON agents(state, city);

-- Migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('003_multi_industry_platform_simple', CURRENT_TIMESTAMP);