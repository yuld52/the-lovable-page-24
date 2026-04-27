import { useEffect, useMemo, useRef, useState } from "react";
import { loadPayPalSdk } from "./paypal-sdk";
import { Button } from "@/components/ui/button";

type PayPalVisualProps = {
  clientId?: string | null;
  currency: string;
  buyerCountry?: string;
  fundingSource?: "paypal" | "card";
  enableFunding?: string;
  environment?: "sandbox" | "production";
  messageAmount?: number;
  createOrder: () => Promise<string>;
  onApprove: (orderId: string) => Promise<void>;
  onBeforePay?: () => boolean;
  onPayStart?: () => void;
  locale?: string;
};

export function PayPalVisual({
  clientId,
  currency,
  buyerCountry,
  fundingSource,
  enableFunding,
  messageAmount,
  createOrder,
  onApprove,
  onBeforePay,
  onPayStart,
  environment,
  locale,
}: PayPalVisualProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<any>(null);

  const buttonsContainerId = useMemo(() => `pp-btn-${Math.random().toString(36).slice(2, 7)}`, []);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const callbacksRef = useRef({ createOrder, onApprove, onBeforePay, onPayStart, messageAmount });
  // Update ref directly in render for immediate availability in events
  callbacksRef.current = { createOrder, onApprove, onBeforePay, onPayStart, messageAmount };

  // Force visual mode if no clientId is provided
  const effectiveClientId = clientId || "test";
  const effectiveEnvironment = clientId ? environment : "sandbox";

  useEffect(() => {
    console.log("💳 [PAYPAL] Verificando configuração:", {
      clientId: effectiveClientId === "test" ? "⚠️ Modo Visual (Test)" : "✅ Configurado",
      currency,
      environment: effectiveEnvironment,
      locale
    });

    // We don't clear the instance immediately to avoid "Buttons is not a function" during render.
    // We only set ready to false to show the loader.
    setReady(false);

    console.log("📦 [PAYPAL] Carregando SDK do PayPal...");

    loadPayPalSdk({
      clientId: effectiveClientId,
      currency,
      buyerCountry,
      enableFunding,
      components: "buttons",
      environment: effectiveEnvironment,
      locale
    })
      .then((info) => {
        if (!mountedRef.current) return;
        console.log("✅ [PAYPAL] SDK carregado com sucesso!");
        setInstance(info.paypal);
        setReady(true);
        setError(null);
      })
      .catch((e) => {
        if (!mountedRef.current) return;
        console.error("❌ [PAYPAL] Erro ao carregar SDK:", e);
        // Silent recovery helper
        if ((window as any).paypal?.Buttons) {
          console.log("🔄 [PAYPAL] Recuperado do cache do navegador");
          setInstance((window as any).paypal);
          setReady(true);
        } else {
          setError("Erro ao carregar PayPal. Tente atualizar a página.");
        }
      });
  }, [effectiveClientId, currency, buyerCountry, locale, effectiveEnvironment]);

  const buttonsRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !instance) return;

    // Wrap in try-catch to prevent "Unknown Runtime Error" from crashing the app
    try {
      const host = document.getElementById(buttonsContainerId);
      if (!host) return;

      // Ensure previous buttons are closed before re-rendering
      if (buttonsRef.current) {
        try { buttonsRef.current.close(); } catch (e) { }
        buttonsRef.current = null;
      }

      host.innerHTML = "";
      const pp = instance;

      if (typeof pp.Buttons !== "function") {
        console.warn("pp.Buttons is not a function yet, skipping render.");
        return;
      }

      const b = pp.Buttons({
        fundingSource: fundingSource === "card" ? pp.FUNDING?.CARD : fundingSource === "paypal" ? pp.FUNDING?.PAYPAL : undefined,
        style: { shape: "rect", layout: "vertical", color: "gold", label: "paypal" },
        onClick: (_data: any, actions: any) => {
          if (callbacksRef.current.onPayStart) try { callbacksRef.current.onPayStart(); } catch (e) { }
          if (!callbacksRef.current.onBeforePay) return actions.resolve();
          return callbacksRef.current.onBeforePay() ? actions.resolve() : actions.reject();
        },
        createOrder: () => callbacksRef.current.createOrder(),
        onApprove: (data: any) => callbacksRef.current.onApprove(String(data.orderID)),
        onError: (err: any) => {
          console.error("PayPal Button Error:", err);
          setError("Erro no PayPal. Tente novamente.");
        },
      });

      buttonsRef.current = b;
      if (b.isEligible()) {
        b.render(`#${buttonsContainerId}`).catch((e: any) => {
          console.warn("PayPal render error (can be ignored if unmounting):", e);
        });
      }
    } catch (err) {
      console.error("Critical PayPal render error capped:", err);
    }

    return () => {
      if (buttonsRef.current) {
        try { buttonsRef.current.close(); } catch (e) { }
      }
    };
  }, [ready, instance, buttonsContainerId, fundingSource]);

  // Removed the blocking check for !clientId to allow "test" mode visual rendering
  /* 
  if (!clientId) {
    return (...)
  } 
  */

  return (
    <div className="space-y-3">
      {!ready && !error && (
        <div className="space-y-3">
          <div className="w-full h-12 bg-gray-200 animate-pulse rounded-md" />
          <div className="w-full h-12 bg-gray-200 animate-pulse rounded-md" />
        </div>
      )}
      {error && !ready && (
        <div className="p-4 text-xs text-muted-foreground bg-secondary/30 rounded-lg text-center">
          {error}
        </div>
      )}
      <div id={buttonsContainerId} className="min-h-[50px]" data-testid="paypal-buttons" />
    </div>
  );
}
