# Unified Platform Architecture: EstateFlow + PinExacto/TruePoint

## Platform Overview

### Regional Branding Strategy
```typescript
interface RegionalBranding {
  'PR': {
    domain: 'pinexacto.pr';
    shortDomain: 'pin.pr';
    language: 'es-PR';
    currency: 'USD';
    paymentMethod: 'ATH Móvil';
    productName: 'PinExacto';
  };
  'FL': {
    domain: 'truepoint.io';
    shortDomain: 'true.pt';
    language: 'en-US';
    currency: 'USD';
    paymentMethod: 'Stripe';
    productName: 'TruePoint';
  };
  'TX': {
    domain: 'truepoint.io';
    shortDomain: 'true.pt';
    language: 'en-US';
    currency: 'USD';
    paymentMethod: 'Stripe';
    productName: 'TruePoint';
  };
}
```

## Unified Database Schema

### Complete D1 Database Structure

```sql
-- ============================================
-- CORE TABLES
-- ============================================

-- Regions/Markets
CREATE TABLE regions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL, -- 'PR', 'FL', 'TX'
  name TEXT NOT NULL,
  language TEXT DEFAULT 'en-US',
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  product_name TEXT, -- 'PinExacto' or 'TruePoint'
  short_domain TEXT,
  features_enabled TEXT, -- JSON array of feature flags
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Agents, Homeowners, Service Pros)
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  region_id TEXT NOT NULL,
  user_type TEXT NOT NULL, -- 'agent', 'homeowner', 'service_pro'

  -- Profile
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  license_number TEXT, -- For agents
  brokerage TEXT, -- For agents

  -- Auth
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,

  -- Subscription
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'dispatcher', 'bundle'
  subscription_status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  ath_movil_id TEXT, -- PR only

  -- Analytics
  utm_source TEXT,
  utm_campaign TEXT,
  referrer_user_id TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,

  FOREIGN KEY (region_id) REFERENCES regions(id),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_region (region_id)
);

-- ============================================
-- PINEXACTO/TRUEPOINT SYSTEM
-- ============================================

-- Precision Location Pins (PinExacto in PR, TruePoint in US)
CREATE TABLE pins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  region_id TEXT NOT NULL,

  -- Location Data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(6, 2), -- For multi-story

  -- Pin Types for Different Use Cases
  pin_type TEXT NOT NULL, -- 'property', 'lockbox', 'entrance', 'parking', 'utility', 'service'
  category TEXT, -- 'residential', 'commercial', 'listing', 'showing'

  -- Property Association (for real estate)
  property_id TEXT,
  mls_number TEXT,

  -- Naming & Description
  label TEXT NOT NULL, -- "Main Entrance", "Lockbox Location"
  description TEXT,
  instructions TEXT, -- "Ring doorbell twice"

  -- Access Information (Encrypted)
  access_code TEXT, -- Gate code, lockbox combo
  access_schedule TEXT, -- "Mon-Fri 9-5"
  access_restrictions TEXT, -- "No trucks over 10ft"

  -- Media
  photo_url TEXT, -- R2 storage
  video_url TEXT,
  thumbnail_url TEXT,

  -- Sharing
  short_code TEXT UNIQUE, -- 6-char code
  share_url TEXT,
  qr_code_url TEXT,

  -- Temporal Control
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  one_time_token TEXT,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  navigation_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0, -- Non-users who signed up

  -- PostHog Tracking
  posthog_distinct_id TEXT,
  feature_flags TEXT, -- JSON of active flags

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  INDEX idx_short_code (short_code),
  INDEX idx_user (user_id),
  INDEX idx_property (property_id),
  INDEX idx_type (pin_type),
  INDEX idx_region_pins (region_id)
);

-- Properties (Real Estate Focus)
CREATE TABLE properties (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agent_id TEXT NOT NULL,
  region_id TEXT NOT NULL,

  -- Basic Info
  address TEXT NOT NULL,
  unit_number TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,

  -- MLS Data
  mls_number TEXT UNIQUE,
  listing_status TEXT, -- 'active', 'pending', 'sold', 'off_market'
  list_price DECIMAL(12, 2),

  -- Property Details
  property_type TEXT, -- 'single_family', 'condo', 'multi_family'
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  square_feet INTEGER,
  lot_size DECIMAL(10, 2),
  year_built INTEGER,

  -- Associated Pins
  main_pin_id TEXT,
  lockbox_pin_id TEXT,
  parking_pin_id TEXT,

  -- Media
  primary_photo_url TEXT,
  photos TEXT, -- JSON array
  virtual_tour_url TEXT,

  -- Analytics
  profile_views INTEGER DEFAULT 0,
  pin_scans INTEGER DEFAULT 0,
  inquiries INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  listed_at TIMESTAMP,
  sold_at TIMESTAMP,

  FOREIGN KEY (agent_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  FOREIGN KEY (main_pin_id) REFERENCES pins(id),
  INDEX idx_agent (agent_id),
  INDEX idx_mls (mls_number),
  INDEX idx_status (listing_status),
  INDEX idx_region_props (region_id)
);

-- Ghost Profiles (Pre-generated for acquisition)
CREATE TABLE ghost_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  region_id TEXT NOT NULL,

  -- Scraped Data
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,

  -- Type
  profile_type TEXT, -- 'agent', 'brokerage', 'service_business'
  license_number TEXT,

  -- Lead Trap
  leads_captured INTEGER DEFAULT 0,
  leads_data TEXT, -- JSON of captured leads

  -- Claim Status
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_by TEXT,
  claimed_at TIMESTAMP,
  claim_token TEXT UNIQUE,

  -- Source
  data_source TEXT, -- 'mls', 'google_maps', 'facebook'
  scraped_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (region_id) REFERENCES regions(id),
  FOREIGN KEY (claimed_by) REFERENCES users(id),
  INDEX idx_claim_token (claim_token),
  INDEX idx_unclaimed (is_claimed, region_id)
);

-- Short Links (URL Shortener)
CREATE TABLE shortlinks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  region_id TEXT NOT NULL,

  -- Link Data
  slug TEXT UNIQUE NOT NULL,
  destination TEXT NOT NULL,
  domain TEXT, -- 'pin.pr', 'true.pt', 'est.at'

  -- Type & Purpose
  link_type TEXT, -- 'pin', 'profile', 'property', 'qr'
  associated_id TEXT, -- ID of pin/property/etc

  -- Analytics
  click_count INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  INDEX idx_slug (slug),
  INDEX idx_user_links (user_id)
);

-- QR Codes (Dynamic routing)
CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  region_id TEXT NOT NULL,

  -- QR Data
  pattern TEXT NOT NULL, -- The actual QR image data
  shortlink_id TEXT NOT NULL,

  -- Purpose & Location
  purpose TEXT, -- 'yard_sign', 'business_card', 'flyer', 'lockbox'
  property_id TEXT,

  -- Physical Tracking
  printed_at TIMESTAMP,
  print_vendor TEXT,
  material_type TEXT, -- 'vinyl', 'paper', 'metal'

  -- Performance
  scan_count INTEGER DEFAULT 0,
  unique_scanners INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  FOREIGN KEY (shortlink_id) REFERENCES shortlinks(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  INDEX idx_user_qr (user_id),
  INDEX idx_property_qr (property_id)
);

-- ============================================
-- ANALYTICS & TRACKING
-- ============================================

-- Click Events (for shortlinks and QR codes)
CREATE TABLE click_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shortlink_id TEXT,
  pin_id TEXT,
  qr_code_id TEXT,

  -- Visitor Data
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,
  os TEXT,

  -- Location
  country TEXT,
  region TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Referrer
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Conversion
  resulted_in_signup BOOLEAN DEFAULT FALSE,
  signup_user_id TEXT,

  -- PostHog
  posthog_event_id TEXT,

  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (shortlink_id) REFERENCES shortlinks(id),
  FOREIGN KEY (pin_id) REFERENCES pins(id),
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
  INDEX idx_shortlink_clicks (shortlink_id, clicked_at),
  INDEX idx_pin_clicks (pin_id, clicked_at)
);

-- AI Agent Activity
CREATE TABLE ai_agent_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  agent_type TEXT NOT NULL, -- 'reputation', 'isa', 'dispatcher', 'content'

  -- Activity
  action TEXT NOT NULL,
  target_type TEXT, -- 'lead', 'client', 'showing'
  target_id TEXT,

  -- Message Data
  message_sent TEXT,
  channel TEXT, -- 'sms', 'email', 'whatsapp'

  -- Response
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  response_sentiment TEXT, -- 'positive', 'negative', 'neutral'

  -- Outcome
  resulted_in_conversion BOOLEAN DEFAULT FALSE,
  conversion_type TEXT, -- 'review', 'appointment', 'lead'
  conversion_value DECIMAL(10, 2),

  -- Error Tracking (Sentry)
  error_occurred BOOLEAN DEFAULT FALSE,
  sentry_event_id TEXT,
  error_message TEXT,

  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_activity (user_id, executed_at),
  INDEX idx_agent_type (agent_type)
);

-- Feature Flags (PostHog integration)
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,
  flag_key TEXT UNIQUE NOT NULL,

  -- Targeting
  regions TEXT, -- JSON array of region codes
  user_types TEXT, -- JSON array of user types
  percentage_rollout INTEGER DEFAULT 0,

  -- Configuration
  is_enabled BOOLEAN DEFAULT FALSE,
  variant_config TEXT, -- JSON configuration

  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Errors (Sentry integration)
CREATE TABLE error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sentry_event_id TEXT UNIQUE,

  -- Error Data
  error_type TEXT,
  error_message TEXT,
  stack_trace TEXT,

  -- Context
  user_id TEXT,
  region_id TEXT,
  url TEXT,
  user_agent TEXT,

  -- Frequency
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Status
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  INDEX idx_unresolved (is_resolved, last_seen_at)
);
```

