# Agent Profile System V2 - Dynamic Geographic & Specialty Focus

## Executive Summary

Agent profiles will be dynamically generated based on geographic focus areas, specialties, and subscription tiers. Instead of generic agent pages, we create targeted experiences for buyers and sellers with actual tools they need, while varying content to avoid duplicate penalties.

## Database Schema Enhancement

### Enhanced Agent Table Structure
```sql
-- Core agent table with geographic and specialty focus
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  -- ... existing fields ...

  -- Geographic Focus (Multiple Allowed)
  primary_region TEXT,           -- 'Downtown Miami', 'Westside Austin'
  primary_city TEXT,             -- 'Miami', 'Austin'
  primary_county TEXT,           -- 'Miami-Dade', 'Travis'
  primary_state TEXT,            -- 'FL', 'TX'

  service_regions JSON,          -- ['Coral Gables', 'Coconut Grove', 'Key Biscayne']
  service_zipcodes JSON,         -- ['33146', '33133', '33149']
  service_radius_miles INTEGER,  -- 25

  -- Specialties & Focus (Multiple Allowed)
  primary_specialty TEXT,        -- 'luxury', 'first_time', 'investment', 'commercial'
  secondary_specialties JSON,    -- ['waterfront', 'condos', 'new_construction']

  property_types JSON,           -- ['single_family', 'condo', 'townhouse', 'multi_family']
  price_ranges JSON,             -- ['starter': [150000, 350000], 'luxury': [1000000, null]]

  client_focus TEXT,             -- 'buyers', 'sellers', 'both', 'investors'
  language_capabilities JSON,    -- ['English', 'Spanish', 'Portuguese']

  -- Experience Indicators
  years_experience INTEGER,
  transactions_ytd INTEGER,
  total_volume_sold DECIMAL(12,2),
  avg_days_to_close INTEGER,

  -- Tier & Features
  subscription_tier TEXT DEFAULT 'ghost',  -- 'ghost', 'basic', 'professional', 'premium', 'enterprise'
  tier_started_at TIMESTAMP,
  tier_expires_at TIMESTAMP,

  -- Content Customization
  bio_tone TEXT DEFAULT 'professional',    -- 'professional', 'friendly', 'luxury', 'approachable'
  content_style TEXT DEFAULT 'informative', -- 'informative', 'conversational', 'data_driven', 'storytelling'
  unique_value_props JSON,                  -- ['veteran_owned', 'former_builder', 'local_native']

  -- Feature Flags
  features JSON DEFAULT '{}',
  /* Example:
  {
    "buyer_tools": ["mortgage_calc", "affordability", "school_finder"],
    "seller_tools": ["home_valuation", "net_proceeds", "market_analysis"],
    "premium_content": ["market_reports", "exclusive_listings", "video_tours"],
    "ai_agents": ["isa", "dispatcher", "content_clerk"],
    "lead_routing": "instant",
    "custom_domain": "janedoe.estateflow.com"
  }
  */

  INDEX idx_geo (primary_state, primary_city, primary_region),
  INDEX idx_specialty (primary_specialty, client_focus),
  INDEX idx_tier (subscription_tier)
);

-- Geographic area definitions
CREATE TABLE geographic_areas (
  id TEXT PRIMARY KEY,
  area_name TEXT,          -- 'South Beach', 'Brickell', 'Coral Gables'
  city TEXT,
  county TEXT,
  state TEXT,

  -- Area characteristics for content generation
  median_price INTEGER,
  median_income INTEGER,
  population INTEGER,
  school_rating DECIMAL(3,1),

  area_description TEXT,   -- Used for generating content
  lifestyle_tags JSON,     -- ['beachfront', 'urban', 'family_friendly', 'nightlife']
  demographics JSON,        -- Age ranges, family status, etc.

  amenities JSON,          -- ['beaches', 'shopping', 'restaurants', 'parks']

  INDEX idx_location (state, city, area_name)
);

-- Agent tier features matrix
CREATE TABLE tier_features (
  tier TEXT PRIMARY KEY,

  -- Lead Management
  monthly_leads_included INTEGER,
  lead_response_time TEXT,        -- 'instant', '1_hour', '24_hours'
  lead_qualification BOOLEAN,
  lead_nurturing BOOLEAN,

  -- Content & Tools
  buyer_tools JSON,
  seller_tools JSON,
  investor_tools JSON,

  -- AI Agents
  ai_agents_included JSON,
  ai_responses_monthly INTEGER,

  -- Profile Features
  custom_domain BOOLEAN,
  video_profiles BOOLEAN,
  virtual_tours BOOLEAN,
  market_reports BOOLEAN,

  -- Marketing
  social_media_posts INTEGER,     -- Auto-generated per month
  email_campaigns INTEGER,
  print_materials BOOLEAN,

  -- Analytics
  analytics_level TEXT,            -- 'basic', 'advanced', 'enterprise'

  price_monthly DECIMAL(6,2)
);

-- Content variations to prevent duplication
CREATE TABLE content_templates (
  id TEXT PRIMARY KEY,
  content_type TEXT,              -- 'bio_intro', 'area_expert', 'buyer_guide', 'seller_guide'
  specialty TEXT,                 -- 'luxury', 'first_time', 'investment'
  tone TEXT,                      -- 'professional', 'friendly', 'luxury'

  template_text TEXT,
  variables JSON,                 -- Placeholders for dynamic content

  usage_count INTEGER DEFAULT 0,  -- Track to ensure variety
  last_used TIMESTAMP,

  INDEX idx_content_type (content_type, specialty, tone)
);
```

