import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remixCloudflareDevProxy(),
    remix({
      ssr: true,
      serverBuildFile: "index.js",
      ignoredRouteFiles: ["**/.*"],
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    minify: true,
    rollupOptions: {
      external: [],
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  ssr: {
    noExternal: [],
    target: "webworker",
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
    conditions: ["worker", "import"],
  },
});