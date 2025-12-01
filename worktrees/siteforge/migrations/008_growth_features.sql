-- Migration 008: Growth Engineering Features
-- Adds referral system, viral loops, and SEO infrastructure

-- ============================================================================
-- REFERRAL SYSTEM TABLES
-- ============================================================================

-- Referral codes and tracking
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,

  -- Code metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  -- Performance tracking
  total_uses INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,

  -- Rewards tracking
  rewards_earned DECIMAL(10,2) DEFAULT 0,
  rewards_paid DECIMAL(10,2) DEFAULT 0,

  FOREIGN KEY (professional_id) REFERENCES professionals(id)
);

CREATE INDEX idx_referral_code ON referral_codes(code);
CREATE INDEX idx_referral_professional ON referral_codes(professional_id);
CREATE INDEX idx_referral_active ON referral_codes(is_active);

-- Referral attribution tracking
CREATE TABLE IF NOT EXISTS referral_attributions (
  id TEXT PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_id TEXT NOT NULL,

  -- Attribution data
  referred_user_id TEXT,
  referred_professional_id TEXT,
  attribution_type TEXT NOT NULL, -- 'click', 'signup', 'conversion'

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  landing_page TEXT,

  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2),
  conversion_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (referral_code) REFERENCES referral_codes(code),
  FOREIGN KEY (referrer_id) REFERENCES professionals(id)
);

CREATE INDEX idx_attribution_code ON referral_attributions(referral_code);
CREATE INDEX idx_attribution_referrer ON referral_attributions(referrer_id);
CREATE INDEX idx_attribution_referred_pro ON referral_attributions(referred_professional_id);
CREATE INDEX idx_attribution_type ON referral_attributions(attribution_type);
CREATE INDEX idx_attribution_converted ON referral_attributions(converted);

-- Referral rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  attribution_id TEXT NOT NULL,

  -- Reward details
  reward_type TEXT NOT NULL, -- 'credit', 'cash', 'discount', 'feature_unlock'
  reward_amount DECIMAL(10,2) NOT NULL,
  reward_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'cancelled'

  -- Payment tracking
  paid_at TIMESTAMP,
  payment_method TEXT,
  payment_reference TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (professional_id) REFERENCES professionals(id),
  FOREIGN KEY (referral_code) REFERENCES referral_codes(code),
  FOREIGN KEY (attribution_id) REFERENCES referral_attributions(id)
);

CREATE INDEX idx_reward_professional ON referral_rewards(professional_id);
CREATE INDEX idx_reward_status ON referral_rewards(reward_status);
CREATE INDEX idx_reward_code ON referral_rewards(referral_code);

-- Referral leaderboard (materialized view updated daily)
CREATE TABLE IF NOT EXISTS referral_leaderboard (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,

  -- Period
  period TEXT NOT NULL, -- 'all_time', 'yearly', 'monthly', 'weekly'
  period_start TIMESTAMP,
  period_end TIMESTAMP,

  -- Metrics
  rank INTEGER,
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  total_rewards_earned DECIMAL(10,2) DEFAULT 0,

  -- Recognition
  badge_tier TEXT, -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
  is_top_referrer BOOLEAN DEFAULT false,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (professional_id) REFERENCES professionals(id)
);

CREATE INDEX idx_leaderboard_period ON referral_leaderboard(period, period_start);
CREATE INDEX idx_leaderboard_rank ON referral_leaderboard(rank);
CREATE INDEX idx_leaderboard_top ON referral_leaderboard(is_top_referrer);

-- ============================================================================
-- VIRAL LOOPS TABLES
-- ============================================================================

