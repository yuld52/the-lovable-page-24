import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowDownToLine, CheckCircle2, XCircle, Clock, ArrowLeft, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

interface Withdrawal {
  id: number;
  userId: string;
  userEmail?: string;
  amount: number;
  pixKey: string;
  method: string;
  status: string;
  createdAt: string;
}

export default function AdminWithdrawals() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: withdrawals, isLoading, refetch } = useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals"],
    enabled: true
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Status atualizado!" });
    }
  });

  const handleApprove = async (id: number) => {
    if (!confirm("Confirmar aprovação deste saque?")) return;
    try {
      await updateStatusMutation.mutateAsync({ id, status: "approved" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Confirmar rejeição deste saque?")) return;
    try {
      await updateStatusMutation.mutateAsync({ id, status: "rejected" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const filteredWithdrawals = withdrawals?.filter(w => {
    const matchesSearch = (w.userEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.pixKey || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Aprovação de Saques</h1>
              <p className="text-sm text-muted-foreground">Aprove ou rejeite solicitações de saque</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input 
                placeholder="Pesquise por e-mail ou chave PIX..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 bg-zinc-900/50 border-zinc-800 h-12 text-zinc-200 placeholder:text-zinc-600 rounded-xl" 
              />
            </div>
            <div className="w-full sm:w-48">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-12 rounded-xl bg-zinc-900/50 border-zinc-800 text-zinc-200 px-4"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="approved">Aprovados</option>
                <option value="rejected">Rejeitados</option>
              </select>
            </div>
            <Button 
              onClick={() => refetch()}
              className="bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Atualizar
            </Button>
          </div>

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <ArrowDownToLine className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Solicitações de Saque</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      {filteredWithdrawals.length} saque(s) encontrado(s)
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredWithdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <ArrowDownToLine className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum saque encontrado com este filtro.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Chave PIX</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                      {filteredWithdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm text-zinc-300 truncate block max-w-[200px]">
                              {w.userEmail || "Usuário"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-white">
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(w.amount / 100)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-zinc-400 truncate block max-w-[200px]">
                              {w.pixKey}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-zinc-500">
                              {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {w.status === 'pending' ? (
                              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full w-fit">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Pendente</span>
                              </div>
                            ) : w.status === 'approved' ? (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Aprovado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full w-fit">
                                <XCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Rejeitado</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {w.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                                  onClick={() => handleApprove(w.id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  {updateStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                                  onClick={() => handleReject(w.id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  {updateStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                  Rejeitar
                                </Button>
                              </div>
                            )}
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
    </div>
  );
}