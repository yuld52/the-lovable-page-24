import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";
import { verifyAuth } from "./_lib/auth";
import { toSnakeCase, toCamelCase } from "./_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  
  try {
    const client = await getDbClient();
    try {
      const userId = auth.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (req.method === "GET") {
        const result = await client.query(`SELECT * FROM settings WHERE id = $1`, [userId]);
        
        if (result.rows.length === 0) {
          return res.json({ environment: "production" });
        }
        
        return res.json(toCamelCase(result.rows[0]));
      }

      if (req.method === "POST") {
        const body = req.body;
        const updateData = toSnakeCase(body);
        
        // Check if settings exist
        let result = await client.query(`SELECT * FROM settings WHERE id = $1`, [userId]);
        
        if (result.rows.length === 0) {
          // Create new settings
          const result = await client.query(`
            INSERT INTO settings (id, user_id, paypal_client_id, paypal_client_secret, paypal_webhook_id, facebook_pixel_id, facebook_access_token, utmfy_token, environment, meta_enabled, utmfy_enabled, track_top_funnel, track_checkout, track_purchase_refund, sales_notifications)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
          `, [
            userId,
            userId,
            updateData.paypal_client_id || null,
            updateData.paypal_client_secret || null,
            updateData.paypal_webhook_id || null,
            updateData.facebook_pixel_id || null,
            updateData.facebook_access_token || null,
            updateData.utmfy_token || null,
            updateData.environment || 'production',
            true,
            true,
            true,
            true,
            true,
            updateData.sales_notifications ?? false
          ]);
          
          return res.json(toCamelCase(result.rows[0]));
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
          
          return res.json(toCamelCase(result.rows[0]));
        }
      }

      return res.status(405).json({ message: "Method not allowed" });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Settings API error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}