## Tier System & Feature Flags

### Subscription Tiers
```typescript
interface AgentTiers {
  ghost: {
    price: 0,
    features: {
      profile_page: true,
      basic_contact: true,
      leads_shown: '3 (blurred)',
      buyer_tools: ['mortgage_calculator'],
      seller_tools: ['basic_valuation'],
      ai_agents: [],
      content_updates: 'monthly'
    }
  },

  basic: {
    price: 49,
    features: {
      profile_page: true,
      enhanced_contact: true,
      leads_shown: 'unlimited',
      leads_included: 10,
      buyer_tools: ['mortgage_calculator', 'affordability_checker'],
      seller_tools: ['basic_valuation', 'net_proceeds'],
      ai_agents: ['content_clerk'],
      content_updates: 'weekly',
      analytics: 'basic'
    }
  },

  professional: {
    price: 149,
    features: {
      profile_page: true,
      priority_placement: true,
      leads_included: 30,
      instant_lead_notification: true,
      buyer_tools: ['all_calculators', 'school_finder', 'commute_time'],
      seller_tools: ['cma_tool', 'staging_tips', 'market_timing'],
      ai_agents: ['content_clerk', 'isa'],
      content_updates: 'daily',
      market_reports: true,
      analytics: 'advanced'
    }
  },

  premium: {
    price: 299,
    features: {
      custom_subdomain: true,
      priority_support: true,
      leads_included: 100,
      lead_scoring: true,
      buyer_tools: ['all_tools', 'exclusive_listings', 'vip_tours'],
      seller_tools: ['all_tools', 'video_marketing', 'social_campaigns'],
      ai_agents: ['all_agents'],
      content_updates: 'real_time',
      video_profiles: true,
      virtual_assistant: true,
      analytics: 'enterprise'
    }
  }
}
```

## Dynamic Content Generation System

