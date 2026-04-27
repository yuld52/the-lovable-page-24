import { z } from "zod";

type PayPalEnv = "sandbox" | "production";

const PAYPAL_BASE_BY_ENV: Record<PayPalEnv, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  production: "https://api-m.paypal.com",
};

function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}

export type PayPalCredentials = {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnv;
  webhookId?: string | null;
};

export type CreatePayPalOrderInput = {
  currency: string;
  amountMinor: number;
  description?: string;
};

const moneyExponentByCurrency: Record<string, number> = {
  JPY: 0,
};

export function minorToPayPalValue(minor: number, currency: string): string {
  const exp = moneyExponentByCurrency[currency.toUpperCase()] ?? 2;
  if (!Number.isFinite(minor) || minor < 0) throw new Error("Invalid amount");
  const denom = 10 ** exp;
  const value = (minor / denom).toFixed(exp);
  return value;
}

async function getAccessToken(creds: PayPalCredentials): Promise<string> {
  const base = PAYPAL_BASE_BY_ENV[creds.environment];
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof json?.error_description === "string" ? json.error_description : "Falha ao autenticar no PayPal";
    throw new Error(`PayPal auth failed (${res.status}): ${msg}`);
  }

  assertString(json?.access_token, "PayPal access token ausente");
  return json.access_token;
}

export async function createOrder(creds: PayPalCredentials, input: CreatePayPalOrderInput) {
  const token = await getAccessToken(creds);
  const base = PAYPAL_BASE_BY_ENV[creds.environment];

  const currency = input.currency.toUpperCase();
  const value = minorToPayPalValue(input.amountMinor, currency);

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: input.description ?? "Pedido",
          amount: {
            currency_code: currency,
            value,
          },
        },
      ],
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof json?.message === "string" ? json.message : "Erro ao criar pedido PayPal";
    throw new Error(`PayPal create order failed (${res.status}): ${msg}`);
  }

  assertString(json?.id, "PayPal order id ausente");
  return json as { id: string };
}

export async function captureOrder(creds: PayPalCredentials, orderId: string) {
  const token = await getAccessToken(creds);
  const base = PAYPAL_BASE_BY_ENV[creds.environment];

  const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof json?.message === "string" ? json.message : "Erro ao capturar pedido PayPal";
    throw new Error(msg);
  }

  // Best-effort capture id extraction
  const captureId =
    json?.purchase_units?.[0]?.payments?.captures?.[0]?.id &&
    String(json.purchase_units[0].payments.captures[0].id);

  return {
    raw: json,
    status: String(json?.status ?? ""),
    captureId: captureId || null,
  };
}

export async function refundCapture(creds: PayPalCredentials, captureId: string, params?: { currency: string; amountMinor?: number }) {
  const token = await getAccessToken(creds);
  const base = PAYPAL_BASE_BY_ENV[creds.environment];

  const body: any = {};
  if (params?.amountMinor != null) {
    const currency = params.currency.toUpperCase();
    body.amount = {
      currency_code: currency,
      value: minorToPayPalValue(params.amountMinor, currency),
    };
  }

  const res = await fetch(`${base}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof json?.message === "string" ? json.message : "Erro ao reembolsar no PayPal";
    throw new Error(msg);
  }

  return json;
}

export async function verifyWebhookSignature(
  creds: PayPalCredentials,
  payload: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEventBody: string;
  },
) {
  if (!creds.webhookId) throw new Error("Webhook ID não configurado");
  const token = await getAccessToken(creds);
  const base = PAYPAL_BASE_BY_ENV[creds.environment];

  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: payload.authAlgo,
      cert_url: payload.certUrl,
      transmission_id: payload.transmissionId,
      transmission_sig: payload.transmissionSig,
      transmission_time: payload.transmissionTime,
      webhook_id: creds.webhookId,
      webhook_event: JSON.parse(payload.webhookEventBody),
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof json?.message === "string" ? json.message : "Falha ao verificar assinatura do webhook";
    throw new Error(msg);
  }

  const status = String(json?.verification_status ?? "");
  return { verificationStatus: status, raw: json };
}

export const createOrderBodySchema = z.object({
  checkoutId: z.number().int().positive(),
  productId: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  totalUsdCents: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  orderBumpProductIds: z.array(z.number().int().positive()).optional(),
  customerData: z.any().optional(),
});

export const refundBodySchema = z.object({
  saleId: z.number().int().positive(),
  amountMinor: z.number().int().positive().optional(),
});
