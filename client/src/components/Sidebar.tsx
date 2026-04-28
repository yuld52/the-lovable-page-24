import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Trophy,
  ChevronDown,
  User,
  BarChart3,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStats } from "@/hooks/use-stats";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(location.startsWith("/settings"));

  const searchParams = new URLSearchParams(window.location.search);
  const currentTab = searchParams.get("tab") || "gateway";

  const { user } = useUser();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/products", label: "Produtos", icon: Package },
    { href: "/checkouts", label: "Checkouts", icon: ShoppingCart },
  ];

  const isAdmin = user?.email === "juniornegocios015@gmail.com";

  const settingSubItems = [
    { href: "/settings?tab=gateway", label: "Gateway", icon: Wallet },
    ...(isAdmin ? [{ href: "/settings?tab=usuario", label: "Usuários", icon: User }] : []),
    { href: "/settings?tab=metricas", label: "Métricas", icon: BarChart3 },
  ];

  const { data: stats } = useStats();
  const currentRevenue = stats?.revenuePaid || 0;

  const goals = [
    { label: "10K", value: 10000 },
    { label: "100K", value: 100000 },
    { label: "1M", value: 1000000 },
    { label: "10M", value: 10000000 },
    { label: "100M", value: 100000000 },
    { label: "1B", value: 1000000000 },
  ];

  const currentGoal = goals.find((g) => currentRevenue < g.value) || goals[goals.length - 1];
  const progress = Math.min((currentRevenue / currentGoal.value) * 100, 100);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLocation("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border/50 flex-shrink-0 flex items-center gap-0">
        <img src="/icon-192.png" alt="Meteorfy" className="w-16 h-16 rounded-xl" />
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Meteor</span>
          <span className="text-foreground">fy</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <div className="bg-card/50 rounded-xl p-3 border border-purple-500/20 relative overflow-hidden group shadow-2xl shadow-purple-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-primary/10 rounded-xl shadow-inner border border-primary/20 overflow-hidden">
                <img src="/icon-192.png" alt="Logo" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Faturamento Total</span>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-sm font-black text-foreground whitespace-nowrap">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(currentRevenue)}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 whitespace-nowrap">/ R$ {currentGoal.label}</span>
                </div>
                
                <div className="relative pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-800/50 rounded-full h-2 relative border border-white/5">
                      {/* Progress Fill */}
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out relative"
                        style={{ 
                          width: `${Math.max(progress, 2)}%`,
                          background: `linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)`,
                          boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)'
                        }}
                      >
                        {/* Glow Tip */}
                        <div 
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_4px_rgba(192,132,252,0.8)] animate-pulse"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-purple-400 tabular-nums w-8 text-right">{Math.floor(progress)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                    isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Icon size={18} strokeWidth={2.5} />
                  {item.label}
                </button>
              </Link>
            );
          })}

          <div className="space-y-1">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location.startsWith("/settings") ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <div className="flex items-center gap-4">
                <Settings size={18} strokeWidth={2.5} />
                Configurações
              </div>
              <ChevronDown size={16} className={cn("transition-transform duration-200", settingsOpen && "rotate-180")} />
            </button>

            {settingsOpen && (
              <div className="space-y-1 ml-4 border-l border-border pl-2">
                {settingSubItems.map((item) => {
                  const Icon = item.icon;
                  const itemTab = new URLSearchParams(item.href.split("?")[1]).get("tab");
                  const isActive = location === "/settings" && currentTab === itemTab;

                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                        )}
                      >
                        <Icon size={14} />
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

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
    </div>
  );
}