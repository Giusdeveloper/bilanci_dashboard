import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, loadEnv } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Carica le variabili d'ambiente manualmente (necessario quando configFile: false)
  const root = path.resolve(import.meta.dirname, "..");
  const env = loadEnv("development", root, "");

  // Importa e risolve la configurazione asincrona di Vite
  const viteConfigModule = await import("../vite.config");
  const viteConfigExport = viteConfigModule.default;

  // viteConfigExport could be a function (for async config) or an object
  const viteConfigRaw = typeof viteConfigExport === "function"
    ? await viteConfigExport({ mode: "development", command: "serve" })
    : viteConfigExport;
  
  // Assicurati che viteConfig sia un oggetto, non una Promise
  const viteConfig = viteConfigRaw instanceof Promise ? await viteConfigRaw : viteConfigRaw;

  // Prepara le variabili d'ambiente da esporre al client (solo quelle con prefisso VITE_)
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("VITE_")) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    envDir: root, // Specifica la directory dove cercare i file .env
    define: {
      ...(viteConfig.define || {}),
      ...define,
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
