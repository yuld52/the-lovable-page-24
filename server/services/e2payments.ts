import axios from "axios";

const BASE_URL = "https://e2payments.explicador.co.mz";
const REQUEST_TIMEOUT_MS = 30_000;

interface TokenCache {
  token: string;
  expires: number;
}

const tokenCache = new Map<string, TokenCache>();

async function getBearerToken(clientId: string, clientSecret: string): Promise<string> {
  const cached = tokenCache.get(clientId);
  if (cached && Date.now() < cached.expires) return cached.token;

  const res = await axios.post(
    `${BASE_URL}/oauth/token`,
    { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  const token = `${res.data.token_type} ${res.data.access_token}`;
  tokenCache.set(clientId, { token, expires: Date.now() + 86 * 24 * 60 * 60 * 1000 });
  return token;
}

export interface E2PaymentParams {
  clientId: string;
  clientSecret: string;
  walletId: string | number;
  phone: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
}

export async function initiateE2Payment(
  method: "mpesa" | "emola",
  params: E2PaymentParams
): Promise<any> {
  const token = await getBearerToken(params.clientId, params.clientSecret);
  const endpoint =
    method === "mpesa"
      ? `${BASE_URL}/v1/c2b/mpesa-payment/${params.walletId}`
      : `${BASE_URL}/v1/c2b/emola-payment/${params.walletId}`;

  const payload: Record<string, any> = {
    client_id: params.clientId,
    phone: params.phone,
    amount: params.amount,
    reference: params.reference,
  };
  if (params.callbackUrl) payload.callback_url = params.callbackUrl;

  const res = await axios.post(endpoint, payload, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  return res.data;
}

export function makeReference(saleId: number): string {
  return `MTF${String(saleId).padStart(6, "0")}`;
}

/** Strip Mozambique country code 258 and return local 9-digit number */
export function normalizeMzPhone(phone: string): string {
  const stripped = String(phone).replace(/\D/g, "");
  return stripped.startsWith("258") ? stripped.slice(3) : stripped;
}
