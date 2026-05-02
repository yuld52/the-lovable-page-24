import crypto from "crypto";

export type TrackingDestination = "meta" | "utmfy";

export type TrackingEventName =
  | "PageView"
  | "ViewContent"
  | "Purchase"
  | "Refund"
  | "checkout"
  | "payment_pending"
  | "purchase"
  | "refund";

type SettingsLike = {
  utmfyToken?: string | null;
  facebookPixelId?: string | null;
  facebookAccessToken?: string | null;
  metaEnabled?: boolean | null;
  utmfyEnabled?: boolean | null;
  trackTopFunnel?: boolean | null;
  trackCheckout?: boolean | null;
  trackPurchaseRefund?: boolean | null;
  webhookUrl?: string | null;
};

type SaleLike = {
  id: number;
  amount: number;
  customerEmail?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

function sha256LowerTrim(value: string) {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function isEnabled(settings: SettingsLike | null | undefined, dest: TrackingDestination, category: "top" | "checkout" | "purchase_refund") {
  if (!settings) return false;
  const metaEnabled = settings.metaEnabled ?? true;
  const utmfyEnabled = settings.utmfyEnabled ?? true;
  if (dest === "meta" && !metaEnabled) return false;
  if (dest === "utmfy" && !utmfyEnabled) return false;
  if (category === "top") return (settings.trackTopFunnel ?? true) === true;
  if (category === "checkout") return (settings.trackCheckout ?? true) === true;
  return (settings.trackPurchaseRefund ?? true) === true;
}

function formatUtcDatetime(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────

export type WebhookEventName = "sale.pending" | "sale.paid" | "sale.refunded";

export type WebhookSaleData = {
  id: number;
  status: string;
  amount: number;
  currency: string;
  paypalOrderId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  productId?: number | null;
  productName?: string | null;
  checkoutId?: number | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
};

export async function sendWebhookNotification(
  webhookUrl: string | null | undefined,
  event: WebhookEventName,
  data: WebhookSaleData,
): Promise<void> {
  if (!webhookUrl) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const bodyStr = JSON.stringify(payload);
  const secret = process.env.WEBHOOK_SECRET || "meteorfy-secret";
  const signature = crypto.createHmac("sha256", secret).update(bodyStr).digest("hex");

  console.log(`📡 [WEBHOOK] Disparando '${event}' → ${webhookUrl}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Meteorfy-Signature": `sha256=${signature}`,
        "X-Meteorfy-Event": event,
        "User-Agent": "Meteorfy-Webhook/1.0",
      },
      body: bodyStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`❌ [WEBHOOK] Erro HTTP ${response.status}: ${text.substring(0, 200)}`);
    } else {
      console.log(`✅ [WEBHOOK] Entregue com sucesso (${response.status})`);
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("❌ [WEBHOOK] Timeout (>10s)");
    } else {
      console.error("❌ [WEBHOOK] Erro de entrega:", err?.message || err);
    }
  }
}

// ─── UTMIFY ───────────────────────────────────────────────────────────────────

export type UtmifyOrderParams = {
  token: string;
  orderId: string;
  status: "waiting_payment" | "paid" | "refused" | "refunded" | "chargedback";
  paymentMethod: "paypal" | "credit_card" | "pix" | "boleto" | "free_price";
  createdAt: Date;
  approvedAt?: Date | null;
  refundedAt?: Date | null;
  currency: string;
  totalAmountMinor: number;
  customer: { name?: string | null; email?: string | null; phone?: string | null; document?: string | null };
  products: Array<{ id: string | number; name: string; priceInCents: number; quantity?: number }>;
  tracking: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  };
  isTest?: boolean;
};

export async function sendUtmifyOrder(params: UtmifyOrderParams): Promise<void> {
  const { token, orderId, status, paymentMethod, createdAt, approvedAt, refundedAt,
    currency, totalAmountMinor, customer, products, tracking, isTest } = params;

  const gatewayFee = Math.round(totalAmountMinor * 0.039 + 30);
  const userCommission = Math.max(1, totalAmountMinor - gatewayFee);
  const cur = (currency || "USD").toUpperCase();

  const payload = {
    orderId: String(orderId),
    platform: "Meteorfy",
    paymentMethod,
    status,
    createdAt: formatUtcDatetime(createdAt),
    approvedDate: approvedAt ? formatUtcDatetime(approvedAt) : null,
    refundedAt: refundedAt ? formatUtcDatetime(refundedAt) : null,
    customer: {
      name: customer.name || customer.email || "Cliente",
      email: customer.email || "",
      phone: customer.phone || null,
      document: customer.document || null,
    },
    products: products.map(p => ({
      id: String(p.id),
      name: p.name,
      planId: null,
      planName: null,
      quantity: p.quantity ?? 1,
      priceInCents: p.priceInCents,
    })),
    trackingParameters: {
      src: null,
      sck: null,
      utm_source: tracking.utmSource || null,
      utm_campaign: tracking.utmCampaign || null,
      utm_medium: tracking.utmMedium || null,
      utm_content: tracking.utmContent || null,
      utm_term: tracking.utmTerm || null,
    },
    commission: {
      totalPriceInCents: totalAmountMinor,
      gatewayFeeInCents: gatewayFee,
      userCommissionInCents: userCommission,
      ...(cur !== "BRL" ? { currency: cur } : {}),
    },
    isTest: isTest === true,
  };

  console.log("📤 [UTMIFY] Enviando pedido:", { orderId, status, paymentMethod, totalAmountMinor });

  try {
    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": token,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error("❌ [UTMIFY] Erro:", response.status, responseText);
    } else {
      console.log("✅ [UTMIFY] Pedido enviado com sucesso:", response.status);
    }
  } catch (err) {
    console.error("❌ [UTMIFY] Erro de rede:", err);
  }
}

export async function sendUtmfyEvent(
  settings: SettingsLike | null | undefined,
  event: "view" | "view_content" | "checkout" | "payment_pending" | "purchase" | "refund",
  saleOrLike: SaleLike,
) {
  console.log(`ℹ️ [UTMIFY] Evento top-of-funnel '${event}' ignorado (usar sendUtmifyOrder para pedidos)`);
}

// ─── META CAPI ────────────────────────────────────────────────────────────────

export type MetaCapiOptions = {
  currency?: string;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  eventId?: string | null;
};

export async function sendMetaCapiEvent(
  settings: SettingsLike | null | undefined,
  eventName: "PageView" | "ViewContent" | "Purchase" | "Refund",
  like: SaleLike,
  options?: MetaCapiOptions,
): Promise<void> {
  const pixelId = settings?.facebookPixelId;
  const accessToken = settings?.facebookAccessToken;

  if (!pixelId || !accessToken) return;

  const email = like.customerEmail;
  const hashedEmail = email ? sha256LowerTrim(email) : undefined;
  const eventId = options?.eventId || crypto.randomUUID();
  const currency = (options?.currency || "USD").toUpperCase();
  const value = like.amount / 100;

  const userData: Record<string, any> = {};
  if (hashedEmail) userData.em = [hashedEmail];
  if (options?.clientIp) userData.client_ip_address = options.clientIp;
  if (options?.clientUserAgent) userData.client_user_agent = options.clientUserAgent;
  if (options?.fbc) userData.fbc = options.fbc;
  if (options?.fbp) userData.fbp = options.fbp;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        user_data: userData,
        custom_data: eventName === "Purchase" || eventName === "Refund"
          ? { currency, value }
          : {},
      },
    ],
  };

  console.log(`📘 [META CAPI] Evento '${eventName}' pixelId=${pixelId} eventId=${eventId}`);

  await fetch(
    `https://graph.facebook.com/v18.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  ).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error(`❌ [META CAPI] Erro ${r.status}: ${text.substring(0, 300)}`);
    } else {
      console.log(`✅ [META CAPI] Evento '${eventName}' enviado`);
    }
  }).catch((err) => {
    console.error("❌ [META CAPI] Erro de rede:", err);
  });
}

// ─── ORCHESTRATORS ────────────────────────────────────────────────────────────

export async function processPurchaseTracking(
  settings: SettingsLike | null | undefined,
  sale: SaleLike,
  options?: MetaCapiOptions,
) {
  await Promise.all([
    isEnabled(settings, "meta", "purchase_refund")
      ? sendMetaCapiEvent(settings, "Purchase", sale, options)
      : Promise.resolve(),
  ]);
}

export async function processRefundTracking(
  settings: SettingsLike | null | undefined,
  sale: SaleLike,
  options?: MetaCapiOptions,
) {
  await Promise.all([
    isEnabled(settings, "meta", "purchase_refund")
      ? sendMetaCapiEvent(settings, "Refund", sale, options)
      : Promise.resolve(),
  ]);
}

export async function processTopFunnelTracking(
  settings: SettingsLike | null | undefined,
  event: "PageView" | "ViewContent",
  like: SaleLike,
  options?: MetaCapiOptions,
) {
  await Promise.all([
    isEnabled(settings, "meta", "top")
      ? sendMetaCapiEvent(settings, event, like, options)
      : Promise.resolve(),
  ]);
}

export async function processCheckoutEventTracking(
  settings: SettingsLike | null | undefined,
  like: SaleLike,
) {
  // No outbound event for checkout-intent in current integrations
}

export async function processPaymentPendingTracking(
  settings: SettingsLike | null | undefined,
  like: SaleLike,
) {
  // Handled via sendUtmifyOrder waiting_payment in routes
}
