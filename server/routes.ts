import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { neonStorage as storage } from "./neon-storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./middleware/auth";
import { adminAuth, adminDb, adminStorage } from "./firebase-admin";
import { getVapidPublicKey, saveSubscription } from "./services/notification";

import { registerTrackingRoutes } from "./trackingRoutes";
import { registerChatRoutes } from "./chat";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerTrackingRoutes(app, storage as any);
  registerChatRoutes(app);

  // Pasta de uploads — usa /tmp no Vercel (serverless), pasta local no Replit
  const uploadsDir = process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configuração do Multer para salvar localmente
  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      cb(null, `${Date.now()}-${safeName}`);
    },
  });

  const upload = multer({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // --- ROTA DE UPLOAD (armazenamento local) ---
  app.post("/api/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const file = req.file;
      // Use relative path so it works on any domain (Replit, production, etc.)
      const relativePath = `/uploads/${file.filename}`;

      res.json({
        url: relativePath,
        path: relativePath,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
      });
    } catch (err: any) {
      console.error("[Upload] ERRO:", err);
      res.status(500).json({ message: err.message || "Falha ao carregar imagem" });
    }
  });

  // --- PUSH NOTIFICATIONS ---
  app.get("/api/push/public-key", (req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return res.status(500).json({ message: "VAPID keys not configured" });
    }
    res.json({ publicKey });
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      if (!subscription || !userId) {
        return res.status(400).json({ message: "Missing subscription or userId" });
      }
      await saveSubscription(userId, subscription);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Push subscription error:", err);
      res.status(500).json({ message: err.message || "Failed to save subscription" });
    }
  });

  app.post("/api/push/notify-activated", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const { sendNotification } = await import("./services/notification");
      await sendNotification({
        userId,
        type: "system",
        title: "Notificações ativas",
        body: "Você receberá alertas de vendas em tempo real.",
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Push notify-activated error:", err);
      res.status(500).json({ message: err.message || "Failed to send activation notification" });
    }
  });

  // --- AUTENTICAÇÃO ---
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "E-mail é obrigatório" });
      try {
        const user = await adminAuth.getUserByEmail(email.toLowerCase().trim());
        if (user) return res.status(409).json({ message: "Este e-mail já está cadastrado.", exists: true });
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') console.error("Error checking user:", err);
      }
      res.json({ exists: false });
    } catch (err) {
      res.json({ exists: false });
    }
  });

  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      res.json((req as any).user);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // --- PRODUTOS ---
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getProducts(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting products:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar produtos" });
    }
  });

  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const productData = {
        ...req.body,
        ownerId: userId,
        status: 'pending'
      };
      const result = await storage.createProduct(productData);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[CREATE PRODUCT] Erro:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id as string));
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });
      res.json(product);
    } catch (err: any) {
      console.error("Error getting product:", err);
      res.status(500).json({ message: err.message || "Erro ao buscar produto" });
    }
  });

  app.patch("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const result = await storage.updateProduct(id, req.body);
      res.json(result);
    } catch (err: any) {
      console.error("Error updating product:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id as string));
      res.status(204).end();
    } catch (err: any) {
      console.error("Error deleting product:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // --- CHECKOUTS ---
  app.get("/api/checkouts", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getCheckouts(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting checkouts:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar checkouts" });
    }
  });

  app.post("/api/checkouts", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const baseUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
      const result = await storage.createCheckout({ ...req.body, ownerId: userId, publicUrl: `${baseUrl}/checkout/${req.body.slug}` });
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[CREATE CHECKOUT] Erro:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/checkouts/:id", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const checkout = await storage.getCheckout(parseInt(req.params.id as string), userId);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });
      res.json(checkout);
    } catch (err: any) {
      console.error("Error getting checkout:", err);
      res.status(500).json({ message: err.message || "Erro ao buscar checkout" });
    }
  });

  app.patch("/api/checkouts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const result = await storage.updateCheckout(id, String((req as any).user?.id || ""), req.body);
      res.json(result);
    } catch (err: any) {
      console.error("Error updating checkout:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/checkouts/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCheckout(parseInt(req.params.id as string), String((req as any).user?.id || ""));
      res.status(204).end();
    } catch (err: any) {
      console.error("Error deleting checkout:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // --- VENDAS ---
  app.get("/api/sales", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getSales(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting sales:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar vendas" });
    }
  });

  // --- CONFIGURAÇÕES ---
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const settings = await storage.getSettings(userId);
      if (!settings) {
        // Return default settings instead of 404
        return res.json({
          id: userId,
          userId,
          paypalClientId: null,
          paypalClientSecret: null,
          paypalWebhookId: null,
          facebookPixelId: null,
          facebookAccessToken: null,
          utmfyToken: null,
          salesNotifications: false,
          environment: "production",
          metaEnabled: true,
          utmfyEnabled: true,
          trackTopFunnel: true,
          trackCheckout: true,
          trackPurchaseRefund: true,
        });
      }
      res.json(settings);
    } catch (error: any) {
      console.error("Error getting settings:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar configurações" });
    }
  });

  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.updateSettings(userId, req.body);
      res.json(result);
    } catch (err: any) {
      console.error("Error updating settings:", err);
      res.status(400).json({ message: err.message });
    }
  });

  // --- ESTATÍSTICAS ---
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getDashboardStats(
        userId,
        req.query.period as string,
        req.query.productId as string,
        req.query.startDate as string,
        req.query.endDate as string
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error getting stats:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar estatísticas" });
    }
  });

  // --- PUBLIC CHECKOUT (no auth required) ---
  app.get("/api/public/checkout/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const checkout = await storage.getCheckoutBySlug(slug);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });
      const product = checkout.productId ? await storage.getProduct(parseInt(checkout.productId)) : null;
      // Fetch order bump products if config has them
      const config = checkout.config || {};
      const orderBumpIds: number[] = (config.orderBumpProducts || []).map((id: any) => parseInt(id)).filter(Boolean);
      const upsellIds: number[] = (config.upsellProducts || []).map((id: any) => parseInt(id)).filter(Boolean);
      const allExtraIds = Array.from(new Set([...orderBumpIds, ...upsellIds]));
      const extraProducts: any[] = [];
      for (const pid of allExtraIds) {
        const p = await storage.getProduct(pid);
        if (p) extraProducts.push(p);
      }
      await storage.incrementCheckoutViews(checkout.id);
      res.json({ checkout, product, extraProducts });
    } catch (err: any) {
      console.error("Error getting public checkout:", err);
      res.status(500).json({ message: err.message || "Erro ao buscar checkout" });
    }
  });

  // --- PUBLIC TRACKING CONFIG ---
  app.get("/api/public/tracking-config/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const checkout = await storage.getCheckoutBySlug(slug);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });

      let settings = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings) settings = await storage.getAnySettings();

      res.json({
        pixelId: settings?.facebookPixelId ?? null,
        metaEnabled: settings?.metaEnabled ?? false,
        trackTopFunnel: settings?.trackTopFunnel ?? true,
        trackCheckout: settings?.trackCheckout ?? true,
        trackPurchaseRefund: settings?.trackPurchaseRefund ?? true,
      });
    } catch (err: any) {
      console.error("Error getting tracking config:", err);
      res.status(500).json({ message: err.message || "Erro" });
    }
  });

  // --- PAYPAL ---
  app.get("/api/paypal/public-config", async (req, res) => {
    try {
      const slug = req.query.slug as string;
      if (!slug) return res.status(400).json({ message: "Missing slug" });
      const checkout = await storage.getCheckoutBySlug(slug);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });

      let settings = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId) settings = await storage.getAnySettings();

      res.json({
        clientId: settings?.paypalClientId ?? null,
        environment: settings?.environment || "production",
      });
    } catch (err: any) {
      console.error("Error getting PayPal config:", err);
      res.status(500).json({ message: err.message || "Erro ao buscar configuração PayPal" });
    }
  });

  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { createOrderBodySchema, createOrder } = await import("./paypal");
      const { sendUtmifyOrder } = await import("./tracking");
      const body = createOrderBodySchema.parse(req.body);
      const checkout = await storage.getCheckoutPublic(body.checkoutId);
      const product = await storage.getProduct(body.productId);
      if (!checkout || !product) return res.status(404).json({ message: "Checkout/Produto não encontrado" });

      if (product.status !== 'approved') {
        return res.status(403).json({ message: "Produto não aprovado" });
      }

      let settings = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId) settings = await storage.getAnySettings();

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        return res.status(500).json({ message: "PayPal não configurado" });
      }

      // PayPal only supports a subset of currencies — fall back to USD if unsupported
      const PAYPAL_SUPPORTED_CURRENCIES = new Set([
        "AUD","BRL","CAD","CNY","CZK","DKK","EUR","HKD","HUF","ILS","JPY",
        "MYR","MXN","TWD","NZD","NOK","PHP","PLN","GBP","RUB","SGD","SEK",
        "CHF","THB","USD",
      ]);
      const paypalCurrency = PAYPAL_SUPPORTED_CURRENCIES.has(body.currency.toUpperCase())
        ? body.currency
        : "USD";
      const paypalAmountMinor = paypalCurrency === body.currency ? body.totalMinor : body.totalUsdCents;

      const order = await createOrder(
        { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
        { currency: paypalCurrency, amountMinor: paypalAmountMinor, description: product.name }
      );

      const sale = await storage.createSale({
        checkoutId: body.checkoutId,
        productId: body.productId,
        userId: checkout.ownerId,
        amount: body.totalUsdCents,
        status: "pending",
        customerEmail: body.customerData?.email || null,
        paypalOrderId: order.id,
        paypalCurrency: paypalCurrency,
        paypalAmountMinor: paypalAmountMinor,
        utmSource: body.utmSource || null,
        utmMedium: body.utmMedium || null,
        utmCampaign: body.utmCampaign || null,
        utmContent: body.utmContent || null,
        utmTerm: body.utmTerm || null,
      });

      const isTest = (settings.environment || "production") === "sandbox";
      const trackingCommon = {
        utmSource: body.utmSource || null,
        utmMedium: body.utmMedium || null,
        utmCampaign: body.utmCampaign || null,
        utmContent: body.utmContent || null,
        utmTerm: body.utmTerm || null,
      };

      // Fire-and-forget tracking (non-blocking)
      const { sendUtmifyOrder: _sendUtmify, sendWebhookNotification, sendMetaCapiEvent } = await import("./tracking");

      // Utmify — waiting_payment
      if (settings?.utmfyToken) {
        _sendUtmify({
          token: settings.utmfyToken,
          orderId: String(sale?.id ?? order.id),
          status: "waiting_payment",
          paymentMethod: "paypal",
          createdAt: new Date(),
          approvedAt: null,
          refundedAt: null,
          currency: body.currency,
          totalAmountMinor: body.totalMinor,
          customer: {
            name: body.customerData?.name || null,
            email: body.customerData?.email || null,
            phone: body.customerData?.phone || null,
            document: body.customerData?.document || null,
          },
          products: [{ id: product.id, name: product.name, priceInCents: body.totalUsdCents }],
          tracking: trackingCommon,
          isTest,
        }).catch((e) => console.error("[UTMIFY] waiting_payment error:", e));
      }

      // Webhook — sale.pending
      if (settings?.webhookUrl) {
        sendWebhookNotification(settings.webhookUrl, "sale.pending", {
          id: sale?.id ?? 0,
          status: "pending",
          amount: body.totalUsdCents,
          currency: paypalCurrency,
          paypalOrderId: order.id,
          customerEmail: body.customerData?.email || null,
          customerName: body.customerData?.name || null,
          productId: product.id,
          productName: product.name,
          checkoutId: body.checkoutId,
          ...trackingCommon,
          createdAt: new Date().toISOString(),
        }).catch((e) => console.error("[WEBHOOK] pending error:", e));
      }

      res.json({ id: order.id, saleId: sale?.id ?? null });
    } catch (err: any) {
      console.error("Error creating PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao criar pedido" });
    }
  });

  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { captureOrder } = await import("./paypal");
      const { sendUtmifyOrder, sendWebhookNotification, sendMetaCapiEvent } = await import("./tracking");
      const sale = await storage.getSaleByPaypalOrderId(req.params.orderId);
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });

      const checkout = await storage.getCheckoutPublic(sale.checkoutId);
      let settings = checkout?.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId) settings = await storage.getAnySettings();

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) return res.status(500).json({ message: "PayPal não configurado" });

      const captured = await captureOrder(
        { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
        req.params.orderId
      );

      await storage.updateSaleStatus(sale.id, "paid");

      const now = new Date();
      const isTest = (settings.environment || "production") === "sandbox";
      const product = sale.productId ? await storage.getProduct(Number(sale.productId)) : null;
      const saleCurrency = sale.paypalCurrency || "USD";
      const saleAmountMinor = sale.paypalAmountMinor || sale.amount || 0;
      const trackingData = {
        utmSource: sale.utmSource || null,
        utmMedium: sale.utmMedium || null,
        utmCampaign: sale.utmCampaign || null,
        utmContent: sale.utmContent || null,
        utmTerm: sale.utmTerm || null,
      };

      // Utmify — paid
      if (settings?.utmfyToken) {
        sendUtmifyOrder({
          token: settings.utmfyToken,
          orderId: String(sale.id),
          status: "paid",
          paymentMethod: "paypal",
          createdAt: sale.createdAt ? new Date(sale.createdAt) : now,
          approvedAt: now,
          refundedAt: null,
          currency: saleCurrency,
          totalAmountMinor: saleAmountMinor,
          customer: { name: null, email: sale.customerEmail || null },
          products: product
            ? [{ id: product.id, name: product.name, priceInCents: sale.amount || 0 }]
            : [{ id: sale.productId || 0, name: "Produto", priceInCents: sale.amount || 0 }],
          tracking: trackingData,
          isTest,
        }).catch((e) => console.error("[UTMIFY] paid error:", e));
      }

      // Webhook — sale.paid
      if (settings?.webhookUrl) {
        sendWebhookNotification(settings.webhookUrl, "sale.paid", {
          id: sale.id,
          status: "paid",
          amount: sale.amount || 0,
          currency: saleCurrency,
          paypalOrderId: sale.paypalOrderId || null,
          customerEmail: sale.customerEmail || null,
          productId: sale.productId || null,
          productName: product?.name || null,
          checkoutId: sale.checkoutId || null,
          ...trackingData,
          createdAt: sale.createdAt ? new Date(sale.createdAt).toISOString() : null,
          paidAt: now.toISOString(),
        }).catch((e) => console.error("[WEBHOOK] paid error:", e));
      }

      // Meta CAPI — Purchase
      if (settings?.facebookPixelId && settings?.facebookAccessToken && (settings?.metaEnabled ?? true) && (settings?.trackPurchaseRefund ?? true)) {
        const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
        const clientUserAgent = req.headers["user-agent"] || null;
        const fbc = req.headers["x-meta-fbc"] as string | null || null;
        const fbp = req.headers["x-meta-fbp"] as string | null || null;
        const eventId = req.headers["x-meta-event-id"] as string | null || null;

        sendMetaCapiEvent(
          settings,
          "Purchase",
          {
            id: sale.id,
            amount: sale.amount || 0,
            customerEmail: sale.customerEmail || null,
            ...trackingData,
          },
          { currency: saleCurrency, clientIp, clientUserAgent, fbc, fbp, eventId: eventId || undefined },
        ).catch((e) => console.error("[META CAPI] Purchase error:", e));
      }

      res.json({ status: captured.status || "COMPLETED" });
    } catch (err: any) {
      console.error("Error capturing PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao capturar pedido" });
    }
  });

  // --- USUÁRIOS (Admin) ---
  app.get("/api/users-v2", requireAuth, async (req, res) => {
    if ((req as any).user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado." });
    try {
      const list = await adminAuth.listUsers(1000);
      res.json(list.users.map(u => ({ id: u.uid, email: u.email, username: u.displayName || u.email, createdAt: u.metadata.creationTime })));
    } catch (err: any) {
      console.error("Error listing users:", err);
      res.status(500).json({ message: err.message || "Erro ao listar usuários" });
    }
  });

  app.delete("/api/users-v2/:uid", requireAuth, async (req, res) => {
    if ((req as any).user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado." });
    try {
      const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
      await adminAuth.deleteUser(uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: err.message || "Erro ao excluir usuário" });
    }
  });

  app.post("/api/users-v2", requireAuth, async (req, res) => {
    if ((req as any).user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado." });
    try {
      const { email, password } = req.body;
      const user = await adminAuth.createUser({ email, password, emailVerified: true });
      res.status(201).json({ id: user.uid, email: user.email, success: true });
    } catch (err: any) {
      console.error("Error creating user:", err);
      res.status(500).json({ message: err.message || "Erro ao criar usuário" });
    }
  });

  // --- SAQUES (Withdrawals) ---
  app.post("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const { amount, pixKey, pixKeyType } = req.body;

      if (!amount || !pixKey) {
        return res.status(400).json({ message: "Amount and pixKey are required" });
      }

      const withdrawal = await storage.createWithdrawal({
        userId,
        amount: Math.round(parseFloat(amount) * 100),
        pixKey,
        pixKeyType: pixKeyType || 'email'
      });

      res.status(201).json(withdrawal);
    } catch (err: any) {
      console.error("Error creating withdrawal:", err);
      res.status(500).json({ message: err.message || "Erro ao solicitar saque" });
    }
  });

  app.get("/api/admin/withdrawals", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const result = await storage.getWithdrawals();
      res.json(result);
    } catch (error: any) {
      console.error("Error getting all withdrawals:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar saques" });
    }
  });

  app.post("/api/admin/withdrawals/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const id = parseInt(req.params.id as string);
      const { adminNote } = req.body;
      const withdrawal = await storage.updateWithdrawalStatus(id, 'approved', adminNote);
      res.json(withdrawal);
    } catch (err: any) {
      console.error("Error approving withdrawal:", err);
      res.status(500).json({ message: err.message || "Erro ao aprovar saque" });
    }
  });

  app.post("/api/admin/withdrawals/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const id = parseInt(req.params.id as string);
      const { adminNote } = req.body;
      const withdrawal = await storage.updateWithdrawalStatus(id, 'rejected', adminNote);
      res.json(withdrawal);
    } catch (err: any) {
      console.error("Error rejecting withdrawal:", err);
      res.status(500).json({ message: err.message || "Erro ao rejeitar saque" });
    }
  });

  // --- PRODUTOS (Admin) ---
  app.get("/api/admin/products", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const result = await storage.getProducts();
      res.json(result);
    } catch (error: any) {
      console.error("Error getting all products:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar produtos" });
    }
  });

  app.post("/api/products/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const id = parseInt(req.params.id as string);
      const product = await storage.approveProduct(id);
      res.json(product);
    } catch (err: any) {
      console.error("Error approving product:", err);
      res.status(500).json({ message: err.message || "Erro ao aprovar produto" });
    }
  });

  app.post("/api/products/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const id = parseInt(req.params.id as string);
      const product = await storage.rejectProduct(id);
      res.json(product);
    } catch (err: any) {
      console.error("Error rejecting product:", err);
      res.status(500).json({ message: err.message || "Erro ao rejeitar produto" });
    }
  });

  // --- CONTAS BANCÁRIAS ---
  app.get("/api/bank-accounts", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getBankAccounts(userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bank-accounts", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const { type, phone } = req.body;
      if (!type || !phone) return res.status(400).json({ message: "Tipo e número são obrigatórios" });
      const result = await storage.createBankAccount(userId, type, phone);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/bank-accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      await storage.deleteBankAccount(parseInt(req.params.id), userId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // --- CHECKOUTS (Admin) ---
  app.get("/api/admin/checkouts", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const result = await storage.getCheckouts();
      res.json(result);
    } catch (error: any) {
      console.error("Error getting all checkouts:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar checkouts" });
    }
  });

  // --- TESTE DE BANCO (Health Check) ---
  app.get("/api/db-test", async (_req, res) => {
    try {
      const result = await storage.getWithdrawals();
      res.json({
        ok: true,
        message: "Database connection successful",
        withdrawalCount: result.length
      });
    } catch (err: any) {
      console.error("Database test failed:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return httpServer;
}