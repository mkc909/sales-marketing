/**
 * Regional branding configuration for PinExacto (Puerto Rico) and TruePoint (US)
 */

export interface BrandConfig {
  name: string;
  tagline: string;
  domain: string;
  language: string;
  region: string;
  mapProvider: 'google' | 'apple' | 'waze';
  currency: string;
  currencySymbol: string;
  phoneFormat: string;
}

/**
 * Get brand configuration based on hostname or region
 */
export function getBrandConfig(hostname?: string): BrandConfig {
  // Default to TruePoint for US markets
  const defaultBrand: BrandConfig = {
    name: 'TruePoint',
    tagline: 'Precise Location, Every Time',
    domain: 'truepoint.us',
    language: 'en',
    region: 'US',
    mapProvider: 'google',
    currency: 'USD',
    currencySymbol: '$',
    phoneFormat: '(XXX) XXX-XXXX'
  };

  if (!hostname) {
    return defaultBrand;
  }

  // Puerto Rico domains
  if (hostname.includes('pinexacto') ||
      hostname.includes('.pr') ||
      hostname.includes('puerto-rico') ||
      hostname === 'localhost:3000') {
    return {
      name: 'PinExacto',
      tagline: 'Ubicación Exacta, Siempre',
      domain: 'pinexacto.pr',
      language: 'es',
      region: 'PR',
      mapProvider: 'google',
      currency: 'USD',
      currencySymbol: '$',
      phoneFormat: '(XXX) XXX-XXXX'
    };
  }

  return defaultBrand;
}

/**
 * Get localized text based on brand language
 */
export function getLocalizedText(brand: BrandConfig, key: string): string {
  const translations: Record<string, Record<string, string>> = {
    en: {
      'search.placeholder': 'Search professionals...',
      'location.near': 'Near',
      'location.getDirections': 'Get Directions',
      'location.share': 'Share Location',
      'location.navigate': 'Navigate',
      'professional.contact': 'Contact',
      'professional.viewProfile': 'View Profile',
      'professional.schedule': 'Schedule Appointment',
      'error.notFound': 'Page not found',
      'error.serverError': 'Server error occurred'
    },
    es: {
      'search.placeholder': 'Buscar profesionales...',
      'location.near': 'Cerca de',
      'location.getDirections': 'Obtener Direcciones',
      'location.share': 'Compartir Ubicación',
      'location.navigate': 'Navegar',
      'professional.contact': 'Contactar',
      'professional.viewProfile': 'Ver Perfil',
      'professional.schedule': 'Agendar Cita',
      'error.notFound': 'Página no encontrada',
      'error.serverError': 'Ocurrió un error en el servidor'
    }
  };

  return translations[brand.language]?.[key] || translations.en[key] || key;
}

/**
 * Format phone number based on brand region
 */
export function formatPhoneNumber(phone: string, brand: BrandConfig): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10) {
    return phone;
  }

  if (brand.region === 'PR' || brand.region === 'US') {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Format currency based on brand settings
 */
export function formatCurrency(amount: number, brand: BrandConfig): string {
  return new Intl.NumberFormat(brand.language === 'es' ? 'es-PR' : 'en-US', {
    style: 'currency',
    currency: brand.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get map URL based on brand provider preference
 */
export function getMapUrl(lat: number, lng: number, brand: BrandConfig, label?: string): string {
  const coords = `${lat},${lng}`;

  switch (brand.mapProvider) {
    case 'apple':
      return `maps://maps.apple.com/?q=${encodeURIComponent(label || 'Location')}&ll=${coords}`;
    case 'waze':
      return `https://waze.com/ul?ll=${coords}&navigate=yes`;
    case 'google':
    default:
      return `https://www.google.com/maps/search/?api=1&query=${coords}${label ? `&query_place_id=${encodeURIComponent(label)}` : ''}`;
  }
}

/**
 * Determine if current request is from Puerto Rico
 */
export function isPuertoRico(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  const acceptLanguage = request.headers.get('accept-language') || '';
  const cf = (request as any).cf;

  return (
    hostname.includes('pinexacto') ||
    hostname.includes('.pr') ||
    acceptLanguage.includes('es-PR') ||
    cf?.country === 'PR' ||
    cf?.timezone === 'America/Puerto_Rico'
  );
}

export default {
  getBrandConfig,
  getLocalizedText,
  formatPhoneNumber,
  formatCurrency,
  getMapUrl,
  isPuertoRico
};