-- Share tracking
CREATE TABLE IF NOT EXISTS share_events (
  id TEXT PRIMARY KEY,

  -- Who shared
  sharer_type TEXT NOT NULL, -- 'professional', 'user', 'anonymous'
  sharer_id TEXT,

  -- What was shared
  content_type TEXT NOT NULL, -- 'profile', 'pin', 'success_story', 'tool_result'
  content_id TEXT NOT NULL,

  -- How it was shared
  share_method TEXT NOT NULL, -- 'whatsapp', 'facebook', 'twitter', 'email', 'sms', 'copy_link'
  share_url TEXT NOT NULL,

  -- Context
  page_url TEXT,
  user_agent TEXT,

  -- Viral attribution
  viral_coefficient DECIMAL(5,3), -- K-factor contribution
  clicks_generated INTEGER DEFAULT 0,
  signups_generated INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_share_sharer ON share_events(sharer_type, sharer_id);
CREATE INDEX idx_share_content ON share_events(content_type, content_id);
CREATE INDEX idx_share_method ON share_events(share_method);
CREATE INDEX idx_share_viral ON share_events(viral_coefficient DESC);

-- Powered By branding clicks (for free tier viral loop)
CREATE TABLE IF NOT EXISTS powered_by_clicks (
  id TEXT PRIMARY KEY,

  -- Source
  source_professional_id TEXT NOT NULL,
  source_url TEXT NOT NULL,

  -- Click context
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,

  -- Conversion tracking
  viewed_pricing BOOLEAN DEFAULT false,
  signed_up BOOLEAN DEFAULT false,
  converted_professional_id TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (source_professional_id) REFERENCES professionals(id)
);

CREATE INDEX idx_powered_by_source ON powered_by_clicks(source_professional_id);
CREATE INDEX idx_powered_by_converted ON powered_by_clicks(signed_up);

-- Network invitations
CREATE TABLE IF NOT EXISTS network_invitations (
  id TEXT PRIMARY KEY,

  -- Inviter
  inviter_professional_id TEXT NOT NULL,
  inviter_name TEXT NOT NULL,

  -- Invitee
  invitee_email TEXT NOT NULL,
  invitee_phone TEXT,
  invitee_name TEXT,

  -- Invitation context
  invitation_type TEXT NOT NULL, -- 'colleague', 'referral_partner', 'team_member'
  personal_message TEXT,

  -- Status
  status TEXT DEFAULT 'sent', -- 'sent', 'opened', 'clicked', 'signed_up', 'expired'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  signed_up_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Result
  converted_professional_id TEXT,

  FOREIGN KEY (inviter_professional_id) REFERENCES professionals(id)
);

CREATE INDEX idx_invitation_inviter ON network_invitations(inviter_professional_id);
CREATE INDEX idx_invitation_email ON network_invitations(invitee_email);
CREATE INDEX idx_invitation_status ON network_invitations(status);

-- Success stories for amplification
CREATE TABLE IF NOT EXISTS success_stories (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,

  -- Story content
  title TEXT NOT NULL,
  story_text TEXT NOT NULL,
  story_type TEXT NOT NULL, -- 'lead_conversion', 'tool_success', 'profile_claim', 'revenue_milestone'

  -- Metrics
  metric_value DECIMAL(10,2),
  metric_label TEXT, -- "leads this month", "% increase in conversions", etc.

  -- Media
  image_url TEXT,
  video_url TEXT,

  -- Amplification
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Moderation
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by TEXT,
  approved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (professional_id) REFERENCES professionals(id)
);

CREATE INDEX idx_success_professional ON success_stories(professional_id);
CREATE INDEX idx_success_featured ON success_stories(is_featured);
CREATE INDEX idx_success_status ON success_stories(status);

-- ============================================================================
-- SEO ENGINE TABLES
-- ============================================================================

-- Programmatic SEO pages
CREATE TABLE IF NOT EXISTS seo_pages (
  id TEXT PRIMARY KEY,

  -- Page identification
  slug TEXT NOT NULL UNIQUE,
  page_type TEXT NOT NULL, -- 'industry_city', 'service_location', 'industry_state', 'blog_post'

  -- Template data
  industry TEXT,
  profession TEXT,
  city TEXT,
  state TEXT,
  service_category TEXT,

  -- SEO metadata
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  h1_headline TEXT NOT NULL,

  -- Content
  content_json JSON, -- Structured content for rendering

  -- Analytics
  indexed BOOLEAN DEFAULT false,
  indexed_at TIMESTAMP,
  google_position INTEGER,
  monthly_impressions INTEGER DEFAULT 0,
  monthly_clicks INTEGER DEFAULT 0,

  -- Performance
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seo_slug ON seo_pages(slug);
CREATE INDEX idx_seo_type ON seo_pages(page_type);
CREATE INDEX idx_seo_location ON seo_pages(state, city);
CREATE INDEX idx_seo_industry ON seo_pages(industry);
CREATE INDEX idx_seo_indexed ON seo_pages(indexed);

-- Blog content system
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,

  -- Post metadata
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,

  -- Content
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,

  -- Author
  author_professional_id TEXT,
  author_name TEXT NOT NULL,
  author_bio TEXT,

  -- Categorization
  category TEXT NOT NULL, -- 'industry_guide', 'professional_tips', 'platform_updates', 'success_stories'
  tags JSON DEFAULT '[]',
  related_industry TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,

  -- Publishing
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMP,

  -- Engagement
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  avg_time_on_page INTEGER, -- seconds

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (author_professional_id) REFERENCES professionals(id)
);

CREATE INDEX idx_blog_slug ON blog_posts(slug);
CREATE INDEX idx_blog_status ON blog_posts(status, published_at);
CREATE INDEX idx_blog_category ON blog_posts(category);
CREATE INDEX idx_blog_industry ON blog_posts(related_industry);

-- Backlink opportunities
CREATE TABLE IF NOT EXISTS backlink_opportunities (
  id TEXT PRIMARY KEY,

  -- Opportunity details
  target_url TEXT NOT NULL,
  target_domain TEXT NOT NULL,
  opportunity_type TEXT NOT NULL, -- 'directory', 'guest_post', 'resource_page', 'broken_link', 'competitor'

  -- Metrics
  domain_authority INTEGER,
  page_authority INTEGER,
  estimated_traffic INTEGER,

  -- Contact info
  contact_name TEXT,
  contact_email TEXT,
  contact_notes TEXT,

  -- Outreach status
  outreach_status TEXT DEFAULT 'identified', -- 'identified', 'contacted', 'negotiating', 'live', 'rejected'
  contacted_at TIMESTAMP,
  live_at TIMESTAMP,

  -- Link details (if live)
  live_url TEXT,
  anchor_text TEXT,
  is_dofollow BOOLEAN,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backlink_domain ON backlink_opportunities(target_domain);
CREATE INDEX idx_backlink_status ON backlink_opportunities(outreach_status);
CREATE INDEX idx_backlink_type ON backlink_opportunities(opportunity_type);
CREATE INDEX idx_backlink_authority ON backlink_opportunities(domain_authority DESC);

-- Keyword tracking
CREATE TABLE IF NOT EXISTS keyword_tracking (
  id TEXT PRIMARY KEY,

  -- Keyword
  keyword TEXT NOT NULL,
  keyword_type TEXT NOT NULL, -- 'primary', 'secondary', 'long_tail'

  -- Targeting
  target_url TEXT NOT NULL,
  target_page_id TEXT,

  -- Search volume
  monthly_search_volume INTEGER,
  competition TEXT, -- 'low', 'medium', 'high'
  keyword_difficulty INTEGER, -- 0-100

  -- Position tracking
  current_position INTEGER,
  best_position INTEGER,
  position_history JSON DEFAULT '[]', -- [{date, position}]

  -- Performance
  monthly_impressions INTEGER DEFAULT 0,
  monthly_clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),

  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keyword_text ON keyword_tracking(keyword);
CREATE INDEX idx_keyword_url ON keyword_tracking(target_url);
CREATE INDEX idx_keyword_position ON keyword_tracking(current_position);
CREATE INDEX idx_keyword_volume ON keyword_tracking(monthly_search_volume DESC);

-- ============================================================================
-- GROWTH METRICS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_metrics (
  id TEXT PRIMARY KEY,
  metric_date DATE NOT NULL,

  -- Referral metrics
  daily_referral_signups INTEGER DEFAULT 0,
  daily_referral_conversions INTEGER DEFAULT 0,
  daily_referral_rate DECIMAL(5,2),

  -- Viral metrics
  daily_shares INTEGER DEFAULT 0,
  daily_k_factor DECIMAL(5,3),
  daily_viral_signups INTEGER DEFAULT 0,

  -- SEO metrics
  total_indexed_pages INTEGER DEFAULT 0,
  daily_organic_visits INTEGER DEFAULT 0,
  daily_organic_signups INTEGER DEFAULT 0,

  -- Overall growth
  daily_total_signups INTEGER DEFAULT 0,
  daily_organic_percentage DECIMAL(5,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_growth_date ON growth_metrics(metric_date);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default reward tiers
INSERT INTO referral_codes (id, professional_id, code, is_active)
SELECT
  'seed-' || id,
  id,
  'REF' || SUBSTR(id, 1, 6),
  true
FROM professionals
WHERE id IN (SELECT id FROM professionals LIMIT 10); -- Seed first 10 professionals

-- Migration completion
INSERT INTO schema_migrations (version, applied_at)
VALUES ('008_growth_features', CURRENT_TIMESTAMP);
