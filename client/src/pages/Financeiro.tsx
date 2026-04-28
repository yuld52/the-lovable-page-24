import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowDownToLine, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Financeiro() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || !pixKey) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o valor e a chave PIX.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Saque solicitado!",
        description: `Pedido de saque de R$ ${amount} realizado com sucesso.`,
      });
      setAmount("");
      setPixKey("");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Layout title="Financeiro" subtitle="Gerencie seus saques e saldo">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">SALDO DISPONÍVEL</CardTitle>
            <DollarSign className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">R$ 0,00</div>
            <p className="text-xs text-zinc-500 mt-1">Disponível para saque</p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL SACADO</CardTitle>
            <History className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">R$ 0,00</div>
            <p className="text-xs text-zinc-500 mt-1">Histórico de saques</p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">SAQUES PENDENTES</CardTitle>
            <ArrowDownToLine className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">0</div>
            <p className="text-xs text-zinc-500 mt-1">Aguardando processamento</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg sticky top-8">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Solicitar Saque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Valor (R$)</label>
                <Input 
                  type="number" 
                  placeholder="0,00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 h-11 text-white" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Chave PIX</label>
                <Input 
                  placeholder="E-mail, CPF ou telefone" 
                  value={pixKey} 
                  onChange={(e) => setPixKey(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 h-11 text-white" 
                />
              </div>
              <Button 
                onClick={handleWithdraw}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white h-11"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar Saque"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Histórico de Saques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <ArrowDownToLine className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Nenhum saque realizado</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Quando você realizar saques, eles aparecerão aqui. O processamento leva até 3 dias úteis.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}