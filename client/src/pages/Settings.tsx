import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Settings as SettingsIcon, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { NotificationModal } from "@/components/NotificationModal";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [localSettings, setLocalSettings] = useState({
    paypalClientId: "",
    paypalClientSecret: "",
    paypalWebhookId: "",
    facebookPixelId: "",
    facebookAccessToken: "",
    utmfyToken: "",
    environment: "production",
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        paypalClientId: settings.paypalClientId || "",
        paypalClientSecret: settings.paypalClientSecret || "",
        paypalWebhookId: settings.paypalWebhookId || "",
        facebookPixelId: settings.facebookPixelId || "",
        facebookAccessToken: settings.facebookAccessToken || "",
        utmfyToken: settings.utmfyToken || "",
        environment: settings.environment || "production",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Layout title="Configurações" subtitle="Gerencie suas integrações">
      <div className="flex flex-col sm:flex-row items-end justify-end gap-3 mb-6">
        <Button
          variant="ghost"
          className="flex-1 h-12 text-zinc-400 hover:text-white"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">PAYPAL</CardTitle>
              <SettingsIcon className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Client ID</label>
                  <Input
                    value={localSettings.paypalClientId}
                    onChange={(e) => setLocalSettings({ ...localSettings, paypalClientId: e.target.value })}
                    placeholder="PayPal Client ID"
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Client Secret</label>
                  <Input
                    type="password"
                    value={localSettings.paypalClientSecret}
                    onChange={(e) => setLocalSettings({ ...localSettings, paypalClientSecret: e.target.value })}
                    placeholder="PayPal Client Secret"
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Webhook ID</label>
                  <Input
                    value={localSettings.paypalWebhookId}
                    onChange={(e) => setLocalSettings({ ...localSettings, paypalWebhookId: e.target.value })}
                    placeholder="PayPal Webhook ID"
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">META PIXEL</CardTitle>
              <SettingsIcon className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Pixel ID</label>
                  <Input
                    value={localSettings.facebookPixelId}
                    onChange={(e) => setLocalSettings({ ...localSettings, facebookPixelId: e.target.value })}
                    placeholder="Ex: 123456789012345"
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Access Token</label>
                  <Input
                    type="password"
                    value={localSettings.facebookAccessToken}
                    onChange={(e) => setLocalSettings({ ...localSettings, facebookAccessToken: e.target.value })}
                    placeholder="Cole aqui o token"
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">UTMIFY</CardTitle>
              <SettingsIcon className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">UTMify Token</label>
                  <Input
                    value={localSettings.utmfyToken}
                    onChange={(e) => setLocalSettings({ ...localSettings, utmfyToken: e.target.value })}
                    placeholder="Insira seu token UTMify"
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </Layout>
  );
}