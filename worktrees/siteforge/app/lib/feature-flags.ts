/**
 * Feature Flag System for Agent Profiles
 * Controls feature availability based on tier, region, and other factors
 */

import type { AppLoadContext } from '@remix-run/cloudflare';

export interface AgentFeatures {
  // Profile Features
  profile: {
    customDomain: boolean;
    videoProfile: boolean;
    virtualTours: boolean;
    marketReports: boolean;
    customBranding: boolean;
    multiLanguage: boolean;
    teamProfiles: boolean;
  };

  // Lead Management
  leads: {
    instantNotification: boolean;
    leadScoring: boolean;
    autoResponse: boolean;
    leadRouting: boolean;
    maxLeadsPerMonth: number;
    leadQualification: boolean;
    crmIntegration: boolean;
  };

  // Tools Access
  tools: {
    buyerTools: string[];
    sellerTools: string[];
    investorTools: string[];
    customTools: boolean;
    apiAccess: boolean;
  };

  // AI Agents
  ai: {
    contentClerk: boolean;
    reputationManager: boolean;
    isaAgent: boolean;
    dispatcher: boolean;
    customAgents: boolean;
    monthlyResponses: number;
  };

  // Marketing
  marketing: {
    socialMediaPosts: number; // per month
    emailCampaigns: number; // per month
    printMaterials: boolean;
    videoMarketing: boolean;
    paidAds: boolean;
    seoOptimization: boolean;
  };

  // Analytics
  analytics: {
    level: 'basic' | 'advanced' | 'enterprise';
    realtimeData: boolean;
    competitorAnalysis: boolean;
    marketTrends: boolean;
    customReports: boolean;
    apiExport: boolean;
  };

  // Regional Features
  regional: {
    athMovil: boolean; // Puerto Rico
    spanishFirst: boolean; // Puerto Rico
    gatePhotos: boolean; // Puerto Rico
    hurricaneAlerts: boolean; // FL & PR
    borderStats: boolean; // Texas
    oilRights: boolean; // Texas
  };

  // Content
  content: {
    autoRotation: boolean;
    abTesting: boolean;
    customTemplates: boolean;
    seoWriting: boolean;
    multiVariant: boolean;
  };
}

export class FeatureFlagService {
  constructor(private context: AppLoadContext) {}

  /**
   * Get features for an agent based on their tier and region
   */
  async getAgentFeatures(agentId: string): Promise<AgentFeatures> {
    // Get agent data from D1
    const agent = await this.context.env.DB.prepare(`
      SELECT
        subscription_tier,
        primary_state,
        primary_region,
        features,
        tier_started_at
      FROM agents
      WHERE id = ?
    `).bind(agentId).first();

    if (!agent) {
      return this.getDefaultFeatures();
    }

    // Get tier configuration
    const tierFeatures = await this.getTierFeatures(agent.subscription_tier);

    // Apply regional overrides
    const regionalFeatures = this.getRegionalFeatures(agent.primary_state);

    // Apply custom overrides from agent.features JSON
    const customFeatures = agent.features ? JSON.parse(agent.features) : {};

    // Merge all feature sources
    return this.mergeFeatures(tierFeatures, regionalFeatures, customFeatures);
  }

