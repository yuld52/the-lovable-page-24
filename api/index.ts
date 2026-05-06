import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    limit: "12mb",
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

let initPromise: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log("[v0] Iniciando registerRoutes...");
        const { registerRoutes } = await import("../server/routes");
        console.log("[v0] Importado registerRoutes");
        await registerRoutes(httpServer, app);
        console.log("[v0] registerRoutes completado com sucesso");

        app.use((err: any, _req: any, res: any, _next: any) => {
          console.error("[v0] Error handler middleware:", err);
          const status = err.status || err.statusCode || 500;
          const message = err.message || "Internal Server Error";
          if (res.headersSent) return;
          res.status(status).json({ message });
        });
      } catch (error) {
        console.error("[v0] Erro durante inicialização:", error);
        console.error("[v0] Stack:", error instanceof Error ? error.stack : String(error));
        throw error;
      }
    })();
  }
  return initPromise;
}

ensureInit().catch((err) => {
  console.error("[v0] Falha fatal na inicialização:", err);
  console.error("[v0] Stack:", err instanceof Error ? err.stack : String(err));
});

export default async function handler(req: any, res: any) {
  await ensureInit();
  return app(req, res);
}
