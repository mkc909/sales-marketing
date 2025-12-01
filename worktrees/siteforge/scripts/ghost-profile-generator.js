/**
 * Ghost Profile Generator
 * Auto-generates SEO-optimized business profiles for unclaimed businesses
 *
 * Features:
 * - AI-generated descriptions and content
 * - Schema.org structured data
 * - SEO meta tags
 * - "Claim This Business" CTAs
 * - URL-safe slugs
 */

import slugify from 'slugify';

class GhostProfileGenerator {
  constructor(db, aiConfig = {}) {
    this.db = db;

    // AI configuration (optional - uses templates if no AI)
    this.useAI = aiConfig.useAI || false;
    this.aiProvider = aiConfig.provider || null; // 'openai', 'cloudflare-ai', etc.
    this.aiApiKey = aiConfig.apiKey || null;

    // SEO configuration
    this.siteBaseUrl = aiConfig.siteBaseUrl || 'https://estateflow.com';
    this.siteName = aiConfig.siteName || 'EstateFlow';
  }

  /**
   * Generate ghost profile from enriched lead
   */
  async generateProfile(enrichedLeadId) {
    try {
      // Get enriched lead data
      const lead = await this.getEnrichedLead(enrichedLeadId);

      if (!lead) {
        console.error(`[Ghost] Lead ${enrichedLeadId} not found`);
        return null;
      }

      console.log(`\n[Ghost] Generating profile for: ${lead.business_name}`);

      // Get raw business data for additional context
      const rawBusiness = await this.getRawBusinessData(lead.raw_business_id);

      // Generate profile components
      const profile = {
        enriched_lead_id: enrichedLeadId,

        // Identity
        business_name: lead.business_name,
        slug: this.generateSlug(lead.business_name, rawBusiness.city, rawBusiness.state),
        display_name: this.generateDisplayName(lead.business_name),

        // Location
        address: lead.normalized_address || rawBusiness.address,
        city: rawBusiness.city,
        state: rawBusiness.state,
        postal_code: rawBusiness.postal_code,
        latitude: rawBusiness.latitude,
        longitude: rawBusiness.longitude,

        // Contact
        phone: lead.validated_phone,
        formatted_phone: this.formatPhoneForDisplay(lead.validated_phone),
        email: lead.validated_email,
        website: rawBusiness.website,

        // Categories
        primary_category: this.getPrimaryCategory(rawBusiness),
        categories: this.getCategories(rawBusiness),
        services: await this.generateServices(rawBusiness),

        // Content (AI-generated or template-based)
        description: await this.generateDescription(lead, rawBusiness),
        about: await this.generateAbout(lead, rawBusiness),
        specialties: await this.generateSpecialties(rawBusiness),
        service_areas: this.generateServiceAreas(rawBusiness),

        // SEO
        meta_title: this.generateMetaTitle(lead, rawBusiness),
        meta_description: this.generateMetaDescription(lead, rawBusiness),
        keywords: this.generateKeywords(rawBusiness),
        schema_org: this.generateSchemaOrg(lead, rawBusiness),

        // Social Proof
        rating: lead.average_rating,
        review_count: lead.total_reviews,
        years_in_business: this.estimateYearsInBusiness(rawBusiness),

        // Publishing
        published: false, // Requires review before publishing
        is_claimed: false,
      };

      // Save profile
      await this.saveGhostProfile(profile);

      console.log(`[Ghost] Profile created: ${profile.slug}`);
      console.log(`[Ghost] URL: ${this.siteBaseUrl}/${profile.primary_category}/${profile.slug}`);

      return profile;
    } catch (error) {
      console.error(`[Ghost] Error generating profile:`, error.message);
      return null;
    }
  }

  /**
   * Get enriched lead data
   */
  async getEnrichedLead(leadId) {
    const stmt = this.db.prepare(`
      SELECT * FROM enriched_leads WHERE id = ?
    `);

    return await stmt.bind(leadId).first();
  }

  /**
   * Get raw business data
   */
  async getRawBusinessData(businessId) {
    const stmt = this.db.prepare(`
      SELECT * FROM raw_business_data WHERE id = ?
    `);

    return await stmt.bind(businessId).first();
  }

