import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Mail, KeyRound, Save, Camera, Check, X } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  if (loading) {
    return (
      <Layout title="Perfil" subtitle="Carregando...">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title="Perfil" subtitle="Usuário não encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Usuário não está logado.</p>
          <Button onClick={() => setLocation("/login")} className="mt-4">
            Ir para Login
          </Button>
        </div>
      </Layout>
    );
  }

  const handleUpdateName = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Erro",
        description: "O nome não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      toast({
        title: "Sucesso",
        description: "Nome atualizado com sucesso!",
      });
      setIsEditingName(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar nome.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de senha.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As novas senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
    } catch (error: any) {
      let message = "Falha ao alterar senha.";
      if (error.code === "auth/wrong-password") {
        message = "Senha atual incorreta.";
      } else if (error.code === "auth/requires-recent-login") {
        message = "Por favor, faça login novamente para alterar a senha.";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return user.email?.charAt(0).toUpperCase() || "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Layout title="Perfil" subtitle="Gerencie suas informações pessoais">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Avatar e Info Básica */}
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-zinc-800">
                  <AvatarImage src={user.photoURL || ""} alt={user.displayName || user.email || ""} />
                  <AvatarFallback className="text-2xl bg-purple-600 text-white">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-800 hover:bg-zinc-800"
                  onClick={() => toast({ title: "Em breve", description: "Upload de foto chega em breve!" })}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {user.displayName || "Usuário"}
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2 text-zinc-400">
              <Mail className="w-4 h-4" />
              {user.email}
            </CardDescription>
            {user.emailVerified ? (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500">E-mail verificado</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 mt-2">
                <X className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-yellow-500">E-mail não verificado</span>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Editar Nome */}
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base text-white">Nome de Exibição</CardTitle>
              </div>
              {!isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  className="text-xs"
                >
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingName ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-xs text-zinc-400">
                    Nome
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 h-11"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateName}
                    disabled={isUpdatingName}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isUpdatingName ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsEditingName(false);
                      setDisplayName(user.displayName || "");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-300">{user.displayName || "Nenhum nome definido"}</p>
            )}
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base text-white">Alterar Senha</CardTitle>
              </div>
              {!showPasswordFields && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordFields(true)}
                  className="text-xs"
                >
                  Alterar
                </Button>
              )}
            </div>
            <CardDescription className="text-xs text-zinc-500">
              Requer autenticação recente. Use uma senha forte.
            </CardDescription>
          </CardHeader>
          {showPasswordFields && (
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs text-zinc-400">
                    Senha Atual
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 h-11"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs text-zinc-400">
                    Nova Senha
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 h-11"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs text-zinc-400">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 h-11"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Alterar Senha
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordFields(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Informações da Conta */}
        <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base text-white">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">ID do Usuário</span>
              <span className="text-xs text-zinc-500 font-mono">{user.uid}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
              <span className="text-sm text-zinc-400">Provedor</span>
              <span className="text-xs text-zinc-500">
                {user.providerData[0]?.providerId === "password" ? "E-mail/Senha" : user.providerData[0]?.providerId}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-zinc-400">Criado em</span>
              <span className="text-xs text-zinc-500">
                {user.metadata.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR")
                  : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}