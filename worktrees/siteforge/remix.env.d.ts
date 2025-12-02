/// <reference types="@remix-run/dev" />
/// <reference types="@cloudflare/workers-types" />

declare module "@remix-run/cloudflare" {
  export interface AppLoadContext {
    env: {
      DB: D1Database;
      LINKS: KVNamespace;
      PINS: KVNamespace;
      CACHE: KVNamespace;
      ANALYTICS_BUFFER: KVNamespace;
      ESTATEFLOW_ASSETS: R2Bucket;
      PROFILE_PHOTOS: R2Bucket;
      PROPERTY_IMAGES: R2Bucket;
      DOCUMENTS: R2Bucket;
      QR_CODES: R2Bucket;
      ENVIRONMENT?: string;
      POSTHOG_API_KEY?: string;
      POSTHOG_HOST?: string;

      // Stripe environment variables
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_PUBLISHABLE_KEY?: string;

      // Google OAuth
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      BASE_URL?: string;
    };
    waitUntil: (promise: Promise<any>) => void;
    passThroughOnException: () => void;
    cf?: any;
    tenant?: any;
  }
}

export { };