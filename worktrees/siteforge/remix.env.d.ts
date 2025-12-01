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
    };
    waitUntil: (promise: Promise<any>) => void;
    passThroughOnException: () => void;
    cf?: any;
    tenant?: any;
  }
}

export {};