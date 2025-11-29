export interface BrandConfig {
  name: string;
  domain: string;
  primaryColor: string;
  logo: string;
}

export const getBrandConfig = (domain?: string): BrandConfig => {
  const configs: Record<string, BrandConfig> = {
    'pinexacto.com': {
      name: 'PinExacto',
      domain: 'pinexacto.com',
      primaryColor: '#3B82F6',
      logo: '/logo-pinexacto.svg'
    },
    'truepoint.app': {
      name: 'TruePoint',
      domain: 'truepoint.app', 
      primaryColor: '#10B981',
      logo: '/logo-truepoint.svg'
    },
    'estateflow.com': {
      name: 'EstateFlow',
      domain: 'estateflow.com',
      primaryColor: '#8B5CF6',
      logo: '/logo-estateflow.svg'
    }
  };

  return configs[domain || 'estateflow.com'] || configs['estateflow.com'];
};

export const getIndustryConfig = (industry: string) => {
  const industries = {
    'real-estate': {
      name: 'Real Estate',
      icon: 'home',
      color: '#3B82F6'
    },
    'legal': {
      name: 'Legal',
      icon: 'scale',
      color: '#6366F1'
    },
    'insurance': {
      name: 'Insurance', 
      icon: 'shield',
      color: '#10B981'
    },
    'mortgage': {
      name: 'Mortgage',
      icon: 'calculator',
      color: '#F59E0B'
    },
    'financial': {
      name: 'Financial',
      icon: 'trending-up',
      color: '#10B981'
    },
    'contractors': {
      name: 'Contractors',
      icon: 'wrench',
      color: '#F59E0B'
    }
  };

  return industries[industry] || industries['real-estate'];
};