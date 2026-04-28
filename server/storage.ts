import { db, pool, ensurePool } from "./db";
import {
  users, products, checkouts, sales, settings,
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
  getCheckoutPublic(id: number): Promise<Checkout | undefined>;
  createCheckout(checkout: InsertCheckout): Promise<Checkout>;
  updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest): Promise<Checkout>;
  deleteCheckout(id: number, userId: string): Promise<void>;

  // Settings
  getSettings(userId: string): Promise<Settings | undefined>;
  getAnySettings(): Promise<Settings | undefined>;
  updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<Settings>;

  // Extra methods
  getCheckoutBySlug(slug: string): Promise<Checkout | undefined>;
  incrementCheckoutViews(id: number): Promise<void>;

  // Stats
  getDashboardStats(userId: string, period?: string, productId?: string): Promise<DashboardStats>;
  getSaleByPaypalOrderId(orderId: string): Promise<Sale | undefined>;
  updateSaleStatus(id: number, status: string): Promise<void>;
  createSale(sale: InsertSale): Promise<Sale>;
}

export class DatabaseStorage implements IStorage {
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

  async getCheckouts(userId: string): Promise<Checkout[]> {
    return await db.select().from(checkouts).where(eq(checkouts.ownerId, userId as any)).orderBy(checkouts.createdAt);
  }

  async getCheckout(id: number, userId: string): Promise<Checkout | undefined> {
    const [checkout] = await db.select().from(checkouts).where(and(eq(checkouts.id, id), eq(checkouts.ownerId, userId as any)));
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
    await db.update(checkouts).set({ views: sql`${checkouts.views} + 1` }).where(eq(checkouts.id, id));
  }

  async createCheckout(checkout: InsertCheckout): Promise<Checkout> {
    const [newCheckout] = await db.insert(checkouts).values(checkout as any).returning();
    return newCheckout;
  }

  async updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest): Promise<Checkout> {
    const [updated] = await db.update(checkouts).set(updates as any).where(and(eq(checkouts.id, id), eq(checkouts.ownerId, userId as any))).returning();
    if (!updated) throw new Error("Checkout não encontrado");
    return updated;
  }

  async deleteCheckout(id: number, userId: string): Promise<void> {
    await db.delete(checkouts).where(and(eq(checkouts.id, id), eq(checkouts.ownerId, userId as any)));
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale as any).returning();
    return newSale;
  }

  async getSaleByPaypalOrderId(orderId: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.paypalOrderId, orderId));
    return sale;
  }

  async updateSaleStatus(id: number, status: string): Promise<void> {
    await db.update(sales).set({ status }).where(eq(sales.id, id));
  }

  async getSettings(userId: string): Promise<Settings | undefined> {
    const [row] = await db.select().from(settings).where(eq(settings.userId, userId as any));
    return row;
  }

  async getAnySettings(): Promise<Settings | undefined> {
    const [row] = await db.select().from(settings).limit(1);
    return row;
  }

  async updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<Settings> {
    const existing = await this.getSettings(userId);
    if (!existing) {
      const [newSettings] = await db.insert(settings).values({ ...updates, userId: userId as any } as any).returning();
      return newSettings;
    }
    const [updated] = await db.update(settings).set(updates as any).where(eq(settings.userId, userId as any)).returning();
    return updated;
  }

  async getDashboardStats(userId: string, period?: string, productId?: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    if (period === "1") startDate.setDate(today.getDate() - 1);
    else if (period === "7") startDate.setDate(today.getDate() - 7);
    else if (period === "90") startDate.setDate(today.getDate() - 90);
    else startDate.setDate(today.getDate() - 30);

    const whereConditions = [eq(sales.status, 'paid'), gte(sales.createdAt, startDate)];
    if (productId && productId !== "all") whereConditions.push(eq(sales.productId, parseInt(productId)));

    const [periodSalesResult] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`sum(${sales.amount})` }).from(sales).where(and(...whereConditions));
    const chartData: { name: string; sales: number }[] = [];
    return {
      salesToday: Number(periodSalesResult?.total || 0) / 100,
      revenuePaid: Number(periodSalesResult?.total || 0) / 100,
      salesApproved: Number(periodSalesResult?.count || 0),
      revenueTarget: 10000,
      revenueCurrent: Number(periodSalesResult?.total || 0) / 100,
      chartData
    };
  }
}

