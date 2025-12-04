-- Stripe payment tracking tables for ProGeoData

-- Track Stripe checkout sessions
CREATE TABLE IF NOT EXISTS stripe_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  pack TEXT NOT NULL, -- florida, texas, all_states
  status TEXT DEFAULT 'pending', -- pending, completed, expired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track completed purchases
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pack TEXT NOT NULL,
  download_token TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  downloads_remaining INTEGER DEFAULT 3, -- Limit downloads per purchase
  status TEXT DEFAULT 'active', -- active, expired, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (datetime('now', '+7 days')),
  FOREIGN KEY (session_id) REFERENCES stripe_sessions(session_id)
);

-- Track download history
CREATE TABLE IF NOT EXISTS download_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  download_token TEXT NOT NULL,
  pack TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (download_token) REFERENCES purchases(download_token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_status ON stripe_sessions(status);
CREATE INDEX IF NOT EXISTS idx_purchases_token ON purchases(download_token);
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_download_history_token ON download_history(download_token);