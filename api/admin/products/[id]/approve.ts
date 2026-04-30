import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, isAdmin } from "../../_lib/auth";
import { approveProduct } from "../../server/neon-storage";

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
    const id = parseInt(req.query.id as string);
    const product = await approveProduct(id);
    return res.json(product);
  } catch (err: any) {
    console.error("Error approving product:", err);
    return res.status(500).json({ message: err.message || "Error approving product" });
  }
}