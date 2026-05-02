import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get database URL from environment — prefer NEON_DATABASE_URL (has all tables)
// DATABASE_URL is the Replit-managed Postgres (empty), so we skip it
function getDatabaseUrl(): string {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!url) {
    console.error("❌ NEON_DATABASE_URL não configurada");
    return "";
  }
  return url;
}

// Create a connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url = getDatabaseUrl();
    pool = new Pool({ connectionString: url });
    
    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
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
        let query = `SELECT * FROM products`;
        const params: any[] = [];
        const conditions: string[] = [];
        
        if (status) {
          conditions.push(`status = $${params.length + 1}`);
          params.push(status);
        }
        if (userId) {
          conditions.push(`owner_id = $${params.length + 1}`);
          params.push(userId);
        }

        if (conditions.length > 0) {
          query += ` WHERE ` + conditions.join(' AND ');
        }
        
        query += ` ORDER BY created_at DESC`;
        
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
        const productData = toSnakeCase(product);
        
        const result = await client.query(`
          INSERT INTO products (name, description, price, currency, image_url, delivery_url, whatsapp_url, delivery_files, no_email_delivery, payment_methods, status, owner_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `, [
          productData.name,
          productData.description || null,
          productData.price,
          productData.currency || 'USD',
          productData.image_url || null,
          productData.delivery_url || null,
          productData.whatsapp_url || null,
          JSON.stringify(productData.delivery_files || []),
          productData.no_email_delivery || false,
          JSON.stringify(productData.payment_methods || ["paypal"]),
          productData.status || 'pending',
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
            let val = updateData[key];
            if (key === 'delivery_files' || key === 'payment_methods') {
              val = JSON.stringify(val);
            }
            values.push(val);
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
        const checkoutData = toSnakeCase(checkout);
        
        const result = await client.query(`
          INSERT INTO checkouts (product_id, owner_id, name, slug, public_url, views, active, config)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          checkoutData.product_id,
          checkoutData.owner_id,
          checkoutData.name,
          checkoutData.slug,
          checkoutData.public_url || null,
          0,
          true,
          JSON.stringify(checkoutData.config || {})
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
          if (key !== 'id' && key !== 'created_at' && key !== 'owner_id') {
            setClauses.push(`${key} = $${paramCount}`);
            let val = updateData[key];
            if (key === 'config') val = JSON.stringify(val);
            values.push(val);
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
        const result = await client.query(`SELECT * FROM settings WHERE user_id = $1 LIMIT 1`, [userId]);
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
        
        let result = await client.query(`SELECT * FROM settings WHERE user_id = $1 LIMIT 1`, [userId]);
        
        if (result.rows.length === 0) {
          const settingsData = {
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
          
          const insertResult = await client.query(`
            INSERT INTO settings (user_id, paypal_client_id, paypal_client_secret, paypal_webhook_id, facebook_pixel_id, facebook_access_token, utmfy_token, environment, meta_enabled, utmfy_enabled, track_top_funnel, track_checkout, track_purchase_refund, sales_notifications, webhook_url, webhook_events)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
          `, [
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
            settingsData.sales_notifications,
            settingsData.webhook_url || null,
            settingsData.webhook_events || 'sale.pending,sale.paid,sale.refunded',
          ]);
          
          return toCamelCase(insertResult.rows[0]);
        } else {
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
          
          const updateResult = await client.query(`
            UPDATE settings 
            SET ${setClauses.join(', ')}
            WHERE user_id = $${paramCount}
            RETURNING *
          `, values);
          
          return toCamelCase(updateResult.rows[0]);
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
  async getSales(userId?: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM sales WHERE 1=1`;
        const params: any[] = [];
        
        if (userId) {
          query += ` AND user_id = $1`;
          params.push(userId);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
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
        const saleData = toSnakeCase(sale);
        
        const result = await client.query(`
          INSERT INTO sales (checkout_id, product_id, user_id, amount, status, customer_email, paypal_order_id, paypal_currency, paypal_amount_minor, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *
        `, [
          saleData.checkout_id || null,
          saleData.product_id || null,
          saleData.user_id || null,
          saleData.amount,
          saleData.status || 'pending',
          saleData.customer_email || null,
          saleData.paypal_order_id || null,
          saleData.paypal_currency || null,
          saleData.paypal_amount_minor || null
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

  // Withdrawals
  async getWithdrawals(userId?: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        let query = `SELECT * FROM withdrawals`;
        const params: any[] = [];
        
        if (userId) {
          query += ` WHERE user_id = $1`;
          params.push(userId);
        }
        
        query += ` ORDER BY requested_at DESC`;
        
        const result = await client.query(query, params);
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting withdrawals:", error);
      return [];
    }
  }

  async createWithdrawal(withdrawal: any): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const data = toSnakeCase(withdrawal);
        const result = await client.query(`
          INSERT INTO withdrawals (user_id, amount, pix_key, pix_key_type, status, requested_at)
          VALUES ($1, $2, $3, $4, 'pending', NOW())
          RETURNING *
        `, [
          data.user_id,
          data.amount,
          data.pix_key,
          data.pix_key_type || 'email'
        ]);
        
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      throw error;
    }
  }

  async updateWithdrawalStatus(id: number, status: string, adminNote?: string): Promise<any> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(`
          UPDATE withdrawals 
          SET status = $1, processed_at = NOW(), admin_note = $2
          WHERE id = $3
          RETURNING *
        `, [status, adminNote || null, id]);
        return toCamelCase(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating withdrawal status:", error);
      throw error;
    }
  }

  // Dashboard stats
  async getDashboardStats(userId: string, period?: string, productId?: string, startDateStr?: string, endDateStr?: string): Promise<any> {
    const client = await getPool().connect();
    try {
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (period === "custom" && startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
      } else if (period === "0") {
        // Today only — keep startDate and endDate as current day
      } else if (period === "1") {
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
        AND created_at >= $2 
        AND created_at <= $3
      `;
      
      const params: any[] = [userId, startDate, endDate];
      
      if (productId && productId !== "all") {
        query += ` AND product_id = $4`;
        params.push(productId);
      }

      const result = await client.query(query, params);
      const sales = result.rows.map(row => toCamelCase(row));
      
      const checkoutsResult = await client.query(
        `SELECT * FROM checkouts WHERE owner_id = $1`,
        [userId]
      );
      
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
      
      const chartData: { name: string; sales: number }[] = [];
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      for (let i = diffDays; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const daySales = sales.filter((s: any) => {
          const saleDate = new Date(s.createdAt || s.created_at);
          return saleDate.getDate() === d.getDate() && 
                 saleDate.getMonth() === d.getMonth() && 
                 saleDate.getFullYear() === d.getFullYear();
        });
        const dayTotal = daySales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        chartData.push({ name: key, sales: dayTotal });
      }
      
      return {
        salesToday: totalRevenue,
        revenuePaid: totalRevenue,
        salesApproved: sales.length,
        conversionRate,
        revenueTarget: 10000,
        revenueCurrent: totalRevenue,
        chartData,
      };
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
    } finally {
      client.release();
    }
  }
  // Bank Accounts
  async getBankAccounts(userId: string): Promise<any[]> {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query(
          `SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        return result.rows.map(row => toCamelCase(row));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting bank accounts:", error);
      return [];
    }
  }

  async ensureBankAccountNameColumn(): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
    } finally {
      client.release();
    }
  }

  async createBankAccount(userId: string, type: string, phone: string, name?: string): Promise<any> {
    await this.ensureBankAccountNameColumn();
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO bank_accounts (user_id, type, phone, name) VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, type, phone, name || null]
      );
      return toCamelCase(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteBankAccount(id: number, userId: string): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query(
        `DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } finally {
      client.release();
    }
  }

  async migrateDefaultPaymentMethods(): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query(`
        UPDATE products
        SET payment_methods = '["paypal","mpesa","emola","googlepay"]'::jsonb
        WHERE payment_methods = '["paypal"]'::jsonb
           OR payment_methods IS NULL
      `);
    } catch (err) {
      console.error("migrateDefaultPaymentMethods error:", err);
    } finally {
      client.release();
    }
  }

  // Platform Config (Rules & Fees)
  async ensurePlatformConfigTable(): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS platform_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } finally {
      client.release();
    }
  }

  async getPlatformConfig(): Promise<Record<string, string>> {
    try {
      await this.ensurePlatformConfigTable();
      const client = await getPool().connect();
      try {
        const result = await client.query(`SELECT key, value FROM platform_config`);
        const config: Record<string, string> = {};
        for (const row of result.rows) {
          config[row.key] = row.value;
        }
        return config;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error getting platform config:", error);
      return {};
    }
  }

  async setPlatformConfig(data: Record<string, string>): Promise<void> {
    await this.ensurePlatformConfigTable();
    const client = await getPool().connect();
    try {
      for (const [key, value] of Object.entries(data)) {
        await client.query(`
          INSERT INTO platform_config (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
        `, [key, value]);
      }
    } finally {
      client.release();
    }
  }
}

export const neonStorage = new NeonStorage();