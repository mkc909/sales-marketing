/**
 * ICP (Ideal Customer Profile) Signal Detector
 * Target: 90% accuracy in identifying high-value leads
 *
 * Detects:
 * 1. Unmappable businesses (Int, Km, Bo, complex addresses)
 * 2. Mobile businesses (Food Truck, Mobile Service)
 * 3. Ghost businesses (No website, social only)
 * 4. Businesses needing location help
 */

class IcpDetector {
  constructor(db) {
    this.db = db;

    // Detection patterns
    this.patterns = {
      // Puerto Rico unmappable address indicators
      unmappableAddressPR: [
        /\bInt\b/i, // Interior (interior road/street)
        /\bKm\b/i, // Kilometer marker
        /\bBo\b/i, // Barrio
        /\bUrb\b/i, // Urbanización
        /\bCarr\b/i, // Carretera (highway)
        /\bAve\.\s+\d+/i, // Avenue followed by number (PR style)
        /Carr\.\s*\d+\s+Km/i, // Highway + Km marker
      ],

      // Complex address patterns
      complexAddress: [
        /Suite\s+[A-Z0-9-]+.*Building/i, // Multi-suite buildings
        /#\d+.*#\d+/i, // Multiple apartment/unit numbers
        /,\s*[^,]{100,}/i, // Very long address component
        /Edificio.*Local/i, // Building + Local (PR)
        /Plaza.*Local/i, // Shopping plaza locales
      ],

      // Mobile business indicators
      mobileBusiness: [
        /food\s*truck/i,
        /mobile\s*(service|detailing|mechanic|barber)/i,
        /on-site/i,
        /we\s*come\s*to\s*you/i,
        /traveling/i,
        /\bmobile\b/i,
      ],

      // Service area indicators (vs fixed location)
      serviceArea: [
        /serving/i,
        /service\s*area/i,
        /we\s*serve/i,
        /coverage\s*area/i,
        /\bmetro\s*area\b/i,
      ],

      // Ghost business indicators
      socialOnlyKeywords: [
        /dm\s*for\s*(orders|info)/i,
        /whatsapp\s*only/i,
        /follow\s*us\s*on/i,
        /see\s*our\s*(fb|facebook|ig|instagram)/i,
      ],
    };

    // Scoring weights
    this.weights = {
      noWebsite: 30,
      unmappableAddress: 25,
      mobileBusiness: 20,
      facebookOnly: 15,
      complexAddress: 10,
      longAddress: 10,
      serviceArea: 5,
    };
  }

  /**
   * Analyze a business for ICP signals
   */
  async analyzeAndDetect(businessId) {
    try {
      // Fetch business data
      const business = await this.getBusinessData(businessId);

      if (!business) {
        console.error(`[ICP] Business ${businessId} not found`);
        return null;
      }

      console.log(`\n[ICP] Analyzing: ${business.name}`);

      // Detect all signals
      const signals = {
        no_website: this.detectNoWebsite(business),
        unmappable_address: this.detectUnmappableAddress(business),
        mobile_business: this.detectMobileBusiness(business),
        ghost_business: this.detectGhostBusiness(business),
        complex_address: this.detectComplexAddress(business),
        has_facebook_only: this.detectFacebookOnly(business),
        has_instagram_only: this.detectInstagramOnly(business),
        address_complexity_score: this.calculateAddressComplexity(business),
        findability_score: this.calculateFindabilityScore(business),
      };

      // Calculate overall ICP score
      const icpScore = this.calculateIcpScore(signals);
      const icpCategory = this.categorizeIcpScore(icpScore);

      // Get detailed signal descriptions
      const detailedSignals = this.getDetailedSignals(business, signals);

      // Save to database
      await this.saveIcpSignals(businessId, {
        ...signals,
        icp_score: icpScore,
        icp_category: icpCategory,
        signals: JSON.stringify(detailedSignals),
      });

      console.log(`[ICP] Score: ${icpScore}/100 | Category: ${icpCategory}`);
      console.log(`[ICP] Signals detected:`, detailedSignals.map(s => s.type).join(', '));

      return {
        business_id: businessId,
        signals,
        icp_score: icpScore,
        icp_category: icpCategory,
        detailed_signals: detailedSignals,
      };
    } catch (error) {
      console.error(`[ICP] Error analyzing business ${businessId}:`, error.message);
      return null;
    }
  }

