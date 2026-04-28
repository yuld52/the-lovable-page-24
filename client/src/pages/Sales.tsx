import { Layout } from "@/components/Layout";
import { useSales } from "@/hooks/use-sales";
import { useProducts } from "@/hooks/use-products";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, Search, Calendar, User, Package, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Sales() {
  const { data: sales, isLoading: loadingSales } = useSales();
  const { data: products } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    return sales.filter(sale => {
      const matchesSearch = (sale.customerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (products?.find(p => p.id === sale.productId)?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [sales, products, searchTerm, statusFilter]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  return (
    <Layout title="Vendas" subtitle="Acompanhe suas transações em tempo real">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar por e-mail ou produto..."
            className="pl-10 bg-zinc-900/50 border-zinc-800 h-11 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-900/50 border-zinc-800 h-11 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="paid">Aprovadas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
              <SelectItem value="refunded">Reembolsadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingSales ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : filteredSales.length === 0 ? (
        <Card className="bg-[#18181b] border-zinc-800/60 flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-zinc-900 p-4 rounded-full mb-4">
            <Receipt className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Nenhuma venda encontrada</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all" 
              ? "Tente ajustar seus filtros para encontrar o que procura."
              : "Suas vendas aparecerão aqui assim que os clientes começarem a comprar."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSales.map((sale) => {
            const product = products?.find(p => p.id === sale.productId);
            const saleId = sale.paypalOrderId ? `#${sale.paypalOrderId.slice(-8)}` : `#${String(sale.id).padStart(8, '0')}`;
            
            return (
              <div key={sale.id} className="bg-[#111114] border border-zinc-800/40 hover:bg-zinc-800/20 transition-colors px-6 py-4 flex items-center justify-between group">
                {/* ID da Venda */}
                <div className="w-28 shrink-0">
                  <span className="text-xs font-medium text-zinc-500">{saleId}</span>
                </div>

                {/* Produto */}
                <div className="flex-1 flex items-center gap-3 min-w-0 px-4">
                  <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0">
                    <Package className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="text-sm font-bold text-white truncate">
                    {product?.name || "Produto Removido"}
                  </span>
                </div>

                {/* Cliente */}
                <div className="flex-1 flex flex-col min-w-0 px-4">
                  <span className="text-sm font-bold text-white truncate">
                    {sale.customerEmail?.split('@')[0] || "Cliente"}
                  </span>
                  <span className="text-[11px] text-zinc-500 truncate">
                    {sale.customerEmail}
                  </span>
                </div>

                {/* Valor */}
                <div className="w-24 shrink-0 text-center px-4">
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(sale.amount)}
                  </span>
                </div>

                {/* Gateway */}
                <div className="w-24 shrink-0 text-center px-4">
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">
                    stripe
                  </span>
                </div>

                {/* Status */}
                <div className="w-32 shrink-0 flex justify-center px-4">
                  {sale.status === 'paid' ? (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Aprovada</span>
                    </div>
                  ) : sale.status === 'pending' ? (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pendente</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 px-3 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{sale.status}</span>
                    </div>
                  )}
                </div>

                {/* Data */}
                <div className="w-40 shrink-0 text-right">
                  <span className="text-xs font-medium text-zinc-400">
                    {format(new Date(sale.createdAt!), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}