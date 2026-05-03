import axios from "axios";

const BASE_URL = "https://e2payments.explicador.co.mz";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3_000;

interface TokenCache {
  token: string;
  expires: number;
}

const tokenCache = new Map<string, TokenCache>();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBearerToken(clientId: string, clientSecret: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = tokenCache.get(clientId);
    if (cached && Date.now() < cached.expires) return cached.token;
  } else {
    tokenCache.delete(clientId);
  }

  const res = await axios.post(
    `${BASE_URL}/oauth/token`,
    { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  const token = `${res.data.token_type} ${res.data.access_token}`;
  // Cache for slightly less than actual expiry to avoid boundary issues
  const expiresIn = (res.data.expires_in || 86400) * 1000;
  tokenCache.set(clientId, { token, expires: Date.now() + expiresIn - 60_000 });
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

  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    // On 401 or first attempt, fetch/refresh token
    const forceRefresh = attempt > 1 && lastErr?.response?.status === 401;
    const token = await getBearerToken(params.clientId, params.clientSecret, forceRefresh);

    try {
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
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "unknown";
      console.warn(`[E2PAY] attempt ${attempt}/${MAX_RETRIES + 1} failed (HTTP ${status || "timeout"}): ${msg}`);

      if (attempt <= MAX_RETRIES) {
        // Retry on: 401 (token refresh), 5xx, timeout
        const shouldRetry = !status || status >= 500 || status === 401;
        if (shouldRetry) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }
      break;
    }
  }
  throw lastErr;
}

export function makeReference(saleId: number): string {
  return `MTF${String(saleId).padStart(6, "0")}`;
}

/** Strip Mozambique country code 258 and return local 9-digit number */
export function normalizeMzPhone(phone: string): string {
  const stripped = String(phone).replace(/\D/g, "");
  return stripped.startsWith("258") ? stripped.slice(3) : stripped;
}
