import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAffiliates, useCreateAffiliate, useUpdateAffiliate, useDeleteAffiliate, useApproveAffiliate, useRejectAffiliate, useAffiliateStats } from "@/hooks/use-affiliates";
import { useAffiliateLinks, useCreateAffiliateLink, useDeleteAffiliateLink } from "@/hooks/use-affiliates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Users, TrendingUp, DollarSign, Link2, Trash2, CheckCircle2, XCircle, ArrowLeft, Copy, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function Affiliates() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { data: affiliates, isLoading: affiliatesLoading } = useAffiliates();
  const { data: links, isLoading: linksLoading } = useAffiliateLinks();
  
  const createAffiliate = useCreateAffiliate();
  const updateAffiliate = useUpdateAffiliate();
  const deleteAffiliate = useDeleteAffiliate();
  const approveAffiliate = useApproveAffiliate();
  const rejectAffiliate = useRejectAffiliate();
  const createLink = useCreateAffiliateLink();
  const deleteLink = useDeleteAffiliateLink();
  
  const { toast } = useToast();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | null>(null);
  const [newAffiliate, setNewAffiliate] = useState({ name: "", email: "", commissionRate: "10.00" });
  const [newLink, setNewLink] = useState({ affiliateId: 0, productId: "", checkoutId: "" });

  const handleCreateAffiliate = async () => {
    if (!newAffiliate.name || !newAffiliate.email) {
      toast({ title: "Erro", description: "Nome e e-mail são obrigatórios", variant: "destructive" });
      return;
    }

    try {
      await createAffiliate.mutateAsync(newAffiliate);
      toast({ title: "Sucesso", description: "Afiliado criado com sucesso!" });
      setShowCreateModal(false);
      setNewAffiliate({ name: "", email: "", commissionRate: "10.00" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateAffiliate.mutateAsync({ id, status: newStatus });
      toast({ title: "Sucesso", description: `Afiliado ${newStatus === 'active' ? 'ativado' : 'desativado'}!` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência" });
  };

  if (affiliatesLoading || statsLoading) {
    return (
      <Layout title="Afiliados" subtitle="Gerencie sua rede de afiliados">
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Afiliados" subtitle="Gerencie sua rede de afiliados">
      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-6">
        <div className="relative group">
          <Button 
            variant="outline" 
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
            onClick={() => {
              setSelectedAffiliateId(null);
              setShowLinksModal(true);
            }}
          >
            <Link2 className="w-4 h-4" />
            Gerenciar Links
          </Button>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 border-0 outline-none ring-0 focus-visible:ring-0"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Afiliado
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE AFILIADOS</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats?.totalAffiliates || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">AFILIADOS ATIVOS</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats?.activeAffiliates || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">TOTAL DE CONVERSÕES</CardTitle>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats?.totalConversions || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">COMISSÕES PAGAS</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((stats?.totalEarnings || 0) / 100)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates Table */}
      <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base text-white">Lista de Afiliados</CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            {affiliates?.length || 0} afiliado(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/50">
                <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">E-mail</TableHead>
                <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Código</TableHead>
                <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Comissão</TableHead>
                <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliates?.map((affiliate) => (
                <TableRow key={affiliate.id} className="hover:bg-zinc-800/20 transition-colors">
                  <TableCell className="font-medium text-white">{affiliate.name}</TableCell>
                  <TableCell className="text-zinc-400">{affiliate.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-zinc-900 px-2 py-1 rounded">{affiliate.code}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-zinc-500 hover:text-white"
                        onClick={() => copyToClipboard(affiliate.code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">{affiliate.commissionRate}%</TableCell>
                  <TableCell>
                    <Badge 
                      variant={affiliate.status === 'active' ? "default" : "secondary"}
                      className={
                        affiliate.status === 'active' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                        affiliate.status === 'pending' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {affiliate.status === 'active' ? 'Ativo' : 
                       affiliate.status === 'pending' ? 'Pendente' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {affiliate.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                            onClick={() => approveAffiliate.mutateAsync(affiliate.id)}
                            disabled={approveAffiliate.isPending}
                          >
                            {approveAffiliate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
                            onClick={() => rejectAffiliate.mutateAsync(affiliate.id)}
                            disabled={rejectAffiliate.isPending}
                          >
                            {rejectAffiliate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-zinc-500 hover:text-purple-400"
                        onClick={() => {
                          setSelectedAffiliateId(affiliate.id);
                          setShowLinksModal(true);
                        }}
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={affiliate.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(affiliate.id, affiliate.status)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este afiliado?")) {
                            deleteAffiliate.mutateAsync(affiliate.id);
                          }
                        }}
                      >
                        {deleteAffiliate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Affiliate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Novo Afiliado</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Nome</label>
                <Input 
                  value={newAffiliate.name}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, name: e.target.value })}
                  placeholder="Nome do afiliado"
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">E-mail</label>
                <Input 
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Taxa de Comissão (%)</label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newAffiliate.commissionRate}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, commissionRate: e.target.value })}
                  placeholder="10.00"
                  className="bg-zinc-900 border-zinc-800" 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateAffiliate}
                disabled={createAffiliate.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                {createAffiliate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Afiliado
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Links Modal */}
      {showLinksModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Links de Afiliados</h3>
              <Button 
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white"
                onClick={() => {
                  setNewLink({ affiliateId: selectedAffiliateId || 0, productId: "", checkoutId: "" });
                }}
              >
                <Plus className="w-3 h-3 mr-2" />
                Novo Link
              </Button>
            </div>

            {linksLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/50">
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Afiliado</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Link</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Cliques</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase">Conv.</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links?.filter(l => !selectedAffiliateId || l.affiliateId === selectedAffiliateId).map((link) => {
                    const affiliate = affiliates?.find(a => a.id === link.affiliateId);
                    const fullUrl = `${window.location.origin}/api/affiliate/redirect/${link.slug}`;
                    return (
                      <TableRow key={link.id} className="hover:bg-zinc-800/20">
                        <TableCell className="text-zinc-300">{affiliate?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <code className="text-xs bg-zinc-900 px-2 py-1 rounded truncate">{fullUrl}</code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-zinc-500 hover:text-white shrink-0"
                              onClick={() => copyToClipboard(fullUrl)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400">{link.clicks || 0}</TableCell>
                        <TableCell className="text-zinc-400">{link.conversions || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => {
                              if (confirm("Tem certeza?")) {
                                deleteLink.mutateAsync(link.id);
                              }
                            }}
                          >
                            {deleteLink.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <Button 
              variant="ghost" 
              className="mt-4 w-full"
              onClick={() => setShowLinksModal(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}