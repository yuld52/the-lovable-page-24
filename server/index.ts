import { testConnection } from "./db";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

(async () => {
  console.log(`🌐 [SERVER] Iniciando em modo: ${process.env.NODE_ENV || "development"}`);
  
  await testConnection();

  try {
    await registerRoutes(httpServer, app);
  } catch (err) {
    console.error("❌ [SERVER] Falha ao registrar rotas:", err);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (res.headersSent) return next(err);
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    console.log("📦 [SERVER] Servindo arquivos estáticos (Produção)");
    serveStatic(app);
  } else {
    console.log("⚡ [SERVER] Configurando Vite (Desenvolvimento)");
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Captura a porta do argumento --port ou da variável de ambiente PORT
  const args = process.argv.slice(2);
  const portIndex = args.indexOf("--port");
  const argPort = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : null;
  const port = argPort || parseInt(process.env.PORT || "5000", 10);

  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`\n🚀 METEORFY RODANDO NA PORTA ${port}!`);
  });
})();