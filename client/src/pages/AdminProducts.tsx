import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Clock, CheckCircle2, XCircle, Check, Package,
  Link, MessageCircle, CreditCard, FileText, Image, Tag, AlignLeft,
  RefreshCw, Eye, Download
} from "lucide-react";
import { useAdminProducts, useAdminApproveProduct, useAdminRejectProduct } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paypal: "PayPal",
  credit_card: "Cartão de Crédito",
  pix: "Pix",
  boleto: "Boleto",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> Aprovado
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <XCircle className="w-3 h-3" /> Rejeitado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
      <Clock className="w-3 h-3" /> Pendente
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm text-zinc-200 break-all">{value || <span className="text-zinc-600 italic">Não informado</span>}</div>
      </div>
    </div>
  );
}

function ProductDetailDialog({
  product,
  open,
  onClose,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  product: any;
  open: boolean;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  if (!product) return null;

  const deliveryFiles: any[] = Array.isArray(product.deliveryFiles)
    ? product.deliveryFiles
    : [];
  const paymentMethods: string[] = Array.isArray(product.paymentMethods)
    ? product.paymentMethods
    : ["paypal"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181b] border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-zinc-400" />
            Análise do Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pb-2">
          {/* Status + Actions */}
          <div className="flex items-center justify-between">
            <StatusBadge status={product.status || "pending"} />
            {product.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 gap-1.5"
                  onClick={() => onApprove(product.id)}
                  disabled={approving || rejecting}
                >
                  {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 gap-1.5"
                  onClick={() => onReject(product.id)}
                  disabled={approving || rejecting}
                >
                  {rejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  Rejeitar
                </Button>
              </div>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Product Image */}
          {product.imageUrl && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> Imagem do Produto
              </p>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full max-h-64 object-contain rounded-xl border border-zinc-800 bg-zinc-900"
              />
            </div>
          )}

          {/* Core Details */}
          <div className="space-y-4">
            <DetailRow icon={Tag} label="Nome do Produto" value={product.name} />
            <DetailRow
              icon={AlignLeft}
              label="Descrição"
              value={
                product.description ? (
                  <p className="whitespace-pre-wrap text-zinc-300 leading-relaxed">{product.description}</p>
                ) : null
              }
            />
            <DetailRow
              icon={CreditCard}
              label="Preço"
              value={
                <span className="text-lg font-bold text-white">
                  {(() => {
                    const cur = (product.currency || "USD").toUpperCase();
                    try {
                      return new Intl.NumberFormat(cur === "MZN" ? "pt-MZ" : "en-US", { style: "currency", currency: cur }).format((product.price || 0) / 100);
                    } catch {
                      return `${cur} ${((product.price || 0) / 100).toFixed(2)}`;
                    }
                  })()}
                </span>
              }
            />
          </div>

          <Separator className="bg-zinc-800" />

          {/* Delivery */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Entrega</p>
            <DetailRow icon={Link} label="URL de Entrega" value={
              product.deliveryUrl ? (
                <a href={product.deliveryUrl} target="_blank" rel="noopener noreferrer"
                   className="text-purple-400 hover:underline flex items-center gap-1">
                  {product.deliveryUrl} <Eye className="w-3 h-3" />
                </a>
              ) : null
            } />
            <DetailRow icon={MessageCircle} label="WhatsApp / Suporte" value={
              product.whatsappUrl ? (
                <a href={product.whatsappUrl} target="_blank" rel="noopener noreferrer"
                   className="text-emerald-400 hover:underline">
                  {product.whatsappUrl}
                </a>
              ) : null
            } />
            <DetailRow
              icon={FileText}
              label={`Arquivos de Entrega (${deliveryFiles.length})`}
              value={
                deliveryFiles.length > 0 ? (
                  <ul className="space-y-1 mt-1">
                    {deliveryFiles.map((f: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs bg-zinc-900 rounded px-3 py-2 border border-zinc-800">
                        <Download className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        <a href={f.url || f} target="_blank" rel="noopener noreferrer"
                           className="text-purple-400 hover:underline truncate">
                          {f.name || f.url || f}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null
              }
            />
          </div>

          <Separator className="bg-zinc-800" />

          {/* Payment Methods */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Métodos de Pagamento</p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((m) => (
                <span key={m} className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <CreditCard className="w-3 h-3 text-zinc-500" />
                  {PAYMENT_METHOD_LABELS[m] || m}
                </span>
              ))}
            </div>
          </div>

          {/* Approve/Reject at bottom too for convenience */}
          {product.status === "pending" && (
            <>
              <Separator className="bg-zinc-800" />
              <div className="flex justify-end gap-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                  onClick={() => onApprove(product.id)}
                  disabled={approving || rejecting}
                >
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Aprovar Produto
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 gap-1.5"
                  onClick={() => onReject(product.id)}
                  disabled={approving || rejecting}
                >
                  {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Rejeitar Produto
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: products, isLoading, refetch } = useAdminProducts();
  const approveProduct = useAdminApproveProduct();
  const rejectProduct = useAdminRejectProduct();

  const filtered = (products || []).filter((p) => {
    if (activeTab === "all") return true;
    return (p.status || "pending") === activeTab;
  });

  const counts = {
    all: products?.length || 0,
    pending: products?.filter((p) => (p.status || "pending") === "pending").length || 0,
    approved: products?.filter((p) => p.status === "approved").length || 0,
    rejected: products?.filter((p) => p.status === "rejected").length || 0,
  };

  const handleApprove = async (id: number) => {
    try {
      await approveProduct.mutateAsync(id);
      toast({ title: "Produto aprovado!" });
      setSelectedProduct(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Tem certeza que deseja rejeitar este produto?")) return;
    try {
      await rejectProduct.mutateAsync(id);
      toast({ title: "Produto rejeitado!" });
      setSelectedProduct(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const tabs = [
    { key: "pending", label: "Pendentes", color: "text-amber-400 border-amber-500" },
    { key: "approved", label: "Aprovados", color: "text-emerald-400 border-emerald-500" },
    { key: "rejected", label: "Rejeitados", color: "text-red-400 border-red-500" },
    { key: "all", label: "Todos", color: "text-zinc-300 border-zinc-500" },
  ] as const;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Aprovação de Produtos</h1>
              <p className="text-sm text-muted-foreground">Analise e aprove ou rejeite os produtos enviados</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-zinc-800 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-900 ${activeTab === tab.key ? tab.color : "text-zinc-600"}`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">Nenhum produto nesta categoria.</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Preço</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entrega</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                      {filtered.map((p: any) => (
                        <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-zinc-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-zinc-200">{p.name}</p>
                                {p.description && (
                                  <p className="text-xs text-zinc-500 truncate max-w-[200px]">{p.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-white">
                              {(() => {
                                const cur = (p.currency || "USD").toUpperCase();
                                try {
                                  return new Intl.NumberFormat(cur === "MZN" ? "pt-MZ" : "en-US", { style: "currency", currency: cur }).format((p.price || 0) / 100);
                                } catch {
                                  return `${cur} ${((p.price || 0) / 100).toFixed(2)}`;
                                }
                              })()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {p.deliveryUrl && (
                                <span className="text-xs text-purple-400 flex items-center gap-1">
                                  <Link className="w-3 h-3" /> URL
                                </span>
                              )}
                              {p.deliveryFiles?.length > 0 && (
                                <span className="text-xs text-blue-400 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> {p.deliveryFiles.length} arquivo(s)
                                </span>
                              )}
                              {!p.deliveryUrl && (!p.deliveryFiles || p.deliveryFiles.length === 0) && (
                                <span className="text-xs text-zinc-600 italic">Nenhuma</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={p.status || "pending"} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8 gap-1.5"
                                onClick={() => setSelectedProduct(p)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Analisar
                              </Button>
                              {(p.status || "pending") === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                                    onClick={() => handleApprove(p.id)}
                                    disabled={approveProduct.isPending}
                                  >
                                    {approveProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
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
                                </>
                              )}
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
        </div>
      </main>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        approving={approveProduct.isPending}
        rejecting={rejectProduct.isPending}
      />
    </div>
  );
}
