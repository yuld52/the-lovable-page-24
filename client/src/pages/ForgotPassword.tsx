import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Sucesso",
        description: "Se este e-mail estiver cadastrado, você receberá um link de recuperação.",
      });
      setLocation("/login");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
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
            <span className="bg-gradient-to-r from-primary via-primary to-foreground bg-clip-text text-transparent">Berry</span>
            <span className="text-foreground">Pay</span>
          </h1>
          <p className="text-muted-foreground text-sm">Recuperar sua senha</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border-0 p-6 rounded-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 ml-1">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 border-border text-foreground h-11 focus-visible:ring-ring focus-visible:border-ring"
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
                  <span>Enviando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Enviar Link</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-card/60 backdrop-blur-xl p-4 rounded-xl flex items-center justify-center gap-1 shadow-2xl ring-0 border-none outline-none">
          <p className="text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link to="/login" className="text-sm text-primary hover:text-primary/90 font-medium transition-colors">
              Voltar ao login
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
