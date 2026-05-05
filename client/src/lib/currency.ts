// Centralized currency + locale helpers for checkout pricing

export type SupportedCurrencyCode =
  | "AUD"
  | "BRL"
  | "CAD"
  | "CNY"
  | "CZK"
  | "DKK"
  | "EUR"
  | "HKD"
  | "HUF"
  | "ILS"
  | "JPY"
  | "MYR"
  | "MXN"
  | "MZN"
  | "TWD"
  | "NZD"
  | "NOK"
  | "PHP"
  | "PLN"
  | "GBP"
  | "SGD"
  | "SEK"
  | "CHF"
  | "THB"
  | "USD";

export const SUPPORTED_CURRENCIES: SupportedCurrencyCode[] = [
  "AUD",
  "BRL",
  "CAD",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "HKD",
  "HUF",
  "ILS",
  "JPY",
  "MYR",
  "MXN",
  "MZN",
  "TWD",
  "NZD",
  "NOK",
  "PHP",
  "PLN",
  "GBP",
  "SGD",
  "SEK",
  "CHF",
  "THB",
  "USD",
];

const EU_COUNTRIES = new Set([
  "AT",
  "BE",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
  "HR",
]);

// Country → currency mapping for supported list.
export function currencyFromCountry(countryCode?: string | null): SupportedCurrencyCode | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  if (EU_COUNTRIES.has(cc)) return "EUR";

  // Comprehensive mapping of countries to supported currencies
  // Only includes countries whose currencies are in our supported list
  const map: Record<string, SupportedCurrencyCode> = {
    // Americas
    US: "USD", // United States
    CA: "CAD", // Canada
    MX: "MXN", // Mexico
    BR: "BRL", // Brazil

    // Europe (Euro zone)
    // EU_COUNTRIES already handles: AT, BE, CY, EE, FI, FR, DE, GR, IE, IT, LV, LT, LU, MT, NL, PT, SK, SI, ES, HR

    // Europe (Non-Euro)
    GB: "GBP", // United Kingdom
    CH: "CHF", // Switzerland
    NO: "NOK", // Norway
    SE: "SEK", // Sweden
    DK: "DKK", // Denmark
    PL: "PLN", // Poland
    CZ: "CZK", // Czech Republic
    HU: "HUF", // Hungary

    // Asia-Pacific
    AU: "AUD", // Australia
    NZ: "NZD", // New Zealand
    JP: "JPY", // Japan
    CN: "CNY", // China
    HK: "HKD", // Hong Kong
    SG: "SGD", // Singapore
    TW: "TWD", // Taiwan
    MY: "MYR", // Malaysia
    TH: "THB", // Thailand
    PH: "PHP", // Philippines

    // Middle East
    IL: "ILS", // Israel

    // Africa
    MZ: "MZN", // Mozambique
  };

  return map[cc] ?? null;
}

export function currencyFromLocale(locale?: string | null): SupportedCurrencyCode | null {
  if (!locale) return null;
  const normalized = locale.replace("_", "-");
  const parts = normalized.split("-");
  const region = parts.length >= 2 ? parts[1] : "";
  const byRegion = currencyFromCountry(region);
  if (byRegion) return byRegion;

  // No longer forcing BRL for all PT speakers, or EUR for all ES speakers.
  // We prioritize country-based detection or fallback to USD for better accuracy.
  return null;
}

export type Money = {
  currency: SupportedCurrencyCode;
  // Amount in the *minor unit* of the currency (e.g. cents for USD, yen for JPY)
  minor: number;
};

export function getCurrencyFractionDigits(currency: SupportedCurrencyCode): number {
  // Intl knows 0-decimal currencies like JPY.
  const digits = new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  return typeof digits === "number" ? digits : 2;
}

// Convert a USD amount in cents to target currency minor units using a rate (1 USD -> rate target units).
export function convertUsdCentsToCurrencyMinor(
  usdCents: number,
  currency: SupportedCurrencyCode,
  rateUsdToTarget: number
): number {
  const digits = getCurrencyFractionDigits(currency);
  const usd = usdCents / 100;
  const targetMajor = usd * rateUsdToTarget;
  const factor = Math.pow(10, digits);
  return Math.round(targetMajor * factor);
}

export function formatMoney({ currency, minor }: Money, locale?: string) {
  const digits = getCurrencyFractionDigits(currency);
  const major = minor / Math.pow(10, digits);

  // For MZN show amount first, currency code after: "100.00 MZ"
  if (currency === "MZN") {
    const number = new Intl.NumberFormat(locale ?? "pt-MZ", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
    return `${number} MZ`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
}
