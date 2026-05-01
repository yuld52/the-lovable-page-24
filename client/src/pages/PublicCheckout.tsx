import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useAutoCurrency, useUsdRates } from "@/hooks/use-currency";
import { useAutoLanguage } from "@/hooks/use-language";
import {
  convertUsdCentsToCurrencyMinor,
  formatMoney,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Lock, ShieldCheck, Star, Timer, CreditCard, Loader2 } from "lucide-react";
import { PayPalVisual } from "@/components/payments/PayPalVisual";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/LoadingScreen";
import { db } from "@/lib/db";

const defaultConfig = {
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
  showChangeCountry: true,
  showTimer: false,
  showPhone: false,
  showCpf: false,
  showSurname: false,
  showCnpj: false,
  showAddress: false,
  environment: "production",
  checkoutLanguage: "AUTO",
  checkoutCurrency: "AUTO",
};

function getSoftBackgroundColor(color: string): string {
  let r = 0, g = 0, b = 0;
  if (color.startsWith('#')) {
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
  }
  
  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }
  
  const newS = Math.min(s * 0.35, 0.25);
  const newL = 0.94;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  
  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
  const p = 2 * newL - q;
  const newR = hue2rgb(p, q, h + 1 / 3);
  const newG = hue2rgb(p, q, h);
  const newB = hue2rgb(p, q, h - 1 / 3);
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

