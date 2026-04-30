import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, UserPlus, Trash2, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const { data: users, isLoading: loadingUsers, refetch } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    enabled: true
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (uid: string | number) => {
      await apiRequest("DELETE", `/api/users-v2/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users-v2"] });
      toast({ title: "Usuário excluído com sucesso" });
    }
  });

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

  const filteredUsers = users?.filter(u => 
    (u.username || u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loadingUsers) {
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin")}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">Gerenciar Usuários</h1>
                <p className="text-sm text-muted-foreground">Visualize e gerencie usuários</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsAddUserOpen(true)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <UserPlus size={18} className="mr-2" /> Adicionar Usuário
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input 
                placeholder="Pesquise por e-mail..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 bg-zinc-900/50 border-zinc-800 h-12 text-zinc-200 placeholder:text-zinc-600 rounded-xl" 
              />
            </div>
          </div>

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" />
                Listagem de Usuários ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">E-mail</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-400">{u.username || u.email}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-zinc-500 hover:text-red-400"
                            onClick={() => {
                              if (confirm(`Excluir ${u.email}?`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add User Dialog */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Novo Usuário</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">E-mail</label>
                <Input 
                  placeholder="email@exemplo.com" 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Senha</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setIsAddUserOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddUser}
                disabled={isCreatingUser}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
              >
                {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Usuário"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}