## PostHog Integration

```typescript
// lib/posthog.ts
import { PostHog } from 'posthog-node';

const posthog = new PostHog(
  process.env.POSTHOG_KEY!,
  { host: 'https://app.posthog.com' }
);

export class Analytics {
  // Track pin creation
  static async trackPinCreated(userId: string, pinData: any, region: string) {
    posthog.capture({
      distinctId: userId,
      event: 'pin_created',
      properties: {
        pin_type: pinData.type,
        region: region,
        has_photo: !!pinData.photoUrl,
        has_access_code: !!pinData.accessCode,
        $feature_flag_response: await posthog.isFeatureEnabled('new_pin_ui', userId)
      }
    });
  }

  // Track viral share
  static async trackPinShared(pinId: string, sharedBy: string, sharedTo: 'user' | 'non_user') {
    posthog.capture({
      distinctId: sharedBy,
      event: 'pin_shared',
      properties: {
        pin_id: pinId,
        recipient_type: sharedTo,
        sharing_method: 'link', // or 'qr', 'whatsapp'
        potential_viral: sharedTo === 'non_user'
      }
    });
  }

  // Track conversion
  static async trackViralConversion(newUserId: string, referringPinId: string) {
    posthog.capture({
      distinctId: newUserId,
      event: 'viral_signup',
      properties: {
        source: 'pin_share',
        referring_pin: referringPinId,
        signup_method: 'organic'
      }
    });

    // Track cohort
    posthog.groupIdentify({
      groupType: 'acquisition_cohort',
      groupKey: 'viral_pin_users',
      properties: { total_users: '+1' }
    });
  }

  // Feature flags
  static async getFeatureFlags(userId: string, region: string) {
    return {
      new_pin_ui: await posthog.isFeatureEnabled('new_pin_ui', userId),
      ai_dispatcher: await posthog.isFeatureEnabled('ai_dispatcher', userId),
      bulk_qr: await posthog.isFeatureEnabled('bulk_qr_generation', userId),
      vision_ai: await posthog.isFeatureEnabled('vision_ai_analysis', userId),
      regional_features: await posthog.getFeatureFlag('regional_features', userId, {
        personProperties: { region }
      })
    };
  }
}
```

