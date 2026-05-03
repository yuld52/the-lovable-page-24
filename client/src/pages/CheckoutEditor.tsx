import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/use-products";
import { useCheckout, useCreateCheckout, useUpdateCheckout } from "@/hooks/use-checkouts";
import { useUpload } from "@/hooks/use-upload";
import { useSettings } from "@/hooks/use-settings";
import { PayPalVisual } from "@/components/payments/PayPalVisual";
import { ArrowLeft, Save, Monitor, Smartphone, Clock, Shield, Zap, Mail, Lock, CheckCircle2, Star, CreditCard, Building2, Copy, Plus, Trash2, Timer, ShieldCheck } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CheckoutConfig, CheckoutLanguage, type CheckoutCurrency } from "@shared/schema";
import { getTranslations } from "@shared/translations";
import { SiPaypal } from "react-icons/si";
import ColorPicker from "react-best-gradient-color-picker";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useAutoCurrency, useUsdRates } from "@/hooks/use-currency";
import { convertUsdCentsToCurrencyMinor, formatMoney, type SupportedCurrencyCode } from "@/lib/currency";

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
  checkoutCurrency: "AUTO",
};


import { timerIcon } from "@/lib/assets";

// Helper function to generate a soft, light pastel version of a color
function getSoftBackgroundColor(color: string): string {
  let r = 0, g = 0, b = 0;

  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      r = parseInt(match[1]);
      g = parseInt(match[2]);
      b = parseInt(match[3]);
    }
  } else if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else {
    const hex = color;
    if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  }

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  const newS = Math.min(s * 0.35, 0.25);
  const newL = 0.94;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let newR, newG, newB;
  if (newS === 0) {
    newR = newG = newB = newL;
  } else {
    const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
    const p = 2 * newL - q;
    newR = hue2rgb(p, q, h + 1 / 3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

export default function CheckoutEditor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/checkouts/edit/:id");
  const checkoutId = params?.id ? parseInt(params.id) : null;
  const { data: products } = useProducts();
  const { data: checkout, isLoading: loadingCheckout } = useCheckout(checkoutId!);
  const { data: settings } = useSettings();
  const createMutation = useCreateCheckout();
  const updateMutation = useUpdateCheckout();
  const { toast } = useToast();
  const {
    uploadFile: uploadHeroImage,
    isUploading: isUploadingHero,
    progress: heroUploadProgress,
  } = useUpload();

  const isNew = !checkoutId;
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [orderBumpSelected, setOrderBumpSelected] = useState<number[]>([]);

  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [config, setConfig] = useState<CheckoutConfig>(defaultConfig);
  const [timerSeconds, setTimerSeconds] = useState(547);

  const { data: autoCurrency } = useAutoCurrency();
  const { data: usdRates } = useUsdRates();

  const resolvedCurrency: SupportedCurrencyCode = useMemo(() => {
    const c = config.checkoutCurrency;
    if (!c || c === "AUTO") {
      return (autoCurrency || "USD") as SupportedCurrencyCode;
    }
    return c as SupportedCurrencyCode;
  }, [config.checkoutCurrency, autoCurrency]);

  const usdToCurrencyRate = usdRates?.[resolvedCurrency] ?? 1;

  useEffect(() => {
    console.log("Meteorfy Editor Version: 21:05 (Sharp Corners & Local Upload)");
  }, []);

  const moneyFromUsdCents = useMemo(() => {
    return (usdCents: number) =>
      formatMoney(
        {
          currency: resolvedCurrency,
          minor: convertUsdCentsToCurrencyMinor(usdCents, resolvedCurrency, usdToCurrencyRate),
        },
        typeof navigator !== "undefined" ? navigator.language : undefined
      );
  }, [resolvedCurrency, usdToCurrencyRate]);

  useEffect(() => {
    setTimerSeconds(config.timerMinutes * 60);
  }, [config.timerMinutes]);

  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  useEffect(() => {
    if (checkout) {
      setName(checkout.name);
      setProductId(checkout.productId.toString());
      if (checkout.config) {
        setConfig({ ...defaultConfig, ...checkout.config });
      }
    }
  }, [checkout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    console.log("[CheckoutEditor] handleSave - productId:", productId, "products:", products?.map(p => ({id: p.id, name: p.name})));
    if (!name) {
      toast({ title: "Erro", description: "O nome do checkout é obrigatório", variant: "destructive" });
      return;
    }
    if (!productId) {
      toast({ title: "Erro", description: "Selecione um produto principal", variant: "destructive" });
      return;
    }

    try {
      if (isNew) {
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        console.log("[CheckoutEditor] Creating checkout with productId:", parseInt(productId));
        await createMutation.mutateAsync({
          name,
          productId: parseInt(productId),
          slug: slug + '-' + Math.random().toString(36).substring(2, 7),
          active: true,
          config,
        });
        toast({ title: "Sucesso", description: "Checkout criado com sucesso!" });
      } else {
        await updateMutation.mutateAsync({
          id: checkoutId!,
          data: {
            name,
            productId: parseInt(productId),
            config,
          }
        });
        toast({ title: "Sucesso", description: "Checkout atualizado com sucesso!" });
      }
      setLocation("/checkouts");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const selectedProduct = products?.find(p => p.id.toString() === productId);
  const orderBumpProducts = products?.filter(p => config.orderBumpProducts.includes(p.id)) || [];
  const activeLanguage: CheckoutLanguage = config.checkoutLanguage === "AUTO" ? "pt" : (config.checkoutLanguage as CheckoutLanguage || "pt");
  const t = useMemo(() => getTranslations(activeLanguage), [activeLanguage]);
  const locale = useMemo(() => {
    return activeLanguage === "pt" ? "pt_BR" : activeLanguage === "es" ? "es_ES" : "en_US";
  }, [activeLanguage]);

  const toggleUpsell = (id: number) => {
    const current = config.upsellProducts || [];
    if (current.includes(id)) {
      setConfig({ ...config, upsellProducts: current.filter(x => x !== id) });
    } else {
      if (current.length >= 1) {
        toast({ title: "Limite atingido", description: "Você pode selecionar no máximo 1 produto de upsell", variant: "destructive" });
        return;
      }
      setConfig({ ...config, upsellProducts: [...current, id] });
    }
  };

  const toggleOrderBump = (id: number) => {
    const current = config.orderBumpProducts || [];
    if (current.includes(id)) {
      setConfig({ ...config, orderBumpProducts: current.filter(x => x !== id) });
    } else {
      if (current.length >= 10) {
        toast({ title: "Limite atingido", description: "Você pode selecionar no máximo 10 order bumps", variant: "destructive" });
        return;
      }
      setConfig({ ...config, orderBumpProducts: [...current, id] });
    }
  };

  if (checkoutId && loadingCheckout) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      <div className="w-[420px] flex flex-col border-r border-zinc-800 bg-[#0c0c0e]">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/checkouts")} className="h-8 w-8" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold text-white uppercase tracking-tight">{t.backToHome.includes('Voltar') ? 'Editor de Checkout' : t.backToHome.includes('Back') ? 'Checkout Editor' : 'Editor de Checkout'}</h1>
          </div>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 h-8 px-4 text-xs font-bold gap-2 border-0 shadow-none" data-testid="button-save">
            <Save className="h-3 w-3" /> SALVAR
          </Button>
        </div>

        <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-zinc-900/50 border border-zinc-800 p-1">
              <TabsTrigger value="geral" className="flex-1 text-xs data-[state=active]:bg-zinc-800">Geral</TabsTrigger>
              <TabsTrigger value="testimonial" className="flex-1 text-xs data-[state=active]:bg-zinc-800">Depoimento</TabsTrigger>
              <TabsTrigger value="visual" className="flex-1 text-xs data-[state=active]:bg-zinc-800">Visual</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="geral" className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Nome do Checkout *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 h-9 text-sm"
                data-testid="input-checkout-name"
              />
            </div>

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
                      value={(config.checkoutCurrency as any) || "USD"}
                      onValueChange={(value: any) => setConfig({ ...config, checkoutCurrency: value })}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-sm" data-testid="select-checkout-currency">
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="AUTO">Automático (Detecção)</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="BRL">BRL</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="DKK">DKK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="HKD">HKD</SelectItem>
                        <SelectItem value="HUF">HUF</SelectItem>
                        <SelectItem value="ILS">ILS</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="MYR">MYR</SelectItem>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="MZN">MZN - Metical</SelectItem>
                        <SelectItem value="TWD">TWD</SelectItem>
                        <SelectItem value="NZD">NZD</SelectItem>
                        <SelectItem value="NOK">NOK</SelectItem>
                        <SelectItem value="PHP">PHP</SelectItem>
                        <SelectItem value="PLN">PLN</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="SGD">SGD</SelectItem>
                        <SelectItem value="SEK">SEK</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                        <SelectItem value="THB">THB</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Checkbox
                    id="showChangeCountry"
                    checked={config.showChangeCountry}
                    onCheckedChange={(checked) => setConfig({ ...config, showChangeCountry: !!checked })}
                    data-testid="checkbox-show-change-country"
                  />
                  <Label htmlFor="showChangeCountry" className="text-sm text-white cursor-pointer">Mostrar Seletor de Idioma</Label>
                </div>
                <div className="flex flex-col gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showTimer"
                      checked={config.showTimer}
                      onCheckedChange={(checked) => setConfig({ ...config, showTimer: !!checked })}
                      data-testid="checkbox-show-timer"
                    />
                    <Label htmlFor="showTimer" className="text-sm text-white cursor-pointer">Mostrar Timer de Oferta</Label>
                  </div>
                  {config.showTimer && (
                    <div className="mt-2 space-y-3 pl-6">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Tempo em Minutos</Label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={config.timerMinutes}
                          onChange={(e) => setConfig({ ...config, timerMinutes: parseInt(e.target.value) || 1 })}
                          className="bg-zinc-950 border-zinc-800 h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Texto do Timer</Label>
                        <Input
                          value={config.timerText}
                          onChange={(e) => setConfig({ ...config, timerText: e.target.value })}
                          className="bg-zinc-950 border-zinc-800 h-8 text-xs"
                          placeholder="Ex: Oferta Especial por Tempo Limitado!"
                          data-testid="input-timer-text"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Checkbox
                    id="showPhone"
                    checked={config.showPhone}
                    onCheckedChange={(checked) => setConfig({ ...config, showPhone: !!checked })}
                    data-testid="checkbox-show-phone"
                  />
                  <Label htmlFor="showPhone" className="text-sm text-white cursor-pointer">Mostrar Campo de Celular</Label>
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Checkbox
                    id="showSurname"
                    checked={config.showSurname}
                    onCheckedChange={(checked) => setConfig({ ...config, showSurname: !!checked })}
                    data-testid="checkbox-show-surname"
                  />
                  <Label htmlFor="showSurname" className="text-sm text-white cursor-pointer">Mostrar Campo de Sobrenome</Label>
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Checkbox
                    id="showCpf"
                    checked={config.showCpf}
                    onCheckedChange={(checked) => setConfig({ ...config, showCpf: !!checked })}
                    data-testid="checkbox-show-cpf"
                  />
                  <Label htmlFor="showCpf" className="text-sm text-white cursor-pointer">Mostrar Campo de CPF</Label>
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Checkbox
                    id="showCnpj"
                    checked={config.showCnpj}
                    onCheckedChange={(checked) => setConfig({ ...config, showCnpj: !!checked })}
                    data-testid="checkbox-show-cnpj"
                  />
                  <Label htmlFor="showCnpj" className="text-sm text-white cursor-pointer">Mostrar Campo de CNPJ</Label>
                </div>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Checkbox
                    id="showAddress"
                    checked={config.showAddress}
                    onCheckedChange={(checked) => setConfig({ ...config, showAddress: !!checked })}
                    data-testid="checkbox-show-address"
                  />
                  <Label htmlFor="showAddress" className="text-sm text-white cursor-pointer">Mostrar Campo de Endereço</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Produto Principal *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="bg-zinc-900/50 border-zinc-800 h-9 text-sm" data-testid="select-product">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {products?.filter(p => p.status === 'approved').map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 font-bold uppercase">Upload de Banner (Hero)</Label>
              <div className="p-4 border-2 border-dashed border-zinc-700 rounded-none bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const inputEl = e.currentTarget;
                    const file = inputEl.files?.[0];
                    if (!file) return;

                    if (file.size > 10 * 1024 * 1024) {
                      toast({ title: "Erro", description: "O arquivo excede o limite de 10MB.", variant: "destructive" });
                      if (inputEl) inputEl.value = "";
                      return;
                    }

                    const localUrl = URL.createObjectURL(file);
                    setConfig({ ...config, heroImageUrl: localUrl });

                    try {
                      const result = await uploadHeroImage(file);
                      if (!result?.uploadURL) {
                        throw new Error("Falha no upload");
                      }

                      setConfig({ ...config, heroImageUrl: result.uploadURL });
                      toast({ title: "Sucesso", description: "Banner enviado com sucesso!" });
                    } catch (err: any) {
                      setConfig({ ...config, heroImageUrl: "" });
                      toast({
                        title: "Erro",
                        description: err?.message || "Falha no upload do banner",
                        variant: "destructive",
                      });
                    } finally {
                      if (inputEl) inputEl.value = "";
                    }
                  }}
                  className="bg-transparent border-0 h-9 text-sm p-0 file:bg-zinc-800 file:text-white file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 cursor-pointer"
                  data-testid="input-hero-image-upload"
                />
              </div>
              {isUploadingHero && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Enviando...</span>
                    <span>{heroUploadProgress}%</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${heroUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {config.heroImageUrl && (
                <div className="mt-2 relative group">
                  <div className="overflow-hidden rounded-none">
                    <img
                      src={config.heroImageUrl}
                      alt="Banner Preview"
                      className="w-full h-20 object-cover rounded-none"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setConfig({ ...config, heroImageUrl: "" })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 font-bold uppercase opacity-50">Selecione Upsell (manutenção)</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 font-bold uppercase">Selecione Order Bump</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
                {products?.filter(p => p.status === 'approved' && p.id.toString() !== productId).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <Checkbox checked={config.orderBumpProducts.includes(p.id)} onCheckedChange={() => toggleOrderBump(p.id)} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      <div className="text-xs text-zinc-500">{moneyFromUsdCents(p.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="testimonial" className="flex-1 overflow-y-auto p-4">
            <Button onClick={() => setConfig({ ...config, testimonials: [...(config.testimonials || []), { id: Date.now().toString(), name: "Novo Depoimento", rating: 5, text: "Digite o depoimento aqui...", imageUrl: "" }] })} className="w-full bg-zinc-800 hover:bg-zinc-700 text-xs h-9 mb-4 font-bold">
              <Plus className="h-3 w-3 mr-2" /> ADICIONAR DEPOIMENTO
            </Button>
            <div className="space-y-4 pb-20">
              {(config.testimonials || []).map((tItem, index) => (
                <div key={tItem.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-zinc-500 uppercase font-bold">Depoimento #{index + 1}</Label>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => setConfig({ ...config, testimonials: config.testimonials.filter(x => x.id !== tItem.id) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] text-zinc-500 uppercase font-bold">Foto do Cliente</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                        {tItem.imageUrl ? (
                          <img src={tItem.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const formData = new FormData();
                              formData.append("file", file);

                              try {
                                const user = auth.currentUser;
                                if (!user) throw new Error("Usuário não autenticado");
                                const idToken = await getIdToken(user);

                                const response = await fetch("/api/upload", {
                                  method: "POST",
                                  headers: { "Authorization": `Bearer ${idToken}` },
                                  body: formData,
                                });

                                if (response.ok) {
                                  const data = await response.json();
                                  const newList = [...config.testimonials];
                                  newList[index].imageUrl = data.url;
                                  setConfig({ ...config, testimonials: newList });
                                  toast({ title: "Sucesso", description: "Foto enviada!" });
                                } else {
                                  toast({ title: "Erro", description: "Falha no upload", variant: "destructive" });
                                }
                              } catch (err) {
                                toast({ title: "Erro", description: "Erro de conexão", variant: "destructive" });
                              }
                            }
                          }}
                          className="bg-zinc-950 border-zinc-800 h-8 text-[10px] p-0 file:bg-zinc-800 file:text-white file:border-0 file:rounded file:px-2 file:py-0 file:h-full file:mr-2 cursor-pointer"
                        />
                      </div>
                      {tItem.imageUrl && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={() => {
                          const newList = [...config.testimonials];
                          newList[index].imageUrl = "";
                          setConfig({ ...config, testimonials: newList });
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500 uppercase font-bold">Nome</Label>
                      <Input value={tItem.name} onChange={(e) => {
                        const newList = [...config.testimonials];
                        newList[index].name = e.target.value;
                        setConfig({ ...config, testimonials: newList });
                      }} className="bg-zinc-950 border-zinc-800 h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-500 uppercase font-bold">Estrelas</Label>
                      <Input type="number" min="1" max="5" value={tItem.rating} onChange={(e) => {
                        const newList = [...config.testimonials];
                        newList[index].rating = parseInt(e.target.value) || 5;
                        setConfig({ ...config, testimonials: newList });
                      }} className="bg-zinc-950 border-zinc-800 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-zinc-500 uppercase font-bold">Texto</Label>
                    <Textarea value={tItem.text} onChange={(e) => {
                      const newList = [...config.testimonials];
                      newList[index].text = e.target.value;
                      setConfig({ ...config, testimonials: newList });
                    }} className="bg-zinc-950 border-zinc-800 h-20 text-xs resize-none" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="visual" className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4">
                <Label className="text-xs text-zinc-400 font-bold uppercase">Cor Primária (Botões e Destaques)</Label>
                <div className="flex justify-center py-2">
                  <ColorPicker value={config.primaryColor} onChange={(c) => setConfig({ ...config, primaryColor: c })} />
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4">
                <Label className="text-xs text-zinc-400 font-bold uppercase">Cor do Timer</Label>
                <div className="flex justify-center py-2">
                  <ColorPicker value={config.timerColor || "#000000"} onChange={(c) => setConfig({ ...config, timerColor: c })} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex-1 flex flex-col bg-zinc-900/20 relative">
        <div className="h-14 border-b border-zinc-800/50 flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${device === 'desktop' ? 'bg-zinc-800 text-purple-500' : 'text-zinc-500'}`} onClick={() => setDevice('desktop')}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${device === 'mobile' ? 'bg-zinc-800 text-purple-500' : 'text-zinc-500'}`} onClick={() => setDevice('mobile')}>
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className={`flex-1 overflow-y-auto ${device === 'mobile' ? 'flex justify-center p-8 bg-zinc-800' : ''}`}>

          <div className={`h-fit ${device === 'desktop' ? 'w-full' : 'w-[375px] shadow-2xl rounded-xl overflow-hidden'}`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
            {config.showTimer && (
              <div className="py-2 px-4" style={{ backgroundColor: config.backgroundColor }}>
                <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
                  <div className="w-full max-w-3xl py-4 px-6 text-center text-white flex items-center justify-center gap-6 rounded-none shadow-sm" style={{ backgroundColor: config.timerColor }}>
                    <span className="font-sans tabular-nums text-[48px] font-medium tracking-tighter" style={{ fontFeatureSettings: '"zero" 0' }}>
                      {formatTime(timerSeconds)}
                    </span>
                    <Timer className={device === "mobile" ? "w-12 h-12 animate-pulse" : "w-10 h-10 animate-pulse"} />
                    <span
                      className={`tracking-tight font-medium leading-tight ${device === "mobile" ? "text-[14px]" : "text-[19px]"}`}
                    >
                      {config.timerText}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {config.heroImageUrl && (
              <div className="py-2 px-4" style={{ backgroundColor: config.backgroundColor }}>
                <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
                  <div
                    className="w-full max-w-3xl overflow-hidden rounded-lg shadow-sm"
                  >
                    <img src={config.heroImageUrl} alt="" className="w-full h-auto object-contain block rounded-lg" />
                  </div>
                </div>
              </div>
            )}

            <div className={`max-w-5xl mx-auto px-4 py-6 ${device === 'mobile' ? 'space-y-4' : (config.testimonials && config.testimonials.length > 0 ? 'grid grid-cols-3 gap-6' : 'flex justify-center')}`}>
              <div className={device === 'mobile' ? 'space-y-4' : (config.testimonials && config.testimonials.length > 0 ? 'col-span-2 space-y-4' : 'max-w-2xl w-full space-y-4')}>
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
                  {config.showChangeCountry && (
                    <div className="p-4 flex justify-end">
                      <Select
                        value={config.checkoutLanguage === "AUTO" ? "pt" : (config.checkoutLanguage || "pt")}
                        onValueChange={(value: any) => setConfig({ ...config, checkoutLanguage: value })}
                      >
                        <SelectTrigger className="w-fit bg-transparent border-0 h-8 text-xs gap-2 focus:ring-0 shadow-none hover:bg-black/5 rounded-full px-3 transition-colors" style={{ color: config.textColor }}>
                          <div className="flex items-center gap-2">
                            {(config.checkoutLanguage === 'en' || (config.checkoutLanguage === 'AUTO' && t.buyNow === "Buy Now")) ? (
                              <img src="https://flagcdn.com/w20/us.png" width="16" alt="USA" className="rounded-sm" />
                            ) : (config.checkoutLanguage === 'es' || (config.checkoutLanguage === 'AUTO' && t.buyNow === "Comprar ahora")) ? (
                              <img src="https://flagcdn.com/w20/es.png" width="16" alt="Spain" className="rounded-sm" />
                            ) : (
                              <img src="https://flagcdn.com/w20/br.png" width="16" alt="Brazil" className="rounded-sm" />
                            )}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="AUTO" className="text-xs text-black">Automático (Detecção)</SelectItem>
                          <SelectItem value="pt" className="text-xs text-black">Português (BR)</SelectItem>
                          <SelectItem value="en" className="text-xs text-black">English (US)</SelectItem>
                          <SelectItem value="es" className="text-xs text-black">Español (ES)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {selectedProduct?.imageUrl ? (
                        <img src={selectedProduct.imageUrl} alt="" className="w-20 h-20 object-contain shadow-sm rounded-lg" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
                          {selectedProduct?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h2 className="font-bold text-[17px]" style={{ color: config.textColor }}>{selectedProduct?.name || 'Selecione um produto'}</h2>
                        <div className="text-lg font-bold" style={{ color: config.primaryColor }}>
                          {selectedProduct ? moneyFromUsdCents(selectedProduct.price) : moneyFromUsdCents(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.emailLabel}</label>
                      <input type="email" placeholder={t.emailPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.confirmEmailLabel}</label>
                      <input type="email" placeholder={t.confirmEmailPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{config.showSurname ? t.nameLabel : t.fullNameLabel}</label>
                      <input type="text" placeholder={config.showSurname ? t.namePlaceholder : t.fullNamePlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} required />
                    </div>
                    {config.showSurname && (
                      <div className="space-y-1">
                        <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.surnameLabel}</label>
                        <input type="text" placeholder={t.surnamePlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                      </div>
                    )}
                    {config.showCpf && (
                      <div className="space-y-1">
                        <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.cpfLabel}</label>
                        <input type="text" placeholder={t.cpfPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                      </div>
                    )}
                    {config.showCnpj && (
                      <div className="space-y-1">
                        <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.cnpjLabel}</label>
                        <input type="text" placeholder={t.cnpjPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                      </div>
                    )}
                    {config.showPhone && (
                      <div className="space-y-1">
                        <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.phoneLabel}</label>
                        <PhoneInput country={'br'} inputStyle={{ width: '100%', height: '44px', backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db', fontSize: '14px' }} containerStyle={{ width: '100%' }} />
                      </div>
                    )}
                    {config.showAddress && (
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.zipLabel}</label>
                          <input type="text" placeholder={t.zipPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-1">
                            <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.streetLabel}</label>
                            <input type="text" placeholder={t.streetPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.numberLabel}</label>
                            <input type="text" placeholder={t.numberPlaceholder} className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: config.backgroundColor, color: config.textColor, borderColor: '#d1d5db' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {orderBumpProducts.length > 0 && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" style={{ fill: config.primaryColor, color: config.primaryColor }} />
                        <span className="font-bold text-sm" style={{ color: config.textColor }}>
                          {orderBumpProducts.length > 1 ? t.exclusiveOfferPlural : t.exclusiveOffer}:
                        </span>
                      </div>
                      {orderBumpProducts.map(p => (
                        <div key={p.id} className="rounded-lg overflow-hidden border-2 border-dashed" style={{ borderColor: config.primaryColor, backgroundColor: 'transparent' }}>
                          <div className="flex items-start gap-3 p-3">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-20 h-20 object-cover rounded" />
                            ) : (
                              <div className="w-20 h-20 bg-gray-900 rounded flex items-center justify-center text-white font-bold text-lg">{p.name.charAt(0)}</div>
                            )}
                            <div className="flex-1">
                              <h4 className="text-[17px] font-medium" style={{ color: config.textColor }}>{p.name}</h4>
                              <p className="mt-0.5 whitespace-normal break-words text-[13px]" style={{ color: `${config.textColor}99` }}>
                                {p.description?.trim() ? p.description : ""}
                              </p>
                              <div className="mt-1 font-bold text-sm" style={{ color: config.primaryColor }}>
                                + {moneyFromUsdCents(p.price)}
                              </div>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 p-3 cursor-pointer rounded-b-lg" style={{ backgroundColor: getSoftBackgroundColor(config.primaryColor), borderTop: `1px solid ${config.primaryColor}30` }}>
                            <Checkbox
                              checked={orderBumpSelected.includes(p.id)}
                              onCheckedChange={(checked) => checked ? setOrderBumpSelected([...orderBumpSelected, p.id]) : setOrderBumpSelected(orderBumpSelected.filter(id => id !== p.id))}
                              className="data-[state=checked]:bg-[var(--primary-color)] data-[state=checked]:border-[var(--primary-color)] border-[var(--primary-color)]"
                              style={{ '--primary-color': config.primaryColor } as React.CSSProperties}
                            />
                            <span className="text-sm font-medium" style={{ color: "#000000" }}>{t.addToOrder}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-4 space-y-3">

                    {/* PayPal Visual Removed */}

                    <div className="pt-4">
                      <h3 className="text-sm mb-3 font-normal" style={{ color: config.textColor }}>{t.purchaseDetails}</h3>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span style={{ color: `${config.textColor}99` }}>{selectedProduct?.name || t.additionalProduct}</span>
                        <span className="font-medium" style={{ color: config.textColor }}>{selectedProduct ? moneyFromUsdCents(selectedProduct.price) : moneyFromUsdCents(0)}</span>
                      </div>

                      {orderBumpProducts
                        .filter(p => orderBumpSelected.includes(p.id))
                        .map((p) => (
                          <div key={p.id} className="flex justify-between items-center text-xs mb-2">
                            <span style={{ color: `${config.textColor}99` }}>{p.name}</span>
                            <span className="font-medium" style={{ color: config.textColor }}>{moneyFromUsdCents(p.price)}</span>
                          </div>
                        ))}

                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="font-bold text-xs" style={{ color: config.textColor }}>{t.total}</span>
                        <span className="font-bold text-lg" style={{ color: config.primaryColor }}>
                          {(() => {
                            const productPrice = selectedProduct?.price || 0;
                            const bumpPrice = orderBumpProducts
                              .filter(p => orderBumpSelected.includes(p.id))
                              .reduce((sum, p) => sum + p.price, 0);
                            return moneyFromUsdCents(productPrice + bumpPrice);
                          })()}
                        </span>
                      </div>
                      <Button className="w-full h-12 text-base font-bold mt-4" style={{ backgroundColor: config.primaryColor }}>
                        {(!config.payButtonText || config.payButtonText === "Buy now" || config.payButtonText === "Comprar Agora") ? t.buyNow : config.payButtonText}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {config.testimonials && config.testimonials.length > 0 && (
                <div className="space-y-3">
                  {config.testimonials.map((tItem) => (
                    <div key={tItem.id} className="rounded-xl border border-gray-200 p-6 shadow-sm" style={{ backgroundColor: config.backgroundColor }}>
                      <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-white shadow-md">
                          {tItem.imageUrl ? <img src={tItem.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xl" style={{ color: `${config.textColor}66` }}>{tItem.name.charAt(0)}</div>}
                        </div>
                        <h4 className="font-bold text-lg mb-1" style={{ color: config.textColor }}>{tItem.name}</h4>
                        <div className="flex gap-1 mb-4">
                          {[...Array(tItem.rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                        </div>
                        <p className="text-sm font-medium leading-relaxed italic" style={{ color: `${config.textColor}cc` }}>"{tItem.text}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="py-10 text-center space-y-6 px-4">
              <div className="flex flex-wrap justify-center gap-6 text-[12px] font-medium" style={{ color: config.textColor }}>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-gray-500" /><span>{t.securePayment}</span></div>
                <div className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-gray-500" /><span>{t.safeSite}</span></div>
                <div className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-gray-500" /><span>{t.variousPaymentMethods}</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-[13px] max-w-3xl mx-auto leading-relaxed opacity-70" style={{ color: config.textColor }}>{t.secureCheckoutTechnology}</p>
                <p className="text-[13px] font-semibold opacity-70" style={{ color: config.textColor }}>{t.allRightsReserved}</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
