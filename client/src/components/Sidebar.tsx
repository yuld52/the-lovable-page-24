import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Settings,
  LogOut,
  Trophy,
  ChevronDown,
  User,
  BarChart3,
  DollarSign,
  Folder,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStats } from "@/hooks/use-stats";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(location.startsWith("/settings"));
  const [productsOpen, setProductsOpen] = useState(location.startsWith("/products") || location.startsWith("/members-area"));

  const searchParams = new URLSearchParams(window.location.search);
  const currentTab = searchParams.get("tab") || "integracao";

  const { user } = useUser();
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/checkouts", label: "Checkouts", icon: ShoppingCart },
    { href: "/sales", label: "Vendas", icon: Receipt },
    { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  ];

  const productSubItems = [
    { href: "/products", label: "Meus produtos" },
    { href: "/members-area", label: "Área de membros" },
  ];

  const settingSubItems = [
    { href: "/settings?tab=integracao", label: "Integração", icon: BarChart3 },
  ];

  const { data: stats } = useStats();
  // revenuePaid is totalRevenue/100 — already in whole MTn units
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
        <img src="https://www.image2url.com/r2/default/images/1777403007715-3125c2b9-991d-4cf5-ae03-744bfabf9b11.png" alt="Meteorfy" className="w-16 h-16 rounded-xl" />
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Meteor</span>
          <span className="text-foreground">fy</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <div className="bg-card/50 rounded-lg p-2 border-2 border-purple-500/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2">
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden">
                <img src="/favicon.png" alt="Meteorfy" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-normal text-white block">Faturamento</span>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-bold text-foreground whitespace-nowrap">
                    {new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(currentRevenue)}
                  </span>
                  <span className="text-xs font-bold text-foreground whitespace-nowrap">/ MT {currentGoal.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 rounded-full h-1.5 overflow-hidden border border-border/50 relative">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out relative"
                      style={{ 
                        width: `${Math.max(progress, 1)}%`,
                        background: `linear-gradient(90deg, #a855f7 0%, #a855f7 80%, #c084fc 90%, #e9d5ff 100%)`
                      }}
                    >
                      <div 
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-300 shadow-[0_0_8px_3px_rgba(192,132,252,0.7)]"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-white tabular-nums">{Math.floor(progress)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-4 py-2 space-y-1">
          <Link href="/dashboard">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/dashboard" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <LayoutDashboard size={18} strokeWidth={2.5} />
              Dashboard
            </button>
          </Link>

          {/* Collapsible Products Menu */}
          <div className="space-y-1">
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                (location.startsWith("/products") || location.startsWith("/members-area")) ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <div className="flex items-center gap-4">
                <Folder size={18} strokeWidth={2.5} />
                Produtos
              </div>
              <ChevronDown size={16} className={cn("transition-transform duration-200", productsOpen && "rotate-180")} />
            </button>

            {productsOpen && (
              <div className="space-y-1 ml-4 border-l border-border pl-2">
                {productSubItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                        )}
                      >
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link href="/checkouts">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/checkouts" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <ShoppingCart size={18} strokeWidth={2.5} />
              Checkouts
            </button>
          </Link>

          <Link href="/sales">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/sales" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <Receipt size={18} strokeWidth={2.5} />
              Vendas
            </button>
          </Link>

          <Link href="/financeiro">
            <button
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location === "/financeiro" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <DollarSign size={18} strokeWidth={2.5} />
              Financeiro
            </button>
          </Link>

          <div className="space-y-1">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all duration-200 text-[15px]",
                location.startsWith("/settings") ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-accent",
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