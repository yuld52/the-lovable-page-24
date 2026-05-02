import crypto from "crypto";

export type TrackingDestination = "meta" | "utmfy";

export type TrackingEventName =
  // Meta standard
  | "PageView"
  | "ViewContent"
  | "Purchase"
  | "Refund"
  // Internal canonical (we map to provider names)
  | "checkout" // UTMfy style
  | "payment_pending" // UTMfy custom
  | "purchase"
  | "refund";

type SettingsLike = {
  utmfyToken?: string | null;
  facebookPixelId?: string | null;
  facebookAccessToken?: string | null;
  // toggles
  metaEnabled?: boolean | null;
  utmfyEnabled?: boolean | null;
  trackTopFunnel?: boolean | null;
  trackCheckout?: boolean | null;
  trackPurchaseRefund?: boolean | null;
};

type SaleLike = {
  id: number;
  amount: number; // cents (USD cents in DB, we convert to value)
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
    isTest: isTest === true ? true : false,
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

// Legacy event sender kept for top-of-funnel (page view / checkout intent)
export async function sendUtmfyEvent(
  settings: SettingsLike | null | undefined,
  event: "view" | "view_content" | "checkout" | "payment_pending" | "purchase" | "refund",
  saleOrLike: SaleLike,
) {
  // Top-of-funnel events are not supported by the Utmify orders API.
  // Only order status changes (waiting_payment / paid / refunded) are sent.
  console.log(`ℹ️ [UTMIFY] Evento top-of-funnel '${event}' ignorado (usar sendUtmifyOrder para pedidos)`);
}

export async function sendMetaCapiEvent(
  settings: SettingsLike | null | undefined,
  eventName: "PageView" | "ViewContent" | "Purchase" | "Refund",
  like: SaleLike,
) {
  const pixelId = settings?.facebookPixelId;
  const accessToken = settings?.facebookAccessToken;

  if (!pixelId) return;
  if (!accessToken) return;

  const email = like.customerEmail;
  const hashedEmail = email ? sha256LowerTrim(email) : undefined;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          ...(hashedEmail ? { em: [hashedEmail] } : {}),
        },
        custom_data: {
          currency: "BRL",
          value: like.amount / 100,
        },
      },
    ],
  };

  await fetch(
    `https://graph.facebook.com/v18.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  ).catch((err) => {
    console.error("Meta CAPI event error:", err);
  });
}

export async function processPurchaseTracking(settings: SettingsLike | null | undefined, sale: SaleLike) {
  await Promise.all([
    isEnabled(settings, "utmfy", "purchase_refund") ? sendUtmfyEvent(settings, "purchase", sale) : Promise.resolve(),
    isEnabled(settings, "meta", "purchase_refund") ? sendMetaCapiEvent(settings, "Purchase", sale) : Promise.resolve(),
  ]);
}

export async function processRefundTracking(settings: SettingsLike | null | undefined, sale: SaleLike) {
  await Promise.all([
    isEnabled(settings, "utmfy", "purchase_refund") ? sendUtmfyEvent(settings, "refund", sale) : Promise.resolve(),
    isEnabled(settings, "meta", "purchase_refund") ? sendMetaCapiEvent(settings, "Refund", sale) : Promise.resolve(),
  ]);
}

export async function processTopFunnelTracking(
  settings: SettingsLike | null | undefined,
  event: "PageView" | "ViewContent",
  like: SaleLike,
) {
  const utmfyEvent = event === "PageView" ? "view" : "view_content";

  await Promise.all([
    isEnabled(settings, "meta", "top") ? sendMetaCapiEvent(settings, event, like) : Promise.resolve(),
    isEnabled(settings, "utmfy", "top") ? sendUtmfyEvent(settings, utmfyEvent, like) : Promise.resolve(),
  ]);
}

export async function processCheckoutEventTracking(
  settings: SettingsLike | null | undefined,
  like: SaleLike,
) {
  await Promise.all([
    isEnabled(settings, "utmfy", "checkout") ? sendUtmfyEvent(settings, "checkout", like) : Promise.resolve(),
    // Meta: we intentionally don't send a standard event here in the MVP (keeps taxonomy clean)
  ]);
}

export async function processPaymentPendingTracking(
  settings: SettingsLike | null | undefined,
  like: SaleLike,
) {
  await Promise.all([
    isEnabled(settings, "utmfy", "checkout") ? sendUtmfyEvent(settings, "payment_pending", like) : Promise.resolve(),
  ]);
}