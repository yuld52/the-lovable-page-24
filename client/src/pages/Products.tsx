import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, PackageOpen, Search, Pencil, Trash2, BookOpen, Link2, Megaphone } from "lucide-react";
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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Sucesso", description: "Produto excluído com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const copyLink = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/products/${id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Link do produto copiado." });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return { label: "Vendas ativas", className: "border border-emerald-500 text-emerald-500 bg-transparent" };
      case 'rejected': return { label: "Rejeitado", className: "border border-red-500 text-red-500 bg-transparent" };
      default: return { label: "Em análise", className: "border border-amber-500 text-amber-500 bg-transparent" };
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
            {searchTerm ? "Nenhum produto encontrado com este termo." : "Você ainda não criou nenhum produto."}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts?.map((product) => {
            const status = getStatusLabel(product.status || 'pending');
            return (
              <Card
                key={product.id}
                className="bg-[#18181b] border-zinc-800/60 hover:border-zinc-700 transition-all cursor-pointer group overflow-hidden flex flex-col rounded-2xl"
                onClick={() => setLocation(`/products/edit/${product.id}`)}
              >
                {/* Image */}
                <div className="relative w-full aspect-video overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                      <PackageOpen className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                  {/* Type badge — bottom left of image */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-md">
                    <BookOpen className="w-3 h-3" />
                    Digital
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[10px] text-zinc-500 mb-1">ID {product.id}</p>
                  <h3 className="text-sm font-bold text-white leading-snug mb-4 group-hover:text-purple-400 transition-colors">
                    {product.name}
                  </h3>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto flex-wrap">
                    <span className={`text-[10px] font-semibold px-3 py-1 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                    <button
                      className="text-[10px] font-semibold px-3 py-1 rounded-full border border-zinc-600 text-zinc-300 hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation("/checkouts/new");
                      }}
                    >
                      <Megaphone className="w-3 h-3" />
                      Promover
                    </button>
                    <button
                      className="ml-auto text-zinc-500 hover:text-purple-400 transition-colors"
                      onClick={(e) => copyLink(product.id, e)}
                      title="Copiar link"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      onClick={(e) => handleDelete(product.id, e)}
                      title="Excluir"
                    >
                      {deleteProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
