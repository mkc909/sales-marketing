/**
 * Industry Configuration System
 * Defines all service industries with their specific pain points, hooks, and messaging
 */

export interface IndustryConfig {
  id: string;
  name: string;
  namePlural: string;
  category: 'trade' | 'healthcare' | 'food' | 'professional' | 'real-estate';

  // SEO & Meta
  keywords: string[];
  description: string;

  // Messaging
  headline: {
    es: string;
    en: string;
  };
  subheadline: {
    es: string;
    en: string;
  };
  painPoints: {
    es: string[];
    en: string[];
  };

  // Visual
  icon: string; // Lucide icon name
  primaryColor: string;
  image?: string;

  // Features to highlight
  features: string[];

  // Pricing sweet spot
  avgJobValue: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';

  // Lead form customization
  leadFormFields: string[];

  // Common services
  services: {
    id: string;
    name: { es: string; en: string };
    priceRange: string;
  }[];
}

export const industries: Record<string, IndustryConfig> = {
  // ============================================
  // REAL ESTATE (Gateway Strategy)
  // ============================================
  'real-estate-agent': {
    id: 'real-estate-agent',
    name: 'Real Estate Agent',
    namePlural: 'Real Estate Agents',
    category: 'real-estate',
    keywords: ['realtor', 'real estate', 'property', 'homes', 'buying', 'selling'],
    description: 'Professional real estate agent for buying and selling properties',

    headline: {
      es: "Tu Agente de Confianza en Puerto Rico",
      en: "Your Trusted Real Estate Professional"
    },
    subheadline: {
      es: "Conecta directo, sin intermediarios. Respuesta en minutos.",
      en: "Direct connection, no middlemen. Response in minutes."
    },
    painPoints: {
      es: [
        "Clientes contactan agentes random en Zillow",
        "Pierdes leads por responder tarde",
        "Tu experiencia no se destaca online"
      ],
      en: [
        "Clients contact random Zillow agents",
        "Losing leads to faster responses",
        "Your expertise doesn't show online"
      ]
    },

    icon: 'Home',
    primaryColor: '#2563eb',
    features: ['instant-contact', 'reviews', 'vendor-network', 'area-expertise'],
    avgJobValue: 15000, // Commission
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'email', 'buying_or_selling', 'timeline', 'area'],

    services: [
      {
        id: 'buyer-rep',
        name: { es: 'Representación de Comprador', en: 'Buyer Representation' },
        priceRange: '3% commission'
      },
      {
        id: 'seller-rep',
        name: { es: 'Venta de Propiedad', en: 'Property Selling' },
        priceRange: '4-6% commission'
      },
      {
        id: 'consultation',
        name: { es: 'Consulta Gratuita', en: 'Free Consultation' },
        priceRange: 'Free'
      }
    ]
  },

  // ============================================
  // TRADE SERVICES
  // ============================================
  'plumber': {
    id: 'plumber',
    name: 'Plumber',
    namePlural: 'Plumbers',
    category: 'trade',
    keywords: ['plumber', 'plumbing', 'leak', 'pipe', 'drain', 'water', 'emergency'],
    description: 'Professional plumbing services for residential and commercial properties',

    headline: {
      es: "Plomero de Emergencia - Llegamos Rápido",
      en: "Emergency Plumber - Fast Response"
    },
    subheadline: {
      es: "Tu plomero encuentra tu casa sin llamadas confusas",
      en: "Your plumber finds your home without confusing calls"
    },
    painPoints: {
      es: [
        "El plomero se pierde y la fuga empeora",
        "Explicar la ubicación mientras el agua sube",
        "Cancelaciones por no encontrar la dirección"
      ],
      en: [
        "Plumber gets lost while leak gets worse",
        "Explaining directions while water rises",
        "Cancellations due to address confusion"
      ]
    },

    icon: 'Wrench',
    primaryColor: '#3b82f6',
    features: ['emergency-service', 'gate-photos', 'real-time-tracking', 'instant-quote'],
    avgJobValue: 350,
    urgencyLevel: 'emergency',
    leadFormFields: ['name', 'phone', 'emergency', 'problem_type', 'property_type'],

    services: [
      {
        id: 'leak-repair',
        name: { es: 'Reparación de Fugas', en: 'Leak Repair' },
        priceRange: '$150-$500'
      },
      {
        id: 'drain-cleaning',
        name: { es: 'Destape de Tuberías', en: 'Drain Cleaning' },
        priceRange: '$100-$300'
      },
      {
        id: 'water-heater',
        name: { es: 'Calentador de Agua', en: 'Water Heater' },
        priceRange: '$800-$3000'
      },
      {
        id: 'emergency',
        name: { es: 'Emergencia 24/7', en: '24/7 Emergency' },
        priceRange: 'Call for pricing'
      }
    ]
  },

  'electrician': {
    id: 'electrician',
    name: 'Electrician',
    namePlural: 'Electricians',
    category: 'trade',
    keywords: ['electrician', 'electrical', 'power', 'wiring', 'outlet', 'breaker'],
    description: 'Licensed electrical services and emergency repairs',

    headline: {
      es: "Electricista Certificado - Servicio Seguro",
      en: "Licensed Electrician - Safe & Reliable"
    },
    subheadline: {
      es: "Llegamos antes de que te quedes sin luz",
      en: "We arrive before you're left in the dark"
    },
    painPoints: {
      es: [
        "Sin luz y el técnico perdido",
        "Direcciones confusas = servicio retrasado",
        "Múltiples llamadas para guiar al técnico"
      ],
      en: [
        "Power out and technician lost",
        "Confusing directions = delayed service",
        "Multiple calls to guide technician"
      ]
    },

    icon: 'Zap',
    primaryColor: '#f59e0b',
    features: ['licensed-insured', 'emergency-service', 'gate-photos', 'upfront-pricing'],
    avgJobValue: 425,
    urgencyLevel: 'high',
    leadFormFields: ['name', 'phone', 'emergency', 'electrical_issue', 'property_type'],

    services: [
      {
        id: 'panel-upgrade',
        name: { es: 'Actualización de Panel', en: 'Panel Upgrade' },
        priceRange: '$1500-$3000'
      },
      {
        id: 'outlet-repair',
        name: { es: 'Reparación de Tomas', en: 'Outlet Repair' },
        priceRange: '$100-$200'
      },
      {
        id: 'emergency-repair',
        name: { es: 'Reparación de Emergencia', en: 'Emergency Repair' },
        priceRange: '$200-$800'
      }
    ]
  },

  'hvac': {
    id: 'hvac',
    name: 'HVAC Technician',
    namePlural: 'HVAC Technicians',
    category: 'trade',
    keywords: ['hvac', 'air conditioning', 'ac', 'heating', 'cooling', 'maintenance'],
    description: 'Heating, ventilation, and air conditioning services',

    headline: {
      es: "Técnico de Aires - Frío Garantizado",
      en: "HVAC Expert - Cool Comfort Guaranteed"
    },
    subheadline: {
      es: "Tu AC se arregla hoy, sin demoras por direcciones",
      en: "AC fixed today, no delays from directions"
    },
    painPoints: {
      es: [
        "Calor insoportable mientras buscan tu casa",
        "Técnico en el barrio equivocado",
        "Citas perdidas por confusión de dirección"
      ],
      en: [
        "Sweltering heat while they find your home",
        "Technician in wrong neighborhood",
        "Missed appointments from address confusion"
      ]
    },

    icon: 'Wind',
    primaryColor: '#06b6d4',
    features: ['same-day-service', 'maintenance-plans', 'emergency-service', 'warranty'],
    avgJobValue: 550,
    urgencyLevel: 'high',
    leadFormFields: ['name', 'phone', 'ac_type', 'issue', 'urgency'],

    services: [
      {
        id: 'ac-repair',
        name: { es: 'Reparación de AC', en: 'AC Repair' },
        priceRange: '$200-$1500'
      },
      {
        id: 'ac-installation',
        name: { es: 'Instalación de AC', en: 'AC Installation' },
        priceRange: '$2500-$7000'
      },
      {
        id: 'maintenance',
        name: { es: 'Mantenimiento', en: 'Maintenance' },
        priceRange: '$150-$300'
      }
    ]
  },

  'roofer': {
    id: 'roofer',
    name: 'Roofer',
    namePlural: 'Roofers',
    category: 'trade',
    keywords: ['roofer', 'roofing', 'leak', 'shingles', 'repair', 'hurricane'],
    description: 'Professional roofing services and emergency repairs',

    headline: {
      es: "Techero Profesional - Protege Tu Hogar",
      en: "Professional Roofer - Protect Your Home"
    },
    subheadline: {
      es: "Reparamos filtraciones sin perder tiempo buscando",
      en: "Fix leaks without wasting time searching"
    },
    painPoints: {
      es: [
        "Lluvia entrando mientras buscan la casa",
        "Inspector no encuentra la propiedad",
        "Estimados retrasados por direcciones malas"
      ],
      en: [
        "Rain coming in while they search",
        "Inspector can't find property",
        "Estimates delayed by bad directions"
      ]
    },

    icon: 'Home',
    primaryColor: '#dc2626',
    features: ['free-inspection', 'insurance-claims', 'hurricane-certified', 'warranty'],
    avgJobValue: 5000,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'roof_type', 'age', 'issue', 'insurance_claim'],

    services: [
      {
        id: 'repair',
        name: { es: 'Reparación de Techo', en: 'Roof Repair' },
        priceRange: '$500-$3000'
      },
      {
        id: 'replacement',
        name: { es: 'Reemplazo Completo', en: 'Full Replacement' },
        priceRange: '$8000-$20000'
      },
      {
        id: 'inspection',
        name: { es: 'Inspección Gratis', en: 'Free Inspection' },
        priceRange: 'Free'
      }
    ]
  },

  'landscaper': {
    id: 'landscaper',
    name: 'Landscaper',
    namePlural: 'Landscapers',
    category: 'trade',
    keywords: ['landscaper', 'landscaping', 'lawn', 'garden', 'maintenance', 'trees'],
    description: 'Professional landscaping and lawn maintenance services',

    headline: {
      es: "Jardinero Profesional - Tu Patio Perfecto",
      en: "Professional Landscaper - Perfect Yard"
    },
    subheadline: {
      es: "Mantenimiento regular sin confusión de direcciones",
      en: "Regular maintenance without address confusion"
    },
    painPoints: {
      es: [
        "Jardinero nuevo cada vez porque se pierden",
        "Servicio irregular por problemas de ubicación",
        "Cotizaciones sin poder ver la propiedad"
      ],
      en: [
        "New landscaper each time due to getting lost",
        "Irregular service from location issues",
        "Quotes without finding the property"
      ]
    },

    icon: 'Trees',
    primaryColor: '#16a34a',
    features: ['weekly-service', 'before-after-photos', 'eco-friendly', 'free-quote'],
    avgJobValue: 150,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'property_size', 'service_frequency', 'special_requests'],

    services: [
      {
        id: 'maintenance',
        name: { es: 'Mantenimiento Semanal', en: 'Weekly Maintenance' },
        priceRange: '$100-$300/mo'
      },
      {
        id: 'design',
        name: { es: 'Diseño de Jardín', en: 'Garden Design' },
        priceRange: '$500-$5000'
      },
      {
        id: 'tree-service',
        name: { es: 'Servicio de Árboles', en: 'Tree Service' },
        priceRange: '$200-$2000'
      }
    ]
  },

  'pool-service': {
    id: 'pool-service',
    name: 'Pool Service',
    namePlural: 'Pool Services',
    category: 'trade',
    keywords: ['pool', 'swimming', 'maintenance', 'cleaning', 'chemical', 'repair'],
    description: 'Pool maintenance, cleaning, and repair services',

    headline: {
      es: "Servicio de Piscinas - Agua Cristalina",
      en: "Pool Service - Crystal Clear Water"
    },
    subheadline: {
      es: "Mantenimiento confiable, llegamos cada semana",
      en: "Reliable maintenance, we arrive every week"
    },
    painPoints: {
      es: [
        "Técnico no encuentra la entrada trasera",
        "Servicio inconsistente por confusión",
        "Piscina verde esperando al técnico perdido"
      ],
      en: [
        "Tech can't find back entrance",
        "Inconsistent service from confusion",
        "Green pool waiting for lost tech"
      ]
    },

    icon: 'Waves',
    primaryColor: '#0891b2',
    features: ['weekly-service', 'chemical-balance', 'equipment-repair', 'opening-closing'],
    avgJobValue: 200,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'pool_type', 'pool_size', 'current_condition'],

    services: [
      {
        id: 'weekly-cleaning',
        name: { es: 'Limpieza Semanal', en: 'Weekly Cleaning' },
        priceRange: '$150-$300/mo'
      },
      {
        id: 'chemical-balance',
        name: { es: 'Balance Químico', en: 'Chemical Balance' },
        priceRange: '$75-$150'
      },
      {
        id: 'equipment-repair',
        name: { es: 'Reparación de Equipos', en: 'Equipment Repair' },
        priceRange: '$200-$1000'
      }
    ]
  },

  // ============================================
  // HEALTHCARE & WELLNESS
  // ============================================
  'home-healthcare': {
    id: 'home-healthcare',
    name: 'Home Healthcare',
    namePlural: 'Home Healthcare Providers',
    category: 'healthcare',
    keywords: ['nurse', 'healthcare', 'medical', 'elderly', 'care', 'therapy'],
    description: 'Professional home healthcare and nursing services',

    headline: {
      es: "Cuidado Médico en Casa - Profesional y Puntual",
      en: "Home Healthcare - Professional & Punctual"
    },
    subheadline: {
      es: "La enfermera llega directo, sin stress para el paciente",
      en: "Nurse arrives directly, no stress for patient"
    },
    painPoints: {
      es: [
        "Paciente ansioso esperando enfermera perdida",
        "Familiares dando direcciones constantemente",
        "Visitas perdidas por no encontrar casa"
      ],
      en: [
        "Anxious patient waiting for lost nurse",
        "Family constantly giving directions",
        "Missed visits from not finding home"
      ]
    },

    icon: 'Heart',
    primaryColor: '#ef4444',
    features: ['licensed-nurses', 'medication-management', 'therapy-services', 'insurance'],
    avgJobValue: 150,
    urgencyLevel: 'high',
    leadFormFields: ['name', 'phone', 'patient_name', 'care_type', 'frequency', 'insurance'],

    services: [
      {
        id: 'nursing-care',
        name: { es: 'Cuidado de Enfermería', en: 'Nursing Care' },
        priceRange: '$50-$150/visit'
      },
      {
        id: 'therapy',
        name: { es: 'Terapia Física', en: 'Physical Therapy' },
        priceRange: '$75-$200/session'
      },
      {
        id: 'companion-care',
        name: { es: 'Acompañamiento', en: 'Companion Care' },
        priceRange: '$20-$40/hour'
      }
    ]
  },

  'mobile-vet': {
    id: 'mobile-vet',
    name: 'Mobile Veterinarian',
    namePlural: 'Mobile Veterinarians',
    category: 'healthcare',
    keywords: ['vet', 'veterinary', 'pet', 'animal', 'mobile', 'house call'],
    description: 'Veterinary care at your home',

    headline: {
      es: "Veterinario a Domicilio - Sin Stress para Tu Mascota",
      en: "Mobile Vet - No Stress for Your Pet"
    },
    subheadline: {
      es: "El veterinario llega a tu puerta, sin salir de casa",
      en: "Vet arrives at your door, no leaving home"
    },
    painPoints: {
      es: [
        "Mascota estresada esperando veterinario perdido",
        "Citas perdidas por direcciones confusas",
        "Emergencias retrasadas buscando la casa"
      ],
      en: [
        "Stressed pet waiting for lost vet",
        "Missed appointments from confusing directions",
        "Emergencies delayed finding home"
      ]
    },

    icon: 'Heart',
    primaryColor: '#8b5cf6',
    features: ['house-calls', 'emergency-service', 'vaccinations', 'pet-comfort'],
    avgJobValue: 125,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'pet_type', 'pet_age', 'reason', 'emergency'],

    services: [
      {
        id: 'wellness-exam',
        name: { es: 'Examen de Bienestar', en: 'Wellness Exam' },
        priceRange: '$75-$150'
      },
      {
        id: 'vaccinations',
        name: { es: 'Vacunas', en: 'Vaccinations' },
        priceRange: '$50-$100'
      },
      {
        id: 'emergency',
        name: { es: 'Emergencia', en: 'Emergency' },
        priceRange: '$200-$500'
      }
    ]
  },

  // ============================================
  // FOOD & DELIVERY
  // ============================================
  'food-truck': {
    id: 'food-truck',
    name: 'Food Truck',
    namePlural: 'Food Trucks',
    category: 'food',
    keywords: ['food truck', 'mobile', 'catering', 'street food', 'lunch'],
    description: 'Mobile food service and catering',

    headline: {
      es: "Food Truck - Siempre Donde Estamos",
      en: "Food Truck - Always Where We Are"
    },
    subheadline: {
      es: "Encuentra nuestra ubicación del día sin confusión",
      en: "Find today's location without confusion"
    },
    painPoints: {
      es: [
        "Clientes no encuentran ubicación del día",
        "Google Maps muestra ubicación antigua",
        "Perdiendo ventas por confusión de lugar"
      ],
      en: [
        "Customers can't find today's location",
        "Google Maps shows old location",
        "Losing sales from location confusion"
      ]
    },

    icon: 'Truck',
    primaryColor: '#f97316',
    features: ['daily-location', 'menu-updates', 'pre-orders', 'event-catering'],
    avgJobValue: 15,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'event_type', 'date', 'guest_count'],

    services: [
      {
        id: 'daily-service',
        name: { es: 'Servicio Diario', en: 'Daily Service' },
        priceRange: '$8-$15/meal'
      },
      {
        id: 'catering',
        name: { es: 'Catering para Eventos', en: 'Event Catering' },
        priceRange: '$500-$5000'
      },
      {
        id: 'private-event',
        name: { es: 'Evento Privado', en: 'Private Event' },
        priceRange: '$1000+'
      }
    ]
  },

  'catering': {
    id: 'catering',
    name: 'Catering Service',
    namePlural: 'Catering Services',
    category: 'food',
    keywords: ['catering', 'events', 'food', 'party', 'wedding', 'corporate'],
    description: 'Professional catering for events and celebrations',

    headline: {
      es: "Catering Profesional - Llegamos a Tu Evento",
      en: "Professional Catering - We Arrive at Your Event"
    },
    subheadline: {
      es: "Entrega perfecta sin confusión de ubicación",
      en: "Perfect delivery without location confusion"
    },
    painPoints: {
      es: [
        "Comida llega tarde por direcciones malas",
        "Evento esperando mientras buscan el lugar",
        "Setup retrasado por entrada equivocada"
      ],
      en: [
        "Food arrives late from bad directions",
        "Event waiting while searching for venue",
        "Setup delayed from wrong entrance"
      ]
    },

    icon: 'UtensilsCrossed',
    primaryColor: '#a855f7',
    features: ['event-planning', 'custom-menus', 'staff-service', 'equipment'],
    avgJobValue: 1500,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'event_type', 'date', 'guest_count', 'budget'],

    services: [
      {
        id: 'corporate',
        name: { es: 'Eventos Corporativos', en: 'Corporate Events' },
        priceRange: '$500-$10000'
      },
      {
        id: 'wedding',
        name: { es: 'Bodas', en: 'Weddings' },
        priceRange: '$2000-$20000'
      },
      {
        id: 'social',
        name: { es: 'Eventos Sociales', en: 'Social Events' },
        priceRange: '$300-$5000'
      }
    ]
  },

  // ============================================
  // PROFESSIONAL SERVICES
  // ============================================
  'mobile-notary': {
    id: 'mobile-notary',
    name: 'Mobile Notary',
    namePlural: 'Mobile Notaries',
    category: 'professional',
    keywords: ['notary', 'documents', 'signing', 'legal', 'mobile', 'apostille'],
    description: 'Mobile notary and document signing services',

    headline: {
      es: "Notario Móvil - Documentos a Tu Puerta",
      en: "Mobile Notary - Documents at Your Door"
    },
    subheadline: {
      es: "Llegamos puntual para tu firma importante",
      en: "Arrive on time for your important signing"
    },
    painPoints: {
      es: [
        "Cita legal retrasada por direcciones",
        "Cliente ansioso esperando notario perdido",
        "Documentos urgentes sin poder firmar"
      ],
      en: [
        "Legal appointment delayed by directions",
        "Anxious client waiting for lost notary",
        "Urgent documents unable to sign"
      ]
    },

    icon: 'FileCheck',
    primaryColor: '#0f172a',
    features: ['certified-notary', 'apostille-service', 'loan-signing', 'available-24-7'],
    avgJobValue: 75,
    urgencyLevel: 'high',
    leadFormFields: ['name', 'phone', 'document_type', 'urgency', 'location_type'],

    services: [
      {
        id: 'standard-notary',
        name: { es: 'Notarización Estándar', en: 'Standard Notarization' },
        priceRange: '$25-$50'
      },
      {
        id: 'loan-signing',
        name: { es: 'Firma de Préstamos', en: 'Loan Signing' },
        priceRange: '$100-$200'
      },
      {
        id: 'apostille',
        name: { es: 'Apostilla', en: 'Apostille' },
        priceRange: '$75-$150'
      }
    ]
  },

  'handyman': {
    id: 'handyman',
    name: 'Handyman',
    namePlural: 'Handymen',
    category: 'trade',
    keywords: ['handyman', 'repair', 'maintenance', 'fix', 'home improvement'],
    description: 'General home repair and maintenance services',

    headline: {
      es: "Handyman Profesional - Todo Lo Arreglamos",
      en: "Professional Handyman - We Fix Everything"
    },
    subheadline: {
      es: "Reparaciones rápidas sin perder tiempo buscando",
      en: "Quick repairs without wasting time searching"
    },
    painPoints: {
      es: [
        "Lista de tareas esperando mientras busca la casa",
        "Múltiples visitas por no encontrar primera vez",
        "Proyectos retrasados por confusión de dirección"
      ],
      en: [
        "Task list waiting while searching for home",
        "Multiple visits from not finding first time",
        "Projects delayed by address confusion"
      ]
    },

    icon: 'Hammer',
    primaryColor: '#ea580c',
    features: ['multi-skilled', 'small-jobs', 'same-day', 'flat-rate'],
    avgJobValue: 200,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'job_type', 'urgency', 'description'],

    services: [
      {
        id: 'general-repair',
        name: { es: 'Reparación General', en: 'General Repair' },
        priceRange: '$50-$500'
      },
      {
        id: 'assembly',
        name: { es: 'Ensamblaje', en: 'Assembly' },
        priceRange: '$50-$200'
      },
      {
        id: 'painting',
        name: { es: 'Pintura', en: 'Painting' },
        priceRange: '$200-$1000'
      }
    ]
  },

  'pest-control': {
    id: 'pest-control',
    name: 'Pest Control',
    namePlural: 'Pest Control Services',
    category: 'trade',
    keywords: ['pest', 'exterminator', 'bugs', 'termites', 'rodents', 'fumigation'],
    description: 'Professional pest control and extermination services',

    headline: {
      es: "Control de Plagas - Eliminación Garantizada",
      en: "Pest Control - Guaranteed Elimination"
    },
    subheadline: {
      es: "Llegamos rápido, las plagas desaparecen más rápido",
      en: "We arrive fast, pests disappear faster"
    },
    painPoints: {
      es: [
        "Infestación empeora mientras buscan la casa",
        "Servicio mensual irregular por direcciones",
        "Inspección retrasada por no encontrar propiedad"
      ],
      en: [
        "Infestation worsens while finding home",
        "Irregular monthly service from directions",
        "Inspection delayed from not finding property"
      ]
    },

    icon: 'Bug',
    primaryColor: '#991b1b',
    features: ['eco-friendly', 'pet-safe', 'guaranteed-results', 'monthly-service'],
    avgJobValue: 150,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'pest_type', 'severity', 'property_size'],

    services: [
      {
        id: 'general-pest',
        name: { es: 'Control General', en: 'General Pest Control' },
        priceRange: '$75-$200'
      },
      {
        id: 'termites',
        name: { es: 'Termitas', en: 'Termites' },
        priceRange: '$500-$2000'
      },
      {
        id: 'monthly',
        name: { es: 'Servicio Mensual', en: 'Monthly Service' },
        priceRange: '$50-$100/mo'
      }
    ]
  },

  // ============================================
  // ADDITIONAL PROFESSIONAL SERVICES
  // ============================================
  'attorney': {
    id: 'attorney',
    name: 'Attorney',
    namePlural: 'Attorneys',
    category: 'professional',
    keywords: ['attorney', 'lawyer', 'legal', 'law', 'consultation', 'representation'],
    description: 'Professional legal services and consultation',

    headline: {
      es: "Abogado Profesional - Asesoría Legal Experta",
      en: "Professional Attorney - Expert Legal Counsel"
    },
    subheadline: {
      es: "Consultas legales directas, respuesta inmediata",
      en: "Direct legal consultations, immediate response"
    },
    painPoints: {
      es: [
        "Dificultad para encontrar abogado especializado",
        "Consultas caras sin compromiso",
        "Procesos legales sin claridad de costos"
      ],
      en: [
        "Difficulty finding specialized attorney",
        "Expensive consultations without commitment",
        "Legal processes without cost clarity"
      ]
    },

    icon: 'Scale',
    primaryColor: '#1e40af',
    features: ['free-consultation', 'specialized-practice', 'flexible-payment', 'bilingual'],
    avgJobValue: 2500,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'email', 'legal_issue', 'urgency'],

    services: [
      {
        id: 'consultation',
        name: { es: 'Consulta Inicial', en: 'Initial Consultation' },
        priceRange: '$100-$300'
      },
      {
        id: 'family-law',
        name: { es: 'Derecho Familiar', en: 'Family Law' },
        priceRange: '$1500-$10000'
      },
      {
        id: 'real-estate-law',
        name: { es: 'Derecho Inmobiliario', en: 'Real Estate Law' },
        priceRange: '$500-$5000'
      }
    ]
  },

  'insurance-agent': {
    id: 'insurance-agent',
    name: 'Insurance Agent',
    namePlural: 'Insurance Agents',
    category: 'professional',
    keywords: ['insurance', 'coverage', 'policy', 'auto', 'home', 'life', 'health'],
    description: 'Insurance coverage and policy consultation',

    headline: {
      es: "Agente de Seguros - Protección Completa",
      en: "Insurance Agent - Complete Protection"
    },
    subheadline: {
      es: "Compara pólizas y ahorra sin intermediarios",
      en: "Compare policies and save without middlemen"
    },
    painPoints: {
      es: [
        "Pólizas confusas y sobreprecio",
        "Agentes que no responden rápido",
        "Dificultad comparando opciones"
      ],
      en: [
        "Confusing policies and overpricing",
        "Agents who don't respond quickly",
        "Difficulty comparing options"
      ]
    },

    icon: 'Shield',
    primaryColor: '#059669',
    features: ['multi-carrier', 'free-quotes', 'bilingual-service', 'claims-support'],
    avgJobValue: 1200,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'email', 'insurance_type', 'current_coverage'],

    services: [
      {
        id: 'auto-insurance',
        name: { es: 'Seguro de Auto', en: 'Auto Insurance' },
        priceRange: '$500-$3000/year'
      },
      {
        id: 'home-insurance',
        name: { es: 'Seguro de Hogar', en: 'Home Insurance' },
        priceRange: '$800-$5000/year'
      },
      {
        id: 'life-insurance',
        name: { es: 'Seguro de Vida', en: 'Life Insurance' },
        priceRange: '$300-$2000/year'
      }
    ]
  },

  'mortgage-broker': {
    id: 'mortgage-broker',
    name: 'Mortgage Broker',
    namePlural: 'Mortgage Brokers',
    category: 'professional',
    keywords: ['mortgage', 'loan', 'refinance', 'home loan', 'pre-approval', 'financing'],
    description: 'Mortgage financing and loan services',

    headline: {
      es: "Corredor de Hipotecas - Tasas Bajas Garantizadas",
      en: "Mortgage Broker - Low Rates Guaranteed"
    },
    subheadline: {
      es: "Pre-aprobación en 24 horas, cierre rápido",
      en: "Pre-approval in 24 hours, fast closing"
    },
    painPoints: {
      es: [
        "Proceso de aprobación lento",
        "Tasas de interés altas",
        "Documentación confusa"
      ],
      en: [
        "Slow approval process",
        "High interest rates",
        "Confusing documentation"
      ]
    },

    icon: 'Home',
    primaryColor: '#dc2626',
    features: ['multiple-lenders', 'fast-approval', 'low-rates', 'spanish-support'],
    avgJobValue: 5000,
    urgencyLevel: 'medium',
    leadFormFields: ['name', 'phone', 'email', 'loan_type', 'loan_amount', 'credit_score'],

    services: [
      {
        id: 'purchase-loan',
        name: { es: 'Préstamo de Compra', en: 'Purchase Loan' },
        priceRange: '2.5-4% fee'
      },
      {
        id: 'refinance',
        name: { es: 'Refinanciamiento', en: 'Refinance' },
        priceRange: '1-3% fee'
      },
      {
        id: 'pre-approval',
        name: { es: 'Pre-aprobación', en: 'Pre-Approval' },
        priceRange: 'Free'
      }
    ]
  },

  'financial-advisor': {
    id: 'financial-advisor',
    name: 'Financial Advisor',
    namePlural: 'Financial Advisors',
    category: 'professional',
    keywords: ['financial', 'advisor', 'investment', 'retirement', 'wealth', 'planning'],
    description: 'Financial planning and investment advisory services',

    headline: {
      es: "Asesor Financiero - Planifica Tu Futuro",
      en: "Financial Advisor - Plan Your Future"
    },
    subheadline: {
      es: "Inversiones inteligentes, retiro seguro",
      en: "Smart investments, secure retirement"
    },
    painPoints: {
      es: [
        "No sabes dónde invertir",
        "Planes de retiro confusos",
        "Falta de asesoría personalizada"
      ],
      en: [
        "Don't know where to invest",
        "Confusing retirement plans",
        "Lack of personalized advice"
      ]
    },

    icon: 'TrendingUp',
    primaryColor: '#f59e0b',
    features: ['personalized-plans', 'retirement-planning', 'investment-management', 'tax-optimization'],
    avgJobValue: 3000,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'email', 'investment_amount', 'goals', 'timeline'],

    services: [
      {
        id: 'financial-plan',
        name: { es: 'Plan Financiero', en: 'Financial Plan' },
        priceRange: '$500-$2000'
      },
      {
        id: 'investment-management',
        name: { es: 'Gestión de Inversiones', en: 'Investment Management' },
        priceRange: '1% AUM'
      },
      {
        id: 'retirement-planning',
        name: { es: 'Planificación de Retiro', en: 'Retirement Planning' },
        priceRange: '$1000-$5000'
      }
    ]
  },

  'accountant': {
    id: 'accountant',
    name: 'Accountant',
    namePlural: 'Accountants',
    category: 'professional',
    keywords: ['accountant', 'cpa', 'taxes', 'bookkeeping', 'audit', 'payroll'],
    description: 'Accounting, tax preparation, and bookkeeping services',

    headline: {
      es: "Contador Certificado - Maximiza Tu Reembolso",
      en: "Certified Accountant - Maximize Your Refund"
    },
    subheadline: {
      es: "Preparación de taxes profesional, sin sorpresas",
      en: "Professional tax preparation, no surprises"
    },
    painPoints: {
      es: [
        "Preparación de taxes estresante",
        "Miedo al IRS por errores",
        "Deducciones perdidas"
      ],
      en: [
        "Stressful tax preparation",
        "Fear of IRS from errors",
        "Lost deductions"
      ]
    },

    icon: 'Calculator',
    primaryColor: '#0f172a',
    features: ['tax-preparation', 'audit-support', 'year-round-service', 'e-filing'],
    avgJobValue: 500,
    urgencyLevel: 'high',
    leadFormFields: ['name', 'phone', 'email', 'service_type', 'business_or_personal'],

    services: [
      {
        id: 'tax-prep',
        name: { es: 'Preparación de Planillas', en: 'Tax Preparation' },
        priceRange: '$150-$800'
      },
      {
        id: 'bookkeeping',
        name: { es: 'Contabilidad', en: 'Bookkeeping' },
        priceRange: '$200-$1000/mo'
      },
      {
        id: 'audit-support',
        name: { es: 'Apoyo de Auditoría', en: 'Audit Support' },
        priceRange: '$500-$3000'
      }
    ]
  },

  'general-contractor': {
    id: 'general-contractor',
    name: 'General Contractor',
    namePlural: 'General Contractors',
    category: 'trade',
    keywords: ['contractor', 'construction', 'remodeling', 'renovation', 'building', 'permit'],
    description: 'General contracting and construction services',

    headline: {
      es: "Contratista General - Proyectos Completos",
      en: "General Contractor - Complete Projects"
    },
    subheadline: {
      es: "Desde permisos hasta entrega, sin complicaciones",
      en: "From permits to delivery, hassle-free"
    },
    painPoints: {
      es: [
        "Proyectos sin terminar o retrasados",
        "Sobrecostos inesperados",
        "Contratistas sin licencia"
      ],
      en: [
        "Unfinished or delayed projects",
        "Unexpected cost overruns",
        "Unlicensed contractors"
      ]
    },

    icon: 'HardHat',
    primaryColor: '#ea580c',
    features: ['licensed-insured', 'project-management', 'warranty', 'financing-options'],
    avgJobValue: 25000,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'email', 'project_type', 'budget', 'timeline'],

    services: [
      {
        id: 'remodeling',
        name: { es: 'Remodelación', en: 'Remodeling' },
        priceRange: '$10000-$100000'
      },
      {
        id: 'addition',
        name: { es: 'Expansión', en: 'Addition' },
        priceRange: '$50000-$300000'
      },
      {
        id: 'new-construction',
        name: { es: 'Construcción Nueva', en: 'New Construction' },
        priceRange: '$200000+'
      }
    ]
  },

  'cleaning-service': {
    id: 'cleaning-service',
    name: 'Cleaning Service',
    namePlural: 'Cleaning Services',
    category: 'trade',
    keywords: ['cleaning', 'maid', 'housekeeping', 'janitorial', 'deep clean', 'move-out'],
    description: 'Professional residential and commercial cleaning',

    headline: {
      es: "Servicio de Limpieza - Casa Impecable",
      en: "Cleaning Service - Spotless Home"
    },
    subheadline: {
      es: "Limpieza profunda sin perder tiempo buscando",
      en: "Deep cleaning without wasting time searching"
    },
    painPoints: {
      es: [
        "Personal de limpieza no llega",
        "Servicio irregular por confusión de dirección",
        "Falta de confianza en nuevos servicios"
      ],
      en: [
        "Cleaning crew doesn't arrive",
        "Irregular service from address confusion",
        "Lack of trust in new services"
      ]
    },

    icon: 'Sparkles',
    primaryColor: '#06b6d4',
    features: ['background-checked', 'eco-friendly-products', 'flexible-schedule', 'satisfaction-guarantee'],
    avgJobValue: 150,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'property_type', 'cleaning_type', 'frequency'],

    services: [
      {
        id: 'regular-cleaning',
        name: { es: 'Limpieza Regular', en: 'Regular Cleaning' },
        priceRange: '$100-$200/visit'
      },
      {
        id: 'deep-cleaning',
        name: { es: 'Limpieza Profunda', en: 'Deep Cleaning' },
        priceRange: '$200-$500'
      },
      {
        id: 'move-out',
        name: { es: 'Limpieza de Mudanza', en: 'Move-Out Cleaning' },
        priceRange: '$300-$800'
      }
    ]
  },

  'personal-trainer': {
    id: 'personal-trainer',
    name: 'Personal Trainer',
    namePlural: 'Personal Trainers',
    category: 'healthcare',
    keywords: ['fitness', 'trainer', 'workout', 'gym', 'weight loss', 'muscle gain'],
    description: 'Personal fitness training and nutrition coaching',

    headline: {
      es: "Entrenador Personal - Transforma Tu Cuerpo",
      en: "Personal Trainer - Transform Your Body"
    },
    subheadline: {
      es: "Entrenamiento personalizado en tu hogar o gimnasio",
      en: "Personalized training at your home or gym"
    },
    painPoints: {
      es: [
        "Gimnasios caros sin resultados",
        "Falta de motivación para entrenar",
        "Rutinas genéricas que no funcionan"
      ],
      en: [
        "Expensive gyms without results",
        "Lack of motivation to train",
        "Generic routines that don't work"
      ]
    },

    icon: 'Dumbbell',
    primaryColor: '#16a34a',
    features: ['customized-plans', 'nutrition-coaching', 'progress-tracking', 'flexible-location'],
    avgJobValue: 400,
    urgencyLevel: 'low',
    leadFormFields: ['name', 'phone', 'email', 'fitness_goals', 'experience_level', 'availability'],

    services: [
      {
        id: 'personal-training',
        name: { es: 'Entrenamiento Personal', en: 'Personal Training' },
        priceRange: '$50-$150/session'
      },
      {
        id: 'nutrition-plan',
        name: { es: 'Plan Nutricional', en: 'Nutrition Plan' },
        priceRange: '$100-$300/month'
      },
      {
        id: 'online-coaching',
        name: { es: 'Coaching Online', en: 'Online Coaching' },
        priceRange: '$200-$500/month'
      }
    ]
  }
};