### Content Variation Engine
```typescript
class ContentVariationEngine {
  // Generate unique bio based on agent profile
  generateBio(agent: Agent): string {
    const templates = this.getTemplatesByType('bio_intro', agent.bio_tone);
    const template = this.selectLeastUsedTemplate(templates);

    const variables = {
      name: agent.name,
      years: agent.years_experience,
      specialty: this.getSpecialtyPhrase(agent.primary_specialty),
      region: this.getRegionDescription(agent.primary_region),
      unique_prop: this.selectUniqueProposition(agent.unique_value_props),
      achievements: this.formatAchievements(agent),
      approach: this.getApproachByTone(agent.bio_tone)
    };

    return this.fillTemplate(template, variables);
  }

  // Generate area expertise content
  generateAreaExpertise(agent: Agent, area: GeographicArea): string {
    const templates = [
      "With ${years} years focusing on ${area}, ${name} has closed ${transactions} deals in this neighborhood alone.",
      "${name}'s deep knowledge of ${area} comes from ${unique_prop} and helping ${client_count} families find their perfect home here.",
      "Specializing in ${area} since ${start_year}, ${name} knows every pocket park, school zone, and hidden gem that makes this area special.",
      "As a ${area} specialist, ${name} tracks market trends daily and has seen property values ${appreciation}% over the past ${period}."
    ];

    // Rotate templates based on usage
    const template = this.rotateTemplate(templates, agent.id, area.id);

    return this.fillTemplate(template, {
      name: agent.name,
      area: area.area_name,
      years: agent.years_experience,
      transactions: this.getAreaTransactions(agent.id, area.id),
      unique_prop: agent.unique_value_props[0],
      client_count: this.estimateClientCount(agent),
      start_year: new Date().getFullYear() - agent.years_experience,
      appreciation: this.calculateAppreciation(area),
      period: '5 years'
    });
  }

  // Generate specialty-specific content
  generateSpecialtyContent(specialty: string, clientType: string): ContentModule {
    const contentMap = {
      luxury: {
        buyers: {
          title: "Exclusive Property Access",
          tools: ['private_listings', 'concierge_service', 'virtual_tours'],
          content: "Access off-market properties and white-glove service..."
        },
        sellers: {
          title: "Maximum Value Strategy",
          tools: ['staging_consultation', 'professional_photography', 'global_marketing'],
          content: "Sophisticated marketing to reach qualified buyers worldwide..."
        }
      },
      first_time: {
        buyers: {
          title: "First-Time Buyer Roadmap",
          tools: ['step_by_step_guide', 'down_payment_calculator', 'grant_finder'],
          content: "Navigate your first purchase with confidence..."
        },
        sellers: {
          title: "Stress-Free First Sale",
          tools: ['pricing_wizard', 'prep_checklist', 'timeline_planner'],
          content: "Selling your first home doesn't have to be overwhelming..."
        }
      },
      investment: {
        buyers: {
          title: "Investment Property Analysis",
          tools: ['roi_calculator', 'rental_comps', 'cap_rate_analyzer'],
          content: "Data-driven investment decisions backed by market analytics..."
        },
        sellers: {
          title: "Maximize Investment Returns",
          tools: ['1031_exchange_guide', 'tax_calculator', 'portfolio_analyzer'],
          content: "Strategic exit planning for maximum returns..."
        }
      }
    };

    return contentMap[specialty][clientType];
  }
}
```

## Buyer & Seller Journey Tools

