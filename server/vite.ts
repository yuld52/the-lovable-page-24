import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  console.log("🔧 [VITE] Inicializando servidor de desenvolvimento...");
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // SPA routing middleware for Express 5
  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API, static uploads, and Vite internal requests
    if (
      url.startsWith("/api") || 
      url.startsWith("/uploads") || 
      url.startsWith("/@") || 
      url.startsWith("/node_modules") ||
      url.includes(".")
    ) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      if (!fs.existsSync(clientTemplate)) {
        console.error(`❌ [VITE] Template não encontrado em: ${clientTemplate}`);
        return next();
      }

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Force reload of main entry point to avoid cache issues
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
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