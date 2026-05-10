import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Percent,
  ArrowDownToLine,
  Clock,
  Globe,
  FileText,
  Save,
  Info,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DEFAULT_CONFIG = {
  platformFeePercent: "0",
  minWithdrawalAmount: "0",
  withdrawalProcessingDays: "3",
  allowedCountries: "",
  termsOfService: "",
  feeNotes: "",
};

async function fetchConfig() {
  const user = auth.currentUser;
  if (!user) return DEFAULT_CONFIG;
  const idToken = await getIdToken(user);
  const res = await fetch("/api/admin/platform-config", {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return DEFAULT_CONFIG;
  return res.json();
}

async function saveConfig(data: Record<string, string>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado");
  const idToken = await getIdToken(user);
  const res = await fetch("/api/admin/platform-config", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erro ao salvar");
  }
  return res.json();
}

export default function AdminRulesFees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ["admin", "platform-config"],
    queryFn: fetchConfig,
    staleTime: 0,
  });

  const [form, setForm] = useState({ ...DEFAULT_CONFIG });

  useEffect(() => {
    if (config) {
      setForm({
        platformFeePercent: config.platformFeePercent ?? "0",
        minWithdrawalAmount: config.minWithdrawalAmount ?? "0",
        withdrawalProcessingDays: config.withdrawalProcessingDays ?? "3",
        allowedCountries: config.allowedCountries ?? "",
        termsOfService: config.termsOfService ?? "",
        feeNotes: config.feeNotes ?? "",
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => saveConfig(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "platform-config"] });
      toast({ title: "Configurações salvas!", description: "Regras e taxas atualizadas com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Percent className="w-7 h-7 text-red-400" />
                Regras e Taxas
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure as taxas e regras globais da plataforma
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-border text-foreground/80 hover:bg-accent gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Taxa da plataforma */}
            <Card className="bg-card border-border/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <Percent className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Taxa da Plataforma</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Percentual cobrado sobre cada venda
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Taxa (%)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.platformFeePercent}
                      onChange={set("platformFeePercent")}
                      className="bg-muted/50 border-border pr-10"
                      placeholder="Ex: 5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ex: 5 = 5% de cada venda aprovada
                  </p>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    Esta taxa é exibida para os usuários na página de Regras & Taxas do financeiro. O desconto automático depende da implementação no fluxo de saque.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Saque mínimo */}
            <Card className="bg-card border-border/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Regras de Saque</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Limites e prazos de saque
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Valor Mínimo de Saque (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minWithdrawalAmount}
                      onChange={set("minWithdrawalAmount")}
                      className="bg-muted/50 border-border pl-7"
                      placeholder="Ex: 10.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Prazo de Processamento (dias úteis)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={form.withdrawalProcessingDays}
                    onChange={set("withdrawalProcessingDays")}
                    className="bg-muted/50 border-border"
                    placeholder="Ex: 3"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Países permitidos */}
            <Card className="bg-card border-border/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Países Permitidos</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Lista de países onde a plataforma opera
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Países (separados por vírgula)
                  </label>
                  <Input
                    value={form.allowedCountries}
                    onChange={set("allowedCountries")}
                    className="bg-muted/50 border-border"
                    placeholder="Ex: Brasil, Moçambique, Portugal, Angola"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Deixe em branco para permitir todos os países.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Observações sobre taxas */}
            <Card className="bg-card border-border/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Info className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Observações sobre Taxas</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Texto exibido aos usuários na seção de taxas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.feeNotes}
                  onChange={set("feeNotes")}
                  className="bg-muted/50 border-border min-h-[100px] resize-none"
                  placeholder="Ex: As taxas do PayPal são descontadas automaticamente. A taxa da plataforma é de X% por venda aprovada..."
                />
              </CardContent>
            </Card>

            {/* Termos de uso */}
            <Card className="bg-card border-border/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Termos de Uso</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Regras gerais da plataforma exibidas aos usuários
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.termsOfService}
                  onChange={set("termsOfService")}
                  className="bg-muted/50 border-border min-h-[180px] resize-none"
                  placeholder="Escreva aqui as regras e termos de uso da plataforma que serão exibidos aos usuários..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Save footer */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white gap-2 px-8"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