### Buyer Tools Suite
```typescript
interface BuyerTools {
  // Basic (Free/Ghost)
  basic: {
    mortgage_calculator: {
      title: "Monthly Payment Calculator",
      inputs: ['price', 'down_payment', 'interest_rate', 'term'],
      outputs: ['monthly_payment', 'total_interest'],
      gated: false
    }
  },

  // Standard (Basic Tier)
  standard: {
    affordability_checker: {
      title: "How Much Home Can I Afford?",
      inputs: ['income', 'debts', 'down_payment', 'credit_score'],
      outputs: ['max_price', 'comfortable_range', 'payment_breakdown'],
      gated: true,
      leadCapture: 'email'
    },

    closing_cost_estimator: {
      title: "True Cost Calculator",
      inputs: ['purchase_price', 'location', 'loan_type'],
      outputs: ['total_closing', 'itemized_fees', 'cash_needed'],
      gated: true
    }
  },

  // Advanced (Professional Tier)
  advanced: {
    school_finder: {
      title: "School District Research",
      features: ['ratings', 'test_scores', 'demographics', 'boundaries'],
      mapIntegration: true,
      dataSource: 'GreatSchools API'
    },

    commute_analyzer: {
      title: "Commute Time Calculator",
      inputs: ['work_address', 'preferred_times'],
      outputs: ['drive_time', 'transit_options', 'traffic_patterns'],
      mapIntegration: true
    },

    neighborhood_scorer: {
      title: "Lifestyle Match Score",
      inputs: ['priorities', 'lifestyle_preferences'],
      outputs: ['matched_neighborhoods', 'scores', 'pros_cons'],
      aiPowered: true
    }
  },

  // Premium (Premium Tier)
  premium: {
    market_predictor: {
      title: "Market Timing Analyzer",
      features: ['price_trends', 'inventory_levels', 'rate_forecasts'],
      outputs: ['buy_now_score', 'wait_recommendation', 'risk_analysis']
    },

    vip_property_alerts: {
      title: "Off-Market Property Access",
      features: ['pre_mls_listings', 'pocket_listings', 'instant_alerts'],
      exclusive: true
    }
  }
}

interface SellerTools {
  // Basic (Free/Ghost)
  basic: {
    home_value_estimator: {
      title: "Instant Home Value",
      inputs: ['address', 'sqft', 'bedrooms', 'bathrooms'],
      outputs: ['estimated_value', 'value_range'],
      accuracy: '±15%',
      gated: true,
      leadCapture: 'phone'
    }
  },

  // Standard (Basic Tier)
  standard: {
    net_proceeds_calculator: {
      title: "What You'll Walk Away With",
      inputs: ['sale_price', 'mortgage_balance', 'closing_date'],
      outputs: ['net_proceeds', 'fee_breakdown', 'tax_implications'],
      gated: true
    },

    pricing_optimizer: {
      title: "Strategic Pricing Tool",
      features: ['comp_analysis', 'days_on_market', 'price_per_sqft'],
      outputs: ['recommended_price', 'quick_sale_price', 'patient_price']
    }
  },

  // Advanced (Professional Tier)
  advanced: {
    staging_visualizer: {
      title: "Virtual Staging Assistant",
      features: ['ai_staging', 'cost_estimates', 'roi_projections'],
      integration: 'Upload photos for instant staging'
    },

    market_timing_advisor: {
      title: "When to Sell Analyzer",
      inputs: ['property_details', 'flexibility'],
      outputs: ['best_month', 'seasonal_trends', 'urgency_score'],
      dataSource: 'Historical MLS data'
    },

    marketing_campaign_builder: {
      title: "Custom Marketing Plan",
      features: ['social_media_kit', 'listing_descriptions', 'email_templates'],
      aiGenerated: true
    }
  },

  // Premium (Premium Tier)
  premium: {
    professional_cma: {
      title: "Comparative Market Analysis",
      features: ['10_page_report', 'market_trends', 'pricing_strategy'],
      delivery: 'PDF + Interactive Dashboard'
    },

    video_tour_creator: {
      title: "Professional Video Marketing",
      features: ['drone_footage', 'voiceover', 'social_cuts'],
      production: 'Included with premium'
    }
  }
}
```

## Dynamic Page Generation System

