import { useEffect, useMemo, useRef, useState } from "react";
import { loadPayPalSdk } from "./paypal-sdk";
import { Button } from "@/components/ui/button";

type PayPalCardFieldsVisualProps = {
  clientId?: string | null;
  currency: string;
  buyerCountry?: string;
  /** Comma-separated funding list, e.g. "venmo,paylater,card" */
  enableFunding?: string;
  /** Called to create the order id */
  createOrder: () => Promise<string>;
  /** Called when payment is approved */
  onApprove: (orderId: string) => Promise<void>;
  /** Called when validation fails before paying */
  onBeforePay?: () => boolean;
  /** Optional: called right before starting any PayPal payment flow (for tracking). */
  onPayStart?: () => void;
};

declare global {
  interface Window {
    paypal: any;
  }
}

export function PayPalCardFieldsVisual({
  clientId,
  currency,
  buyerCountry,
  enableFunding,
  createOrder,
  onApprove,
  onBeforePay,
  onPayStart,
}: PayPalCardFieldsVisualProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ids = useMemo(() => {
    const rand = Math.random().toString(36).slice(2);
    return {
      name: `pp-card-name-${rand}`,
      number: `pp-card-number-${rand}`,
      expiry: `pp-card-expiry-${rand}`,
      cvv: `pp-card-cvv-${rand}`,
    };
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const callbacksRef = useRef({ createOrder, onApprove, onBeforePay, onPayStart });
  useEffect(() => {
    callbacksRef.current = { createOrder, onApprove, onBeforePay, onPayStart };
  }, [createOrder, onApprove, onBeforePay, onPayStart]);

  useEffect(() => {
    setReady(false);
    setError(null);

    if (!clientId) return;

    loadPayPalSdk({ clientId, currency, buyerCountry, enableFunding, components: "card-fields" })
      .then(() => {
        if (!mountedRef.current) return;
        setReady(true);
      })
      .catch((e: any) => {
        if (!mountedRef.current) return;
        setError(e?.message || "Falha ao carregar PayPal");
      });
  }, [clientId, currency, buyerCountry, enableFunding]);

  const cardFieldsRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !window.paypal) return;

    const paypal = window.paypal;
    const cardField = paypal.CardFields({
      createOrder: () => callbacksRef.current.createOrder(),
      onApprove: (data: any) => callbacksRef.current.onApprove(String(data.orderID)),
      onError: (err: any) => {
        console.error("PayPal CardFields error:", err);
        setError("Erro no PayPal. Tente novamente.");
      },
    });

    cardFieldsRef.current = cardField;

    // Render each field if eligible
    if (cardField.isEligible()) {
      try {
        cardField.NameField().render(`#${ids.name}`);
        cardField.NumberField().render(`#${ids.number}`);
        cardField.ExpiryField().render(`#${ids.expiry}`);
        cardField.CVVField().render(`#${ids.cvv}`);
      } catch (e) {
        console.error("PayPal CardFields render error:", e);
        setError("Não foi possível renderizar o formulário de cartão.");
      }
    } else {
      setError("Cartão não disponível para este comprador/moeda. Use PayPal.");
    }

    return () => {
      try {
        cardField?.close?.();
      } catch {
        // ignore
      }
      cardFieldsRef.current = null;
    };
  }, [ready, ids]);

  const handleSubmit = async () => {
    setError(null);

    const ok = callbacksRef.current.onBeforePay ? callbacksRef.current.onBeforePay() : true;
    if (!ok) return;

    // tracking hook: any "pay" start
    try {
      callbacksRef.current.onPayStart?.();
    } catch {
      // ignore
    }

    const cardField = cardFieldsRef.current;
    if (!cardField) {
      setError("Formulário de cartão não pronto.");
      return;
    }

    setSubmitting(true);
    try {
      await cardField.submit({});
    } catch (e: any) {
      console.error("PayPal CardFields submit error:", e);
      setError(e?.message || "Erro ao enviar pagamento.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!clientId) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Configure o PayPal Client ID em <b className="text-foreground">Configurações</b> para exibir o formulário.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Nome</div>
          <div id={ids.name} className="h-11 rounded-md border border-border bg-background px-3" />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Número do cartão</div>
          <div id={ids.number} className="h-11 rounded-md border border-border bg-background px-3" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Validade</div>
            <div id={ids.expiry} className="h-11 rounded-md border border-border bg-background px-3" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">CVV</div>
            <div id={ids.cvv} className="h-11 rounded-md border border-border bg-background px-3" />
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={!ready || submitting}>
        {submitting ? "Processando..." : "Pagar com cartão"}
      </Button>
    </div>
  );
}
