import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();


  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
      setLocation("/dashboard");
    } catch (err: any) {
      // Don't show Firebase-specific error messages to users
      const errorCode = err.code || '';
      let errorMessage = 'Falha ao fazer login. Tente novamente.';
      
      if (errorCode.includes('auth/invalid-email')) {
        errorMessage = 'E-mail inválido.';
      } else if (errorCode.includes('auth/user-disabled')) {
        errorMessage = 'Usuário desativado.';
      } else if (errorCode.includes('auth/user-not-found')) {
        errorMessage = 'Usuário não encontrado.';
      } else if (errorCode.includes('auth/wrong-password')) {
        errorMessage = 'Senha incorreta.';
      } else if (errorCode.includes('auth/invalid-credential')) {
        errorMessage = 'Credenciais inválidas.';
      } else if (errorCode.includes('auth/too-many-requests')) {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm p-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Meteor</span>
            <span className="text-white">fy</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Insira seu e-mail e senha para entrar</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-2xl ring-0 border-none outline-none">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 ml-1">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground/80 ml-1">Senha</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:text-primary/90"
                  data-testid="link-forgot-password"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/40 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring h-11 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl shadow-lg transition-all duration-300 border-0 ring-0 outline-none focus-visible:ring-0"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

        </div>

        <div className="mt-4 bg-card/60 backdrop-blur-xl p-4 rounded-xl flex items-center justify-center gap-1 ring-0 border-none outline-none">
          <p className="text-sm text-muted-foreground">Não tem conta?</p>
          <Link
            to="/register"
            className="text-sm text-primary hover:text-primary/90 font-medium transition-colors"
            data-testid="link-criar-agora"
          >
            Criar agora
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Meteorfy Inc. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
