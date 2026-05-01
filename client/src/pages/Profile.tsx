import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Mail, Calendar, LogOut, HelpCircle, Crown, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function Profile() {
  const { user, loading } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
                  <div className="flex items-center justify-center sm:justify-start gap-2">
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
                  </div>
                </div>
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