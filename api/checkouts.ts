import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";
import { verifyAuth, isAdmin } from "./_lib/auth";
import { toSnakeCase, toCamelCase } from "./_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const userId = auth.user?.id || "";
        
        let query = `SELECT * FROM checkouts`;
        const params: any[] = [];
        
        if (!isAdmin({ user: auth.user })) {
          query += ` WHERE owner_id = $1`;
          params.push(userId);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await client.query(query, params);
        return res.json(result.rows.map((row: any) => toCamelCase(row)));
      }

      if (req.method === "POST") {
        const userId = auth.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const body = req.body;
        const checkoutData = toSnakeCase(body);
        
        const baseUrl = process.env.VERCEL_URL || "http://localhost:3000";
        const slug = checkoutData.slug || `checkout-${Date.now()}`;
        
        const result = await client.query(`
          INSERT INTO checkouts (product_id, owner_id, name, slug, public_url, views, active, config)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          checkoutData.product_id,
          userId,
          checkoutData.name,
          slug,
          `${baseUrl}/checkout/${slug}`,
          0,
          true,
          checkoutData.config || '{}'
        ]);
        
        return res.status(201).json(toCamelCase(result.rows[0]));
      }

      return res.status(405).json({ message: "Method not allowed" });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Checkouts API error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}