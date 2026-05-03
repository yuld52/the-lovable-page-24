import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";
import { verifyAuth, isAdmin } from "./_lib/auth";
import { toSnakeCase, toCamelCase } from "./_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  
  try {
    const client = await getDbClient();
    try {
      if (req.method === "GET") {
        // Get products
        const userId = auth.user?.id || "";
        const { status } = req.query;
        
        let query = `SELECT * FROM products`;
        const params: any[] = [];
        
        if (isAdmin({ user: auth.user })) {
          // Admin: get all products
        } else if (userId) {
          query += ` WHERE owner_id = $1`;
          params.push(userId);
        }
        
        if (status && typeof status === "string") {
          query += params.length > 0 ? ` AND status = $${params.length + 1}` : ` WHERE status = $1`;
          params.push(status);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
        return res.json(result.rows.map((row: any) => toCamelCase(row)));
      }

      if (req.method === "POST") {
        // Create product
        const userId = auth.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const body = req.body;
        const productData = toSnakeCase(body);
        
        const result = await client.query(`
          INSERT INTO products (name, description, price, image_url, delivery_url, whatsapp_url, delivery_files, no_email_delivery, payment_methods, status, owner_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          userId
        ]);
        
        return res.status(201).json(toCamelCase(result.rows[0]));
      }

      return res.status(405).json({ message: "Method not allowed" });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Products API error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}