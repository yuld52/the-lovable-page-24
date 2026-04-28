import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  console.log("🔧 [VITE] Inicializando servidor de desenvolvimento...");
  
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: viteLogger,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // SPA routing middleware
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Se for uma rota de API ou de uploads, deixa passar para os outros handlers
    if (url.startsWith("/api") || url.startsWith("/uploads")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Transforma o HTML usando o Vite (injeta o cliente HMR e resolve caminhos)
      const page = await vite.transformIndexHtml(url, template);
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error("❌ [VITE] Erro ao renderizar template:", e);
      next(e);
    }
  });

  console.log("✅ [VITE] Middleware pronto.");
}