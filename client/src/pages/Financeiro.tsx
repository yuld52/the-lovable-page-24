import { Layout } from "@/components/Layout";
import {
  DollarSign,
  ArrowDownToLine,
  History,
  Loader2,
  TrendingUp,
  CreditCard,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Wallet,
  Banknote,
  Shield,
  Zap,
  ChevronRight,
  BarChart3,
} from "lucide-react";
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
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("email");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"visao" | "historico" | "saque">("visao");
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: products } = useProducts();

  const totalEarnings = sales?.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
  const availableBalance = totalEarnings;
  const pendingWithdrawals = 0;
  const salesCount = sales?.filter(s => s.status === "paid").length || 0;

  const handleWithdraw = async () => {
    if (!amount || !pixKey) {
      toast({ title: "Campos obrigatórios", description: "Preencha o valor e a chave PIX.", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents > availableBalance) {
      toast({ title: "Saldo insuficiente", description: "O valor solicitado excede o saldo disponível.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/withdrawals", { amount: amountCents, pixKey, pixKeyType });
      setWithdrawSuccess(true);
      setShowWithdrawDialog(false);
      setAmount("");
      setPixKey("");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao solicitar saque", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "visao", label: "Visão Geral", icon: BarChart3 },
    { id: "historico", label: "Histórico", icon: History },
    { id: "saque", label: "Solicitar Saque", icon: ArrowDownToLine },
  ] as const;

  if (statsLoading || salesLoading) {
    return (
      <Layout title="Financeiro" subtitle="Gerencie seus saques e saldo">
        <div className="flex justify-center items-center p-24">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Financeiro" subtitle="Gerencie seus saques e saldo">

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 mb-8 w-fit backdrop-blur-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
              activeTab === id
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ======================== VISÃO GERAL ======================== */}
      {activeTab === "visao" && (
        <div className="space-y-6">

          {/* Hero Balance Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/80 via-purple-800/60 to-zinc-900 border border-purple-700/40 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.3),_transparent_60%)]" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-300 uppercase tracking-widest">Saldo Disponível</span>
              </div>
              <div className="text-5xl font-black text-white mt-2 mb-4">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(availableBalance / 100)}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-white/80">{salesCount} venda{salesCount !== 1 ? "s" : ""} aprovada{salesCount !== 1 ? "s" : ""}</span>
                </div>
                {pendingWithdrawals > 0 && (
                  <div className="flex items-center gap-2 bg-amber-500/20 rounded-xl px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-300">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pendingWithdrawals / 100)} em processamento
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => setActiveTab("saque")}
              className="absolute bottom-6 right-6 bg-white text-purple-900 hover:bg-purple-50 font-bold rounded-xl shadow-lg hidden sm:flex items-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Sacar
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative group bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-emerald-700/50 hover:bg-emerald-900/10 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Total Ganho</span>
              </div>
              <div className="text-2xl font-black text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalEarnings / 100)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Histórico total de vendas</p>
            </div>

            <div className="relative group bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-amber-700/50 hover:bg-amber-900/10 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Em Processamento</span>
              </div>
              <div className="text-2xl font-black text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pendingWithdrawals / 100)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Saques aguardando aprovação</p>
            </div>

            <div className="relative group bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 hover:border-purple-700/50 hover:bg-purple-900/10 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Vendas</span>
              </div>
              <div className="text-2xl font-black text-white">{salesCount}</div>
              <p className="text-xs text-zinc-500 mt-1">Transações confirmadas</p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Saque via PIX</h4>
                <p className="text-xs text-zinc-500">Receba em até 3 dias úteis diretamente na sua chave PIX cadastrada.</p>
              </div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">100% Seguro</h4>
                <p className="text-xs text-zinc-500">Todas as transações são criptografadas e protegidas contra fraudes.</p>
              </div>
            </div>
          </div>

          {/* CTA to withdraw on mobile */}
          <div className="sm:hidden">
            <Button
              onClick={() => setActiveTab("saque")}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white h-12 rounded-2xl font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2"
            >
              <ArrowDownToLine className="w-5 h-5" />
              Solicitar Saque
            </Button>
          </div>
        </div>
      )}

      {/* ======================== HISTÓRICO ======================== */}
      {activeTab === "historico" && (
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/60">
            <div>
              <h3 className="text-base font-bold text-white">Histórico de Transações</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {sales?.length || 0} transação(ões) encontrada(s)
              </p>
            </div>
            <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <History className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          {!sales || sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-zinc-800/60 rounded-full flex items-center justify-center">
                  <Banknote className="w-9 h-9 text-zinc-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center border-2 border-zinc-900">
                  <Plus className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Nenhuma transação ainda</h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                Quando você realizar vendas, elas aparecerão aqui com todos os detalhes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/40">
              {sales.map((sale) => {
                const product = products?.find(p => p.id === sale.productId);
                return (
                  <div key={sale.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/20 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      sale.status === "paid"
                        ? "bg-emerald-500/10"
                        : sale.status === "pending"
                        ? "bg-amber-500/10"
                        : "bg-zinc-700/30"
                    }`}>
                      {sale.status === "paid" ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : sale.status === "pending" ? (
                        <Clock className="w-5 h-5 text-amber-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {product?.name || "Produto Removido"}
                        </span>
                        {sale.status === "paid" ? (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                            Pago
                          </span>
                        ) : sale.status === "pending" ? (
                          <span className="shrink-0 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                            Pendente
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-bold text-zinc-500 bg-zinc-700/30 border border-zinc-700/40 px-2 py-0.5 rounded-full uppercase">
                            {sale.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500 truncate">
                          {sale.customerEmail || "Cliente"}
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-xs text-zinc-600 shrink-0">
                          {sale.createdAt ? format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-white">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((sale.amount || 0) / 100)}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">
                        #{sale.paypalOrderId ? sale.paypalOrderId.slice(-6) : String(sale.id).padStart(6, "0")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================== SOLICITAR SAQUE ======================== */}
      {activeTab === "saque" && (
        <div className="max-w-lg space-y-5">

          {/* Balance preview */}
          <div className="bg-gradient-to-br from-purple-900/60 to-zinc-900/60 border border-purple-700/30 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-300 font-medium uppercase tracking-wider mb-1">Saldo Disponível</p>
              <p className="text-2xl font-black text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(availableBalance / 100)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-300" />
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Solicitar Saque</h3>
              <p className="text-xs text-zinc-500">O valor será transferido para sua chave PIX em até 3 dias úteis.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Valor do Saque (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">R$</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700/60 h-12 text-white text-base pl-10 rounded-xl focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
              {amount && (
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Você receberá{" "}
                  <span className="text-white font-bold">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(amount) || 0)}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tipo de Chave PIX</label>
              <div className="grid grid-cols-3 gap-2">
                {["email", "cpf", "phone"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setPixKeyType(type)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      pixKeyType === type
                        ? "bg-purple-600/20 border-purple-500/60 text-purple-300"
                        : "bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {type === "email" ? "E-mail" : type === "cpf" ? "CPF" : "Telefone"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Chave PIX</label>
              <Input
                placeholder={
                  pixKeyType === "email"
                    ? "seu@email.com"
                    : pixKeyType === "cpf"
                    ? "000.000.000-00"
                    : "(00) 00000-0000"
                }
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700/60 h-12 text-white rounded-xl focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80">
                Confira a chave PIX antes de confirmar. Saques incorretos não podem ser estornados automaticamente.
              </p>
            </div>

            <Button
              onClick={() => setShowWithdrawDialog(true)}
              disabled={isLoading || !amount || !pixKey}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white h-12 rounded-xl font-bold shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowDownToLine className="w-5 h-5" />
                  Solicitar Saque
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ======================== CONFIRM DIALOG ======================== */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-8 h-8 bg-purple-500/15 rounded-xl flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4 text-purple-400" />
              </div>
              Confirmar Saque
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Revise os dados antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-zinc-900 rounded-xl p-4 space-y-3 border border-zinc-800/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Valor</span>
                <span className="text-xl font-black text-white">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(amount) || 0)}
                </span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Chave PIX</span>
                <span className="text-sm font-medium text-white truncate max-w-[180px] text-right">{pixKey}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Tipo</span>
                <span className="text-sm font-medium text-purple-400">
                  {pixKeyType === "email" ? "E-mail" : pixKeyType === "cpf" ? "CPF" : "Telefone"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Prazo</span>
                <span className="text-sm font-medium text-zinc-300">Até 3 dias úteis</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleWithdraw} disabled={isLoading} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================== SUCCESS DIALOG ======================== */}
      <Dialog open={withdrawSuccess} onOpenChange={setWithdrawSuccess}>
        <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-sm rounded-2xl">
          <div className="flex flex-col items-center text-center p-4">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-400/5 animate-ping" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Saque Solicitado!</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Seu saque foi enviado para análise e será processado em até 3 dias úteis.
            </p>
            <div className="bg-zinc-900 rounded-2xl p-4 w-full mb-6 border border-zinc-800/50 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Chave PIX</span>
                <span className="text-sm font-medium text-white truncate max-w-[160px] text-right">{pixKey}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Status</span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-amber-400">
                  <Clock className="w-3.5 h-3.5" /> Pendente
                </span>
              </div>
            </div>
            <Button onClick={() => setWithdrawSuccess(false)} className="w-full bg-purple-600 hover:bg-purple-500 text-white h-11 rounded-xl font-bold">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
