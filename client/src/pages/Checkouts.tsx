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
        <div className="flex flex-col gap-4">
          {checkouts?.map((checkout) => (
            <Card key={checkout.id} className="bg-[#18181b] border-zinc-800/60 hover:border-purple-500/30 transition-all cursor-pointer group overflow-hidden w-full flex flex-row items-center p-4 gap-6">
              <div className="w-24 h-24 bg-zinc-900 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-zinc-800/50">
                <ShoppingCart className="w-8 h-8 text-zinc-700" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white group-hover:text-purple-400 transition-colors break-words whitespace-normal h-auto">
                  {checkout.name}
                </h3>
                <p className="mt-1 font-normal text-foreground text-sm sm:text-base break-words whitespace-normal h-auto">
                  {products?.find(p => p.id === checkout.productId)?.name || 'Produto desconhecido'}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex flex-col">
                    <p className="text-xs font-medium text-zinc-500">
                      {Intl.NumberFormat('en-US', {
                        notation: "compact",
                        maximumFractionDigits: 1
                      }).format(checkout.views || 0)} visualizações
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/checkout/${checkout.slug}`;
                    window.open(link, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/checkouts/edit/${checkout.id}`);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 w-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(checkout.id);
                  }}
                >
                  {deleteCheckout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
