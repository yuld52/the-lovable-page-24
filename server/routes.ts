import type { Express } from "express";
import { createServer, type Server } from "http";
import { firestoreStorage as storage } from "./firestore-storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./middleware/auth";
import { adminAuth, adminDb, adminStorage } from "./firebase-admin";
import { UserRecord } from "firebase-admin/auth";

import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/routes";
import { registerTrackingRoutes } from "./trackingRoutes";

// Firebase Firestore - for notifications (to be implemented)
// import { pushSubscriptions, notifications } from "@shared/schema";
// import { eq, desc } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Firebase Firestore migration note:
  // Database operations are now handled via Firebase Firestore instead of PostgreSQL
  // The ensureCoreTables was creating settings in PostgreSQL - need to migrate to Firestore

  // TODO: Migrate settings storage to Firebase Firestore
  // For now, skip PostgreSQL initialization completely
  // try {
  //   await ensureCoreTables();
  // } catch (err) {
  //   console.error("ensureCoreTables failed (skipping for now):", err);
  // }

  // registerObjectStorageRoutes(app);

  // Public tracking endpoints
  registerTrackingRoutes(app, storage);

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const objectStorageService = new (await import("./replit_integrations/object_storage/objectStorage")).ObjectStorageService();
      const { name, size, contentType } = req.body;
      const objectKey = `public/${Date.now()}-${name}`;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(objectKey);
      res.json({
        uploadURL,
        objectPath: `/${objectKey}`,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.use("/objects-cdn", async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
      const objectStorageService = new ObjectStorageService();

      // Extract the relative path from the request URL
      const objectPath = req.path.replace(/^\//, "");

      if (!objectPath) {
        return res.status(400).json({ error: "Object path is required" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      if (!objectFile) return res.status(404).json({ error: "Object not found" });
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("CDN Error:", error);
      res.status(404).json({ error: "Object not found" });
    }
  });

  // Setup upload directory
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage_multer = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });


  app.post("/api/upload", (req, res) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        // Multer throws for file size limits, etc.
        const message =
          err?.code === "LIMIT_FILE_SIZE"
            ? "O arquivo excede o limite de 10MB."
            : "Falha no upload";
        return res.status(400).json({ message });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ message: "Nenhum arquivo enviado" });

      // Served statically from /public
      const url = `/uploads/${file.filename}`;
      return res.json({ url });
    });
  });

  // Check if user email already exists (public endpoint for registration validation)
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "E-mail é obrigatório" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check in Firebase Auth
      try {
        const user = await adminAuth.getUserByEmail(normalizedEmail);
        if (user) {
          return res.status(409).json({
            message: "Este e-mail já está cadastrado no sistema.",
            exists: true
          });
        }
      } catch (err: any) {
        // User not found is expected - other errors we log
        if (err.code !== 'auth/user-not-found') {
          console.error("Error checking user in Firebase:", err);
        }
      }

      // Also check in local storage database
      const localUsers = await storage.getUsers();
      const localUser = localUsers.find(u => u.username?.toLowerCase() === normalizedEmail);
      if (localUser) {
        return res.status(409).json({
          message: "Este e-mail já está cadastrado no sistema.",
          exists: true
        });
      }

      // Email is available
      return res.json({ exists: false });
    } catch (err: any) {
      console.error("Check email error:", err);
      // If there's an error, don't block registration - let Supabase handle it
      return res.json({ exists: false });
    }
  });

  // Protected routes (require Supabase auth token)
  app.get("/api/user", requireAuth, async (req, res) => {
    // Mirror the authenticated user (used by Sidebar)
    res.json((req as any).user);
  });

  app.get("/api/debug-env", requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (user.email !== "juniornegocios015@gmail.com") return res.sendStatus(403);

    res.json({
      storageType: storage.constructor.name,
      firebaseAuthInitialized: !!adminAuth,
      nodeEnv: process.env.NODE_ENV
    });
  });

  // User management routes have been moved to the bottom of the registerRoutes function to ensure correct initialization.

  // Products (protected)
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const userId = String((req as any).user?.id || "");
    const products = await storage.getProducts(userId);
    res.json(products);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct({ ...input, userId });
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch(api.products.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(id, input);
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete(api.products.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteProduct(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const product = await storage.getProduct(id);
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Checkouts
  app.get(api.checkouts.list.path, requireAuth, async (req, res) => {
    const userId = String((req as any).user?.id || "");
    const checkoutsList = await storage.getCheckouts(userId);
    res.json(checkoutsList);
  });

  app.get("/api/checkouts/public/:slug", async (req, res) => {
    try {
      const checkout = await storage.getCheckoutBySlug(req.params.slug);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });

      const product = await storage.getProduct(checkout.productId);
      if (!product) {
        console.warn(`[Checkout] Product not found: checkout ID=${checkout.id}, productId=${checkout.productId}, slug=${req.params.slug}`);
        return res.status(404).json({
          message: "Produto não encontrado. O checkout existe mas o produto associado foi removido.",
          checkoutId: checkout.id,
          productId: checkout.productId
        });
      }

      await storage.incrementCheckoutViews(checkout.id);

      res.json({ checkout, product });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.checkouts.create.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.checkouts.create.input.parse(req.body);

      // Get the current domain
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      // Auto-generate public URL based on slug
      const publicUrl = `${baseUrl}/checkout/${input.slug}`;

      const checkout = await storage.createCheckout({
        ...input,
        ownerId: userId,
        publicUrl,
      } as any);
      res.status(201).json(checkout);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        console.error("Create checkout error:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.checkouts.get.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const id = parseInt(req.params.id as string);
      const checkout = await storage.getCheckout(id, userId);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });
      res.json(checkout);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.checkouts.update.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const id = parseInt(req.params.id as string);
      const input = api.checkouts.update.input.parse(req.body);
      const checkout = await storage.updateCheckout(id, userId, input);
      res.json(checkout);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Settings (scoped per authenticated user)
  app.get(api.settings.get.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const settings = await storage.getSettings(userId);
      if (!settings) {
        return res.json({ environment: "production" });
      }
      res.json(settings);
    } catch (err: any) {
      console.error("GET /api/settings error:", err);
      res.status(500).json({
        message: err?.message || "Internal server error",
        code: err?.code,
        detail: err?.detail,
      });
    }
  });

  app.post(api.settings.update.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.settings.update.input.parse(req.body);
      const settings = await storage.updateSettings(userId, input);
      res.json(settings);
    } catch (err: any) {
      console.error("POST /api/settings error:", err);
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      } else {
        res.status(500).json({
          message: err?.message || "Internal server error",
          code: err?.code,
          detail: err?.detail,
        });
      }
    }
  });

  // Stats
  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const period = req.query.period as string;
      const productId = req.query.productId as string;
      const stats = await storage.getDashboardStats(userId, period, productId);
      res.json(stats);
    } catch (err: any) {
      console.error("GET /api/stats error:", err);
      res.status(500).json({
        message: err?.message || "Internal server error",
        code: err?.code,
        detail: err?.detail,
      });
    }
  });

  // PayPal API Integration (real)
  // Public config for checkout page (requires slug)
  app.get("/api/paypal/public-config", async (req, res) => {
    try {
      const slug = typeof req.query.slug === "string" ? req.query.slug : "";
      console.log(`[PayPal Config] 🔍 Request for slug: "${slug}"`);

      if (!slug) return res.status(400).json({ message: "Missing slug" });

      const checkout = await storage.getCheckoutBySlug(slug);
      console.log(`[PayPal Config] 📦 Checkout found:`, checkout ? `ID=${checkout.id}, ownerId=${checkout.ownerId}` : "NOT FOUND");

      if (!checkout) {
        console.warn(`[PayPal Config] ❌ Checkout not found for slug: ${slug}`);
        return res.status(404).json({ message: "Checkout não encontrado" });
      }

      let settings: any = null;
      let source = "none";

      // 1. Try checkout owner specifically
      if (checkout.ownerId) {
        console.log(`[PayPal Config] 👤 Trying owner settings for ownerId: ${checkout.ownerId}`);
        settings = await storage.getSettings(String(checkout.ownerId));
        console.log(`[PayPal Config] 👤 Owner settings check:`, settings ? `Found, hasClientId=${!!settings.paypalClientId}` : "NOT FOUND");
      }

      // 2. Fallback to ANY settings in the system (FORÇADO para garantir o funcionamento)
      if (!settings?.paypalClientId) {
        console.log(`[PayPal Config] 🔄 Fallback: Buscando qualquer configuração disponível no sistema...`);
        const fallback = await storage.getAnySettings();
        if (fallback?.paypalClientId) {
          settings = fallback;
          source = "any-system-fallback";
          console.log(`[PayPal Config] ✅ Fallback bem sucedido! Usando Client ID do sistema.`);
        }
      } else {
        source = "owner";
      }

      const clientId = settings?.paypalClientId ?? null;
      const environment = "production";

      console.log(`[PayPal Config] ✅ Resolved for slug "${slug}": Source=${source}, ClientId=${clientId ? `${clientId.substring(0, 20)}...` : "MISSING"}, Env=${environment}`);

      // Allow checkout without PayPal configured - return empty config
      // This allows the checkout page to load even without PayPal setup
      if (!clientId) {
        console.log(`[PayPal Config] ⚠️ No PayPal configuration found - allowing checkout without PayPal`);
        return res.json({
          clientId: null,
          environment: "production", // Default to production when not configured
          message: "PayPal não configurado - checkout limitado"
        });
      }

      res.json({
        clientId: clientId,
        environment: environment,
      });
    } catch (err: any) {
      console.error("GET /api/paypal/public-config error:", err);
      res.status(500).json({ message: err?.message || "Internal server error" });
    }
  });

  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { createOrderBodySchema, createOrder } = await import("./paypal");
      const body = createOrderBodySchema.parse(req.body);

      const checkout = await storage.getCheckoutPublic(body.checkoutId);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });

      const product = await storage.getProduct(body.productId);
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });

      // Pull credentials from Firebase or local storage
      const authHeader = req.headers.authorization;
      const jwt = typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      let settingsRow: any = null;
      let source = "none";

      if (jwt) {
        // Verify JWT with Firebase
        try {
          const decodedToken = await adminAuth.verifyIdToken(jwt);
          const userId = decodedToken.uid;

          // Try to get settings from storage using Firebase UID
          settingsRow = await storage.getSettings(userId);
          if (settingsRow) {
            source = "jwt-user";
          }
        } catch (err) {
          // JWT invalid, continue to public checkout flow
        }
      }
      // Public checkout flow: Try checkout owner first
      if (checkout.ownerId) {
        settingsRow = await storage.getSettings(String(checkout.ownerId));
        if (settingsRow?.paypalClientId || (settingsRow as any)?.paypal_client_id) {
          source = "owner-storage";
        }
      }

      // Fallback to ANY settings if needed
      if (!settingsRow?.paypalClientId && !(settingsRow as any)?.paypal_client_id) {
        const fallback = await storage.getAnySettings();
        if (fallback) {
          settingsRow = fallback;
          source = "any-fallback";
        }
      }

      console.log(`[Create Order] Slug: ${checkout.slug}, Source: ${source}, Env: ${settingsRow?.environment || "sandbox"}`);

      const paypalClientId = settingsRow?.paypal_client_id ?? settingsRow?.paypalClientId;
      const paypalClientSecret = settingsRow?.paypal_client_secret ?? settingsRow?.paypalClientSecret;
      const paypalWebhookId = settingsRow?.paypal_webhook_id ?? settingsRow?.paypalWebhookId;

      if (!paypalClientId || !paypalClientSecret) {
        return res.status(500).json({
          message: "Credenciais do PayPal não encontradas nas Configurações (preencha Client ID e Secret do PayPal)",
        });
      }

      // Always use production
      const environment = "production" as any;

      const order = await createOrder(
        {
          clientId: String(paypalClientId),
          clientSecret: String(paypalClientSecret),
          environment,
          webhookId: paypalWebhookId ?? null,
        },
        {
          currency: body.currency,
          amountMinor: body.totalMinor,
          description: product.name,
        },
      );

      // Capture UTM params from referrer URL (checkout page) and persist on the sale.
      const utm = (() => {
        const raw = typeof req.get("referer") === "string" ? req.get("referer") : "";
        try {
          const url = raw ? new URL(raw) : null;
          const p = url?.searchParams;
          const pick = (k: string) => (p?.get(k) ? String(p.get(k)) : null);
          return {
            utm_source: pick("utm_source"),
            utm_medium: pick("utm_medium"),
            utm_campaign: pick("utm_campaign"),
            utm_content: pick("utm_content"),
            utm_term: pick("utm_term"),
          };
        } catch {
          return {
            utm_source: null,
            utm_medium: null,
            utm_campaign: null,
            utm_content: null,
            utm_term: null,
          };
        }
      })();

      await storage.createSale({
        checkoutId: body.checkoutId,
        productId: body.productId,
        user_id: checkout.ownerId, // Save the owner ID for dashboard filtering
        amount: body.totalUsdCents,
        status: "pending",
        customerEmail: body.customerData?.email || null,
        paypalOrderId: order.id,
        paypalCurrency: body.currency,
        paypalAmountMinor: body.totalMinor,
        ...(utm as any),
      } as any);

      res.json({ id: order.id });
    } catch (err: any) {
      // Ensure we ALWAYS return a non-empty JSON body so the client can show the real cause.
      try {
        console.error("PayPal Create Order Error:", err);
      } catch {
        // ignore
      }

      if (res.headersSent) return;

      const message =
        (typeof err?.message === "string" && err.message) ||
        (typeof err === "string" && err) ||
        "Erro ao criar pedido PayPal";

      // Use Express json() to avoid proxies/clients treating the body as empty.
      return res.status(500).json({ message });
    }
  });

  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { captureOrder } = await import("./paypal");
      const { orderId } = req.params;

      const sale = await storage.getSaleByPaypalOrderId(String(orderId));
      if (!sale?.checkoutId) return res.status(404).json({ message: "Venda não encontrada" });

      const checkout = await storage.getCheckoutPublic(Number(sale.checkoutId));
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });

      const ownerId = checkout.ownerId ? String(checkout.ownerId) : "";
      let settingsRow: any = ownerId ? await storage.getSettings(ownerId) : undefined;

      if (!settingsRow?.paypalClientId && !(settingsRow as any)?.paypal_client_id) {
        settingsRow = await storage.getAnySettings();
      }

      const paypalClientId = settingsRow?.paypal_client_id ?? settingsRow?.paypalClientId;
      const paypalClientSecret = settingsRow?.paypal_client_secret ?? settingsRow?.paypalClientSecret;

      if (!paypalClientId || !paypalClientSecret) {
        return res.status(500).json({ message: "PayPal não configurado" });
      }

      const environment = "production" as any;
      const captured = await captureOrder(
        {
          clientId: String(paypalClientId),
          clientSecret: String(paypalClientSecret),
          environment,
          webhookId: settingsRow?.paypal_webhook_id ?? settingsRow?.paypalWebhookId ?? null,
        },
        String(orderId),
      );

      await storage.updateSaleStatus(sale.id, "paid");
      // Note: PostgreSQL disabled - paypal_capture_id update skipped
      // TODO: Migrate to Firebase Firestore
      if (captured.captureId) {
        console.log("[DB] PostgreSQL disabled - skipping capture_id update");
      }

      res.json({ status: captured.status || "COMPLETED" });
    } catch (err: any) {
      console.error("PayPal Capture Order Error:", err);
      res.status(500).json({ message: err?.message || "Erro ao capturar pedido PayPal" });
    }
  });

  // Refund (protected)
  app.post("/api/paypal/refund", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const { refundBodySchema, refundCapture } = await import("./paypal");
      const body = refundBodySchema.parse(req.body);

      const settings = await storage.getSettings(userId);
      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        return res.status(500).json({ message: "PayPal não configurado" });
      }

      // Note: PostgreSQL disabled - sale query skipped
      // TODO: Migrate to Firebase Firestore
      const sale: any = null;

      // PostgreSQL disabled - return error for now
      return res.status(500).json({ message: "Funcionalidade de reembolso temporariamente indisponível" });
    } catch (err: any) {
      console.error("PayPal Refund Error:", err);
      res.status(500).json({ message: err?.message || "Erro ao reembolsar" });
    }
  });

  // Webhook (optional verification when webhook id is set)
  // Multi-user: resolve settings by sale -> checkout -> ownerId.
  app.post("/api/paypal/webhook", async (req, res) => {
    try {
      const event = req.body;
      const eventType = String(event?.event_type || "");

      // Best-effort: map order id
      const orderId =
        event?.resource?.supplementary_data?.related_ids?.order_id ||
        event?.resource?.supplementary_data?.related_ids?.orderID ||
        event?.resource?.id;

      if (!orderId) return res.json({ ok: true });

      // We only process on confirmed states
      const shouldMarkPaid = eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED";
      const shouldMarkRefunded = eventType === "PAYMENT.CAPTURE.REFUNDED";

      if (!shouldMarkPaid && !shouldMarkRefunded) return res.json({ ok: true });

      const sale = await storage.getSaleByPaypalOrderId(String(orderId));
      if (!sale?.checkoutId) return res.json({ ok: true });

      const checkout = await storage.getCheckoutPublic(Number(sale.checkoutId));
      if (!checkout?.ownerId) return res.json({ ok: true });

      const ownerId = String(checkout.ownerId);
      const settings = await storage.getSettings(ownerId);

      // Verify signature if webhook id configured for this owner
      const environment = "production" as any;
      if (settings?.paypalWebhookId && settings?.paypalClientId && settings?.paypalClientSecret) {
        const creds = {
          clientId: settings.paypalClientId,
          clientSecret: settings.paypalClientSecret,
          environment,
          webhookId: settings.paypalWebhookId,
        };

        const rawBody = (req as any).rawBody
          ? Buffer.from((req as any).rawBody).toString("utf8")
          : JSON.stringify(req.body);

        const { verifyWebhookSignature } = await import("./paypal");
        const verified = await verifyWebhookSignature(creds as any, {
          transmissionId: String(req.header("paypal-transmission-id") || ""),
          transmissionTime: String(req.header("paypal-transmission-time") || ""),
          certUrl: String(req.header("paypal-cert-url") || ""),
          authAlgo: String(req.header("paypal-auth-algo") || ""),
          transmissionSig: String(req.header("paypal-transmission-sig") || ""),
          webhookEventBody: rawBody,
        });

        if (verified.verificationStatus !== "SUCCESS") {
          return res.status(400).json({ message: "Assinatura inválida" });
        }
      }

      // Build a unified tracking payload
      const trackingSettings = settings
        ? {
          utmfyToken: settings.utmfyToken,
          facebookPixelId: settings.facebookPixelId,
          facebookAccessToken: (settings as any).facebookAccessToken ?? (settings as any).facebook_access_token,

          // toggles (fallback true)
          metaEnabled: (settings as any).metaEnabled ?? (settings as any).meta_enabled ?? true,
          utmfyEnabled: (settings as any).utmfyEnabled ?? (settings as any).utmfy_enabled ?? true,
          trackTopFunnel: (settings as any).trackTopFunnel ?? (settings as any).track_top_funnel ?? true,
          trackCheckout: (settings as any).trackCheckout ?? (settings as any).track_checkout ?? true,
          trackPurchaseRefund: (settings as any).trackPurchaseRefund ?? (settings as any).track_purchase_refund ?? true,
          salesNotifications: (settings as any).salesNotifications ?? (settings as any).sales_notifications ?? false,
        }
        : null;

      const trackingSale = {
        id: sale.id,
        amount: sale.amount,
        customerEmail: sale.customerEmail,
        utmSource: (sale as any).utm_source ?? (sale as any).utmSource,
        utmMedium: (sale as any).utm_medium ?? (sale as any).utmMedium,
        utmCampaign: (sale as any).utm_campaign ?? (sale as any).utmCampaign,
        utmContent: (sale as any).utm_content ?? (sale as any).utmContent,
        utmTerm: (sale as any).utm_term ?? (sale as any).utmTerm,
      };

      if (shouldMarkRefunded) {
        // Idempotency: don't duplicate refund tracking
        if (String((sale as any).status) === "refunded") return res.json({ ok: true, idempotent: true });

        await storage.updateSaleStatus(sale.id, "refunded");

        const { processRefundTracking } = await import("./tracking");
        await processRefundTracking(trackingSettings as any, trackingSale as any);

        return res.json({ ok: true });
      }

      // Paid
      if (String((sale as any).status) === "paid") {
        return res.json({ ok: true, idempotent: true });
      }

      await storage.updateSaleStatus(sale.id, "paid");

      // Send Push Notification
      try {
        const { sendNotification } = await import("./services/notification");
        const checkoutName = (checkout as any)?.name || "Produto";

        // Notify the seller
        await sendNotification({
          userId: ownerId,
          type: "PURCHASE_APPROVED",
          metadata: {
            amount: (sale.amount / 100).toFixed(2),
            currency: "USD", // TODO: Use sale currency
            productName: checkoutName
          }
        });
      } catch (notifyErr) {
        console.error("Failed to send push notification:", notifyErr);
      }

      const { processPurchaseTracking } = await import("./tracking");
      await processPurchaseTracking(trackingSettings as any, trackingSale as any);

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("PayPal Webhook Error:", err);
      res.status(500).json({ message: err?.message || "Erro no webhook" });
    }
  });

  // Push Subscriptions
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const { subscription } = req.body;

      console.log(`[PUSH] Subscribe request for user ${userId}`);

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription" });
      }

      const { saveSubscription, sendNotification } = await import("./services/notification");
      
      // Start saving and notifying in background without blocking response
      saveSubscription(userId, subscription).catch(e => console.error("[PUSH] Save failed:", e));
      
      (async () => {
          try {
            await sendNotification({
              userId,
              type: "system",
              title: "🎉 Notificações Ativas!",
              body: "Parabéns! Você receberá alertas de vendas em tempo real neste dispositivo."
            });
          } catch (pushErr) {
            console.error(`[PUSH] Initial notification failed for ${userId}:`, pushErr);
          }
      })();

      res.json({ success: true });
    } catch (err) {
      console.error("[PUSH] Subscribe route error:", err);
      res.status(500).json({ message: "Failed to subscribe", error: String(err) });
    }
  });

  app.get("/api/push/public-key", requireAuth, async (_req, res) => {
    try {
      console.log("[PUSH] Public key requested");
      const { getVapidPublicKey } = await import("./services/notification");
      const key = getVapidPublicKey();
      console.log(`[PUSH] Returning public key (exists: ${!!key})`);
      res.json({ publicKey: key });
    } catch (err) {
      console.error("[PUSH] Public-key route error:", err);
      res.status(500).json({ message: "Failed to get public key", error: String(err) });
    }
  });

  // Test Push
  app.post("/api/push/test", requireAuth, async (req, res) => {
    try {
      const { sendNotification, getSubscriptions } = await import("./services/notification");
      const userId = String((req as any).user?.id || "");

      console.log(`[PUSH TEST] Request by user ${userId}`);

      const subs = await getSubscriptions(userId);
      console.log(`[PUSH TEST] Found ${subs.length} subscriptions`);

      if (subs.length === 0) {
        return res.json({ success: false, message: "Nenhuma assinatura encontrada. Ative as notificações primeiro." });
      }

      await sendNotification({
        userId,
        type: "system",
        title: "Teste de Notificação",
        body: "Se você recebeu isso, as notificações estão funcionando!"
      });

      res.json({ success: true });
    } catch (err) {
      console.error("[PUSH TEST] route error:", err);
      res.status(500).json({ message: "Failed to send test push", error: String(err) });
    }
  });

  // User Management - Single reliable source of truth (Firebase Admin)
  app.get("/api/users-v2", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const isAdminEmail = user?.email?.toLowerCase().trim() === "juniornegocios015@gmail.com";

      if (!isAdminEmail) {
        console.warn(`[USERS_API] Forbidden access attempt by ${user?.email}`);
        return res.status(403).json({ message: "Acesso negado." });
      }

      console.log(`[USERS_API] Fetching users list for admin: ${user.email}`);
      const listUsersResult = await adminAuth.listUsers(1000);
      console.log(`[USERS_API] Firebase Auth returned ${listUsersResult.users.length} users`);
      
      const users = listUsersResult.users.map(userRecord => {
        const u = {
          id: userRecord.uid,
          email: userRecord.email,
          username: userRecord.displayName || userRecord.email || "Sem nome",
          createdAt: userRecord.metadata.creationTime,
          lastLogin: userRecord.metadata.lastSignInTime
        };
        console.log(`[USERS_API] Found user: ${u.email}`);
        return u;
      });

      res.json(users);
    } catch (err: any) {
      console.error("[USERS] list error:", err);
      res.status(500).json({ message: "Erro ao listar usuários do sistema", details: err?.message });
    }
  });

  app.delete("/api/users-v2/:uid", requireAuth, async (req, res) => {
    try {
      const admin = (req as any).user;
      const targetUid = req.params.uid;

      if (admin?.email?.toLowerCase().trim() !== "juniornegocios015@gmail.com") {
        return res.status(403).json({ message: "Acesso negado." });
      }

      if (admin?.id === targetUid) {
        return res.status(400).json({ message: "Você não pode excluir a sua própria conta." });
      }

      if (targetUid === "dummy-id") {
        return res.json({ success: true, message: "Usuário dummy removido apenas da visualização." });
      }

      await adminAuth.deleteUser(targetUid);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[USERS] delete error:", err);
      res.status(500).json({ message: "Erro ao excluir usuário", details: err?.message });
    }
  });

  app.post("/api/users-v2", requireAuth, async (req, res) => {
    try {
      const actorId = String((req as any).user?.id || "");
      const { email, password } = req.body;

      const actorRecord = await adminAuth.getUser(actorId);
      if (actorRecord.email !== "juniornegocios015@gmail.com") {
        return res.status(403).json({ message: "Acesso negado." });
      }

      if (!email || !password) {
        return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
      }

      const userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: true
      });

      res.status(201).json({ id: userRecord.uid, email: userRecord.email, success: true });
    } catch (err: any) {
      console.error("[USERS] create error:", err);
      res.status(500).json({ message: "Erro ao criar usuário", error: err?.message });
    }
  });

  // Public debug route to test user listing
  app.get("/api/debug/auth-users", async (req, res) => {
    try {
      const listUsersResult = await adminAuth.listUsers(100);
      res.json({
        count: listUsersResult.users.length,
        users: listUsersResult.users.map(u => ({ email: u.email, id: u.uid })),
        projectId: adminAuth.app.options.projectId
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notifications

  // Temporary Migration Route - Supabase to Firebase Auth
  app.post("/api/admin/migrate-users", requireAuth, async (req, res) => {
    try {
      const adminEmail = (req as any).user?.email;
      if (adminEmail !== "juniornegocios015@gmail.com") return res.sendStatus(403);

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase credentials missing in .env");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: supaUsers, error } = await supabase.from("users").select("*");

      if (error) throw error;
      if (!supaUsers || supaUsers.length === 0) return res.json({ message: "No users found in Supabase" });

      const results = { total: supaUsers.length, migrated: 0, skipped: 0, errors: [] as string[] };

      for (const user of supaUsers) {
        try {
          const email = (user.username || user.email || "").toLowerCase().trim();
          if (!email || !email.includes("@")) {
            results.skipped++;
            continue;
          }

          try {
            await adminAuth.getUserByEmail(email);
            results.skipped++; // Already exists
          } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
              // Create user in Firebase
              await adminAuth.createUser({
                email,
                password: email.split("@")[0] + "123", // Default password
                displayName: user.username || email.split("@")[0]
              });
              results.migrated++;
            } else {
              throw e;
            }
          }
        } catch (err: any) {
          results.errors.push(`${user.username}: ${err.message}`);
        }
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Seed Data (best-effort; never block server startup)
  try {
    await seedDatabase();
  } catch (err) {
    console.error("seedDatabase failed:", err);
  }

  // Debug endpoint to fix checkout productId (temp fix for invalid checkouts)
  app.patch("/api/checkouts/debug/:id/fix-product", async (req, res) => {
    try {
      const checkoutId = parseInt(req.params.id);
      const { productId } = req.body;

      if (!productId || productId <= 0) {
        return res.status(400).json({ message: "productId inválido" });
      }

      // Direct Firestore update
      const docRef = adminDb.collection("checkouts").doc(String(checkoutId));
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ message: "Checkout não encontrado" });
      }

      await docRef.update({ product_id: productId });

      res.json({ success: true, checkoutId, productId });
    } catch (err: any) {
      console.error("Debug fix error:", err);
      res.status(500).json({ message: err?.message || "Internal server error" });
    }
  });

  // Debug endpoint to delete ALL products (for reset)
  app.delete("/api/debug/products/all", async (req, res) => {
    try {
      const snapshot = await adminDb.collection("products").get();
      const batch = adminDb.batch();
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      res.json({ success: true, deletedCount: snapshot.size });
    } catch (err: any) {
      console.error("Debug delete all products error:", err);
      res.status(500).json({ message: err?.message || "Internal server error" });
    }
  });

  // Debug endpoint to delete ALL checkouts (for reset)
  app.delete("/api/debug/checkouts/all", async (req, res) => {
    try {
      const snapshot = await adminDb.collection("checkouts").get();
      const batch = adminDb.batch();
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      res.json({ success: true, deletedCount: snapshot.size });
    } catch (err: any) {
      console.error("Debug delete all checkouts error:", err);
      res.status(500).json({ message: err?.message || "Internal server error" });
    }
  });

  return httpServer;
}

async function seedDatabase() {
  // Em modo multiusuário, não criamos settings globais automaticamente.
  // Cada usuário cria suas próprias credenciais ao salvar em /settings.
  return;
}

async function ensureCoreTables() {
  // Firebase Firestore Migration: PostgreSQL is disabled
  // All database operations should be migrated to Firebase Firestore
  // This function is kept for reference but does nothing

  console.log("[DB] ensureCoreTables skipped - PostgreSQL disabled, using Firebase Firestore");
  return;

  // The following code is commented out as PostgreSQL is disabled:
  // ensurePool();

  // // Always ensure settings table exists (used by /api/settings and PayPal config)
  // await pool.query(`
  //   CREATE TABLE IF NOT EXISTS "settings" (
  //     "id" serial PRIMARY KEY NOT NULL,
  //     "user_id" uuid,
  //     "paypal_client_id" text,
  //     "paypal_client_secret" text,
  //     "paypal_webhook_id" text,
  //     "facebook_pixel_id" text,
  //     "facebook_access_token" text,
  //     "utmfy_token" text,
  //     "environment" text DEFAULT 'production',
  //
  //     "meta_enabled" boolean DEFAULT true,
  //     "utmfy_enabled" boolean DEFAULT true,
  //     "track_top_funnel" boolean DEFAULT true,
  //     "track_checkout" boolean DEFAULT true,
  //     "track_purchase_refund" boolean DEFAULT true
  //   );
  // `);
}

// Firebase Firestore Migration: PostgreSQL disabled