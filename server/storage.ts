import { db, pool, ensurePool } from "./db";
import {
  users, products, checkouts, sales,
  type User, type InsertUser,
  type Product, type InsertProduct, type UpdateProductRequest,
  type Checkout, type InsertCheckout, type UpdateCheckoutRequest,
  type Sale, type InsertSale, type UpdateSettingsRequest,
  type DashboardStats, type Settings
} from "@shared/schema";
import { eq, sql, and, gte, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  deleteUserByUsername(username: string): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Checkouts
  getCheckouts(userId: string): Promise<Checkout[]>;
  getCheckout(id: number, userId: string): Promise<Checkout | undefined>;
  /** Public/internal: fetch by id without owner scope (used by checkout public payments) */
  getCheckoutPublic(id: number): Promise<Checkout | undefined>;
  createCheckout(checkout: InsertCheckout): Promise<Checkout>;
  updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest): Promise<Checkout>;
  deleteCheckout(id: number, userId: string): Promise<void>;

  // Settings
  getSettings(userId: string): Promise<Settings | undefined>;
  /** Legacy fallback: fetch first row (for webhook compatibility) */
  getAnySettings(): Promise<Settings | undefined>;
  updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<Settings>;

  // Adicionando assinaturas para os métodos extras usados dinamicamente
  getCheckoutBySlug(slug: string): Promise<Checkout | undefined>;
  incrementCheckoutViews(id: number): Promise<void>;

  // Stats
  getDashboardStats(period?: string, productId?: string): Promise<DashboardStats>;
  getSaleByPaypalOrderId(orderId: string): Promise<Sale | undefined>;
  updateSaleStatus(id: number, status: string): Promise<void>;
  createSale(sale: InsertSale): Promise<Sale>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async deleteUserByUsername(username: string): Promise<void> {
    await db.delete(users).where(eq(users.username, username));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.createdAt);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const [updated] = await db.update(products).set(updates as any).where(eq(products.id, id)).returning();
    if (!updated) throw new Error("Produto não encontrado");
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Checkouts
  async getCheckouts(userId: string): Promise<Checkout[]> {
    return await db
      .select()
      .from(checkouts)
      .where(eq(checkouts.ownerId, userId as any))
      .orderBy(checkouts.createdAt);
  }

  async getCheckout(id: number, userId: string): Promise<Checkout | undefined> {
    const [checkout] = await db
      .select()
      .from(checkouts)
      .where(and(eq(checkouts.id, id), eq(checkouts.ownerId, userId as any)));
    return checkout;
  }

  async getCheckoutPublic(id: number): Promise<Checkout | undefined> {
    const [checkout] = await db.select().from(checkouts).where(eq(checkouts.id, id));
    return checkout;
  }

  async getCheckoutBySlug(slug: string): Promise<Checkout | undefined> {
    const [checkout] = await db.select().from(checkouts).where(eq(checkouts.slug, slug));
    return checkout;
  }

  async incrementCheckoutViews(id: number): Promise<void> {
    await db.update(checkouts)
      .set({ views: sql`${checkouts.views} + 1` })
      .where(eq(checkouts.id, id));
  }

  async createCheckout(checkout: InsertCheckout): Promise<Checkout> {
    const [newCheckout] = await db.insert(checkouts).values(checkout as any).returning();
    return newCheckout;
  }

  async updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest): Promise<Checkout> {
    const [updated] = await db
      .update(checkouts)
      .set(updates as any)
      .where(and(eq(checkouts.id, id), eq(checkouts.ownerId, userId as any)))
      .returning();
    if (!updated) throw new Error("Checkout não encontrado");
    return updated;
  }

  // Sales
  async createSale(sale: InsertSale): Promise<Sale> {
    ensurePool();

    // Defensive schema sync: allow older DBs without UTM columns
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF to_regclass('public.sales') IS NOT NULL THEN
            ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_source" text;
            ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_medium" text;
            ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_campaign" text;
            ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_content" text;
            ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_term" text;
          END IF;
        END $$;
      `);
    } catch {
      // ignore
    }

    const { rows } = await pool.query(
      `INSERT INTO sales (
         checkout_id,
         product_id,
         amount,
         status,
         customer_email,
         paypal_order_id,
         paypal_capture_id,
         paypal_currency,
         paypal_amount_minor,
         utm_source,
         utm_medium,
         utm_campaign,
         utm_content,
         utm_term
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id,
                 checkout_id,
                 product_id,
                 amount,
                 status,
                 customer_email,
                 paypal_order_id,
                 paypal_capture_id,
                 paypal_currency,
                 paypal_amount_minor,
                 utm_source,
                 utm_medium,
                 utm_campaign,
                 utm_content,
                 utm_term,
                 created_at`,
      [
        (sale as any).checkoutId ?? (sale as any).checkout_id ?? null,
        (sale as any).productId ?? (sale as any).product_id ?? null,
        (sale as any).amount,
        (sale as any).status,
        (sale as any).customerEmail ?? (sale as any).customer_email ?? null,
        (sale as any).paypalOrderId ?? (sale as any).paypal_order_id ?? null,
        (sale as any).paypalCaptureId ?? (sale as any).paypal_capture_id ?? null,
        (sale as any).paypalCurrency ?? (sale as any).paypal_currency ?? null,
        (sale as any).paypalAmountMinor ?? (sale as any).paypal_amount_minor ?? null,
        (sale as any).utm_source ?? (sale as any).utmSource ?? null,
        (sale as any).utm_medium ?? (sale as any).utmMedium ?? null,
        (sale as any).utm_campaign ?? (sale as any).utmCampaign ?? null,
        (sale as any).utm_content ?? (sale as any).utmContent ?? null,
        (sale as any).utm_term ?? (sale as any).utmTerm ?? null,
      ],
    );

    const row = rows[0];
    return {
      id: Number(row.id),
      checkoutId: row.checkout_id,
      productId: row.product_id,
      amount: row.amount,
      status: row.status,
      customerEmail: row.customer_email,
      paypalOrderId: row.paypal_order_id,
      paypalCaptureId: row.paypal_capture_id,
      paypalCurrency: row.paypal_currency,
      paypalAmountMinor: row.paypal_amount_minor,
      createdAt: row.created_at,
      // keep UTM columns accessible for webhook/tracking via row props
      ...(row.utm_source ? { utm_source: row.utm_source } : {}),
      ...(row.utm_medium ? { utm_medium: row.utm_medium } : {}),
      ...(row.utm_campaign ? { utm_campaign: row.utm_campaign } : {}),
      ...(row.utm_content ? { utm_content: row.utm_content } : {}),
      ...(row.utm_term ? { utm_term: row.utm_term } : {}),
    } as any;
  }

  async getSaleByPaypalOrderId(orderId: string): Promise<Sale | undefined> {
    ensurePool();

    // Ensure UTM columns exist (older DBs)
    try {
      await pool.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_source" text;`);
      await pool.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_medium" text;`);
      await pool.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_campaign" text;`);
      await pool.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_content" text;`);
      await pool.query(`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_term" text;`);
    } catch {
      // ignore
    }

    const { rows } = await pool.query(
      `SELECT id,
              checkout_id,
              product_id,
              amount,
              status,
              customer_email,
              paypal_order_id,
              paypal_capture_id,
              paypal_currency,
              paypal_amount_minor,
              utm_source,
              utm_medium,
              utm_campaign,
              utm_content,
              utm_term,
              created_at
         FROM sales
        WHERE paypal_order_id = $1
        ORDER BY id ASC
        LIMIT 1`,
      [orderId],
    );

    const row = rows[0];
    if (!row) return undefined;

    return {
      id: Number(row.id),
      checkoutId: row.checkout_id,
      productId: row.product_id,
      amount: row.amount,
      status: row.status,
      customerEmail: row.customer_email,
      paypalOrderId: row.paypal_order_id,
      paypalCaptureId: row.paypal_capture_id,
      paypalCurrency: row.paypal_currency,
      paypalAmountMinor: row.paypal_amount_minor,
      createdAt: row.created_at,
      // expose UTM columns for tracking
      ...(row.utm_source ? { utm_source: row.utm_source } : {}),
      ...(row.utm_medium ? { utm_medium: row.utm_medium } : {}),
      ...(row.utm_campaign ? { utm_campaign: row.utm_campaign } : {}),
      ...(row.utm_content ? { utm_content: row.utm_content } : {}),
      ...(row.utm_term ? { utm_term: row.utm_term } : {}),
    } as any;
  }

  async updateSaleStatus(id: number, status: string): Promise<void> {
    await db.update(sales).set({ status }).where(eq(sales.id, id));
  }

  // Settings
  async getSettings(userId: string): Promise<Settings | undefined> {
    ensurePool();

    // Defensive schema sync: em alguns ambientes as migrations não rodam.
    // Isso evita 500 por "column user_id does not exist" / "relation settings does not exist".
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "settings" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" uuid,
          "paypal_client_id" text,
          "paypal_client_secret" text,
          "paypal_webhook_id" text,
          "facebook_pixel_id" text,
          "facebook_access_token" text,
          "utmfy_token" text,
          "environment" text DEFAULT 'sandbox',

          "meta_enabled" boolean DEFAULT true,
          "utmfy_enabled" boolean DEFAULT true,
          "track_top_funnel" boolean DEFAULT true,
          "track_checkout" boolean DEFAULT true,
          "track_purchase_refund" boolean DEFAULT true
        );
      `);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "user_id" uuid;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "facebook_access_token" text;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "meta_enabled" boolean DEFAULT true;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "utmfy_enabled" boolean DEFAULT true;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "track_top_funnel" boolean DEFAULT true;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "track_checkout" boolean DEFAULT true;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "track_purchase_refund" boolean DEFAULT true;`);

      // Tracking events log
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "tracking_events" (
          "id" serial PRIMARY KEY NOT NULL,
          "owner_id" uuid,
          "sale_id" integer,
          "checkout_id" integer,
          "session_id" text,
          "destination" text,
          "event_name" text,
          "dedupe_key" text,
          "payload" jsonb,
          "response_status" integer,
          "response_body" text,
          "created_at" timestamp DEFAULT now()
        );
      `);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS tracking_events_dedupe_key_uq ON tracking_events (dedupe_key);`);

    } catch {
      // ignore: if DB is down, the SELECT below will throw a useful error
    }

    const { rows } = await pool.query(
      `SELECT id,
              user_id,
              paypal_client_id,
              paypal_client_secret,
              paypal_webhook_id,
              facebook_pixel_id,
              facebook_access_token,
              utmfy_token,
              environment,
              meta_enabled,
              utmfy_enabled,
              track_top_funnel,
              track_checkout,
              track_purchase_refund
         FROM settings
        WHERE user_id = $1
        ORDER BY id ASC
        LIMIT 1`,
      [userId],
    );

    const row = rows[0];
    if (!row) return undefined;

    return {
      id: Number(row.id),
      userId: row.user_id,
      paypalClientId: row.paypal_client_id,
      paypalClientSecret: row.paypal_client_secret,
      paypalWebhookId: row.paypal_webhook_id,
      facebookPixelId: row.facebook_pixel_id,
      facebookAccessToken: row.facebook_access_token,
      utmfyToken: row.utmfy_token,
      environment: row.environment,

      metaEnabled: row.meta_enabled,
      utmfyEnabled: row.utmfy_enabled,
      trackTopFunnel: row.track_top_funnel,
      trackCheckout: row.track_checkout,
      trackPurchaseRefund: row.track_purchase_refund,
    } as any;
  }

  async getAnySettings(): Promise<Settings | undefined> {
    ensurePool();

    try {
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "user_id" uuid;`);
      await pool.query(`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "facebook_access_token" text;`);
    } catch {
      // ignore
    }

    const { rows } = await pool.query(
      `SELECT id,
              user_id,
              paypal_client_id,
              paypal_client_secret,
              paypal_webhook_id,
              facebook_pixel_id,
              facebook_access_token,
              utmfy_token,
              environment
         FROM settings
        ORDER BY paypal_client_id IS NOT NULL DESC, id ASC
        LIMIT 1`,
    );

    const row = rows[0];
    if (!row) return undefined;

    return {
      id: Number(row.id),
      userId: row.user_id,
      paypalClientId: row.paypal_client_id,
      paypalClientSecret: row.paypal_client_secret,
      paypalWebhookId: row.paypal_webhook_id,
      facebookPixelId: row.facebook_pixel_id,
      facebookAccessToken: row.facebook_access_token,
      utmfyToken: row.utmfy_token,
      environment: row.environment,
    } as any;
  }

  async updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<Settings> {
    ensurePool();
    // Upsert 1-row settings table (scoped per user)
    const existing = await this.getSettings(userId);

    const clean = (v: unknown) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      return t.length ? t : undefined;
    };

    // IMPORTANT: manter comportamento antigo — campos vazios ("") não devem apagar valores já salvos
    const u = updates as any;
    const payload = {
      paypalClientId: (clean(u.paypalClientId ?? u.paypal_client_id) as any) ?? existing?.paypalClientId ?? null,
      paypalClientSecret: (clean(u.paypalClientSecret ?? u.paypal_client_secret) as any) ?? existing?.paypalClientSecret ?? null,
      paypalWebhookId: (clean(u.paypalWebhookId ?? u.paypal_webhook_id) as any) ?? existing?.paypalWebhookId ?? null,
      facebookPixelId: (clean(u.facebookPixelId ?? u.facebook_pixel_id) as any) ?? (existing as any)?.facebookPixelId ?? null,
      facebookAccessToken:
        (clean(u.facebookAccessToken ?? u.facebook_access_token) as any) ?? (existing as any)?.facebookAccessToken ?? null,
      utmfyToken: (clean(u.utmfyToken ?? u.utmfy_token) as any) ?? existing?.utmfyToken ?? null,
      environment: (clean(u.environment) as any) ?? existing?.environment ?? "production",

      metaEnabled:
        (updates as any).metaEnabled != null ? Boolean((updates as any).metaEnabled) : ((existing as any)?.metaEnabled ?? true),
      utmfyEnabled:
        (updates as any).utmfyEnabled != null ? Boolean((updates as any).utmfyEnabled) : ((existing as any)?.utmfyEnabled ?? true),
      trackTopFunnel:
        (updates as any).trackTopFunnel != null ? Boolean((updates as any).trackTopFunnel) : ((existing as any)?.trackTopFunnel ?? true),
      trackCheckout:
        (updates as any).trackCheckout != null ? Boolean((updates as any).trackCheckout) : ((existing as any)?.trackCheckout ?? true),
      trackPurchaseRefund:
        (updates as any).trackPurchaseRefund != null
          ? Boolean((updates as any).trackPurchaseRefund)
          : ((existing as any)?.trackPurchaseRefund ?? true),
    };

    if (!existing) {
      const { rows } = await pool.query(
        `INSERT INTO settings (
           user_id,
           paypal_client_id,
           paypal_client_secret,
           paypal_webhook_id,
           facebook_pixel_id,
           facebook_access_token,
           utmfy_token,
           environment,
           meta_enabled,
           utmfy_enabled,
           track_top_funnel,
           track_checkout,
           track_purchase_refund
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id,
                   user_id,
                   paypal_client_id,
                   paypal_client_secret,
                   paypal_webhook_id,
                   facebook_pixel_id,
                   facebook_access_token,
                   utmfy_token,
                   environment,
                   meta_enabled,
                   utmfy_enabled,
                   track_top_funnel,
                   track_checkout,
                   track_purchase_refund`,
        [
          userId,
          payload.paypalClientId,
          payload.paypalClientSecret,
          payload.paypalWebhookId,
          payload.facebookPixelId,
          payload.facebookAccessToken,
          payload.utmfyToken,
          payload.environment,
          payload.metaEnabled,
          payload.utmfyEnabled,
          payload.trackTopFunnel,
          payload.trackCheckout,
          payload.trackPurchaseRefund,
        ],
      );

      const row = rows[0];
      return {
        id: Number(row.id),
        userId: row.user_id,
        paypalClientId: row.paypal_client_id,
        paypalClientSecret: row.paypal_client_secret,
        paypalWebhookId: row.paypal_webhook_id,
        facebookPixelId: row.facebook_pixel_id,
        facebookAccessToken: row.facebook_access_token,
        utmfyToken: row.utmfy_token,
        environment: row.environment,

        metaEnabled: row.meta_enabled,
        utmfyEnabled: row.utmfy_enabled,
        trackTopFunnel: row.track_top_funnel,
        trackCheckout: row.track_checkout,
        trackPurchaseRefund: row.track_purchase_refund,
      } as any;
    }

    const { rows } = await pool.query(
      `UPDATE settings
          SET paypal_client_id = $1,
              paypal_client_secret = $2,
              paypal_webhook_id = $3,
              facebook_pixel_id = $4,
              facebook_access_token = $5,
              utmfy_token = $6,
              environment = $7,
              meta_enabled = $8,
              utmfy_enabled = $9,
              track_top_funnel = $10,
              track_checkout = $11,
              track_purchase_refund = $12
        WHERE id = $13 AND user_id = $14
      RETURNING id,
                user_id,
                paypal_client_id,
                paypal_client_secret,
                paypal_webhook_id,
                facebook_pixel_id,
                facebook_access_token,
                utmfy_token,
                environment,
                meta_enabled,
                utmfy_enabled,
                track_top_funnel,
                track_checkout,
                track_purchase_refund`,
      [
        payload.paypalClientId,
        payload.paypalClientSecret,
        payload.paypalWebhookId,
        payload.facebookPixelId,
        payload.facebookAccessToken,
        payload.utmfyToken,
        payload.environment,
        payload.metaEnabled,
        payload.utmfyEnabled,
        payload.trackTopFunnel,
        payload.trackCheckout,
        payload.trackPurchaseRefund,
        existing.id,
        userId,
      ],
    );

    const row = rows[0];
    return {
      id: Number(row.id),
      userId: row.user_id,
      paypalClientId: row.paypal_client_id,
      paypalClientSecret: row.paypal_client_secret,
      paypalWebhookId: row.paypal_webhook_id,
      facebookPixelId: row.facebook_pixel_id,
      facebookAccessToken: row.facebook_access_token,
      utmfyToken: row.utmfy_token,
      environment: row.environment,

      metaEnabled: row.meta_enabled,
      utmfyEnabled: row.utmfy_enabled,
      trackTopFunnel: row.track_top_funnel,
      trackCheckout: row.track_checkout,
      trackPurchaseRefund: row.track_purchase_refund,
    } as any;
  }

  // Stats
  async getDashboardStats(period?: string, productId?: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date = new Date();

    if (period === "0") { // Hoje
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "1") { // Ontem
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 1);
      endDate = new Date(today);
      endDate.setDate(today.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "7") {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
    } else if (period === "90") {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 90);
    } else { // Default 30 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
    }

    const whereConditions = [
      eq(sales.status, 'paid'),
      gte(sales.createdAt, startDate)
    ];

    if (endDate) {
      whereConditions.push(lt(sales.createdAt, new Date(endDate.getTime() + 1)));
    }

    if (productId && productId !== "all") {
      whereConditions.push(eq(sales.productId, parseInt(productId)));
    }

    // Sales for the period
    const [periodSalesResult] = await db.select({
      count: sql<number>`count(*)`,
      total: sql<number>`sum(${sales.amount})`
    })
      .from(sales)
      .where(and(...whereConditions));

    // Get chart data
    let chartData: { name: string; sales: number }[] = [];

    if (period === "0" || period === "1") {
      // Hourly breakdown
      const hourlyResults = await db.select({
        hour: sql<number>`EXTRACT(HOUR FROM ${sales.createdAt})`,
        total: sql<number>`sum(${sales.amount})`
      })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`EXTRACT(HOUR FROM ${sales.createdAt})`);

      for (let i = 0; i < 24; i++) {
        const found = hourlyResults.find(h => Number(h.hour) === i);
        chartData.push({
          name: `${i.toString().padStart(2, '0')}:00`,
          sales: Number(found?.total || 0) / 100 // Convert cents to real
        });
      }

    } else {
      // Daily breakdown
      const dailyResults = await db.select({
        day: sql<string>`TO_CHAR(${sales.createdAt}, 'DD/MM')`,
        total: sql<number>`sum(${sales.amount})`
      })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`TO_CHAR(${sales.createdAt}, 'DD/MM')`);

      const days = period === "7" ? 7 : (period === "90" ? 90 : 30);
      for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(new Date().getDate() - i);
        const dayStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        const found = dailyResults.find(r => r.day === dayStr);
        chartData.push({
          name: dayStr,
          sales: Number(found?.total || 0) / 100
        });
      }
    }

    return {
      salesToday: Number(periodSalesResult?.total || 0) / 100,
      revenuePaid: Number(periodSalesResult?.total || 0) / 100,
      salesApproved: Number(periodSalesResult?.count || 0),
      revenueTarget: 10000, // 10k in real
      revenueCurrent: Number(periodSalesResult?.total || 0) / 100,
      chartData
    };
  }
}

export class MemoryStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private checkouts: Map<number, Checkout>;
  private sales: Map<number, Sale>;
  private settings: Map<number, Settings>;
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.checkouts = new Map();
    this.sales = new Map();
    this.settings = new Map();
    this.currentId = { users: 1, products: 1, checkouts: 1, sales: 1, settings: 1 };
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async deleteUserByUsername(username: string): Promise<void> {
    const user = Array.from(this.users.values()).find(u => u.username === username);
    if (user) {
      this.users.delete(user.id);
    }
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentId.products++;
    const product: Product = { ...insertProduct, id, createdAt: new Date() };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new Error("Product not found");
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
  }

  // Checkouts
  async getCheckouts(userId: string): Promise<Checkout[]> {
    // In memory storage checkouts don't have owner constraint unless filtered manually
    // Assuming userId is passed as string but checkouts have ownerId as string (uuid) or null
    return Array.from(this.checkouts.values()).filter(c => c.ownerId === userId);
  }

  async getCheckout(id: number, userId: string): Promise<Checkout | undefined> {
    const checkout = this.checkouts.get(id);
    if (checkout && checkout.ownerId === userId) return checkout;
    return undefined;
  }

  async getCheckoutPublic(id: number): Promise<Checkout | undefined> {
    return this.checkouts.get(id);
  }

  async getCheckoutBySlug(slug: string): Promise<Checkout | undefined> {
    return Array.from(this.checkouts.values()).find(c => c.slug === slug);
  }

  async incrementCheckoutViews(id: number): Promise<void> {
    const checkout = this.checkouts.get(id);
    if (checkout) {
      checkout.views = (checkout.views || 0) + 1;
      this.checkouts.set(id, checkout);
    }
  }

  async createCheckout(insertCheckout: InsertCheckout): Promise<Checkout> {
    const id = this.currentId.checkouts++;
    const checkout: Checkout = { ...insertCheckout, id, active: true, createdAt: new Date(), views: 0 };
    this.checkouts.set(id, checkout);
    return checkout;
  }

  async updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest): Promise<Checkout> {
    const checkout = this.checkouts.get(id);
    if (!checkout || checkout.ownerId !== userId) throw new Error("Checkout not found");
    const updated = { ...checkout, ...updates };
    this.checkouts.set(id, updated);
    return updated;
  }

  // Sales
  async createSale(insertSale: InsertSale): Promise<Sale> {
    const id = this.currentId.sales++;
    const sale: Sale = {
      ...insertSale,
      id,
      createdAt: new Date(),
      paypalCaptureId: insertSale.paypalCaptureId ?? null,
      paypalCurrency: insertSale.paypalCurrency ?? null,
      paypalAmountMinor: insertSale.paypalAmountMinor ?? null,
      utmSource: (insertSale as any).utmSource ?? null,
      utmMedium: (insertSale as any).utmMedium ?? null,
      utmCampaign: (insertSale as any).utmCampaign ?? null,
      utmContent: (insertSale as any).utmContent ?? null,
      utmTerm: (insertSale as any).utmTerm ?? null
    };
    this.sales.set(id, sale);
    return sale;
  }

  async getSaleByPaypalOrderId(orderId: string): Promise<Sale | undefined> {
    return Array.from(this.sales.values()).find(s => s.paypalOrderId === orderId);
  }

  async updateSaleStatus(id: number, status: string): Promise<void> {
    const sale = this.sales.get(id);
    if (sale) {
      sale.status = status;
      this.sales.set(id, sale);
    }
  }

  // Settings
  async getSettings(userId: string): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(s => s.userId === userId);
  }

  async getAnySettings(): Promise<Settings | undefined> {
    return Array.from(this.settings.values())[0];
  }

  async updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<Settings> {
    let setting = Array.from(this.settings.values()).find(s => s.userId === userId);

    if (!setting) {
      const id = this.currentId.settings++;
      setting = {
        id,
        userId,
        paypalClientId: updates.paypalClientId ?? null,
        paypalClientSecret: updates.paypalClientSecret ?? null,
        paypalWebhookId: updates.paypalWebhookId ?? null,
        facebookPixelId: (updates as any).facebookPixelId ?? null,
        facebookAccessToken: (updates as any).facebookAccessToken ?? null,
        utmfyToken: (updates as any).utmfyToken ?? null,
        environment: updates.environment ?? "sandbox",
        salesNotifications: true,
        metaEnabled: (updates as any).metaEnabled ?? true,
        utmfyEnabled: (updates as any).utmfyEnabled ?? true,
        trackTopFunnel: (updates as any).trackTopFunnel ?? true,
        trackCheckout: (updates as any).trackCheckout ?? true,
        trackPurchaseRefund: (updates as any).trackPurchaseRefund ?? true
      };
      this.settings.set(id, setting);
      return setting;
    }

    const updated = { ...setting, ...updates };
    // Handle the complex boolean logic from DB implementation if needed, 
    // but for memory simple merge is usually fine if updates are partials.
    // However the DB implementation had specific "don't overwrite with empty string" logic.
    // We'll keep it simple for now.

    this.settings.set(setting.id, updated as Settings);
    return updated as Settings;
  }

  // Stats
  async getDashboardStats(period?: string, productId?: string): Promise<DashboardStats> {
    // Mock stats implementation
    const salesList = Array.from(this.sales.values());
    const total = salesList.reduce((acc, curr) => acc + curr.amount, 0);
    return {
      salesToday: total,
      revenuePaid: total,
      salesApproved: salesList.length,
      revenueTarget: 10000,
      revenueCurrent: total,
      chartData: []
    };
  }
}

// Fallback to memory storage if DATABASE_URL is not set or invalid
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemoryStorage();
