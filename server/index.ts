import { testConnection } from "./db";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

async function initializeData() {
  console.log("🛠️ [SETUP] Verificando dados iniciais...");
  
  // 1. Garantir usuário admin
  const adminEmail = "juniornegocios015@gmail.com";
  const existingAdmin = await storage.getUserByUsername(adminEmail);
  
  if (!existingAdmin) {
    console.log("👤 [SETUP] Criando usuário administrador padrão...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      username: adminEmail,
      password: hashedPassword
    });
    console.log("✅ [SETUP] Administrador criado: " + adminEmail + " / admin123");
  }

  // 2. Garantir configurações iniciais
  const existingSettings = await storage.getAnySettings();
  if (!existingSettings) {
    console.log("⚙️ [SETUP] Inicializando tabela de configurações...");
    // Criamos um registro vazio vinculado ao admin (ou apenas global)
    const admin = await storage.getUserByUsername(adminEmail);
    if (admin) {
      await storage.updateSettings(String(admin.id), {
        environment: "sandbox",
        salesNotifications: false,
        metaEnabled: true,
        utmfyEnabled: true
      });
    }
  }
}

(async () => {
  console.log(`🌐 [SERVER] Iniciando em modo: ${process.env.NODE_ENV || "development"}`);
  
  const dbOk = await testConnection();
  if (dbOk) {
    await initializeData().catch(err => console.error("❌ [SETUP] Erro na inicialização:", err));
  }

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

  const args = process.argv.slice(2);
  const portIndex = args.indexOf("--port");
  const argPort = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : null;
  const port = argPort || parseInt(process.env.PORT || "5000", 10);

  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`\n🚀 METEORFY RODANDO NA PORTA ${port}!`);
  });
})();