export default function PublicCheckout() {
  const [, params] = useRoute("/checkout/:slug");
  const slug = params?.slug;
  const [orderBumpSelected, setOrderBumpSelected] = useState<string[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const { data: checkoutData, isLoading: isLoadingCheckout } = useQuery({
    queryKey: ["public-checkout", slug],
    queryFn: async () => {
      if (!slug) return null;
      return db.checkouts.getBySlug(slug) || null;
    },
    enabled: !!slug,
    retry: false,
  });

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["public-checkout-product", checkoutData?.productId],
    queryFn: async () => {
      if (!checkoutData?.productId) return null;
      return db.products.getById(checkoutData.productId);
    },
    enabled: !!checkoutData?.productId,
  });

  const { data: allProducts } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => db.products.getAll(),
  });

  const { data: paypalConfig } = useQuery({
    queryKey: ["paypal-config", slug],
    queryFn: async () => {
      if (!slug) return null;
      return db.getPaypalConfig(slug);
    },
    enabled: !!slug,
  });

  const config = checkoutData?.config || defaultConfig;
  const [timerSeconds, setTimerSeconds] = useState(config.timerMinutes * 60);
  const { data: autoLanguage } = useAutoLanguage();
  const [localLanguage, setLocalLanguage] = useState<string | null>(null);
  const activeLanguage = localLanguage || (config?.checkoutLanguage === "AUTO" ? (autoLanguage || "pt") : (config?.checkoutLanguage || "en"));

  const t: any = {
    pt: { emailLabel: "Seu e-mail", emailPlaceholder: "Seu e-mail", fullNameLabel: "Nome completo", fullNamePlaceholder: "Digite seu nome completo", buyNow: "Comprar Agora", total: "Total", securePayment: "Pagamento 100% Seguro", safeSite: "Site protegido", variousPaymentMethods: "Diversas formas de pagamento", allRightsReserved: "© 2026 Meteorfy Inc. Todos os direitos reservados.", paymentConfirmed: "Pagamento Confirmado!", paymentConfirmedDescription: "Obrigado pela sua compra. Verifique seu e-mail para acessar o produto.", addToOrder: "Adicionar produto", exclusiveOffer: "Espere! Aproveite esta oferta exclusiva", exclusiveOfferPlural: "Espere! Aproveite estas ofertas exclusivas" },
    en: { emailLabel: "Your email", emailPlaceholder: "Enter your email", fullNameLabel: "Full Name", fullNamePlaceholder: "Enter your full name", buyNow: "Buy Now", total: "Order total", securePayment: "Secure Payment", safeSite: "Safe Site", variousPaymentMethods: "Various payment methods", allRightsReserved: "© 2026 Meteorfy Inc. All rights reserved.", paymentConfirmed: "Payment Confirmed!", paymentConfirmedDescription: "Thank you for your purchase. Check your email to access the product.", addToOrder: "Add to purchase", exclusiveOffer: "Wait! Take advantage of this exclusive offer", exclusiveOfferPlural: "Wait! Take advantage of these exclusive offers" },
    es: { emailLabel: "Tu email", emailPlaceholder: "Introduce tu email", fullNameLabel: "Tu nombre completo", fullNamePlaceholder: "Ingrese su nombre completo", buyNow: "Comprar ahora", total: "Total a pagar", securePayment: "Pago Seguro", safeSite: "Sitio protegido", variousPaymentMethods: "Diversas formas de pago", allRightsReserved: "© 2026 Meteorfy Inc. Todos los derechos reservados.", paymentConfirmed: "¡Pago Confirmado!", paymentConfirmedDescription: "Gracias por su compra. Revise su correo para acceder al producto.", addToOrder: "Añadir a la compra", exclusiveOffer: "¡Espere! Aproveche esta oferta exclusiva", exclusiveOfferPlural: "¡Espere! Aproveche estas ofertas exclusivas" }
  }[activeLanguage as string] || {};

  useEffect(() => { setTimerSeconds(config.timerMinutes * 60); }, [config.timerMinutes]);
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const { data: autoCurrency } = useAutoCurrency();
  const { data: usdRates } = useUsdRates();
  const currency: SupportedCurrencyCode = useMemo(() => {
    const configCurrency = (config as any)?.checkoutCurrency || "USD";
    return configCurrency === "AUTO" ? (autoCurrency || "USD") as any : configCurrency;
  }, [autoCurrency, config]);
  const usdToCurrencyRate = usdRates?.[currency] ?? 1;

  const moneyFromUsdCents = (usdCents: number) =>
    formatMoney({ currency, minor: convertUsdCentsToCurrencyMinor(usdCents, currency, usdToCurrencyRate) });

  const [formData, setFormData] = useState({ email: "", confirmEmail: "", name: "", surname: "", cpf: "", phone: "" });
  const [showErrors, setShowErrors] = useState(false);

  const calculateTotal = () => {
    let total = product?.price ?? 0;
    orderBumpSelected.forEach(id => {
      const p = allProducts?.find(x => x.id === id);
      if (p) total += p.price;
    });
    return total;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60), secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateOrder = async () => {
    if (!formData.email || !formData.name) {
      setShowErrors(true);
      toast({ title: "Erro", description: "Preencha seu nome e e-mail para continuar.", variant: "destructive" });
      throw new Error("Validation failed");
    }
    return "local-order-" + Date.now();
  };

  const handleApprove = async (orderId: string) => {
    setIsProcessing(true);
    try {
      if (product && checkoutData) {
        db.sales.create({
          checkoutId: checkoutData.id,
          productId: product.id,
          userId: checkoutData.ownerId,
          amount: calculateTotal(),
          status: 'paid',
          customerEmail: formData.email,
          paypalOrderId: orderId,
          paypalCurrency: currency,
          paypalAmountMinor: convertUsdCentsToCurrencyMinor(calculateTotal(), currency, usdToCurrencyRate),
          utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null,
        });
      }
      setIsPaid(true);
      toast({ title: "Sucesso", description: "Pagamento realizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao processar pagamento.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingCheckout || isLoadingProduct || isProcessing) return <LoadingScreen />;
  if (!checkoutData || !product) return <div className="p-8 text-center">Checkout não encontrado</div>;

  const orderBumpProductsData = allProducts?.filter(p => 
    config.orderBumpProducts?.some((opId: string) => opId === p.id)
  ) || [];

  if (isPaid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
        <div className="max-w-2xl w-full bg-white rounded-2xl p-10 shadow-xl border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-green-500" /></div>
          <h1 className="text-3xl font-bold mb-4" style={{ color: '#111827' }}>{t.paymentConfirmed}</h1>
          <p className="text-lg opacity-80 mb-8" style={{ color: '#4b5563' }}>{t.paymentConfirmedDescription}</p>
          {product?.deliveryUrl && <Button size="lg" className="w-full bg-green-600 text-white font-bold h-14" onClick={() => window.open(product.deliveryUrl || '', '_blank')}>Acessar Conteúdo Agora</Button>}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen font-sans" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
      {config.showTimer && (
        <div className="py-2 px-4">
          <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
            <div className="w-full max-w-3xl py-4 px-6 text-center text-white flex items-center justify-center gap-6" style={{ backgroundColor: config.timerColor }}>
              <span className="font-sans tabular-nums text-[48px] font-medium">{formatTime(timerSeconds)}</span>
              <Timer className="w-10 h-10 animate-pulse" />
              <span className="text-[19px]">{config.timerText}</span>
            </div>
          </div>
        </div>
      )}
      {config.heroImageUrl && (
        <div className="py-2 px-4">
          <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
            <div className="w-full max-w-3xl overflow-hidden rounded-lg shadow-md"><img src={config.heroImageUrl} alt="" className="w-full h-auto" /></div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 py-6 flex justify-center">
        <div className="max-w-3xl w-full space-y-4">
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
            {config.showChangeCountry && (
              <div className="p-4 flex justify-end">
                <Select value={activeLanguage} onValueChange={(val: any) => setLocalLanguage(val)}>
                  <SelectTrigger className="w-fit bg-transparent border-0 h-8 text-xs gap-2" style={{ color: config.textColor }}>
                    <div className="flex items-center gap-2">
                      {activeLanguage === 'en' ? <img src="https://flagcdn.com/w20/us.png" width="16" alt="USA" /> : activeLanguage === 'es' ? <img src="https://flagcdn.com/w20/es.png" width="16" alt="Spain" /> : <img src="https://flagcdn.com/w20/br.png" width="16" alt="Brazil" />}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="pt">Português (BR)</SelectItem>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="es">Español (ES)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-4">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-contain" /> : <div className="w-20 h-20 rounded-sm flex items-center justify-center font-bold" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>{product.name?.charAt(0)}</div>}
                <div className="flex-1">
                  <h2 className="font-bold text-[17px]">{product.name}</h2>
                  <div className="text-lg font-bold" style={{ color: config.primaryColor }}>{moneyFromUsdCents(product.price)}</div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px]">{t.emailLabel}</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t.emailPlaceholder} className={`w-full h-11 px-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${showErrors && !formData.email ? 'border-red-500' : 'border-gray-300'}`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px]">{t.fullNameLabel}</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t.fullNamePlaceholder} className={`w-full h-11 px-3 rounded-md border text-sm focus:outline-none focus:ring-1 ${showErrors && !formData.name ? 'border-red-500' : 'border-gray-300'}`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
              </div>
            </div>
            {orderBumpProductsData.length > 0 && (
              <div className="p-4 space-y-4">
                {orderBumpProductsData.map(p => (
                  <div key={p.id} className="rounded-lg border-2 border-dashed" style={{ borderColor: config.primaryColor }}>
                    <div className="flex items-start gap-3 p-3">
                      <div className="flex-1">
                        <h4 className="text-[17px] font-medium">{p.name}</h4>
                        <div className="mt-1 font-bold text-sm" style={{ color: config.primaryColor }}>+ {moneyFromUsdCents(p.price)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 cursor-pointer" style={{ backgroundColor: getSoftBackgroundColor(config.primaryColor) }} onClick={() => {
                      const isSelected = orderBumpSelected.includes(p.id);
                      if (isSelected) setOrderBumpSelected(orderBumpSelected.filter(id => id !== p.id));
                      else setOrderBumpSelected([...orderBumpSelected, p.id]);
                    }}>
                      <Checkbox checked={orderBumpSelected.includes(p.id)} />
                      <span className="text-sm font-medium" style={{ color: "#000000" }}>{t.addToOrder}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="mb-4">
                <PayPalVisual
                  clientId={paypalConfig?.clientId}
                  currency={currency}
                  environment={paypalConfig?.environment}
                  createOrder={handleCreateOrder}
                  onApprove={handleApprove}
                  locale={activeLanguage === 'pt' ? 'pt_BR' : activeLanguage === 'es' ? 'es_ES' : 'en_US'}
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center"><span className="font-bold text-xs">{t.total}</span><span className="font-bold text-lg" style={{ color: config.primaryColor }}>{moneyFromUsdCents(calculateTotal())}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="py-10 text-center space-y-4 px-4 opacity-70">
        <div className="flex justify-center gap-6 text-[12px]">
          <div className="flex items-center gap-1.5"><ShieldCheck size={16} /><span>{t.securePayment}</span></div>
          <div className="flex items-center gap-1.5"><Lock size={16} /><span>{t.safeSite}</span></div>
          <div className="flex items-center gap-1.5"><CreditCard size={16} /><span>{t.variousPaymentMethods}</span></div>
        </div>
        <p className="text-[13px]">{t.allRightsReserved}</p>
      </footer>
    </motion.div>
  );
}