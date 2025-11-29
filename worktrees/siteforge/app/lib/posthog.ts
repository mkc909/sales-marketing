/**
 * PostHog Analytics Integration
 * Feature flags and product analytics for the platform
 */

import { PostHog } from 'posthog-node';
import type { AppLoadContext } from '@remix-run/cloudflare';

let posthogClient: PostHog | null = null;

export function getPostHog(env: any): PostHog {
  if (!posthogClient && env.POSTHOG_KEY) {
    posthogClient = new PostHog(env.POSTHOG_KEY, {
      host: env.POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 1, // Flush immediately in edge environment
      flushInterval: 0 // Don't batch in Workers
    });
  }
  return posthogClient!;
}

export class Analytics {
  private posthog: PostHog;
  private region: string;

  constructor(private context: AppLoadContext) {
    this.posthog = getPostHog(context.env);
    this.region = context.region || 'US';
  }

  /**
   * Core Events
   */

  async trackPinCreated(userId: string, pin: any) {
    await this.posthog?.capture({
      distinctId: userId,
      event: 'pin_created',
      properties: {
        pin_id: pin.id,
        pin_type: pin.pinType,
        region: this.region,
        has_photo: !!pin.photoUrl,
        has_access_code: !!pin.accessCode,
        has_instructions: !!pin.instructions,
        category: pin.category,
        is_property: !!pin.propertyId,
        product_name: this.getProductName(),
        $set: {
          total_pins_created: '+1'
        }
      }
    });
  }

  async trackPinShared(pin: any, sharedBy: string, method: string) {
    await this.posthog?.capture({
      distinctId: sharedBy,
      event: 'pin_shared',
      properties: {
        pin_id: pin.id,
        sharing_method: method, // 'link', 'qr', 'whatsapp', 'sms'
        pin_type: pin.pinType,
        region: this.region,
        recipient_type: 'unknown', // Will be updated if they click
        product_name: this.getProductName()
      }
    });
  }

  async trackPinViewed(pin: any, viewerId?: string) {
    const event = {
      distinctId: viewerId || `anon_${Date.now()}`,
      event: 'pin_viewed',
      properties: {
        pin_id: pin.id,
        pin_type: pin.pinType,
        region: this.region,
        is_authenticated: !!viewerId,
        referrer: this.context.request?.headers.get('referer'),
        user_agent: this.context.request?.headers.get('user-agent')
      }
    };

    await this.posthog?.capture(event);

    // Track potential viral conversion
    if (!viewerId) {
      await this.trackPotentialViralUser(pin.id);
    }
  }

  async trackNavigation(pin: any, userId?: string, app: string = 'unknown') {
    await this.posthog?.capture({
      distinctId: userId || `anon_${Date.now()}`,
      event: 'pin_navigation_started',
      properties: {
        pin_id: pin.id,
        navigation_app: app, // 'google', 'apple', 'waze'
        region: this.region,
        pin_type: pin.pinType,
        is_authenticated: !!userId
      }
    });
  }

  /**
   * Real Estate Specific Events
   */

  async trackAgentSignup(agent: any, source: string) {
    await this.posthog?.capture({
      distinctId: agent.id,
      event: 'agent_signup',
      properties: {
        region: this.region,
        brokerage: agent.brokerage,
        license_state: agent.licenseState,
        signup_source: source, // 'ghost_profile', 'organic', 'referral'
        has_mls_number: !!agent.mlsNumber,
        $set: {
          user_type: 'agent',
          region: this.region,
          brokerage: agent.brokerage
        }
      }
    });

    // Add to cohort
    await this.posthog?.groupIdentify({
      groupType: 'brokerage',
      groupKey: agent.brokerage || 'independent',
      properties: {
        region: this.region,
        agent_count: '+1'
      }
    });
  }

  async trackPropertyAdded(property: any, agentId: string) {
    await this.posthog?.capture({
      distinctId: agentId,
      event: 'property_added',
      properties: {
        property_id: property.id,
        property_type: property.propertyType,
        listing_status: property.listingStatus,
        price_range: this.getPriceRange(property.listPrice),
        region: this.region,
        has_lockbox_pin: !!property.lockboxPinId,
        has_parking_pin: !!property.parkingPinId,
        mls_number: property.mlsNumber
      }
    });
  }

  async trackShowingScheduled(showing: any, agentId: string) {
    await this.posthog?.capture({
      distinctId: agentId,
      event: 'showing_scheduled',
      properties: {
        property_id: showing.propertyId,
        showing_id: showing.id,
        has_truepoint: !!showing.truepointId,
        notification_sent: showing.notificationSent,
        region: this.region
      }
    });
  }

  async trackQRPrinted(qr: any, userId: string) {
    await this.posthog?.capture({
      distinctId: userId,
      event: 'qr_printed',
      properties: {
        qr_id: qr.id,
        purpose: qr.purpose, // 'yard_sign', 'business_card', 'flyer'
        property_id: qr.propertyId,
        region: this.region,
        material_type: qr.materialType,
        print_vendor: qr.printVendor
      }
    });

    // This is a strong lock-in signal
    await this.trackLockInEvent(userId, 'physical_qr');
  }

  /**
   * Viral & Growth Events
   */

