import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupGitHubRoutes } from "./github-sync";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Setup GitHub integration routes
  setupGitHubRoutes(app);

  // Endpoint per l'analisi AI (CFO Virtuale)
  app.post("/api/analyze-financials", async (req, res) => {
    try {
      const data = req.body;
      // Importa dinamicamente per evitare problemi di inizializzazione se il modulo non è pronto
      const { analyzeFinancialDataWithAI } = await import("./ai-cfo");

      const result = await analyzeFinancialDataWithAI(data);
      res.json(result);
    } catch (error: any) {
      console.error("AI Route Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
