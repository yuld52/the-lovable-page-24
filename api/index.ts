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
      const { registerRoutes } = await import("../server/routes");
      await registerRoutes(httpServer, app);

      app.use((err: any, _req: any, res: any, _next: any) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return;
        res.status(status).json({ message });
      });
    })();
  }
  return initPromise;
}

ensureInit().catch(console.error);

export default async function handler(req: any, res: any) {
  await ensureInit();
  return app(req, res);
}
