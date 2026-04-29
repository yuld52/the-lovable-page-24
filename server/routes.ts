import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { neonStorage as storage } from "./neon-storage";
import { api } from "@shared/routes";
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

  // Use memory storage for multer to upload directly to Firebase
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
  });

  // ADD THIS: File Upload Route
  app.post("/api/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = `public/${fileName}`;

      // Upload to Firebase Storage using admin SDK
      const bucket = adminStorage.bucket();
      const fileUpload = bucket.file(filePath);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
          }
        }
      });

      // Make the file public
      await fileUpload.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      console.log(`[Upload] File uploaded: ${publicUrl}`);

      res.json({
        url: publicUrl,
        path: filePath,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ message: err.message || "Falha no upload" });
    }
  });

  // PWA Push Notification Routes
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

  app.get("/api/user", requireAuth, async (req, res) => res.json((req as any).user));

  // Products
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getProducts(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting products:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar produtos" });
    }
  });

  // Admin: Get ALL products (no user filter)
  app.get("/api/admin/products", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const result = await storage.getProducts(); // No user filter for admin
      res.json(result);
    } catch (error: any) {
      console.error("Error getting all products:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar produtos" });
    }
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.products.create.input.parse(req.body);
      console.log("[CREATE PRODUCT] Input:", input, "UserId:", userId);
      const result = await storage.createProduct({ ...input, ownerId: userId });
      console.log("[CREATE PRODUCT] Success:", result);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[CREATE PRODUCT] Error:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id as string));
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });
      res.json(product);
    } catch (err: any) {
      console.error("Error getting product:", err);
      res.status(500).json({ message: err.message || "Erro ao buscar produto" });
    }
  });

  app.patch(api.products.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.products.update.input.parse(req.body);
      const result = await storage.updateProduct(id, input);
      res.json(result);
    } catch (err: any) {
      console.error("Error updating product:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.products.delete.path, requireAuth, async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id as string));
      res.status(204).end();
    } catch (err: any) {
      console.error("Error deleting product:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Product Approval Routes (Admin only)
  app.post("/api/products/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Acesso negado" });
      }
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
      if (user?.email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const id = parseInt(req.params.id as string);
      const product = await storage.rejectProduct(id);
      res.json(product);
    } catch (err: any) {
      console.error("Error rejecting product:", err);
      res.status(500).json({ message: err.message || "Erro ao rejeitar produto" });
    }
  });

  // Checkouts
  app.get(api.checkouts.list.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getCheckouts(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting checkouts:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar checkouts" });
    }
  });

  // Admin: Get ALL checkouts
  app.get("/api/admin/checkouts", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const result = await storage.getCheckouts(); // No user filter for admin
      res.json(result);
    } catch (error: any) {
      console.error("Error getting all checkouts:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar checkouts" });
    }
  });

  app.post(api.checkouts.create.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.checkouts.create.input.parse(req.body);
      console.log("[CREATE CHECKOUT] Input:", input, "UserId:", userId);
      const baseUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
      const result = await storage.createCheckout({ ...input, ownerId: userId, publicUrl: `${baseUrl}/checkout/${input.slug}` });
      console.log("[CREATE CHECKOUT] Success:", result);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[CREATE CHECKOUT] Error:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.get(api.checkouts.get.path, requireAuth, async (req, res) => {
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

  app.patch(api.checkouts.update.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.checkouts.update.input.parse(req.body);
      const result = await storage.updateCheckout(parseInt(req.params.id as string), userId, input);
      res.json(result);
    } catch (err: any) {
      console.error("Error updating checkout:", err);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.checkouts.delete.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      await storage.deleteCheckout(parseInt(req.params.id as string), userId);
      res.status(204).end();
    } catch (err: any) {
      console.error("Error deleting checkout:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Sales
  app.get(api.sales.list.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getSales(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting sales:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar vendas" });
    }
  });

  // Settings
  app.get(api.settings.get.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const settings = await storage.getSettings(userId);
      res.json(settings || { environment: "production" });
    } catch (error: any) {
      console.error("Error getting settings:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar configurações" });
    }
  });

  app.post(api.settings.update.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.settings.update.input.parse(req.body);
      const result = await storage.updateSettings(userId, input);
      res.json(result);
    } catch (err: any) {
      console.error("Error updating settings:", err);
      res.status(400).json({ message: err.message });
    }
  });

  // Stats
  app.get(api.stats.get.path, requireAuth, async (req, res) => {
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

  // PayPal
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
      const body = createOrderBodySchema.parse(req.body);
      const checkout = await storage.getCheckoutPublic(body.checkoutId);
      const product = await storage.getProduct(body.productId);
      if (!checkout || !product) return res.status(404).json({ message: "Checkout/Produto não encontrado" });

      // Check if product is approved
      if (product.status !== 'approved') {
        return res.status(403).json({ message: "Produto não aprovado" });
      }

      let settings = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId) settings = await storage.getAnySettings();

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        return res.status(500).json({ message: "PayPal não configurado" });
      }

      const order = await createOrder(
        { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
        { currency: body.currency, amountMinor: body.totalMinor, description: product.name }
      );

      await storage.createSale({
        checkoutId: body.checkoutId,
        productId: body.productId,
        userId: checkout.ownerId,
        amount: body.totalUsdCents,
        status: "pending",
        customerEmail: body.customerData?.email || null,
        paypalOrderId: order.id,
        paypalCurrency: body.currency,
        paypalAmountMinor: body.totalMinor,
      });

      res.json({ id: order.id });
    } catch (err: any) {
      console.error("Error creating PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao criar pedido" });
    }
  });

  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { captureOrder } = await import("./paypal");
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
      res.json({ status: captured.status || "COMPLETED" });
    } catch (err: any) {
      console.error("Error capturing PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao capturar pedido" });
    }
  });

  // User Management
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

  // Database test endpoint
  app.get("/api/db-test", async (_req, res) => {
    try {
      const client = await import("./neon-storage").then(m => m.getPool().connect());
      try {
        const result = await client.query("SELECT NOW() as current_time, 1 as test_value");
        res.json({ 
          ok: true, 
          message: "Database connection successful", 
          time: result.rows[0].current_time,
          test: result.rows[0].test_value 
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("Database test failed:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return httpServer;
}