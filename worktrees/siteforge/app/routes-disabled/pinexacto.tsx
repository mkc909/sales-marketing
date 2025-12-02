/**
 * PinExacto Tool - The Wedge Product
 * Free location-fixing utility for user acquisition
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Share2, Camera, Check, Copy, QrCode } from "lucide-react";
import { createPin, getPopularPins, type Pin } from "~/models/pin.server";
import { getBrandConfig } from "~/config/theme";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const brand = getBrandConfig(context.tenant?.brand || 'siteforge');
  const popularPins = await getPopularPins(context, 6);

  return json({
    brand,
    popularPins,
    mapboxToken: context.env.MAPBOX_TOKEN || null,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const address = formData.get("address") as string;
  const instructions = formData.get("instructions") as string;
  const photo = formData.get("photo") as File | null;

  if (!name || !latitude || !longitude) {
    return json(
      { error: "Name and location are required" },
      { status: 400 }
    );
  }

  try {
    const pin = await createPin(
      {
        name,
        latitude,
        longitude,
        address,
        instructions,
        photo: photo && photo.size > 0 ? photo : undefined,
      },
      context
    );

    return json({ success: true, pin });
  } catch (error) {
    console.error("Failed to create pin:", error);
    return json(
      { error: "Failed to create pin. Please try again." },
      { status: 500 }
    );
  }
}

export default function PinExacto() {
  const { brand, popularPins, mapboxToken } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current location
  const getCurrentLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });

          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`
            );
            const data = await response.json();
            if (data.features && data.features[0]) {
              setAddress(data.features[0].place_name);
            }
          } catch (error) {
            console.error("Failed to get address:", error);
          }

          setLocating(false);
        },
        (error) => {
          console.error("Location error:", error);
          setLocating(false);
          alert("Unable to get your location. Please enable location services.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setLocating(false);
    }
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy share link
  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEnlacePR = brand.id === 'enlacepr';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isEnlacePR ? "PinExacto" : "ExactPin"}
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              {isEnlacePR
                ? "Nunca más te pierdas. Pin verificado, entrega garantizada."
                : "Never get lost again. Verified pins for perfect delivery."}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
              <Check className="w-4 h-4" />
              {isEnlacePR ? "100% Gratis Para Siempre" : "100% Free Forever"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {actionData?.success ? (
          // Success State - Show created pin
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isEnlacePR ? "¡Pin Creado!" : "Pin Created!"}
              </h2>
              <p className="text-gray-600">
                {isEnlacePR
                  ? "Comparte este enlace con cualquier servicio"
                  : "Share this link with any service provider"}
              </p>
            </div>

            {/* Share Link */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isEnlacePR ? "Tu Enlace Único" : "Your Unique Link"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={actionData.pin.share_url}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyShareLink(actionData.pin.share_url)}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Short Code */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isEnlacePR ? "Código Corto" : "Short Code"}
              </label>
              <div className="text-3xl font-bold text-center text-gray-900 tracking-wider">
                {actionData.pin.short_code}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(actionData.pin.share_url)}`)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                WhatsApp
              </button>
              <button
                onClick={() => window.open(actionData.pin.qr_code_url || '#')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                QR Code
              </button>
              <a
                href="/pinexacto"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isEnlacePR ? "Crear Otro" : "Create Another"}
              </a>
            </div>
          </div>
        ) : (
          // Creation Form
          <Form method="post" encType="multipart/form-data" className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isEnlacePR ? "Crear Tu Pin Exacto" : "Create Your Exact Pin"}
            </h2>

            {/* Location Section */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                {isEnlacePR ? "Ubicación" : "Location"}
              </label>

              {!location ? (
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {locating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      {isEnlacePR ? "Obteniendo ubicación..." : "Getting location..."}
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      {isEnlacePR ? "Usar Mi Ubicación Actual" : "Use My Current Location"}
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">
                          {isEnlacePR ? "Ubicación Capturada" : "Location Captured"}
                        </p>
                        <p className="text-sm text-green-700 mt-1">{address || `${location.lat}, ${location.lng}`}</p>
                      </div>
                    </div>
                  </div>
                  <input type="hidden" name="latitude" value={location.lat} />
                  <input type="hidden" name="longitude" value={location.lng} />
                  <input type="hidden" name="address" value={address} />
                </div>
              )}
            </div>

            {location && (
              <>
                {/* Name Input */}
                <div className="mb-6">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {isEnlacePR ? "Nombre del Lugar" : "Location Name"} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder={isEnlacePR ? "ej: Mi Casa, Mi Negocio" : "e.g: My Home, My Business"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Instructions */}
                <div className="mb-6">
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                    {isEnlacePR ? "Instrucciones Especiales" : "Special Instructions"}
                  </label>
                  <textarea
                    id="instructions"
                    name="instructions"
                    rows={3}
                    placeholder={isEnlacePR
                      ? "ej: Portón verde al lado del colmado, tocar el timbre dos veces"
                      : "e.g: Green gate next to the store, ring doorbell twice"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Photo Upload */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isEnlacePR ? "Foto del Lugar (Opcional)" : "Location Photo (Optional)"}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="photo"
                      name="photo"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                      {isEnlacePR ? "Tomar Foto" : "Take Photo"}
                    </button>
                    {photoPreview && (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {isEnlacePR
                      ? "Una foto ayuda a los servicios a encontrar tu entrada exacta"
                      : "A photo helps services find your exact entrance"}
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      {isEnlacePR ? "Creando..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5" />
                      {isEnlacePR ? "Crear Mi Pin Exacto" : "Create My Exact Pin"}
                    </>
                  )}
                </button>
              </>
            )}

            {actionData?.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {actionData.error}
              </div>
            )}
          </Form>
        )}

        {/* Popular Pins Section */}
        {popularPins.length > 0 && !actionData?.success && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {isEnlacePR ? "Pins Populares" : "Popular Pins"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularPins.map((pin) => (
                <a
                  key={pin.id}
                  href={`/pin/${pin.short_code}`}
                  className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{pin.name}</p>
                      <p className="text-sm text-gray-500">
                        {pin.view_count} {isEnlacePR ? "vistas" : "views"}
                      </p>
                    </div>
                    {pin.is_verified && (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}