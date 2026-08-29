import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Everything under /api is forwarded to Django. This is what lets the
    // browser treat frontend and backend as the same origin -- no CORS, no
    // django-cors-headers, and no code change when we deploy.
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
