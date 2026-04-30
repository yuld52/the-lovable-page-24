import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth } from "../_lib/auth";
import { getDbClient } from "../_lib/database";
import { toSnakeCase } from "../_lib/database";
import { createOrder, createOrderBodySchema } from "../../server/paypal";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  
  try {
    const body = createOrderBodySchema.parse(req.body);
    const { getCheckoutPublic, getProduct, createSale } = await import("../../server/neon-storage");
    
    const checkout = await getCheckoutPublic(body.checkoutId);
    const product = await getProduct(body.productId);
    
    if (!checkout || !product) {
      return res.status(404).json({ message: "Checkout/Product not found" });
    }

    // Check if product is approved
    if (product.status !== 'approved') {
      return res.status(403).json({ message: "Product not approved" });
    }

    // Get settings
    const { getSettings, getAnySettings } = await import("../../server/neon-storage");
    let settings = checkout.ownerId ? await getSettings(String(checkout.ownerId)) : null;
    if (!settings?.paypalClientId) settings = await getAnySettings();

    if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
      return res.status(500).json({ message: "PayPal not configured" });
    }

    const order = await createOrder(
      { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
      { currency: body.currency, amountMinor: body.totalMinor, description: product.name }
    );

    await createSale({
      checkoutId: body.checkoutId,
      productId: body.productId,
      userId: checkout.ownerId,
      amount: body.totalUsdCents,
      status: "pending",
      customerEmail: body.customerData?.email || null,
      paypalOrderId: order.id,
      paypalCurrency: body.currency,
      paypalAmountMinor: body.totalMinor,
    });

    return res.json({ id: order.id });
  } catch (err: any) {
    console.error("Error creating PayPal order:", err);
    return res.status(500).json({ message: err.message || "Error creating order" });
  }
}