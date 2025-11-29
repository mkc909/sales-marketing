/**
 * EstateFlow / PinExacto / TruePoint Landing Page
 * Multi-brand entry point with AEO and Analytics
 */

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import {
  MapPin, Check, ChevronRight, Star,
  Home, Truck, Store, Building, Phone,
  Search, Shield, Users, TrendingUp,
  Briefcase, Scale, Calculator, Hammer
} from "lucide-react";
import { getBrandConfig } from "~/config/theme";
import { Analytics } from "~/lib/posthog";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const brand = data?.brand;
  const title = brand?.id === 'siteforge'
    ? "EstateFlow - Find Top Real Estate Agents & Professionals"
    : brand?.messaging.hero + " | " + brand?.name;

  const description = brand?.id === 'siteforge'
    ? "Connect with verified local experts in Real Estate, Law, Insurance, and more. Compare profiles, read reviews, and get free quotes."
    : brand?.messaging.subhero;

  return [
    { title },
    { name: "description", content: description },
    // AEO: Structured Data for Organization
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brand?.name,
        "url": `https://${brand?.domain}`,
        "logo": `https://${brand?.domain}/logo.png`,
        "description": description,
        "sameAs": [
          "https://twitter.com/" + brand?.name,
          "https://facebook.com/" + brand?.name
        ]
      }
    }
  ];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  // 1. Identify Brand
  const brandId = context.tenant?.brand || 'siteforge'; // Default to EstateFlow
  const brand = getBrandConfig(brandId);

  // 2. Initialize Analytics & Feature Flags
  const analytics = new Analytics(context);
  // Mock user ID for now, in prod this comes from session
  const userId = 'anon_' + Date.now();
  const flags = await analytics.getFeatureFlags(userId);

  // 3. Track Page View
  context.waitUntil(analytics.trackNavigation({
    id: 'home_page',
    pinType: 'landing',
    category: 'system'
  }, userId, 'browser'));

  // 4. Get Stats (Mock for now, replace with DB call)
  const stats = {
    totalPins: 15234,
    totalDeliveries: 45678,
    businessesJoined: 1234,
    avgTimeSaved: 12,
    activeProfessionals: 835000,
    industries: 6
  };

  return json({ brand, stats, flags });
}

