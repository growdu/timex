import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 项目页用 /timex/，自定义域或开发用 /
  base: process.env.VITE_BASE_URL || "/",
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.{test,spec}.{js,mjs,jsx,tsx}"],
  },
});
