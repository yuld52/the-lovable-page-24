import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy, TrendingUp, ShoppingCart, RefreshCw, Medal, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminRevenueRanking } from "@/hooks/use-admin";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-500/40">
        <Crown className="w-4 h-4 text-yellow-400" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-400/20 border border-zinc-400/40">
        <Medal className="w-4 h-4 text-zinc-300" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-700/20 border border-amber-700/40">
        <Medal className="w-4 h-4 text-amber-600" />
      </div>
    );
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700">
      <span className="text-xs font-bold text-zinc-400">#{rank}</span>
    </div>
  );
}

function PodiumCard({
  item,
  height,
  accentColor,
  label,
}: {
  item: { rank: number; email: string; totalRevenue: number; totalSales: number };
  height: string;
  accentColor: string;
  label: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 ${height}`}>
      <div className="text-center px-2">
        <p className="text-xs text-zinc-400 truncate max-w-[120px]" title={item.email}>
          {item.email.length > 18 ? item.email.slice(0, 15) + "…" : item.email}
        </p>
        <p className={`text-sm font-bold ${accentColor}`}>{formatCurrency(item.totalRevenue)}</p>
        <p className="text-[10px] text-zinc-500">{item.totalSales} vendas</p>
      </div>
      <div
        className={`w-24 rounded-t-xl flex items-start justify-center pt-3 border-t border-l border-r ${height}`}
        style={{
          background:
            item.rank === 1
              ? "linear-gradient(to bottom, rgba(234,179,8,0.2), rgba(234,179,8,0.05))"
              : item.rank === 2
              ? "linear-gradient(to bottom, rgba(161,161,170,0.2), rgba(161,161,170,0.05))"
              : "linear-gradient(to bottom, rgba(180,83,9,0.2), rgba(180,83,9,0.05))",
          borderColor:
            item.rank === 1 ? "rgba(234,179,8,0.3)" : item.rank === 2 ? "rgba(161,161,170,0.3)" : "rgba(180,83,9,0.3)",
        }}
      >
        <span className={`text-2xl font-extrabold ${accentColor}`}>{label}</span>
      </div>
    </div>
  );
}

export default function AdminRevenueRanking() {
  const queryClient = useQueryClient();
  const { data: ranking, isLoading, refetch } = useAdminRevenueRanking();

  const top3 = ranking?.slice(0, 3) || [];
  const rest = ranking?.slice(3) || [];

  const totalRevenue = ranking?.reduce((sum, r) => sum + r.totalRevenue, 0) || 0;
  const totalSales = ranking?.reduce((sum, r) => sum + r.totalSales, 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground flex">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Trophy className="w-7 h-7 text-yellow-400" />
                Ranking de Faturamento
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Usuários ordenados pelo total de vendas aprovadas
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <Card className="bg-[#18181b] border-zinc-800/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">
                  USUÁRIOS NO RANKING
                </CardTitle>
                <Trophy className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{ranking?.length || 0}</div>
                <p className="text-xs text-zinc-500 mt-1">Com ao menos 1 venda</p>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">
                  FATURAMENTO TOTAL
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-zinc-500 mt-1">Soma de todos os usuários</p>
              </CardContent>
            </Card>

            <Card className="bg-[#18181b] border-zinc-800/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wider">
                  TOTAL DE VENDAS
                </CardTitle>
                <ShoppingCart className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{totalSales}</div>
                <p className="text-xs text-zinc-500 mt-1">Vendas na plataforma</p>
              </CardContent>
            </Card>
          </div>

          {ranking?.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg font-medium">Nenhuma venda ainda</p>
              <p className="text-zinc-600 text-sm mt-1">O ranking aparecerá quando houver vendas.</p>
            </div>
          ) : (
            <>
              {/* Podium — top 3 */}
              {top3.length >= 1 && (
                <div className="mb-10">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6 text-center">
                    Top 3 — Pódio
                  </p>
                  <div className="flex items-end justify-center gap-4 h-52">
                    {/* 2nd place */}
                    {top3[1] && (
                      <PodiumCard
                        item={top3[1]}
                        height="h-36"
                        accentColor="text-zinc-300"
                        label="2º"
                      />
                    )}
                    {/* 1st place */}
                    {top3[0] && (
                      <PodiumCard
                        item={top3[0]}
                        height="h-48"
                        accentColor="text-yellow-400"
                        label="1º"
                      />
                    )}
                    {/* 3rd place */}
                    {top3[2] && (
                      <PodiumCard
                        item={top3[2]}
                        height="h-28"
                        accentColor="text-amber-600"
                        label="3º"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Full ranking table */}
              <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Ranking Completo ({ranking?.length || 0} usuários)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                  <div className="rounded-b-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-950/50 border-y border-zinc-800/50">
                          <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-16">
                            #
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                            Vendas
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">
                            Faturamento
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right hidden md:table-cell">
                            Última Venda
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/30">
                        {ranking?.map((item) => {
                          const isTop3 = item.rank <= 3;
                          const sharePercent =
                            totalRevenue > 0 ? ((item.totalRevenue / totalRevenue) * 100).toFixed(1) : "0.0";
                          return (
                            <tr
                              key={item.ownerId}
                              className={`hover:bg-zinc-800/20 transition-colors ${
                                item.rank === 1
                                  ? "bg-yellow-500/5"
                                  : item.rank === 2
                                  ? "bg-zinc-400/5"
                                  : item.rank === 3
                                  ? "bg-amber-700/5"
                                  : ""
                              }`}
                            >
                              <td className="px-6 py-4">
                                <RankBadge rank={item.rank} />
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm text-zinc-200 font-medium truncate max-w-[200px]">
                                    {item.email}
                                  </p>
                                  <p className="text-[10px] text-zinc-600 font-mono truncate max-w-[180px]">
                                    {item.ownerId}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-zinc-300 font-semibold">
                                  {item.totalSales}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div>
                                  <p
                                    className={`text-sm font-bold ${
                                      item.rank === 1
                                        ? "text-yellow-400"
                                        : item.rank === 2
                                        ? "text-zinc-300"
                                        : item.rank === 3
                                        ? "text-amber-600"
                                        : "text-emerald-400"
                                    }`}
                                  >
                                    {formatCurrency(item.totalRevenue)}
                                  </p>
                                  <p className="text-[10px] text-zinc-600">{sharePercent}% do total</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right hidden md:table-cell">
                                <span className="text-xs text-zinc-500">
                                  {item.lastSaleAt
                                    ? format(new Date(item.lastSaleAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                    : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
