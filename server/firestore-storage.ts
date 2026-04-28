import { adminDb } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Helper function to normalize checkout data from Firestore (handles both old camelCase and new snake_case)
function normalizeCheckoutData(docId: string, data: any): any {
  if (!data) return null;
  
  return {
    id: isNaN(parseInt(docId)) ? docId : parseInt(docId),
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

// Helper function to normalize product data from Firestore
function normalizeProductData(docId: string, data: any): any {
  if (!data) return null;
  
  return {
    id: isNaN(parseInt(docId)) ? docId : parseInt(docId),
    ownerId: data.owner_id ?? data.ownerId ?? data.userId ?? null,
    name: data.name ?? '',
    description: data.description ?? null,
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

// Helper function to normalize sale data from Firestore
function normalizeSaleData(docId: string, data: any): any {
  if (!data) return null;
  return {
    id: isNaN(parseInt(docId)) ? docId : parseInt(docId),
    checkoutId: data.checkout_id ?? data.checkoutId ?? null,
    productId: data.product_id ?? data.productId ?? null,
    amount: data.amount ?? 0,
    status: data.status ?? 'pending',
    customerEmail: data.customer_email ?? data.customerEmail ?? null,
    paypalOrderId: data.paypal_order_id ?? data.paypalOrderId ?? null,
    paypalCaptureId: data.paypal_capture_id ?? data.paypalCaptureId ?? null,
    paypalCurrency: data.paypal_currency ?? data.paypalCurrency ?? null,
    paypalAmountMinor: data.paypal_amount_minor ?? data.paypalAmountMinor ?? null,
    createdAt: toDate(data.created_at ?? data.createdAt),
    utmSource: data.utm_source ?? data.utmSource ?? null,
    utmMedium: data.utm_medium ?? data.utmMedium ?? null,
    utmCampaign: data.utm_campaign ?? data.utmCampaign ?? null,
    utmContent: data.utm_content ?? data.utmContent ?? null,
    utmTerm: data.utm_term ?? data.utmTerm ?? null,
  };
}

// Counter for auto-incrementing IDs
async function getNextId(collectionName: string): Promise<number> {
  try {
    const counterRef = adminDb.collection("_counters").doc(collectionName);
    return await adminDb.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const newCount = (counterDoc.exists ? (counterDoc.data()?.count || 0) : 0) + 1;
      transaction.set(counterRef, { count: newCount });
      return newCount;
    });
  } catch (error) {
    console.error(`Error getting next ID for ${collectionName}:`, error);
    return Date.now(); // Fallback to timestamp if transaction fails
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
      let q: any = adminDb.collection("products");
      if (userId) {
        const snapshot = await q.get();
        return snapshot.docs
          .map((doc: any) => normalizeProductData(doc.id, doc.data()))
          .filter((p: any) => !userId || p.ownerId === userId);
      }
      const snapshot = await q.get();
      return snapshot.docs.map((doc: any) => normalizeProductData(doc.id, doc.data()));
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
      const id = await getNextId("products");
      const productData = {
        ...product,
        owner_id: product.userId || product.ownerId,
        created_at: Timestamp.now()
      };
      delete productData.userId;
      
      await adminDb.collection("products").doc(String(id)).set({ ...productData, id: String(id) });
      return { id, ...productData, createdAt: toDate(productData.created_at) };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(id: number, updates: any): Promise<any> {
    try {
      const docRef = adminDb.collection("products").doc(String(id));
      const firestoreUpdates: any = { ...updates };
      if (updates.imageUrl) firestoreUpdates.image_url = updates.imageUrl;
      if (updates.deliveryUrl) firestoreUpdates.delivery_url = updates.deliveryUrl;
      
      await docRef.update(firestoreUpdates);
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
      return snapshot.docs
        .map(doc => normalizeCheckoutData(doc.id, doc.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (doc.exists) {
          const newViews = (doc.data()?.views || 0) + 1;
          transaction.update(docRef, { views: newViews });
        }
      });
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  }

  async createCheckout(checkout: any): Promise<any> {
    try {
      const id = await getNextId("checkouts");
      const checkoutData = {
        ...checkout,
        product_id: checkout.productId,
        owner_id: checkout.ownerId,
        public_url: checkout.publicUrl,
        created_at: Timestamp.now()
      };
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
      const firestoreUpdates: any = { ...updates };
      if (updates.productId !== undefined) firestoreUpdates.product_id = updates.productId;
      
      await docRef.update(firestoreUpdates);
      return this.getCheckout(id, userId);
    } catch (error) {
      console.error("Error updating checkout:", error);
      throw error;
    }
  }

  async deleteCheckout(id: number, userId: string): Promise<void> {
    try {
      const docRef = adminDb.collection("checkouts").doc(String(id));
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data?.owner_id === userId || data?.ownerId === userId) {
          await docRef.delete();
        }
      }
    } catch (error) {
      console.error("Error deleting checkout:", error);
      throw error;
    }
  }

  // Settings
  async getSettings(userId: string): Promise<any | undefined> {
    try {
      const snapshot = await adminDb.collection("settings")
        .where("userId", "==", userId)
        .limit(1)
        .get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
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
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error("Error getting any settings:", error);
      return undefined;
    }
  }

  async updateSettings(userId: string, updates: any): Promise<any> {
    try {
      const snapshot = await adminDb.collection("settings")
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        const settingsData = {
          userId,
          ...updates,
          salesNotifications: updates.salesNotifications ?? true,
          environment: updates.environment ?? "production",
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
  async getSales(userId: string): Promise<any[]> {
    try {
      const snapshot = await adminDb.collection("sales")
        .where("user_id", "==", userId)
        .get();
      return snapshot.docs
        .map(doc => normalizeSaleData(doc.id, doc.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting sales:", error);
      return [];
    }
  }

  async getSaleByPaypalOrderId(orderId: string): Promise<any | undefined> {
    try {
      const snapshot = await adminDb.collection("sales")
        .where("paypalOrderId", "==", orderId)
        .limit(1)
        .get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return normalizeSaleData(doc.id, doc.data());
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
        user_id: sale.user_id || sale.userId,
        created_at: Timestamp.now()
      };
      delete saleData.userId;
      await adminDb.collection("sales").doc(String(id)).set({ ...saleData, id: String(id) });
      return { id, ...saleData, createdAt: toDate(saleData.created_at) };
    } catch (error) {
      console.error("Error creating sale:", error);
      throw error;
    }
  }

  // Dashboard stats
  async getDashboardStats(userId: string, period?: string, productId?: string): Promise<any> {
    try {
      const salesRef = adminDb.collection("sales");
      let q = salesRef.where("user_id", "==", userId).where("status", "==", "paid");
      
      const snapshot = await q.get();
      const sales = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount || 0,
          createdAt: toDate(data.createdAt || data.created_at)
        };
      });

      const now = new Date();
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      if (period === "1") { // Ontem
        startDate.setDate(now.getDate() - 1);
        const yesterdayEnd = new Date(startDate);
        yesterdayEnd.setHours(23, 59, 59, 999);
        var filteredSales = sales.filter((s: any) => s.createdAt >= startDate && s.createdAt <= yesterdayEnd);
      } else {
        if (period === "7") startDate.setDate(now.getDate() - 7);
        else if (period === "90") startDate.setDate(now.getDate() - 90);
        else if (period === "30" || !period) startDate.setDate(now.getDate() - 30);
        var filteredSales = sales.filter((s: any) => s.createdAt >= startDate);
      }

      if (productId && productId !== "all") {
        filteredSales = filteredSales.filter((s: any) => String(s.productId || s.product_id) === String(productId));
      }

      const totalRevenue = filteredSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      
      // Chart Data
      const chartData: { name: string; sales: number }[] = [];
      const isHourly = period === "0" || period === "1";

      if (isHourly) {
        const buckets = Array.from({ length: 24 }, () => 0);
        for (const s of filteredSales) buckets[s.createdAt.getHours()] += Number(s.amount) || 0;
        for (let i = 0; i < 24; i++) chartData.push({ name: `${String(i).padStart(2, "0")}:00`, sales: buckets[i] / 100 });
      } else {
        const daysCount = period === "7" ? 7 : (period === "90" ? 90 : 30);
        const totalsByDay = new Map<string, number>();
        for (const s of filteredSales) {
          const key = `${String(s.createdAt.getDate()).padStart(2, "0")}/${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
          totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + (Number(s.amount) || 0));
        }
        for (let i = daysCount; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          chartData.push({ name: key, sales: (totalsByDay.get(key) ?? 0) / 100 });
        }
      }

      return {
        salesToday: totalRevenue / 100,
        revenuePaid: totalRevenue / 100,
        salesApproved: filteredSales.length,
        revenueTarget: 10000,
        revenueCurrent: totalRevenue / 100,
        chartData,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return { salesToday: 0, revenuePaid: 0, salesApproved: 0, revenueTarget: 10000, revenueCurrent: 0, chartData: [] };
    }
  }

  // Compatibility stubs
  async getUsers(): Promise<any[]> { return []; }
  async getUser(id: number): Promise<any | undefined> { return undefined; }
  async getUserByUsername(username: string): Promise<any | undefined> { return undefined; }
  async createUser(user: any): Promise<any> { return user; }
  async deleteUser(id: number): Promise<void> {}
  async deleteUserByUsername(username: string): Promise<void> {}
}

export const firestoreStorage = new FirestoreStorage();