import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, isAdmin } from "../_lib/auth";
import { getWithdrawals } from "../neon-storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  if (!isAdmin({ user: auth.user })) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await getWithdrawals(); // No user filter for admin
    return res.json(result);
  } catch (error: any) {
    console.error("Error getting all withdrawals:", error);
    return res.status(500).json({ message: error.message || "Error fetching withdrawals" });
  }
}