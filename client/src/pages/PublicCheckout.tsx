import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Product, Checkout, CheckoutConfig, CheckoutLanguage } from "@shared/schema";
import { getTranslations } from "@shared/translations";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useAutoCurrency, useUsdRates } from "@/hooks/use-currency";
import { useAutoLanguage } from "@/hooks/use-language";
import {
    convertUsdCentsToCurrencyMinor,
    formatMoney,
    type SupportedCurrencyCode,
} from "@/lib/currency";
import { PayPalVisual } from "@/components/payments/PayPalVisual";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Timer, Star, ShieldCheck } from "lucide-react";

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
    checkoutLanguage: "AUTO",
    checkoutCurrency: "AUTO",
};

function getSoftBackgroundColor(color: string): string {
    return color + "15"; // Simple opacity hex trick
}

export default function PublicCheckout() {
    const [, params] = useRoute("/checkout/:slug");
    const slug = params?.slug;

    const [orderBumpSelected, setOrderBumpSelected] = useState<number[]>([]);
    const [isPaid, setIsPaid] = useState(false);

    const { data: checkoutData, isLoading: isLoadingCheckout } = useQuery<Checkout | null>({
        queryKey: ["/api/checkouts/public", slug],
        queryFn: async () => {
            const res = await fetch(`/api/checkouts/public/${slug}`);
            if (!res.ok) throw new Error("Checkout not found");
            return res.json();
        },
        enabled: !!slug,
    });

    const { data: product, isLoading: isLoadingProduct } = useQuery<Product | null>({
        queryKey: ["/api/products", checkoutData?.productId],
        queryFn: async () => {
            const res = await fetch(`/api/products/${checkoutData!.productId}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!checkoutData?.productId,
    });

    const config: CheckoutConfig = checkoutData?.config || defaultConfig;

    const { data: paypalPublicConfig, isLoading: isLoadingPaypal } = useQuery<{ clientId: string | null; environment: string } | null>({
        queryKey: ["/api/paypal/public-config", slug],
        queryFn: async () => {
            const res = await fetch(`/api/paypal/public-config?slug=${encodeURIComponent(String(slug))}`);
            if (!res.ok) return { clientId: null, environment: "sandbox" };
            return res.json();
        },
        enabled: !!slug,
    });

    const [timerSeconds, setTimerSeconds] = useState(config.timerMinutes * 60);
    const { data: autoLanguage } = useAutoLanguage();
    const [localLanguage, setLocalLanguage] = useState<CheckoutLanguage | null>(null);

    const activeLanguage = localLanguage || (config?.checkoutLanguage === "AUTO" ? (autoLanguage || "pt") : (config?.checkoutLanguage as CheckoutLanguage || "en"));
    const t = useMemo(() => getTranslations(activeLanguage), [activeLanguage]);

    const { data: autoCurrency } = useAutoCurrency();
    const { data: usdRates } = useUsdRates();

    const currency: SupportedCurrencyCode = useMemo(() => {
        const configCurrency = (config as any)?.checkoutCurrency || "USD";
        if (configCurrency === "AUTO") return (autoCurrency || "USD") as SupportedCurrencyCode;
        return configCurrency as SupportedCurrencyCode;
    }, [autoCurrency, config]);
    
    const usdToCurrencyRate = usdRates?.[currency] ?? 1;

    const moneyFromUsdCents = (usdCents: number) =>
        formatMoney({
            currency,
            minor: convertUsdCentsToCurrencyMinor(usdCents, currency, usdToCurrencyRate),
        });

    const [formData, setFormData] = useState({ email: "", confirmEmail: "", name: "", phone: "" });

    const calculateTotal = () => (product?.price ?? 0) + orderBumpSelected.length * 0; // Simplified

    const createOrder = async () => {
        const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                checkoutId: Number(checkoutData!.id),
                productId: Number(product!.id),
                customerData: formData,
                currency,
                totalUsdCents: calculateTotal(),
                totalMinor: convertUsdCentsToCurrencyMinor(calculateTotal(), currency, usdToCurrencyRate),
            }),
        });
        const data = await res.json();
        return data.id;
    };

    const captureOrder = async (orderId: string) => {
        await fetch(`/api/paypal/capture-order/${orderId}`, { method: "POST" });
        setIsPaid(true);
    };

    if (isLoadingCheckout || isLoadingProduct || isLoadingPaypal) return <div className="min-h-screen bg-[#f9fafb]" />;

    if (isPaid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                <h1 className="text-3xl font-bold">{t.paymentConfirmed}</h1>
                <p className="text-lg opacity-80">{t.paymentConfirmedDescription}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
            <div className="max-w-3xl mx-auto p-4 space-y-6">
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">{product?.name}</h2>
                    <div className="space-y-4">
                        <input type="email" placeholder={t.emailPlaceholder} className="w-full p-3 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input type="text" placeholder={t.fullNamePlaceholder} className="w-full p-3 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <PayPalVisual clientId={paypalPublicConfig?.clientId ?? null} currency={currency} environment={(paypalPublicConfig?.environment || "production") as any} createOrder={createOrder} onApprove={captureOrder} />
                    </div>
                </div>
            </div>
        </div>
    );
}