export class MemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private products: Map<number, Product> = new Map();
  private checkouts: Map<number, Checkout> = new Map();
  private sales: Map<number, Sale> = new Map();
  private settings: Map<number, Settings> = new Map();
  private currentId = { users: 1, products: 1, checkouts: 1, sales: 1, settings: 1 };

  async getUser(id: number) { return this.users.get(id); }
  async getUserByUsername(username: string) { return Array.from(this.users.values()).find(u => u.username === username); }
  async getUsers() { return Array.from(this.users.values()); }
  async createUser(user: InsertUser) { const id = this.currentId.users++; const newUser = { ...user, id }; this.users.set(id, newUser); return newUser; }
  async deleteUser(id: number) { this.users.delete(id); }
  async deleteUserByUsername(username: string) { const user = await this.getUserByUsername(username); if (user) this.users.delete(user.id); }

  async getProducts() { return Array.from(this.products.values()); }
  async getProduct(id: number) { return this.products.get(id); }
  async createProduct(product: InsertProduct) {
    const id = this.currentId.products++;
    const newProduct: Product = {
      ...product,
      id,
      createdAt: new Date(),
      description: product.description ?? null,
      imageUrl: product.imageUrl ?? null,
      deliveryUrl: product.deliveryUrl ?? null,
      whatsappUrl: product.whatsappUrl ?? null,
      deliveryFiles: product.deliveryFiles ?? [],
      noEmailDelivery: product.noEmailDelivery ?? false,
      active: product.active ?? true
    };
    this.products.set(id, newProduct);
    return newProduct;
  }
  async updateProduct(id: number, updates: UpdateProductRequest) {
    const p = this.products.get(id);
    if (!p) throw new Error("Not found");
    const updated = { ...p, ...updates };
    this.products.set(id, updated as Product);
    return updated as Product;
  }
  async deleteProduct(id: number) { this.products.delete(id); }

  async getCheckouts(userId: string) { return Array.from(this.checkouts.values()).filter(c => c.ownerId === userId); }
  async getCheckout(id: number, userId: string) { const c = this.checkouts.get(id); return c?.ownerId === userId ? c : undefined; }
  async getCheckoutPublic(id: number) { return this.checkouts.get(id); }
  async getCheckoutBySlug(slug: string) { return Array.from(this.checkouts.values()).find(c => c.slug === slug); }
  async incrementCheckoutViews(id: number) { const c = this.checkouts.get(id); if (c) c.views = (c.views || 0) + 1; }
  async createCheckout(checkout: InsertCheckout) {
    const id = this.currentId.checkouts++;
    const newCheckout: Checkout = {
      ...checkout,
      id,
      ownerId: (checkout as any).ownerId ?? null,
      createdAt: new Date(),
      views: 0,
      active: true,
      publicUrl: (checkout as any).publicUrl ?? null,
      config: checkout.config ?? null
    };
    this.checkouts.set(id, newCheckout);
    return newCheckout;
  }
  async updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest) {
    const c = await this.getCheckout(id, userId);
    if (!c) throw new Error("Not found");
    const updated = { ...c, ...updates };
    this.checkouts.set(id, updated as Checkout);
    return updated as Checkout;
  }
  async deleteCheckout(id: number, userId: string) { const c = await this.getCheckout(id, userId); if (c) this.checkouts.delete(id); }

  async getSettings(userId: string) { return Array.from(this.settings.values()).find(s => s.userId === userId); }
  async getAnySettings() { return Array.from(this.settings.values())[0]; }
  async updateSettings(userId: string, updates: UpdateSettingsRequest) {
    const s = await this.getSettings(userId);
    if (!s) {
      const id = this.currentId.settings++;
      const ns: Settings = {
        id, userId,
        paypalClientId: updates.paypalClientId ?? null,
        paypalClientSecret: updates.paypalClientSecret ?? null,
        paypalWebhookId: updates.paypalWebhookId ?? null,
        facebookPixelId: updates.facebookPixelId ?? null,
        facebookAccessToken: updates.facebookAccessToken ?? null,
        utmfyToken: updates.utmfyToken ?? null,
        salesNotifications: updates.salesNotifications ?? false,
        environment: updates.environment ?? "sandbox",
        metaEnabled: updates.metaEnabled ?? true,
        utmfyEnabled: updates.utmfyEnabled ?? true,
        trackTopFunnel: updates.trackTopFunnel ?? true,
        trackCheckout: updates.trackCheckout ?? true,
        trackPurchaseRefund: updates.trackPurchaseRefund ?? true
      };
      this.settings.set(id, ns);
      return ns;
    }
    const updated = { ...s, ...updates };
    this.settings.set(s.id, updated as Settings);
    return updated as Settings;
  }

  async createSale(sale: InsertSale) {
    const id = this.currentId.sales++;
    const ns: Sale = {
      id,
      amount: sale.amount,
      status: sale.status,
      checkoutId: sale.checkoutId ?? null,
      productId: sale.productId ?? null,
      customerEmail: sale.customerEmail ?? null,
      paypalOrderId: sale.paypalOrderId ?? null,
      paypalCaptureId: (sale as any).paypalCaptureId ?? null,
      paypalCurrency: (sale as any).paypalCurrency ?? null,
      paypalAmountMinor: (sale as any).paypalAmountMinor ?? null,
      utmSource: (sale as any).utmSource ?? null,
      utmMedium: (sale as any).utmMedium ?? null,
      utmCampaign: (sale as any).utmCampaign ?? null,
      utmContent: (sale as any).utmContent ?? null,
      utmTerm: (sale as any).utmTerm ?? null,
      createdAt: new Date()
    };
    this.sales.set(id, ns);
    return ns;
  }
  async getSaleByPaypalOrderId(orderId: string) { return Array.from(this.sales.values()).find(s => s.paypalOrderId === orderId); }
  async updateSaleStatus(id: number, status: string) { const s = this.sales.get(id); if (s) s.status = status; }
  async getDashboardStats(userId: string) { return { salesToday: 0, revenuePaid: 0, salesApproved: 0, revenueTarget: 10000, revenueCurrent: 0, chartData: [] }; }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemoryStorage();