import { useEffect } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { user, loading } = useUser();
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalClientSecret, setPaypalClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      setLocation("/admin-login");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (settings) {
      setPaypalClientId(settings.paypalClientId || "");
      setPaypalClientSecret(settings.paypalClientSecret || "");
    }
  }, [settings]);

  const handleSaveSystemSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync({ paypalClientId, paypalClientSecret });
      toast({ title: "Sucesso", description: "Configurações do sistema salvas!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Configurações do Sistema</h1>
              <p className="text-sm text-muted-foreground">Gerencie as configurações globais da plataforma</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <SettingsIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">PayPal (Sistema)</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">Configuração global de PayPal</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Client ID</label>
                  <Input value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} placeholder="PayPal Client ID" className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Client Secret</label>
                  <Input type="password" value={paypalClientSecret} onChange={(e) => setPaypalClientSecret(e.target.value)} placeholder="PayPal Client Secret" className="bg-zinc-900 border-zinc-800" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <SettingsIcon className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Informações do Sistema</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">Status e informações gerais</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-zinc-300">Versão: 1.0.0</p>
                  <p className="text-sm text-zinc-300">Ambiente: {settings?.environment || "sandbox"}</p>
                  <p className="text-sm text-zinc-300">Banco de Dados: LocalStorage (Navegador)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveSystemSettings} disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Configurações
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}