import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationModal } from "@/components/NotificationModal";
import { Checkbox } from "@/components/ui/checkbox";

// All events the webhook can fire
const WEBHOOK_EVENTS = [
  {
    id: "sale.pending",
    label: "Pedido criado",
    description: "Disparado quando um cliente inicia o pagamento",
  },
  {
    id: "sale.paid",
    label: "Pagamento confirmado",
    description: "Disparado quando o pagamento é aprovado com sucesso",
  },
  {
    id: "sale.refunded",
    label: "Reembolso realizado",
    description: "Disparado quando uma venda é reembolsada",
  },
];

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: string;
  configured: (s: typeof defaultLocal) => boolean;
  fields: {
    key: keyof typeof defaultLocal;
    label: string;
    placeholder: string;
    type?: string;
    hint?: string;
  }[];
};

const defaultLocal = {
  facebookPixelId: "",
  facebookAccessToken: "",
  utmfyToken: "",
  webhookUrl: "",
  webhookEvents: "sale.pending,sale.paid,sale.refunded",
  environment: "production",
  e2paymentsClientId: "",
  e2paymentsClientSecret: "",
  e2paymentsMpesaWalletId: "",
  e2paymentsEmolaWalletId: "",
};

const integrations: Integration[] = [
  {
    id: "e2payments",
    name: "e2Payments",
    description: "M-Pesa & e-Mola (Moçambique)",
    icon: "https://e2payments.explicador.co.mz/images/logo.png",
    configured: (s) => !!s.e2paymentsClientId && !!s.e2paymentsClientSecret,
    fields: [
      { key: "e2paymentsClientId", label: "Client ID", placeholder: "O seu Client ID do e2payments" },
      { key: "e2paymentsClientSecret", label: "Client Secret", placeholder: "O seu Client Secret", type: "password" },
      { key: "e2paymentsMpesaWalletId", label: "Wallet ID — M-Pesa", placeholder: "ID da carteira M-Pesa" },
      { key: "e2paymentsEmolaWalletId", label: "Wallet ID — e-Mola", placeholder: "ID da carteira e-Mola" },
    ],
  },
  {
    id: "webhook",
    name: "Integração Webhook",
    description: "Notificações de vendas via URL",
    icon: "https://cdn.worldvectorlogo.com/logos/webhooks.svg",
    configured: (s) => !!s.webhookUrl,
    fields: [
      {
        key: "webhookUrl",
        label: "URL do Webhook",
        placeholder: "https://seu-site.com/webhook",
        hint: "Receba notificações de vendas em tempo real nesta URL.",
      },
    ],
  },
  {
    id: "meta",
    name: "Pixel da Meta",
    description: "ID do pixel para rastreamento",
    icon: "https://static.xx.fbcdn.net/rsrc.php/y-/r/yhD4cqC_Wzs.webp",
    configured: (s) => !!s.facebookPixelId,
    fields: [
      {
        key: "facebookPixelId",
        label: "Pixel ID",
        placeholder: "Ex: 123456789012345",
      },
      {
        key: "facebookAccessToken",
        label: "Access Token",
        placeholder: "Cole aqui o token",
        type: "password",
      },
    ],
  },
  {
    id: "utmify",
    name: "UTMify",
    description: "Parâmetros UTM para campanhas",
    icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9Z5N3ZwwpiIdsxNQn2KEOV1M8afws1emhnQ&s",
    configured: (s) => !!s.utmfyToken,
    fields: [
      {
        key: "utmfyToken",
        label: "UTMify Token",
        placeholder: "Insira seu token UTMify",
        type: "password",
      },
    ],
  },
];

const integrationIconFallback: Record<string, string> = {
  e2payments: "📱",
  webhook: "🔗",
  meta: "📘",
  utmify: "📊",
};

