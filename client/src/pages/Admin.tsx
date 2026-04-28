import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Package, ShoppingCart, BarChart3, Loader2, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/hooks/use-products";
import { useCheckouts } from "@/hooks/use-checkouts";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useEffect } from "react";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useUser();

  // Fetch all users (admin only endpoint)
  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    enabled: !!user
  });

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: checkouts, isLoading: loadingCheckouts } = useCheckouts();

  const isLoading = loadingUsers || loadingProducts || loadingCheckouts;

  if (isLoading) {
    return (
      <Layout title="Painel Administrativo" subtitle="Carregando dados...">
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  // Calculate conversion rate safely
  const conversionRate = checkouts && checkouts.length > 0 
    ? Math.round(checkouts.reduce((acc: number, c: any) => acc + (c.views || 0), 0) / checkouts.length)
    : 0;

  return (
    <Layout title="Painel Administrativo" subtitle="Visão geral do sistema e gerenciamento">
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
            <div className="text-3xl font-bold text-white">{products?.length || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">Produtos ativos</p>
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
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TAXA DE CONVERSÃO</CardTitle>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {conversionRate}%
            </div>
            <p className="text-xs text-zinc-500 mt-1">Média de visualizações</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base text-white">Gerenciamento de Usuários</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Adicione, remova ou gerencie usuários do sistema</CardDescription>
              </div>
            </div>
            <Button 
              onClick={() => setLocation("/settings?tab=usuario")}
              className="bg-zinc-800 hover:bg-zinc-700 text-white border-0"
            >
              Gerenciar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
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
                {users?.slice(0, 5).map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4"><span className="text-sm text-zinc-400">{u.email}</span></td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-zinc-500">Admin</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}