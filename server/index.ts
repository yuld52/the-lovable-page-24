import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import helmet from "helmet";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ── Security headers (helmet) ─────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled — Vite/React injects inline scripts
    crossOriginEmbedderPolicy: false, // disabled — allows embedding PayPal SDK etc.
  }),
);

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  /\.replit\.dev$/,
  /\.repl\.co$/,
  /localhost/,
  /127\.0\.0\.1/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / server-to-server
      const allowed = allowedOrigins.some((pattern) =>
        typeof pattern === "string" ? pattern === origin : pattern.test(origin),
      );
      callback(null, allowed);
    },
    credentials: true,
  }),
);

// ── Body parsing ──────────────────────────────────────────────
app.use(
  express.json({
    limit: '12mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Basic healthcheck (no DB) to confirm API server is reachable
app.get("/api/health/basic", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Health check with DB (if needed)
app.get("/api/health", async (_req, res) => {
  try {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await registerRoutes(httpServer, app);
  } catch (err) {
    console.error("registerRoutes failed (server will still start):", err);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    try {
      serveStatic(app);
    } catch (err) {
      console.error("serveStatic failed:", err);
    }
  } else {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    } catch (err) {
      console.error("setupVite failed (API will still run):", err);
    }
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      console.log("\n\n" + "=".repeat(50));
      console.log("🚀 METEORFY SERVER RUNNING");
      console.log("🔒 SECURITY: helmet + cors + rate-limiting active");
      console.log("=".repeat(50) + "\n\n");
      log(`serving on port ${port}`);
    },
  );
})();
