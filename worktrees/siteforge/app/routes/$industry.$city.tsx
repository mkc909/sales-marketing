/**
 * Dynamic Industry Landing Pages
 * SEO-optimized pages for each industry/city combination
 * Uses native Popover API and View Transitions for premium UX
 */

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData, Form, useActionData } from "@remix-run/react";
import {
  MapPin, Phone, Clock, Star, Shield, CheckCircle,
  ChevronRight, Users, TrendingUp, MessageCircle,
  Calendar, DollarSign, Award, Zap
} from "lucide-react";

import { getIndustryConfig, generateIndustryMetaTags } from "../config/industries";
import { getBrandConfig } from "../config/theme";

// City data (would come from DB in production)
const cityData: Record<string, any> = {
  'san-juan': {
    name: 'San Juan',
    state: 'PR',
    population: 342259,
    neighborhoods: ['Condado', 'Santurce', 'Hato Rey', 'Río Piedras']
  },
  'bayamon': {
    name: 'Bayamón',
    state: 'PR',
    population: 185087,
    neighborhoods: ['Santa Rosa', 'Sierra Bayamón', 'Río Plantation']
  },
  'carolina': {
    name: 'Carolina',
    state: 'PR',
    population: 154489,
    neighborhoods: ['Isla Verde', 'Canovanillas', 'Country Club']
  },
  'ponce': {
    name: 'Ponce',
    state: 'PR',
    population: 131881,
    neighborhoods: ['La Perla del Sur', 'Portugués', 'Machuelo Abajo']
  },
  'miami': {
    name: 'Miami',
    state: 'FL',
    population: 442241,
    neighborhoods: ['Downtown', 'Brickell', 'Coral Gables', 'Coconut Grove']
  }
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Not Found' }];

  const { industry, city, brand } = data;
  const metaTags = generateIndustryMetaTags(
    industry,
    city.name,
    brand.id === 'enlacepr'
  );

  return [
    { title: metaTags.title },
    { name: 'description', content: metaTags.description },
    { name: 'keywords', content: metaTags.keywords },
    { property: 'og:title', content: metaTags.ogTitle },
    { property: 'og:description', content: metaTags.ogDescription },
    { property: 'og:type', content: metaTags.ogType }
  ];
};

