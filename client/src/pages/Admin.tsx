import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Package, ShoppingCart, BarChart3, Loader2, ArrowRight, LogOut, CheckCircle2, XCircle, Clock, ArrowDownToLine } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminProducts, useAdminCheckouts, useAdminApproveProduct, useAdminRejectProduct } from "@/hooks/use-admin";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useLocation } = "wouter";
import { useUser } = "@/hooks/use-user";
import { auth } = "@/lib/firebase";
import { signOut } = "firebase/auth";
import { useToast } = "@/hooks/use-toast";
import { format } = "date-fns";
import { ptBR } = "date-fns/locale";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function Admin() {
  const [, setLocation] = useLocation();
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
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users-v2");
      return res.json();
    },
    enabled: !!user && user.email === ADMIN_EMAIL
  });

  // Fetch ALL products for admin approval
  const { data: allProducts, isLoading: loadingProducts, refetch: refetchProducts } = useAdminProducts();

  // Fetch ALL checkouts for admin
  const { data: checkouts, isLoading: loadingCheckouts } = useAdminCheckouts();

  // Fetch ALL withdrawals for admin
  const { data: withdrawals, isLoading: loadingWithdrawals, refetch: refetchWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/withdrawals");
      return res.json();
    },
    enabled: !!user && user.email === ADMIN_EMAIL
  });

  const approveProduct = useAdminApproveProduct();
  const rejectProduct = useAdminRejectProduct();

  // Withdrawal mutations
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`);
    },
    onSuccess: () => {
      refetchWithdrawals();
      toast({ title: "Sucesso", description: "Saque aprovado!" });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`);
    },
    onSuccess: () => {
      refetchWithdrawals();
      toast({ title: "Sucesso", description: "Saque rejeitado!" });
    }
  });

  const isLoading = loading || loadingUsers || loadingProducts || loadingCheckouts || loadingWithdrawals;

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
  // Filter pending withdrawals
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending') || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex">
      <AdminSidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
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
    </div>
  );
}