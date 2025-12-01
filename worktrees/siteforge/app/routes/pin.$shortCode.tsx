/**
 * Public Pin Page - The shareable link destination
 * This is what users see when they click on a shared pin link
 */

import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  MapPin, Navigation, Share2, Copy, Check, ExternalLink,
  Phone, Clock, Car, ChevronRight, QrCode, Star
} from "lucide-react";
import { getPinByShortCode, trackPinNavigation, trackPinShare } from "~/models/pin.server";
import { getBrandConfig } from "~/config/theme";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { shortCode } = params;

  if (!shortCode) {
    throw new Response("Pin not found", { status: 404 });
  }

  const pin = await getPinByShortCode(shortCode, context);

  if (!pin) {
    throw new Response("Pin not found", { status: 404 });
  }

  const brand = getBrandConfig(context.tenant?.brand || 'siteforge');

  // Get business info if linked
  let business = null;
  if (pin.business_id) {
    business = await context.env.DB
      .prepare('SELECT * FROM businesses WHERE id = ?')
      .bind(pin.business_id)
      .first();
  }

  return json({ pin, business, brand });
}

export default function PublicPin() {
  const { pin, business, brand } = useLoaderData<typeof loader>();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const isEnlacePR = brand.id === 'enlacepr';

  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share via native share or WhatsApp
  const sharePin = async () => {
    setSharing(true);

    // Track share
    await fetch(`/api/pin/${pin.short_code}/share`, { method: 'POST' });

    const shareData = {
      title: pin.name,
      text: isEnlacePR
        ? `📍 ${pin.name} - Ubicación exacta verificada`
        : `📍 ${pin.name} - Exact verified location`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to WhatsApp
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${shareData.text}\n${shareData.url}`)}`,
        '_blank'
      );
    }

    setSharing(false);
  };

  // Open in maps app
  const openInMaps = async (app: 'google' | 'apple' | 'waze') => {
    setNavigating(true);

    // Track navigation
    await fetch(`/api/pin/${pin.short_code}/navigate`, { method: 'POST' });

    let url = '';
    const coords = `${pin.latitude},${pin.longitude}`;
    const encodedName = encodeURIComponent(pin.name);

    switch (app) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_place_id=${encodedName}`;
        break;
      case 'apple':
        url = `https://maps.apple.com/?daddr=${coords}&q=${encodedName}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${coords}&q=${encodedName}&navigate=yes`;
        break;
    }

    window.open(url, '_blank');
    setTimeout(() => setNavigating(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {isEnlacePR ? "PinExacto" : "ExactPin"}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                {pin.short_code}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={sharePin}
              disabled={sharing}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Location Info Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          {/* Photo Section */}
          {pin.photo_url && (
            <div className="aspect-video bg-gray-100 relative">
              <img
                src={pin.photo_url}
                alt={pin.name}
                className="w-full h-full object-cover"
              />
              {pin.is_verified && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {isEnlacePR ? "Verificado" : "Verified"}
                </div>
              )}
            </div>
          )}

          <div className="p-6">
            {/* Title and Description */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {pin.name}
            </h1>
            {pin.description && (
              <p className="text-gray-600 mb-4">{pin.description}</p>
            )}

            {/* Address */}
            {pin.address && (
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-900">{pin.address}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            )}

            {/* Special Instructions */}
            {pin.instructions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-amber-900 mb-1">
                  {isEnlacePR ? "Instrucciones Especiales" : "Special Instructions"}
                </h3>
                <p className="text-amber-800">{pin.instructions}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {isEnlacePR ? "Abrir en:" : "Open in:"}
              </h3>

              <button
                onClick={() => openInMaps('google')}
                disabled={navigating}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                <Navigation className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">Google Maps</span>
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => openInMaps('waze')}
                disabled={navigating}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <Car className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">Waze</span>
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => openInMaps('apple')}
                disabled={navigating}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                <Navigation className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">Apple Maps</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pin.view_count}</div>
                  <div className="text-xs text-gray-500">
                    {isEnlacePR ? "Vistas" : "Views"}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pin.share_count}</div>
                  <div className="text-xs text-gray-500">
                    {isEnlacePR ? "Compartido" : "Shared"}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pin.navigation_count}</div>
                  <div className="text-xs text-gray-500">
                    {isEnlacePR ? "Navegaciones" : "Navigations"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Card (if linked) */}
        {business && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {business.name}
                </h2>
                {business.category && (
                  <p className="text-sm text-gray-600 mb-3">{business.category}</p>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="w-4 h-4" />
                    {business.phone}
                  </a>
                )}
              </div>
              {business.website_url && (
                <a
                  href={business.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* Business Hours */}
            {business.hours && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{business.hours}</span>
                </div>
              </div>
            )}

            {/* Rating */}
            {business.rating && (
              <div className="mt-3 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(business.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                      }`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {business.rating} ({business.review_count} {isEnlacePR ? "reseñas" : "reviews"})
                </span>
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">
            {isEnlacePR
              ? "¿Necesitas tu propio Pin Exacto?"
              : "Need your own Exact Pin?"}
          </h3>
          <p className="mb-6 opacity-90">
            {isEnlacePR
              ? "Crea tu pin verificado gratis en 60 segundos"
              : "Create your verified pin free in 60 seconds"}
          </p>
          <a
            href="/pinexacto"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors"
          >
            <MapPin className="w-5 h-5" />
            {isEnlacePR ? "Crear Mi Pin Gratis" : "Create My Free Pin"}
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            {isEnlacePR
              ? "PinExacto - Nunca más te pierdas"
              : "ExactPin - Never get lost again"}
          </p>
          <p className="mt-1">
            © 2025 {brand.name}. {isEnlacePR ? "Todos los derechos reservados." : "All rights reserved."}
          </p>
        </div>
      </div>
    </div>
  );
}