### Agent Profile Page Structure
```typescript
class DynamicAgentPage {
  async generatePage(agent: Agent, viewerType: 'buyer' | 'seller' | 'general') {
    const page = {
      // Hero section varies by specialty and region
      hero: this.generateHero(agent, viewerType),

      // Tools section based on viewer type and agent tier
      tools: this.getToolsForViewer(agent, viewerType),

      // Content modules based on specialty
      content: this.generateContentModules(agent, viewerType),

      // Area expertise if geographic focus
      areaSection: agent.primary_region
        ? this.generateAreaSection(agent)
        : null,

      // Reviews filtered by transaction type
      reviews: this.getRelevantReviews(agent, viewerType),

      // CTAs based on tier and viewer
      ctas: this.generateCTAs(agent, viewerType)
    };

    return page;
  }

  generateHero(agent: Agent, viewerType: string) {
    const headlines = {
      buyer: {
        luxury: `Find Your Dream ${agent.primary_region} Estate`,
        first_time: `Your Trusted Guide to Buying in ${agent.primary_city}`,
        investment: `${agent.primary_region} Investment Properties That Perform`
      },
      seller: {
        luxury: `Maximize Your ${agent.primary_region} Property Value`,
        first_time: `Sell with Confidence in ${agent.primary_city}`,
        investment: `Exit Strategies for ${agent.primary_region} Investors`
      }
    };

    return {
      headline: headlines[viewerType][agent.primary_specialty],
      subheadline: this.generateSubheadline(agent, viewerType),
      stats: this.getRelevantStats(agent, viewerType),
      image: this.selectHeroImage(agent, viewerType)
    };
  }

  getToolsForViewer(agent: Agent, viewerType: string) {
    const tier = agent.subscription_tier;
    const tools = viewerType === 'buyer' ? BuyerTools : SellerTools;

    const availableTools = [];

    // Add tools based on tier
    if (tier === 'ghost') {
      availableTools.push(...Object.values(tools.basic));
    } else if (tier === 'basic') {
      availableTools.push(...Object.values(tools.basic));
      availableTools.push(...Object.values(tools.standard));
    } else if (tier === 'professional') {
      availableTools.push(...Object.values(tools.basic));
      availableTools.push(...Object.values(tools.standard));
      availableTools.push(...Object.values(tools.advanced));
    } else if (tier === 'premium') {
      availableTools.push(...Object.values(tools)); // All tools
    }

    return availableTools;
  }
}
```

## Agent Management Dashboard

### Admin Interface for Managing Agents
```typescript
// app/routes/admin.agents.$id.tsx
export default function AgentManagement() {
  return (
    <div className="agent-management">
      {/* Quick Assignment Panel */}
      <section className="quick-assign">
        <h3>Geographic Focus</h3>
        <RegionSelector
          multiSelect={true}
          options={['neighborhoods', 'cities', 'counties', 'zipcodes']}
        />

        <h3>Specialties</h3>
        <SpecialtyPicker
          primary={true}
          secondary={true}
          options={[
            'luxury', 'first_time', 'investment', 'commercial',
            'waterfront', 'condos', 'new_construction', 'foreclosures',
            'senior_living', 'relocation', 'military', 'international'
          ]}
        />

        <h3>Client Focus</h3>
        <RadioGroup
          options={['buyers', 'sellers', 'both', 'investors']}
        />

        <h3>Tier & Features</h3>
        <TierSelector
          current={agent.subscription_tier}
          onChange={updateTier}
        />

        <FeatureFlagEditor
          flags={agent.features}
          availableByTier={getTierFeatures(agent.subscription_tier)}
        />

        <h3>Content Style</h3>
        <ContentStyleEditor
          tone={['professional', 'friendly', 'luxury', 'approachable']}
          style={['informative', 'conversational', 'data_driven', 'storytelling']}
        />

        <h3>Unique Value Props</h3>
        <TagInput
          suggestions={[
            'veteran_owned', 'former_builder', 'local_native',
            'multi_lingual', 'investor_focused', 'green_certified',
            'senior_specialist', 'negotiation_expert', 'tech_savvy'
          ]}
        />
      </section>

      {/* Preview Panel */}
      <section className="preview">
        <h3>Live Preview</h3>
        <ViewerToggle options={['buyer', 'seller', 'general']} />
        <iframe src={`/agent/${agent.slug}?preview=true`} />
      </section>

      {/* Analytics Panel */}
      <section className="analytics">
        <h3>Performance</h3>
        <MetricCards
          metrics={{
            views: agent.profile_views,
            leads: agent.leads_generated,
            conversion: agent.lead_conversion_rate,
            tools_used: agent.tools_engagement
          }}
        />
      </section>
    </div>
  );
}
```

