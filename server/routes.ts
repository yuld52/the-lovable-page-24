import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { neonStorage as storage, getPool } from "./neon-storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./middleware/auth";
import { adminAuth, adminDb, adminStorage } from "./firebase-admin";
import { getVapidPublicKey, saveSubscription } from "./services/notification";

import { registerTrackingRoutes } from "./trackingRoutes";
import { registerChatRoutes } from "./chat";
import { initiateE2Payment, makeReference, normalizeMzPhone } from "./services/e2payments";
import { sendBuyerConfirmation, sendSellerNewSale, sendWithdrawalUpdate, sendWithdrawalReceived, sendProductApproved, sendProductRejected, sendNewBankAccount, sendWelcomeEmail } from "./email";

function fmtUsd(cents: number) { return `$${(cents / 100).toFixed(2)} USD`; }
function fmtMzn(minor: number) { return `MZN ${(minor / 100).toFixed(2)}`; }
function methodLabel(m: string) { return m === "mpesa" ? "M-Pesa" : m === "emola" ? "e-Mola" : m === "paypal" ? "PayPal" : m; }

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

  // ── Welcome email after new registration ──
  app.post("/api/auth/send-welcome", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "E-mail é obrigatório" });
      sendWelcomeEmail({ to: email })
        .catch((e: any) => console.error("[EMAIL] welcome:", e?.message));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      res.json(user);
      // Persist email so admin can display it without Firebase credentials
      if (user?.id && user?.email) {
        storage.saveUserEmail(String(user.id), String(user.email))
          .catch(() => {});
      }
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

      // Name minimum length validation
      const nameVal = String(req.body.name || "").trim();
      if (nameVal.length < 3) {
        return res.status(400).json({ message: `O nome do produto deve ter no mínimo 3 caracteres (atual: ${nameVal.length}).` });
      }

      // Description minimum length validation
      const desc = String(req.body.description || "").trim();
      if (desc.length < 200) {
        return res.status(400).json({ message: `A descrição do produto deve ter no mínimo 200 caracteres (atual: ${desc.length}).` });
      }

      // Price validation (stored in cents)
      const priceCents = Number(req.body.price);
      const currency = String(req.body.currency || "USD").toUpperCase();
      const minCents = currency === "MZN" ? 5000 : 390;
      const maxCents = currency === "MZN" ? 99999900 : 9999900;
      if (isNaN(priceCents) || priceCents < minCents) {
        const minDisplay = currency === "MZN" ? "50 MT" : `3.90 ${currency}`;
        return res.status(400).json({ message: `O preço mínimo do produto é ${minDisplay}.` });
      }
      if (priceCents > maxCents) {
        const maxDisplay = currency === "MZN" ? "999.999 MT" : `99.999 ${currency}`;
        return res.status(400).json({ message: `O preço máximo do produto é ${maxDisplay}.` });
      }

      const productData = {
        ...req.body,
        ownerId: userId,
        status: 'approved'
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

      // Name minimum length validation if name is being updated
      if (req.body.name !== undefined) {
        const nameVal = String(req.body.name || "").trim();
        if (nameVal.length < 3) {
          return res.status(400).json({ message: `O nome do produto deve ter no mínimo 3 caracteres (atual: ${nameVal.length}).` });
        }
      }

      // Description minimum length validation if description is being updated
      if (req.body.description !== undefined) {
        const desc = String(req.body.description || "").trim();
        if (desc.length < 200) {
          return res.status(400).json({ message: `A descrição do produto deve ter no mínimo 200 caracteres (atual: ${desc.length}).` });
        }
      }

      // Price validation if price is being updated
      if (req.body.price !== undefined) {
        const priceCents = Number(req.body.price);
        const currency = String(req.body.currency || "USD").toUpperCase();
        const minCents = currency === "MZN" ? 5000 : 390;
        const maxCents = currency === "MZN" ? 99999900 : 9999900;
        if (isNaN(priceCents) || priceCents < minCents) {
          const minDisplay = currency === "MZN" ? "50 MT" : `3.90 ${currency}`;
          return res.status(400).json({ message: `O preço mínimo do produto é ${minDisplay}.` });
        }
        if (priceCents > maxCents) {
          const maxDisplay = currency === "MZN" ? "999.999 MT" : `99.999 ${currency}`;
          return res.status(400).json({ message: `O preço máximo do produto é ${maxDisplay}.` });
        }
      }

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
      if (!userId) return res.status(401).json({ message: "Utilizador não identificado" });
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
      if (!userId) return res.status(401).json({ message: "Utilizador não identificado" });
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

  // Poll sale status (used by frontend after mobile payment)
  app.get("/api/sales/:id/status", async (req, res) => {
    // Never cache — status can change at any time (pending → paid)
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: "ID inválido" });
      const conn = await getPool().connect();
      try {
        const r = await conn.query(`SELECT id, status FROM sales WHERE id = $1 LIMIT 1`, [id]);
        if (!r.rows.length) return res.status(404).json({ message: "Venda não encontrada" });
        return res.json({ id: r.rows[0].id, status: r.rows[0].status });
      } finally { conn.release(); }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // e2payments callback — called by e2payments when STK-push confirmed
  app.post("/api/e2payments/callback", async (req, res) => {
    try {
      const body = req.body || {};
      console.log("[E2PAY CALLBACK]", JSON.stringify(body));
      // Try to extract reference from various possible field names
      const ref: string = body.reference || body.ref || body.order_id || body.orderId || "";
      // Reference format: MTF000001
      const saleIdMatch = ref.match(/MTF(\d+)/i);
      if (!saleIdMatch) {
        return res.json({ status: "ignored", reason: "no reference" });
      }
      const saleId = Number(saleIdMatch[1]);
      await storage.updateSaleStatus(saleId, "paid");

      // Post-payment: send email & push
      const conn = await getPool().connect();
      try {
        const r = await conn.query(
          `SELECT s.*, p.name AS product_name, p.delivery_url, p.delivery_files, p.no_email_delivery, c.owner_id
           FROM sales s
           LEFT JOIN products p ON p.id = s.product_id
           LEFT JOIN checkouts c ON c.id = s.checkout_id
           WHERE s.id = $1 LIMIT 1`, [saleId]
        );
        if (r.rows.length) {
          const row = r.rows[0];
          if (row.customer_email) {
            sendBuyerConfirmation({
              to: row.customer_email,
              productName: row.product_name || "",
              amount: `${(row.amount / 100).toFixed(2)}`,
              orderId: String(saleId),
              paymentMethod: methodLabel(row.payment_method || ""),
              deliveryUrl: row.no_email_delivery ? null : (row.delivery_url ?? null),
              deliveryFiles: row.no_email_delivery ? [] : (row.delivery_files as string[] ?? []),
            }).catch((e: any) => console.error("[E2PAY EMAIL]", e?.message));
          }
          if (row.owner_id) {
            import("./services/notification").then(({ sendNotification }) => {
              sendNotification({
                userId: String(row.owner_id),
                type: "sale_captured",
                metadata: { amount: ((row.amount || 0) / 100).toFixed(2), currency: "MZN", productName: row.product_name || "" },
              }).catch(() => {});
            }).catch(() => {});
          }
        }
      } finally { conn.release(); }

      return res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[E2PAY CALLBACK ERROR]", err);
      return res.status(500).json({ message: err.message });
    }
  });

  // Mobile payment (M-Pesa / e-Mola) — real STK push via e2payments if configured
  app.post("/api/sales/mobile", async (req, res) => {
    try {
      const { checkoutId, productId, currency, totalUsdCents, totalMinor, paymentMethod, mobilePhone, customerData } = req.body;
      if (!checkoutId || !productId || !paymentMethod || !mobilePhone) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      const validMethods = ["mpesa", "emola"];
      if (!validMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: "Método de pagamento inválido" });
      }
      const checkout = await storage.getCheckoutPublic(Number(checkoutId));
      const product = await storage.getProduct(Number(productId));
      if (!checkout || !product) return res.status(404).json({ message: "Checkout/Produto não encontrado" });
      if (product.status !== "approved") return res.status(403).json({ message: "Produto não aprovado" });

      // Load seller settings to check for e2payments credentials
      let sellerSettings: any = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!sellerSettings) sellerSettings = await storage.getAnySettings();

      const hasE2 =
        sellerSettings?.e2paymentsClientId &&
        sellerSettings?.e2paymentsClientSecret &&
        (paymentMethod === "mpesa" ? sellerSettings?.e2paymentsMpesaWalletId : sellerSettings?.e2paymentsEmolaWalletId);

      if (hasE2) {
        // ── Real e2payments flow ──
        // 1. Create sale as pending first so we have an ID for the reference
        const sale = await storage.createSale({
          checkoutId: Number(checkoutId),
          productId: Number(productId),
          userId: checkout.ownerId,
          amount: totalUsdCents || 0,
          status: "pending",
          customerEmail: customerData?.email || null,
          paymentMethod,
        });

        const reference = makeReference(sale.id);
        // For MZN products totalUsdCents IS the MZN minor amount (same currency).
        // Divide by 100 to get MZN major units for the e2payments API.
        const amountMajor = Math.round((totalUsdCents || 0) / 100);
        const walletId = paymentMethod === "mpesa"
          ? sellerSettings.e2paymentsMpesaWalletId
          : sellerSettings.e2paymentsEmolaWalletId;

        // Determine public callback URL
        const host = (req as any).headers["x-forwarded-host"] || (req as any).headers.host || "";
        const protocol = host.includes("replit") || host.includes("https") ? "https" : "http";
        const callbackUrl = `${protocol}://${host}/api/e2payments/callback`;

        const phoneLocal = normalizeMzPhone(mobilePhone);

        // Fire e2payments call asynchronously — respond to client immediately
        // so the browser doesn't timeout waiting for the STK push
        setImmediate(async () => {
          try {
            const e2res = await initiateE2Payment(paymentMethod as "mpesa" | "emola", {
              clientId: sellerSettings.e2paymentsClientId,
              clientSecret: sellerSettings.e2paymentsClientSecret,
              walletId,
              phone: phoneLocal,
              amount: amountMajor,
              reference,
              callbackUrl,
            });
            console.log(`[E2PAY] ${paymentMethod.toUpperCase()} response — saleId=${sale.id}, ref=${reference}, amount=${amountMajor} MZN`, JSON.stringify(e2res));
            // e2payments waits for the user's PIN before returning — a success response
            // means the payment is already confirmed. Mark the sale as paid immediately.
            const isConfirmed = e2res?.success || e2res?.status === "success" || e2res?.status === "COMPLETED"
              || String(e2res?.message || "").toLowerCase().includes("sucesso")
              || String(e2res?.success || "").toLowerCase().includes("sucesso");
            if (isConfirmed) {
              await storage.updateSaleStatus(sale.id, "paid").catch(() => {});
              console.log(`[E2PAY] sale ${sale.id} marked PAID (sync confirmation)`);
            }
          } catch (e2err: any) {
            const status = e2err?.response?.status;
            const errMsg = e2err?.response?.data?.message || e2err?.message || "unknown";
            console.error(`[E2PAY] initiate error — saleId=${sale.id}: HTTP ${status || "timeout"} — ${errMsg}`);
            // Only mark as failed for definitive client errors (4xx, except 408/429 which are retriable).
            // For 5xx / timeouts the STK push may still arrive on the phone — keep pending.
            const isDefinitiveFailure = status && status >= 400 && status < 500 && status !== 408 && status !== 429;
            if (isDefinitiveFailure) {
              await storage.updateSaleStatus(sale.id, "failed").catch(() => {});
            }
          }
        });

        return res.json({ id: sale.id, status: "pending", paymentMethod, message: "Verifique o seu telemóvel e insira o PIN para confirmar o pagamento." });

      } else {
        // ── Fallback: immediate (no real gateway) ──
        const sale = await storage.createSale({
          checkoutId: Number(checkoutId),
          productId: Number(productId),
          userId: checkout.ownerId,
          amount: totalUsdCents || 0,
          status: "paid",
          customerEmail: customerData?.email || null,
          paymentMethod,
        });

        console.log(`[MOBILE PAYMENT] ${paymentMethod.toUpperCase()} sale created (no e2payments) — id=${sale.id}, phone=${mobilePhone}, amount=${totalMinor} ${currency}`);

        if (customerData?.email) {
          sendBuyerConfirmation({
            to: customerData.email,
            productName: product.name,
            amount: `${(totalUsdCents / 100).toFixed(2)}`,
            orderId: String(sale.id),
            paymentMethod: methodLabel(paymentMethod),
            deliveryUrl: product.noEmailDelivery ? null : (product.deliveryUrl ?? null),
            deliveryFiles: product.noEmailDelivery ? [] : (product.deliveryFiles as string[] ?? []),
          }).catch((e: any) => console.error("[EMAIL] buyer confirmation (mobile):", e?.message));
        }

        if (checkout.ownerId) {
          import("./services/notification").then(({ sendNotification }) => {
            sendNotification({
              userId: String(checkout.ownerId),
              type: "sale_captured",
              metadata: { amount: ((totalUsdCents || 0) / 100).toFixed(2), currency: currency || "USD", productName: product?.name || "" },
            }).catch((e: any) => console.error("[PUSH] Mobile payment notify error:", e?.message));
          }).catch(() => {});
        }

        return res.json({ id: sale.id, status: "paid", paymentMethod, message: "Pagamento registado com sucesso." });
      }
    } catch (err: any) {
      console.error("Error creating mobile sale:", err);
      return res.status(500).json({ message: err.message || "Erro ao registar pedido" });
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
        paymentMethod: "paypal",
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

      // Webhook — sale.pending (only if event is enabled)
      const allowedPendingEvents = (settings as any)?.webhookEvents?.split(",") ?? ["sale.pending", "sale.paid", "sale.refunded"];
      if (settings?.webhookUrl && allowedPendingEvents.includes("sale.pending")) {
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

      // ── Email notifications (fire-and-forget) ──
      const emailOrderId = String(req.params.orderId).slice(-8);
      const emailAmount  = fmtUsd(sale.amount || 0);
      const emailProduct = product?.name || "Produto";
      if (sale.customerEmail) {
        sendBuyerConfirmation({
          to: sale.customerEmail,
          productName: emailProduct,
          amount: emailAmount,
          orderId: emailOrderId,
          paymentMethod: "PayPal",
          deliveryUrl: product?.noEmailDelivery ? null : (product?.deliveryUrl ?? null),
          deliveryFiles: product?.noEmailDelivery ? [] : (product?.deliveryFiles as string[] ?? []),
        }).catch((e: any) => console.error("[EMAIL] buyer confirmation:", e?.message));
      }
      if (sale.userId) {
        adminAuth.getUser(String(sale.userId))
          .then((u) => {
            if (u.email) {
              sendSellerNewSale({
                to: u.email,
                productName: emailProduct,
                amount: emailAmount,
                buyerEmail: sale.customerEmail || "—",
                orderId: emailOrderId,
                paymentMethod: "PayPal",
              }).catch((e: any) => console.error("[EMAIL] seller new sale:", e?.message));
            }
          })
          .catch((e: any) => console.error("[EMAIL] seller lookup:", e?.message));
      }
      // ────────────────────────────────────────────

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

      // Webhook — sale.paid (only if event is enabled)
      const allowedPaidEvents = (settings as any)?.webhookEvents?.split(",") ?? ["sale.pending", "sale.paid", "sale.refunded"];
      if (settings?.webhookUrl && allowedPaidEvents.includes("sale.paid")) {
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

      // ── Push notification to seller (fire-and-forget) ──
      if (sale.userId) {
        import("./services/notification").then(({ sendNotification }) => {
          sendNotification({
            userId: String(sale.userId),
            type: "sale_captured",
            metadata: {
              amount: ((sale.paypalAmountMinor || sale.amount || 0) / 100).toFixed(2),
              currency: sale.paypalCurrency || "USD",
              productName: product?.name || "",
            },
          }).catch((e: any) => console.error("[PUSH] PayPal capture notify error:", e?.message));
        }).catch(() => {});
      }
      // ────────────────────────────────────────────────────

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
      // Collect unique user IDs from the DB (Firebase listUsers() requires service account credentials)
      const conn = await getPool().connect();
      let uidSet: Set<string>;
      try {
        const [s, c, sa, b] = await Promise.all([
          conn.query(`SELECT DISTINCT user_id::text AS uid FROM settings  WHERE user_id IS NOT NULL`),
          conn.query(`SELECT DISTINCT owner_id::text AS uid FROM checkouts WHERE owner_id IS NOT NULL`),
          conn.query(`SELECT DISTINCT user_id::text AS uid FROM sales      WHERE user_id IS NOT NULL`),
          conn.query(`SELECT DISTINCT user_id::text AS uid FROM bank_accounts WHERE user_id IS NOT NULL`),
        ]);
        uidSet = new Set<string>([
          ...s.rows.map((r: any) => r.uid),
          ...c.rows.map((r: any) => r.uid),
          ...sa.rows.map((r: any) => r.uid),
          ...b.rows.map((r: any) => r.uid),
        ]);
      } finally {
        conn.release();
      }

      const uids = Array.from(uidSet);

      // Ensure the requesting admin's own email is always persisted first
      const reqUser = (req as any).user;
      if (reqUser?.id && reqUser?.email) {
        await storage.saveUserEmail(String(reqUser.id), String(reqUser.email));
      }

      // Fetch emails saved in settings (populated on each user login via /api/user)
      const emailConn = await getPool().connect();
      let emailMap: Record<string, string> = {};
      try {
        // Ensure the column exists before querying it
        await emailConn.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT`);
        const emailResult = await emailConn.query(
          `SELECT user_id::text AS uid, email FROM settings WHERE user_id = ANY($1::text[]) AND email IS NOT NULL`,
          [uids]
        );
        emailResult.rows.forEach((r: any) => {
          if (r.email) emailMap[r.uid] = r.email;
        });
        // Always inject the requesting user's email in case DB write above lost the race
        if (reqUser?.id && reqUser?.email) emailMap[String(reqUser.id)] = String(reqUser.email);
      } catch (e) {
        console.warn("[users-v2] email lookup failed:", (e as any)?.message);
        if (reqUser?.id && reqUser?.email) emailMap[String(reqUser.id)] = String(reqUser.email);
      } finally {
        emailConn.release();
      }

      // Try Firebase as secondary enrichment (may fail without service account)
      const users = await Promise.all(
        uids.map(async (uid) => {
          const dbEmail = emailMap[uid];
          if (dbEmail) {
            return { id: uid, uid, email: dbEmail, username: dbEmail, createdAt: null };
          }
          try {
            const u = await adminAuth.getUser(uid);
            return {
              id: uid, uid,
              email: u.email || uid,
              username: u.displayName || u.email || uid,
              createdAt: u.metadata.creationTime,
            };
          } catch {
            return { id: uid, uid, email: uid, username: uid, createdAt: null };
          }
        })
      );

      res.json(users);
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
  app.get("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const result = await storage.getWithdrawals(userId);
      res.json(result);
    } catch (err: any) {
      console.error("Error getting withdrawals:", err);
      res.status(500).json({ message: err.message || "Erro ao buscar saques" });
    }
  });

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

      // ── Email: withdrawal received (fire-and-forget) ──
      adminAuth.getUser(userId)
        .then((u) => {
          if (u.email) {
            sendWithdrawalReceived({
              to: u.email,
              amount: fmtMzn(withdrawal.amount),
              method: methodLabel(withdrawal.pixKeyType || pixKeyType || ""),
              pixKey: withdrawal.pixKey || pixKey,
              withdrawalId: withdrawal.id,
            }).catch((e: any) => console.error("[EMAIL] withdrawal received:", e?.message));
          }
        })
        .catch((e: any) => console.error("[EMAIL] user lookup (withdrawal):", e?.message));
      // ─────────────────────────────────────────────────

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
      const { adminNote } = req.body || {};
      const withdrawal = await storage.updateWithdrawalStatus(id, 'approved', adminNote);
      res.json(withdrawal);
      // ── Email: withdrawal approved (fire-and-forget) ──
      if (withdrawal?.userId) {
        adminAuth.getUser(String(withdrawal.userId))
          .then((u) => {
            if (u.email) {
              sendWithdrawalUpdate({
                to: u.email,
                status: "approved",
                amount: fmtMzn(withdrawal.amount),
                method: methodLabel(withdrawal.pixKeyType || ""),
                pixKey: withdrawal.pixKey || "",
                adminNote: adminNote || undefined,
                withdrawalId: withdrawal.id,
              }).catch((e: any) => console.error("[EMAIL] withdrawal approved:", e?.message));
            }
          })
          .catch((e: any) => console.error("[EMAIL] user lookup (approve):", e?.message));
      }
      // ─────────────────────────────────────────────────
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
      const { adminNote } = req.body || {};
      const withdrawal = await storage.updateWithdrawalStatus(id, 'rejected', adminNote);
      res.json(withdrawal);
      // ── Email: withdrawal rejected (fire-and-forget) ──
      if (withdrawal?.userId) {
        adminAuth.getUser(String(withdrawal.userId))
          .then((u) => {
            if (u.email) {
              sendWithdrawalUpdate({
                to: u.email,
                status: "rejected",
                amount: fmtMzn(withdrawal.amount),
                method: methodLabel(withdrawal.pixKeyType || ""),
                pixKey: withdrawal.pixKey || "",
                adminNote: adminNote || undefined,
                withdrawalId: withdrawal.id,
              }).catch((e: any) => console.error("[EMAIL] withdrawal rejected:", e?.message));
            }
          })
          .catch((e: any) => console.error("[EMAIL] user lookup (reject):", e?.message));
      }
      // ─────────────────────────────────────────────────
    } catch (err: any) {
      console.error("Error rejecting withdrawal:", err);
      res.status(500).json({ message: err.message || "Erro ao rejeitar saque" });
    }
  });

  // --- VENDAS (Admin) ---
  app.get("/api/admin/sales", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const result = await storage.getSales();
      res.json(result);
    } catch (error: any) {
      console.error("Error getting all sales:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar vendas" });
    }
  });

  // Admin: send custom email to any address
  app.post("/api/admin/send-email", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const { to, subject, body } = req.body || {};
      if (!to || !subject || !body) return res.status(400).json({ message: "to, subject e body são obrigatórios" });
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const FROM = process.env.EMAIL_FROM || "Meteorfy <onboarding@resend.dev>";
      const html = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#7c3aed;letter-spacing:-0.5px;">Meteor<span style="color:#ffffff">fy</span></span>
        </td></tr>
        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
          <p style="color:#ffffff;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="color:#71717a;font-size:12px;margin:0;">© 2026 Meteorfy Inc.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
      await resend.emails.send({ from: FROM, to, subject, html });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error sending admin email:", err);
      res.status(500).json({ message: err.message || "Erro ao enviar email" });
    }
  });

  // Admin: approve / reject individual mobile sales
  app.post("/api/admin/sales/:id/approve", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const id = parseInt(req.params.id as string);
      await storage.updateSaleStatus(id, "paid");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error approving sale:", err);
      res.status(500).json({ message: err.message || "Erro ao aprovar venda" });
    }
  });

  app.post("/api/admin/sales/:id/reject", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const id = parseInt(req.params.id as string);
      await storage.updateSaleStatus(id, "cancelled");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error rejecting sale:", err);
      res.status(500).json({ message: err.message || "Erro ao rejeitar venda" });
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
      // ── Email: product approved (fire-and-forget) ──
      if (product?.userId) {
        adminAuth.getUser(String(product.userId))
          .then((u) => {
            if (u.email) {
              sendProductApproved({
                to: u.email,
                productName: product.name || "Produto",
                productId: product.id,
              }).catch((e: any) => console.error("[EMAIL] product approved:", e?.message));
            }
          })
          .catch((e: any) => console.error("[EMAIL] user lookup (approve product):", e?.message));
      }
      // ──────────────────────────────────────────────
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
      // ── Email: product rejected (fire-and-forget) ──
      if (product?.userId) {
        adminAuth.getUser(String(product.userId))
          .then((u) => {
            if (u.email) {
              sendProductRejected({
                to: u.email,
                productName: product.name || "Produto",
                productId: product.id,
              }).catch((e: any) => console.error("[EMAIL] product rejected:", e?.message));
            }
          })
          .catch((e: any) => console.error("[EMAIL] user lookup (reject product):", e?.message));
      }
      // ──────────────────────────────────────────────
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
      const { type, phone, name } = req.body;
      const validTypes = ["mpesa", "emola"];
      if (!type || !validTypes.includes(type)) return res.status(400).json({ message: "Tipo inválido" });
      if (!phone) return res.status(400).json({ message: "Número/email é obrigatório" });
      const result = await storage.createBankAccount(userId, type, phone, name);
      res.status(201).json(result);
      // ── Email: new bank account (fire-and-forget) ──
      adminAuth.getUser(userId)
        .then((u) => {
          if (u.email) {
            sendNewBankAccount({
              to: u.email,
              method: type === "mpesa" ? "M-Pesa" : type === "emola" ? "e-Mola" : type,
              phone,
              name: name || "",
            }).catch((e: any) => console.error("[EMAIL] new bank account:", e?.message));
          }
        })
        .catch((e: any) => console.error("[EMAIL] user lookup (bank account):", e?.message));
      // ──────────────────────────────────────────────
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/bank-accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      await storage.deleteBankAccount(parseInt(String(req.params.id)), userId);
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

  // --- REGRAS E TAXAS (Admin) ---
  app.get("/api/admin/platform-config", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      const config = await storage.getPlatformConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting platform config:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar configurações" });
    }
  });

  app.post("/api/admin/platform-config", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });
      await storage.setPlatformConfig(req.body);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving platform config:", error);
      res.status(500).json({ message: error.message || "Erro ao salvar configurações" });
    }
  });

  // Endpoint público para usuários lerem as regras/taxas
  app.get("/api/platform-config", async (_req, res) => {
    try {
      const config = await storage.getPlatformConfig();
      // Expõe apenas campos seguros (sem segredos)
      const safe = {
        platformFeePercent: config.platformFeePercent || "0",
        minWithdrawalAmount: config.minWithdrawalAmount || "0",
        withdrawalProcessingDays: config.withdrawalProcessingDays || "3",
        allowedCountries: config.allowedCountries || "",
        termsOfService: config.termsOfService || "",
        feeNotes: config.feeNotes || "",
      };
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- RANKING DE FATURAMENTO (Admin) ---
  app.get("/api/admin/revenue-ranking", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user?.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Acesso negado" });

      const conn = await getPool().connect();

      try {
        const result = await conn.query(`
          SELECT
            c.owner_id,
            COALESCE(SUM(
              CASE COALESCE(p.currency, 'USD')
                WHEN 'MZN' THEN s.amount
                WHEN 'USD' THEN s.amount * 64
                WHEN 'BRL' THEN s.amount * 11
                WHEN 'EUR' THEN s.amount * 71
                ELSE s.amount * 64
              END
            ), 0)::bigint AS total_revenue,
            COUNT(s.id)::int AS total_sales,
            MAX(s.created_at) AS last_sale_at
          FROM checkouts c
          LEFT JOIN sales s ON s.checkout_id = c.id
            AND s.status IN ('paid', 'captured')
          LEFT JOIN products p ON p.id = s.product_id
          WHERE c.owner_id IS NOT NULL
          GROUP BY c.owner_id
          HAVING COUNT(s.id) > 0
          ORDER BY total_revenue DESC
          LIMIT 100
        `);

        const rows = result.rows;

        // Enrich with emails — DB first, Firebase fallback
        const rankReqUser = (req as any).user;
        let userMap: Record<string, string> = {};
        if (rankReqUser?.id && rankReqUser?.email) {
          await storage.saveUserEmail(String(rankReqUser.id), String(rankReqUser.email));
        }
        const ownerIds = rows.map((r: any) => r.owner_id).filter(Boolean);
        if (ownerIds.length > 0) {
          const emailConn2 = await getPool().connect();
          try {
            await emailConn2.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT`);
            const dbEmails = await emailConn2.query(
              `SELECT user_id::text AS uid, email FROM settings WHERE user_id = ANY($1::text[]) AND email IS NOT NULL`,
              [ownerIds]
            );
            dbEmails.rows.forEach((r: any) => { if (r.email) userMap[r.uid] = r.email; });
            if (rankReqUser?.id && rankReqUser?.email) userMap[String(rankReqUser.id)] = String(rankReqUser.email);
          } catch (e) {
            console.warn("[revenue-ranking] DB email lookup failed:", (e as any)?.message);
            if (rankReqUser?.id && rankReqUser?.email) userMap[String(rankReqUser.id)] = String(rankReqUser.email);
          } finally {
            emailConn2.release();
          }
          // Firebase fallback for any still-missing
          const stillMissing = ownerIds.filter((u: string) => !userMap[u]);
          if (stillMissing.length > 0) {
            try {
              const firebaseUsers = await adminAuth.getUsers(stillMissing.map((uid: string) => ({ uid })));
              firebaseUsers.users.forEach(u => { userMap[u.uid] = u.email || u.displayName || u.uid; });
            } catch {
              // Firebase credentials not available — use UID as fallback
            }
          }
        }

        const ranking = rows.map((row: any, idx: number) => ({
          rank: idx + 1,
          ownerId: row.owner_id,
          email: userMap[row.owner_id] || row.owner_id,
          totalRevenue: Number(row.total_revenue),
          totalSales: Number(row.total_sales),
          lastSaleAt: row.last_sale_at,
        }));

        res.json(ranking);
      } finally {
        conn.release();
      }
    } catch (error: any) {
      console.error("Error getting revenue ranking:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar ranking" });
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