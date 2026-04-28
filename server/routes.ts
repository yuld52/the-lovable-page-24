import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./middleware/auth";
import { adminAuth, adminDb, adminStorage } from "./firebase-admin";

import { registerTrackingRoutes } from "./trackingRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerTrackingRoutes(app, storage as any);

  // Setup upload directory
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage_multer = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/upload", (req, res) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) return res.status(400).json({ message: err?.code === "LIMIT_FILE_SIZE" ? "O arquivo excede o limite de 10MB." : "Falha no upload" });
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "Nenhum arquivo enviado" });
      res.json({ url: `/uploads/${file.filename}` });
    });
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
    res.json(await storage.getProducts());
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      res.status(201).json(await storage.createProduct(input));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch(api.products.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.products.update.input.parse(req.body);
      res.json(await storage.updateProduct(id, input));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.products.delete.path, requireAuth, async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id as string));
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id as string));
    if (!product) return res.status(404).json({ message: "Produto não encontrado" });
    res.json(product);
  });

  // Checkouts
  app.get(api.checkouts.list.path, requireAuth, async (req, res) => {
    const userId = String((req as any).user?.id || "");
    res.json(await storage.getCheckouts(userId));
  });

  app.post(api.checkouts.create.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.checkouts.create.input.parse(req.body);
      const baseUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
      res.status(201).json(await storage.createCheckout({ ...input, ownerId: userId, publicUrl: `${baseUrl}/checkout/${input.slug}` }));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get(api.checkouts.get.path, requireAuth, async (req, res) => {
    const userId = String((req as any).user?.id || "");
    const checkout = await storage.getCheckout(parseInt(req.params.id as string), userId);
    if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });
    res.json(checkout);
  });

  app.patch(api.checkouts.update.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.checkouts.update.input.parse(req.body);
      res.json(await storage.updateCheckout(parseInt(req.params.id as string), userId, input));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.checkouts.delete.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      await storage.deleteCheckout(parseInt(req.params.id as string), userId);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Settings
  app.get(api.settings.get.path, requireAuth, async (req, res) => {
    const userId = String((req as any).user?.id || "");
    const settings = await storage.getSettings(userId);
    res.json(settings || { environment: "production" });
  });

  app.post(api.settings.update.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const input = api.settings.update.input.parse(req.body);
      res.json(await storage.updateSettings(userId, input));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Stats
  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    const userId = String((req as any).user?.id || "");
    res.json(await storage.getDashboardStats(userId, req.query.period as string, req.query.productId as string));
  });

  // PayPal
  app.get("/api/paypal/public-config", async (req, res) => {
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
  });

  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { createOrderBodySchema, createOrder } = await import("./paypal");
      const body = createOrderBodySchema.parse(req.body);
      const checkout = await storage.getCheckoutPublic(body.checkoutId);
      const product = await storage.getProduct(body.productId);
      if (!checkout || !product) return res.status(404).json({ message: "Checkout/Produto não encontrado" });

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
        amount: body.totalUsdCents,
        status: "pending",
        customerEmail: body.customerData?.email || null,
        paypalOrderId: order.id,
        paypalCurrency: body.currency,
        paypalAmountMinor: body.totalMinor,
      });

      res.json({ id: order.id });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erro ao criar pedido" });
    }
  });

  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { captureOrder } = await import("./paypal");
      const sale = await storage.getSaleByPaypalOrderId(req.params.orderId);
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });

      const checkout = await storage.getCheckoutPublic(sale.checkoutId!);
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
      res.status(500).json({ message: err.message || "Erro ao capturar pedido" });
    }
  });

  // User Management
  app.get("/api/users-v2", requireAuth, async (req, res) => {
    if ((req as any).user?.email !== "juniornegocios015@gmail.com") return res.status(403).json({ message: "Acesso negado." });
    const list = await adminAuth.listUsers(1000);
    res.json(list.users.map(u => ({ id: u.uid, email: u.email, username: u.displayName || u.email, createdAt: u.metadata.creationTime })));
  });

  app.delete("/api/users-v2/:uid", requireAuth, async (req, res) => {
    if ((req as any).user?.email !== "juniornegocios015@gmail.com") return res.status(403).json({ message: "Acesso negado." });
    const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
    await adminAuth.deleteUser(uid);
    res.json({ success: true });
  });

  app.post("/api/users-v2", requireAuth, async (req, res) => {
    if ((req as any).user?.email !== "juniornegocios015@gmail.com") return res.status(403).json({ message: "Acesso negado." });
    const { email, password } = req.body;
    const user = await adminAuth.createUser({ email, password, emailVerified: true });
    res.status(201).json({ id: user.uid, email: user.email, success: true });
  });

  return httpServer;
}