  async trackViralSignup(newUserId: string, referringPinId: string) {
    await this.posthog?.capture({
      distinctId: newUserId,
      event: 'viral_signup',
      properties: {
        source: 'pin_share',
        referring_pin_id: referringPinId,
        region: this.region,
        product_name: this.getProductName(),
        $set: {
          acquisition_channel: 'viral',
          referring_pin: referringPinId
        }
      }
    });

    // Update viral coefficient
    await this.updateViralMetrics(referringPinId);
  }

  async trackPotentialViralUser(pinId: string) {
    await this.posthog?.capture({
      distinctId: `potential_${pinId}_${Date.now()}`,
      event: 'potential_viral_exposure',
      properties: {
        pin_id: pinId,
        region: this.region,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Subscription & Revenue Events
   */

  async trackSubscription(userId: string, tier: string, revenue: number) {
    await this.posthog?.capture({
      distinctId: userId,
      event: 'subscription_started',
      properties: {
        subscription_tier: tier,
        monthly_revenue: revenue,
        region: this.region,
        payment_method: this.getPaymentMethod(),
        $set: {
          subscription_tier: tier,
          subscription_value: revenue
        }
      },
      groups: {
        subscription_cohort: `${this.region}_${tier}`
      }
    });
  }

  async trackAIAgentActivated(userId: string, agentType: string, price: number) {
    await this.posthog?.capture({
      distinctId: userId,
      event: 'ai_agent_activated',
      properties: {
        agent_type: agentType, // 'dispatcher', 'isa', 'reputation'
        monthly_price: price,
        region: this.region,
        total_agents_active: await this.getUserAgentCount(userId)
      }
    });
  }

  /**
   * Lock-in & Retention Events
   */

  async trackLockInEvent(userId: string, lockInType: string) {
    await this.posthog?.capture({
      distinctId: userId,
      event: 'lock_in_created',
      properties: {
        lock_in_type: lockInType, // 'physical_qr', 'url_shared', 'mls_listed'
        region: this.region,
        lock_in_strength: this.calculateLockInStrength(lockInType),
        estimated_switching_cost: this.estimateSwitchingCost(lockInType)
      }
    });
  }

  /**
   * Feature Flags
   */

  async getFeatureFlags(userId: string): Promise<any> {
    const flags = await this.posthog?.getAllFlags(userId, {
      personProperties: {
        region: this.region,
        user_type: await this.getUserType(userId)
      },
      groups: {
        region: this.region
      }
    });

    return {
      // Core features
      new_pin_ui: flags?.new_pin_ui || false,
      ai_dispatcher: flags?.ai_dispatcher || false,
      bulk_qr_generation: flags?.bulk_qr || false,
      vision_ai: flags?.vision_ai || false,

      // Regional features
      gate_photos: this.region === 'PR' || flags?.gate_photos,
      ath_movil: this.region === 'PR',
      spanish_first: this.region === 'PR',

      // Rollout features
      showing_automation: flags?.showing_automation || false,
      route_optimization: flags?.route_optimization || false,
      voice_navigation: flags?.voice_navigation || false
    };
  }

  async isFeatureEnabled(feature: string, userId: string): Promise<boolean> {
    return await this.posthog?.isFeatureEnabled(feature, userId) || false;
  }

  /**
   * Helper Methods
   */

  private getProductName(): string {
    return this.region === 'PR' ? 'PinExacto' : 'TruePoint';
  }

  private getPaymentMethod(): string {
    return this.region === 'PR' ? 'ath_movil' : 'stripe';
  }

  private getPriceRange(price: number): string {
    if (price < 100000) return '<100k';
    if (price < 250000) return '100k-250k';
    if (price < 500000) return '250k-500k';
    if (price < 1000000) return '500k-1M';
    return '1M+';
  }

  private calculateLockInStrength(type: string): number {
    const strengths: Record<string, number> = {
      physical_qr: 10,      // Highest - physical materials
      mls_listed: 8,        // High - listed everywhere
      url_shared: 6,        // Medium - in circulation
      profile_created: 3,   // Low - just digital
    };
    return strengths[type] || 1;
  }

  private estimateSwitchingCost(type: string): number {
    const costs: Record<string, number> = {
      physical_qr: 200,     // Reprinting signs
      business_cards: 100,  // New cards
      mls_update: 50,      // Time cost
      url_update: 25,      // Updating links
    };
    return costs[type] || 0;
  }

  private async getUserType(userId: string): Promise<string> {
    // In production, fetch from database
    return 'agent';
  }

  private async getUserAgentCount(userId: string): Promise<number> {
    // In production, fetch from database
    return 1;
  }

  private async updateViralMetrics(pinId: string) {
    // Update k-factor and viral cycle metrics
    await this.posthog?.capture({
      distinctId: `system`,
      event: 'viral_metric_update',
      properties: {
        pin_id: pinId,
        metric_type: 'conversion',
        region: this.region
      }
    });
  }

  /**
   * Cleanup
   */

  async shutdown() {
    await this.posthog?.shutdown();
  }
}

/**
 * Cloudflare Worker Integration
 */
export async function trackEventInWorker(
  event: string,
  properties: any,
  env: any
): Promise<void> {
  if (!env.POSTHOG_KEY) return;

  // Fire and forget to PostHog
  const body = JSON.stringify({
    api_key: env.POSTHOG_KEY,
    event,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      library: 'cloudflare-worker'
    }
  });

  // Use waitUntil to not block response
  env.waitUntil(
    fetch('https://app.posthog.com/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })
  );
}