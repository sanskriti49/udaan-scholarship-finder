import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Keep localhost development reachable from the in-app browser's IPv4 URL.
    host: "127.0.0.1",
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/")
          ) {
            return "react-vendor";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "ui-icons";
          }
          if (id.includes("node_modules/gsap/")) {
            return "animation-gsap";
          }
        },
      },
    },
  },
});
