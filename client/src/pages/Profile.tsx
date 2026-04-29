import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Mail, Calendar, ArrowLeft, Settings, LogOut } from "lucide-react";
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

  return (
    <Layout title="Perfil" subtitle="Gerencie suas informações pessoais">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-zinc-400 hover:text-white -ml-2"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Dashboard
        </Button>

        <div className="space-y-6">
          {/* User Info Card */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-purple-600/10 flex items-center justify-center border border-purple-500/20">
                  <UserCircle className="w-10 h-10 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white">
                    {user.email?.split('@')[0] || "Usuário"}
                  </CardTitle>
                  <p className="text-sm text-zinc-400 mt-1">Membro desde {new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <Mail className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 uppercase font-bold">E-mail</p>
                  <p className="text-sm text-white font-medium">{user.email}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  user.emailVerified 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {user.emailVerified ? 'Verificado' : 'Pendente'}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">Último acesso</p>
                  <p className="text-sm text-white font-medium">
                    {user.metadata?.lastSignInTime 
                      ? new Date(user.metadata.lastSignInTime).toLocaleString('pt-BR') 
                      : 'Não disponível'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base text-white">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}