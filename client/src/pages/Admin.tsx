import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Package, ShoppingCart, BarChart3, Loader2, ArrowRight, LogOut, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProducts, useApproveProduct, useRejectProduct } from "@/hooks/use-products";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, loading } = useUser();
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      setLocation("/admin-login");
    }
  }, [user, loading, setLocation]);

  // Fetch all users (admin only endpoint)
  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    enabled: !!user && user.email === ADMIN_EMAIL
  });

  // Fetch all products for approval
  const { data: allProducts, isLoading: loadingProducts } = useProducts();
  const { data: checkouts, isLoading: loadingCheckouts } = useQuery<any[]>({
    queryKey: ["all-checkouts-admin"],
    enabled: !!user && user.email === ADMIN_EMAIL
  });

  const approveProduct = useApproveProduct();
  const rejectProduct = useRejectProduct();

  const isLoading = loading || loadingUsers || loadingProducts || loadingCheckouts;

  const handleLogout = async () => {
    await signOut(auth);
    setLocation("/admin-login");
  };

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

  // Filter pending products
  const pendingProducts = allProducts?.filter(p => p.status === 'pending') || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  // Calculate conversion rate safely
  const conversionRate = checkouts && checkouts.length > 0 
    ? Math.round(checkouts.reduce((acc: number, c: any) => acc + (c.views || 0), 0) / checkouts.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      {/* Admin Header */}
      <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md px-8 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Painel Administrativo</h2>
            <p className="text-xs text-muted-foreground">Visão geral do sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">{user?.email}</span>
            <Button 
                onClick={handleLogout}
                variant="ghost" 
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
                <LogOut size={16} className="mr-2" />
                Sair
            </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
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
                    <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">PRODUTOS PENDENTES</CardTitle>
                    <Clock className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">
                    {pendingProducts.length}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Aguardando aprovação</p>
                </CardContent>
                </Card>
            </div>

            {/* Product Approval Section */}
            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg mb-8">
                <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base text-white">Aprovação de Produtos</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Aprove ou rejeite produtos pendentes</CardDescription>
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
                                <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                                onClick={() => handleApprove(p.id)}
                                disabled={approveProduct.isPending}
                                >
                                {approveProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Aprovar
                                </Button>
                                <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                                onClick={() => handleReject(p.id)}
                                disabled={rejectProduct.isPending}
                                >
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
        </div>
      </main>
    </div>
  );
}