import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth } from "../../_lib/auth";
import { getSaleByPaypalOrderId, updateSaleStatus } from "../../server/neon-storage";
import { captureOrder } from "../../server/paypal";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  
  try {
    const orderId = req.query.orderId as string;
    
    const sale = await getSaleByPaypalOrderId(orderId);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const { getCheckoutPublic } = await import("../../server/neon-storage");
    const checkout = await getCheckoutPublic(sale.checkoutId);
    
    // Get settings
    const { getSettings, getAnySettings } = await import("../../server/neon-storage");
    let settings = checkout?.ownerId ? await getSettings(String(checkout.ownerId)) : null;
    if (!settings?.paypalClientId) settings = await getAnySettings();

    if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
      return res.status(500).json({ message: "PayPal not configured" });
    }

    const captured = await captureOrder(
      { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
      orderId
    );

    await updateSaleStatus(sale.id, "paid");
    
    return res.json({ status: captured.status || "COMPLETED" });
  } catch (err: any) {
    console.error("Error capturing PayPal order:", err);
    return res.status(500).json({ message: err.message || "Error capturing order" });
  }
}