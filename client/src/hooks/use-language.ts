import { useQuery } from "@tanstack/react-query";
import type { CheckoutLanguage } from "@shared/schema";

type GeoResult = { country_code?: string };

async function fetchGeoByIp(): Promise<GeoResult | null> {
  const res = await fetch("https://ipapi.co/json/");
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  return { country_code: data?.country_code };
}

const PT_COUNTRIES = new Set([
  "BR",
  "PT",
  "AO",
  "MZ",
  "CV",
  "GW",
  "ST",
  "TL",
  "GQ",
]);

const ES_COUNTRIES = new Set([
  "ES",
  "MX",
  "AR",
  "CO",
  "CL",
  "PE",
  "VE",
  "EC",
  "GT",
  "CU",
  "BO",
  "DO",
  "HN",
  "PY",
  "SV",
  "NI",
  "CR",
  "PA",
  "UY",
  "PR",
]);

function languageFromCountry(countryCode?: string | null): CheckoutLanguage | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  if (PT_COUNTRIES.has(cc)) return "pt";
  if (ES_COUNTRIES.has(cc)) return "es";
  return "en";
}

function languageFromLocale(locale?: string | null): CheckoutLanguage | null {
  if (!locale) return null;
  const lang = locale.toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("en")) return "en";
  return null;
}

export function useAutoLanguage() {
  return useQuery({
    queryKey: ["auto-language"],
    queryFn: async () => {
      const geo = await fetchGeoByIp().catch(() => null);
      const byIp = languageFromCountry(geo?.country_code);
      const byLocale = languageFromLocale(typeof navigator !== "undefined" ? navigator.language : undefined);
      return (byIp ?? byLocale ?? "en") as CheckoutLanguage;
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}
