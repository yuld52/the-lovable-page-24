import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowDownToLine, CheckCircle2, XCircle, Clock, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> Aprovado
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <XCircle className="w-3 h-3" /> Rejeitado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
      <Clock className="w-3 h-3" /> Pendente
    </span>
  );
}

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  const { data: withdrawals, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
    enabled: true,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Saque aprovado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Saque rejeitado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (withdrawals || []).filter((w) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      (w.username || w.userEmail || "").toLowerCase().includes(search) ||
      (w.pixKey || "").toLowerCase().includes(search);
    const matchTab = activeTab === "all" || w.status === "pending";
    return matchSearch && matchTab;
  });

  const pendingCount = (withdrawals || []).filter((w) => w.status === "pending").length;
  const allCount = withdrawals?.length || 0;

  const tabs = [
    { key: "pending" as const, label: "Pendentes", count: pendingCount },
    { key: "all" as const, label: "Todos", count: allCount },
  ];

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
              <h1 className="text-3xl font-bold text-white">Aprovação de Saques</h1>
              <p className="text-sm text-muted-foreground">Aprove ou rejeite solicitações de saque</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por e-mail ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-border h-10 w-72 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-border text-foreground/80 hover:bg-accent gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-xl border border-border/60 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-zinc-800 text-white shadow"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted ${
                  activeTab === tab.key && tab.key === "pending" ? "text-amber-400" : "text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <Card className="bg-card border-border/60 shadow-lg">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {activeTab === "pending" ? "Nenhum saque pendente!" : "Nenhum saque encontrado."}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/80 border-b border-border/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conta</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filtered.map((w) => (
                        <tr key={w.id} className="hover:bg-accent/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                                <ArrowDownToLine className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <span className="text-sm text-foreground/80">{w.username || w.userEmail || "Usuário"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-white">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                (w.amount || 0) / 100
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground font-mono">{w.pixKey || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-muted-foreground">
                              {w.requestedAt
                                ? format(new Date(w.requestedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={w.status || "pending"} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            {w.status === "pending" && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 gap-1.5"
                                  onClick={() => approveMutation.mutate(w.id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  {approveMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 gap-1.5"
                                  onClick={() => {
                                    if (confirm("Rejeitar este saque?")) rejectMutation.mutate(w.id);
                                  }}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                >
                                  {rejectMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  Rejeitar
                                </Button>
                              </div>
                            )}
                            {w.status !== "pending" && (
                              <span className="text-xs text-muted-foreground italic">
                                {w.processedAt
                                  ? format(new Date(w.processedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                  : "—"}
                              </span>
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
    </AdminLayout>
  );
}
