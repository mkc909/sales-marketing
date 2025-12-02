-- Migration 009: User Authentication System for ProGeoData Phase 3
-- Adds user accounts, authentication, credits system, and subscription management

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Null for OAuth-only users
  email_verified BOOLEAN DEFAULT false,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP,

  -- Profile information
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,

  -- Authentication providers
  google_id TEXT UNIQUE,
  oauth_provider TEXT, -- 'google', 'email', null

  -- Subscription and billing
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'starter', 'growth', 'scale'
  subscription_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'incomplete'
  subscription_id TEXT,
  subscription_expires TIMESTAMP,

  -- Credits and usage
  credits_remaining INTEGER DEFAULT 10, -- Free tier gets 10 searches
  credits_used_today INTEGER DEFAULT 0,
  credits_used_this_month INTEGER DEFAULT 0,
  last_credit_reset DATE,

  -- User preferences
  timezone TEXT DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0
);

-- Credits usage tracking
CREATE TABLE IF NOT EXISTS credits_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  usage_type TEXT NOT NULL, -- 'search', 'bulk_export', 'api_call'
  credits_consumed INTEGER NOT NULL,
  metadata JSON, -- Store search parameters, export details, etc.

  -- Rate limiting context
  ip_address TEXT,
  user_agent TEXT,
  date DATE NOT NULL,
  hour INTEGER, -- For hourly rate limiting

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Search history for users
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Search parameters
  state TEXT NOT NULL,
  profession TEXT NOT NULL,
  zip_code TEXT,
  search_query TEXT, -- Raw search query
  
  -- Results
  results_count INTEGER DEFAULT 0,
  search_duration_ms INTEGER, -- Performance tracking
  
  -- Export tracking
  exported BOOLEAN DEFAULT false,
  export_format TEXT, -- 'csv', 'json', 'xlsx'
  export_job_id TEXT, -- Link to bulk export job

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subscription plans configuration
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY, -- 'free', 'starter', 'growth', 'scale'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,

  -- Credits allocation
  daily_credits INTEGER DEFAULT 0,
  monthly_credits INTEGER DEFAULT 0,
  bulk_export_allowed BOOLEAN DEFAULT false,
  max_export_records INTEGER DEFAULT 0,

  -- Features
  features JSON DEFAULT '{}', -- Feature flags per plan
  api_access BOOLEAN DEFAULT false,
  api_rate_limit_hourly INTEGER DEFAULT 0,

  -- Display order
  sort_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  
  -- Session metadata
  ip_address TEXT,
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  payment_method TEXT,
  
  -- Subscription context
  subscription_tier TEXT,
  billing_period TEXT, -- 'month', 'year'
  coupon_code TEXT,
  discount_amount DECIMAL(10,2),

  -- Metadata
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API keys for paid users
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed version for security
  
  -- Permissions and limits
  permissions JSON DEFAULT '{}',
  rate_limit_hourly INTEGER DEFAULT 1000,
  allowed_origins JSON DEFAULT '["*"]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default subscription plans
INSERT OR REPLACE INTO subscription_plans (
  id, name, description, price_monthly, price_yearly,
  daily_credits, monthly_credits, bulk_export_allowed, max_export_records,
  features, api_access, api_rate_limit_hourly, sort_order, is_popular
) VALUES
(
  'free',
  'Free',
  'Perfect for trying out ProGeoData',
  0, 0,
  10, 0, false, 0,
  '{"basic_search": true, "export": false, "api_access": false, "support": "community"}',
  false, 0, 1, false
),
(
  'starter',
  'Starter',
  'Great for occasional professional searches',
  29, 290,
  0, 500, true, 1000,
  '{"basic_search": true, "export": true, "api_access": false, "support": "email", "advanced_filters": true}',
  false, 0, 2, false
),
(
  'growth',
  'Growth',
  'Ideal for growing businesses and teams',
  99, 990,
  0, 2500, true, 10000,
  '{"basic_search": true, "export": true, "api_access": true, "support": "priority", "advanced_filters": true, "webhooks": true}',
  true, 5000, 3, true
),
(
  'scale',
  'Scale',
  'For enterprises with high-volume needs',
  299, 2990,
  0, 10000, true, 50000,
  '{"basic_search": true, "export": true, "api_access": true, "support": "dedicated", "advanced_filters": true, "webhooks": true, "custom_integrations": true}',
  true, 20000, 4, false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier, subscription_status);

CREATE INDEX IF NOT EXISTS idx_credits_usage_user_date ON credits_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_credits_usage_hour ON credits_usage(date, hour);
CREATE INDEX IF NOT EXISTS idx_credits_usage_type ON credits_usage(usage_type);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_params ON search_history(state, profession, created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON user_sessions(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe ON payment_transactions(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active, expires_at);

-- Migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('009_user_auth_system', CURRENT_TIMESTAMP);