import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get database URL from environment
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
  if (!url) {
    throw new Error("DATABASE_URL or NEON_DATABASE_URL environment variable is required");
  }
  return url;
}

// Create a connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

// Helper to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  }
  if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  }
  if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export class NeonStorage {
  // Products
  async getProducts(userId?: string, status?: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `
          SELECT * FROM products 
          ${status ? `WHERE status = $1` : ''}
          ${userId && status ? `AND owner_id = $2` : userId ? `WHERE owner_id = $1` : ''}
          ORDER BY created_at DESC
        `;
        
        const params: any[] = [];
        if (status) params.push(status);
        if (userId) params.push(userId);
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM products WHERE id = $1`, [id]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  }

  async createProduct(product: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        // Let PostgreSQL handle the SERIAL ID automatically
        const productData = toSnakeCase(product);
        
        const result = await client.query(`
          INSERT INTO products (name, description, price, image_url, delivery_url, whatsapp_url, delivery_files, no_email_delivery, payment_methods, status, owner_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          productData.name,
          productData.description || null,
          productData.price,
          productData.image_url || null,
          productData.delivery_url || null,
          productData.whatsapp_url || null,
          productData.delivery_files || '[]',
          productData.no_email_delivery || false,
          productData.payment_methods || '["paypal"]',
          'pending', // All new products start as pending
          productData.owner_id || null
        ]);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(id: number, updates: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const updateData = toSnakeCase(updates);
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        Object.keys(updateData).forEach(key => {
          if (key !== 'id' && key !== 'created_at') {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(updateData[key]);
            paramCount++;
          }
        });
        
        values.push(id);
        
        const result = await client.query(`
          UPDATE products 
          SET ${setClauses.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `, values);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`DELETE FROM products WHERE id = $1`, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  async approveProduct(id: number): Promise<any> {
    return this.updateProduct(id, { status: 'approved' });
  }

  async rejectProduct(id: number): Promise<any> {
    return this.updateProduct(id, { status: 'rejected' });
  }

  // Checkouts
  async getCheckouts(userId?: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM checkouts`;
        const params: any[] = [];
        
        if (userId) {
          query += ` WHERE owner_id = $1`;
          params.push(userId);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting checkouts:", error);
      return [];
    }
  }

  async getCheckout(id: number, userId?: string): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM checkouts WHERE id = $1`;
        const params: any[] = [id];
        
        if (userId) {
          query += ` AND owner_id = $2`;
          params.push(userId);
        }
        
        const result = await client.query(query, params);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting checkout:", error);
      return undefined;
    }
  }

  async getCheckoutPublic(id: number): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM checkouts WHERE id = $1`, [id]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting public checkout:", error);
      return undefined;
    }
  }

  async getCheckoutBySlug(slug: string): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM checkouts WHERE slug = $1 LIMIT 1`, [slug]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting checkout by slug:", error);
      return undefined;
    }
  }

  async incrementCheckoutViews(id: number): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          UPDATE checkouts 
          SET views = COALESCE(views, 0) + 1 
          WHERE id = $1
        `, [id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  }

  async createCheckout(checkout: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        // Let PostgreSQL handle the SERIAL ID automatically
        const checkoutData = toSnakeCase(checkout);
        
        const result = await client.query(`
          INSERT INTO checkouts (product_id, owner_id, name, slug, public_url, views, active, config)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          checkoutData.product_id,
          checkoutData.owner_id,
          checkoutData.name,
          checkoutData.slug,
          checkoutData.public_url || null,
          0, // views
          true, // active
          checkoutData.config || '{}'
        ]);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      throw error;
    }
  }

  async updateCheckout(id: number, userId: string, updates: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const updateData = toSnakeCase(updates);
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        Object.keys(updateData).forEach(key => {
          if (key !== 'id' && key !== 'created_at') {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(updateData[key]);
            paramCount++;
          }
        });
        
        values.push(id);
        values.push(userId);
        
        const result = await client.query(`
          UPDATE checkouts 
          SET ${setClauses.join(', ')}
          WHERE id = $${paramCount} AND owner_id = $${paramCount + 1}
          RETURNING *
        `, values);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating checkout:", error);
      throw error;
    }
  }

  async deleteCheckout(id: number, userId: string): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`
          DELETE FROM checkouts 
          WHERE id = $1 AND owner_id = $2
        `, [id, userId]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error deleting checkout:", error);
      throw error;
    }
  }

  // Settings
  async getSettings(userId: string): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        // Try by document ID (UID), which is how the frontend saves it
        let result = await client.query(`SELECT * FROM settings WHERE id = $1`, [userId]);
        
        if (result.rows.length === 0) {
          // Fallback to searching by user_id field
          result = await client.query(`SELECT * FROM settings WHERE user_id = $1 LIMIT 1`, [userId]);
        }
        
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting settings:", error);
      return undefined;
    }
  }

  async getAnySettings(): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM settings LIMIT 1`);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting any settings:", error);
      return undefined;
    }
  }

  async updateSettings(userId: string, updates: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const updateData = toSnakeCase(updates);
        
        // Check if settings exist
        let result = await client.query(`SELECT * FROM settings WHERE id = $1`, [userId]);
        
        if (result.rows.length === 0) {
          // Create new settings
          const settingsData = {
            id: userId,
            user_id: userId,
            ...updateData,
            sales_notifications: updateData.sales_notifications ?? false,
            environment: updateData.environment ?? 'production',
            meta_enabled: true,
            utmfy_enabled: true,
            track_top_funnel: true,
            track_checkout: true,
            track_purchase_refund: true
          };
          
          const result = await client.query(`
            INSERT INTO settings (id, user_id, paypal_client_id, paypal_client_secret, paypal_webhook_id, facebook_pixel_id, facebook_access_token, utmfy_token, environment, meta_enabled, utmfy_enabled, track_top_funnel, track_checkout, track_purchase_refund, sales_notifications)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
          `, [
            settingsData.id,
            settingsData.user_id,
            settingsData.paypal_client_id || null,
            settingsData.paypal_client_secret || null,
            settingsData.paypal_webhook_id || null,
            settingsData.facebook_pixel_id || null,
            settingsData.facebook_access_token || null,
            settingsData.utmfy_token || null,
            settingsData.environment,
            settingsData.meta_enabled,
            settingsData.utmfy_enabled,
            settingsData.track_top_funnel,
            settingsData.track_checkout,
            settingsData.track_purchase_refund,
            settingsData.sales_notifications
          ]);
          
          return toCamelCase(result.rows[0]);
        } else {
          // Update existing settings
          const setClauses: string[] = [];
          const values: any[] = [];
          let paramCount = 1;
          
          Object.keys(updateData).forEach(key => {
            if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
              setClauses.push(`${key} = $${paramCount}`);
              values.push(updateData[key]);
              paramCount++;
            }
          });
          
          values.push(userId);
          
          const result = await client.query(`
            UPDATE settings 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
          `, values);
          
          return toCamelCase(result.rows[0]);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  }

  // Sales
  async getSales(userId: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`
          SELECT * FROM sales 
          WHERE user_id = $1 AND status = 'paid'
          ORDER BY created_at DESC
        `, [userId]);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting sales:", error);
      return [];
    }
  }

  async getSaleByPaypalOrderId(orderId: string): Promise<any | undefined> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT * FROM sales WHERE paypal_order_id = $1 LIMIT 1`, [orderId]);
        if (result.rows.length === 0) return undefined;
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting sale by PayPal order ID:", error);
      return undefined;
    }
  }

  async updateSaleStatus(id: number, status: string): Promise<void> {
    try {
      const client = await getPool().connect();
      try {
        await client.query(`UPDATE sales SET status = $1 WHERE id = $2`, [status, id]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating sale status:", error);
    }
  }

  async createSale(sale: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        // Let PostgreSQL handle the SERIAL ID automatically
        const saleData = toSnakeCase(sale);
        
        const result = await client.query(`
          INSERT INTO sales (checkout_id, product_id, user_id, amount, status, customer_email, paypal_order_id, paypal_capture_id, paypal_currency, paypal_amount_minor, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14)
          RETURNING *
        `, [
          saleData.checkout_id || null,
          saleData.product_id || null,
          saleData.user_id || null,
          saleData.amount,
          saleData.status || 'pending',
          saleData.customer_email || null,
          saleData.paypal_order_id || null,
          saleData.paypal_capture_id || null,
          saleData.paypal_currency || null,
          saleData.paypal_amount_minor || null,
          saleData.utm_source || null,
          saleData.utm_medium || null,
          saleData.utm_campaign || null,
          saleData.utm_content || null,
          saleData.utm_term || null
        ]);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating sale:", error);
      throw error;
    }
  }

  // Dashboard stats
  async getDashboardStats(userId: string, period?: string, productId?: string, startDateStr?: string, endDateStr?: string): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        if (period === "custom" && startDateStr && endDateStr) {
          startDate = new Date(startDateStr);
          endDate = new Date(endDateStr);
        } else if (period === "1") { // Yesterday
          startDate.setDate(startDate.getDate() - 1);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
        } else if (period === "7") {
          startDate.setDate(startDate.getDate() - 7);
        } else if (period === "90") {
          startDate.setDate(startDate.getDate() - 90);
        } else if (period === "30" || !period) {
          startDate.setDate(startDate.getDate() - 30);
        }

        let query = `
          SELECT * FROM sales 
          WHERE user_id = $1 
          AND status = 'paid'
          AND created_at >= $2 
          AND created_at <= $3
        `;
        
        const params: any[] = [userId, startDate, endDate];
        
        if (productId && productId !== "all") {
          query += ` AND product_id = $${params.length + 1}`;
          params.push(productId);
        }
        
        const result = await client.query(query, params);
        const sales = result.rows.map(row => toCamelCase(row));
        
        // Get views from checkouts
        const checkoutsResult = await client.query(`
          SELECT * FROM checkouts 
          WHERE owner_id = $1
        `, [userId]);
        
        let totalViews = 0;
        checkoutsResult.rows.forEach((row: any) => {
          if (productId && productId !== "all") {
            if (String(row.product_id) === String(productId)) {
              totalViews += (row.views || 0);
            }
          } else {
            totalViews += (row.views || 0);
          }
        });
        
        const totalRevenue = sales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        const conversionRate = totalViews > 0 ? (sales.length / totalViews) * 100 : 0;
        
        // Chart Data
        const chartData: { name: string; sales: number }[] = [];
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        for (let i = diffDays; i >= 0; i--) {
          const d = new Date(endDate);
          d.setDate(endDate.getDate() - i);
          const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          const daySales = sales.filter((s: any) => {
            const saleDate = new Date(s.createdAt);
            return saleDate.getDate() === d.getDate() && 
                   saleDate.getMonth() === d.getMonth() && 
                   saleDate.getFullYear() === d.getFullYear();
          });
          const dayTotal = daySales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
          chartData.push({ name: key, sales: dayTotal / 100 });
        }
        
        return {
          salesToday: totalRevenue / 100,
          revenuePaid: totalRevenue / 100,
          salesApproved: sales.length,
          conversionRate,
          revenueTarget: 10000,
          revenueCurrent: totalRevenue / 100,
          chartData,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return { 
        salesToday: 0, 
        revenuePaid: 0, 
        salesApproved: 0, 
        conversionRate: 0, 
        revenueTarget: 10000, 
        revenueCurrent: 0, 
        chartData: [] 
      };
    }
  }
}

export const neonStorage = new NeonStorage();