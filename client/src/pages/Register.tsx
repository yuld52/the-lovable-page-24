import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

type Step = "form" | "code";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [uid, setUid] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (checkResponse.status === 409) {
        throw new Error("Este e-mail já está cadastrado. Faça login ou recupere a sua senha.");
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const newUid = credential.user.uid;
      setUid(newUid);

      // Sign out immediately — user must verify code before accessing the app
      await signOut(auth);

      // Send our custom 6-digit code
      const r = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, uid: newUid }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || "Erro ao enviar código. Verifique o email e tente novamente.");
      }

      setCountdown(60);
      setStep("code");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("email-already-in-use") || msg.includes("already registered") || msg.includes("already exists")) {
        toast({ title: "E-mail já registado", description: "Este e-mail já tem uma conta. Faça login.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao criar conta", description: err.message || "Tente novamente.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    // Auto-submit when all 6 digits filled
    if (digit && idx === 5 && next.every(d => d !== "")) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split("");
      setCode(next);
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerify(pasted), 50);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeStr = fullCode ?? code.join("");
    if (codeStr.length < 6) {
      toast({ title: "Código incompleto", description: "Introduza os 6 dígitos.", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const r = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeStr }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || "Código incorrecto");

      // Sign in now that the code is verified
      await signInWithEmailAndPassword(auth, email, password);

      toast({ title: "Conta verificada!", description: "Bem-vindo à Meteorfy." });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Erro de verificação", description: err.message || "Tente novamente.", variant: "destructive" });
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const r = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, uid }),
      });
      if (!r.ok) throw new Error("Erro ao reenviar");
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      toast({ title: "Código reenviado", description: "Verifique a sua caixa de entrada." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível reenviar. Tente novamente.", variant: "destructive" });
    } finally {
      setResending(false);
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
            {step === "form" ? "Crie a sua conta" : "Verificação de email"}
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
          <div className="bg-card/80 backdrop-blur-xl p-8 rounded-xl shadow-2xl border-none text-center space-y-6">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Introduza o código</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enviámos um código de 6 dígitos para{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>
              </div>
            </div>

            {/* OTP boxes */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-11 h-13 text-center text-xl font-bold rounded-lg border bg-background/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all
                    ${digit ? "border-primary" : "border-border"}`}
                  style={{ height: "52px", fontSize: "22px" }}
                  disabled={verifying}
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerify()}
              disabled={verifying || code.some(d => d === "")}
              className="w-full h-11 rounded-xl"
            >
              {verifying ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</span>
              ) : (
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Verificar Conta</span>
              )}
            </Button>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Não recebeu o código?</p>
              <button
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="text-sm font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
              >
                {resending ? "Reenviando..." : countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Verifique também a pasta de spam · Expira em 15 min
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Meteorfy Inc. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