## Sentry Error Tracking

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT, // 'production', 'staging', 'development'
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  }
});

export class ErrorTracking {
  static captureException(error: Error, context?: any) {
    Sentry.captureException(error, {
      tags: {
        region: context?.region,
        user_type: context?.userType,
        feature: context?.feature
      },
      extra: context
    });
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error') {
    Sentry.captureMessage(message, level);
  }

  static setUserContext(user: any) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      region: user.region,
      subscription: user.subscriptionTier
    });
  }

  static addBreadcrumb(message: string, data?: any) {
    Sentry.addBreadcrumb({
      message,
      level: 'info',
      data
    });
  }

  // Wrap async functions with error tracking
  static async withErrorTracking<T>(
    fn: () => Promise<T>,
    context?: any
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.captureException(error as Error, context);
      throw error;
    }
  }
}
```

## Regional Configuration

```typescript
// config/regions.ts
export const REGIONS = {
  PR: {
    id: 'pr',
    name: 'Puerto Rico',
    productName: 'PinExacto',
    domain: 'pinexacto.pr',
    shortDomain: 'pin.pr',
    language: 'es-PR',
    currency: 'USD',
    paymentMethods: ['ath_movil', 'stripe'],

    features: {
      gatePhotos: true,
      athMovil: true,
      spanishFirst: true,
      urbanizationSupport: true
    },

    messaging: {
      hero: "Nunca más te pierdas",
      subhero: "Pin exacto para cada entrada",
      cta: "Crear Mi Pin Gratis"
    },

    targetMarkets: ['residential', 'real_estate', 'services'],

    pricing: {
      pro: 39,
      dispatcher: 49,
      bundle: 129
    }
  },

  FL: {
    id: 'fl',
    name: 'Florida',
    productName: 'TruePoint',
    domain: 'truepoint.io',
    shortDomain: 'true.pt',
    language: 'en-US',
    currency: 'USD',
    paymentMethods: ['stripe', 'paypal'],

    features: {
      hurricaneMode: true, // Offline capability
      beachAccess: true,   // Special beach/water pins
      gatedCommunities: true,
      snowbirdSupport: true // Seasonal residents
    },

    messaging: {
      hero: "Navigate to the exact spot",
      subhero: "Precision pins for properties",
      cta: "Create Your Pin"
    },

    targetMarkets: ['real_estate', 'vacation_rental', 'marine'],

    pricing: {
      pro: 49,
      dispatcher: 59,
      bundle: 149
    }
  },

  TX: {
    id: 'tx',
    name: 'Texas',
    productName: 'TruePoint',
    domain: 'truepoint.io',
    shortDomain: 'true.pt',
    language: 'en-US',
    currency: 'USD',
    paymentMethods: ['stripe', 'paypal'],

    features: {
      ranchMode: true,     // Large property support
      oilFieldAccess: true, // Industrial locations
      borderBilingual: true, // Spanish/English
      tornadoShelters: true  // Emergency locations
    },

    messaging: {
      hero: "Big state, exact locations",
      subhero: "Never miss the right entrance",
      cta: "Start Pinning"
    },

    targetMarkets: ['real_estate', 'ranch', 'commercial', 'industrial'],

    pricing: {
      pro: 49,
      dispatcher: 59,
      bundle: 149
    }
  }
};
```

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
**Focus**: Puerto Rico Real Estate Agents

- [ ] Deploy unified database schema
- [ ] Set up PostHog tracking
- [ ] Configure Sentry error monitoring
- [ ] Launch PinExacto for PR agents
- [ ] Create ghost profiles for top 100 PR agents

### Phase 2: Florida Expansion (Week 3-4)
**Focus**: Florida Real Estate Agents

- [ ] Configure TruePoint branding
- [ ] Set up FL-specific features (hurricane mode)
- [ ] Import Florida MLS data
- [ ] Launch marketing campaign in Miami/Orlando

### Phase 3: Texas Launch (Month 2)
**Focus**: Texas Real Estate + Ranch Properties

- [ ] Add ranch mode features
- [ ] Configure bilingual support
- [ ] Partner with Texas REALTORS®
- [ ] Focus on Austin/Houston/Dallas

### Phase 4: Feature Expansion (Month 3)
**Focus**: AI Agents and Advanced Features

- [ ] Launch The Dispatcher AI
- [ ] Implement vision AI for photos
- [ ] Add route optimization
- [ ] Build analytics dashboard

## Success Metrics by Region

```typescript
interface RegionalMetrics {
  PR: {
    targetAgents: 1000,
    conversionRate: 15, // Higher due to solving real pain
    avgRevenue: 89,     // Lower pricing but higher adoption
    viralCoefficient: 0.7
  },

  FL: {
    targetAgents: 2500,
    conversionRate: 10,
    avgRevenue: 99,
    viralCoefficient: 0.5
  },

  TX: {
    targetAgents: 3000,
    conversionRate: 8,
    avgRevenue: 99,
    viralCoefficient: 0.4
  }
}
```

## Conclusion

This unified architecture provides:

1. **Single codebase** with regional branding
2. **Real estate focus** to start, expandable to other verticals
3. **Complete tracking** via PostHog and Sentry
4. **Multi-region support** for PR, FL, TX
5. **Scalable database** that handles all features

The key insight: **PinExacto/TruePoint is the SAME product**, solving the "exact location" problem for real estate agents first, then expanding to other services. By focusing on agents initially, we get higher-value customers who have the budget and need for premium features.