import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, PackageOpen, Search, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Sucesso", description: "Produto excluído com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Layout title="Produtos" subtitle="Gerencie seus produtos">
      <div className="flex justify-end items-center mb-6">
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
      ) : products?.length === 0 ? (
        <Card className="bg-[#18181b] border-zinc-800/60 flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-zinc-900 p-4 rounded-full mb-4">
            <PackageOpen className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Nenhum produto</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            Você ainda não criou nenhum produto. Comece criando seu primeiro produto digital para gerar links de checkout.
          </p>
          <Button
            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
            onClick={() => setLocation("/products/new")}
          >
            Criar meu primeiro produto
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-stretch">
          {products?.map((product) => (
            <Card key={product.id} className="bg-[#18181b] border-zinc-800/60 hover:border-purple-500/30 transition-all cursor-pointer group overflow-hidden w-full flex flex-col">
              <div className="w-full aspect-square relative overflow-hidden border-b border-zinc-800/50">
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
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                    <PackageOpen className="w-8 h-8 text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-purple-400 transition-colors text-center break-words whitespace-normal flex-1">{product.name}</h3>
                <div className="flex items-center justify-between border-t border-zinc-800/50 pt-4">
                  <div>
                    <p className="text-sm text-zinc-500">USD</p>
                    <p className="text-xl font-bold text-white">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price / 100)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/products/edit/${product.id}`);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product.id);
                      }}
                    >
                      {deleteProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