  /**
   * Get business data from database
   */
  async getBusinessData(businessId) {
    const stmt = this.db.prepare(`
      SELECT * FROM raw_business_data WHERE id = ?
    `);

    const result = await stmt.bind(businessId).first();
    return result;
  }

  /**
   * Detect: No website
   */
  detectNoWebsite(business) {
    return !business.website || business.website.trim() === '';
  }

  /**
   * Detect: Unmappable address (PR-specific patterns)
   */
  detectUnmappableAddress(business) {
    const address = business.address || '';

    // Check for PR-specific unmappable patterns
    const hasPRPattern = this.patterns.unmappableAddressPR.some(pattern =>
      pattern.test(address)
    );

    // Check for long addresses (often unmappable)
    const isLongAddress = address.length > 100;

    return hasPRPattern || isLongAddress;
  }

  /**
   * Detect: Mobile business
   */
  detectMobileBusiness(business) {
    const name = business.name || '';
    const category = business.category || '';
    const rawData = this.parseRawData(business.raw_data);
    const about = rawData?.about || '';

    // Check name, category, and about text
    const textToCheck = `${name} ${category} ${about}`.toLowerCase();

    return this.patterns.mobileBusiness.some(pattern =>
      pattern.test(textToCheck)
    );
  }

  /**
   * Detect: Ghost business (social media only)
   */
  detectGhostBusiness(business) {
    const hasWebsite = !this.detectNoWebsite(business);
    const hasFacebook = !!business.facebook_url;
    const rawData = this.parseRawData(business.raw_data);

    // Ghost business = No website + social media presence only
    return !hasWebsite && (hasFacebook || rawData?.instagram_url);
  }

  /**
   * Detect: Complex address
   */
  detectComplexAddress(business) {
    const address = business.address || '';

    return this.patterns.complexAddress.some(pattern =>
      pattern.test(address)
    );
  }

  /**
   * Detect: Facebook only presence
   */
  detectFacebookOnly(business) {
    const hasWebsite = !this.detectNoWebsite(business);
    const hasFacebook = !!business.facebook_url;
    const rawData = this.parseRawData(business.raw_data);
    const hasInstagram = !!rawData?.instagram_url;

    return !hasWebsite && hasFacebook && !hasInstagram;
  }

  /**
   * Detect: Instagram only presence
   */
  detectInstagramOnly(business) {
    const hasWebsite = !this.detectNoWebsite(business);
    const hasFacebook = !!business.facebook_url;
    const rawData = this.parseRawData(business.raw_data);
    const hasInstagram = !!rawData?.instagram_url;

    return !hasWebsite && !hasFacebook && hasInstagram;
  }

