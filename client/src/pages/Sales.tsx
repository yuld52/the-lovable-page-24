import { Layout } from "@/components/Layout";
import { useSales } from "@/hooks/use-sales";
import { useProducts } from "@/hooks/use-products";
import { Card } from "@/components/ui/card";
import { Loader2, Receipt, Search, Package, CheckCircle2, Clock, AlertCircle, FileText, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MPESA_LOGO = "https://yt3.googleusercontent.com/ytc/AIdro_k9S-mKWfmtSx85sbylUgINsr7-ErWacXBh0R39hZ_2rg=s900-c-k-c0x00ffffff-no-rj";
const EMOLA_LOGO  = "https://play-lh.googleusercontent.com/2TGAhJ55tiyhCwW0ZM43deGv4lUTFTBMoq83mnAO6-bU5hi2NPyKX8BN8iKt13irK7Y";

function GatewayBadge({ sale }: { sale: any }) {
  if (sale.paymentMethod === "mpesa") {
    return <img src={MPESA_LOGO} alt="M-Pesa" className="h-6 w-6 rounded object-cover" />;
  }
  if (sale.paymentMethod === "emola") {
    return <img src={EMOLA_LOGO} alt="e-Mola" className="h-6 w-6 rounded object-cover" />;
  }
  if (sale.paypalOrderId || sale.paymentMethod === "paypal") {
    return <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">PayPal</span>;
  }
  return <span className="text-[10px] text-zinc-500">—</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return (
    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">Aprovada</span>
    </div>
  );
  if (status === "pending") return (
    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
      <Clock className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">Pendente</span>
    </div>
  );
  if (status === "failed") return (
    <div className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full">
      <XCircle className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">Falhada</span>
    </div>
  );
  if (status === "refunded") return (
    <div className="inline-flex items-center gap-1.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2.5 py-1 rounded-full">
      <AlertCircle className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">Reembolso</span>
    </div>
  );
  return (
    <div className="inline-flex items-center gap-1.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2.5 py-1 rounded-full">
      <AlertCircle className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
    </div>
  );
}

export default function Sales() {
  const { data: sales, isLoading: loadingSales } = useSales();
  const { data: products } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    return sales.filter(sale => {
      const productName = products?.find(p => p.id === sale.productId)?.name || "";
      const matchesSearch =
        (sale.customerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sales, products, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!filteredSales || filteredSales.length === 0) return;
    const headers = ["ID", "Produto", "Conta", "Valor (USD)", "Método", "Status", "Data"];
    const rows = filteredSales.map((sale) => {
      const product = products?.find((p) => p.id === sale.productId);
      return [
        sale.paypalOrderId ? sale.paypalOrderId.slice(-8) : String(sale.id).padStart(8, "0"),
        product?.name || "Produto Removido",
        sale.customerEmail || "",
        ((sale.amount || 0) / 100).toFixed(2),
        (sale as any).paymentMethod || (sale.paypalOrderId ? "paypal" : "—"),
        sale.status,
        sale.createdAt ? format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Vendas" subtitle="Acompanhe suas transações em tempo real">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
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
              <SelectItem value="failed">Falhadas</SelectItem>
              <SelectItem value="refunded">Reembolsadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={!filteredSales || filteredSales.length === 0}
          className="bg-[#18181b] hover:bg-zinc-800 text-white border border-zinc-800 h-11 px-5 rounded-xl flex items-center gap-2 font-semibold disabled:opacity-40"
        >
          <FileText className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Table */}
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
        <Card className="bg-[#18181b] border-zinc-800/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Conta</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Método</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {filteredSales.map((sale) => {
                  const product = products?.find(p => p.id === sale.productId);
                  const saleId = sale.paypalOrderId
                    ? `#${sale.paypalOrderId.slice(-8)}`
                    : `#${String(sale.id).padStart(8, "0")}`;
                  const amountUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((sale.amount || 0) / 100);

                  return (
                    <tr key={sale.id} className="hover:bg-zinc-800/20 transition-colors group">
                      {/* ID */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-zinc-400">{saleId}</span>
                      </td>

                      {/* Produto */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-zinc-400" />
                          </div>
                          <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                            {product?.name || "Produto Removido"}
                          </span>
                        </div>
                      </td>

                      {/* Conta */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white leading-tight">
                            {sale.customerEmail?.split("@")[0] || "—"}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                            {sale.customerEmail || ""}
                          </span>
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white">{amountUsd}</span>
                      </td>

                      {/* Método */}
                      <td className="px-6 py-4">
                        <GatewayBadge sale={sale} />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={sale.status} />
                      </td>

                      {/* Data */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-400">
                          {sale.createdAt
                            ? format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 border-t border-zinc-800/40 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {filteredSales.length} {filteredSales.length === 1 ? "venda" : "vendas"} encontrada{filteredSales.length !== 1 ? "s" : ""}
            </span>
            {(searchTerm || statusFilter !== "all") && (
              <button
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </Card>
      )}
    </Layout>
  );
}
