import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import styles from "./styles/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
];

export async function loader() {
  return {
    ENV: {
      ENVIRONMENT: process.env.ENVIRONMENT || "development",
    },
  };
}

export default function App() {
  const { ENV } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans antialiased">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - SiteForge</title>
        <Links />
      </head>
      <body className="h-full">
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Oops! Something went wrong
            </h1>
            <p className="mt-4 text-base text-gray-600">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="mt-8">
              <a
                href="/"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Go back home
              </a>
            </div>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}