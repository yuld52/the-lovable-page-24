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
  "MZ", // Mozambique
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
      return (byIp ?? byLocale ?? "pt") as CheckoutLanguage;
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}
</dyad-chat-summary>

Now let me also update the CheckoutEditor to include MZN in the currency selector and set it as default:

<dyad-write path="client/src/pages/CheckoutEditor.tsx" description="Adding MZN to currency selector and setting as default in checkout editor">
// ... keep existing code (imports and defaultConfig)
const defaultConfig: CheckoutConfig = {
  timerMinutes: 10,
  timerText: "Oferta Especial por Tempo Limitado!",
  timerColor: "#dc2626",
  heroTitle: "Promoção por tempo limitado",
  heroBadgeText: "7 DIAS",
  heroImageUrl: "",
  benefitsList: [
    { icon: "zap", title: "ACESSO IMEDIATO", subtitle: "Seu produto disponível em instantes" },
    { icon: "shield", title: "PAGAMENTO SEGURO", subtitle: "Dados protegidos e criptografados" }
  ],
  privacyText: "Your information is 100% secure",
  safeText: "Safe purchase",
  deliveryText: "Delivery via E-mail",
  approvedText: "Approved content",
  testimonials: [],
  upsellProducts: [],
  orderBumpProducts: [],
  payButtonText: "Buy now",
  footerText: "Meteorfy © 2026. Todos os direitos reservados.",
  primaryColor: "#22a559",
  backgroundColor: "#f9fafb",
  highlightColor: "#f3f4f6",
  textColor: "#111827",
  showChangeCountry: false,
  showTimer: false,
  showPhone: false,
  showCpf: false,
  showSurname: false,
  showCnpj: false,
  showAddress: false,
  checkoutLanguage: "pt",
  checkoutCurrency: "MZN",
};

// ... keep existing code (getSoftBackgroundColor helper and CheckoutEditor component)
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 font-bold uppercase">Opções de Exibição</Label>
              <div className="flex flex-col gap-2">
                <div className="space-y-2 mb-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Label className="text-xs text-zinc-400">Idioma Padrão</Label>
                  <Select
                    value={config.checkoutLanguage || "AUTO"}
                    onValueChange={(value: any) => setConfig({ ...config, checkoutLanguage: value })}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm" data-testid="select-checkout-language">
                      <SelectValue placeholder="Selecione um idioma" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="AUTO">Automático (Detecção)</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="pt-3">
                    <Label className="text-xs text-zinc-400">Moeda Padrão</Label>
                    <Select
                      value={(config.checkoutCurrency as any) || "MZN"}
                      onValueChange={(value: any) => setConfig({ ...config, checkoutCurrency: value })}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm" data-testid="select-checkout-currency">
                        <SelectValue placeholder="MZN" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="MZN">MZN - Metical Moçambicano</SelectItem>
                        <SelectItem value="AUTO">Automático (Detecção)</SelectItem>
                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                        <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
                        <SelectItem value="CAD">CAD - Dólar Canadense</SelectItem>
                        <SelectItem value="AUD">AUD - Dólar Australiano</SelectItem>
                        <SelectItem value="JPY">JPY - Iene Japonês</SelectItem>
                        <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                        <SelectItem value="CNY">CNY - Yuan Chinês</SelectItem>
                        <SelectItem value="CZK">CZK - Coroa Checa</SelectItem>
                        <SelectItem value="DKK">DKK - Coroa Dinamarquesa</SelectItem>
                        <SelectItem value="HKD">HKD - Dólar de Hong Kong</SelectItem>
                        <SelectItem value="HUF">HUF - Florim Húngaro</SelectItem>
                        <SelectItem value="ILS">ILS - Novo Shekel Israelita</SelectItem>
                        <SelectItem value="MYR">MYR - Ringgit Malaio</SelectItem>
                        <SelectItem value="TWD">TWD - Dólar Taiwanês</SelectItem>
                        <SelectItem value="NZD">NZD - Dólar Neozelandês</SelectItem>
                        <SelectItem value="NOK">NOK - Coroa Norueguesa</SelectItem>
                        <SelectItem value="PHP">PHP - Peso Filipino</SelectItem>
                        <SelectItem value="PLN">PLN - Zloti Polaco</SelectItem>
                        <SelectItem value="SGD">SGD - Dólar Singapurense</SelectItem>
                        <SelectItem value="SEK">SEK - Coroa Sueca</SelectItem>
                        <SelectItem value="CHF">CHF - Franco Suíço</SelectItem>
                        <SelectItem value="THB">THB - Baht Tailandês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                // ... keep existing code (display options checkboxes and general tab content)