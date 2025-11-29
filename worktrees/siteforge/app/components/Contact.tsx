import { Form } from "@remix-run/react";

interface ContactProps {
  businessName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  hours?: string;
}

export function Contact({
  businessName,
  phoneNumber,
  email,
  address,
  hours = "Mon-Fri: 8AM-6PM | Sat: 9AM-4PM | Sun: Emergency Only",
}: ContactProps) {
  return (
    <div id="contact" className="bg-white py-24 sm:py-32">
      <div className="section-container">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="heading-lg">Get Your Free Quote</h2>
            <p className="mt-4 text-lead">
              Contact us today for fast, reliable service
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <div>
              <Form method="post" action="/api/lead" className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-gray-300 focus:border-[var(--color-primary)] focus:outline-none focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-gray-300 focus:border-[var(--color-primary)] focus:outline-none focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-gray-300 focus:border-[var(--color-primary)] focus:outline-none focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700">
                    Service Needed
                  </label>
                  <select
                    name="service"
                    id="service"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-gray-300 focus:border-[var(--color-primary)] focus:outline-none focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Select a service</option>
                    <option value="repair">Repair</option>
                    <option value="installation">Installation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="emergency">Emergency Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Tell us about your project
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows={4}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm ring-1 ring-gray-300 focus:border-[var(--color-primary)] focus:outline-none focus:ring-[var(--color-primary)]"
                  />
                </div>

                <button type="submit" className="btn-primary w-full">
                  Get Free Quote
                </button>

                <p className="text-xs text-center text-gray-500">
                  We'll respond within 15 minutes during business hours
                </p>
              </Form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              {/* Quick Contact */}
              <div className="rounded-2xl bg-gray-50 p-8">
                <h3 className="text-lg font-semibold text-gray-900">
                  Prefer to call?
                </h3>
                {phoneNumber && (
                  <a
                    href={`tel:${phoneNumber.replace(/\D/g, '')}`}
                    className="mt-4 flex items-center gap-3 text-2xl font-bold text-[var(--color-primary)] hover:text-[var(--color-secondary)]"
                  >
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {phoneNumber}
                  </a>
                )}
                <p className="mt-2 text-sm text-gray-600">
                  24/7 Emergency Service Available
                </p>
              </div>

              {/* Business Hours */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Business Hours
                </h3>
                <p className="mt-2 text-gray-600">{hours}</p>
              </div>

              {/* Service Area */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Service Area
                </h3>
                {address && (
                  <p className="mt-2 text-gray-600">{address}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Serving a 30-mile radius
                </p>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[var(--color-primary)]">
                    15+
                  </div>
                  <div className="text-sm text-gray-600">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[var(--color-primary)]">
                    500+
                  </div>
                  <div className="text-sm text-gray-600">Happy Customers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}