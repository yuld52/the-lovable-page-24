import { adminDb } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Helper function to normalize checkout data from Firestore (handles both old camelCase and new snake_case)
function normalizeCheckoutData(docId: string, data: any): any {
  if (!data) {
    return {
      id: parseInt(docId),
      productId: 0,
      ownerId: null,
      publicUrl: null,
      views: 0,
      active: true,
      name: '',
      slug: '',
      config: null,
      createdAt: new Date()
    };
  }
  return {
    id: parseInt(docId),
    // Support both snake_case (new) and camelCase (old) field names
    productId: data.product_id ?? data.productId ?? 0,
    ownerId: data.owner_id ?? data.ownerId ?? null,
    publicUrl: data.public_url ?? data.publicUrl ?? null,
    views: data.views ?? 0,
    active: data.active ?? true,
    name: data.name ?? '',
    slug: data.slug ?? '',
    config: data.config ?? null,
    createdAt: toDate(data.created_at ?? data.createdAt)
  };
}

// Helper function to normalize product data from Firestore (handles both old camelCase and new snake_case)
function normalizeProductData(docId: string, data: any): any {
  if (!data) {
    return {
      id: parseInt(docId),
      ownerId: null,
      name: '',
      description: null,
      price: 0,
      imageUrl: null,
      deliveryUrl: null,
      whatsappUrl: null,
      deliveryFiles: [],
      noEmailDelivery: false,
      active: true,
      createdAt: new Date()
    };
  }
  return {
    id: parseInt(docId),
    ownerId: data.owner_id ?? data.ownerId ?? null,
    name: data.name ?? '',
    description: data.description ?? data.description ?? null,
    price: data.price ?? 0,
    imageUrl: data.image_url ?? data.imageUrl ?? null,
    deliveryUrl: data.delivery_url ?? data.deliveryUrl ?? null,
    whatsappUrl: data.whatsapp_url ?? data.whatsappUrl ?? null,
    deliveryFiles: data.delivery_files ?? data.deliveryFiles ?? [],
    noEmailDelivery: data.no_email_delivery ?? data.noEmailDelivery ?? false,
    active: data.active ?? true,
    createdAt: toDate(data.created_at ?? data.createdAt)
  };
}

// Types
export interface FirestoreUser {
  id: string;
  username: string;
  password: string;
}

export interface FirestoreProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  deliveryUrl: string | null;
  whatsappUrl: string | null;
  deliveryFiles: string[];
  noEmailDelivery: boolean;
  active: boolean;
  createdAt: Date;
}

export interface FirestoreCheckout {
  id: string;
  ownerId: string | null;
  productId: number;
  name: string;
  slug: string;
  publicUrl: string | null;
  views: number;
  active: boolean;
  createdAt: Date;
  config: any;
}

export interface FirestoreSale {
  id: string;
  checkoutId: number | null;
  productId: number | null;
  user_id: string | null;
  amount: number;
  status: string;
  customerEmail: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paypalCurrency: string | null;
  paypalAmountMinor: number | null;
  createdAt: Date;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface FirestoreSettings {
  id: string;
  userId: string | null;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
  paypalWebhookId: string | null;
  facebookPixelId: string | null;
  facebookAccessToken: string | null;
  utmfyToken: string | null;
  salesNotifications: boolean;
  environment: string;
  metaEnabled: boolean;
  utmfyEnabled: boolean;
  trackTopFunnel: boolean;
  trackCheckout: boolean;
  trackPurchaseRefund: boolean;
}

// Counter for auto-incrementing IDs
let productIdCounter = 1;
let checkoutIdCounter = 1;
let saleIdCounter = 1;

// Generate auto-incrementing ID using Firestore atomic counter
async function getNextId(collectionName: string): Promise<number> {
  try {
    const counterRef = adminDb.collection("_counters").doc(collectionName);
    const counterDoc = await counterRef.get();

    if (counterDoc.exists) {
      const currentCount = (counterDoc.data()?.count || 0) as number;
      await counterRef.update({ count: currentCount + 1 });
      return currentCount + 1;
    } else {
      await adminDb.collection("_counters").doc(collectionName).set({ count: 1 });
      return 1;
    }
  } catch (error) {
    // Fallback to local counter if Firestore fails
    if (collectionName === "products") return productIdCounter++;
    if (collectionName === "checkouts") return checkoutIdCounter++;
    if (collectionName === "sales") return saleIdCounter++;
    return 1;
  }
}

// Helper to convert Firestore timestamp to Date
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (typeof timestamp === 'string') return new Date(timestamp);
  return new Date();
}

