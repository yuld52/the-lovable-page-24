import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowDownToLine, CheckCircle2, XCircle, Clock, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function AdminWithdrawals() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: withdrawals, isLoading: loadingWithdrawals, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
    enabled: true
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Sucesso", description: "Saque aprovado!" });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Sucesso", description: "Saque rejeitado!" });
    }
  });

  const filteredWithdrawals = withdrawals?.filter(w => {
    const search = searchTerm.toLowerCase();
    return (
      (w.username || w.user_email || "").toLowerCase().includes(search) ||
      (w.pix_key || "").toLowerCase().includes(search)
    );
  }) || [];

  const pendingWithdrawals = filteredWithdrawals.filter(w => w.status === 'pending');
  const processedWithdrawals = filteredWithdrawals.filter(w => w.status !== 'pending');

  if (loadingWithdrawals) {
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
              <p className="text-sm text-muted-foreground">Aprove ou rejeite solicitações de saque via PIX</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white">Lista de Saques</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                  placeholder="Pesquise por e-mail ou PIX..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#18181b] border-zinc-800 h-11"
                />
              </div>
              <Button 
                onClick={() => refetch()}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Atualizar
              </Button>
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pendentes ({pendingWithdrawals.length})
            </h3>
            
            {pendingWithdrawals.length === 0 ? (
              <Card className="bg-[#18181b] border-zinc-800/60">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum saque pendente!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Chave PIX</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {pendingWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                              <ArrowDownToLine className="w-4 h-4 text-zinc-400" />
                            </div>
                            <span className="text-sm text-zinc-300">{w.username || w.user_email || "Usuário"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((w.amount || 0) / 100)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-400">{w.pix_key || w.pixKey || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-500">
                            {w.requested_at ? format(new Date(w.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                              onClick={() => approveWithdrawalMutation.mutate(w.id)}
                              disabled={approveWithdrawalMutation.isPending}
                            >
                              {approveWithdrawalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                              onClick={() => rejectWithdrawalMutation.mutate(w.id)}
                              disabled={rejectWithdrawalMutation.isPending}
                            >
                              {rejectWithdrawalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Rejeitar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Processed Withdrawals */}
          {processedWithdrawals.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-zinc-400 mb-4">Processados ({processedWithdrawals.length})</h3>
              <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {processedWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-300">{w.username || w.user_email || "Usuário"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((w.amount || 0) / 100)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {w.status === 'approved' ? (
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
                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-500">
                            {w.processed_at ? format(new Date(w.processed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}