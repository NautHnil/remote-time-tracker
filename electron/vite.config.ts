import { defineConfig, loadEnv } from "vite";

import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "./",
    build: {
      outDir: "dist/renderer",
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/renderer"),
      },
    },
    server: {
      port: 5173,
    },
    define: {
      // Fix for crypto.getRandomValues in Node environment
      global: "globalThis",
      // Expose env variables to the app
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL),
      "import.meta.env.VITE_WEBSITE_DOMAIN": JSON.stringify(
        env.VITE_WEBSITE_DOMAIN,
      ),
      "import.meta.env.VITE_INVITE_WEBSITE_DOMAIN": JSON.stringify(
        env.VITE_INVITE_WEBSITE_DOMAIN,
      ),
      "import.meta.env.VITE_SCREENSHOT_INTERVAL": JSON.stringify(
        env.VITE_SCREENSHOT_INTERVAL || "300000",
      ),
      "import.meta.env.VITE_SYNC_INTERVAL": JSON.stringify(
        env.VITE_SYNC_INTERVAL || "60000",
      ),
      "import.meta.env.VITE_PRESENCE_HEARTBEAT_INTERVAL": JSON.stringify(
        env.VITE_PRESENCE_HEARTBEAT_INTERVAL || "15000",
      ),
    },
    optimizeDeps: {
      exclude: ["uuid", "node-machine-id"],
    },
  };
});