  /**
   * Get tier-based features
   */
  private async getTierFeatures(tier: string): Promise<AgentFeatures> {
    const tierConfig = await this.context.env.DB.prepare(`
      SELECT * FROM tier_features WHERE tier = ?
    `).bind(tier).first();

    // Default feature sets by tier
    const tierFeatures: Record<string, AgentFeatures> = {
      ghost: {
        profile: {
          customDomain: false,
          videoProfile: false,
          virtualTours: false,
          marketReports: false,
          customBranding: false,
          multiLanguage: false,
          teamProfiles: false
        },
        leads: {
          instantNotification: false,
          leadScoring: false,
          autoResponse: false,
          leadRouting: false,
          maxLeadsPerMonth: 0,
          leadQualification: false,
          crmIntegration: false
        },
        tools: {
          buyerTools: ['mortgage_calculator'],
          sellerTools: ['home_value_estimator'],
          investorTools: [],
          customTools: false,
          apiAccess: false
        },
        ai: {
          contentClerk: false,
          reputationManager: false,
          isaAgent: false,
          dispatcher: false,
          customAgents: false,
          monthlyResponses: 0
        },
        marketing: {
          socialMediaPosts: 0,
          emailCampaigns: 0,
          printMaterials: false,
          videoMarketing: false,
          paidAds: false,
          seoOptimization: false
        },
        analytics: {
          level: 'basic',
          realtimeData: false,
          competitorAnalysis: false,
          marketTrends: false,
          customReports: false,
          apiExport: false
        },
        regional: {
          athMovil: false,
          spanishFirst: false,
          gatePhotos: false,
          hurricaneAlerts: false,
          borderStats: false,
          oilRights: false
        },
        content: {
          autoRotation: false,
          abTesting: false,
          customTemplates: false,
          seoWriting: false,
          multiVariant: false
        }
      },

      basic: {
        profile: {
          customDomain: false,
          videoProfile: false,
          virtualTours: false,
          marketReports: true,
          customBranding: false,
          multiLanguage: false,
          teamProfiles: false
        },
        leads: {
          instantNotification: false,
          leadScoring: false,
          autoResponse: true,
          leadRouting: false,
          maxLeadsPerMonth: 10,
          leadQualification: false,
          crmIntegration: false
        },
        tools: {
          buyerTools: ['mortgage_calculator', 'affordability_checker', 'closing_cost_estimator'],
          sellerTools: ['home_value_estimator', 'net_proceeds_calculator', 'pricing_optimizer'],
          investorTools: ['roi_calculator'],
          customTools: false,
          apiAccess: false
        },
        ai: {
          contentClerk: true,
          reputationManager: false,
          isaAgent: false,
          dispatcher: false,
          customAgents: false,
          monthlyResponses: 100
        },
        marketing: {
          socialMediaPosts: 5,
          emailCampaigns: 2,
          printMaterials: false,
          videoMarketing: false,
          paidAds: false,
          seoOptimization: true
        },
        analytics: {
          level: 'basic',
          realtimeData: false,
          competitorAnalysis: false,
          marketTrends: true,
          customReports: false,
          apiExport: false
        },
        regional: {
          athMovil: false,
          spanishFirst: false,
          gatePhotos: false,
          hurricaneAlerts: false,
          borderStats: false,
          oilRights: false
        },
        content: {
          autoRotation: true,
          abTesting: false,
          customTemplates: false,
          seoWriting: true,
          multiVariant: false
        }
      },

      professional: {
        profile: {
          customDomain: true,
          videoProfile: true,
          virtualTours: true,
          marketReports: true,
          customBranding: true,
          multiLanguage: true,
          teamProfiles: false
        },
        leads: {
          instantNotification: true,
          leadScoring: true,
          autoResponse: true,
          leadRouting: true,
          maxLeadsPerMonth: 30,
          leadQualification: true,
          crmIntegration: true
        },
        tools: {
          buyerTools: [
            'mortgage_calculator', 'affordability_checker', 'closing_cost_estimator',
            'school_finder', 'commute_analyzer', 'neighborhood_scorer'
          ],
          sellerTools: [
            'home_value_estimator', 'net_proceeds_calculator', 'pricing_optimizer',
            'staging_visualizer', 'market_timing_advisor', 'marketing_campaign_builder'
          ],
          investorTools: ['roi_calculator', 'rental_analyzer', 'flip_calculator'],
          customTools: false,
          apiAccess: true
        },
        ai: {
          contentClerk: true,
          reputationManager: true,
          isaAgent: true,
          dispatcher: false,
          customAgents: false,
          monthlyResponses: 500
        },
        marketing: {
          socialMediaPosts: 20,
          emailCampaigns: 10,
          printMaterials: true,
          videoMarketing: true,
          paidAds: false,
          seoOptimization: true
        },
        analytics: {
          level: 'advanced',
          realtimeData: true,
          competitorAnalysis: true,
          marketTrends: true,
          customReports: true,
          apiExport: false
        },
        regional: {
          athMovil: false,
          spanishFirst: false,
          gatePhotos: false,
          hurricaneAlerts: false,
          borderStats: false,
          oilRights: false
        },
        content: {
          autoRotation: true,
          abTesting: true,
          customTemplates: true,
          seoWriting: true,
          multiVariant: true
        }
      },

      premium: {
        profile: {
          customDomain: true,
          videoProfile: true,
          virtualTours: true,
          marketReports: true,
          customBranding: true,
          multiLanguage: true,
          teamProfiles: true
        },
        leads: {
          instantNotification: true,
          leadScoring: true,
          autoResponse: true,
          leadRouting: true,
          maxLeadsPerMonth: 100,
          leadQualification: true,
          crmIntegration: true
        },
        tools: {
          buyerTools: ['all_tools'],
          sellerTools: ['all_tools'],
          investorTools: ['all_tools'],
          customTools: true,
          apiAccess: true
        },
        ai: {
          contentClerk: true,
          reputationManager: true,
          isaAgent: true,
          dispatcher: true,
          customAgents: false,
          monthlyResponses: 2000
        },
        marketing: {
          socialMediaPosts: 50,
          emailCampaigns: -1, // unlimited
          printMaterials: true,
          videoMarketing: true,
          paidAds: true,
          seoOptimization: true
        },
        analytics: {
          level: 'enterprise',
          realtimeData: true,
          competitorAnalysis: true,
          marketTrends: true,
          customReports: true,
          apiExport: true
        },
        regional: {
          athMovil: false,
          spanishFirst: false,
          gatePhotos: false,
          hurricaneAlerts: false,
          borderStats: false,
          oilRights: false
        },
        content: {
          autoRotation: true,
          abTesting: true,
          customTemplates: true,
          seoWriting: true,
          multiVariant: true
        }
      }
    };

    return tierFeatures[tier] || this.getDefaultFeatures();
  }

