import path from "node:path";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const upstream = loadEnv(mode, process.cwd(), "").HESTIA_UPSTREAM_URL;
  return {
  plugins: [react(), tailwindcss()],
  server: upstream ? { proxy: { "/api": {
    target: upstream,
    changeOrigin: true,
    rewrite: (url: string) => url.replace(/^\/api/, ""),
  } } } : undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  };
});
