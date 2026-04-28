import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth } from "./auth";
import { registerTrackingRoutes } from "./trackingRoutes";
import * as paypal from "./paypal";
import { processPurchaseTracking } from "./tracking";
import { sendNotification } from "./services/notification";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup local session auth
  setupAuth(app);
  
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

  // Products
  app.get(api.products.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      res.json(await storage.getProducts());
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.products.create.input.parse(req.body);
      const result = await storage.createProduct(input);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: "Erro ao salvar produto" });
    }
  });

  app.patch(api.products.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id as string);
      const input = api.products.update.input.parse(req.body);
      res.json(await storage.updateProduct(id, input));
    } catch (err: any) {
      res.status(400).json({ message: "Erro ao atualizar produto" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteProduct(parseInt(req.params.id as string));
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao excluir produto" });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id as string));
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar produto" });
    }
  });

  // Checkouts
  app.get(api.checkouts.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      res.json(await storage.getCheckouts(userId));
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar checkouts" });
    }
  });

  app.post(api.checkouts.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      const input = api.checkouts.create.input.parse(req.body);
      const baseUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
      const result = await storage.createCheckout({ 
        ...input, 
        ownerId: userId as any, 
        publicUrl: `${baseUrl}/checkout/${input.slug}` 
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ message: "Erro ao criar checkout" });
    }
  });

  app.get(api.checkouts.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      const checkout = await storage.getCheckout(parseInt(req.params.id as string), userId);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });
      res.json(checkout);
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar checkout" });
    }
  });

  app.patch(api.checkouts.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      const input = api.checkouts.update.input.parse(req.body);
      res.json(await storage.updateCheckout(parseInt(req.params.id as string), userId, input));
    } catch (err: any) {
      res.status(400).json({ message: "Erro ao atualizar checkout" });
    }
  });

  app.delete(api.checkouts.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      await storage.deleteCheckout(parseInt(req.params.id as string), userId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao excluir checkout" });
    }
  });

  // Public Checkout
  app.get("/api/checkouts/public/:slug", async (req, res) => {
    try {
      const checkout = await storage.getCheckoutBySlug(req.params.slug);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });
      res.json(checkout);
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar checkout" });
    }
  });

  // Settings
  app.get(api.settings.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      const settings = await storage.getSettings(userId);
      res.json(settings || { environment: "production" });
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  app.post(api.settings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      const input = api.settings.update.input.parse(req.body);
      const result = await storage.updateSettings(userId, input);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: "Erro ao salvar configurações" });
    }
  });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = String(req.user!.id);
      res.json(await storage.getDashboardStats(userId, req.query.period as string, req.query.productId as string));
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
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
      res.status(500).json({ message: "Erro ao carregar PayPal" });
    }
  });

  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const body = paypal.createOrderBodySchema.parse(req.body);
      const checkout = await storage.getCheckoutPublic(body.checkoutId);
      if (!checkout) return res.status(404).json({ message: "Checkout não encontrado" });

      let settings = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        settings = await storage.getAnySettings();
      }

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        return res.status(400).json({ message: "PayPal não configurado pelo vendedor" });
      }

      const order = await paypal.createOrder(
        {
          clientId: settings.paypalClientId,
          clientSecret: settings.paypalClientSecret,
          environment: (settings.environment as any) || "production",
        },
        {
          currency: body.currency,
          amountMinor: body.totalMinor,
          description: `Pedido #${body.checkoutId}`,
        }
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
      console.error("PayPal Create Order Error:", err);
      res.status(500).json({ message: err.message || "Erro ao criar pedido" });
    }
  });

  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const sale = await storage.getSaleByPaypalOrderId(orderId);
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });

      const checkout = await storage.getCheckoutPublic(sale.checkoutId!);
      let settings = checkout?.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        settings = await storage.getAnySettings();
      }

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        return res.status(400).json({ message: "PayPal não configurado" });
      }

      const capture = await paypal.captureOrder(
        {
          clientId: settings.paypalClientId,
          clientSecret: settings.paypalClientSecret,
          environment: (settings.environment as any) || "production",
        },
        orderId
      );

      if (capture.status === "COMPLETED") {
        await storage.updateSaleStatus(sale.id, "paid");
        
        // Tracking & Notifications
        const product = await storage.getProduct(sale.productId!);
        await processPurchaseTracking(settings as any, sale as any);
        if (checkout?.ownerId) {
          await sendNotification({
            userId: String(checkout.ownerId),
            type: "PURCHASE_APPROVED",
            metadata: {
              amount: (sale.amount / 100).toFixed(2),
              currency: "USD",
              productName: product?.name
            }
          });
        }
      }

      res.json(capture);
    } catch (err: any) {
      console.error("PayPal Capture Error:", err);
      res.status(500).json({ message: err.message || "Erro ao capturar pagamento" });
    }
  });

  // User Management (Admin only)
  app.get("/api/users-v2", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.username !== "juniornegocios015@gmail.com") return res.status(403).json({ message: "Acesso negado." });
    const list = await storage.getUsers();
    res.json(list.map(u => ({ id: u.id, username: u.username, email: u.username })));
  });

  app.delete("/api/users-v2/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.username !== "juniornegocios015@gmail.com") return res.status(403).json({ message: "Acesso negado." });
    await storage.deleteUser(parseInt(req.params.id));
    res.json({ success: true });
  });

  return httpServer;
}