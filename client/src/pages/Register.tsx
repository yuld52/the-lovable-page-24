import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, check if email already exists in the system
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (checkResponse.status === 409) {
        throw new Error("Este e-mail já está cadastrado no sistema. Faça login ou recupere sua senha.");
      }

      if (!checkResponse.ok) {
        // If the check fails, we still proceed but log the error
        console.error("Email check failed, proceeding with registration anyway");
      }

      await createUserWithEmailAndPassword(auth, email, password);

      toast({
        title: "Sucesso",
        description: "Conta criada! Você já pode fazer login.",
      });
      setLocation("/login");
    } catch (err: any) {
      // Check if the error is due to user already existing
      const errorMessage = err.message?.toLowerCase() || "";
      if (
        errorMessage.includes('email-already-in-use') ||
        errorMessage.includes('already registered') ||
        errorMessage.includes('already exists')
      ) {
        toast({
          title: "Erro",
          description: "Este e-mail já está cadastrado no sistema. Faça login ou recupere sua senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: err.message || "Erro ao criar conta",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm p-6 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Berry</span>
            <span className="text-foreground">Pay</span>
          </h1>
          <p className="text-muted-foreground text-sm">Crie sua conta</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-2xl ring-0 border-none outline-none">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 ml-1">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 border-border text-foreground focus-visible:ring-ring focus-visible:border-ring h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 ml-1">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/40 border-border text-foreground focus-visible:ring-ring focus-visible:border-ring h-11"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl shadow-lg transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Criar Conta</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-card/60 backdrop-blur-xl p-4 rounded-xl flex items-center justify-center gap-1 shadow-2xl ring-0 border-none outline-none">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-sm text-primary hover:text-primary/90 font-medium transition-colors">
              Entre agora
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Meteorfy Inc. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
