import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserCircle, Mail, Calendar, LogOut, HelpCircle, Crown, CheckCircle2, Clock, ArrowLeft, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { SalesBadges } from "@/components/SalesBadges";

export default function Profile() {
  const { user, loading } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwStep, setPwStep] = useState<1 | 2>(1);
  const [verifCode, setVerifCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);

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

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    // Step 1 → send code and advance to step 2
    setIsSendingCode(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error("Utilizador não autenticado");
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, uid: currentUser.uid }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao enviar código");
      }
      setPwStep(2);
      setVerifCode("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar código", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!verifCode || verifCode.length !== 6) {
      toast({ title: "Código inválido", description: "Introduza o código de 6 dígitos.", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error("Utilizador não autenticado");

      // Verify code
      const vRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, code: verifCode }),
      });
      if (!vRes.ok) {
        const data = await vRes.json();
        throw new Error(data.message || "Código incorrecto");
      }

      // Reauthenticate and update password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      toast({ title: "Senha alterada!", description: "A sua senha foi actualizada com sucesso." });
      setShowPasswordDialog(false);
      setPwStep(1);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setVerifCode("");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast({ title: "Senha actual incorrecta", description: "Verifique a sua senha actual.", variant: "destructive" });
        setPwStep(1);
      } else if (code === "auth/weak-password") {
        toast({ title: "Senha fraca", description: "Use pelo menos 6 caracteres.", variant: "destructive" });
      } else if (code === "auth/too-many-requests") {
        toast({ title: "Muitas tentativas", description: "Aguarde alguns minutos.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: err?.message || "Não foi possível alterar a senha.", variant: "destructive" });
      }
    } finally {
      setIsChangingPassword(false);
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
                <div className="hidden sm:flex items-center self-end pb-1">
                  <SalesBadges />
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

              <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Senha</p>
                    <p className="text-xs text-zinc-500">Altere a sua senha de acesso</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  Redefinir Senha
                </Button>
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

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPwStep(1);
          setVerifCode("");
        }
        setShowPasswordDialog(open);
      }}>
        <DialogContent className="bg-[#18181b] border border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">Redefinir Senha</DialogTitle>
                <DialogDescription className="text-zinc-400 text-sm">
                  {pwStep === 1 ? "Insira a sua senha actual e escolha uma nova" : "Verifique o seu e-mail e introduza o código"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-1 mb-2">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${pwStep === 1 ? "text-purple-400" : "text-zinc-500"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${pwStep === 1 ? "bg-purple-600 text-white" : "bg-zinc-700 text-zinc-400"}`}>1</div>
              Nova senha
            </div>
            <div className="flex-1 h-px bg-zinc-700" />
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${pwStep === 2 ? "text-purple-400" : "text-zinc-500"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${pwStep === 2 ? "bg-purple-600 text-white" : "bg-zinc-700 text-zinc-400"}`}>2</div>
              Confirmar e-mail
            </div>
          </div>

          {pwStep === 1 ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Senha Actual</label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite a sua senha actual"
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-purple-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nova Senha</label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-purple-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirmar Nova Senha</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={`bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-purple-500 pr-10 ${confirmPassword && newPassword !== confirmPassword ? "border-red-500/70" : ""}`}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePasswordReset(); }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400">As senhas não coincidem</p>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="ghost" className="flex-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600" onClick={() => setShowPasswordDialog(false)} disabled={isSendingCode}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white" onClick={handlePasswordReset} disabled={isSendingCode}>
                  {isSendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  {isSendingCode ? "Enviando código..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">Código enviado para</p>
                <p className="text-sm font-semibold text-white">{auth.currentUser?.email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Código de 6 dígitos</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifCode}
                  onChange={(e) => setVerifCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-purple-500 text-center text-2xl font-bold tracking-[0.5em] h-14"
                  onKeyDown={(e) => { if (e.key === "Enter") handleConfirmCode(); }}
                />
                <p className="text-xs text-zinc-500 text-center">Verifique a caixa de entrada e spam. Válido por 15 minutos.</p>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="ghost" className="flex-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600" onClick={() => setPwStep(1)} disabled={isChangingPassword}>
                  Voltar
                </Button>
                <Button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white" onClick={handleConfirmCode} disabled={isChangingPassword || verifCode.length !== 6}>
                  {isChangingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  {isChangingPassword ? "Confirmando..." : "Confirmar e Alterar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}