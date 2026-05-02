import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, PackageOpen, Search, Pencil, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products?.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Sucesso", description: "Produto excluído com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Aprovado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            <XCircle className="w-2.5 h-2.5" />
            Rejeitado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            <Clock className="w-2.5 h-2.5" />
            Pendente
          </span>
        );
    }
  };

  return (
    <Layout title="Produtos" subtitle="Gerencie seus produtos">
      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800 h-11 text-sm"
          />
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 border-0 outline-none ring-0 focus-visible:ring-0"
          onClick={() => setLocation("/products/new")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : filteredProducts?.length === 0 ? (
        <Card className="bg-[#18181b] border-zinc-800/60 flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-zinc-900 p-4 rounded-full mb-4">
            <PackageOpen className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Nenhum produto</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            {searchTerm ? "Nenhum produto encontrado com este termo." : "Você ainda não criou nenhum produto. Comece criando seu primeiro produto digital para gerar links de checkout."}
          </p>
          {!searchTerm && (
            <Button
              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
              onClick={() => setLocation("/products/new")}
            >
              Criar meu primeiro produto
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts?.map((product) => (
            <Card
              key={product.id}
              className="bg-[#18181b] border-zinc-800/60 hover:border-purple-500/30 transition-all group overflow-hidden flex flex-col rounded-xl"
            >
              {/* Cover image — 16:9 */}
              <div
                className="w-full relative overflow-hidden cursor-pointer"
                style={{ aspectRatio: "16/9" }}
                onClick={() => setLocation(`/products/edit/${product.id}`)}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('/objects-cdn/public/')) {
                        target.src = target.src.replace('/objects-cdn/public/', '/objects-cdn/');
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                    <PackageOpen className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Body */}
              <div
                className="px-3 pt-2 pb-1 cursor-pointer flex-1"
                onClick={() => setLocation(`/products/edit/${product.id}`)}
              >
                <p className="text-[10px] text-zinc-500 mb-0.5">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price / 100)}
                </p>
                <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors leading-snug line-clamp-2">
                  {product.name}
                </h3>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/50 mt-1">
                {getStatusChip(product.status || 'pending')}
                <div className="flex gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/products/edit/${product.id}`);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                  >
                    {deleteProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
