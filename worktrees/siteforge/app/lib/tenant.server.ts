import type { AppLoadContext } from "@remix-run/cloudflare";

export interface Tenant {
  id: number;
  subdomain: string;
  customDomain: string | null;
  businessName: string;
  industry: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primaryColor: string;
  secondaryColor: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

export interface SiteContent {
  tenantId: number;
  sectionName: string;
  contentJson: string;
  isAiGenerated: boolean;
}

/**
 * Get tenant by hostname
 * Checks both custom domains and subdomains
 */
export async function getTenantByHostname(
  hostname: string,
  context: AppLoadContext
): Promise<Tenant | null> {
  const db = context.env.DB;

  // Remove port if present
  const cleanHostname = hostname.split(':')[0];

  // First check custom domains
  const customDomainResult = await db
    .prepare(
      `SELECT * FROM tenants WHERE custom_domain = ? AND subscription_status = 'active'`
    )
    .bind(cleanHostname)
    .first<Tenant>();

  if (customDomainResult) {
    return customDomainResult;
  }

  // Check if it's a subdomain
  if (cleanHostname.endsWith('.siteforge.com') || cleanHostname.endsWith('.localhost')) {
    const subdomain = cleanHostname.split('.')[0];

    const subdomainResult = await db
      .prepare(
        `SELECT * FROM tenants WHERE subdomain = ? AND subscription_status = 'active'`
      )
      .bind(subdomain)
      .first<Tenant>();

    return subdomainResult;
  }

  // Default tenant for development/demo
  if (cleanHostname === 'localhost' || cleanHostname === '127.0.0.1') {
    // Return demo tenant
    return {
      id: 0,
      subdomain: 'demo',
      customDomain: null,
      businessName: "Demo Business",
      industry: 'plumber',
      phone: '(555) 123-4567',
      email: 'demo@siteforge.com',
      address: '123 Demo St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      primaryColor: '#0ea5e9',
      secondaryColor: '#f59e0b',
      subscriptionTier: 'professional',
      subscriptionStatus: 'active',
    };
  }

  return null;
}

/**
 * Get site content for a tenant
 */
export async function getTenantContent(
  tenantId: number,
  context: AppLoadContext
): Promise<Record<string, any>> {
  const db = context.env.DB;

  const results = await db
    .prepare(
      `SELECT section_name, content_json FROM site_content
       WHERE tenant_id = ?
       ORDER BY version DESC`
    )
    .bind(tenantId)
    .all<SiteContent>();

  const content: Record<string, any> = {};

  for (const row of results.results) {
    try {
      content[row.sectionName] = JSON.parse(row.contentJson);
    } catch (e) {
      console.error(`Failed to parse content for section ${row.sectionName}:`, e);
    }
  }

  // Return default content if none exists
  if (Object.keys(content).length === 0) {
    return getDefaultContent();
  }

  return content;
}

/**
 * Get default content based on industry
 */
export function getDefaultContent(industry = 'plumber') {
  const industryContent: Record<string, any> = {
    plumber: {
      hero: {
        title: "Professional Plumbing Services",
        subtitle: "Fast, reliable, and affordable plumbing solutions. Available 24/7 for emergencies.",
        ctaText: "Get Free Quote",
      },
      services: [
        {
          id: "leak-repair",
          name: "Leak Repair",
          description: "Quick detection and repair of water leaks.",
          icon: "repair",
        },
        {
          id: "drain-cleaning",
          name: "Drain Cleaning",
          description: "Professional drain cleaning services.",
          icon: "maintenance",
        },
        {
          id: "installation",
          name: "Installation",
          description: "Expert installation of plumbing fixtures.",
          icon: "installation",
        },
        {
          id: "emergency",
          name: "Emergency Service",
          description: "24/7 emergency plumbing service.",
          icon: "emergency",
        },
      ],
      about: {
        title: "About Us",
        description: "With over 15 years of experience, we provide top-quality plumbing services to our community.",
      },
    },
    hvac: {
      hero: {
        title: "Heating & Cooling Experts",
        subtitle: "Keep your home comfortable year-round with our professional HVAC services.",
        ctaText: "Schedule Service",
      },
      services: [
        {
          id: "ac-installation",
          name: "AC Installation",
          description: "Energy-efficient air conditioning installation.",
          icon: "installation",
        },
        {
          id: "heating-repair",
          name: "Heating Repair",
          description: "Fast and reliable heating system repairs.",
          icon: "repair",
        },
        {
          id: "maintenance",
          name: "Maintenance Plans",
          description: "Regular maintenance to prevent breakdowns.",
          icon: "maintenance",
        },
        {
          id: "emergency",
          name: "Emergency Service",
          description: "24/7 emergency HVAC service.",
          icon: "emergency",
        },
      ],
      about: {
        title: "Your Comfort is Our Priority",
        description: "We specialize in residential and commercial HVAC solutions.",
      },
    },
    landscaper: {
      hero: {
        title: "Beautiful Landscapes, Expert Care",
        subtitle: "Transform your outdoor space with our professional landscaping services.",
        ctaText: "Get Free Estimate",
      },
      services: [
        {
          id: "lawn-care",
          name: "Lawn Care",
          description: "Weekly mowing and maintenance.",
          icon: "maintenance",
        },
        {
          id: "garden-design",
          name: "Garden Design",
          description: "Custom landscape design and installation.",
          icon: "installation",
        },
        {
          id: "tree-service",
          name: "Tree Service",
          description: "Tree trimming and removal.",
          icon: "repair",
        },
        {
          id: "irrigation",
          name: "Irrigation",
          description: "Sprinkler system installation and repair.",
          icon: "installation",
        },
      ],
      about: {
        title: "Creating Beautiful Outdoor Spaces",
        description: "Professional landscaping services for residential and commercial properties.",
      },
    },
    electrician: {
      hero: {
        title: "Licensed Electricians You Can Trust",
        subtitle: "Safe, reliable electrical services for your home or business.",
        ctaText: "Call Now",
      },
      services: [
        {
          id: "wiring",
          name: "Electrical Wiring",
          description: "New construction and rewiring services.",
          icon: "installation",
        },
        {
          id: "panel-upgrade",
          name: "Panel Upgrades",
          description: "Electrical panel upgrades and replacements.",
          icon: "repair",
        },
        {
          id: "lighting",
          name: "Lighting Installation",
          description: "Indoor and outdoor lighting solutions.",
          icon: "installation",
        },
        {
          id: "emergency",
          name: "Emergency Repairs",
          description: "24/7 emergency electrical service.",
          icon: "emergency",
        },
      ],
      about: {
        title: "Powering Your World Safely",
        description: "Certified electricians providing quality electrical services since 2005.",
      },
    },
  };

  return industryContent[industry] || industryContent.plumber;
}

/**
 * Save a new lead to the database
 */
export async function saveLead(
  tenantId: number,
  leadData: {
    name: string;
    phone?: string;
    email?: string;
    message: string;
    service?: string;
  },
  context: AppLoadContext
) {
  const db = context.env.DB;

  const result = await db
    .prepare(
      `INSERT INTO leads (tenant_id, name, phone, email, message, service_interested, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'new', datetime('now'))`
    )
    .bind(
      tenantId,
      leadData.name,
      leadData.phone || null,
      leadData.email || null,
      leadData.message,
      leadData.service || null
    )
    .run();

  return result.meta.last_row_id;
}