  /**
   * Get regional-specific features
   */
  private getRegionalFeatures(state: string): Partial<AgentFeatures> {
    const regionalOverrides: Record<string, Partial<AgentFeatures>> = {
      PR: {
        regional: {
          athMovil: true,
          spanishFirst: true,
          gatePhotos: true,
          hurricaneAlerts: true,
          borderStats: false,
          oilRights: false
        }
      },
      FL: {
        regional: {
          athMovil: false,
          spanishFirst: false,
          gatePhotos: false,
          hurricaneAlerts: true,
          borderStats: false,
          oilRights: false
        }
      },
      TX: {
        regional: {
          athMovil: false,
          spanishFirst: false,
          gatePhotos: false,
          hurricaneAlerts: false,
          borderStats: true,
          oilRights: true
        }
      }
    };

    return regionalOverrides[state] || {};
  }

  /**
   * Check if a specific feature is enabled
   */
  async isFeatureEnabled(
    agentId: string,
    featurePath: string
  ): Promise<boolean> {
    const features = await this.getAgentFeatures(agentId);

    // Parse the feature path (e.g., "ai.dispatcher")
    const parts = featurePath.split('.');
    let current: any = features;

    for (const part of parts) {
      if (current[part] === undefined) return false;
      current = current[part];
    }

    return Boolean(current);
  }

  /**
   * Check if agent can use a specific tool
   */
  async canUseTool(
    agentId: string,
    toolName: string,
    toolType: 'buyer' | 'seller' | 'investor'
  ): Promise<boolean> {
    const features = await this.getAgentFeatures(agentId);
    const toolsKey = `${toolType}Tools` as keyof typeof features.tools;
    const tools = features.tools[toolsKey] as string[];

    return tools.includes('all_tools') || tools.includes(toolName);
  }

