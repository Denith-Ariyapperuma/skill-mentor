import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
  },
  // Absolute "/assets/..." URLs. Relative base breaks on SPA deep links / refresh:
  // e.g. at /admin/x, ./assets/foo.js resolves to /admin/assets/foo.js → HTML fallback → MIME error.
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
