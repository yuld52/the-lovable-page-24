import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Mail, Calendar, LogOut, HelpCircle, Crown, CheckCircle2, Clock, ArrowLeft, Award, ShoppingBag, Flame, Star, Trophy, Zap, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useSales } from "@/hooks/use-sales";

const badges = [
  {
    id: "first_sale",
    title: "Primeira Venda",
    description: "Realizou sua primeira venda!",
    icon: ShoppingBag,
    color: "from-emerald-500 to-green-600",
    glowColor: "shadow-emerald-500/30",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    requirement: 1,
  },
  {
    id: "ten_sales",
    title: "Vendedor Iniciante",
    description: "Alcançou 10 vendas!",
    icon: Star,
    color: "from-blue-500 to-cyan-500",
    glowColor: "shadow-blue-500/30",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    requirement: 10,
  },
  {
    id: "fifty_sales",
    title: "Vendedor Experiente",
    description: "Alcançou 50 vendas!",
    icon: Flame,
    color: "from-orange-500 to-amber-500",
    glowColor: "shadow-orange-500/30",
    borderColor: "border-orange-500/40",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    requirement: 50,
  },
  {
    id: "hundred_sales",
    title: "Mestre das Vendas",
    description: "Alcançou 100 vendas!",
    icon: Trophy,
    color: "from-yellow-400 to-amber-500",
    glowColor: "shadow-yellow-500/30",
    borderColor: "border-yellow-500/40",
    bgColor: "bg-yellow-500/10",
    textColor: "text-yellow-400",
    requirement: 100,
  },
  {
    id: "two_hundred_sales",
    title: "Lenda Digital",
    description: "Alcançou 200 vendas!",
    icon: Crown,
    color: "from-purple-500 to-pink-500",
    glowColor: "shadow-purple-500/30",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
    requirement: 200,
  },
  {
    id: "five_hundred_sales",
    title: "Ícone do E-commerce",
    description: "Alcançou 500 vendas!",
    icon: Zap,
    color: "from-rose-500 to-red-500",
    glowColor: "shadow-rose-500/30",
    borderColor: "border-rose-500/40",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-400",
    requirement: 500,
  },
  {
    id: "thousand_sales",
    title: "Meteorfy Elite",
    description: "Alcançou 1.000 vendas!",
    icon: Award,
    color: "from-indigo-400 to-violet-500",
    glowColor: "shadow-indigo-500/30",
    borderColor: "border-indigo-500/40",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-400",
    requirement: 1000,
  },
];

export default function Profile() {
  const { user, loading } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: sales } = useSales();

  const totalSales = sales?.filter(s => s.status === 'paid').length || 0;

  const earnedBadges = badges.filter(b => totalSales >= b.requirement);
  const nextBadge = badges.find(b => totalSales < b.requirement);
  const progressToNext = nextBadge
    ? Math.min((totalSales / nextBadge.requirement) * 100, 100)
    : 100;

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLocation("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (loading) {
    return (
      <Layout title="Perfil" subtitle="Carregando...">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const parseFirebaseDate = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  };

  const creationDate = parseFirebaseDate(user.metadata?.creationTime);
  const lastSignInDate = parseFirebaseDate(user.metadata?.lastSignInTime);

  const memberSince = creationDate
    ? creationDate.toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Data indisponível";

  const lastLogin = lastSignInDate
    ? lastSignInDate.toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data indisponível";

  const isAdmin = user.email?.toLowerCase().trim() === "yuldchissico11@gmail.com";

  return (
    <Layout title="Perfil" subtitle="Gerencie suas informações pessoais">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-zinc-400 hover:text-white -ml-2"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Dashboard
        </Button>

        <div className="grid gap-6">
          {/* Profile Header Card */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent">
              <div className="absolute inset-0 opacity-5"></div>
            </div>
            <CardContent className="relative -mt-16 pt-0">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center border-4 border-background shadow-xl -mt-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-12 h-12 text-white" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {user.displayName || user.email?.split("@")[0] || "Usuário"}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      E-mail verificado
                    </Badge>
                    {isAdmin && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        <Crown className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {earnedBadges.length > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Award className="w-3 h-3 mr-1" />
                        {earnedBadges.length} {earnedBadges.length === 1 ? 'Selo' : 'Selos'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges / Selos Section */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                Selos Conquistados
              </CardTitle>
              <CardDescription className="text-zinc-500">
                {totalSales} {totalSales === 1 ? 'venda realizada' : 'vendas realizadas'} • {earnedBadges.length} de {badges.length} selos desbloqueados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress to next badge */}
              {nextBadge && (
                <div className="mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <nextBadge.icon className={`w-4 h-4 ${nextBadge.textColor}`} />
                      <span className="text-sm font-medium text-white">Próximo: {nextBadge.title}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{totalSales}/{nextBadge.requirement}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${nextBadge.color} transition-all duration-500`}
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5">{nextBadge.description}</p>
                </div>
              )}

              {/* Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => {
                  const isEarned = totalSales >= badge.requirement;
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className={`relative p-4 rounded-xl border transition-all duration-300 ${
                        isEarned
                          ? `${badge.bgColor} ${badge.borderColor} shadow-lg ${badge.glowColor}`
                          : 'bg-zinc-900/30 border-zinc-800/40 opacity-40 grayscale'
                      }`}
                    >
                      {isEarned && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isEarned
                            ? `bg-gradient-to-br ${badge.color} shadow-lg`
                            : 'bg-zinc-800'
                        }`}>
                          <Icon className={`w-6 h-6 ${isEarned ? 'text-white' : 'text-zinc-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold ${isEarned ? 'text-white' : 'text-zinc-500'}`}>
                            {badge.title}
                          </h4>
                          <p className={`text-[11px] mt-0.5 ${isEarned ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {badge.description}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <Target className={`w-3 h-3 ${isEarned ? badge.textColor : 'text-zinc-600'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isEarned ? badge.textColor : 'text-zinc-600'}`}>
                              {badge.requirement} {badge.requirement === 1 ? 'venda' : 'vendas'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                Informações da Conta
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Detalhes da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium text-white">E-mail</p>
                    <p className="text-xs text-zinc-500">Seu endereço de e-mail principal</p>
                  </div>
                </div>
                <span className="text-sm text-zinc-300 font-mono">{user.email}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Membro desde</p>
                    <p className="text-xs text-zinc-500">Data de criação da conta</p>
                  </div>
                </div>
                <span className="text-sm text-zinc-300">{memberSince}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Último acesso</p>
                    <p className="text-xs text-zinc-500">Data e hora do último login</p>
                  </div>
                </div>
                <span className="text-sm text-zinc-300 text-right">{lastLogin}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Suporte</p>
                    <p className="text-xs text-zinc-500">Precisa de ajuda? Fale conosco</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  onClick={() => setLocation("/help")}
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                  Suporte
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}