  /**
   * Calculate address complexity score (0-100)
   */
  calculateAddressComplexity(business) {
    const address = business.address || '';
    let score = 0;

    // Length scoring
    if (address.length > 150) score += 40;
    else if (address.length > 100) score += 25;
    else if (address.length > 75) score += 15;

    // Pattern matching
    const unmappableMatches = this.patterns.unmappableAddressPR.filter(pattern =>
      pattern.test(address)
    ).length;
    score += unmappableMatches * 15;

    const complexMatches = this.patterns.complexAddress.filter(pattern =>
      pattern.test(address)
    ).length;
    score += complexMatches * 10;

    // Number of address components
    const components = address.split(',').length;
    if (components > 5) score += 15;
    else if (components > 3) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate findability score (0-100, lower = harder to find)
   */
  calculateFindabilityScore(business) {
    let score = 100; // Start at perfect findability

    // No address = very hard to find
    if (!business.address) {
      score -= 50;
    } else {
      // Reduce score based on address complexity
      const complexityScore = this.calculateAddressComplexity(business);
      score -= (complexityScore * 0.3); // 30% weight on complexity
    }

    // No coordinates = harder to find
    if (!business.latitude || !business.longitude) {
      score -= 20;
    }

    // Mobile business = harder to find
    if (this.detectMobileBusiness(business)) {
      score -= 15;
    }

    // No website = harder to verify location
    if (this.detectNoWebsite(business)) {
      score -= 10;
    }

    // Service area (vs fixed location) = harder to pinpoint
    const rawData = this.parseRawData(business.raw_data);
    const about = rawData?.about || '';
    const hasServiceArea = this.patterns.serviceArea.some(pattern =>
      pattern.test(about)
    );
    if (hasServiceArea) {
      score -= 10;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate overall ICP score (0-100)
   */
  calculateIcpScore(signals) {
    let score = 0;

    // Apply weights for each signal
    if (signals.no_website) score += this.weights.noWebsite;
    if (signals.unmappable_address) score += this.weights.unmappableAddress;
    if (signals.mobile_business) score += this.weights.mobileBusiness;
    if (signals.has_facebook_only) score += this.weights.facebookOnly;
    if (signals.complex_address) score += this.weights.complexAddress;

    // Address complexity adds partial score
    score += (signals.address_complexity_score / 100) * this.weights.longAddress;

    // Low findability increases ICP score (harder to find = better ICP)
    const findabilityContribution = ((100 - signals.findability_score) / 100) * 10;
    score += findabilityContribution;

    return Math.min(100, Math.round(score));
  }

  /**
   * Categorize ICP score into high/medium/low
   */
  categorizeIcpScore(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get detailed signal descriptions
   */
  getDetailedSignals(business, signals) {
    const detailedSignals = [];

    if (signals.no_website) {
      detailedSignals.push({
        type: 'no_website',
        severity: 'high',
        description: 'Business has no website - prime candidate for location help',
        recommendation: 'Offer website + location services package',
      });
    }

    if (signals.unmappable_address) {
      detailedSignals.push({
        type: 'unmappable_address',
        severity: 'high',
        description: 'Address contains unmappable elements (Int, Km, Bo, etc.)',
        recommendation: 'Offer PinExacto location fixing service',
        details: this.getUnmappablePatterns(business.address),
      });
    }

    if (signals.mobile_business) {
      detailedSignals.push({
        type: 'mobile_business',
        severity: 'medium',
        description: 'Mobile/traveling business - difficult to locate',
        recommendation: 'Offer service area mapping and QR codes',
      });
    }

    if (signals.ghost_business) {
      detailedSignals.push({
        type: 'ghost_business',
        severity: 'high',
        description: 'Social media presence only - no official website',
        recommendation: 'Create ghost profile and claim funnel',
      });
    }

    if (signals.complex_address) {
      detailedSignals.push({
        type: 'complex_address',
        severity: 'medium',
        description: `Complex address (complexity: ${signals.address_complexity_score}/100)`,
        recommendation: 'Simplify with visual location guide',
      });
    }

    if (signals.findability_score < 50) {
      detailedSignals.push({
        type: 'low_findability',
        severity: 'high',
        description: `Very difficult to find (score: ${signals.findability_score}/100)`,
        recommendation: 'High-priority for location assistance',
      });
    }

    return detailedSignals;
  }

  /**
   * Get specific unmappable patterns found in address
   */
  getUnmappablePatterns(address) {
    const found = [];

    if (/\bInt\b/i.test(address)) found.push('Interior road (Int)');
    if (/\bKm\b/i.test(address)) found.push('Kilometer marker (Km)');
    if (/\bBo\b/i.test(address)) found.push('Barrio (Bo)');
    if (/\bUrb\b/i.test(address)) found.push('Urbanización (Urb)');
    if (/\bCarr\b/i.test(address)) found.push('Carretera/Highway (Carr)');

    return found;
  }

  /**
   * Save ICP signals to database
   */
  async saveIcpSignals(businessId, signalData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO icp_signals (
          raw_business_id, no_website, unmappable_address, mobile_business,
          ghost_business, complex_address, has_facebook_only, has_instagram_only,
          address_complexity_score, findability_score, icp_score, icp_category,
          signals, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(raw_business_id) DO UPDATE SET
          no_website = excluded.no_website,
          unmappable_address = excluded.unmappable_address,
          mobile_business = excluded.mobile_business,
          ghost_business = excluded.ghost_business,
          complex_address = excluded.complex_address,
          has_facebook_only = excluded.has_facebook_only,
          has_instagram_only = excluded.has_instagram_only,
          address_complexity_score = excluded.address_complexity_score,
          findability_score = excluded.findability_score,
          icp_score = excluded.icp_score,
          icp_category = excluded.icp_category,
          signals = excluded.signals,
          detected_at = CURRENT_TIMESTAMP
      `);

      await stmt.bind(
        businessId,
        signalData.no_website ? 1 : 0,
        signalData.unmappable_address ? 1 : 0,
        signalData.mobile_business ? 1 : 0,
        signalData.ghost_business ? 1 : 0,
        signalData.complex_address ? 1 : 0,
        signalData.has_facebook_only ? 1 : 0,
        signalData.has_instagram_only ? 1 : 0,
        signalData.address_complexity_score,
        signalData.findability_score,
        signalData.icp_score,
        signalData.icp_category,
        signalData.signals
      ).run();

      return true;
    } catch (error) {
      console.error(`[ICP] Failed to save signals for business ${businessId}:`, error.message);
      return false;
    }
  }

  /**
   * Batch analyze all new businesses
   */
  async analyzeBatch(limit = 100) {
    console.log(`\n[ICP] Starting batch analysis (limit: ${limit})`);

    try {
      // Get unprocessed businesses
      const stmt = this.db.prepare(`
        SELECT rb.id
        FROM raw_business_data rb
        LEFT JOIN icp_signals icp ON rb.id = icp.raw_business_id
        WHERE rb.status = 'new'
          AND icp.id IS NULL
        LIMIT ?
      `);

      const businesses = await stmt.bind(limit).all();

      console.log(`[ICP] Found ${businesses.results.length} businesses to analyze`);

      const results = {
        total: businesses.results.length,
        analyzed: 0,
        high: 0,
        medium: 0,
        low: 0,
        errors: 0,
      };

      // Analyze each business
      for (const business of businesses.results) {
        const analysis = await this.analyzeAndDetect(business.id);

        if (analysis) {
          results.analyzed++;

          if (analysis.icp_category === 'high') results.high++;
          else if (analysis.icp_category === 'medium') results.medium++;
          else results.low++;
        } else {
          results.errors++;
        }
      }

      console.log(`\n[ICP] Batch complete:`, results);
      return results;
    } catch (error) {
      console.error(`[ICP] Batch analysis error:`, error.message);
      throw error;
    }
  }

  /**
   * Parse raw JSON data
   */
  parseRawData(rawData) {
    if (!rawData) return {};

    try {
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      return {};
    }
  }
}

// ============================================================================
// CLI Usage
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: node icp-detector.js <command> [options]

Commands:
  analyze <business_id>     Analyze single business
  batch [limit]             Analyze batch of unprocessed businesses

Examples:
  node icp-detector.js analyze 123
  node icp-detector.js batch 100
    `);
    process.exit(1);
  }

  const command = args[0];

  // Initialize detector (database connection would be passed in real usage)
  const detector = new IcpDetector(null);

  if (command === 'analyze') {
    const businessId = parseInt(args[1]);
    if (!businessId) {
      console.error('Error: business_id required');
      process.exit(1);
    }

    await detector.analyzeAndDetect(businessId);
  } else if (command === 'batch') {
    const limit = parseInt(args[1]) || 100;
    await detector.analyzeBatch(limit);
  } else {
    console.error(`Error: Unknown command "${command}"`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default IcpDetector;