  /**
   * Generate URL-safe slug
   */
  generateSlug(businessName, city, state) {
    // Remove common business suffixes
    const cleaned = businessName
      .replace(/\b(LLC|Inc|Corp|Ltd|Co)\b/gi, '')
      .trim();

    // Create base slug
    const baseSlug = slugify(cleaned, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Add location for uniqueness
    const locationSlug = slugify(`${city}-${state}`, {
      lower: true,
      strict: true,
    });

    return `${baseSlug}-${locationSlug}`;
  }

  /**
   * Generate display name (cleaned business name)
   */
  generateDisplayName(businessName) {
    // Capitalize properly and clean up
    return businessName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format phone for display
   */
  formatPhoneForDisplay(phone) {
    if (!phone) return null;

    // E.164 format: +12345678900
    // Display format: (234) 567-8900

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // US format
      const areaCode = cleaned.substr(1, 3);
      const prefix = cleaned.substr(4, 3);
      const line = cleaned.substr(7, 4);
      return `(${areaCode}) ${prefix}-${line}`;
    }

    return phone; // Return as-is if not standard format
  }

  /**
   * Get primary category
   */
  getPrimaryCategory(business) {
    const categories = this.parseJSON(business.categories) || [];

    // Map Google/Facebook categories to our categories
    const categoryMap = {
      plumber: 'plumber',
      electrician: 'electrician',
      contractor: 'contractor',
      hvac: 'hvac',
      landscaper: 'landscaper',
      painter: 'painter',
      roofer: 'roofer',
      'real_estate_agency': 'real-estate',
      lawyer: 'legal',
      attorney: 'legal',
      'insurance_agency': 'insurance',
      'mortgage_broker': 'mortgage',
    };

    // Find best match
    for (const category of categories) {
      const normalized = category.toLowerCase().replace(/\s+/g, '_');
      if (categoryMap[normalized]) {
        return categoryMap[normalized];
      }
    }

    // Default to contractor
    return 'contractor';
  }

  /**
   * Get all categories
   */
  getCategories(business) {
    const categories = this.parseJSON(business.categories) || [];
    return JSON.stringify(categories.slice(0, 5)); // Limit to 5
  }

  /**
   * Generate services list
   */
  async generateServices(business) {
    const category = this.getPrimaryCategory(business);

    // Default services by category
    const serviceTemplates = {
      plumber: [
        'Emergency Plumbing',
        'Leak Repair',
        'Drain Cleaning',
        'Water Heater Installation',
        'Pipe Repair',
      ],
      electrician: [
        'Electrical Repairs',
        'Panel Upgrades',
        'Lighting Installation',
        'Outlet Installation',
        'Emergency Electrical',
      ],
      hvac: [
        'AC Repair',
        'Heating Repair',
        'HVAC Installation',
        'Maintenance Service',
        'Emergency Service',
      ],
      landscaper: [
        'Lawn Maintenance',
        'Landscape Design',
        'Tree Trimming',
        'Irrigation Systems',
        'Hardscaping',
      ],
      contractor: [
        'Home Remodeling',
        'Kitchen Renovation',
        'Bathroom Renovation',
        'Deck Construction',
        'General Repairs',
      ],
    };

    const services = serviceTemplates[category] || serviceTemplates.contractor;

    return JSON.stringify(services);
  }

  /**
   * Generate description (AI or template)
   */
  async generateDescription(lead, business) {
    if (this.useAI) {
      return await this.generateAIDescription(lead, business);
    }

    // Template-based description
    const category = this.getPrimaryCategory(business);
    const city = business.city;
    const name = lead.business_name;

    const templates = {
      plumber: `Professional plumbing services in ${city}. ${name} provides expert plumbing repairs, installations, and emergency service. Licensed and insured.`,
      electrician: `Licensed electrical contractor serving ${city}. ${name} offers residential and commercial electrical services with 24/7 emergency support.`,
      hvac: `Trusted HVAC services in ${city}. ${name} specializes in heating, cooling, and ventilation systems. Fast, reliable service.`,
      landscaper: `Professional landscaping services in ${city}. ${name} creates beautiful outdoor spaces with expert design and maintenance.`,
      contractor: `Licensed general contractor in ${city}. ${name} provides quality home improvement and remodeling services.`,
    };

    return templates[category] || templates.contractor;
  }

  /**
   * Generate AI description (if AI enabled)
   */
  async generateAIDescription(lead, business) {
    // Placeholder for AI integration
    // Would use OpenAI, Cloudflare AI, etc.
    return this.generateDescription(lead, business);
  }

  /**
   * Generate about section
   */
  async generateAbout(lead, business) {
    const category = this.getPrimaryCategory(business);
    const city = business.city;
    const name = lead.business_name;
    const rating = lead.average_rating;
    const reviews = lead.total_reviews;

    let about = `${name} is a trusted ${category} service provider in ${city}. `;

    if (reviews > 0 && rating >= 4.0) {
      about += `With ${reviews} positive reviews and a ${rating.toFixed(1)}-star rating, `;
      about += `we're known for quality workmanship and customer satisfaction. `;
    }

    about += `We serve residential and commercial clients throughout ${city} and surrounding areas. `;
    about += `Contact us for a free estimate on your next project.`;

    return about;
  }

  /**
   * Generate specialties
   */
  async generateSpecialties(business) {
    const category = this.getPrimaryCategory(business);

    const specialtyTemplates = {
      plumber: ['Residential Plumbing', 'Commercial Plumbing', 'Emergency Service'],
      electrician: ['Residential Electrical', 'Commercial Electrical', '24/7 Service'],
      hvac: ['AC Systems', 'Heating Systems', 'Preventive Maintenance'],
      landscaper: ['Landscape Design', 'Lawn Care', 'Irrigation'],
      contractor: ['Remodeling', 'Renovations', 'New Construction'],
    };

    const specialties = specialtyTemplates[category] || specialtyTemplates.contractor;

    return JSON.stringify(specialties);
  }

  /**
   * Generate service areas
   */
  generateServiceAreas(business) {
    const city = business.city;
    const state = business.state;

    // Default: city + nearby areas
    const serviceAreas = [
      city,
      `${city} Metro Area`,
      `${state} (statewide)`,
    ];

    return JSON.stringify(serviceAreas);
  }

  /**
   * Generate SEO meta title
   */
  generateMetaTitle(lead, business) {
    const name = lead.business_name;
    const category = this.getPrimaryCategory(business);
    const city = business.city;
    const state = business.state;

    return `${name} - ${this.capitalize(category)} in ${city}, ${state} | ${this.siteName}`;
  }

  /**
   * Generate SEO meta description
   */
  generateMetaDescription(lead, business) {
    const name = lead.business_name;
    const category = this.getPrimaryCategory(business);
    const city = business.city;
    const rating = lead.average_rating;

    let description = `${name} offers professional ${category} services in ${city}. `;

    if (lead.total_reviews > 0 && rating >= 4.0) {
      description += `${rating.toFixed(1)}-star rated. `;
    }

    description += `Get a free estimate today. Call now or request a quote online.`;

    return description;
  }

  /**
   * Generate SEO keywords
   */
  generateKeywords(business) {
    const category = this.getPrimaryCategory(business);
    const city = business.city;
    const state = business.state;

    const keywords = [
      `${category} ${city}`,
      `${category} ${state}`,
      `${category} near me`,
      `${category} services`,
      `local ${category}`,
      `best ${category} ${city}`,
      `affordable ${category}`,
    ];

    return JSON.stringify(keywords);
  }

  /**
   * Generate Schema.org structured data
   */
  generateSchemaOrg(lead, business) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: lead.business_name,
      image: null, // Would add logo if available
      '@id': `${this.siteBaseUrl}/${this.getPrimaryCategory(business)}/${this.generateSlug(lead.business_name, business.city, business.state)}`,
      url: business.website || null,
      telephone: lead.validated_phone,
      email: lead.validated_email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: lead.normalized_address,
        addressLocality: business.city,
        addressRegion: business.state,
        postalCode: business.postal_code,
        addressCountry: business.country || 'US',
      },
      geo: business.latitude && business.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: business.latitude,
        longitude: business.longitude,
      } : null,
      aggregateRating: lead.total_reviews > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: lead.average_rating,
        reviewCount: lead.total_reviews,
      } : null,
      priceRange: '$$', // Default - would calculate based on data
    };

    return JSON.stringify(schema);
  }

  /**
   * Estimate years in business (from review dates if available)
   */
  estimateYearsInBusiness(business) {
    // Placeholder - would analyze review dates from raw data
    return null;
  }

  /**
   * Save ghost profile to database
   */
  async saveGhostProfile(profile) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO ghost_profiles (
          enriched_lead_id, business_name, slug, display_name,
          address, city, state, postal_code, latitude, longitude,
          phone, formatted_phone, email, website,
          primary_category, categories, services,
          description, about, specialties, service_areas,
          meta_title, meta_description, keywords, schema_org,
          rating, review_count, years_in_business,
          published, is_claimed, created_at, last_updated
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT(slug) DO UPDATE SET
          business_name = excluded.business_name,
          display_name = excluded.display_name,
          address = excluded.address,
          phone = excluded.phone,
          formatted_phone = excluded.formatted_phone,
          email = excluded.email,
          description = excluded.description,
          about = excluded.about,
          meta_title = excluded.meta_title,
          meta_description = excluded.meta_description,
          schema_org = excluded.schema_org,
          rating = excluded.rating,
          review_count = excluded.review_count,
          last_updated = CURRENT_TIMESTAMP
      `);

      await stmt.bind(
        profile.enriched_lead_id,
        profile.business_name,
        profile.slug,
        profile.display_name,
        profile.address,
        profile.city,
        profile.state,
        profile.postal_code,
        profile.latitude,
        profile.longitude,
        profile.phone,
        profile.formatted_phone,
        profile.email,
        profile.website,
        profile.primary_category,
        profile.categories,
        profile.services,
        profile.description,
        profile.about,
        profile.specialties,
        profile.service_areas,
        profile.meta_title,
        profile.meta_description,
        profile.keywords,
        profile.schema_org,
        profile.rating,
        profile.review_count,
        profile.years_in_business,
        profile.published ? 1 : 0,
        profile.is_claimed ? 1 : 0
      ).run();

      return true;
    } catch (error) {
      console.error(`[Ghost] Failed to save profile:`, error.message);
      return false;
    }
  }

  /**
   * Batch generate ghost profiles
   */
  async generateBatch(limit = 50) {
    console.log(`\n[Ghost] Starting batch generation (limit: ${limit})`);

    try {
      // Get high-grade enriched leads without profiles
      const stmt = this.db.prepare(`
        SELECT el.id
        FROM enriched_leads el
        LEFT JOIN ghost_profiles gp ON el.id = gp.enriched_lead_id
        WHERE gp.id IS NULL
          AND el.lead_grade IN ('A', 'B')
          AND el.status = 'enriched'
        ORDER BY el.lead_score DESC
        LIMIT ?
      `);

      const leads = await stmt.bind(limit).all();

      console.log(`[Ghost] Found ${leads.results.length} leads to generate profiles for`);

      const results = {
        total: leads.results.length,
        generated: 0,
        errors: 0,
      };

      // Generate each profile
      for (const lead of leads.results) {
        const profile = await this.generateProfile(lead.id);

        if (profile) {
          results.generated++;
        } else {
          results.errors++;
        }
      }

      console.log(`\n[Ghost] Batch complete:`, results);
      return results;
    } catch (error) {
      console.error(`[Ghost] Batch error:`, error.message);
      throw error;
    }
  }

  /**
   * Utility: Parse JSON
   */
  parseJSON(data) {
    if (!data) return null;

    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return null;
    }
  }

  /**
   * Utility: Capitalize
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// ============================================================================
// CLI Usage
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: node ghost-profile-generator.js <command> [options]

Commands:
  generate <lead_id>        Generate single ghost profile
  batch [limit]             Generate batch of profiles

Examples:
  node ghost-profile-generator.js generate 123
  node ghost-profile-generator.js batch 50
    `);
    process.exit(1);
  }

  const command = args[0];

  // Initialize generator
  const generator = new GhostProfileGenerator(null, {
    useAI: false, // Set to true to enable AI generation
    siteBaseUrl: process.env.SITE_BASE_URL || 'https://estateflow.com',
    siteName: process.env.SITE_NAME || 'EstateFlow',
  });

  if (command === 'generate') {
    const leadId = parseInt(args[1]);
    if (!leadId) {
      console.error('Error: lead_id required');
      process.exit(1);
    }

    await generator.generateProfile(leadId);
  } else if (command === 'batch') {
    const limit = parseInt(args[1]) || 50;
    await generator.generateBatch(limit);
  } else {
    console.error(`Error: Unknown command "${command}"`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default GhostProfileGenerator;
