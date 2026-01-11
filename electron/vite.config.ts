import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

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
      "import.meta.env.VITE_API_URL": JSON.stringify(
        env.API_URL || "http://localhost:8080/api/v1"
      ),
      "import.meta.env.VITE_SCREENSHOT_INTERVAL": JSON.stringify(
        env.SCREENSHOT_INTERVAL || "300000"
      ),
      "import.meta.env.VITE_SYNC_INTERVAL": JSON.stringify(
        env.SYNC_INTERVAL || "60000"
      ),
    },
    optimizeDeps: {
      exclude: ["uuid", "node-machine-id"],
    },
  };
});
