import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, UserPlus, Trash2, Search, RefreshCw, Package, ShoppingCart, ArrowDownToLine, ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState<string | number | null>(null);
  const [userToToggleId, setUserToToggleId] = useState<{ uid: string; disable: boolean } | null>(null);

  const { data: users, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    enabled: true,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (uid: string | number) => {
      await apiRequest("DELETE", `/api/users-v2/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users-v2"] });
      toast({ title: "Utilizador eliminado com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao eliminar", description: err.message, variant: "destructive" });
    },
  });

  const disableUserMutation = useMutation({
    mutationFn: async ({ uid, disable }: { uid: string; disable: boolean }) => {
      await apiRequest("POST", `/api/users-v2/${uid}/${disable ? "disable" : "enable"}`);
    },
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users-v2"] });
      toast({ title: vars.disable ? "Acesso bloqueado" : "Acesso desbloqueado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({ title: "Campos obrigatórios", description: "Preencha e-mail e senha", variant: "destructive" });
      return;
    }
    setIsCreatingUser(true);
    try {
      await apiRequest("POST", "/api/users-v2", { email: newUserEmail, password: newUserPassword });
      toast({ title: "Utilizador criado com sucesso!" });
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

  const filteredUsers = (users || []).filter((u) =>
    (u.email || u.username || u.uid || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = filteredUsers.reduce((s: number, u: any) => s + (u.products || 0), 0);
  const totalSales = filteredUsers.reduce((s: number, u: any) => s + (u.sales || 0), 0);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
              <p className="text-sm text-muted-foreground">Todos os utilizadores registados na plataforma</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-border text-foreground/80 hover:bg-accent gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </Button>
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-foreground gap-1.5"
              >
                <UserPlus size={16} />
                Adicionar Usuário
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border/60 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{(users || []).length}</p>
                <p className="text-xs text-muted-foreground">Total de Utilizadores</p>
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
                <p className="text-xs text-muted-foreground">Total de Produtos</p>
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSales}</p>
                <p className="text-xs text-muted-foreground">Total de Vendas</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-5">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50 border-border h-10 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-0">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Utilizadores ({filteredUsers.length}{searchTerm ? ` de ${(users || []).length}` : ""})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Nenhum utilizador encontrado." : "Nenhum utilizador cadastrado."}
                  </p>
                </div>
              ) : (
                <div className="rounded-b-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-muted/80 border-y border-border/50">
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Utilizador</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Estado</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Produtos</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Vendas</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Saques</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registado em</th>
                        <th className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredUsers.map((u) => (
                        <tr key={u.id || u.uid} className={`hover:bg-accent/20 transition-colors ${u.disabled ? "opacity-60" : ""}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-sm font-bold ${u.disabled ? "bg-zinc-800/40 border-border text-muted-foreground" : "bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-border text-purple-300"}`}>
                                {(u.email || u.username || "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-zinc-200 truncate max-w-[220px]">{u.email || u.username || u.uid}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">{u.uid || u.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {u.disabled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                                <ShieldOff className="w-3 h-3" /> Bloqueado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                                <ShieldCheck className="w-3 h-3" /> Activo
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Package className="w-3 h-3 text-purple-400 shrink-0" />
                              <span className="text-sm font-semibold text-foreground/80">{u.products || 0}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <ShoppingCart className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="text-sm font-semibold text-foreground/80">{u.sales || 0}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <ArrowDownToLine className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="text-sm font-semibold text-foreground/80">{u.withdrawals || 0}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-muted-foreground">
                              {u.createdAt
                                ? format(new Date(u.createdAt), "dd/MM/yyyy", { locale: ptBR })
                                : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${u.disabled ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"}`}
                                title={u.disabled ? "Desbloquear acesso" : "Bloquear acesso"}
                                onClick={() => {
                                  setUserToToggleId({ uid: u.uid || u.id, disable: !u.disabled });
                                }}
                                disabled={disableUserMutation.isPending}
                              >
                                {u.disabled ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                title="Eliminar utilizador"
                                onClick={() => {
                                  setUserToDeleteId(u.uid || u.id);
                                }}
                                disabled={deleteUserMutation.isPending}
                              >
                                {deleteUserMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={(v) => !v && setIsAddUserOpen(false)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-red-400" />
              Novo Utilizador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">E-mail</label>
              <Input
                placeholder="email@exemplo.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="bg-muted/50 border-border"
                onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
                className="flex-1 border-border text-foreground/80"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={isCreatingUser}
                className="flex-1 bg-red-600 hover:bg-red-500 text-foreground"
              >
                {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Utilizador"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={userToDeleteId !== null} onOpenChange={(open) => { if (!open) setUserToDeleteId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle>Eliminar Utilizador</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Tem certeza que deseja eliminar este utilizador permanentemente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="bg-muted hover:bg-muted/80 border-border text-foreground flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white flex-1"
              onClick={() => {
                if (userToDeleteId) {
                  deleteUserMutation.mutate(userToDeleteId);
                  setUserToDeleteId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Access Confirmation */}
      <AlertDialog open={userToToggleId !== null} onOpenChange={(open) => { if (!open) setUserToToggleId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${userToToggleId?.disable ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                {userToToggleId?.disable ? <ShieldOff className="w-5 h-5 text-amber-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              </div>
              <AlertDialogTitle>{userToToggleId?.disable ? "Bloquear Acesso" : "Desbloquear Acesso"}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Tem certeza que deseja {userToToggleId?.disable ? "bloquear" : "desbloquear"} o acesso deste utilizador à plataforma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="bg-muted hover:bg-muted/80 border-border text-foreground flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={`${userToToggleId?.disable ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white flex-1`}
              onClick={() => {
                if (userToToggleId) {
                  disableUserMutation.mutate(userToToggleId);
                  setUserToToggleId(null);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
