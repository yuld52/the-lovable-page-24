import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, ArrowLeft, Download, Star, Gift, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSales } from "@/hooks/use-sales";
import { useProducts } from "@/hooks/use-products";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ThankYou() {
  const [, params] = useRoute("/thank-you/:saleId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const saleId = params?.saleId ? parseInt(params.saleId) : null;
  const { data: sales } = useSales();
  const { data: products } = useProducts();
  
  const [sale, setSale] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (sales && saleId) {
      const foundSale = sales.find(s => s.id === saleId);
      setSale(foundSale || null);
      
      if (foundSale?.productId) {
        const foundProduct = products?.find(p => p.id === foundSale.productId);
        setProduct(foundProduct || null);
      }
    }
  }, [sales, saleId, products]);

  const handleDownload = async () => {
    if (!product?.deliveryUrl) return;
    
    setIsDownloading(true);
    try {
      // Track download
      await apiRequest("POST", "/api/sales/download", {
        saleId: sale?.id,
        productId: product?.id
      });
      
      // Open delivery URL in new tab
      window.open(product.deliveryUrl, '_blank');
      
      toast({
        title: "Download iniciado!",
        description: "Seu produto está sendo preparado para download.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao iniciar download",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!sale || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Compra em Processamento</h2>
            <p className="text-muted-foreground mb-6">
              Sua compra está sendo processada. Por favor, aguarde alguns instantes.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Compra Aprovada!</h1>
          <p className="text-lg text-muted-foreground">
            Obrigado pela sua compra, {sale.customerEmail?.split('@')[0] || 'cliente'}!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Product Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <CardTitle className="flex items-center gap-3">
                  <Gift className="w-6 h-6 text-primary" />
                  Seu Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {product.imageUrl && (
                    <div className="w-32 h-32 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{product.name}</h3>
                    <p className="text-lg font-semibold text-primary mb-3">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format((sale.amount || 0) / 100)}
                    </p>
                    {product.description && (
                      <p className="text-muted-foreground leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                {product.deliveryUrl && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Download className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-foreground">Acesso ao Produto</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique no botão abaixo para acessar seu produto. O link também foi enviado para seu e-mail.
                    </p>
                    <Button 
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="w-full"
                      size="lg"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Preparando Download...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Acessar Produto Agora
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-primary" />
                  Detalhes do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">ID do Pedido</span>
                    <span className="font-medium">#{String(sale.id).padStart(6, '0')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data da Compra</span>
                    <span className="font-medium">
                      {format(new Date(sale.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status do Pagamento</span>
                    <span className="font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Aprovado
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Total Pago</span>
                    <span className="text-xl font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format((sale.amount || 0) / 100)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Verifique seu e-mail</h4>
                      <p className="text-sm text-muted-foreground">
                        Enviamos um e-mail com os detalhes da compra
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Download className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Acesse seu produto</h4>
                      <p className="text-sm text-muted-foreground">
                        Clique no botão acima para fazer o download
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Avalie sua experiência</h4>
                      <p className="text-sm text-muted-foreground">
                        Ajude-nos a melhorar nosso serviço
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Precisa de Ajuda?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Nossa equipe está disponível para ajudar com qualquer dúvida.
                </p>
                <Button variant="outline" className="w-full">
                  Contatar Suporte
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para a Página Inicial
          </Button>
        </div>
      </div>
    </div>
  );
}