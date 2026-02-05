import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  // Carica le variabili d'ambiente dalla root del progetto (dove c'è vite.config.ts)
  const env = loadEnv(mode, process.cwd(), '');

  // Carica i plugin Replit in modo asincrono se necessario
  const replitPlugins = process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
    ? [
      (await import("@replit/vite-plugin-cartographer")).cartographer(),
      (await import("@replit/vite-plugin-dev-banner")).devBanner(),
    ]
    : [];

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    base: mode === 'production' ? '/bilanci_dashboard/' : '/',
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    // Esponi le variabili d'ambiente VITE_* al client
    envPrefix: 'VITE_',
  };
});
