import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Settings as SettingsIcon, ArrowLeft, Bell, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { NotificationModal } from "@/components/NotificationModal";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      setLocation("/settings?tab=integracao");
    }
  }, [user, loading, setLocation]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLocation("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        paypalClientId: settings?.paypalClientId || "",
        paypalClientSecret: settings?.paypalClientSecret || "",
        paypalWebhookId: settings?.paypalWebhookId || "",
        facebookPixelId: settings?.facebookPixelId || "",
        facebookAccessToken: settings?.facebookAccessToken || "",
        utmfyToken: settings?.utmfyToken || "",
        environment: settings?.environment || "production",
      });
      toast({ title: "Configurações salvas!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (loading || isLoadingSettings) {
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
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Client ID</label>
                  <Input 
                    value={settings?.paypalClientId || ""}
                    onChange={(e) => updateSettings.mutate({ paypalClientId: e.target.value })}
                    placeholder="PayPal Client ID" 
                    className="bg-zinc-900 border-zinc-800" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Client Secret</label>
                  <Input 
                    type="password"
                    value={settings?.paypalClientSecret || ""}
                    onChange={(e) => updateSettings.mutate({ paypalClientSecret: e.target.value })}
                    placeholder="PayPal Client Secret" 
                    className="bg-zinc-900 border-zinc-800" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Webhook ID</label>
                  <Input 
                    value={settings?.paypalWebhookId || ""}
                    onChange={(e) => updateSettings.mutate({ paypalWebhookId: e.target.value })}
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
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Pixel ID</label>
                  <Input 
                    value={settings?.facebookPixelId || ""}
                    onChange={(e) => updateSettings.mutate({ facebookPixelId: e.target.value })}
                    placeholder="Ex: 123456789012345" 
                    className="bg-zinc-900 border-zinc-800" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Access Token</label>
                  <Input 
                    type="password"
                    value={settings?.facebookAccessToken || ""}
                    onChange={(e) => updateSettings.mutate({ facebookAccessToken: e.target.value })}
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
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">UTMify Token</label>
                  <Input 
                    value={settings?.utmfyToken || ""}
                    onChange={(e) => updateSettings.mutate({ utmfyToken: e.target.value })}
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
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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