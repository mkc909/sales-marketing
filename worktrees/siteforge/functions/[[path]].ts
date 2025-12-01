/**
 * Cloudflare Pages Functions handler for Remix SSR
 * This file is REQUIRED for Remix to work on Cloudflare Pages
 * It creates the server-side request handler for all routes
 */

import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";

// Try to import build, fallback to undefined if not exists
let build: any;
try {
  // @ts-ignore - This will be generated at build time
  build = require("../build/index");
} catch (e) {
  console.warn("Build not found, using fallback handler");
  build = undefined;
}

// Define the Env interface to match your bindings
interface Env {
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
}

export const onRequest = createPagesFunctionHandler<Env>({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext: (context) => {
    // Pass all Cloudflare bindings to the Remix app
    return {
      env: context.env,
      waitUntil: context.waitUntil.bind(context),
      passThroughOnException: context.passThroughOnException.bind(context),
      cf: context.request.cf,
    };
  },
});