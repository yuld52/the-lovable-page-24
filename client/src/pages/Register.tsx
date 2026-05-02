import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

type Step = "form" | "verify";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if email already exists
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (checkResponse.status === 409) {
        throw new Error("Este e-mail já está cadastrado. Faça login ou recupere a sua senha.");
      }

      // Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      // Send Firebase email verification
      await sendEmailVerification(credential.user);

      // Send welcome email via Resend (fire-and-forget)
      fetch("/api/auth/send-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});

      // Show verification step
      setStep("verify");
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("email-already-in-use") || msg.includes("already registered") || msg.includes("already exists")) {
        toast({
          title: "E-mail já registado",
          description: "Este e-mail já tem uma conta. Faça login ou recupere a sua senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar conta",
          description: err.message || "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const user = auth.currentUser;
      if (user) await sendEmailVerification(user);
      toast({ title: "Email reenviado", description: "Verifique a sua caixa de entrada." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível reenviar. Tente novamente.", variant: "destructive" });
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
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Meteor</span>
            <span className="text-foreground">fy</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === "form" ? "Crie a sua conta" : "Verifique o seu email"}
          </p>
        </div>

        {step === "form" ? (
          <>
            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-2xl border-none">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80 ml-1">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/40 border-border h-11"
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
                    className="bg-background/40 border-border h-11"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl shadow-lg">
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Criando...</span>
                  ) : (
                    <span className="flex items-center gap-2">Criar Conta <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </form>
            </div>

            <div className="mt-4 bg-card/60 backdrop-blur-xl p-4 rounded-xl flex items-center justify-center shadow-2xl border-none">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-sm text-primary hover:text-primary/90 font-medium">Entre agora</Link>
              </p>
            </div>
          </>
        ) : (
          <div className="bg-card/80 backdrop-blur-xl p-8 rounded-xl shadow-2xl border-none text-center space-y-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Confirme o seu email</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enviámos um link de verificação para{" "}
                <span className="text-foreground font-medium">{email}</span>.
                Clique no link para activar a sua conta.
              </p>
            </div>
            <div className="bg-background/40 rounded-lg p-3 text-xs text-muted-foreground text-left space-y-1">
              <p>• Verifique também a pasta de spam</p>
              <p>• O link expira em 24 horas</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setLocation("/login")} className="w-full h-11 rounded-xl">
                Ir para o Login
              </Button>
              <Button variant="ghost" onClick={handleResend} className="w-full h-10 text-sm text-muted-foreground hover:text-foreground">
                Reenviar email de verificação
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Meteorfy Inc. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
