import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Use root-absolute asset URLs. Relative base ("./") breaks on deep links / refresh:
// at /admin/foo, ./assets/x.js resolves to /admin/assets/x.js → 404 → SPA serves HTML → MIME error.
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
