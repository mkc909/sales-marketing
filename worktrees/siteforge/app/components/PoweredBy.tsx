/**
 * PoweredBy Component
 *
 * Viral loop component for free tier profiles.
 * Drives organic signups through visible branding on free professional pages.
 *
 * Features:
 * - Attractive, non-intrusive branding
 * - Click tracking for attribution
 * - Conversion tracking
 * - A/B testable variations
 */

import { Link } from "@remix-run/react";
import { ExternalLink, Zap } from "lucide-react";

interface PoweredByProps {
  professionalId: string;
  variant?: 'default' | 'minimal' | 'badge' | 'banner';
  className?: string;
  trackClick?: (professionalId: string) => void;
}

export function PoweredBy({
  professionalId,
  variant = 'default',
  className = '',
  trackClick
}: PoweredByProps) {
  const handleClick = () => {
    if (trackClick) {
      trackClick(professionalId);
    }
  };

  // Default variant - Most visible, best conversion
  if (variant === 'default') {
    return (
      <Link
        to="/pricing?ref=poweredby"
        onClick={handleClick}
        className={`group block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 hover:shadow-lg transition-all ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                Powered by EstateFlow
              </div>
              <div className="text-xs text-slate-600">
                Free professional profile • Upgrade for more leads
              </div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </Link>
    );
  }

  // Minimal variant - Less intrusive
  if (variant === 'minimal') {
    return (
      <Link
        to="/pricing?ref=poweredby"
        onClick={handleClick}
        className={`group inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors ${className}`}
      >
        <span>Powered by</span>
        <span className="font-semibold">EstateFlow</span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    );
  }

  // Badge variant - Compact, top-right corner
  if (variant === 'badge') {
    return (
      <Link
        to="/pricing?ref=poweredby"
        onClick={handleClick}
        className={`group fixed top-4 right-4 z-50 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
            EstateFlow
          </span>
        </div>
      </Link>
    );
  }

  // Banner variant - Full width footer banner
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-white font-semibold mb-1">
                This is a free EstateFlow profile
              </div>
              <div className="text-blue-100 text-sm">
                Want your own professional profile? Join thousands of experts on EstateFlow
              </div>
            </div>
            <Link
              to="/pricing?ref=poweredby"
              onClick={handleClick}
              className="px-6 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg whitespace-nowrap"
            >
              Claim Your Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * PoweredByFooter - Special variant for page footer
 */
export function PoweredByFooter({
  professionalId,
  className = '',
  trackClick
}: Omit<PoweredByProps, 'variant'>) {
  const handleClick = () => {
    if (trackClick) {
      trackClick(professionalId);
    }
  };

  return (
    <footer className={`bg-slate-50 border-t border-slate-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">EstateFlow</div>
                <div className="text-sm text-slate-600">Professional Marketplace</div>
              </div>
            </div>
            <p className="text-slate-600 text-sm">
              Connect with verified professionals in real estate, legal, insurance, and more.
              Join 835,000+ experts using EstateFlow to grow their business.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              to="/pricing?ref=poweredby"
              onClick={handleClick}
              className="block w-full sm:w-auto text-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all"
            >
              Get Your Free Profile
            </Link>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <Link to="/about" className="hover:text-blue-600 transition-colors">
                About
              </Link>
              <Link to="/contact" className="hover:text-blue-600 transition-colors">
                Contact
              </Link>
              <Link to="/terms" className="hover:text-blue-600 transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} EstateFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
