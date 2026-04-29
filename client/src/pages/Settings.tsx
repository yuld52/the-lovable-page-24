import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, User, Shield, Bell, History, Settings as SettingsIcon, CheckCircle2, Trash2, Search, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";
import { enablePush } from "@/lib/push";

export default function Settings() {
  const [isActivating, setIsActivating] = useState(false);
  const [activationStep, setActivationStep] = useState(0);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "usuario";
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || "usuario";
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handleLocationChange);
    const originalPushState = window.history.pushState;
    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      originalPushState.apply(this, [data, unused, url]);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
    };
  }, []);

  const { user, loading: loadingUser } = useUser();
  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase().trim();
    return email === "juniornegocios015@gmail.com";
  }, [user]);

  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loadingUser && !isAdmin && activeTab === "usuario") {
      setLocation("/settings?tab=integracao");
    }
  }, [isAdmin, loadingUser, activeTab, setLocation]);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
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
    return usersList.filter(u => (u.username || u.email || "").toLowerCase().includes(searchTerm.toLowerCase()));
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
    setIsCreatingUser(true);
    try {
      await apiRequest("POST", "/api/users-v2", { email: newUserEmail, password: newUserPassword });
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

  const handleToggleNotifications = async () => {
    const newState = !settings?.salesNotifications;
    if (!newState) {
      updateSettings.mutate({ salesNotifications: false });
      return;
    }
    setIsActivating(true);
    setActivationStep(1);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");
      setActivationStep(3);
      await enablePush(user);
      setActivationStep(4);
      updateSettings.mutate({ salesNotifications: true });
      setTimeout(() => setIsActivating(false), 1500);
    } catch (err: any) {
      setIsActivating(false);
      toast({ title: "Falha na ativação", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const renderUsuario = () => (
    <div className="max-w-6xl w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">Listagem de Usuários</h2>
          <Button onClick={() => setIsAddUserOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 px-6 rounded-lg flex items-center gap-2 border-0">
            <UserPlus size={18} /> Adicionar Usuário
          </Button>
        </div>
        <div className="bg-[#111114]/50 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="p-6 space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-purple-500 transition-colors" />
              <Input placeholder="Pesquise por e-mail..." className="bg-[#18181b] border-zinc-800 h-12 pl-12 text-zinc-200 placeholder:text-zinc-600 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">E-mail</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-6 py-4"><span className="text-sm text-zinc-400">{u.username || u.email}</span></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-purple-400" onClick={() => window.confirm(`Excluir ${u.email}?`) && deleteUserMutation.mutate(u.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase">E-mail</label>
              <Input placeholder="email@exemplo.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase">Senha</label>
              <Input type="password" placeholder="••••••••" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="bg-zinc-900 border-zinc-800" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddUser} disabled={isCreatingUser} className="bg-purple-600 hover:bg-purple-500 text-white font-bold">
              {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Layout title={activeTab === "usuario" ? "Gerenciar Usuários" : "Integração"} subtitle={activeTab === "usuario" ? "Visualize e gerencie usuários" : "Configure suas integrações"}>
      <div className="flex flex-col gap-6">
        {activeTab === "usuario" && renderUsuario()}
      </div>
      <Dialog open={isActivating} onOpenChange={setIsActivating}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>Ativando Notificações</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <div className={cn("flex items-center gap-3", activationStep < 2 && "opacity-50")}>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", activationStep > 2 ? "bg-green-500" : "border-zinc-700")}>
                {activationStep > 2 ? <CheckCircle2 size={16} /> : <Loader2 size={12} className="animate-spin" />}
              </div>
              <span className="text-sm">Configurando alertas</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded overflow-hidden">
              <div style={{ width: `${(activationStep / 4) * 100}%` }} className="h-full bg-purple-600 transition-all duration-500" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}