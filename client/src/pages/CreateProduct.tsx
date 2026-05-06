import { useState } from "react";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { Layout } from "@/components/Layout";
import { useCreateProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  PackageOpen,
  Check,
  Send,
  Image as ImageIcon,
  Globe,
  FileText,
  Layout as LayoutIcon,
  MessageCircle,
  ArrowLeft,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { useUpload } from "@/hooks/use-upload";
import { Progress } from "@/components/ui/progress";

export default function CreateProduct() {
  const [, setLocation] = useLocation();
  const createProduct = useCreateProduct();
  const { toast } = useToast();
  const { uploadFile, isUploading: isUploadingImage } = useUpload();
  const [isUploadingDeliveryFiles, setIsUploadingDeliveryFiles] = useState(false);
  const [deliveryUpload, setDeliveryUpload] = useState<{
    total: number;
    done: number;
    currentName?: string;
  }>({ total: 0, done: 0 });

  const [step, setStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<"link" | "file">("link");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    currency: "USD",
    description: "",
    deliveryUrl: "",
    whatsappUrl: "",
    imageUrl: "",
    deliveryFiles: [] as string[],
    noEmailDelivery: false,
    paymentMethods: ["paypal", "mpesa", "emola", "googlepay"] as string[],
  });
  const [showErrors, setShowErrors] = useState(false);

  const handleImageUpload = async (file: File) => {
    setImagePreview(URL.createObjectURL(file));
    const result = await uploadFile(file);
    if (result) {
      setNewProduct((prev) => ({ ...prev, imageUrl: result.uploadURL }));
      toast({ title: "Imagem carregada", description: "A imagem foi salva com sucesso!" });
    } else {
      setImagePreview("");
      toast({ title: "Erro", description: "Falha ao carregar imagem", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!isStepValid()) {
      setShowErrors(true);

      const hasLink = newProduct.deliveryUrl.trim() !== "";
      const isUrlInvalid =
        hasLink &&
        !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(
          newProduct.deliveryUrl.trim()
        );

      toast({
        title: "Campos obrigatórios",
        description:
          step === 1
            ? "Por favor, preencha todos os campos obrigatórios."
            : step === 2
            ? "Selecione pelo menos um método de pagamento."
            : isUrlInvalid
              ? "Por favor, insira um link válido com domínio."
              : "Por favor, forneça um link ou adicione arquivos para entrega.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload real dos arquivos de entrega (gera URLs para download)
      let deliveryFileUrls: string[] = [];
      if (deliveryFiles.length > 0) {
        const MAX_BYTES = 64 * 1024 * 1024; // 64MB
        const tooLarge = deliveryFiles.find((f) => f.size > MAX_BYTES);
        if (tooLarge) {
          toast({
            title: "Arquivo muito grande",
            description: `O arquivo "${tooLarge.name}" excede 64MB.`,
            variant: "destructive",
          });
          return;
        }

        setIsUploadingDeliveryFiles(true);
        setDeliveryUpload({ total: deliveryFiles.length, done: 0, currentName: deliveryFiles[0]?.name });
        try {
          const CONCURRENCY = 3;

          const uploadOne = async (file: File) => {
            setDeliveryUpload((prev) => ({ ...prev, currentName: file.name }));

            const formData = new FormData();
            formData.append("file", file);

            const user = auth.currentUser;
            if (!user) throw new Error("Usuário não autenticado");
            const idToken = await getIdToken(user);

            const response = await fetch("/api/upload", {
              method: "POST",
              headers: { "Authorization": `Bearer ${idToken}` },
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || "Falha no upload");
            }

            const data = await response.json();
            const publicUrl = data.url;

            if (!publicUrl) throw new Error("Falha ao obter URL pública do arquivo");

            setDeliveryUpload((prev) => ({ ...prev, done: Math.min(prev.done + 1, prev.total) }));
            return publicUrl;
          };

          const results: string[] = new Array(deliveryFiles.length);
          let nextIndex = 0;

          const worker = async () => {
            while (true) {
              const idx = nextIndex;
              nextIndex += 1;
              if (idx >= deliveryFiles.length) break;
              results[idx] = await uploadOne(deliveryFiles[idx]);
            }
          };

          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, deliveryFiles.length) }, () => worker())
          );

          deliveryFileUrls = results.filter(Boolean);
        } finally {
          setIsUploadingDeliveryFiles(false);
          setDeliveryUpload({ total: 0, done: 0, currentName: undefined });
        }
      }

      await createProduct.mutateAsync({
        name: newProduct.name,
        price: Math.round(parseFloat(newProduct.price) * 100),
        currency: newProduct.currency,
        description: newProduct.description,
        deliveryUrl: newProduct.deliveryUrl,
        whatsappUrl: newProduct.whatsappUrl,
        imageUrl: newProduct.imageUrl,
        deliveryFiles: deliveryFileUrls,
        noEmailDelivery: newProduct.noEmailDelivery,
        paymentMethods: newProduct.paymentMethods,
      });

      toast({ title: "Sucesso", description: "Produto criado com sucesso!" });
      setLocation("/products");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getMinPrice = (currency: string) => currency === "MZN" ? 50 : 3.90;
  const getMaxPrice = (currency: string) => currency === "MZN" ? 999999 : 99999;

  const isPriceBelowMin = () => {
    const price = parseFloat(newProduct.price);
    if (isNaN(price)) return false;
    return price < getMinPrice(newProduct.currency);
  };

  const isPriceAboveMax = () => {
    const price = parseFloat(newProduct.price);
    if (isNaN(price)) return false;
    return price > getMaxPrice(newProduct.currency);
  };

  const isStepValid = () => {
    if (step === 1) {
      if (newProduct.name.trim().length < 3 || !newProduct.price.trim()) return false;
      if (isPriceBelowMin() || isPriceAboveMax()) return false;
      if (newProduct.description.trim().length < 200) return false;
      return true;
    }
    if (step === 2) {
      return newProduct.paymentMethods.length > 0;
    }
    if (step === 3) {
      const hasLink = newProduct.deliveryUrl.trim() !== "";
      const hasFiles = deliveryFiles.length > 0;

      if (!hasLink && !hasFiles) return false;

      if (hasLink) {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
        return urlPattern.test(newProduct.deliveryUrl.trim());
      }

      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid()) {
      setShowErrors(true);

      const hasLink = newProduct.deliveryUrl.trim() !== "";
      const isUrlInvalid =
        hasLink &&
        !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(
          newProduct.deliveryUrl.trim()
        );

      const minPriceMsg = newProduct.currency === "MZN" ? "50 MT" : `3,90 ${newProduct.currency}`;
      toast({
        title: "Campos obrigatórios",
        description:
          step === 1
            ? (newProduct.name.trim() && newProduct.price.trim() && isPriceBelowMin())
              ? `O preço mínimo do produto é ${minPriceMsg}.`
              : "Preencha o nome e o preço do produto para continuar."
            : step === 2
              ? "Selecione pelo menos um método de pagamento."
              : isUrlInvalid
                ? "Por favor, insira um link válido com domínio."
                : "Forneça um link de acesso ou adicione arquivos para a entrega.",
        variant: "destructive",
      });
      return;
    }
    setShowErrors(false);
    setStep(step + 1);
  };

  const steps = [
    { id: 1, title: "Informações básicas" },
    { id: 2, title: "Métodos de Pagamento" },
    { id: 3, title: "Método de entrega" }
  ];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-4 md:mb-8 px-1 md:px-2 max-w-2xl mx-auto">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className={`flex flex-col items-center gap-1 md:gap-2`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>
              {step > s.id ? <Check className="w-4 h-4" /> : s.id}
            </div>
            <span className={`text-[9px] md:text-[10px] font-medium text-center leading-tight max-w-[64px] ${step >= s.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {s.title}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-[1px] flex-1 mx-2 md:mx-4 ${step > s.id ? 'bg-purple-600' : 'bg-zinc-800'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const togglePaymentMethod = (method: string) => {
    const current = newProduct.paymentMethods;
    if (current.includes(method)) {
      if (current.length === 1) {
        toast({ title: "Atenção", description: "Pelo menos um método deve estar selecionado", variant: "destructive" });
        return;
      }
      setNewProduct({ ...newProduct, paymentMethods: current.filter(m => m !== method) });
    } else {
      setNewProduct({ ...newProduct, paymentMethods: [...current, method] });
    }
  };

  return (
    <Layout title="Criar Novo Produto" subtitle="Siga as etapas para cadastrar seu produto">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="text-zinc-400 hover:text-white -ml-2"
          onClick={() => setLocation("/products")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para produtos
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-[#18181b] border border-zinc-800/60 rounded-2xl p-4 md:p-8 shadow-xl">
          {renderStepIndicator()}

          <div className="space-y-6 mt-4 md:mt-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 text-zinc-300 font-medium pb-2 border-b border-zinc-800/50">
                  <LayoutIcon className="w-4 h-4 text-purple-500" />
                  Informações básicas
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-200">Capa do Produto</label>
                  <div
                    className={`border-2 border-dashed border-zinc-800 rounded-2xl p-0 flex flex-col items-center justify-center transition-colors cursor-pointer group relative overflow-hidden w-[200px] h-[200px] mx-auto ${imagePreview ? 'bg-transparent' : 'bg-zinc-900/40 hover:bg-zinc-900/60'} ${isUploadingImage ? 'pointer-events-none opacity-70' : ''}`}
                    onClick={() => !isUploadingImage && document.getElementById('image-upload')?.click()}
                  >
                    {isUploadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      </div>
                    )}
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                          <ImageIcon className="w-8 h-8 text-white" />
                          <p className="text-xs font-bold text-white text-center px-2">Alterar capa</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-zinc-800/50 rounded-2xl group-hover:scale-110 transition-transform">
                          <Plus className="w-6 h-6 text-zinc-500" />
                        </div>
                        <div className="text-center space-y-1 p-4">
                          <p className="text-xs font-bold text-zinc-300">Capa Quadrada</p>
                          <p className="text-[10px] text-zinc-500">500x500px</p>
                        </div>
                      </>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-zinc-800 rounded-lg">
                        <PackageOpen className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <label className="text-sm font-bold text-zinc-200">Nome do produto</label>
                    </div>
                    <Input
                      className={`bg-black/40 h-11 focus-visible:ring-purple-500 ${
                        newProduct.name.length > 0 && newProduct.name.trim().length < 3
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : 'border-zinc-800'
                      }`}
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Ex: Curso completo de Marketing Digital"
                    />
                    {newProduct.name.length > 0 && newProduct.name.trim().length < 3 ? (
                      <p className="text-[10px] text-red-500 font-medium ml-1">Nome deve ter no mínimo 3 caracteres</p>
                    ) : (
                      <p className="text-[11px] text-zinc-500 ml-1">Este é o nome que aparecerá na página de checkout e no email</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-800 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <label className="text-sm font-bold text-zinc-200">Descrição <span className="text-red-400">*</span></label>
                      </div>
                      <span className={`text-[11px] font-medium ${newProduct.description.length >= 200 ? "text-emerald-400" : "text-zinc-500"}`}>
                        {newProduct.description.length}/200
                      </span>
                    </div>
                    <textarea
                      className={`w-full bg-black/40 border rounded-md min-h-[150px] p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-600 resize-none ${
                        showErrors && newProduct.description.trim().length < 200 ? "border-red-500" : "border-zinc-800"
                      }`}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Descreva detalhadamente o que seu cliente receberá ao comprar este produto..."
                    />
                    {showErrors && newProduct.description.trim().length < 200 && (
                      <p className="text-[11px] text-red-400">A descrição deve ter no mínimo 200 caracteres.</p>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-zinc-800 rounded-lg">
                      <span className="text-sm font-bold text-zinc-400">$</span>
                    </div>
                    <label className="text-sm font-bold text-zinc-200">Preço e Moeda</label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500">Moeda do produto</label>
                    <Select value={newProduct.currency} onValueChange={(val) => setNewProduct({ ...newProduct, currency: val })}>
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
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500">Valor ({newProduct.currency})</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`bg-black/40 h-11 focus-visible:ring-purple-500 ${
                        !newProduct.price
                          ? 'border-zinc-800'
                          : (isPriceBelowMin() || isPriceAboveMax())
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : 'border-zinc-800'
                      }`}
                      value={newProduct.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || Number(val) >= 0) {
                          setNewProduct({ ...newProduct, price: val });
                        }
                      }}
                      placeholder="Ex: 19.90"
                    />
                    {newProduct.price && isPriceAboveMax() ? (
                      <p className="text-[10px] text-red-500 font-medium ml-1">
                        Preço máximo: {newProduct.currency === "MZN" ? "999.999 MT" : `99.999 ${newProduct.currency}`}
                      </p>
                    ) : newProduct.price && isPriceBelowMin() ? (
                      <p className="text-[10px] text-red-500 font-medium ml-1">
                        Preço mínimo: {newProduct.currency === "MZN" ? "50 MT" : `3,90 ${newProduct.currency}`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-500 ml-1">
                        Mínimo: {newProduct.currency === "MZN" ? "50 MT" : `3,90 ${newProduct.currency}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 text-zinc-300 font-medium pb-2 border-b border-zinc-800/50">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  Métodos de Pagamento
                </div>

                <p className="text-sm text-zinc-400">Selecione os métodos de pagamento que estarão disponíveis para este produto:</p>

                <div className="space-y-3">
                  {/* M-Pesa — selectable */}
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      newProduct.paymentMethods.includes('mpesa')
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                    }`}
                    onClick={() => togglePaymentMethod('mpesa')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        newProduct.paymentMethods.includes('mpesa')
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-zinc-600'
                      }`}>
                        {newProduct.paymentMethods.includes('mpesa') && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">M-Pesa</p>
                        <p className="text-xs text-zinc-500">Pagamentos via M-Pesa</p>
                      </div>
                      <div className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Disponível</div>
                    </div>
                  </div>

                  {/* e-Mola — selectable */}
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      newProduct.paymentMethods.includes('emola')
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                    }`}
                    onClick={() => togglePaymentMethod('emola')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        newProduct.paymentMethods.includes('emola')
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-zinc-600'
                      }`}>
                        {newProduct.paymentMethods.includes('emola') && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">e-Mola</p>
                        <p className="text-xs text-zinc-500">Pagamentos via e-Mola</p>
                      </div>
                      <div className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Disponível</div>
                    </div>
                  </div>

                  {/* PayPal — locked */}
                  <div className="p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded border-2 border-zinc-700 flex items-center justify-center" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-400">PayPal</p>
                        <p className="text-xs text-zinc-600">Pagamentos via PayPal e Cartão de Crédito</p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Em breve</div>
                    </div>
                  </div>

                  {/* Stripe — locked */}
                  <div className="p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded border-2 border-zinc-700 flex items-center justify-center" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-400">Stripe</p>
                        <p className="text-xs text-zinc-600">Pagamentos via Cartão de Crédito e Pix</p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Em breve</div>
                    </div>
                  </div>

                  {/* Pix — locked */}
                  <div className="p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded border-2 border-zinc-700 flex items-center justify-center" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-400">Pix</p>
                        <p className="text-xs text-zinc-600">Pagamento instantâneo via Pix</p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Em breve</div>
                    </div>
                  </div>

                  {/* Google Pay — locked */}
                  <div className="p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded border-2 border-zinc-700 flex items-center justify-center" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-400">Google Pay</p>
                        <p className="text-xs text-zinc-600">Pagamentos rápidos via Google Pay</p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Em breve</div>
                    </div>
                  </div>
                </div>

                {showErrors && newProduct.paymentMethods.length === 0 && (
                  <p className="text-[10px] text-red-500 font-medium ml-1">Selecione pelo menos um método de pagamento</p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 text-zinc-300 font-medium pb-2 border-b border-zinc-800/50">
                  <Send className="w-4 h-4 text-purple-500" />
                  Entrega do Produto
                </div>

                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-zinc-800 rounded-lg">
                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <label className="text-sm font-bold text-zinc-200">Link de Acesso (Opcional se houver arquivos)</label>
                    </div>
                    <Input
                      className={`bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500 ${showErrors && newProduct.deliveryUrl && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(newProduct.deliveryUrl.trim())
                        ? 'border-red-500/50 focus-visible:ring-red-500'
                        : ''
                        }`}
                      placeholder="https://exemplo.com/acesso"
                      value={newProduct.deliveryUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, deliveryUrl: e.target.value })}
                    />
                    {showErrors && newProduct.deliveryUrl && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(newProduct.deliveryUrl.trim()) && (
                      <p className="text-[10px] text-red-500 font-medium ml-1">Insira um link válido com domínio (ex: google.com)</p>
                    )}
                    <p className="text-[11px] text-zinc-500 ml-1 font-medium text-purple-400/80">O cliente receberá este link automaticamente por e-mail.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#18181b] px-2 text-zinc-500 font-bold">Ou envie arquivos</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-2xl p-4 md:p-8 flex flex-col items-center justify-center gap-3 md:gap-4 transition-colors cursor-pointer group ${showErrors && !newProduct.deliveryUrl && deliveryFiles.length === 0
                        ? 'border-red-500/50 bg-red-500/5'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60'
                        }`}
                      onClick={() => document.getElementById('file-delivery-upload')?.click()}
                    >
                      <div className="p-4 bg-zinc-800/50 rounded-2xl group-hover:scale-110 transition-transform">
                        <Plus className="w-8 h-8 text-zinc-500" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm md:text-base font-bold text-zinc-300">Arraste arquivos ou clique para selecionar</p>
                        <p className="text-xs md:text-sm text-zinc-500">Tamanho máximo: 64MB • Limite: 20 arquivos</p>
                      </div>
                      <input
                        id="file-delivery-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length + deliveryFiles.length > 20) {
                            toast({ title: "Limite excedido", variant: "destructive" });
                            return;
                          }
                          setDeliveryFiles(prev => [...prev, ...files]);
                        }}
                      />
                    </div>

                    {deliveryFiles.length > 0 && (
                      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Arquivos ({deliveryFiles.length}/20)</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-red-400 hover:bg-red-500/10"
                            onClick={() => setDeliveryFiles([])}
                            disabled={isUploadingDeliveryFiles}
                          >
                            Remover todos
                          </Button>
                        </div>

                        {isUploadingDeliveryFiles && deliveryUpload.total > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span className="truncate">Enviando: {deliveryUpload.currentName ?? "..."}</span>
                              <span className="tabular-nums">{deliveryUpload.done}/{deliveryUpload.total}</span>
                            </div>
                            <Progress value={(deliveryUpload.done / deliveryUpload.total) * 100} />
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {deliveryFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                              <span className="text-xs text-zinc-300 truncate">{file.name}</span>
                              <button
                                onClick={() =>
                                  setDeliveryFiles((prev) => prev.filter((_, i) => i !== idx))
                                }
                                disabled={isUploadingDeliveryFiles}
                              >
                                <Plus className="w-3.5 h-3.5 text-zinc-500 rotate-45" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-zinc-800/50">
              {step > 1 && (
                <Button
                  variant="ghost"
                  className="flex-1 h-12 text-zinc-400 hover:text-white"
                  onClick={() => setStep(step - 1)}
                >
                  Voltar
                </Button>
              )}
              <Button
                className="flex-[2] h-12 bg-purple-600 hover:bg-purple-500 text-white font-bold border-0 shadow-none"
                onClick={() => (step === 3 ? handleCreate() : handleNext())}
                disabled={createProduct.isPending || isUploadingDeliveryFiles || isUploadingImage || !isStepValid()}
              >
                {createProduct.isPending || isUploadingDeliveryFiles ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Enviando...
                  </span>
                ) : step === 3 ? (
                  "Finalizar e Criar Produto"
                ) : (
                  "Próximo passo"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}