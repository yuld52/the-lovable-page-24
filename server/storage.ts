import { db } from "./db";
import {
  users, products, checkouts, sales, settings,
  type User, type InsertUser,
  type Product, type InsertProduct, type UpdateProductRequest,
  type Checkout, type InsertCheckout, type UpdateCheckoutRequest,
  type Sale, type InsertSale, type UpdateSettingsRequest,
  type DashboardStats, type Settings
} from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  deleteUserByUsername(username: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getCheckouts(userId: string): Promise<Checkout[]>;
  getCheckout(id: number, userId: string): Promise<Checkout | undefined>;
  getCheckoutPublic(id: number): Promise<Checkout | undefined>;
  createCheckout(checkout: InsertCheckout): Promise<Checkout>;
  updateCheckout(id: number, userId: string, updates: UpdateCheckoutRequest): Promise<Checkout>;
  deleteCheckout(id: number, userId: string): Promise<void>;
  getSettings(userId: string): Promise<Settings | undefined>;
  getAnySettings(): Promise<Settings | undefined>;
  updateSettings(userId: string, updates: UpdateSettingsRequest): Promise<Settings>;
  getCheckoutBySlug(slug: string): Promise<Checkout | undefined>;
  incrementCheckoutViews(id: number): Promise<void>;
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
    
    // Chart data logic (simplified for now)
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

export const storage = new DatabaseStorage();