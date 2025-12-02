import { PassThrough } from "node:stream";
import { type EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import isbot from "isbot";
const ReactDOMServer = await import("react-dom/server");

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return isbot(request.headers.get("user-agent"))
    ? handleBotRequest(
      request,
      responseStatusCode,
      responseHeaders,
      remixContext
    )
    : handleBrowserRequest(
      request,
      responseStatusCode,
      responseHeaders,
      remixContext
    );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    try {
      const html = ReactDOMServer.renderToString(
        <RemixServer
          context={remixContext}
          url={request.url}
        />
      );

      shellRendered = true;
      responseHeaders.set("Content-Type", "text/html");

      resolve(
        new Response(html, {
          headers: responseHeaders,
          status: responseStatusCode,
        })
      );
    } catch (error) {
      reject(error);
    }
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    try {
      const html = ReactDOMServer.renderToString(
        <RemixServer
          context={remixContext}
          url={request.url}
        />
      );

      shellRendered = true;
      responseHeaders.set("Content-Type", "text/html");

      resolve(
        new Response(html, {
          headers: responseHeaders,
          status: responseStatusCode,
        })
      );
    } catch (error) {
      reject(error);
    }
  });
}