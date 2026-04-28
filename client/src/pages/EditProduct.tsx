import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Send, Image as ImageIcon, Globe, FileText, Layout as LayoutIcon, MessageCircle, ArrowLeft, Plus, Trash2 } from "lucide-react";
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
  const { uploadFile: uploadHeroImage, isUploading: isUploadingHero } = useUpload();
  const { uploadFile: uploadDeliveryFile, isUploading: isUploadingDelivery } = useUpload();

  const [step, setStep] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<"link" | "file">("link");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploadingNewFiles, setIsUploadingNewFiles] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    deliveryUrl: "",
    whatsappUrl: "",
    imageUrl: "",
    deliveryFiles: [] as string[],
    noEmailDelivery: false,
    active: true
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
        active: product.active ?? true
      });
      setImagePreview(product.imageUrl || "");
      if (product.deliveryFiles && product.deliveryFiles.length > 0) {
        setDeliveryMethod("file");
      }
    }
  }, [product]);

  const handleImageUpload = async (file: File) => {
    setImagePreview(URL.createObjectURL(file));
    const result = await uploadHeroImage(file);
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
      let finalDeliveryFiles = [...formData.deliveryFiles];
      
      // Upload new files if any
      if (newFiles.length > 0) {
        setIsUploadingNewFiles(true);
        try {
          for (const file of newFiles) {
            const result = await uploadDeliveryFile(file);
            if (result?.uploadURL) {
              finalDeliveryFiles.push(result.uploadURL);
            } else {
              throw new Error(`Falha no upload do arquivo: ${file.name}`);
            }
          }
        } finally {
          setIsUploadingNewFiles(false);
        }
      }

      await updateProduct.mutateAsync({
        id: id!,
        name: formData.name,
        price: Math.round(parseFloat(formData.price) * 100),
        description: formData.description,
        deliveryUrl: formData.deliveryUrl,
        whatsappUrl: formData.whatsappUrl,
        imageUrl: formData.imageUrl,
        deliveryFiles: finalDeliveryFiles,
        noEmailDelivery: formData.noEmailDelivery,
        active: formData.active
      });
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      setLocation("/products");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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
    { id: 1, title: "Informações básicas" },
    { id: 2, title: "Método de entrega" }
  ];

  return (
    <Layout title="Editar Produto" subtitle={`Editando: ${formData.name}`}>
      <div className="mb-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => setLocation("/products")} className="text-zinc-400">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-[#18181b] border border-zinc-800/60 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={`flex flex-col items-center gap-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'`}>
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${step >= s.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
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
            {step === 1 ? (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-200">Capa do Produto</label>
                  <div
                    className={`border-2 border-dashed border-zinc-800 rounded-2xl w-[200px] h-[200px] mx-auto overflow-hidden cursor-pointer relative group ${isUploadingHero ? 'pointer-events-none opacity-70' : ''}`}
                    onClick={() => { if (!isUploadingHero) document.getElementById('edit-image')?.click(); }}
                  >
                    {isUploadingHero && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      </div>
                    )}
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Capa do produto" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500"><Plus /></div>
                    )}
                    <input
                      id="edit-image"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      disabled={isUploadingHero}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-200">Nome</label>
                    <Input className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-200">Descrição</label>
                    <textarea className="w-full bg-black/40 border border-zinc-800 rounded-md p-3 min-h-[120px] text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-200">Preço (USD)</label>
                    <Input type="number" step="0.01" className="bg-black/40 border-zinc-800 h-11 focus-visible:ring-purple-500" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
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
                        <p className="text-sm text-zinc-500">Adicione novos arquivos para entrega.</p>
                      </div>
                      
                      {/* Upload de novos arquivos */}
                      <div
                        className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center cursor-pointer hover:bg-zinc-900/30 transition-colors"
                        onClick={() => document.getElementById('new-file-upload')?.click()}
                      >
                        <Plus className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
                        <p className="text-xs text-zinc-400">Clique para adicionar arquivos</p>
                        <input
                          id="new-file-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setNewFiles(prev => [...prev, ...files]);
                            e.target.value = "";
                          }}
                        />
                      </div>

                      {newFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Novos arquivos ({newFiles.length})</p>
                          <div className="grid grid-cols-1 gap-2">
                            {newFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm text-zinc-300 truncate">{file.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400" onClick={() => {
                                  setNewFiles(files => files.filter((_, i) => i !== idx));
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                                        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/.test(filenameWithUuid)) {
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
                                  <Trash2 className="h-4 w-4" />
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
              <Button className="flex-[2] bg-purple-600 hover:bg-purple-500 h-12" onClick={() => step === 2 ? handleUpdate() : setStep(2)}>
                {updateProduct.isPending || isUploadingNewFiles ? <Loader2 className="animate-spin" /> : step === 2 ? "Salvar Alterações" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}