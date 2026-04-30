import { VercelRequest, VercelResponse } from "@vercel/node";
import { getCheckoutBySlug } from "../../server/neon-storage";
import { getSettings, getAnySettings } from "../../server/neon-storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const slug = req.query.slug as string;
    if (!slug) return res.status(400).json({ message: "Missing slug" });
    
    const checkout = await getCheckoutBySlug(slug);
    if (!checkout) return res.status(404).json({ message: "Checkout not found" });

    let settings = checkout.ownerId ? await getSettings(String(checkout.ownerId)) : null;
    if (!settings?.paypalClientId) settings = await getAnySettings();

    return res.json({
      clientId: settings?.paypalClientId ?? null,
      environment: settings?.environment || "production",
    });
  } catch (err: any) {
    console.error("Error getting PayPal config:", err);
    return res.status(500).json({ message: err.message || "Error fetching config" });
  }
}