  /**
   * Get usage limits for an agent
   */
  async getUsageLimits(agentId: string): Promise<{
    leads: number;
    aiResponses: number;
    socialPosts: number;
    emailCampaigns: number;
  }> {
    const features = await this.getAgentFeatures(agentId);

    return {
      leads: features.leads.maxLeadsPerMonth,
      aiResponses: features.ai.monthlyResponses,
      socialPosts: features.marketing.socialMediaPosts,
      emailCampaigns: features.marketing.emailCampaigns
    };
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(
    agentId: string,
    feature: string,
    metadata?: any
  ): Promise<void> {
    await this.context.env.DB.prepare(`
      INSERT INTO feature_usage (
        agent_id, feature, timestamp, metadata
      ) VALUES (?, ?, ?, ?)
    `).bind(
      agentId,
      feature,
      Date.now(),
      JSON.stringify(metadata || {})
    ).run();
  }

  /**
   * Merge feature configurations
   */
  private mergeFeatures(
    tier: AgentFeatures,
    regional: Partial<AgentFeatures>,
    custom: Partial<AgentFeatures>
  ): AgentFeatures {
    // Deep merge with priority: custom > regional > tier
    return {
      profile: { ...tier.profile, ...(regional.profile || {}), ...(custom.profile || {}) },
      leads: { ...tier.leads, ...(regional.leads || {}), ...(custom.leads || {}) },
      tools: { ...tier.tools, ...(regional.tools || {}), ...(custom.tools || {}) },
      ai: { ...tier.ai, ...(regional.ai || {}), ...(custom.ai || {}) },
      marketing: { ...tier.marketing, ...(regional.marketing || {}), ...(custom.marketing || {}) },
      analytics: { ...tier.analytics, ...(regional.analytics || {}), ...(custom.analytics || {}) },
      regional: { ...tier.regional, ...(regional.regional || {}), ...(custom.regional || {}) },
      content: { ...tier.content, ...(regional.content || {}), ...(custom.content || {}) }
    };
  }

  /**
   * Get default features for ghost profiles
   */
  private getDefaultFeatures(): AgentFeatures {
    return {
      profile: {
        customDomain: false,
        videoProfile: false,
        virtualTours: false,
        marketReports: false,
        customBranding: false,
        multiLanguage: false,
        teamProfiles: false
      },
      leads: {
        instantNotification: false,
        leadScoring: false,
        autoResponse: false,
        leadRouting: false,
        maxLeadsPerMonth: 0,
        leadQualification: false,
        crmIntegration: false
      },
      tools: {
        buyerTools: ['mortgage_calculator'],
        sellerTools: ['home_value_estimator'],
        investorTools: [],
        customTools: false,
        apiAccess: false
      },
      ai: {
        contentClerk: false,
        reputationManager: false,
        isaAgent: false,
        dispatcher: false,
        customAgents: false,
        monthlyResponses: 0
      },
      marketing: {
        socialMediaPosts: 0,
        emailCampaigns: 0,
        printMaterials: false,
        videoMarketing: false,
        paidAds: false,
        seoOptimization: false
      },
      analytics: {
        level: 'basic',
        realtimeData: false,
        competitorAnalysis: false,
        marketTrends: false,
        customReports: false,
        apiExport: false
      },
      regional: {
        athMovil: false,
        spanishFirst: false,
        gatePhotos: false,
        hurricaneAlerts: false,
        borderStats: false,
        oilRights: false
      },
      content: {
        autoRotation: false,
        abTesting: false,
        customTemplates: false,
        seoWriting: false,
        multiVariant: false
      }
    };
  }
}

/**
 * React hook for using feature flags in components
 */
export function useFeatureFlags(agentId: string, context: AppLoadContext) {
  const service = new FeatureFlagService(context);

  return {
    isEnabled: (feature: string) => service.isFeatureEnabled(agentId, feature),
    canUseTool: (tool: string, type: 'buyer' | 'seller' | 'investor') =>
      service.canUseTool(agentId, tool, type),
    getFeatures: () => service.getAgentFeatures(agentId),
    getLimits: () => service.getUsageLimits(agentId),
    trackUsage: (feature: string, metadata?: any) =>
      service.trackFeatureUsage(agentId, feature, metadata)
  };
}