## Content Management System

### Automated Content Rotation
```typescript
class ContentRotationManager {
  // Ensure variety in generated content
  async rotateContent(agentId: string) {
    // Get agent's content history
    const history = await this.getContentHistory(agentId);

    // Identify stale content
    const staleContent = history.filter(c =>
      Date.now() - c.lastUpdated > 30 * 24 * 60 * 60 * 1000 // 30 days
    );

    // Generate fresh variations
    for (const content of staleContent) {
      const newVariation = await this.generateVariation(content.type, {
        avoidTemplates: history.map(h => h.templateId),
        agent: await this.getAgent(agentId),
        tone: this.selectNewTone(history)
      });

      await this.updateContent(agentId, content.id, newVariation);
    }
  }

  // A/B test different content variations
  async testVariations(agentId: string) {
    const variations = await this.createVariations(agentId, {
      hero: ['benefit_focused', 'achievement_focused', 'community_focused'],
      cta: ['urgency', 'value', 'trust'],
      tools: ['prominent', 'integrated', 'gated']
    });

    // Track performance
    await this.trackPerformance(variations);

    // Select winner after sufficient data
    const winner = await this.selectWinner(variations);
    await this.applyWinner(agentId, winner);
  }
}
```

## Rollout Strategy

### Phase 1: Foundation (Week 1)
- Implement enhanced database schema
- Create tier system with feature flags
- Build content variation engine

### Phase 2: Tools Development (Week 2)
- Develop buyer journey tools
- Create seller journey tools
- Implement gating and lead capture

### Phase 3: Page Generation (Week 3)
- Build dynamic page generator
- Create specialty-specific modules
- Implement content rotation system

### Phase 4: Management System (Week 4)
- Create agent management dashboard
- Build bulk assignment tools
- Implement analytics tracking

## Maintenance & Operations

### Daily Tasks
```typescript
const dailyMaintenance = {
  contentRotation: {
    schedule: '02:00 UTC',
    task: 'Rotate stale content for premium agents',
    priority: 'high'
  },

  leadDistribution: {
    schedule: 'Every 15 minutes',
    task: 'Route new leads based on specialty and region',
    priority: 'critical'
  },

  analyticsUpdate: {
    schedule: '03:00 UTC',
    task: 'Calculate conversion rates and tool usage',
    priority: 'medium'
  }
};

const weeklyMaintenance = {
  contentAudit: {
    schedule: 'Sunday 04:00 UTC',
    task: 'Check for duplicate content across profiles',
    action: 'Generate variation report'
  },

  performanceReview: {
    schedule: 'Monday 09:00 UTC',
    task: 'Identify top and bottom performing profiles',
    action: 'Optimization recommendations'
  }
};
```

## Success Metrics

```typescript
const successMetrics = {
  engagement: {
    profileViewDuration: '>3 minutes',
    toolUsageRate: '>40%',
    contentReadDepth: '>60%'
  },

  conversion: {
    ghostToClaimedRate: '>5%',
    freeToBasicRate: '>10%',
    basicToProfessionalRate: '>20%'
  },

  contentQuality: {
    uniqueContentRate: '>95%', // No duplicates
    contentFreshnessScore: '>80%', // Updated within 30 days
    relevanceScore: '>85%' // Matches viewer intent
  },

  revenue: {
    avgRevenuePerAgent: '$120',
    tierDistribution: {
      ghost: '60%',
      basic: '20%',
      professional: '15%',
      premium: '5%'
    }
  }
};
```

## Key Benefits

1. **No Duplicate Content**: Variation engine ensures unique content for each agent
2. **Targeted Experience**: Buyers and sellers see relevant tools and content
3. **Easy Management**: Bulk assignment and feature flag system
4. **Scalable Tiers**: Clear upgrade path from ghost to premium
5. **Geographic Precision**: Agents can focus on specific neighborhoods
6. **Specialty Alignment**: Content matches agent expertise
7. **Automated Maintenance**: Self-rotating content keeps profiles fresh