export default function Index() {
  const { brand, stats, flags } = useLoaderData<typeof loader>();
  const isPinExacto = brand.id === 'enlacepr';
  const isEstateFlow = brand.id === 'siteforge';

  // --- ESTATEFLOW MARKETPLACE VIEW ---
  if (isEstateFlow) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Hero Section */}
        <section className="relative bg-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32">
            <div className="text-center max-w-4xl mx-auto">
              {/* Feature Flag: Urgency Banner */}
              {flags.urgency_banner && (
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-sm text-blue-700 mb-8 animate-fade-in">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Over 1,200 homeowners found a pro today
                </div>
              )}

              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
                Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Perfect Professional</span><br />
                for Your Needs
              </h1>

              <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                Connect with top-rated experts in Real Estate, Law, Insurance, and more.
                Verified reviews, clear pricing, and instant booking.
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="What service do you need?"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  />
                </div>
                <div className="sm:w-48 relative">
                  <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  />
                </div>
                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Industry Selector */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Explore Industries</h2>
              <p className="text-slate-600">Select a category to find specialized professionals</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: 'real_estate', name: 'Real Estate', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'legal', name: 'Legal', icon: Scale, color: 'text-purple-600', bg: 'bg-purple-50' },
                { id: 'insurance', name: 'Insurance', icon: Shield, color: 'text-green-600', bg: 'bg-green-50' },
                { id: 'mortgage', name: 'Mortgage', icon: Calculator, color: 'text-red-600', bg: 'bg-red-50' },
                { id: 'financial', name: 'Financial', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                { id: 'contractor', name: 'Contractors', icon: Hammer, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map((industry) => (
                <Link
                  key={industry.id}
                  to={`/${industry.id}`}
                  className="group p-6 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className={`w-12 h-12 mx-auto ${industry.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <industry.icon className={`w-6 h-6 ${industry.color}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900">{industry.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Value Prop for Pros (Acquisition Wedge) */}
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/20 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
                  <Briefcase className="w-4 h-4" />
                  For Professionals
                </div>
                <h2 className="text-4xl font-bold mb-6">
                  Are you a Professional? <br />
                  <span className="text-blue-400">Claim your Free Profile</span>
                </h2>
                <p className="text-lg text-slate-300 mb-8">
                  Join 835,000+ experts using EstateFlow to grow their business.
                  Get access to free tools, lead generation, and reputation management.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/claim"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
                  >
                    Find My Profile
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                  <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800" />
                      ))}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-white">2,400+</span> pros joined this week
                    </div>
                  </div>
                </div>
              </div>

              {/* Abstract UI Mockup */}
              <div className="relative">
                <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-slate-700 rounded-full" />
                    <div>
                      <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-24 bg-slate-700/50 rounded" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-20 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-blue-400 font-bold">7 New Leads</div>
                        <div className="text-slate-400 text-xs">Waiting for response</div>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">View</button>
                    </div>
                    <div className="h-20 bg-slate-700/30 rounded-xl" />
                    <div className="h-20 bg-slate-700/30 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // --- PINEXACTO / TRUEPOINT VIEW (Legacy/Utility) ---
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              {isPinExacto ? "100% Gratis Para Siempre" : "100% Free Forever"}
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              {isPinExacto ? (
                <>
                  Nunca Más<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                    Te Pierdas
                  </span>
                </>
              ) : (
                <>
                  Never Get<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                    Lost Again
                  </span>
                </>
              )}
            </h1>

            {/* Subheadline */}
            <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-8">
              {isPinExacto
                ? "Crea un pin exacto de tu ubicación en 60 segundos. Compártelo con cualquier servicio. Garantiza entregas perfectas."
                : "Create an exact pin of your location in 60 seconds. Share with any service. Guarantee perfect deliveries."}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/pinexacto"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl"
              >
                <MapPin className="w-5 h-5" />
                {isPinExacto ? "Crear Mi Pin Gratis" : "Create My Free Pin"}
                <ChevronRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                {isPinExacto ? "Ver Cómo Funciona" : "See How It Works"}
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>{isPinExacto ? "Sin Registro" : "No Sign Up"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>{isPinExacto ? "100% Privado" : "100% Private"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                <span>{isPinExacto ? "60 Segundos" : "60 Seconds"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {isPinExacto
                ? "¿Te Suena Familiar?"
                : "Sound Familiar?"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Truck className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Entregas Perdidas" : "Lost Deliveries"}
              </h3>
              <p className="text-gray-600">
                {isPinExacto
                  ? '"El GPS me llevó al lugar equivocado" - Cada repartidor, siempre'
                  : '"GPS took me to wrong entrance" - Every delivery driver, ever'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Llamadas Constantes" : "Constant Calls"}
              </h3>
              <p className="text-gray-600">
                {isPinExacto
                  ? '"¿Dónde es exactamente?" - Pierdes tiempo explicando cada vez'
                  : '"Where exactly are you?" - Waste time explaining every time'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Direcciones Confusas" : "Confusing Addresses"}
              </h3>
              <p className="text-gray-600">
                {isPinExacto
                  ? 'Urbanización Villa Mar, Calle 7, Int 456, "al lado del colmado"'
                  : 'Complex B, Building 7, "near the blue mailbox by the oak tree"'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {isPinExacto
                ? "3 Pasos Simples"
                : "3 Simple Steps"}
            </h2>
            <p className="text-xl text-gray-600">
              {isPinExacto
                ? "Más fácil que enviar un mensaje de WhatsApp"
                : "Easier than sending a text message"}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Marca Tu Ubicación" : "Mark Your Location"}
              </h3>
              <p className="text-gray-600">
                {isPinExacto
                  ? "Un click para capturar tu ubicación exacta con GPS de alta precisión"
                  : "One click to capture your exact location with high-precision GPS"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Añade Detalles" : "Add Details"}
              </h3>
              <p className="text-gray-600">
                {isPinExacto
                  ? "Opcional: Foto de la entrada, instrucciones especiales, horarios"
                  : "Optional: Entrance photo, special instructions, availability"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Comparte el Link" : "Share the Link"}
              </h3>
              <p className="text-gray-600">
                {isPinExacto
                  ? "Envía por WhatsApp, SMS, o email. Funciona con cualquier app de mapas"
                  : "Send via WhatsApp, SMS, or email. Works with any map app"}
              </p>
            </div>
          </div>

          {/* Demo Link */}
          <div className="text-center mt-12">
            <Link
              to="/pin/DEMO123"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              {isPinExacto ? "Ver Pin de Ejemplo" : "See Example Pin"}
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {isPinExacto
                ? "¿Quién Usa PinExacto?"
                : "Who Uses ExactPin?"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Home className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Propietarios" : "Homeowners"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isPinExacto
                  ? "Comparte con servicios, entregas, visitas. Nunca más explicaciones complicadas."
                  : "Share with services, deliveries, guests. No more complicated explanations."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Store className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Negocios Locales" : "Local Businesses"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isPinExacto
                  ? "Garantiza que clientes y proveedores encuentren tu entrada correcta."
                  : "Ensure customers and suppliers find your correct entrance."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Hammer className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Contratistas" : "Contractors"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isPinExacto
                  ? "Llega directo al lugar de trabajo. Sin perder tiempo buscando."
                  : "Arrive directly at job sites. No time wasted searching."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Truck className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Servicios de Entrega" : "Delivery Services"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isPinExacto
                  ? "Reduce entregas fallidas. Mejora satisfacción del cliente."
                  : "Reduce failed deliveries. Improve customer satisfaction."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Building className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "Condominios" : "Condos & Gated Communities"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isPinExacto
                  ? "Pin único para cada residente. Incluye código de acceso."
                  : "Unique pin for each resident. Include gate codes."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Briefcase className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isPinExacto ? "E-Commerce" : "E-Commerce"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isPinExacto
                  ? "Añade pin exacto al checkout. Cero devoluciones por dirección."
                  : "Add exact pin at checkout. Zero returns due to address issues."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.totalPins.toLocaleString()}
              </div>
              <div className="text-gray-600">
                {isPinExacto ? "Pins Creados" : "Pins Created"}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.totalDeliveries.toLocaleString()}
              </div>
              <div className="text-gray-600">
                {isPinExacto ? "Entregas Exitosas" : "Successful Deliveries"}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.businessesJoined.toLocaleString()}
              </div>
              <div className="text-gray-600">
                {isPinExacto ? "Negocios Unidos" : "Businesses Joined"}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.avgTimeSaved} min
              </div>
              <div className="text-gray-600">
                {isPinExacto ? "Tiempo Ahorrado" : "Time Saved"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {isPinExacto
              ? "Empieza Ahora - Es Gratis"
              : "Start Now - It's Free"}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {isPinExacto
              ? "No necesitas cuenta. No pedimos tarjeta. Solo crea tu pin y comparte."
              : "No account needed. No credit card. Just create your pin and share."}
          </p>
          <Link
            to="/pinexacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl"
          >
            <MapPin className="w-6 h-6" />
            {isPinExacto ? "Crear Mi Pin en 60 Segundos" : "Create My Pin in 60 Seconds"}
            <ChevronRight className="w-6 h-6" />
          </Link>

          {/* Social Proof */}
          <div className="mt-12 flex items-center justify-center gap-2">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 bg-gray-300 rounded-full border-2 border-white"
                />
              ))}
            </div>
            <div className="text-left ml-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-white/90">
                {isPinExacto
                  ? "Usado por miles en Puerto Rico"
                  : "Used by thousands nationwide"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}