// Helper functions
export function getIndustryConfig(industryId: string): IndustryConfig | null {
  return industries[industryId] || null;
}

export function getIndustriesByCategory(category: string): IndustryConfig[] {
  return Object.values(industries).filter(ind => ind.category === category);
}

export function getAllIndustries(): IndustryConfig[] {
  return Object.values(industries);
}

export function getIndustryKeywords(industryId: string): string[] {
  const industry = industries[industryId];
  return industry ? industry.keywords : [];
}

// SEO Helper
export function generateIndustryMetaTags(industry: IndustryConfig, city: string, isSpanish: boolean) {
  const lang = isSpanish ? 'es' : 'en';
  return {
    title: `${industry.namePlural} in ${city} | ${isSpanish ? 'PinExacto' : 'ExactPin'}`,
    description: `${isSpanish ? 'Encuentra los mejores' : 'Find the best'} ${industry.namePlural.toLowerCase()} in ${city}. ${industry.subheadline[lang]}`,
    keywords: [...industry.keywords, city.toLowerCase(), 'near me', 'local'].join(', '),

    // Open Graph
    ogTitle: `${industry.namePlural} in ${city}`,
    ogDescription: industry.subheadline[lang],
    ogType: 'website',

    // Schema.org
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${industry.namePlural} in ${city}`,
      description: industry.description,
      keywords: industry.keywords.join(', ')
    }
  };
}