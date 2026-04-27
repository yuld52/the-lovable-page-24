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
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";
import { enablePush } from "@/lib/push";

import paypalLogo from "@assets/paypal-logo-icon-png_44635_1769721723658.jpg";

import facebookFavicon from "@/assets/facebook-favicon.ico";
import utmifyLogo from "@/assets/utmify-logo.jfif";

export default function Settings() {
  useLocation();
  const [isActivating, setIsActivating] = useState(false);
  const [activationStep, setActivationStep] = useState(0);

  // Using a separate state for activeTab that syncs with URL
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "gateway";
  });

  // Sync state with URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || "gateway";
      setActiveTab(tab);
    };

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', handleLocationChange);

    // Create a custom event for pushState/replaceState since wouter uses them
    const originalPushState = window.history.pushState;
    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      originalPushState.apply(this, [data, unused, url]);
      handleLocationChange();
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
      originalReplaceState.apply(this, [data, unused, url]);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const { user, loading: loadingUser } = useUser();
  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase().trim();
    const adminEmail = "juniornegocios015@gmail.com";
    const match = email === adminEmail;
    console.log(`[Auth Debug] Current User: ${email}, Admin email: ${adminEmail}, Match: ${match}`);
    return match;
  }, [user]);

  const [, setLocation] = useLocation();

  // Redirect if non-admin tries to access "usuario" tab
  useEffect(() => {
    if (!loadingUser && !isAdmin && activeTab === "usuario") {
      console.warn("[Auth Debug] Redirecting non-admin user from usuarios tab");
      setLocation("/settings?tab=gateway");
    }
  }, [isAdmin, loadingUser, activeTab, setLocation]);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const [metricsSubTab, setMetricsSubTab] = useState("pixel");
  const [lastMetricsSavedAt, setLastMetricsSavedAt] = useState<string | null>(null);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [showFacebookToken, setShowFacebookToken] = useState(false);

  const queryClient = useQueryClient();

  const { data: usersList, isLoading: isLoadingUsers, error: usersError } = useQuery<any[]>({
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
    },
    onError: () => {
      toast({ title: "Erro ao excluir usuário", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (usersError) {
      console.error("[Users Debug] Query Error:", usersError);
    }
    if (usersList) {
      console.log("[Users Debug] Users List Received:", usersList);
    }
  }, [usersList, usersError]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = useMemo(() => {
    if (!usersList) return [];
    console.log("[Users Debug] Filtering users:", usersList.length);
    return usersList.filter(u => {
      const searchTarget = (u.username || u.email || "").toLowerCase();
      return searchTarget.includes(searchTerm.toLowerCase());
    });
  }, [usersList, searchTerm]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({ title: "Campos obrigatórios", description: "Preencha e-mail e senha", variant: "destructive" });
      return;
    }

    // Check if email already exists in usersList
    const emailExists = usersList?.some(u => u.username.toLowerCase() === newUserEmail.toLowerCase());
    if (emailExists) {
      toast({ title: "Erro ao criar", description: "Este e-mail já está em uso por outro usuário.", variant: "destructive" });
      return;
    }

    setIsCreatingUser(true);
    try {
      // Use our server-side API to create users without kicking off the admin session
      const response = await apiRequest("POST", "/api/users-v2", {
        email: newUserEmail,
        password: newUserPassword
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar usuário.");
      }

      toast({
        title: "Usuário Criado",
        description: "O usuário foi criado com sucesso! Ele já pode acessar o sistema."
      });

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
    checkoutLanguage: "pt" as "pt" | "en" | "es" | "AUTO",

    // tracking toggles (defaults on)
    metaEnabled: true,
    utmfyEnabled: true,
    trackTopFunnel: true,
    trackCheckout: true,
    trackPurchaseRefund: true,
    salesNotifications: false,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        paypalClientId: settings.paypalClientId || "",
        paypalClientSecret: settings.paypalClientSecret || "",
        paypalWebhookId: settings.paypalWebhookId || "",
        facebookPixelId: settings.facebookPixelId || "",
        facebookAccessToken: (settings as any).facebookAccessToken || "",
        utmfyToken: settings.utmfyToken || "",
        environment: "production",
        checkoutLanguage: "AUTO",
        metaEnabled: true,
        utmfyEnabled: true,
        trackTopFunnel: true,
        trackCheckout: true,
        trackPurchaseRefund: true,
        salesNotifications: settings.salesNotifications === true,
      });
    }
  }, [settings]);

  const handleToggleNotifications = async () => {
    const newState = !form.salesNotifications;
    const updatedForm = { ...form, salesNotifications: newState };
    
    if (!newState) {
      setForm(updatedForm);
      updateSettings.mutate(updatedForm);
      toast({ title: "Notificações Desativadas" });
      return;
    }

    setIsActivating(true);
    setActivationStep(1);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");

      setActivationStep(2);
      await new Promise(r => setTimeout(r, 500));
      
      setActivationStep(3);
      const pushPromise = enablePush(user);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("O processo demorou muito. Verifique sua conexão.")), 60000)
      );
      
      await Promise.race([pushPromise, timeoutPromise]);
      
      setActivationStep(4);
      setForm(updatedForm);
      updateSettings.mutate(updatedForm);

      setTimeout(() => {
        setIsActivating(false);
        toast({ title: "Sucesso!", description: "Notificações ativadas perfeitamente!" });
      }, 1500);

    } catch (err: any) {
      console.error("[Notifications] Error:", err);
      setIsActivating(false);
      setForm(form);
      toast({
        title: "Falha na ativação",
        description: err?.message || String(err) || "Erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    // Gateway (PayPal): verificar se há credenciais preenchidas
    if (activeTab === "gateway") {
      const hasClientId = String(form.paypalClientId || "").trim().length > 0;
      const hasClientSecret = String(form.paypalClientSecret || "").trim().length > 0;
      if (!hasClientId || !hasClientSecret) {
        toast({
          title: "Erro ao salvar",
          description: "Insira as credenciais do PayPal (Client ID e Client Secret).",
          variant: "destructive",
        });
        return;
      }
    }

    // Facebook Pixel: não permitir salvar sem Access Token quando Pixel ID estiver preenchido
    if (activeTab === "metricas" && metricsSubTab === "pixel") {
      const hasPixel = String(form.facebookPixelId || "").trim().length > 0;
      const hasToken = String(form.facebookAccessToken || "").trim().length > 0;
      if (!hasPixel && !hasToken) {
        toast({
          title: "Erro ao salvar",
          description: "Insira as credenciais do Facebook (Pixel ID e Access Token).",
          variant: "destructive",
        });
        return;
      }
      if (hasPixel && !hasToken) {
        toast({
          title: "Erro ao salvar",
          description: "Para salvar o Facebook, informe também o Access Token.",
          variant: "destructive",
        });
        return;
      }
      if (!hasPixel && hasToken) {
        toast({
          title: "Erro ao salvar",
          description: "Para salvar o Facebook, informe também o Pixel ID.",
          variant: "destructive",
        });
        return;
      }
    }

    // UTMfy: verificar se há token preenchido
    if (activeTab === "metricas" && metricsSubTab === "utmfy") {
      const hasToken = String(form.utmfyToken || "").trim().length > 0;
      if (!hasToken) {
        toast({
          title: "Erro ao salvar",
          description: "Insira o token do UTMfy.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await updateSettings.mutateAsync(form);
      if (activeTab === "metricas") setLastMetricsSavedAt(new Date().toISOString());
      toast({
        title: "Configurações salvas",
        description: "Suas credenciais foram atualizadas com sucesso.",
      });
    } catch (error) {
      const err = error as any;
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Não foi possível salvar as alterações.";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const renderGateway = () => (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg mb-8">
        <CardHeader className="border-b border-zinc-800/50 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-zinc-800/50 overflow-hidden p-1.5">
                <img src={paypalLogo} alt="PayPal" className="w-full h-full object-contain" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">PayPal </CardTitle>
                <CardDescription className="text-zinc-500">
                  Configure suas credenciais de API do PayPal para processar pagamentos.
                </CardDescription>
              </div>
            </div>
            {(form.paypalClientId || form.paypalClientSecret || form.paypalWebhookId) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                disabled={updateSettings.isPending}
                onClick={async () => {
                  if (window.confirm("Tem certeza que deseja apagar as credenciais do PayPal?")) {
                    const updatedForm = { ...form, paypalClientId: "", paypalClientSecret: "", paypalWebhookId: "" };
                    setForm(updatedForm);
                    try {
                      await updateSettings.mutateAsync(updatedForm);
                      toast({ title: "Credenciais apagadas", description: "As credenciais do PayPal foram removidas permanentemente." });
                    } catch (error) {
                      toast({ title: "Erro ao apagar", description: "Não foi possível remover as credenciais.", variant: "destructive" });
                    }
                  }
                }}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Client ID</label>
            <Input
              className="bg-zinc-900 border-zinc-800 font-mono text-xs"
              value={form.paypalClientId}
              onChange={(e) => setForm({ ...form, paypalClientId: e.target.value })}
              placeholder="Ex: Ad3s8..."
              autoComplete="off"
              data-form-type="other"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Client Secret</label>
            <div className="relative">
              <Input
                type={showPaypalSecret ? "text" : "password"}
                className="bg-zinc-900 border-zinc-800 font-mono text-xs pr-10"
                value={form.paypalClientSecret}
                onChange={(e) => setForm({ ...form, paypalClientSecret: e.target.value })}
                placeholder="••••••••••••••••••••••••"
                autoComplete="new-password"
                data-form-type="other"
              />
              <button
                type="button"
                onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showPaypalSecret ? "Ocultar" : "Mostrar"}
              >
                {showPaypalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-400">Webhook ID (Opcional)</label>
              {form.paypalWebhookId && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  CONECTADO
                </div>
              )}
            </div>
            <Input
              className="bg-zinc-900 border-zinc-800 font-mono text-xs"
              value={form.paypalWebhookId}
              onChange={(e) => setForm({ ...form, paypalWebhookId: e.target.value })}
              placeholder="Ex: 4JH..."
              autoComplete="off"
              data-form-type="other"
            />
            <p className="text-xs text-zinc-600">
              Necessário para atualizações de status de pagamento em tempo real.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 border-0"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Gateway
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUsuario = () => {
    return (
      <div className="max-w-6xl w-full animate-in fade-in slide-in-from-bottom-2 duration-300">

        {isAdmin ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">Listagem de Usuários</h2>
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 px-6 rounded-lg flex items-center gap-2 border-0"
              >
                <UserPlus size={18} />
                Adicionar Usuário
              </Button>
            </div>

            <div className="bg-[#111114]/50 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
              <div className="p-6 space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col gap-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      placeholder="Pesquise por e-mail..."
                      className="bg-[#18181b] border-zinc-800 h-12 pl-12 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-purple-500/20 focus-visible:border-purple-500/50 rounded-xl transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Table and Add Dialog */}
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Novo Usuário</DialogTitle>
                      <DialogDescription className="text-zinc-500">
                        Insira as credenciais para o novo membro.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">E-mail</label>
                        <Input
                          placeholder="email@exemplo.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="bg-zinc-900 border-zinc-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Senha</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="bg-zinc-900 border-zinc-800"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setIsAddUserOpen(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddUser}
                        disabled={isCreatingUser}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                      >
                        {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Usuário"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">E-mail</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                      {isLoadingUsers ? (
                        <tr>
                          <td colSpan={2} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                              <span className="text-zinc-500 text-sm">Carregando usuários...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-6 py-20 text-center text-zinc-600">
                            {usersList ? "Nenhum usuário encontrado com este filtro/pesquisa." : "Erro ao carregar lista ou lista vazia."}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="text-sm text-zinc-400">{u.username || u.email || "Sem e-mail"}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all font-bold"
                                  onClick={() => {
                                    const email = u.username || u.email || "este usuário";
                                    if (window.confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) {
                                      deleteUserMutation.mutate(u.id);
                                    }
                                  }}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null /* Redirection handled by useEffect */}
      </div>
    );
  };

  const renderMetricas = () => (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-6 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 w-fit">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMetricsSubTab("pixel")}
          className={cn(
            "h-9 px-4 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2",
            metricsSubTab === "pixel"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
          )}
        >
          <img
            src={facebookFavicon}
            alt="Facebook"
            className="w-5 h-5 rounded-sm"
            loading="lazy"
          />
          Facebook
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMetricsSubTab("utmfy")}
          className={cn(
            "h-9 px-4 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2",
            metricsSubTab === "utmfy"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
          )}
        >
          <img
            src={utmifyLogo}
            alt="UTMify"
            className="w-5 h-5 rounded-sm"
            loading="lazy"
          />
          UTMfy
        </Button>
      </div>

      {/* checklist removido */}


      <div className="mb-8">
        {metricsSubTab === "pixel" ? (

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg max-w-2xl">
            <CardHeader className="border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 overflow-hidden">
                    <img
                      src={facebookFavicon}
                      alt="Facebook"
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Facebook</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">Acompanhe suas conversões no Facebook</CardDescription>
                  </div>
                </div>
                {(form.facebookPixelId || form.facebookAccessToken) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    disabled={updateSettings.isPending}
                    onClick={async () => {
                      if (window.confirm("Tem certeza que deseja apagar as credenciais do Facebook?")) {
                        const updatedForm = { ...form, facebookPixelId: "", facebookAccessToken: "" };
                        setForm(updatedForm);
                        try {
                          await updateSettings.mutateAsync(updatedForm);
                          toast({ title: "Credenciais apagadas", description: "As credenciais do Facebook foram removidas permanentemente." });
                        } catch (error) {
                          toast({ title: "Erro ao apagar", description: "Não foi possível remover as credenciais.", variant: "destructive" });
                        }
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* eventos sempre ativos (sem toggle) */}

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Pixel ID</label>
                <Input
                  className="bg-zinc-900 border-zinc-800 text-sm h-11"
                  value={form.facebookPixelId}
                  onChange={(e) => setForm({ ...form, facebookPixelId: e.target.value })}
                  placeholder="Ex: 123456789012345"
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Access Token</label>
                <div className="relative">
                  <Input
                    type={showFacebookToken ? "text" : "password"}
                    className="bg-zinc-900 border-zinc-800 text-sm h-11 font-mono pr-10"
                    value={form.facebookAccessToken}
                    onChange={(e) => setForm({ ...form, facebookAccessToken: e.target.value })}
                    placeholder="Cole aqui o token do produtor"
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFacebookToken(!showFacebookToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showFacebookToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <Shield className="w-3 h-3" />
                Os eventos serão enviados automaticamente via API de Conversões.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg max-w-2xl">
            <CardHeader className="border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 overflow-hidden">
                    <img
                      src={utmifyLogo}
                      alt="UTMify"
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">UTMfy</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">Rastreamento avançado de origens</CardDescription>
                  </div>
                </div>
                {form.utmfyToken && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    disabled={updateSettings.isPending}
                    onClick={async () => {
                      if (window.confirm("Tem certeza que deseja apagar o token do UTMfy?")) {
                        const updatedForm = { ...form, utmfyToken: "" };
                        setForm(updatedForm);
                        try {
                          await updateSettings.mutateAsync(updatedForm);
                          toast({ title: "Credencial apagada", description: "O token do UTMfy foi removido permanentemente." });
                        } catch (error) {
                          toast({ title: "Erro ao apagar", description: "Não foi possível remover o token.", variant: "destructive" });
                        }
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* eventos sempre ativos (sem toggle) */}


              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">UTMfy Token</label>
                <Input
                  className="bg-zinc-900 border-zinc-800 text-sm h-11"
                  value={form.utmfyToken}
                  onChange={(e) => setForm({ ...form, utmfyToken: e.target.value })}
                  placeholder="Insira seu token UTMfy"
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <History className="w-3 h-3" />
                Conecte sua conta para sincronizar dados de rastreio.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg max-w-2xl mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-zinc-400" />
            <CardTitle className="text-base text-white">Notificações</CardTitle>
          </div>
          <CardDescription className="text-xs text-zinc-500">
            Alertas e avisos relacionados a métricas.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-4 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-zinc-200">Alertas de Vendas</p>
                    <p className="text-xs text-zinc-500">Avisos de novos pedidos em tempo real (Push)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {form.salesNotifications && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-[10px] font-bold text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all border border-zinc-800"
                        onClick={async () => {
                          try {
                            const res = await apiRequest("POST", "/api/push/test", {});
                            if (res.ok) {
                              toast({ title: "Teste Enviado", description: "Verifique se recebeu a notificação." });
                            } else {
                              throw new Error("Falha ao enviar teste.");
                            }
                          } catch (err: any) {
                            toast({ title: "Erro no Teste", description: err.message, variant: "destructive" });
                          }
                        }}
                      >
                        TESTAR NOTIFICAÇÃO
                      </Button>
                    )}
                    <div
                      className={cn(
                        "w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-200",
                        form.salesNotifications ? "bg-purple-600" : "bg-zinc-700"
                      )}
                      onClick={handleToggleNotifications}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200",
                          form.salesNotifications ? "right-1" : "left-1"
                        )}
                      />
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-start mb-8">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg h-12 px-8 border-0"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configurações de Métricas
        </Button>
      </div>
    </div>
  );

  return (
    <Layout
      title={activeTab === "gateway" ? "Configurações de Gateway" : activeTab === "usuario" ? "Gerenciar Usuários" : "Métricas dos Negócios"}
      subtitle={activeTab === "gateway" ? "Gerencie suas credenciais de pagamento" : activeTab === "usuario" ? "Visualize e gerencie usuários da plataforma" : "Acompanhe a performance do seu negócio"}
    >
      <div className="flex flex-col gap-6">
        {activeTab === "gateway" && renderGateway()}
        {activeTab === "usuario" && renderUsuario()}
        {activeTab === "metricas" && renderMetricas()}
      </div>

      {/* Activation Progress Dialog - Moved here for correct scoping */}
      <Dialog open={isActivating} onOpenChange={(open) => !open && setIsActivating(false)}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Ativando Notificações
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Estamos a configurar os seus alertas. Por favor, mantenha esta janela aberta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="space-y-4">
              <div className={cn("flex items-center gap-3 transition-opacity", activationStep < 2 ? "opacity-50" : "opacity-100")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", activationStep > 2 ? "bg-green-500 border-green-500" : "border-zinc-700")}>
                  {activationStep > 2 ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                <span className="text-sm font-medium">Verificando compatibilidade do navegador</span>
              </div>

              <div className={cn("flex items-center gap-3 transition-opacity", activationStep < 3 ? "opacity-50" : "opacity-100")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", activationStep > 3 ? "bg-green-500 border-green-500" : "border-zinc-700")}>
                  {activationStep > 3 ? <CheckCircle2 className="w-4 h-4 text-white" /> : activationStep === 3 ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                </div>
                <span className="text-sm font-medium">Solicitando permissão e configurando alertas</span>
              </div>

              <div className={cn("flex items-center gap-3 transition-opacity", activationStep < 4 ? "opacity-50" : "opacity-100")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", activationStep >= 4 ? "bg-green-500 border-green-500" : "border-zinc-700")}>
                  {activationStep >= 4 ? <CheckCircle2 className="w-4 h-4 text-white" /> : activationStep === 4 ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                </div>
                <span className="text-sm font-medium">Sincronizando com a nuvem Meteorfy</span>
              </div>
            </div>

            <div className="relative pt-1">
              <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded bg-zinc-800">
                <div 
                  style={{ width: `${(activationStep / 4) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600 transition-all duration-500"
                />
              </div>
              <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest font-bold">
                Passo {activationStep} de 4
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
