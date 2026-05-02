import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useCheckouts, useCreateCheckout, useDeleteCheckout } from "@/hooks/use-checkouts";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ShoppingCart, ExternalLink, Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Checkouts() {
  const [, setLocation] = useLocation();
  const { data: checkouts, isLoading } = useCheckouts();
  const { data: products } = useProducts();
  const createCheckout = useCreateCheckout();
  const deleteCheckout = useDeleteCheckout();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [newCheckout, setNewCheckout] = useState({
    name: "",
    slug: "",
    productId: ""
  });

  const handleCreate = () => {
    setLocation("/checkouts/new");
  };

  const copyLink = (publicUrl: string | null, slug: string) => {
    // Sempre construir o link baseado no host atual para garantir que seja funcional
    const link = `${window.location.origin}/checkout/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copiado!", description: "Link de checkout público copiado." });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este checkout?")) return;
    try {
      await deleteCheckout.mutateAsync(id);
      toast({ title: "Sucesso", description: "Checkout excluído com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Layout title="Checkouts" subtitle="Páginas de venda personalizadas">
      <div className="flex justify-end mb-6">
        <Button
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 border-0 outline-none ring-0 focus-visible:ring-0"
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Checkout
        </Button>
      </div>
      {isLoading && checkouts === undefined ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : !checkouts || checkouts.length === 0 ? (
        <Card className="bg-[#18181b] border-zinc-800/60 flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-zinc-900 p-4 rounded-full mb-4">
            <ShoppingCart className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Nenhum checkout</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            Você ainda não possui checkouts. Crie páginas de venda personalizadas para seus produtos e aumente sua conversão.
          </p>
          <Button
            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
            onClick={handleCreate}
          >
            Criar meu primeiro checkout
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {checkouts?.map((checkout) => (
            <Card key={checkout.id} className="bg-[#18181b] border-zinc-800/60 hover:border-purple-500/30 transition-all cursor-pointer group overflow-hidden w-full flex flex-row items-center px-3 py-2.5 gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-lg flex-shrink-0 flex items-center justify-center border border-zinc-800/50">
                <ShoppingCart className="w-4 h-4 text-zinc-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                  {checkout.name}
                </h3>
                <p className="text-xs text-zinc-500 truncate">
                  {products?.find(p => p.id === checkout.productId)?.name || 'Produto desconhecido'}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(checkout.views || 0)} visualizações
                </p>
              </div>

              <div className="flex gap-0.5 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-zinc-500 hover:text-white h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/checkout/${checkout.slug}`;
                    window.open(link, '_blank');
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/checkouts/edit/${checkout.id}`);
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
                    handleDelete(checkout.id);
                  }}
                >
                  {deleteCheckout.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
