import { useQuery } from "@tanstack/react-query";
import {
  currencyFromCountry,
  currencyFromLocale,
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
} from "@/lib/currency";

type GeoResult = {
  country_code?: string;
};

async function fetchGeoByIp(): Promise<GeoResult | null> {
  // ipapi.co supports CORS and returns country code.
  const res = await fetch("https://ipapi.co/json/");
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  return { country_code: data?.country_code };
}

type RatesResponse = {
  result?: string;
  rates?: Record<string, number>;
};

async function fetchUsdRates(): Promise<Record<string, number>> {
  // Free endpoint with broad currency coverage.
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error("Falha ao buscar câmbio");
  const data = (await res.json()) as RatesResponse;
  const rates = data?.rates ?? {};

  // Ensure we only expose supported currencies.
  const filtered: Record<string, number> = {};
  for (const code of SUPPORTED_CURRENCIES) {
    const rate = rates[code];
    if (typeof rate === "number") filtered[code] = rate;
  }
  filtered["USD"] = 1;
  return filtered;
}

export function useAutoCurrency() {
  return useQuery({
    queryKey: ["auto-currency"],
    queryFn: async () => {
      const geo = await fetchGeoByIp().catch(() => null);
      const fromIp = currencyFromCountry(geo?.country_code);
      // Prioritize country-based detection, fallback to USD if country currency not supported
      return (fromIp ?? "USD") as SupportedCurrencyCode;
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useUsdRates() {
  return useQuery({
    queryKey: ["usd-rates"],
    queryFn: fetchUsdRates,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