function IntegrationIcon({ integration }: { integration: Integration }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">
        {integrationIconFallback[integration.id]}
      </div>
    );
  }
  return (
    <img
      src={integration.icon}
      alt={integration.name}
      className="w-14 h-14 object-contain rounded-2xl"
      onError={() => setFailed(true)}
    />
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const [modalSettings, setModalSettings] = useState(defaultLocal);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [localSettings, setLocalSettings] = useState(defaultLocal);

  useEffect(() => {
    if (settings) {
      const s = {
        facebookPixelId: settings.facebookPixelId || "",
        facebookAccessToken: settings.facebookAccessToken || "",
        utmfyToken: settings.utmfyToken || "",
        webhookUrl: (settings as any).webhookUrl || "",
        webhookEvents: (settings as any).webhookEvents || "sale.pending,sale.paid,sale.refunded",
        environment: settings.environment || "production",
        e2paymentsClientId: (settings as any).e2paymentsClientId || "",
        e2paymentsClientSecret: (settings as any).e2paymentsClientSecret || "",
        e2paymentsMpesaWalletId: (settings as any).e2paymentsMpesaWalletId || "",
        e2paymentsEmolaWalletId: (settings as any).e2paymentsEmolaWalletId || "",
      };
      setLocalSettings(s);
    }
  }, [settings]);

  const openModal = (integration: Integration) => {
    setModalSettings({ ...localSettings });
    setActiveIntegration(integration);
  };

  const closeModal = () => {
    setActiveIntegration(null);
  };

  const handleModalSave = async () => {
    try {
      const merged = { ...localSettings, ...modalSettings };
      await updateSettings.mutateAsync(merged as any);
      setLocalSettings(merged);
      closeModal();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Webhook event helpers
  const getSelectedEvents = (eventsStr: string): string[] =>
    eventsStr ? eventsStr.split(",").filter(Boolean) : [];

  const toggleEvent = (eventId: string) => {
    const current = getSelectedEvents(modalSettings.webhookEvents);
    const updated = current.includes(eventId)
      ? current.filter((e) => e !== eventId)
      : [...current, eventId];
    setModalSettings((prev) => ({ ...prev, webhookEvents: updated.join(",") }));
  };

  if (loading || isLoadingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Layout title="Integrações" subtitle="Conecte suas ferramentas favoritas">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const isConfigured = integration.configured(localSettings);
            return (
              <button
                key={integration.id}
                onClick={() => openModal(integration)}
                className="relative flex flex-col items-center gap-5 p-10 rounded-2xl bg-[#18181b] border border-zinc-800/60 hover:border-purple-500/50 hover:bg-[#1e1e24] transition-all duration-200 text-center group shadow-lg"
              >
                {isConfigured && (
                  <span className="absolute top-4 right-4">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </span>
                )}
                <IntegrationIcon integration={integration} />
                <div>
                  <p className="font-semibold text-white text-base leading-tight">{integration.name}</p>
                  <p className="text-sm text-zinc-400 mt-1.5 leading-tight">{integration.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeIntegration && (
        <Dialog open={!!activeIntegration} onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DialogContent className="bg-[#18181b] border border-zinc-800 text-white max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <IntegrationIcon integration={activeIntegration} />
                <div>
                  <DialogTitle className="text-white text-lg">{activeIntegration.name}</DialogTitle>
                  <p className="text-xs text-zinc-400">{activeIntegration.description}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {activeIntegration.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {field.label}
                  </label>
                  <Input
                    type={field.type || "text"}
                    value={modalSettings[field.key] as string}
                    onChange={(e) =>
                      setModalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-purple-500"
                  />
                  {field.hint && (
                    <p className="text-xs text-zinc-500">{field.hint}</p>
                  )}
                </div>
              ))}

              {/* Webhook-specific: event selection */}
              {activeIntegration.id === "webhook" && (
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Eventos a receber
                  </p>
                  <div className="space-y-1">
                    {WEBHOOK_EVENTS.map((evt) => {
                      const selected = getSelectedEvents(modalSettings.webhookEvents).includes(evt.id);
                      return (
                        <label
                          key={evt.id}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md border cursor-pointer transition-colors ${
                            selected
                              ? "border-purple-500/40 bg-purple-500/5"
                              : "border-zinc-800 hover:border-zinc-700"
                          }`}
                          onClick={() => toggleEvent(evt.id)}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleEvent(evt.id)}
                            className="border-zinc-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 shrink-0"
                          />
                          <span className="text-sm text-white flex-1">{evt.label}</span>
                          <code className="text-[10px] text-zinc-500 font-mono">{evt.id}</code>
                        </label>
                      );
                    })}
                  </div>
                  {getSelectedEvents(modalSettings.webhookEvents).length === 0 && (
                    <p className="text-xs text-amber-400 mt-1.5">
                      Seleccione pelo menos um evento.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="ghost"
                className="flex-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600"
                onClick={closeModal}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                onClick={handleModalSave}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </Layout>
  );
}
