import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { useCheckouts, useUpdateCheckout } from "@/hooks/use-checkouts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, PackageOpen, Search, Pencil, Trash2, CheckCircle2, XCircle, Clock, Link2, Save, ShoppingCart, Star, Image as ImageIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { CheckoutConfig } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

const DEFAULT_CONFIG: Partial<CheckoutConfig> = {
  heroTitle: "Promoção por tempo limitado",
  payButtonText: "Buy now",
  primaryColor: "#22a559",
  showTimer: false,
  timerMinutes: 10,
  timerText: "Oferta Especial por Tempo Limitado!",
  checkoutCurrency: "AUTO",
  checkoutLanguage: "pt",
  showPhone: false,
  showCpf: false,
  showSurname: false,
  footerText: "Meteorfy © 2026. Todos os direitos reservados.",
  heroImageUrl: "",
  orderBumpProducts: [],
  testimonials: [],
};

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: checkouts } = useCheckouts();
  const deleteProduct = useDeleteProduct();
  const updateCheckout = useUpdateCheckout();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const [editCheckoutId, setEditCheckoutId] = useState<number | null>(null);
  const [editConfig, setEditConfig] = useState<Partial<CheckoutConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

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

  const copyCheckoutLink = (productId: number) => {
    const checkout = checkouts?.find(c => c.productId === productId);
    if (!checkout) {
      toast({ title: "Sem link", description: "Este produto ainda não tem um checkout associado.", variant: "destructive" });
      return;
    }
    const link = `${window.location.origin}/checkout/${checkout.slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Link de checkout copiado para a área de transferência." });
  };

  const openCheckoutEditor = (productId: number) => {
    const checkout = checkouts?.find(c => c.productId === productId);
    if (!checkout) {
      toast({ title: "Sem checkout", description: "Este produto não tem um checkout associado.", variant: "destructive" });
      return;
    }
    setEditConfig({ ...DEFAULT_CONFIG, ...(checkout.config || {}) });
    setEditCheckoutId(checkout.id);
    setActiveTab("geral");
  };

  const handleSaveCheckout = async () => {
    if (!editCheckoutId) return;
    setIsSaving(true);
    try {
      await updateCheckout.mutateAsync({ id: editCheckoutId, data: { config: editConfig as CheckoutConfig } });
      toast({ title: "Checkout atualizado!", description: "As configurações foram salvas com sucesso." });
      setEditCheckoutId(null);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const set = (key: keyof CheckoutConfig, value: any) =>
    setEditConfig(prev => ({ ...prev, [key]: value }));

  const toggleOrderBump = (id: number) => {
    const current = (editConfig.orderBumpProducts as number[]) || [];
    if (current.includes(id)) {
      set("orderBumpProducts", current.filter(x => x !== id));
    } else {
      set("orderBumpProducts", [...current, id]);
    }
  };

  const addTestimonial = () => {
    const current = (editConfig.testimonials as any[]) || [];
    set("testimonials", [...current, { id: Date.now().toString(), name: "Nome do cliente", rating: 5, text: "Escreva o depoimento aqui...", imageUrl: "" }]);
  };

  const updateTestimonial = (index: number, field: string, value: any) => {
    const current = [...((editConfig.testimonials as any[]) || [])];
    current[index] = { ...current[index], [field]: value };
    set("testimonials", current);
  };

  const removeTestimonial = (index: number) => {
    const current = [...((editConfig.testimonials as any[]) || [])];
    current.splice(index, 1);
    set("testimonials", current);
  };

  const uploadTestimonialPhoto = async (index: number, file: File) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      const token = await getIdToken(user);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      const data = await res.json();
      updateTestimonial(index, "imageUrl", data.url);
      toast({ title: "Foto enviada!" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar a foto.", variant: "destructive" });
    }
  };

  const uploadBanner = async (file: File) => {
    setIsUploadingBanner(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      const token = await getIdToken(user);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      const data = await res.json();
      set("heroImageUrl", data.url);
      toast({ title: "Banner enviado com sucesso!" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar o banner.", variant: "destructive" });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            <CheckCircle2 className="w-2.5 h-2.5" />Aprovado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            <XCircle className="w-2.5 h-2.5" />Rejeitado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
            <Clock className="w-2.5 h-2.5" />Pendente
          </span>
        );
    }
  };

  const editCheckoutProductId = editCheckoutId
    ? checkouts?.find(c => c.id === editCheckoutId)?.productId
    : null;

  const orderBumpOptions = products?.filter(
    p => p.status === "approved" && p.id !== editCheckoutProductId
  ) || [];

  const testimonialsList = (editConfig.testimonials as any[]) || [];
  const selectedBumps = (editConfig.orderBumpProducts as number[]) || [];

  const formatPrice = (p: any) => {
    const cur = (p.currency || "USD").toUpperCase();
    try { return new Intl.NumberFormat(cur === "MZN" ? "pt-MZ" : "en-US", { style: "currency", currency: cur }).format(p.price / 100); }
    catch { return `${cur} ${(p.price / 100).toFixed(2)}`; }
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
            <Button className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700" onClick={() => setLocation("/products/new")}>
              Criar meu primeiro produto
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts?.map((product) => {
            const checkout = checkouts?.find(c => c.productId === product.id);
            return (
              <Card key={product.id} className="bg-[#18181b] border-zinc-800/60 hover:border-purple-500/30 transition-all group overflow-hidden flex flex-col rounded-xl">
                <div className="w-full relative overflow-hidden cursor-pointer" style={{ aspectRatio: "16/9" }} onClick={() => setLocation(`/products/edit/${product.id}`)}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('/objects-cdn/public/')) t.src = t.src.replace('/objects-cdn/public/', '/objects-cdn/'); }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                      <PackageOpen className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="px-3 pt-2 pb-1 cursor-pointer flex-1" onClick={() => setLocation(`/products/edit/${product.id}`)}>
                  <p className="text-[10px] text-zinc-500 mb-0.5">{formatPrice(product)}</p>
                  <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors leading-snug line-clamp-2">{product.name}</h3>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/50 mt-1">
                  {getStatusChip(product.status || 'pending')}
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" title="Copiar link" className={checkout ? "text-zinc-400 hover:text-white hover:bg-zinc-800 h-7 w-7" : "text-zinc-700 cursor-not-allowed h-7 w-7"} onClick={(e) => { e.stopPropagation(); copyCheckoutLink(product.id); }}>
                      <Link2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Editar checkout" className={checkout ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 w-7" : "text-zinc-700 cursor-not-allowed h-7 w-7"} onClick={(e) => { e.stopPropagation(); openCheckoutEditor(product.id); }}>
                      <ShoppingCart className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Editar produto" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 w-7" onClick={(e) => { e.stopPropagation(); setLocation(`/products/edit/${product.id}`); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir produto" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}>
                      {deleteProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checkout Edit Dialog */}
      <Dialog open={editCheckoutId !== null} onOpenChange={(open) => { if (!open) setEditCheckoutId(null); }}>
        <DialogContent className="bg-[#18181b] border border-zinc-800 text-white w-[calc(100vw-2rem)] max-w-lg rounded-2xl p-0 gap-0">

          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-white text-base">Editar Checkout</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs mt-0.5">
                  Configure as opções da sua página de vendas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
            <div className="px-5 pt-3 pb-0 border-b border-zinc-800/60">
              <TabsList className="bg-transparent border-0 p-0 h-auto gap-0 w-full justify-start rounded-none">
                {[
                  { value: "geral", label: "Geral" },
                  { value: "depoimentos", label: "Depoimentos", badge: testimonialsList.length || undefined },
                  { value: "orderbumps", label: "Order Bumps", badge: selectedBumps.length || undefined },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative px-4 py-2.5 text-xs font-semibold rounded-none bg-transparent border-0 text-zinc-500 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-none transition-colors"
                  >
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── TAB: GERAL ── */}
            <TabsContent value="geral" className="mt-0">
              <ScrollArea className="max-h-[55vh]">
                <div className="px-5 py-4 space-y-5">

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Título da página</Label>
                    <Input value={editConfig.heroTitle || ""} onChange={(e) => set("heroTitle", e.target.value)} placeholder="Promoção por tempo limitado" className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Texto do botão de compra</Label>
                    <Input value={editConfig.payButtonText || ""} onChange={(e) => set("payButtonText", e.target.value)} placeholder="Comprar agora" className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cor principal</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={editConfig.primaryColor || "#22a559"} onChange={(e) => set("primaryColor", e.target.value)} className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-900 cursor-pointer p-0.5" />
                      <Input value={editConfig.primaryColor || ""} onChange={(e) => set("primaryColor", e.target.value)} placeholder="#22a559" className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 h-10 font-mono" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Moeda</Label>
                      <Select value={editConfig.checkoutCurrency || "AUTO"} onValueChange={(v) => set("checkoutCurrency", v)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-10 focus:ring-emerald-500"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          <SelectItem value="AUTO">Auto</SelectItem>
                          <SelectItem value="MZN">MZN</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="BRL">BRL</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="AOA">AOA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Idioma</Label>
                      <Select value={editConfig.checkoutLanguage || "pt"} onValueChange={(v) => set("checkoutLanguage", v)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-10 focus:ring-emerald-500"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          <SelectItem value="pt">Português</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Banner de Checkout</Label>
                    {editConfig.heroImageUrl ? (
                      <div className="relative group">
                        <img src={editConfig.heroImageUrl} alt="Banner" className="w-full h-28 object-cover rounded-lg" />
                        <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => set("heroImageUrl", "")}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors bg-zinc-950/30">
                        {isUploadingBanner ? <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /> : <><ImageIcon className="w-4 h-4 text-zinc-600 mb-1" /><span className="text-xs text-zinc-500">Clique para enviar banner</span></>}
                        <input type="file" accept="image/*" className="hidden" disabled={isUploadingBanner} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); e.target.value = ""; }} />
                      </label>
                    )}
                  </div>

                  {/* Timer */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Temporizador</p>
                        <p className="text-xs text-zinc-500">Cria urgência na página</p>
                      </div>
                      <Switch checked={!!editConfig.showTimer} onCheckedChange={(v) => set("showTimer", v)} />
                    </div>
                    {editConfig.showTimer && (
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Minutos</Label>
                        <Input type="number" min={1} max={60} value={editConfig.timerMinutes ?? 10} onChange={(e) => set("timerMinutes", Number(e.target.value))} className="bg-zinc-950 border-zinc-700 text-white h-10 focus-visible:ring-emerald-500" />
                      </div>
                    )}
                  </div>

                  {/* Campos opcionais */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Campos do formulário</p>
                    {[
                      { key: "showPhone", label: "Telefone" },
                      { key: "showCpf", label: "CPF" },
                      { key: "showSurname", label: "Sobrenome" },
                      { key: "showAddress", label: "Endereço" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">{label}</span>
                        <Switch checked={!!(editConfig as any)[key]} onCheckedChange={(v) => set(key as keyof CheckoutConfig, v)} />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Texto do rodapé</Label>
                    <Input value={editConfig.footerText || ""} onChange={(e) => set("footerText", e.target.value)} placeholder="Meteorfy © 2026. Todos os direitos reservados." className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 h-10" />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── TAB: DEPOIMENTOS ── */}
            <TabsContent value="depoimentos" className="mt-0">
              <ScrollArea className="max-h-[55vh]">
                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400" /> Depoimentos</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Avaliações exibidas na página de checkout</p>
                    </div>
                    <Button size="sm" onClick={addTestimonial} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  </div>

                  {testimonialsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                      <Star className="w-8 h-8 text-zinc-700 mb-2" />
                      <p className="text-sm text-zinc-500">Nenhum depoimento ainda</p>
                      <p className="text-xs text-zinc-600 mt-1">Clique em "Adicionar" para criar o primeiro</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testimonialsList.map((tItem: any, index: number) => (
                        <div key={tItem.id} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Depoimento #{index + 1}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-600 hover:text-red-400" onClick={() => removeTestimonial(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-700 flex-shrink-0 flex items-center justify-center text-zinc-600 text-xs">
                              {tItem.imageUrl ? <img src={tItem.imageUrl} alt="" className="w-full h-full object-cover" /> : "Foto"}
                            </div>
                            <label className="cursor-pointer">
                              <span className="text-[11px] text-emerald-400 hover:underline">Enviar foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTestimonialPhoto(index, f); e.target.value = ""; }} />
                            </label>
                            {tItem.imageUrl && (
                              <button className="text-[11px] text-zinc-600 hover:text-red-400" onClick={() => updateTestimonial(index, "imageUrl", "")}>Remover</button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-zinc-500 uppercase font-bold">Nome</Label>
                              <Input value={tItem.name} onChange={(e) => updateTestimonial(index, "name", e.target.value)} className="bg-zinc-950 border-zinc-700 text-white h-8 text-xs mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-[10px] text-zinc-500 uppercase font-bold">Estrelas (1-5)</Label>
                              <Input type="number" min={1} max={5} value={tItem.rating} onChange={(e) => updateTestimonial(index, "rating", parseInt(e.target.value) || 5)} className="bg-zinc-950 border-zinc-700 text-white h-8 text-xs mt-0.5" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] text-zinc-500 uppercase font-bold">Texto do depoimento</Label>
                            <Textarea value={tItem.text} onChange={(e) => updateTestimonial(index, "text", e.target.value)} className="bg-zinc-950 border-zinc-700 text-white h-16 text-xs resize-none mt-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── TAB: ORDER BUMPS ── */}
            <TabsContent value="orderbumps" className="mt-0">
              <ScrollArea className="max-h-[55vh]">
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5"><ShoppingCart className="w-4 h-4 text-emerald-400" /> Order Bumps</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Seleccione produtos extra a oferecer durante o checkout</p>
                  </div>

                  {orderBumpOptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                      <ShoppingCart className="w-8 h-8 text-zinc-700 mb-2" />
                      <p className="text-sm text-zinc-500">Nenhum produto disponível</p>
                      <p className="text-xs text-zinc-600 mt-1">Crie e aprove outros produtos para usá-los como order bumps</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orderBumpOptions.map((p) => {
                        const selected = selectedBumps.includes(p.id);
                        return (
                          <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected ? "border-emerald-600/50 bg-emerald-950/30" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}>
                            <Checkbox checked={selected} onCheckedChange={() => toggleOrderBump(p.id)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0" />
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500 text-xs font-bold">{p.name.charAt(0)}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.name}</p>
                              <p className="text-xs text-emerald-400 font-semibold">+ {formatPrice(p)}</p>
                            </div>
                            {selected && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-zinc-800/60 flex gap-3">
            <Button variant="ghost" className="flex-1 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600" onClick={() => setEditCheckoutId(null)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleSaveCheckout} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
