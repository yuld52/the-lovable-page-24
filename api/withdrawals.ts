import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";
import { verifyAuth, isAdmin } from "./_lib/auth";
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
      if (req.method === "POST") {
        const userId = auth.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { amount, pixKey, pixKeyType } = req.body;

        if (!amount || !pixKey) {
          return res.status(400).json({ message: "Amount and pixKey are required" });
        }

        const withdrawal = await client.query(
          `INSERT INTO withdrawals (user_id, amount, pix_key, pix_key_type, status)
           VALUES ($1, $2, $3, $4, 'pending')
           RETURNING *`,
          [userId, Math.round(parseFloat(amount) * 100), pixKey, pixKeyType || "email"]
        );

        return res.status(201).json(toCamelCase(withdrawal.rows[0]));
      }

      if (req.method === "GET") {
        if (!isAdmin({ user: auth.user })) {
          return res.status(403).json({ message: "Access denied" });
        }

        const result = await client.query(
          `SELECT w.*, u.username
           FROM withdrawals w
           LEFT JOIN users u ON w.user_id = u.id
           ORDER BY w.requested_at DESC`
        );

        return res.json(result.rows.map((row: any) => toCamelCase(row)));
      }

      return res.status(405).json({ message: "Method not allowed" });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Withdrawals API error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
