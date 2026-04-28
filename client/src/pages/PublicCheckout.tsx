import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Product, Checkout, CheckoutConfig, CheckoutLanguage } from "@shared/schema";
import { getTranslations } from "@shared/translations";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { useAutoCurrency, useUsdRates } from "@/hooks/use-currency";
import { useAutoLanguage } from "@/hooks/use-language";
import {
    convertUsdCentsToCurrencyMinor,
    formatMoney,
    type SupportedCurrencyCode,
} from "@/lib/currency";
import { PayPalVisual } from "@/components/payments/PayPalVisual";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, CreditCard, Lock, Loader2, ShieldCheck, Star, Timer, Zap, Globe } from "lucide-react";

declare global {
    interface Window {
        paypal: any;
    }
}

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
    showChangeCountry: true,
    showTimer: false,
    showPhone: false,
    showCpf: false,
    showSurname: false,
    showCnpj: false,
    showAddress: false,
    environment: "production", // Changed to production
    checkoutLanguage: "AUTO", // Changed to AUTO
    previewCurrency: "AUTO",
};

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
        // Basic fallback for named colors or invalid hex
        return color;
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

    return `#${toHex(newR)}${toHex(newG)}${newB ? toHex(newB) : '00'}`;
}

export default function PublicCheckout() {
    const [, params] = useRoute("/checkout/:slug");
    const slug = params?.slug;

    const [orderBumpSelected, setOrderBumpSelected] = useState<number[]>([]);
    const [isPaid, setIsPaid] = useState(false);

    const sessionId = useMemo(() => {
        if (typeof window === "undefined") return "";
        const key = "bp_tracking_session";
        const existing = window.localStorage.getItem(key);
        if (existing) return existing;
        const next = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.localStorage.setItem(key, next);
        return next;
    }, []);

    const getUtm = useCallback(() => {
        const p = new URLSearchParams(window.location.search);
        const pick = (k: string) => p.get(k);
        return {
            utm_source: pick("utm_source"),
            utm_medium: pick("utm_medium"),
            utm_campaign: pick("utm_campaign"),
            utm_content: pick("utm_content"),
            utm_term: pick("utm_term"),
        };
    }, []);

    const track = useCallback(
        async (eventName: "PageView" | "ViewContent" | "checkout" | "payment_pending", extraData?: { email?: string; amount?: number }) => {
            try {
                if (!slug) return;

                const payload = {
                    slug,
                    eventName,
                    sessionId,
                    ...getUtm(),
                    ...(extraData || {}),
                };

                console.log(`[Utmify] Enviando evento: ${eventName}`, payload);

                const response = await fetch("/api/tracking/event", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[Utmify] Erro na resposta do servidor (${response.status}):`, errorText);
                } else {
                    const result = await response.json();
                    console.log(`[Utmify] Evento ${eventName} enviado com sucesso!`, result);
                }
            } catch (error) {
                console.error(`[Utmify] Erro ao enviar evento ${eventName}:`, error);
            }
        },
        [getUtm, sessionId, slug],
    );

    const { data: checkoutData, isLoading: isLoadingCheckout, error: checkoutError } = useQuery<Checkout | null>({
        queryKey: ["public-checkout", slug],
        enabled: !!slug,
        queryFn: async () => {
            try {
                const checkoutsRef = collection(db, "checkouts");
                const q = query(checkoutsRef, where("slug", "==", slug), limit(1));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error("Checkout not found");
                }

                const doc = querySnapshot.docs[0];
                const data = doc.data();

                return {
                    id: doc.id,
                    productId: data.product_id ?? data.productId ?? 0,
                    name: data.name,
                    slug: data.slug,
                    publicUrl: data.public_url ?? data.publicUrl,
                    views: data.views ?? 0,
                    active: data.active ?? true,
                    createdAt: data.created_at ?? data.createdAt,
                    config: data.config,
                } as unknown as Checkout;
            } catch (err) {
                console.error("[PublicCheckout] Error fetching checkout:", err);
                throw err;
            }
        },
        retry: false,
    });

    const { data: product, isLoading: isLoadingProduct, error: productError } = useQuery<Product | null>({
        queryKey: ["public-checkout-product", checkoutData?.productId],
        enabled: !!checkoutData?.productId,
        queryFn: async () => {
            const docRef = doc(db, "products", String(checkoutData!.productId));
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.name,
                description: data.description,
                price: data.price ?? data.price,
                imageUrl: data.image_url ?? data.imageUrl,
                deliveryUrl: data.delivery_url ?? data.deliveryUrl,
                whatsappUrl: data.whatsapp_url ?? data.whatsappUrl,
                deliveryFiles: data.delivery_files ?? data.deliveryFiles ?? [],
                noEmailDelivery: data.no_email_delivery ?? data.noEmailDelivery ?? false,
                active: data.active ?? true,
                createdAt: data.created_at ?? data.createdAt,
            } as unknown as Product;
        },
    });

    const displayProduct = product;

    useEffect(() => {
        if (!product?.id) return;
        track("ViewContent");
    }, [product?.id, track]);

    useEffect(() => {
        if (product?.name) {
            document.title = product.name;
        }
    }, [product?.name]);

    const { data: allProducts } = useQuery<Product[]>({
        queryKey: ["products"],
        queryFn: async () => {
            const productsRef = collection(db, "products");
            const q = query(productsRef, orderBy("created_at", "desc"));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    description: data.description,
                    price: data.price ?? data.price,
                    imageUrl: data.image_url ?? data.imageUrl,
                    deliveryUrl: data.delivery_url ?? data.deliveryUrl,
                    whatsappUrl: data.whatsapp_url ?? data.whatsappUrl,
                    deliveryFiles: data.delivery_files ?? data.deliveryFiles ?? [],
                    noEmailDelivery: data.no_email_delivery ?? data.noEmailDelivery ?? false,
                    active: data.active ?? true,
                    createdAt: data.created_at ?? data.createdAt,
                } as unknown as Product;
            });
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const config: CheckoutConfig = checkoutData?.config || defaultConfig;

    const { data: paypalPublicConfig, isLoading: isLoadingPaypal, error: paypalError } = useQuery<{ clientId: string | null; environment: string } | null>({
        queryKey: ["paypal-public-config", slug],
        enabled: !!slug,
        queryFn: async () => {
            const res = await fetch(`/api/paypal/public-config?slug=${encodeURIComponent(String(slug))}`);
            if (res.status === 503) {
                return { clientId: null, environment: "sandbox" };
            }
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Erro ao carregar configuração do PayPal");
            }
            return (await res.json()) as any;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

    const isLoading = isLoadingCheckout || isLoadingProduct || isLoadingPaypal;
    const isPaypalConfigured = paypalPublicConfig?.clientId != null;
    const error = checkoutError || productError || (!isPaypalConfigured ? null : (paypalError as any));

    useEffect(() => {
        if (!slug) return;
        track("PageView");
    }, [slug, track]);

    const [timerSeconds, setTimerSeconds] = useState(config.timerMinutes * 60);
    const { data: autoLanguage } = useAutoLanguage();
    const [localLanguage, setLocalLanguage] = useState<CheckoutLanguage | null>(null);

    const activeLanguage = localLanguage || (config?.checkoutLanguage === "AUTO" ? (autoLanguage || "pt") : (config?.checkoutLanguage as CheckoutLanguage || "en"));
    const t = useMemo(() => getTranslations(activeLanguage), [activeLanguage]);
    const locale = activeLanguage === "pt" ? "pt_BR" : activeLanguage === "es" ? "es_ES" : "en_US";

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

    const { data: autoCurrency } = useAutoCurrency();
    const { data: usdRates } = useUsdRates();

    const currency: SupportedCurrencyCode = useMemo(() => {
        const configCurrency = (config as any)?.checkoutCurrency || "USD";
        if (configCurrency === "AUTO") {
            return (autoCurrency || "USD") as SupportedCurrencyCode;
        }
        return configCurrency as SupportedCurrencyCode;
    }, [autoCurrency, config]);
    const usdToCurrencyRate = usdRates?.[currency] ?? 1;

    const moneyFromUsdCents = (usdCents: number) =>
        formatMoney(
            {
                currency,
                minor: convertUsdCentsToCurrencyMinor(usdCents, currency, usdToCurrencyRate),
            },
            typeof navigator !== "undefined" ? navigator.language : undefined
        );

    const [formData, setFormData] = useState({
        email: "",
        confirmEmail: "",
        name: "",
        surname: "",
        cpf: "",
        cnpj: "",
        phone: "",
        zip: "",
        street: "",
        number: ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showErrors, setShowErrors] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.email) newErrors.email = t.requiredField;
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t.invalidEmail;
        if (!formData.confirmEmail) newErrors.confirmEmail = t.requiredField;
        else if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = t.emailsDoNotMatch;
        if (!formData.name) newErrors.name = t.requiredField;
        if (config.showSurname && !formData.surname) newErrors.surname = t.requiredField;
        if (config.showCpf && !formData.cpf) newErrors.cpf = t.requiredField;
        if (config.showCnpj && !formData.cnpj) newErrors.cnpj = t.requiredField;
        if (config.showPhone && !formData.phone) newErrors.phone = t.requiredField;
        if (config.showAddress) {
            if (!formData.zip) newErrors.zip = t.requiredField;
            if (!formData.street) newErrors.street = t.requiredField;
            if (!formData.number) newErrors.number = t.requiredField;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const calculateTotal = () => {
        let total = product?.price ?? 0;
        orderBumpSelected.forEach(id => {
            const p = allProducts?.find(x => x.id === id);
            if (p) total += p.price;
        });
        return total;
    };

    const createOrder = async () => {
        if (!checkoutData || !product) throw new Error("Missing checkout/product");
        const totalUsdCents = calculateTotal();
        const totalMinor = convertUsdCentsToCurrencyMinor(totalUsdCents, currency, usdToCurrencyRate);
        const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                checkoutId: Number(checkoutData.id),
                productId: Number(product.id),
                customerData: formData,
                currency,
                totalUsdCents,
                totalMinor,
                orderBumpProductIds: orderBumpSelected,
                environment: config.environment,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erro ao criar pedido");
        return String(data.id);
    };

    const captureOrder = async (orderId: string) => {
        const res = await fetch(`/api/paypal/capture-order/${orderId}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Erro ao capturar pedido");
        setIsPaid(true);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) return <div className="min-h-screen bg-[#f9fafb]" />;
    if (error || !checkoutData || !checkoutData.active || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
                <div className="bg-red-50 p-6 rounded-full mb-4"><ShieldCheck className="w-12 h-12 text-red-500" /></div>
                <h1 className="text-2xl font-bold mb-2 text-gray-900">{t.invalidLink}</h1>
                <p className="text-gray-500 max-w-md">{t.invalidLinkDescription}</p>
            </div>
        );
    }

    const upsellProducts = allProducts?.filter((p) => config.upsellProducts.includes(p.id)) || [];
    const orderBumpProductsData = allProducts?.filter((p) => config.orderBumpProducts.includes(p.id)) || [];
    const testimonials = config.testimonials || [];

    if (isPaid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
                <div className="max-w-2xl w-full bg-white rounded-2xl p-10 shadow-xl border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-green-500" /></div>
                    <h1 className="text-3xl font-bold mb-4">{t.paymentConfirmed}</h1>
                    <p className="text-lg opacity-80 mb-8">{t.paymentConfirmedDescription}</p>
                    <div className="mb-10 p-6 bg-green-50 rounded-xl border border-green-100">
                        <h3 className="font-bold text-green-800 mb-2">Seu acesso está liberado!</h3>
                        {product?.deliveryUrl && <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg h-14 shadow-lg mb-3" onClick={() => window.open(product.deliveryUrl || '', '_blank')}>Acessar Conteúdo Agora</Button>}
                    </div>
                </div>
            </div>
        );
    }

    if (!displayProduct) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="min-h-screen font-sans" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
            {config.showTimer && (
                <div className="py-2 px-4" style={{ backgroundColor: config.backgroundColor }}>
                    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
                        <div className="w-full max-w-3xl py-4 px-6 text-center text-white flex items-center justify-center gap-6 rounded-none shadow-md" style={{ backgroundColor: config.timerColor }}>
                            <span className="font-sans tabular-nums text-[48px] font-medium leading-none tracking-tighter">{formatTime(timerSeconds)}</span>
                            <Timer className="w-10 h-10 animate-pulse shrink-0" />
                            <span className="tracking-tight font-medium leading-tight text-[19px]">{config.timerText}</span>
                        </div>
                    </div>
                </div>
            )}

            {config.heroImageUrl && (
                <div className="py-2 px-4" style={{ backgroundColor: config.backgroundColor }}>
                    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
                        <div className="w-full max-w-3xl overflow-hidden rounded-lg shadow-md"><img src={config.heroImageUrl} alt="" className="w-full h-auto object-contain block rounded-lg" /></div>
                    </div>
                </div>
            )}

            <div className={`max-w-5xl mx-auto px-4 py-6 ${testimonials.length > 0 ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'flex justify-center'}`}>
                <div className={testimonials.length > 0 ? 'lg:col-span-2 max-w-3xl w-full space-y-4' : 'max-w-3xl w-full space-y-4'}>
                    <div id="checkout-form-container" className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
                        {config.showChangeCountry && (
                            <div className="p-4 flex justify-end">
                                <Select value={activeLanguage} onValueChange={(val: any) => setLocalLanguage(val)}>
                                    <SelectTrigger className="w-fit bg-transparent border-0 h-8 text-xs gap-2 focus:ring-0 shadow-none hover:bg-black/5 rounded-full px-3 transition-colors" style={{ color: config.textColor }}>
                                        <div className="flex items-center gap-2">
                                            {activeLanguage === 'en' ? <img src="https://flagcdn.com/w20/us.png" width="16" alt="USA" className="rounded-sm" /> : activeLanguage === 'es' ? <img src="https://flagcdn.com/w20/es.png" width="16" alt="Spain" className="rounded-sm" /> : <img src="https://flagcdn.com/w20/br.png" width="16" alt="Brazil" className="rounded-sm" />}
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent align="end" className="bg-white border-gray-200">
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
                                {displayProduct.imageUrl ? <img src={displayProduct.imageUrl} alt={displayProduct.name} className="w-20 h-20 object-contain shadow-sm rounded-sm" /> : <div className="w-20 h-20 rounded-sm flex items-center justify-center font-bold" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>{displayProduct.name.charAt(0)}</div>}
                                <div className="flex-1 space-y-1">
                                    <h2 className="font-bold text-[17px]" style={{ color: config.textColor }}>{displayProduct.name}</h2>
                                    <div className="text-lg font-bold" style={{ color: config.primaryColor }}>{moneyFromUsdCents(displayProduct.price)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.emailLabel}</label>
                                <input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder={t.emailPlaceholder} className={`w-full h-11 px-3 rounded-md border ${(showErrors && errors.email) ? 'border-red-500' : 'border-gray-300'} flex items-center text-sm focus:outline-none focus:ring-1 transition-all`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
                                {(showErrors && errors.email) && <span className="text-[10px] text-red-500">{errors.email}</span>}
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.confirmEmailLabel}</label>
                                <input type="email" value={formData.confirmEmail} onChange={(e) => handleInputChange("confirmEmail", e.target.value)} placeholder={t.confirmEmailPlaceholder} className={`w-full h-11 px-3 rounded-md border ${(showErrors && errors.confirmEmail) ? 'border-red-500' : 'border-gray-300'} flex items-center text-sm focus:outline-none focus:ring-1 transition-all`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
                                {(showErrors && errors.confirmEmail) && <span className="text-[10px] text-red-500">{errors.confirmEmail}</span>}
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{config.showSurname ? t.nameLabel : t.fullNameLabel}</label>
                                <input type="text" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder={config.showSurname ? t.namePlaceholder : t.fullNamePlaceholder} className={`w-full h-11 px-3 rounded-md border ${(showErrors && errors.name) ? 'border-red-500' : 'border-gray-300'} flex items-center text-sm focus:outline-none focus:ring-1 transition-all`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
                                {(showErrors && errors.name) && <span className="text-[10px] text-red-500">{errors.name}</span>}
                            </div>
                            {config.showSurname && (
                                <div className="space-y-1">
                                    <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.surnameLabel}</label>
                                    <input type="text" value={formData.surname} onChange={(e) => handleInputChange("surname", e.target.value)} placeholder={t.surnamePlaceholder} className={`w-full h-11 px-3 rounded-md border ${(showErrors && errors.surname) ? 'border-red-500' : 'border-gray-300'} flex items-center text-sm focus:outline-none focus:ring-1 transition-all`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
                                    {(showErrors && errors.surname) && <span className="text-[10px] text-red-500">{errors.surname}</span>}
                                </div>
                            )}
                            {config.showCpf && (
                                <div className="space-y-1">
                                    <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.cpfLabel}</label>
                                    <input type="text" value={formData.cpf} onChange={(e) => handleInputChange("cpf", e.target.value)} placeholder={t.cpfPlaceholder} className={`w-full h-11 px-3 rounded-md border ${(showErrors && errors.cpf) ? 'border-red-500' : 'border-gray-300'} flex items-center text-sm focus:outline-none focus:ring-1 transition-all`} style={{ backgroundColor: config.backgroundColor, color: config.textColor }} />
                                    {(showErrors && errors.cpf) && <span className="text-[10px] text-red-500">{errors.cpf}</span>}
                                </div>
                            )}
                            {config.showPhone && (
                                <div className="space-y-1">
                                    <label className="block text-[11px] tracking-tight font-normal" style={{ color: config.textColor }}>{t.phoneLabel}</label>
                                    <PhoneInput country={'br'} value={formData.phone} onChange={(val) => handleInputChange("phone", val)} inputStyle={{ width: '100%', height: '44px', backgroundColor: config.backgroundColor, color: config.textColor }} containerStyle={{ width: '100%' }} />
                                    {(showErrors && errors.phone) && <span className="text-[10px] text-red-500">{errors.phone}</span>}
                                </div>
                            )}
                        </div>

                        {orderBumpProductsData.length > 0 && (
                            <div className="p-4 space-y-4">
                                <div className="flex items-center gap-2"><Star className="w-4 h-4" style={{ fill: config.primaryColor, color: config.primaryColor }} /><span className="font-bold text-sm" style={{ color: config.textColor }}>{orderBumpProductsData.length > 1 ? t.exclusiveOfferPlural : t.exclusiveOffer}:</span></div>
                                {orderBumpProductsData.map(p => (
                                    <div key={p.id} className="rounded-lg overflow-hidden border-2 border-dashed" style={{ borderColor: config.primaryColor }}>
                                        <div className="flex items-start gap-3 p-3">
                                            {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-20 h-20 object-cover rounded" /> : <div className="w-20 h-20 bg-gray-900 rounded flex items-center justify-center text-white font-bold text-lg">{p.name.charAt(0)}</div>}
                                            <div className="flex-1">
                                                <h4 className="text-[17px] font-medium" style={{ color: config.textColor }}>{p.name}</h4>
                                                <div className="mt-1 font-bold text-sm" style={{ color: config.primaryColor }}>+ {moneyFromUsdCents(p.price)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 cursor-pointer rounded-b-lg" style={{ backgroundColor: getSoftBackgroundColor(config.primaryColor) }} onClick={() => orderBumpSelected.includes(p.id) ? setOrderBumpSelected(orderBumpSelected.filter(id => id !== p.id)) : setOrderBumpSelected([...orderBumpSelected, p.id])}>
                                            <Checkbox checked={orderBumpSelected.includes(p.id)} onCheckedChange={() => { }} />
                                            <span className="text-sm font-medium" style={{ color: "#000000" }}>{t.addToOrder}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="p-4 space-y-3">
                            <PayPalVisual clientId={paypalPublicConfig?.clientId ?? null} currency={currency} environment={(paypalPublicConfig?.environment || "production") as any} locale={locale} createOrder={createOrder} onApprove={captureOrder} onBeforePay={validateForm} />
                            <div className="pt-4">
                                <div className="flex justify-between items-center text-xs mb-2"><span style={{ color: `${config.textColor}99` }}>{displayProduct.name}</span><span className="font-medium" style={{ color: config.textColor }}>{moneyFromUsdCents(displayProduct.price)}</span></div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100"><span className="font-bold text-xs" style={{ color: config.textColor }}>{t.total}</span><span className="font-bold text-lg" style={{ color: config.primaryColor }}>{moneyFromUsdCents(calculateTotal())}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}