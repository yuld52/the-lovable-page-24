import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  ArrowDownToLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLocation("/admin-login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border/50 flex-shrink-0 flex items-center gap-0">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <Shield className="w-5 h-5 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight ml-3">
          <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Admin</span>
          <span className="text-foreground"> Panel</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="px-4 py-2 space-y-1">
          <Link to="/admin">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/admin"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <LayoutDashboard size={18} strokeWidth={2.5} />
              Visão Geral
            </button>
          </Link>

          <Link to="/admin/products">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/admin/products"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Package size={18} strokeWidth={2.5} />
              Aprovação de Produtos
            </button>
          </Link>

          <Link to="/admin/users">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/admin/users"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Users size={18} strokeWidth={2.5} />
              Gerenciar Usuários
            </button>
          </Link>

          <Link to="/admin/withdrawals">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/admin/withdrawals"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <ArrowDownToLine size={18} strokeWidth={2.5} />
              Aprovação de Saques
            </button>
          </Link>

          <Link to="/admin/settings">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/admin/settings"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Settings size={18} strokeWidth={2.5} />
              Configurações
            </button>
          </Link>
        </nav>
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="px-2">
          <p className="text-xs text-muted-foreground truncate mb-2">{user?.email || ""}</p>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-accent rounded-md transition-colors border border-border"
          >
            <LogOut size={16} />
            Sair
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-3">© 2026 Meteorfy Inc.</p>
        </div>
      </div>
    </div>
  );
}