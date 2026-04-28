import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, User, Shield, Bell, History, Settings as SettingsIcon, CheckCircle2, Trash2, Eye, EyeOff, Search, UserPlus, Filter, MoreHorizontal, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";
import { enablePush } from "@/lib/push";

import paypalLogo from "@assets/paypal-logo-icon-png_44635_1769721723658.jpg";
import facebookFavicon from "@/assets/facebook-favicon.ico";
import utmifyLogo from "@/assets/utmify-logo.png";

export default function Settings() {
  const [isActivating, setIsActivating] = useState(false);
  const [activationStep, setActivationStep] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "gateway";
  });

  const { user, loading: loadingUser } = useUser();
  const isAdmin = useMemo(() => user?.username === "juniornegocios015@gmail.com", [user]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loadingUser && !user) setLocation("/login");
    if (!loadingUser && !isAdmin && activeTab === "usuario") setLocation("/settings?tab=gateway");
  }, [isAdmin, loadingUser, user, activeTab, setLocation]);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const [metricsSubTab, setMetricsSubTab] = useState("pixel");
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [showFacebookToken, setShowFacebookToken] = useState(false);

  const queryClient = useQueryClient();

  const { data: usersList, isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    enabled: activeTab === "usuario" && isAdmin
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await apiRequest("DELETE", `/api/users-v2/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users-v2"] });
      toast({ title: "Usuário excluído com sucesso" });
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const filteredUsers = useMemo(() => {
    if (!usersList) return [];
    return usersList.filter(u => (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()));
  }, [usersList, searchTerm]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) return;
    setIsCreatingUser(true);
    try {
      await apiRequest("POST", "/api/register", { username: newUserEmail, password: newUserPassword });
      toast({ title: "Usuário Criado" });
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/users-v2"] });
    } catch (err: any) {
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const [form, setForm] = useState({
    paypalClientId: "",
    paypalClientSecret: "",
    paypalWebhookId: "",
    facebookPixelId: "",
    facebookAccessToken: "",
    utmfyToken: "",
    environment: "production",
    salesNotifications: false,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        paypalClientId: settings.paypalClientId || "",
        paypalClientSecret: settings.paypalClientSecret || "",
        paypalWebhookId: settings.paypalWebhookId || "",
        facebookPixelId: settings.facebookPixelId || "",
        facebookAccessToken: settings.facebookAccessToken || "",
        utmfyToken: settings.utmfyToken || "",
        environment: settings.environment || "production",
        salesNotifications: settings.salesNotifications === true,
      });
    }
  }, [settings]);

  const handleToggleNotifications = async () => {
    const newState = !form.salesNotifications;
    if (!newState) {
      const updated = { ...form, salesNotifications: false };
      setForm(updated);
      updateSettings.mutate(updated);
      return;
    }

    setIsActivating(true);
    setActivationStep(1);
    try {
      if (!user) throw new Error("Não autenticado");
      setActivationStep(2);
      await enablePush(user);
      setActivationStep(4);
      const updated = { ...form, salesNotifications: true };
      setForm(updated);
      updateSettings.mutate(updated);
      setTimeout(() => setIsActivating(false), 1000);
    } catch (err: any) {
      setIsActivating(false);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form);
      toast({ title: "Configurações salvas" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  if (isLoadingSettings || loadingUser) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <Layout title="Configurações" subtitle="Gerencie sua conta e integrações">
      <div className="flex gap-4 mb-8 border-b border-border pb-4">
        <Button variant={activeTab === "gateway" ? "default" : "ghost"} onClick={() => setActiveTab("gateway")}>Gateway</Button>
        {isAdmin && <Button variant={activeTab === "usuario" ? "default" : "ghost"} onClick={() => setActiveTab("usuario")}>Usuários</Button>}
        <Button variant={activeTab === "metricas" ? "default" : "ghost"} onClick={() => setActiveTab("metricas")}>Métricas</Button>
      </div>

      {activeTab === "gateway" && (
        <Card className="max-w-2xl bg-card border-border">
          <CardHeader>
            <CardTitle>PayPal</CardTitle>
            <CardDescription>Credenciais da API do PayPal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input value={form.paypalClientId} onChange={e => setForm({...form, paypalClientId: e.target.value})} className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <Input type="password" value={form.paypalClientSecret} onChange={e => setForm({...form, paypalClientSecret: e.target.value})} className="bg-background" />
            </div>
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">Salvar Gateway</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "usuario" && isAdmin && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Usuários do Sistema</h3>
            <Button onClick={() => setIsAddUserOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="p-4">E-mail</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="p-4">{u.username}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteUserMutation.mutate(u.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "metricas" && (
        <div className="space-y-6">
          <Card className="max-w-2xl bg-card border-border">
            <CardHeader>
              <CardTitle>Facebook & UTMfy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pixel ID</label>
                <Input value={form.facebookPixelId} onChange={e => setForm({...form, facebookPixelId: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UTMfy Token</label>
                <Input value={form.utmfyToken} onChange={e => setForm({...form, utmfyToken: e.target.value})} className="bg-background" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-bold">Notificações de Vendas</p>
                  <p className="text-xs text-muted-foreground">Alertas push em tempo real</p>
                </div>
                <Button variant={form.salesNotifications ? "default" : "outline"} onClick={handleToggleNotifications}>
                  {form.salesNotifications ? "Ativado" : "Ativar"}
                </Button>
              </div>
              <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">Salvar Métricas</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="E-mail" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
            <Input type="password" placeholder="Senha" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleAddUser} disabled={isCreatingUser}>{isCreatingUser ? <Loader2 className="animate-spin" /> : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}