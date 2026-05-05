import { useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Package, ShoppingCart, Loader2, ArrowDownToLine, Receipt, TrendingUp } from "lucide-react";
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
        </div>
      </main>
    </AdminLayout>
  );
}