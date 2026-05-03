import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Receipt } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  paypal: "PayPal",
};

function statusBadge(status: string) {
  if (status === "paid" || status === "captured")
    return <Badge className="bg-green-600 text-white">Aprovada</Badge>;
  if (status === "cancelled" || status === "rejected")
    return <Badge className="bg-red-600 text-white">Rejeitada</Badge>;
  return <Badge className="bg-yellow-500 text-black">Pendente</Badge>;
}

export default function AdminSales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sales, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/sales"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sales");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/sales/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales"] });
      toast({ title: "Venda aprovada com sucesso" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/sales/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales"] });
      toast({ title: "Venda rejeitada" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao rejeitar", description: e.message, variant: "destructive" });
    },
  });

  const pending = sales?.filter(s => s.status === "pending") || [];
  const others = sales?.filter(s => s.status !== "pending") || [];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Aprovação de Vendas</h1>
        <p className="text-muted-foreground text-sm mb-6">Gerencie pagamentos M-Pesa / e-Mola pendentes</p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground mt-20 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>A carregar vendas…</span>
          </div>
        ) : (
          <>
            {/* Pending section */}
            <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-yellow-400" />
                  Pendentes ({pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma venda pendente.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                          <th className="text-left py-2 pr-4">ID</th>
                          <th className="text-left py-2 pr-4">Cliente</th>
                          <th className="text-left py-2 pr-4">Método</th>
                          <th className="text-left py-2 pr-4">Valor (USD¢)</th>
                          <th className="text-left py-2 pr-4">Data</th>
                          <th className="text-left py-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((s: any) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">#{s.id}</td>
                            <td className="py-3 pr-4 text-foreground">{s.customerEmail || s.userId?.slice(0, 12) + "…" || "—"}</td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline">{METHOD_LABELS[s.paymentMethod] || s.paymentMethod || "—"}</Badge>
                            </td>
                            <td className="py-3 pr-4 font-semibold">{((s.amount || 0) / 100).toFixed(2)}</td>
                            <td className="py-3 pr-4 text-muted-foreground text-xs">
                              {s.createdAt ? format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                            </td>
                            <td className="py-3 flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-500 text-white h-7 px-3 text-xs gap-1"
                                onClick={() => approveMutation.mutate(s.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="w-3 h-3" /> Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-3 text-xs gap-1"
                                onClick={() => rejectMutation.mutate(s.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="w-3 h-3" /> Rejeitar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Histórico ({others.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {others.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sem histórico ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                          <th className="text-left py-2 pr-4">ID</th>
                          <th className="text-left py-2 pr-4">Cliente</th>
                          <th className="text-left py-2 pr-4">Método</th>
                          <th className="text-left py-2 pr-4">Valor (USD¢)</th>
                          <th className="text-left py-2 pr-4">Estado</th>
                          <th className="text-left py-2">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {others.map((s: any) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">#{s.id}</td>
                            <td className="py-3 pr-4 text-foreground">{s.customerEmail || s.userId?.slice(0, 12) + "…" || "—"}</td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline">{METHOD_LABELS[s.paymentMethod] || s.paymentMethod || "—"}</Badge>
                            </td>
                            <td className="py-3 pr-4 font-semibold">{((s.amount || 0) / 100).toFixed(2)}</td>
                            <td className="py-3 pr-4">{statusBadge(s.status)}</td>
                            <td className="py-3 text-muted-foreground text-xs">
                              {s.createdAt ? format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
