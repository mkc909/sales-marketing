/**
 * Reusable Lead Capture Modal Component
 * Uses native Popover API for lightweight, accessible modals
 * Mobile-optimized with progressive enhancement
 */

import { Form } from "@remix-run/react";
import { Phone, X } from "lucide-react";

interface LeadCaptureModalProps {
  id: string;
  title: string;
  description: string;
  action?: 'quote' | 'contact';
  businessId?: string;
  industry?: string;
  services?: Array<{
    id: string;
    name: { es: string; en: string };
    priceRange: string;
  }>;
  showEmergency?: boolean;
  isSpanish?: boolean;
  triggerButton?: React.ReactNode;
}

export default function LeadCaptureModal({
  id,
  title,
  description,
  action = 'contact',
  businessId,
  industry,
  services = [],
  showEmergency = false,
  isSpanish = false,
  triggerButton
}: LeadCaptureModalProps) {
  return (
    <>
      {/* Trigger Button (if provided) */}
      {triggerButton || (
        <button
          // @ts-ignore - popover API types not yet in TS
          popovertarget={id}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Phone className="w-5 h-5" />
          {isSpanish ? 'Contactar Ahora' : 'Contact Now'}
        </button>
      )}

      {/* Modal Popover */}
      <div
        id={id}
        // @ts-ignore
        popover="auto"
        className="m-auto border-0 p-0 rounded-xl shadow-2xl max-w-[min(90vw,500px)] bg-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
          <button
            // @ts-ignore
            popovertarget={id}
            // @ts-ignore
            popovertargetaction="hide"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <Form method="post" className="p-6 space-y-4">
          <input type="hidden" name="action" value={action} />
          {businessId && <input type="hidden" name="businessId" value={businessId} />}
          {industry && <input type="hidden" name="industry" value={industry} />}

          {/* Name Field */}
          <div>
            <label htmlFor={`${id}-name`} className="block text-sm font-medium text-gray-700 mb-1">
              {isSpanish ? 'Nombre' : 'Name'} <span className="text-red-600">*</span>
            </label>
            <input
              id={`${id}-name`}
              type="text"
              name="name"
              required
              autoComplete="name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isSpanish ? 'Tu nombre completo' : 'Your full name'}
            />
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor={`${id}-phone`} className="block text-sm font-medium text-gray-700 mb-1">
              {isSpanish ? 'Teléfono' : 'Phone'} <span className="text-red-600">*</span>
            </label>
            <input
              id={`${id}-phone`}
              type="tel"
              name="phone"
              required
              autoComplete="tel"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isSpanish ? '(787) 555-0123' : '(555) 123-4567'}
            />
          </div>

          {/* Email Field (Optional) */}
          <div>
            <label htmlFor={`${id}-email`} className="block text-sm font-medium text-gray-700 mb-1">
              {isSpanish ? 'Email (Opcional)' : 'Email (Optional)'}
            </label>
            <input
              id={`${id}-email`}
              type="email"
              name="email"
              autoComplete="email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isSpanish ? 'tu@email.com' : 'your@email.com'}
            />
          </div>

          {/* Service Selection (if services provided) */}
          {services.length > 0 && (
            <div>
              <label htmlFor={`${id}-service`} className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Servicio Necesario' : 'Service Needed'}
              </label>
              <select
                id={`${id}-service`}
                name="service"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name[isSpanish ? 'es' : 'en']} - {service.priceRange}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Field */}
          <div>
            <label htmlFor={`${id}-message`} className="block text-sm font-medium text-gray-700 mb-1">
              {isSpanish ? '¿Qué necesitas?' : 'What do you need?'}
            </label>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={isSpanish ? 'Describe tu proyecto o necesidad...' : 'Describe your project or need...'}
            />
          </div>

          {/* Emergency Checkbox (if applicable) */}
          {showEmergency && (
            <div className="flex items-start">
              <input
                id={`${id}-emergency`}
                type="checkbox"
                name="emergency"
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-1"
              />
              <label htmlFor={`${id}-emergency`} className="ml-2 text-sm font-medium text-red-600">
                {isSpanish ? 'Es una emergencia' : 'This is an emergency'}
              </label>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {action === 'quote'
                ? (isSpanish ? 'Obtener Cotización' : 'Get Quote')
                : (isSpanish ? 'Enviar Mensaje' : 'Send Message')}
            </button>
            <button
              type="button"
              // @ts-ignore
              popovertarget={id}
              // @ts-ignore
              popovertargetaction="hide"
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              {isSpanish ? 'Cerrar' : 'Close'}
            </button>
          </div>

          {/* Privacy Notice */}
          <p className="text-xs text-gray-500 text-center">
            {isSpanish
              ? 'Al enviar, aceptas que te contactemos sobre tu solicitud.'
              : 'By submitting, you agree to be contacted about your request.'}
          </p>
        </Form>
      </div>

      {/* Popover Styles (scoped to this component) */}
      <style dangerouslySetInnerHTML={{
        __html: `
          [popover] {
            margin: auto;
            border: none;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: min(90vw, 500px);
            background: white;
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          [popover]::backdrop {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            animation: fadeIn 0.3s;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          /* Mobile optimization */
          @media (max-width: 640px) {
            [popover] {
              max-height: 90vh;
              overflow-y: auto;
            }
          }
        `
      }} />
    </>
  );
}
