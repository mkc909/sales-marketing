export const theme = {
  colors: {
    primary: {
      estateflow: '#0066CC',    // US brand
      pinexacto: '#00A859',      // Puerto Rico
      truepoint: '#FF6B35'       // Location services
    },
    industries: {
      real_estate: '#1E40AF',
      legal: '#7C3AED',
      insurance: '#059669',
      mortgage: '#DC2626',
      financial: '#F59E0B',
      contractor: '#8B5CF6'
    }
  }
};

export type BrandId = 'siteforge' | 'enlacepr' | 'truepoint';

export interface BrandConfig {
  id: BrandId;
  name: string;
  domain: string;
  colors: {
    primary: string;
    secondary: string;
  };
  messaging: {
    hero: string;
    subhero: string;
  };
}

export const brands: Record<BrandId, BrandConfig> = {
  siteforge: { // Defaulting to EstateFlow for siteforge/US context
    id: 'siteforge',
    name: 'EstateFlow',
    domain: 'estateflow.com',
    colors: {
      primary: theme.colors.primary.estateflow,
      secondary: '#1e293b'
    },
    messaging: {
      hero: "Find Top Professionals",
      subhero: "Connect with verified experts in Real Estate, Law, and more."
    }
  },
  enlacepr: {
    id: 'enlacepr',
    name: 'PinExacto',
    domain: 'pinexacto.pr',
    colors: {
      primary: theme.colors.primary.pinexacto,
      secondary: '#064e3b'
    },
    messaging: {
      hero: "Nunca Más Te Pierdas",
      subhero: "Crea un pin exacto de tu ubicación en 60 segundos."
    }
  },
  truepoint: {
    id: 'truepoint',
    name: 'TruePoint',
    domain: 'truepoint.io',
    colors: {
      primary: theme.colors.primary.truepoint,
      secondary: '#c2410c'
    },
    messaging: {
      hero: "Navigate with Precision",
      subhero: "Exact location pins for properties and services."
    }
  }
};

export function getBrandConfig(brandId: string) {
  return brands[brandId as BrandId] || brands.siteforge;
}
