import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Send, Image as ImageIcon, Globe, FileText, Layout as LayoutIcon, MessageCircle, ArrowLeft, Plus, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [deliveryMethod, setDeliveryMethod] = useState<"link" | "file">("link");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    currency: "USD",
    description: "",
    deliveryUrl: "",
    whatsappUrl: "",
    imageUrl: "",
    deliveryFiles: [] as string[],
    noEmailDelivery: false,
    paymentMethods: ["paypal"] as string[],
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: (product.price / 100).toString(),
        currency: product.currency || "USD",
        description: product.description || "",
        deliveryUrl: product.deliveryUrl || "",
        whatsappUrl: product.whatsappUrl || "",
        imageUrl: product.imageUrl || "",
        deliveryFiles: product.deliveryFiles || [],
        noEmailDelivery: product.noEmailDelivery || false,
        paymentMethods: product.paymentMethods || ["paypal"],
      });
      setImagePreview(product.imageUrl || "");
      if (product.deliveryFiles && product.deliveryFiles.length > 0) {
        setDeliveryMethod("file");
      }
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

    try {
      await updateProduct.mutateAsync({
        id: id!,
        name: formData.name,
        price: Math.round(parseFloat(formData.price) * 100),
        currency: formData.currency,
        description: formData.description,
        deliveryUrl: formData.deliveryUrl,
        whatsappUrl: formData.whatsappUrl,
        imageUrl: formData.imageUrl,
        deliveryFiles: formData.deliveryFiles,
        noEmailDelivery: formData.noEmailDelivery,
        paymentMethods: formData.paymentMethods,
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
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </Layout>
    );
  }

  const steps = [
    { id: 1, title: "Informações Básicas" },
    { id: 2, title: "Métodos de Pagamento" },
    { id: 3, title: "Método de entrega" }
  ];

  return (
    <Layout title="Editar Produto" subtitle={`Editando: ${formData.name}`}>
      <div className="mb-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => setLocation("/products")} className="text-zinc-400">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-[#18181b] border border-zinc-800/60 shadow-lg rounded-2xl p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${
                    step >= s.id ? 'text-zinc-300' : 'text-zinc-500'
                  }`}>
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-[1px] flex-1 mx-4 ${
                    step > s.id ? 'bg-purple-600' : 'bg-zinc-800'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {step === 1 ? (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-200">Capa do Produto</label>
                  <div
                    className={`border-2 border-dashed border-zinc-800 rounded-2xl w-[200px] h-[200px] mx-auto overflow-hidden cursor-pointer relative group ${
                      isUploadingImage ? 'pointer-events-none opacity-70' : ''
                    }`}
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
                      className="hidden"
                      accept="image/*"
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
                        <LayoutIcon className="w-3.5 h-3.5 text-zinc-400" />
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
                      <label className="text-sm font-bold text-zinc-200">Preço e Moeda</label>
                    </div>
                    <label className="text-xs font-medium text-zinc-500">Moeda do produto</label>
                    <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                      <SelectTrigger className="bg-black/40 border-zinc-800 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="AUD">AUD - Dólar Australiano</SelectItem>
                        <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                        <SelectItem value="CAD">CAD - Dólar Canadense</SelectItem>
                        <SelectItem value="CNY">CNY - Yuan Chinês</SelectItem>
                        <SelectItem value="CZK">CZK - Coroa Tcheca</SelectItem>
                        <SelectItem value="DKK">DKK - Coroa Dinamarquesa</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
                        <SelectItem value="HKD">HKD - Dólar de Hong Kong</SelectItem>
                        <SelectItem value="HUF">HUF - Florim Húngaro</SelectItem>
                        <SelectItem value="ILS">ILS - Shekel Israelense</SelectItem>
                        <SelectItem value="JPY">JPY - Iene Japonês</SelectItem>
                        <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                        <SelectItem value="MYR">MYR - Ringgit Malaio</SelectItem>
                        <SelectItem value="MZN">MZN - Metical Moçambicano</SelectItem>
                        <SelectItem value="NOK">NOK - Coroa Norueguesa</SelectItem>
                        <SelectItem value="NZD">NZD - Dólar Neozelandês</SelectItem>
                        <SelectItem value="PHP">PHP - Peso Filipino</SelectItem>
                        <SelectItem value="PLN">PLN - Zloty Polonês</SelectItem>
                        <SelectItem value="SEK">SEK - Coroa Sueca</SelectItem>
                        <SelectItem value="SGD">SGD - Dólar de Singapura</SelectItem>
                        <SelectItem value="THB">THB - Baht Tailandês</SelectItem>
                        <SelectItem value="TWD">TWD - Dólar de Taiwan</SelectItem>
                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="text-xs font-medium text-zinc-500">Valor ({formData.currency})</label>
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
            ) : step === 2 ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-zinc-300 font-medium pb-2 border-b border-zinc-800/50">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  Métodos de Pagamento
                </div>

                <p className="text-sm text-zinc-400">Selecione os métodos de pagamento que estarão disponíveis para este produto:</p>

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
                        {formData.paymentMethods.includes('paypal') && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">PayPal</p>
                        <p className="text-xs text-zinc-500">Pagamentos via PayPal e Cartão de Crédito</p>
                      </div>
                      <div className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Ativo</div>
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
                        {formData.paymentMethods.includes('stripe') && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Stripe</p>
                        <p className="text-xs text-zinc-500">Pagamentos via Cartão de Crédito e Pix (Em breve)</p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Em breve</div>
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
                        {formData.paymentMethods.includes('pix') && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Pix</p>
                        <p className="text-xs text-zinc-500">Pagamento instantâneo via Pix (Em breve)</p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Em breve</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex gap-2">
                  <Button variant="outline" className={`flex-1 h-11 ${deliveryMethod === "link" ? "border-purple-500 text-purple-400" : ""}`} onClick={() => setDeliveryMethod("link")}>Link</Button>
                  <Button variant="outline" className={`flex-1 h-11 ${deliveryMethod === "file" ? "border-purple-500 text-purple-400" : ""}`} onClick={() => setDeliveryMethod("file")}>Arquivo</Button>
                </div>
                {deliveryMethod === "link" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-zinc-800 rounded-lg">
                          <Globe className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <label className="text-sm font-bold text-zinc-200">Link de Acesso</label>
                      </div>
                      <Input
                        className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500"
                        placeholder="https://exemplo.com/acesso"
                        value={formData.deliveryUrl}
                        onChange={(e) => setFormData({ ...formData, deliveryUrl: e.target.value })}
                      />
                      <p className="text-[11px] text-zinc-500 ml-1 font-medium text-purple-400/80">Este é o link que o cliente receberá automaticamente no e-mail de entrega assim que o pagamento for aprovado.</p>
                    </div>
                  </div>
                )}
                {deliveryMethod === "file" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Arquivos de entrega</label>
                      <div className="bg-black/40 border border-zinc-800 rounded-xl p-4 min-h-[100px] flex flex-col items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-zinc-600" />
                        <p className="text-sm text-zinc-500">O upload de novos arquivos não está disponível na edição. Os arquivos atuais serão enviados no e-mail de entrega após a compra.</p>
                      </div>
                      {formData.deliveryFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Arquivos atuais ({formData.deliveryFiles.length})</p>
                          <div className="grid grid-cols-1 gap-2">
                            {formData.deliveryFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <a
                                    href={file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-zinc-300 hover:text-purple-400 truncate underline decoration-zinc-700 hover:decoration-purple-400 transition-colors"
                                  >
                                    {(() => {
                                      try {
                                        const parts = file.split('/');
                                        const filenameWithUuid = parts[parts.length - 1];
                                        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(filenameWithUuid)) {
                                          return decodeURIComponent(filenameWithUuid.substring(37));
                                        }
                                        return decodeURIComponent(filenameWithUuid);
                                      } catch {
                                        return "Arquivo";
                                      }
                                    })()}
                                  </a>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400" onClick={() => {
                                  setFormData({
                                    ...formData,
                                    deliveryFiles: formData.deliveryFiles.filter((_, i) => i !== idx)
                                  });
                                }}>
                                  <Plus className="w-4 h-4 rotate-45" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t border-zinc-800/50">
              {step > 1 && <Button variant="ghost" className="flex-1" onClick={() => setStep(step - 1)}>Voltar</Button>}
              <Button className="flex-[2] bg-purple-600 hover:bg-purple-500 h-12" onClick={() => step === 3 ? handleUpdate() : setStep(step + 1)}>
                {updateProduct.isPending ? <Loader2 className="animate-spin" /> : step === 3 ? "Salvar Alterações" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}