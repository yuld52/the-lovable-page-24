import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, ArrowDownToLine, History, Loader2, PieChart, CreditCard, Plus, Trash2, Check, Clock, AlertCircle, ArrowLeft } from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"visao" | "historico" | "contas">("visao");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState<{ bank: string; agency: string; account: string; type: "checking" | "savings" }>({ bank: "", agency: "", account: "", type: "checking" });
  
  // Withdrawal dialog state
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: products } = useProducts();

  // Calculate real financial data
  const totalEarnings = sales?.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
  const availableBalance = totalEarnings; // In a real app, this would subtract fees/withdrawals
  const pendingWithdrawals = 0; // Would come from a withdrawals table

  const handleWithdraw = async () => {
    if (!amount || !pixKey) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o valor e a chave PIX.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
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
      // In production, this would call a real withdrawal API
      await apiRequest("POST", "/api/withdrawals", {
        amount: amountCents,
        pixKey,
        method: "pix"
      });
      
      setWithdrawSuccess(true);
      setAmount("");
      setPixKey("");
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

  const addAccountMutation = useMutation({
    mutationFn: async (account: typeof newAccount) => {
      return apiRequest("POST", "/api/bank-accounts", account);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "Conta adicionada!" });
      setShowAddAccount(false);
      setNewAccount({ bank: "", agency: "", account: "", type: "checking" });
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
      </div>

      {activeTab === 'visao' && (
        <>
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
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingWithdrawals / 100)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Aguardando processamento</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg sticky top-8">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white">Solicitar Saque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Valor (R$)</label>
                    <Input 
                      type="number" 
                      placeholder="0,00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-zinc-900/50 border-zinc-800 h-11 text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Chave PIX</label>
                    <Input 
                      placeholder="E-mail, CPF ou telefone" 
                      value={pixKey} 
                      onChange={(e) => setPixKey(e.target.value)}
                      className="bg-zinc-900/50 border-zinc-800 h-11 text-white" 
                    />
                  </div>
                  <Button 
                    onClick={() => setShowWithdrawDialog(true)}
                    disabled={isLoading || !amount || !pixKey}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white h-11"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar Saque"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white">Histórico de Saques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                      <ArrowDownToLine className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Nenhum saque realizado</h3>
                    <p className="text-sm text-zinc-500 max-w-sm">
                      Quando você realizar saques, eles aparecerão aqui. O processamento leva até 3 dias úteis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
              <CardTitle className="text-base font-bold text-white">Contas Bancárias</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Cadastre suas contas para receber pagamentos.
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Nenhuma conta cadastrada</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Cadastre suas contas bancárias para receber pagamentos via PIX ou transferência.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal Confirmation Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-purple-400" />
              Confirmar Saque
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Revise os dados antes de confirmar o saque via PIX.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Valor:</span>
                <span className="text-lg font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(amount) || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Chave PIX:</span>
                <span className="text-sm font-medium text-white">{pixKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Método:</span>
                <span className="text-sm font-medium text-purple-400">PIX Instantâneo</span>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400">
                ⚠️ O processamento leva até 3 dias úteis. Certifique-se que a chave PIX está correta.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowWithdrawDialog(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                setShowWithdrawDialog(false);
                handleWithdraw();
              }}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-500 text-white"
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
            <h2 className="text-2xl font-bold text-white mb-2">Saquue Solicitado!</h2>
            <p className="text-zinc-400 mb-6">
              Seu saque de{' '}
              <span className="text-white font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(amount) || 0)}
              </span>
              {' '}foi solicitado com sucesso via PIX.
            </p>
            <div className="bg-zinc-900/50 rounded-lg p-4 w-full mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-400">Chave PIX:</span>
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

      {/* Add Account Dialog */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Nova Conta Bancária</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Banco</label>
                <Input 
                  placeholder="Ex: Nubank, Itaú..." 
                  value={newAccount.bank}
                  onChange={(e) => setNewAccount({ ...newAccount, bank: e.target.value })}
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Agência</label>
                  <Input 
                    placeholder="0000" 
                    value={newAccount.agency}
                    onChange={(e) => setNewAccount({ ...newAccount, agency: e.target.value })}
                    className="bg-zinc-900 border-zinc-800" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Conta</label>
                  <Input 
                    placeholder="00000-0" 
                    value={newAccount.account}
                    onChange={(e) => setNewAccount({ ...newAccount, account: e.target.value })}
                    className="bg-zinc-900 border-zinc-800" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Tipo</label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        newAccount.type === 'checking' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                    onClick={() => setNewAccount({ ...newAccount, type: 'checking' })}
                  >
                    Conta Corrente
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        newAccount.type === 'savings' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                    onClick={() => setNewAccount({ ...newAccount, type: 'savings' })}
                  >
                    Poupança
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setShowAddAccount(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => addAccountMutation.mutate(newAccount)}
                disabled={addAccountMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                {addAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}