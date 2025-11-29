/**
 * PinExacto/ExactPin Landing Page
 * The wedge product marketing page
 */

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import {
  MapPin, Check, Navigation, Share2, Shield, Clock,
  ChevronRight, Star, Users, TrendingUp, Package,
  Home, Truck, Wrench, Store, Building, Phone
} from "lucide-react";
import { getBrandConfig } from "~/lib/branding";
// import { getPopularPins } from "~/models/pin.server"; // Commented until pin.server is available

export const meta: MetaFunction = () => {
  return [
    { title: "PinExacto - Never Get Lost Again | Free Location Pins" },
    {
      name: "description",
      content: "Create exact location pins in 60 seconds. Share with any service. Guarantee perfect deliveries. 100% Free Forever.",
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const brand = getBrandConfig(context.tenant?.brand || 'siteforge');
  // const popularPins = await getPopularPins(context, 3); // Commented until available

  // Get stats (would come from DB in production)
  const stats = {
    totalPins: 15234,
    totalDeliveries: 45678,
    businessesJoined: 1234,
    avgTimeSaved: 12 // minutes
  };

  return json({ brand, popularPins: [], stats });
}

export default function Index() {
  const { brand, popularPins, stats } = useLoaderData<typeof loader>();
  const isEnlacePR = brand.id === 'enlacepr';

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
              {isEnlacePR ? "100% Gratis Para Siempre" : "100% Free Forever"}
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              {isEnlacePR ? (
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
              {isEnlacePR
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
                {isEnlacePR ? "Crear Mi Pin Gratis" : "Create My Free Pin"}
                <ChevronRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                {isEnlacePR ? "Ver Cómo Funciona" : "See How It Works"}
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>{isEnlacePR ? "Sin Registro" : "No Sign Up"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>{isEnlacePR ? "100% Privado" : "100% Private"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span>{isEnlacePR ? "60 Segundos" : "60 Seconds"}</span>
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
              {isEnlacePR
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
                {isEnlacePR ? "Entregas Perdidas" : "Lost Deliveries"}
              </h3>
              <p className="text-gray-600">
                {isEnlacePR
                  ? '"El GPS me llevó al lugar equivocado" - Cada repartidor, siempre'
                  : '"GPS took me to wrong entrance" - Every delivery driver, ever'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Llamadas Constantes" : "Constant Calls"}
              </h3>
              <p className="text-gray-600">
                {isEnlacePR
                  ? '"¿Dónde es exactamente?" - Pierdes tiempo explicando cada vez'
                  : '"Where exactly are you?" - Waste time explaining every time'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Direcciones Confusas" : "Confusing Addresses"}
              </h3>
              <p className="text-gray-600">
                {isEnlacePR
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
              {isEnlacePR
                ? "3 Pasos Simples"
                : "3 Simple Steps"}
            </h2>
            <p className="text-xl text-gray-600">
              {isEnlacePR
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
                {isEnlacePR ? "Marca Tu Ubicación" : "Mark Your Location"}
              </h3>
              <p className="text-gray-600">
                {isEnlacePR
                  ? "Un click para capturar tu ubicación exacta con GPS de alta precisión"
                  : "One click to capture your exact location with high-precision GPS"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Añade Detalles" : "Add Details"}
              </h3>
              <p className="text-gray-600">
                {isEnlacePR
                  ? "Opcional: Foto de la entrada, instrucciones especiales, horarios"
                  : "Optional: Entrance photo, special instructions, availability"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Comparte el Link" : "Share the Link"}
              </h3>
              <p className="text-gray-600">
                {isEnlacePR
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
              {isEnlacePR ? "Ver Pin de Ejemplo" : "See Example Pin"}
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
              {isEnlacePR
                ? "¿Quién Usa PinExacto?"
                : "Who Uses ExactPin?"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Home className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Propietarios" : "Homeowners"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isEnlacePR
                  ? "Comparte con servicios, entregas, visitas. Nunca más explicaciones complicadas."
                  : "Share with services, deliveries, guests. No more complicated explanations."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Store className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Negocios Locales" : "Local Businesses"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isEnlacePR
                  ? "Garantiza que clientes y proveedores encuentren tu entrada correcta."
                  : "Ensure customers and suppliers find your correct entrance."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Tool className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Contratistas" : "Contractors"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isEnlacePR
                  ? "Llega directo al lugar de trabajo. Sin perder tiempo buscando."
                  : "Arrive directly at job sites. No time wasted searching."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Truck className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Servicios de Entrega" : "Delivery Services"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isEnlacePR
                  ? "Reduce entregas fallidas. Mejora satisfacción del cliente."
                  : "Reduce failed deliveries. Improve customer satisfaction."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Building className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "Condominios" : "Condos & Gated Communities"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isEnlacePR
                  ? "Pin único para cada residente. Incluye código de acceso."
                  : "Unique pin for each resident. Include gate codes."}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <Package className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                {isEnlacePR ? "E-Commerce" : "E-Commerce"}
              </h3>
              <p className="text-gray-600 text-sm">
                {isEnlacePR
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
                {isEnlacePR ? "Pins Creados" : "Pins Created"}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.totalDeliveries.toLocaleString()}
              </div>
              <div className="text-gray-600">
                {isEnlacePR ? "Entregas Exitosas" : "Successful Deliveries"}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.businessesJoined.toLocaleString()}
              </div>
              <div className="text-gray-600">
                {isEnlacePR ? "Negocios Unidos" : "Businesses Joined"}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {stats.avgTimeSaved} min
              </div>
              <div className="text-gray-600">
                {isEnlacePR ? "Tiempo Ahorrado" : "Time Saved"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {isEnlacePR
              ? "Empieza Ahora - Es Gratis"
              : "Start Now - It's Free"}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {isEnlacePR
              ? "No necesitas cuenta. No pedimos tarjeta. Solo crea tu pin y comparte."
              : "No account needed. No credit card. Just create your pin and share."}
          </p>
          <Link
            to="/pinexacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl"
          >
            <MapPin className="w-6 h-6" />
            {isEnlacePR ? "Crear Mi Pin en 60 Segundos" : "Create My Pin in 60 Seconds"}
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
                {isEnlacePR
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