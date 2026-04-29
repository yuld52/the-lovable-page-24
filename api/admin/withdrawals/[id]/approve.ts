import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "../../_lib/database";
import { verifyAuth, isAdmin } from "../../_lib/auth";
import { toCamelCase } from "../../_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  
  if (!isAdmin({ user: auth.user })) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const client = await getDbClient();
    try {
      const { id } = req.query;
      const { adminNote } = req.body;
      
      const result = await client.query(`
        UPDATE withdrawals 
        SET status = 'approved', processed_at = NOW(), admin_note = $1
        WHERE id = $2
        RETURNING *
      `, [adminNote || null, id]);
      
      return res.json(toCamelCase(result.rows[0]));
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Approve withdrawal error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}