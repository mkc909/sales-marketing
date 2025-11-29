import { Link } from "@remix-run/react";

interface HeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaSecondaryText?: string;
  phoneNumber?: string;
  backgroundImage?: string;
}

export function Hero({
  title,
  subtitle,
  ctaText,
  ctaSecondaryText = "View Our Services",
  phoneNumber,
  backgroundImage,
}: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10">
        <svg
          className="absolute inset-0 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hero-pattern"
              width={200}
              height={200}
              x="50%"
              y={-1}
              patternUnits="userSpaceOnUse"
            >
              <path d="M100 200V.5M.5 .5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
            <path
              d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
              strokeWidth={0}
            />
          </svg>
          <rect width="100%" height="100%" strokeWidth={0} fill="url(#hero-pattern)" />
        </svg>
      </div>

      <div className="relative">
        <div className="section-container py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="heading-xl animate-fade-in">
              {title}
            </h1>
            <p className="mt-6 text-lead animate-slide-up">
              {subtitle}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              {phoneNumber ? (
                <a
                  href={`tel:${phoneNumber.replace(/\D/g, '')}`}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {ctaText}
                </a>
              ) : (
                <Link to="#contact" className="btn-primary">
                  {ctaText}
                </Link>
              )}

              <Link to="#services" className="btn-secondary">
                {ctaSecondaryText}
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Licensed & Insured
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                24/7 Emergency Service
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free Estimates
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}