import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Clock, CheckCircle2, XCircle, Check, ArrowLeft, Package } from "lucide-react";
import { useAdminProducts, useAdminApproveProduct, useAdminRejectProduct } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: products, isLoading, refetch } = useAdminProducts();
  const approveProduct = useAdminApproveProduct();
  const rejectProduct = useAdminRejectProduct();

  const pendingProducts = products?.filter(p => p.status === 'pending') || [];

  const handleApprove = async (id: number) => {
    try {
      await approveProduct.mutateAsync(id);
      toast({ title: "Sucesso", description: "Produto aprovado!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Tem certeza que deseja rejeitar este produto?")) return;
    try {
      await rejectProduct.mutateAsync(id);
      toast({ title: "Sucesso", description: "Produto rejeitado!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

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
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Aprovação de Produtos</h1>
              <p className="text-sm text-muted-foreground">Aprove ou rejeite produtos pendentes</p>
            </div>
          </div>

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Produtos Pendentes</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      {pendingProducts.length} produto(s) aguardando aprovação
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingProducts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum produto pendente!</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Preço</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                      {pendingProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-zinc-900 flex items-center justify-center">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                                ) : (
                                  <Package className="w-5 h-5 text-zinc-600" />
                                )}
                              </div>
                              <span className="text-sm text-zinc-300">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-zinc-400">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.price / 100)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full w-fit">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Pendente</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white h-8" onClick={() => handleApprove(Number(p.id))} disabled={approveProduct.isPending}>
                                {approveProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8" onClick={() => handleReject(Number(p.id))} disabled={rejectProduct.isPending}>
                                {rejectProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}