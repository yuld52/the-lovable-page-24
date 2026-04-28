import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
      const res = await apiRequest("POST", "/api/register", { username: email, password });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({ title: "Sucesso", description: "Conta criada com sucesso!" });
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: "Este e-mail já está em uso ou a senha é inválida.",
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
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Meteor</span>
            <span className="text-white">fy</span>
          </h1>
          <p className="text-muted-foreground text-sm">Crie sua conta</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 ml-1">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/40 border-border text-foreground h-11"
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
                className="bg-background/40 border-border text-foreground h-11"
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl shadow-lg">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta"}
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-card/60 backdrop-blur-xl p-4 rounded-xl flex items-center justify-center gap-1">
          <p className="text-sm text-muted-foreground">Já tem uma conta?</p>
          <Link to="/login" className="text-sm text-primary font-medium">Entre agora</Link>
        </div>
      </div>
    </div>
  );
}