export async function action({ request, params, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'quote' || action === 'contact') {
    // Extract form data
    const leadData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || '',
      message: formData.get('message') as string || '',
      service: formData.get('service') as string || '',
      businessId: formData.get('businessId') as string || '',
      industry: formData.get('industry') as string || params.industry || '',
      city: params.city || '',
      emergency: formData.get('emergency') === 'on',
      timestamp: new Date().toISOString(),
      source: action === 'quote' ? 'instant_quote' : 'contact_form'
    };

    try {
      // Store lead in D1 database
      const db = context.env.DB;
      await db.prepare(`
        INSERT INTO leads (
          name, phone, email, message, service, business_id,
          industry, city, is_emergency, source, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
      `).bind(
        leadData.name,
        leadData.phone,
        leadData.email,
        leadData.message,
        leadData.service,
        leadData.businessId,
        leadData.industry,
        leadData.city,
        leadData.emergency ? 1 : 0,
        leadData.source,
        leadData.timestamp
      ).run();

      // Queue notification (SMS/Email will be sent via API route)
      // Store in KV for async processing
      await context.env.ANALYTICS_BUFFER.put(
        `lead:${Date.now()}`,
        JSON.stringify(leadData),
        { expirationTtl: 3600 } // 1 hour expiration
      );

      // Return success response
      return json({
        success: true,
        message: action === 'quote'
          ? 'Quote request received! We\'ll contact you shortly.'
          : 'Message sent! The business will contact you soon.'
      });
    } catch (error) {
      console.error('Lead submission error:', error);
      return json({
        success: false,
        error: 'Failed to submit request. Please try again.'
      }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Invalid action' }, { status: 400 });
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { industry: industrySlug, city: citySlug } = params;

  // Get configurations
  const industry = getIndustryConfig(industrySlug || '');
  const city = cityData[citySlug || ''];
  const brand = getBrandConfig('siteforge'); // Default to EstateFlow for now

  if (!industry || !city) {
    throw new Response('Not Found', { status: 404 });
  }

  // Get ghost profiles for this industry/city (mock data for now)
  const ghostProfiles = generateMockProfiles(industry, city, 12);

  // Get stats (would come from DB)
  const stats = {
    totalBusinesses: 47,
    avgRating: 4.6,
    totalReviews: 892,
    avgResponseTime: '< 2 hours'
  };

  return json({
    industry,
    city,
    brand,
    ghostProfiles,
    stats
  });
}

// Generate mock ghost profiles
function generateMockProfiles(industry: any, city: any, count: number) {
  const profiles = [];
  const businessNames = [
    'Pro', 'Expert', 'Master', 'Premier', 'Elite',
    'Quality', 'Reliable', 'Fast', 'Affordable', '24/7'
  ];

  for (let i = 0; i < count; i++) {
    profiles.push({
      id: `ghost-${i}`,
      name: `${businessNames[i % businessNames.length]} ${industry.name}`,
      rating: 4 + Math.random(),
      reviewCount: Math.floor(Math.random() * 100) + 10,
      responseTime: '< 30 min',
      verified: Math.random() > 0.5,
      hasPin: Math.random() > 0.3,
      neighborhood: city.neighborhoods[i % city.neighborhoods.length],
      services: industry.services.slice(0, 3),
      leadsCaptured: Math.floor(Math.random() * 10) + 1
    });
  }

  return profiles;
}

export default function IndustryLandingPage() {
  const { industry, city, brand, ghostProfiles, stats } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const isEnlacePR = brand.id === 'enlacepr';

  // Dynamic icon component based on industry
  const IconComponent = (() => {
    switch (industry.icon) {
      case 'Home': return Home;
      case 'Wrench': return Wrench;
      case 'Zap': return Zap;
      default: return MapPin;
    }
  })();

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Native Popover Styles */
        [popover] {
          margin: auto;
          border: none;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: min(90vw, 500px);
          background: white;
        }

        [popover]::backdrop {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        /* Smooth transitions for popover */
        [popover],
        [popover]::backdrop {
          transition: opacity 0.25s, display 0.25s allow-discrete;
        }

        /* View Transitions */
        .profile-card {
          view-transition-name: var(--profile-id);
          contain: layout;
        }

        .profile-header {
          view-transition-name: var(--profile-id);
        }

        /* Smooth morph between states */
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation-duration: 0.3s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}} />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center">
            {/* Industry Icon */}
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6`}
              style={{ backgroundColor: industry.primaryColor }}>
              <IconComponent className="w-10 h-10 text-white" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              {industry.headline[isEnlacePR ? 'es' : 'en']}
              <span className="block text-2xl lg:text-3xl mt-3 font-normal">
                {isEnlacePR ? 'en' : 'in'} {city.name}, {city.state}
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              {industry.subheadline[isEnlacePR ? 'es' : 'en']}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                popovertarget="instant-quote"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-2xl"
              >
                <Phone className="w-5 h-5" />
                {isEnlacePR ? 'Cotización Instantánea' : 'Instant Quote'}
                <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="#providers"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                {isEnlacePR ? `Ver ${stats.totalBusinesses} Proveedores` : `View ${stats.totalBusinesses} Providers`}
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalBusinesses}</div>
                <div className="text-sm text-white/80">
                  {isEnlacePR ? 'Negocios Verificados' : 'Verified Businesses'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">⭐ {stats.avgRating}</div>
                <div className="text-sm text-white/80">
                  {isEnlacePR ? 'Calificación Promedio' : 'Average Rating'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalReviews}</div>
                <div className="text-sm text-white/80">
                  {isEnlacePR ? 'Reseñas Reales' : 'Real Reviews'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.avgResponseTime}</div>
                <div className="text-sm text-white/80">
                  {isEnlacePR ? 'Tiempo de Respuesta' : 'Response Time'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {isEnlacePR ? '¿Te Suena Familiar?' : 'Sound Familiar?'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {industry.painPoints[isEnlacePR ? 'es' : 'en'].map((pain, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-gray-700">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers Directory */}
      <section id="providers" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {isEnlacePR
                ? `${industry.namePlural} en ${city.name}`
                : `${industry.namePlural} in ${city.name}`}
            </h2>
            <p className="text-xl text-gray-600">
              {isEnlacePR
                ? 'Profesionales verificados con ubicación exacta'
                : 'Verified professionals with exact locations'}
            </p>
          </div>

          {/* Ghost Profiles Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ghostProfiles.map((profile) => (
              <div
                key={profile.id}
                className="profile-card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6"
                style={{ '--profile-id': profile.id } as React.CSSProperties}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {profile.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {profile.neighborhood}, {city.name}
                    </p>
                  </div>
                  {profile.verified && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(profile.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {profile.rating.toFixed(1)} ({profile.reviewCount})
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {profile.responseTime}
                  </div>
                  {profile.hasPin && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <MapPin className="w-4 h-4" />
                      {isEnlacePR ? 'Pin Exacto' : 'Exact Pin'}
                    </div>
                  )}
                </div>

                {/* Services Preview */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    {isEnlacePR ? 'Servicios' : 'Services'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {profile.services.slice(0, 2).map((service, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {service.name[isEnlacePR ? 'es' : 'en']}
                      </span>
                    ))}
                    {profile.services.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{profile.services.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lead Trap */}
                {profile.leadsCaptured > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">{profile.leadsCaptured}</span>
                      {isEnlacePR
                        ? ' personas buscaron este negocio'
                        : ' people looked for this business'}
                    </p>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    popovertarget={`contact-${profile.id}`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isEnlacePR ? 'Contactar' : 'Contact'}
                  </button>
                  <Link
                    to={`/business/${profile.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors text-center"
                  >
                    {isEnlacePR ? 'Ver Perfil' : 'View Profile'}
                  </Link>
                </div>

                {/* Contact Popover */}
                <div id={`contact-${profile.id}`} popover="auto">
                  <h2 className="text-xl font-bold mb-4">
                    {isEnlacePR ? `Contactar ${profile.name}` : `Contact ${profile.name}`}
                  </h2>
                  <Form method="post" className="space-y-4">
                    <input type="hidden" name="businessId" value={profile.id} />
                    <input type="hidden" name="action" value="contact" />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isEnlacePR ? 'Nombre' : 'Name'}
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isEnlacePR ? 'Teléfono' : 'Phone'}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isEnlacePR ? '¿Qué necesitas?' : 'What do you need?'}
                      </label>
                      <textarea
                        name="message"
                        rows={3}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                      >
                        {isEnlacePR ? 'Enviar Mensaje' : 'Send Message'}
                      </button>
                      <button
                        type="button"
                        popovertarget={`contact-${profile.id}`}
                        popovertargetaction="hide"
                        className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
                      >
                        {isEnlacePR ? 'Cerrar' : 'Close'}
                      </button>
                    </div>
                  </Form>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
              {isEnlacePR ? 'Ver Más Negocios' : 'View More Businesses'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Business Owner CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {isEnlacePR
              ? `¿Eres ${industry.name} en ${city.name}?`
              : `Are you a ${industry.name} in ${city.name}?`}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {isEnlacePR
              ? 'Clientes te están buscando ahora mismo. Reclama tu perfil gratis.'
              : 'Customers are looking for you right now. Claim your profile for free.'}
          </p>
          <Link
            to="/business/claim"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl"
          >
            <Award className="w-6 h-6" />
            {isEnlacePR ? 'Reclamar Mi Negocio Gratis' : 'Claim My Business Free'}
            <ChevronRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Instant Quote Popover */}
      <div id="instant-quote" popover="auto">
        <h2 className="text-2xl font-bold mb-4">
          {isEnlacePR ? 'Cotización Instantánea' : 'Instant Quote'}
        </h2>
        <p className="text-gray-600 mb-6">
          {isEnlacePR
            ? `Conectamos con ${industry.namePlural.toLowerCase()} disponibles ahora`
            : `We'll connect you with available ${industry.namePlural.toLowerCase()}`}
        </p>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="action" value="quote" />
          <input type="hidden" name="industry" value={industry.id} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEnlacePR ? 'Nombre' : 'Name'}
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEnlacePR ? 'Teléfono' : 'Phone'}
            </label>
            <input
              type="tel"
              name="phone"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEnlacePR ? 'Servicio Necesario' : 'Service Needed'}
            </label>
            <select
              name="service"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isEnlacePR ? 'Seleccionar...' : 'Select...'}</option>
              {industry.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name[isEnlacePR ? 'es' : 'en']} - {service.priceRange}
                </option>
              ))}
            </select>
          </div>

          {industry.urgencyLevel === 'emergency' && (
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="emergency" className="w-4 h-4" />
                <span className="text-sm font-medium text-red-600">
                  {isEnlacePR ? 'Es una emergencia' : 'This is an emergency'}
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              {isEnlacePR ? 'Obtener Cotización' : 'Get Quote'}
            </button>
            <button
              type="button"
              popovertarget="instant-quote"
              popovertargetaction="hide"
              className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
            >
              {isEnlacePR ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </Form>
      </div>
    </>
  );
}

// Missing icon imports
function Home(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function Wrench(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
  );
}

function X(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}