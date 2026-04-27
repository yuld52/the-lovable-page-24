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

export async function sendUtmfyEvent(
  settings: SettingsLike | null | undefined,
  event: "view" | "view_content" | "checkout" | "payment_pending" | "purchase" | "refund",
  saleOrLike: SaleLike,
) {
  const token = settings?.utmfyToken;
  if (!token) {
    console.log("⚠️ [UTMIFY] Token não configurado, evento não será enviado");
    return;
  }

  const payload = {
    event,
    value: saleOrLike.amount / 100,
    currency: "BRL",
    transaction_id: String(saleOrLike.id),
    customer: {
      email: saleOrLike.customerEmail ?? undefined,
    },
    utm: {
      source: saleOrLike.utmSource ?? undefined,
      medium: saleOrLike.utmMedium ?? undefined,
      campaign: saleOrLike.utmCampaign ?? undefined,
      content: saleOrLike.utmContent ?? undefined,
      term: saleOrLike.utmTerm ?? undefined,
    },
  };

  console.log("📤 [UTMIFY] Enviando para API:", { event, payload });

  try {
    const response = await fetch("https://api.utmify.com.br/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("📥 [UTMIFY] Resposta da API:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (!response.ok) {
      console.error("❌ [UTMIFY] Erro na resposta da API:", response.status, responseText);
    } else {
      console.log("✅ [UTMIFY] Evento enviado com sucesso!");
    }
  } catch (err) {
    console.error("❌ [UTMIFY] Erro ao enviar evento:", err);
  }
}

export async function sendMetaCapiEvent(
  settings: SettingsLike | null | undefined,
  eventName: "PageView" | "ViewContent" | "Purchase" | "Refund",
  saleOrLike: SaleLike,
) {
  const pixelId = settings?.facebookPixelId;
  const accessToken = settings?.facebookAccessToken;

  if (!pixelId) return;
  if (!accessToken) return;

  const email = saleOrLike.customerEmail;
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
          value: saleOrLike.amount / 100,
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
