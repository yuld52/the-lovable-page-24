import { useState } from "react";
import { Layout } from "@/components/Layout";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAffiliates, useApproveAffiliate, useRejectAffiliate } from "@/components/hooks/use-affiliates";
import { useCommissions } from "@/components/hooks/use-affiliates";
import { useAffiliateWithdrawals, useCreateAffiliateWithdrawal } from "@/components/hooks/use-affiliates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Users, TrendingUp, DollarSign, BarChart3, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export default function AdminAffiliates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: affiliates, isLoading: affiliatesLoading } = useAffiliates();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: withdrawals, isLoading: withdrawalsLoading } = useAffiliateWithdrawals();
  
  const approveAffiliate = useApproveAffiliate();
  const rejectAffiliate = useRejectAffiliate();
  const createWithdrawal = useCreateAffiliateWithdrawal();

  const handleApprove = async (id: number) => {
    try {
      await approveAffiliate.mutateAsync(id);
      toast({ title: "Sucesso", description: "Afiliado aprovado!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Tem certeza que deseja rejeitar este afiliado?")) return;
    try {
      await rejectAffiliate.mutateAsync(id);
      toast({ title: "Sucesso", description: "Afiliado rejeitado!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (affiliatesLoading || commissionsLoading || withdrawalsLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </div>
    );
  }

  const pendingAffiliates = affiliates?.filter(a => a.status === 'pending') || [];
  const activeAffiliates = affiliates?.filter(a => a.status === 'active') || [];
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Gerenciar Afiliados</h1>
              <p className="text-sm text-muted-foreground">Aprove, rejeite e gerencie afiliados</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE AFILIADOS</CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {affiliates?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">COMISSÕES PENDENTES</CardTitle>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {pendingWithdrawals.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE VENDAS</CardTitle>
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {commissions?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Affiliates */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">Aprovação de Afiliados</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    {pendingAffiliates.length} afiliado(s) aguardando aprovação
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingAffiliates.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum afiliado pendente!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/50">
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Nome</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">E-mail</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Código</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Comissão</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAffiliates.map((affiliate) => (
                      <TableRow key={affiliate.id} className="hover:bg-zinc-800/20">
                        <TableCell className="text-white">{affiliate.name}</TableCell>
                        <TableCell className="text-zinc-400">{affiliate.email}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-zinc-900 px-2 py-1 rounded">{affiliate.code}</code>
                        </TableCell>
                        <TableCell className="text-zinc-300">{affiliate.commissionRate}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                              onClick={() => handleApprove(affiliate.id)}
                              disabled={approveAffiliate.isPending}
                            >
                              {approveAffiliate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                              onClick={() => handleReject(affiliate.id)}
                              disabled={rejectAffiliate.isPending}
                            >
                              {rejectAffiliate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Withdrawals */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">Saques de Afiliados</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    {pendingWithdrawals.length} saque(s) aguardando aprovação
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingWithdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum saque pendente!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/50">
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Afiliado</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Valor</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">PIX</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Data</TableHead>
                      <TableHead className="text-[10px] font-bold text-zinc-500 uppercase text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.map((w) => {
                      const affiliate = affiliates?.find(a => a.id === w.affiliateId);
                      return (
                        <TableRow key={w.id} className="hover:bg-zinc-800/20">
                          <TableCell className="text-zinc-300">{affiliate?.name || "N/A"}</TableCell>
                          <TableCell className="text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((w.amount || 0) / 100)}
                          </TableCell>
                          <TableCell className="text-zinc-400">{w.pixKey || "-"}</TableCell>
                          <TableCell className="text-zinc-500">
                            {w.requestedAt ? format(new Date(w.requestedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                                onClick={() => {
                                  // Implementar aprovação de saque
                                  toast({ title: "Em breve", description: "Aprovação de saque será implementada em breve" });
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                                onClick={() => {
                                  // Implementar rejeição de saque
                                  toast({ title: "Em breve", description: "Rejeição de saque será implementada em breve" });
                                }}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* All Commissions */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base text-white">Histórico de Comissões</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                {commissions?.length || 0} comissão(ões) registrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/50">
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Afiliado</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Produto</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Valor da Venda</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Comissão</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions?.map((commission) => {
                    const affiliate = affiliates?.find(a => a.id === commission.affiliateId);
                    return (
                      <TableRow key={commission.id} className="hover:bg-zinc-800/20">
                        <TableCell className="text-zinc-300">{affiliate?.name || "N/A"}</TableCell>
                        <TableCell className="text-zinc-400">{commission.productName || "Produto"}</TableCell>
                        <TableCell className="text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((commission.amount || 0) / 100)}
                        </TableCell>
                        <TableCell className="text-purple-400 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((commission.commissionAmount || 0) / 100)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={commission.status === 'paid' ? "default" : "secondary"}
                            className={
                              commission.status === 'paid' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                              commission.status === 'approved' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                              "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }
                          >
                            {commission.status === 'paid' ? 'Pago' : 
                             commission.status === 'approved' ? 'Aprovado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}