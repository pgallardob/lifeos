import { defineConfig } from "vite";
import { resolve } from "node:path";

const API_TARGET = process.env.VITE_API_TARGET ?? "http://127.0.0.1:4780";

export default defineConfig({
  root: resolve(__dirname, "src/client"),
  publicDir: resolve(__dirname, "public"),
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/ws": {
        target: API_TARGET.replace(/^http/, "ws"),
        ws: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/client/index.html"),
        login: resolve(__dirname, "src/client/pages/login.html"),
        reset: resolve(__dirname, "src/client/pages/reset.html"),
        dashboard: resolve(__dirname, "src/client/pages/dashboard.html"),
        goals: resolve(__dirname, "src/client/pages/goals.html"),
        projects: resolve(__dirname, "src/client/pages/projects.html"),
        timeline: resolve(__dirname, "src/client/pages/timeline.html"),
        resources: resolve(__dirname, "src/client/pages/resources.html"),
        simulator: resolve(__dirname, "src/client/pages/simulator.html"),
        insights: resolve(__dirname, "src/client/pages/insights.html"),
        settings: resolve(__dirname, "src/client/pages/settings.html"),
      },
    },
  },
});
