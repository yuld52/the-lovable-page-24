import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, ArrowLeft, Users, Percent, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useLocation, useRoute } from "wouter";
import { useUpload } from "@/hooks/use-upload";

export default function EditProduct() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/products/edit/:id");
  const id = params?.id ? parseInt(params.id) : null;

  const { data: product, isLoading: isLoadingProduct } = useProduct(id!);
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();
  const { uploadFile, isUploading: isUploadingImage } = useUpload();

  const [step, setStep] = useState(1);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    deliveryUrl: "",
    whatsappUrl: "",
    imageUrl: "",
    deliveryFiles: [] as string[],
    noEmailDelivery: false,
    paymentMethods: ["paypal"] as string[],
    // Campos de afiliado
    isAffiliate: false,
    affiliateCommission: "",
    affiliateCookieDays: "30",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: (product.price / 100).toString(),
        description: product.description || "",
        deliveryUrl: product.deliveryUrl || "",
        whatsappUrl: product.whatsappUrl || "",
        imageUrl: product.imageUrl || "",
        deliveryFiles: product.deliveryFiles || [],
        noEmailDelivery: product.noEmailDelivery || false,
        paymentMethods: product.paymentMethods || ["paypal"],
        // Campos de afiliado
        isAffiliate: product.isAffiliate || false,
        affiliateCommission: product.affiliateCommission?.toString() || "",
        affiliateCookieDays: product.affiliateCookieDays?.toString() || "30",
      });
      setImagePreview(product.imageUrl || "");
    }
  }, [product]);

  const handleImageUpload = async (file: File) => {
    setImagePreview(URL.createObjectURL(file));
    const result = await uploadFile(file);
    if (result) {
      setFormData((prev) => ({ ...prev, imageUrl: result.uploadURL }));
      toast({ title: "Imagem carregada", description: "A imagem foi salva com sucesso!" });
    } else {
      setImagePreview(formData.imageUrl);
      toast({ title: "Erro", description: "Falha ao carregar imagem", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: "Erro", description: "Nome e preço são obrigatórios", variant: "destructive" });
      setStep(1);
      return;
    }

    // Validação de afiliado
    if (formData.isAffiliate) {
      const commission = parseInt(formData.affiliateCommission);
      if (isNaN(commission) || commission <= 0 || commission > 100) {
        toast({ title: "Erro", description: "Comissão do afiliado deve ser entre 1 e 100", variant: "destructive" });
        setStep(4);
        return;
      }
    }

    try {
      await updateProduct.mutateAsync({
        id: id!,
        name: formData.name,
        price: Math.round(parseFloat(formData.price) * 100),
        description: formData.description,
        deliveryUrl: formData.deliveryUrl,
        whatsappUrl: formData.whatsappUrl,
        imageUrl: formData.imageUrl,
        deliveryFiles: formData.deliveryFiles,
        noEmailDelivery: formData.noEmailDelivery,
        paymentMethods: formData.paymentMethods,
        // Campos de afiliado
        isAffiliate: formData.isAffiliate,
        affiliateCommission: formData.isAffiliate ? parseInt(formData.affiliateCommission) || null : null,
        affiliateCookieDays: formData.isAffiliate ? parseInt(formData.affiliateCookieDays) || 30 : 30,
      });
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      setLocation("/products");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const togglePaymentMethod = (method: string) => {
    const current = formData.paymentMethods;
    if (current.includes(method)) {
      if (current.length === 1) {
        toast({ title: "Atenção", description: "Pelo menos um método deve estar selecionado", variant: "destructive" });
        return;
      }
      setFormData({ ...formData, paymentMethods: current.filter(m => m !== method) });
    } else {
      setFormData({ ...formData, paymentMethods: [...current, method] });
    }
  };

  if (isLoadingProduct) {
    return (
      <Layout title="Editar Produto">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  const steps = [
    { id: 1, title: "Informações Básicas" },
    { id: 2, title: "Métodos de Pagamento" },
    { id: 3, title: "Método de entrega" },
    { id: 4, title: "Afiliados" }
  ];

  return (
    <Layout title="Editar Produto" subtitle={`Editando: ${formData.name}`}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => setLocation("/products")} className="text-zinc-400 hover:text-white -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-[#18181b] border border-zinc-800/60 shadow-lg rounded-2xl p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={`flex flex-col items-center gap-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}>
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${step >= s.id ? 'text-zinc-300' : 'text-zinc-500'`}>
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-[1px] flex-1 mx-4 ${step > s.id ? 'bg-purple-600' : 'bg-zinc-800'`} />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-200">Capa do Produto</label>
                  <div
                    className={`border-2 border-dashed border-zinc-800 rounded-2xl w-[200px] h-[200px] mx-auto overflow-hidden cursor-pointer group relative ${isUploadingImage ? 'pointer-events-none opacity-70' : ''}`}
                    onClick={() => !isUploadingImage && document.getElementById('edit-image')?.click()}
                  >
                    {isUploadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      </div>
                    )}
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Capa do produto" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                          <ImageIcon className="w-8 h-8 text-white" />
                          <p className="text-xs font-bold text-white text-center px-2">Alterar capa</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500"><Plus /></div>
                    )}
                    <input
                      id="edit-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-zinc-800 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <label className="text-sm font-bold text-zinc-200">Nome</label>
                    </div>
                    <Input
                      className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-zinc-800 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <label className="text-sm font-bold text-zinc-200">Descrição</label>
                    </div>
                    <textarea
                      className="w-full bg-black/40 border border-zinc-800 rounded-md p-3 min-h-[120px] text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-600 resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva detalhadamente o que seu cliente receberá ao comprar este produto..."
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-zinc-800 rounded-lg">
                        <span className="text-sm font-bold text-zinc-400">$</span>
                      </div>
                      <label className="text-sm font-bold text-zinc-200">Preço (USD)</label>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500"
                      value={formData.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || Number(val) >= 0) {
                          setFormData({ ...formData, price: val });
                        }
                      }}
                      placeholder="Ex: 19.90"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <p className="text-sm text-zinc-400">Selecione os métodos de pagamento:</p>
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.paymentMethods.includes('paypal')
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                    }`}
                    onClick={() => togglePaymentMethod('paypal')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.paymentMethods.includes('paypal')
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-zinc-600'
                      }`}>
                        {formData.paymentMethods.includes('paypal') && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">PayPal</p>
                        <p className="text-xs text-zinc-500">Pagamentos via PayPal e Cartão de Crédito</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.paymentMethods.includes('stripe')
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                    }`}
                    onClick={() => togglePaymentMethod('stripe')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.paymentMethods.includes('stripe')
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-zinc-600'
                      }`}>
                        {formData.paymentMethods.includes('stripe') && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Stripe</p>
                        <p className="text-xs text-zinc-500">Pagamentos via Cartão de Crédito e Pix (Em breve)</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.paymentMethods.includes('pix')
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                    }`}
                    onClick={() => togglePaymentMethod('pix')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.paymentMethods.includes('pix')
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-zinc-600'
                      }`}>
                        {formData.paymentMethods.includes('pix') && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Pix</p>
                        <p className="text-xs text-zinc-500">Pagamento instantâneo via Pix (Em breve)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-200">Link de Acesso</label>
                  <Input
                    placeholder="https://exemplo.com/acesso"
                    value={formData.deliveryUrl}
                    onChange={(e) => setFormData({ ...formData, deliveryUrl: e.target.value })}
                    className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.isAffiliate ? 'bg-purple-500/10' : 'bg-zinc-800/50'}`}>
                        <Users className={`w-5 h-5 ${formData.isAffiliate ? 'text-purple-400' : 'text-zinc-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Ativar Sistema de Afiliados</p>
                        <p className="text-xs text-zinc-500">Permita que outros usuários vendam seu produto</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.isAffiliate}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAffiliate: checked })}
                    />
                  </div>

                  {formData.isAffiliate && (
                    <div className="space-y-4 pl-4 border-l-2 border-purple-500/30 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-purple-400" />
                          <label className="text-sm font-bold text-zinc-200">Comissão do Afiliado (%)</label>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500"
                          value={formData.affiliateCommission}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                              setFormData({ ...formData, affiliateCommission: val });
                            }
                          }}
                          placeholder="Ex: 10 (para 10%)"
                        />
                        <p className="text-[11px] text-zinc-500 ml-1">Porcentagem que o afiliado receberá sobre cada venda</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-purple-400" />
                          <label className="text-sm font-bold text-zinc-200">Dias de Cookie</label>
                        </div>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500"
                          value={formData.affiliateCookieDays}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 365)) {
                              setFormData({ ...formData, affiliateCookieDays: val });
                            }
                          }}
                          placeholder="30"
                        />
                        <p className="text-[11px] text-zinc-500 ml-1">Por quantos dias o cookie do afiliado deve ser válido</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t border-zinc-800/50">
              {step > 1 && (
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep(step - 1)}
                >
                  Voltar
                </Button>
              )}
              <Button
                onClick={() => step === 4 ? handleUpdate() : setStep(step + 1)}
                className="flex-[2] bg-purple-600 hover:bg-purple-500 text-white font-bold h-12"
              >
                {updateProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 4 ? "Salvar Alterações" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}