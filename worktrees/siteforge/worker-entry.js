import { createRequestHandler } from "@remix-run/cloudflare-workers";
import * as build from "./build/server/index.js";

const handleRequest = createRequestHandler(build);

export default {
    async fetch(request, env, ctx) {
        try {
            return await handleRequest(request, env, ctx);
        } catch (error) {
            console.error("Worker error:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    }
};