interface Service {
  id: string;
  name: string;
  description: string;
  icon?: string;
  priceRange?: string;
}

interface ServicesProps {
  title?: string;
  subtitle?: string;
  services: Service[];
}

const defaultIcons: Record<string, JSX.Element> = {
  repair: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  installation: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  maintenance: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  emergency: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function Services({
  title = "Our Services",
  subtitle = "Professional solutions for all your needs",
  services,
}: ServicesProps) {
  return (
    <div id="services" className="bg-gray-50 py-24 sm:py-32">
      <div className="section-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-lg">{title}</h2>
          <p className="mt-4 text-lead">{subtitle}</p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="group relative rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-lg hover:ring-[var(--color-primary)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
                    {defaultIcons[service.icon || 'repair']}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {service.name}
                  </h3>
                </div>

                <p className="mt-4 text-sm text-gray-600">
                  {service.description}
                </p>

                {service.priceRange && (
                  <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">
                    {service.priceRange}
                  </p>
                )}

                <div className="mt-6">
                  <a
                    href="#contact"
                    className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)]"
                  >
                    Get Quote →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600">
            Don't see what you need?{' '}
            <a href="#contact" className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)]">
              Contact us
            </a>{' '}
            for custom solutions.
          </p>
        </div>
      </div>
    </div>
  );
}