export class FirestoreStorage {
  // Products
  async getProducts(userId?: string): Promise<any[]> {
    try {
      const snapshot = await adminDb.collection("products").get();
      const results = snapshot.docs.map(doc => {
        return normalizeProductData(doc.id, doc.data());
      });
      console.log("[FIRESTORE] Products found:", results.length);
      // For now, return all products without filtering
      return results;
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number): Promise<any | undefined> {
    try {
      const docRef = adminDb.collection("products").doc(String(id));
      const docSnap = await docRef.get();
      if (!docSnap.exists) return undefined;
      return normalizeProductData(docSnap.id, docSnap.data());
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  }

  async createProduct(product: any): Promise<any> {
    try {
      console.log("[FIRESTORE] Creating product with data:", JSON.stringify(product));
      const id = await getNextId("products");
      const productData = {
        ...product,
        createdAt: Timestamp.now()
      };
      console.log("[FIRESTORE] Product data to save:", JSON.stringify(productData));
      await adminDb.collection("products").doc(String(id)).set({ ...productData, id: String(id) });
      console.log("[FIRESTORE] Product created successfully with id:", id);
      return { id, ...productData, createdAt: toDate(productData.createdAt) };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(id: number, updates: any): Promise<any> {
    try {
      const docRef = adminDb.collection("products").doc(String(id));
      await docRef.update(updates);
      return this.getProduct(id);
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      await adminDb.collection("products").doc(String(id)).delete();
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  // Checkouts
  async getCheckouts(userId: string): Promise<any[]> {
    try {
      const snapshot = await adminDb.collection("checkouts")
        .where("owner_id", "==", userId)
        .get();
      const results = snapshot.docs.map(doc => {
        return normalizeCheckoutData(doc.id, doc.data());
      });
      // Sort by createdAt descending in memory
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting checkouts:", error);
      return [];
    }
  }

  async getCheckout(id: number, userId: string): Promise<any | undefined> {
    try {
      const docRef = adminDb.collection("checkouts").doc(String(id));
      const docSnap = await docRef.get();
      if (!docSnap.exists) return undefined;
      const data = docSnap.data();
      if (data?.owner_id !== userId && data?.ownerId !== userId) return undefined;
      return normalizeCheckoutData(docSnap.id, data);
    } catch (error) {
      console.error("Error getting checkout:", error);
      return undefined;
    }
  }

  async getCheckoutPublic(id: number): Promise<any | undefined> {
    try {
      const docRef = adminDb.collection("checkouts").doc(String(id));
      const docSnap = await docRef.get();
      if (!docSnap.exists) return undefined;
      return normalizeCheckoutData(docSnap.id, docSnap.data());
    } catch (error) {
      console.error("Error getting public checkout:", error);
      return undefined;
    }
  }

  async getCheckoutBySlug(slug: string): Promise<any | undefined> {
    try {
      const snapshot = await adminDb.collection("checkouts")
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return normalizeCheckoutData(doc.id, doc.data());
    } catch (error) {
      console.error("Error getting checkout by slug:", error);
      return undefined;
    }
  }

  async incrementCheckoutViews(id: number): Promise<void> {
    try {
      const docRef = adminDb.collection("checkouts").doc(String(id));
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const currentViews = (docSnap.data()?.views || 0) as number;
        await docRef.update({ views: currentViews + 1 });
      }
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  }

  async createCheckout(checkout: any): Promise<any> {
    try {
      const id = await getNextId("checkouts");
      const checkoutData = {
        ...checkout,
        // Map camelCase to snake_case for Firestore
        product_id: checkout.productId,
        owner_id: checkout.ownerId,
        public_url: checkout.publicUrl,
        created_at: Timestamp.now()
      };
      // Remove camelCase versions to avoid duplicates
      delete checkoutData.productId;
      delete checkoutData.ownerId;
      delete checkoutData.publicUrl;

      await adminDb.collection("checkouts").doc(String(id)).set({ ...checkoutData, id: String(id) });
      return { id, ...checkoutData, createdAt: toDate(checkoutData.created_at) };
    } catch (error) {
      console.error("Error creating checkout:", error);
      throw error;
    }
  }

  async updateCheckout(id: number, userId: string, updates: any): Promise<any> {
    try {
      const docRef = adminDb.collection("checkouts").doc(String(id));
      const docSnap = await docRef.get();

      if (!docSnap.exists) throw new Error("Checkout not found");
      const data = docSnap.data();
      if (data?.owner_id !== userId && data?.ownerId !== userId) throw new Error("Checkout not found");

      // Map camelCase updates to snake_case for Firestore
      const firestoreUpdates: any = { ...updates };
      if (updates.productId !== undefined) {
        firestoreUpdates.product_id = updates.productId;
        delete firestoreUpdates.productId;
      }
      if (updates.ownerId !== undefined) {
        firestoreUpdates.owner_id = updates.ownerId;
        delete firestoreUpdates.ownerId;
      }
      if (updates.publicUrl !== undefined) {
        firestoreUpdates.public_url = updates.publicUrl;
        delete firestoreUpdates.publicUrl;
      }

      await docRef.update(firestoreUpdates);
      return this.getCheckout(id, userId);
    } catch (error) {
      console.error("Error updating checkout:", error);
      throw error;
    }
  }

  // Settings
  async getSettings(userId: string): Promise<any | undefined> {
    try {
      const snapshot = await adminDb.collection("settings")
        .where("userId", "==", userId)
        .get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error("Error getting settings:", error);
      return undefined;
    }
  }

  async getAnySettings(): Promise<any | undefined> {
    try {
      const snapshot = await adminDb.collection("settings").limit(1).get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error("Error getting any settings:", error);
      return undefined;
    }
  }

  async updateSettings(userId: string, updates: any): Promise<any> {
    try {
      const snapshot = await adminDb.collection("settings")
        .where("userId", "==", userId)
        .get();

      if (snapshot.empty) {
        // Create new settings
        const settingsData = {
          userId,
          ...updates,
          salesNotifications: true,
          environment: "production",
          metaEnabled: true,
          utmfyEnabled: true,
          trackTopFunnel: true,
          trackCheckout: true,
          trackPurchaseRefund: true
        };
        const docRef = adminDb.collection("settings").doc();
        await docRef.set(settingsData);
        return { id: docRef.id, ...settingsData };
      } else {
        // Update existing settings
        const docRef = snapshot.docs[0].ref;
        await docRef.update(updates);
        const updated = await docRef.get();
        return { id: updated.id, ...updated.data() };
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  }

  // Sales
  async getSaleByPaypalOrderId(orderId: string): Promise<any | undefined> {
    try {
      const snapshot = await adminDb.collection("sales")
        .where("paypalOrderId", "==", orderId)
        .limit(1)
        .get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return {
        id: parseInt(doc.id),
        ...doc.data(),
        createdAt: toDate(doc.data().createdAt)
      };
    } catch (error) {
      console.error("Error getting sale by PayPal order ID:", error);
      return undefined;
    }
  }

  async updateSaleStatus(id: number, status: string): Promise<void> {
    try {
      const docRef = adminDb.collection("sales").doc(String(id));
      await docRef.update({ status });
    } catch (error) {
      console.error("Error updating sale status:", error);
    }
  }

  async createSale(sale: any): Promise<any> {
    try {
      const id = await getNextId("sales");
      const saleData = {
        ...sale,
        createdAt: Timestamp.now()
      };
      await adminDb.collection("sales").doc(String(id)).set({ ...saleData, id: String(id) });
      return { id, ...saleData, createdAt: toDate(saleData.createdAt) };
    } catch (error) {
      console.error("Error creating sale:", error);
      throw error;
    }
  }

  // Dashboard stats
  async getDashboardStats(userId: string, period?: string, productId?: string): Promise<any> {
    try {
      console.log(`[STATS] Fetching stats for user: ${userId}, period: ${period}, product: ${productId}`);
      
      const salesRef = adminDb.collection("sales");
      let q = salesRef.where("user_id", "==", userId).where("status", "==", "paid");
      
      const snapshot = await q.get();
      console.log(`[STATS] Found ${snapshot.size} paid sales for user`);

      const sales = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: parseInt(doc.id),
          ...data,
          createdAt: toDate(data.createdAt || data.created_at)
        };
      });

      // Filter by period
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      if (period === "0") { // Hoje
        // startDate is already today 00:00
      } else if (period === "1") { // Ontem
        startDate.setDate(now.getDate() - 1);
        const yesterdayEnd = new Date(startDate);
        yesterdayEnd.setHours(23, 59, 59, 999);
        // Special case for yesterday: we need to filter between startDate and yesterdayEnd
      } else if (period === "7") {
        startDate.setDate(now.getDate() - 7);
      } else if (period === "90") {
        startDate.setDate(now.getDate() - 90);
      } else { // Default 30 days
        startDate.setDate(now.getDate() - 30);
      }

      let filteredSales = sales.filter((s: any) => {
        const d = s.createdAt;
        if (period === "1") {
          const yEnd = new Date(startDate);
          yEnd.setHours(23, 59, 59, 999);
          return d >= startDate && d <= yEnd;
        }
        return d >= startDate && d <= now;
      });

      // Filter by product
      if (productId && productId !== "all") {
        filteredSales = filteredSales.filter((s: any) => String(s.productId || s.product_id) === String(productId));
      }

      const totalRevenue = filteredSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const totalPaidCount = filteredSales.length;

      // Generate Chart Data
      const chartData: { name: string; sales: number }[] = [];
      const isHourly = period === "0" || period === "1";

      if (isHourly) {
        const buckets = Array.from({ length: 24 }, () => 0);
        for (const s of filteredSales) {
          const h = s.createdAt.getHours();
          buckets[h] += Number(s.amount) || 0;
        }
        for (let i = 0; i < 24; i++) {
          chartData.push({
            name: `${String(i).padStart(2, "0")}:00`,
            sales: buckets[i] / 100,
          });
        }
      } else {
        const daysCount = period === "7" ? 7 : (period === "90" ? 90 : 30);
        const totalsByDay = new Map<string, number>();
        
        for (const s of filteredSales) {
          const d = s.createdAt;
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + (Number(s.amount) || 0));
        }

        for (let i = daysCount; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          chartData.push({
            name: key,
            sales: (totalsByDay.get(key) ?? 0) / 100,
          });
        }
      }

      return {
        salesToday: totalRevenue / 100,
        revenuePaid: totalRevenue / 100,
        salesApproved: totalPaidCount,
        revenueTarget: 10000,
        revenueCurrent: totalRevenue / 100,
        chartData,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return {
        salesToday: 0,
        revenuePaid: 0,
        salesApproved: 0,
        revenueTarget: 10000,
        revenueCurrent: 0,
        chartData: []
      };
    }
  }

  // User management (for compatibility)
  async getUsers(): Promise<any[]> {
    // Note: Users are managed in Firebase Auth, not Firestore
    return [];
  }

  async getUser(id: number): Promise<any | undefined> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return undefined;
  }

  async createUser(user: any): Promise<any> {
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // User deletion is handled by Firebase Auth
  }

  async deleteUserByUsername(username: string): Promise<void> {
    // User deletion is handled by Firebase Auth
  }
}

// Export singleton instance
export const firestoreStorage = new FirestoreStorage();