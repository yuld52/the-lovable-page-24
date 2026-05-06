import { useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Package, ShoppingCart, Loader2, ArrowDownToLine, Receipt, TrendingUp, Crown, Medal, Flame } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminProducts, useAdminCheckouts, useAdminRevenueRanking } from "@/hooks/use-admin";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";

function fmtMT(cents: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100) + " MT";
}

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function Admin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users-v2");
      return res.json();
    },
    enabled: true
  });

  const { data: allProducts, isLoading: loadingProducts } = useAdminProducts();
  const { data: checkouts, isLoading: loadingCheckouts } = useAdminCheckouts();
  const { data: ranking } = useAdminRevenueRanking();

  const { data: withdrawals, isLoading: loadingWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/withdrawals");
      return res.json();
    },
    enabled: true
  });

  const { data: allSales, isLoading: loadingSales } = useQuery<any[]>({
    queryKey: ["/api/admin/sales"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/sales");
      return res.json();
    },
    enabled: true
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    }
  });

  const isLoading = loadingUsers || loadingProducts || loadingCheckouts || loadingWithdrawals || loadingSales;

  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending') || [];
  const totalRevenueMT = ranking?.reduce((sum: number, r: any) => sum + (r.totalRevenue || 0), 0) || 0;
  const paidSales = allSales?.filter(s => s.status === 'paid' || s.status === 'captured') || [];
  const pendingSales = allSales?.filter(s => s.status === 'pending') || [];

  const topProducts = useMemo(() => {
    if (!allSales || !allProducts) return [];
    const map: Record<number, { productId: number; salesCount: number; revenue: number }> = {};
    for (const sale of allSales) {
      if (sale.status !== 'paid' && sale.status !== 'captured') continue;
      const pid = sale.productId ?? sale.product_id;
      if (!pid) continue;
      if (!map[pid]) map[pid] = { productId: pid, salesCount: 0, revenue: 0 };
      map[pid].salesCount += 1;
      map[pid].revenue += sale.amount ?? 0;
    }
    return Object.values(map)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 10)
      .map((entry, i) => {
        const product = allProducts.find((p: any) => p.id === entry.productId);
        return { ...entry, rank: i + 1, name: product?.name || `Produto #${entry.productId}`, imageUrl: product?.imageUrl || null };
      });
  }, [allSales, allProducts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground mb-8">Visão geral do sistema</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE USUÁRIOS</CardTitle>
                    <Users className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{users?.length || 0}</div>
                    <p className="text-xs text-zinc-500 mt-1">Usuários registrados</p>
                </CardContent>
                </Card>

                <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE PRODUTOS</CardTitle>
                    <Package className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{allProducts?.length || 0}</div>
                    <p className="text-xs text-zinc-500 mt-1">Produtos cadastrados</p>
                </CardContent>
                </Card>

                <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE CHECKOUTS</CardTitle>
                    <ShoppingCart className="w-4 h-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{checkouts?.length || 0}</div>
                    <p className="text-xs text-zinc-500 mt-1">Páginas de venda</p>
                </CardContent>
                </Card>

                <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE VENDAS</CardTitle>
                    <Receipt className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{allSales?.length || 0}</div>
                    <div className="flex gap-3 mt-1">
                      <p className="text-xs text-emerald-400">{paidSales.length} pagas</p>
                      <p className="text-xs text-amber-400">{pendingSales.length} pendentes</p>
                    </div>
                </CardContent>
                </Card>

                <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">FATURAMENTO TOTAL</CardTitle>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-400">{fmtMT(totalRevenueMT)}</div>
                    <p className="text-xs text-zinc-500 mt-1">Soma de todas as vendas pagas</p>
                </CardContent>
                </Card>

                <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">SAQUES PENDENTES</CardTitle>
                    <ArrowDownToLine className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">
                      {pendingWithdrawals.length}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Aguardando aprovação</p>
                </CardContent>
                </Card>
            </div>

            {/* Top Selling Products */}
            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Produtos Mais Vendidos</CardTitle>
                    <p className="text-xs text-zinc-500 mt-0.5">Ranking por número de vendas aprovadas</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                {topProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Flame className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">Nenhuma venda aprovada ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-950/50 border-y border-zinc-800/50">
                          <th className="px-4 md:px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-12">#</th>
                          <th className="px-4 md:px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                          <th className="px-4 md:px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Vendas</th>
                          <th className="px-4 md:px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Receita</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/30">
                        {topProducts.map((p) => (
                          <tr key={p.productId} className={`hover:bg-zinc-800/20 transition-colors ${p.rank === 1 ? 'bg-orange-500/5' : p.rank === 2 ? 'bg-zinc-400/5' : p.rank === 3 ? 'bg-amber-700/5' : ''}`}>
                            <td className="px-4 md:px-6 py-3">
                              {p.rank === 1 ? (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                                </div>
                              ) : p.rank === 2 ? (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-400/20 border border-zinc-400/30">
                                  <Medal className="w-3.5 h-3.5 text-zinc-300" />
                                </div>
                              ) : p.rank === 3 ? (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 border border-amber-700/30">
                                  <Medal className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700">
                                  <span className="text-xs font-bold text-zinc-400">#{p.rank}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 md:px-6 py-3">
                              <div className="flex items-center gap-3">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-zinc-800 flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-zinc-600" />
                                  </div>
                                )}
                                <p className="text-sm text-zinc-200 font-medium truncate max-w-[140px] md:max-w-[260px]">{p.name}</p>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full ${p.rank === 1 ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-300'}`}>
                                {p.salesCount}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-3 text-right">
                              <span className="text-sm font-bold text-emerald-400">{fmtMT(p.revenue)}</span>
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