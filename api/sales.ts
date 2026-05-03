import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";
import { verifyAuth } from "./_lib/auth";
import { toCamelCase } from "./_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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
        
        let query = `SELECT * FROM sales WHERE user_id = $1 AND status = 'paid' ORDER BY created_at DESC`;
        const params: any[] = [userId];
        
        const result = await client.query(query, params);
        return res.json(result.rows.map((row: any) => toCamelCase(row)));
      }

      return res.status(405).json({ message: "Method not allowed" });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Sales API error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}