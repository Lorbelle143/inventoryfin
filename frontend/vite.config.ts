import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // In production, VITE_API_URL must be set to the backend Vercel URL
  // e.g. https://your-backend.vercel.app
  const apiTarget = env.VITE_API_URL || "http://localhost:4000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
