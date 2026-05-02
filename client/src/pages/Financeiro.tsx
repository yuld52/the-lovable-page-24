import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, ArrowDownToLine, History, Loader2, PieChart, CreditCard, Plus, Trash2, Check, Clock, AlertCircle, ArrowLeft, ShieldCheck, Banknote, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useStats } from "@/hooks/use-stats";
import { useSales } from "@/hooks/use-sales";
import { useProducts } from "@/hooks/use-products";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Financeiro() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"mpesa" | "emola">("mpesa");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"visao" | "historico" | "contas" | "regras">("visao");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addAccountStep, setAddAccountStep] = useState<1 | 2 | 3>(1);
  const [newAccount, setNewAccount] = useState<{ type: "mpesa" | "emola" | "payoneer"; phone: string; name: string }>({ type: "mpesa", phone: "", name: "" });
  const [withdrawCurrency, setWithdrawCurrency] = useState<"MZN" | "USD" | "BRL">("MZN");

  // Withdrawal dialog state
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const METHOD_LABELS: Record<string, string> = {
    mpesa: "M-Pesa",
    emola: "e-Mola",
    payoneer: "Payoneer",
  };
  const METHOD_COLORS: Record<string, string> = {
    mpesa: "bg-red-600 hover:bg-red-500",
    emola: "bg-orange-500 hover:bg-orange-400",
    payoneer: "bg-blue-600 hover:bg-blue-500",
  };
  const KEY_LABELS: Record<string, string> = {
    mpesa: "Número M-Pesa",
    emola: "Número e-Mola",
    payoneer: "Email Payoneer",
  };
  const KEY_PLACEHOLDERS: Record<string, string> = {
    mpesa: "Ex: 84 XXX XXXX",
    emola: "Ex: 86 XXX XXXX",
    payoneer: "Ex: email@exemplo.com",
  };
  const CURRENCY_FLAGS: Record<string, string> = { MZN: "🇲🇿", USD: "🇺🇸", BRL: "🇧🇷" };
  const CURRENCY_MIN: Record<string, number> = { MZN: 600, USD: 50, BRL: 250 };

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: products } = useProducts();

  const { data: userWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/withdrawals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/withdrawals");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Calculate real financial data
  const totalEarnings = sales?.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
  const approvedWithdrawals = userWithdrawals?.filter(w => w.status === 'approved').reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
  const pendingWithdrawalsAmount = userWithdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
  const availableBalance = Math.max(0, totalEarnings - approvedWithdrawals - pendingWithdrawalsAmount);

  const handleWithdraw = async () => {
    if (!amount || !pixKey) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha o valor e o ${KEY_LABELS[withdrawMethod]}.`,
        variant: "destructive",
      });
      return;
    }

    const amountFloat = parseFloat(amount);
    const amountCents = Math.round(amountFloat * 100);
    if (amountCents > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: "O valor solicitado excede o saldo disponível.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/withdrawals", {
        amount: amountFloat,
        pixKey,
        pixKeyType: withdrawMethod,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      setWithdrawSuccess(true);
      setAmount("");
      setPixKey("");
      setSelectedAccountId(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao solicitar saque",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { data: bankAccounts, isLoading: accountsLoading } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bank-accounts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (account: typeof newAccount) => {
      const res = await apiRequest("POST", "/api/bank-accounts", account);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao salvar conta");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Conta salva!", description: "Sua conta de pagamento foi cadastrada." });
      setShowAddAccount(false);
      setAddAccountStep(1);
      setNewAccount({ type: "mpesa", phone: "", name: "" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message || "Não foi possível salvar a conta.", variant: "destructive" });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bank-accounts/${id}`);
      if (!res.ok) throw new Error("Erro ao apagar conta");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Conta removida", description: "Conta de pagamento removida com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover a conta.", variant: "destructive" });
    }
  });

  if (statsLoading || salesLoading) {
    return (
      <Layout title="Financeiro" subtitle="Gerencie seus saques e saldo">
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Financeiro" subtitle="Gerencie seus saques e saldo">
      {/* Sub-navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6 w-fit">
        <button 
          className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all font-medium flex-1 min-w-0 ${
            activeTab === 'visao' 
              ? 'bg-purple-600 text-white shadow-lg scale-105' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('visao')}
        >
          <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-xs sm:hidden truncate">Visão</span>
          <span className="text-sm hidden sm:inline">Visão Geral</span>
        </button>
        <button 
          className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all font-medium flex-1 min-w-0 ${
            activeTab === 'historico' 
              ? 'bg-purple-600 text-white shadow-lg scale-105' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('historico')}
        >
          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-xs sm:hidden truncate">Histórico</span>
          <span className="text-sm hidden sm:inline">Histórico</span>
        </button>
        <button 
          className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all font-medium flex-1 min-w-0 ${
            activeTab === 'contas' 
              ? 'bg-purple-600 text-white shadow-lg scale-105' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('contas')}
        >
          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-xs sm:hidden truncate">Contas</span>
          <span className="text-sm hidden sm:inline">Contas</span>
        </button>
        <button 
          className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all font-medium flex-1 min-w-0 ${
            activeTab === 'regras' 
              ? 'bg-purple-600 text-white shadow-lg scale-105' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('regras')}
        >
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-xs sm:hidden truncate">Regras</span>
          <span className="text-sm hidden sm:inline">Regras e Taxas</span>
        </button>
      </div>

      {activeTab === 'visao' && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowWithdrawForm(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Solicitar Saque
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">SALDO DISPONÍVEL</CardTitle>
                <DollarSign className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBalance / 100)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Disponível para saque</p>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL GANHO</CardTitle>
                <History className="w-4 h-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEarnings / 100)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Histórico de vendas</p>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">SAQUES PENDENTES</CardTitle>
                <ArrowDownToLine className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingWithdrawalsAmount / 100)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Aguardando processamento</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Histórico de Saques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <ArrowDownToLine className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Nenhum saque realizado</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Quando você realizar saques, eles aparecerão aqui. O processamento leva até 3 dias úteis.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'historico' && (
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white">Histórico Completo</CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              {sales?.length || 0} transação(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sales || sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <History className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Nenhum histórico</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  O histórico de transações aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {sales.map((sale) => {
                      const product = products?.find(p => p.id === sale.productId);
                      return (
                        <tr key={sale.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-zinc-500">
                              #{sale.paypalOrderId ? sale.paypalOrderId.slice(-8) : String(sale.id).padStart(8, '0')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-white truncate block max-w-[200px]">
                              {product?.name || "Produto Removido"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-zinc-300 truncate block max-w-[150px]">
                              {sale.customerEmail?.split('@')[0] || "Cliente"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-white">
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format((sale.amount || 0) / 100)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {sale.status === 'paid' ? (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full w-fit">
                                <Check className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Aprovada</span>
                              </div>
                            ) : sale.status === 'pending' ? (
                              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full w-fit">
                                <Clock className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Pendente</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 px-3 py-1 rounded-full w-fit">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{sale.status}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-zinc-400">
                              {sale.createdAt ? format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'contas' && (
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white">Contas de Pagamento</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Cadastre M-Pesa ou e-Mola para receber os seus saques.
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddAccount(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Conta
            </Button>
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : !bankAccounts || bankAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Nenhuma conta cadastrada</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Cadastre suas contas para receber saques via M-Pesa ou e-Mola.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bankAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        acc.type === 'mpesa' ? 'bg-red-600' : acc.type === 'emola' ? 'bg-orange-500' : 'bg-purple-600'
                      }`}>
                        {acc.type === 'mpesa' ? 'M' : acc.type === 'emola' ? 'E' : 'P'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{METHOD_LABELS[acc.type]}</p>
                        {acc.name && <p className="text-[11px] text-zinc-300 font-medium">{acc.name}</p>}
                        <p className="text-xs text-zinc-400">{acc.phone}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                      onClick={() => deleteAccountMutation.mutate(acc.id)}
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'regras' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header Card */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/15 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">Informações sobre Saques</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">Leia com atenção antes de solicitar um saque.</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Processing */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Processamento</p>
                  <p className="text-sm text-zinc-400">1–2 dias úteis, das <span className="text-white font-medium">9:30h</span> até <span className="text-white font-medium">15:30h</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal fees */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-white">Taxas de Saque</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "M-Pesa", rate: "10%", color: "bg-red-600", letter: "M" },
                { label: "e-Mola",  rate: "10%", color: "bg-orange-500", letter: "E" },
                { label: "Payoneer", rate: "2%",  color: "bg-blue-600", letter: "P" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${m.color}`}>
                      {m.letter}
                    </div>
                    <span className="text-sm text-white font-medium">{m.label}</span>
                  </div>
                  <span className="text-sm font-bold text-purple-400">{m.rate}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Minimum values */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <p className="text-sm font-semibold text-white">Valor Mínimo para Saque</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { currency: "USD", amount: "50", flag: "🇺🇸" },
                  { currency: "MZN", amount: "600", flag: "🇲🇿" },
                  { currency: "BRL", amount: "250", flag: "🇧🇷" },
                ].map((v) => (
                  <div key={v.currency} className="flex flex-col items-center justify-center bg-zinc-900/50 border border-zinc-800/50 rounded-xl py-4 gap-1">
                    <span className="text-xl">{v.flag}</span>
                    <span className="text-xs text-zinc-400 font-medium">{v.currency}</span>
                    <span className="text-base font-bold text-white">{v.amount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important rules */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-white">Regras Importantes</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Verificações de segurança antes do saque são obrigatórias para proteger sua conta.",
                "Não nos responsabilizamos por informações incorretas fornecidas pelo usuário.",
                "É responsabilidade do usuário manter seus dados atualizados e verificar todas as informações antes de confirmar transações.",
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl px-4 py-3">
                  <div className="w-5 h-5 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-amber-400 text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{rule}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdraw Form Dialog */}
      <Dialog open={showWithdrawForm} onOpenChange={(v) => {
        if (!v) { setShowWithdrawForm(false); setAmount(""); setPixKey(""); setSelectedAccountId(null); }
      }}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Solicitar Saque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Currency selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Carteira</label>
              <div className="grid grid-cols-3 gap-2">
                {(["MZN", "USD", "BRL"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => { setWithdrawCurrency(c); setAmount(""); }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      withdrawCurrency === c
                        ? "bg-purple-600/20 border-purple-500 text-purple-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                    }`}
                  >
                    <span>{CURRENCY_FLAGS[c]}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-zinc-400">Elegível para Saque em {withdrawCurrency}:</span>
                <span className="text-sm font-bold text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(availableBalance / 100)} {withdrawCurrency}
                </span>
              </div>
            </div>

            {/* Method selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Método</label>
              <div className="grid grid-cols-3 gap-2">
                {(["mpesa", "emola", "payoneer"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setWithdrawMethod(m as any); setPixKey(""); setSelectedAccountId(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      withdrawMethod === m
                        ? m === "mpesa"
                          ? "bg-red-600 border-red-500 text-white shadow"
                          : m === "emola"
                          ? "bg-orange-500 border-orange-400 text-white shadow"
                          : "bg-blue-600 border-blue-500 text-white shadow"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                    }`}
                  >
                    {METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Valor ({withdrawCurrency})
                <span className="ml-1 text-zinc-500 normal-case font-normal">mín. {CURRENCY_MIN[withdrawCurrency]}</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 h-11 text-white pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">{withdrawCurrency}</span>
              </div>
            </div>

            {/* Account selector — registered accounts for the chosen method */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Conta {METHOD_LABELS[withdrawMethod]}
              </label>
              {(() => {
                const matching = (bankAccounts || []).filter((a) => a.type === withdrawMethod);
                if (accountsLoading) {
                  return (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    </div>
                  );
                }
                if (matching.length === 0) {
                  return (
                    <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl border border-dashed border-zinc-700 text-center">
                      <p className="text-xs text-zinc-400">
                        Nenhuma conta {METHOD_LABELS[withdrawMethod]} registada.
                      </p>
                      <button
                        className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
                        onClick={() => { setShowWithdrawForm(false); setActiveTab("contas"); }}
                      >
                        Adicionar conta agora →
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col gap-2">
                    {matching.map((acc) => {
                      const isSelected = selectedAccountId === acc.id;
                      const color =
                        acc.type === "mpesa"
                          ? "border-red-500/50 bg-red-500/5"
                          : acc.type === "emola"
                          ? "border-orange-500/50 bg-orange-500/5"
                          : "border-purple-500/50 bg-purple-500/5";
                      const dotColor =
                        acc.type === "mpesa" ? "bg-red-600" : acc.type === "emola" ? "bg-orange-500" : "bg-purple-600";
                      return (
                        <button
                          key={acc.id}
                          onClick={() => { setSelectedAccountId(acc.id); setPixKey(acc.phone); }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                            isSelected ? color : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${dotColor}`}>
                            {acc.type === "mpesa" ? "M" : acc.type === "emola" ? "E" : "P"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white leading-tight">{METHOD_LABELS[acc.type]}</p>
                            <p className="text-xs text-zinc-400">{acc.phone}</p>
                          </div>
                          {isSelected && (
                            <Check className={`w-4 h-4 shrink-0 ${
                              acc.type === "mpesa" ? "text-red-400" : acc.type === "emola" ? "text-orange-400" : "text-purple-400"
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <Button
              onClick={() => { setShowWithdrawForm(false); setShowWithdrawDialog(true); }}
              disabled={!amount || !pixKey}
              className={`w-full text-white h-11 mt-2 ${METHOD_COLORS[withdrawMethod]}`}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Confirmation Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-purple-400" />
              Confirmar Saque
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Revise os dados antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Valor:</span>
                <span className="text-lg font-bold text-white">
                  {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(parseFloat(amount) || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">{KEY_LABELS[withdrawMethod]}:</span>
                <span className="text-sm font-medium text-white">{pixKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Método:</span>
                <span className={`text-sm font-bold ${withdrawMethod === 'mpesa' ? 'text-red-400' : withdrawMethod === 'emola' ? 'text-orange-400' : 'text-purple-400'}`}>
                  {METHOD_LABELS[withdrawMethod]}
                </span>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400">
                ⚠️ Certifique-se que o número está correto. O processamento leva até 3 dias úteis.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowWithdrawDialog(false); setShowWithdrawForm(true); }}
              className="border-zinc-700 text-zinc-300"
            >
              Voltar
            </Button>
            <Button
              onClick={() => { setShowWithdrawDialog(false); handleWithdraw(); }}
              disabled={isLoading}
              className={`text-white ${METHOD_COLORS[withdrawMethod]}`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirmar Saque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={withdrawSuccess} onOpenChange={setWithdrawSuccess}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm">
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Saque Solicitado!</h2>
            <p className="text-zinc-400 mb-6">
              Seu saque via <span className="font-bold text-white">{METHOD_LABELS[withdrawMethod]}</span> foi solicitado com sucesso.
            </p>
            <div className="bg-zinc-900/50 rounded-lg p-4 w-full mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">{KEY_LABELS[withdrawMethod]}:</span>
                <span className="text-sm font-medium text-white">{pixKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Status:</span>
                <span className="text-sm font-medium text-amber-400">Pendente</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              O processamento leva até 3 dias úteis. Você receberá uma notificação quando o valor for enviado.
            </p>
            <Button
              onClick={() => setWithdrawSuccess(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog — 3-step flow */}
      <Dialog open={showAddAccount} onOpenChange={(v) => { if (!v) { setShowAddAccount(false); setAddAccountStep(1); setNewAccount({ type: "mpesa", phone: "", name: "" }); } }}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              {addAccountStep > 1 && (
                <button
                  onClick={() => setAddAccountStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-400" />
                </button>
              )}
              <h3 className="text-lg font-bold text-white">
                {addAccountStep === 1 ? "Escolher Método" : addAccountStep === 2 ? "Dados da Conta" : "Verificação"}
              </h3>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pb-5">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  addAccountStep > s ? "bg-purple-500/20 text-purple-400" :
                  addAccountStep === s ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-500"
                }`}>{s}</div>
                {i < 2 && <div className={`w-8 h-0.5 transition-all ${addAccountStep > s ? "bg-purple-500" : "bg-zinc-800"}`} />}
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Step 1 — Choose method */}
            {addAccountStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">Selecione o tipo de conta que deseja adicionar:</p>
                {([
                  { type: "mpesa" as const, label: "M-Pesa", sub: "Carteira móvel Moçambique", color: "bg-red-600", letter: "M", border: "hover:border-red-500/50" },
                  { type: "emola" as const, label: "e-Mola",  sub: "Carteira móvel Moçambique", color: "bg-orange-500", letter: "E", border: "hover:border-orange-500/50" },
                  { type: "payoneer" as const, label: "Payoneer", sub: "Pagamentos internacionais", color: "bg-blue-600", letter: "P", border: "hover:border-blue-500/50" },
                ]).map((m) => (
                  <button
                    key={m.type}
                    onClick={() => { setNewAccount({ type: m.type, phone: "", name: "" }); setAddAccountStep(2); }}
                    className={`w-full flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all ${m.border} hover:bg-zinc-900 text-left`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${m.color}`}>
                      {m.letter}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.label}</p>
                      <p className="text-xs text-zinc-500">{m.sub}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-zinc-600 rotate-180 ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Account details */}
            {addAccountStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Preencha os dados para sua conta {METHOD_LABELS[newAccount.type]}:</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Nome do Titular</label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-800 h-11 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">{KEY_LABELS[newAccount.type]}</label>
                  <Input
                    placeholder={KEY_PLACEHOLDERS[newAccount.type]}
                    value={newAccount.phone}
                    onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-800 h-11 text-white"
                    type={newAccount.type === "payoneer" ? "email" : "tel"}
                  />
                </div>
                <Button
                  onClick={() => { if (newAccount.name.trim() && newAccount.phone.trim()) setAddAccountStep(3); }}
                  disabled={!newAccount.name.trim() || !newAccount.phone.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white h-11 mt-2"
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Step 3 — Review & confirm */}
            {addAccountStep === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-7 h-7 text-purple-400" />
                  </div>
                  <p className="text-sm text-zinc-400">Revise os dados antes de confirmar</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Método</span>
                    <span className="text-sm font-semibold text-white">{METHOD_LABELS[newAccount.type]}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Titular</span>
                    <span className="text-sm font-medium text-white">{newAccount.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">{KEY_LABELS[newAccount.type]}</span>
                    <span className="text-sm font-medium text-white">{newAccount.phone}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setAddAccountStep(2)} className="flex-1 border-zinc-700 text-zinc-300">
                    Voltar
                  </Button>
                  <Button
                    onClick={() => addAccountMutation.mutate(newAccount)}
                    disabled={addAccountMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {addAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}