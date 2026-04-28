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
import { apiRequest, queryClient } from "@/lib/queryClient";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(location.startsWith("/settings"));
  const { user } = useUser();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/products", label: "Produtos", icon: Package },
    { href: "/checkouts", label: "Checkouts", icon: ShoppingCart },
  ];

  const isAdmin = user?.username === "juniornegocios015@gmail.com";

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <img src="/icon-192.png" alt="Meteorfy" className="w-10 h-10 rounded-lg" />
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-primary">Meteor</span>fy
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <button className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
              location === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}>
              <item.icon size={18} />
              {item.label}
            </button>
          </Link>
        ))}
        <Link href="/settings">
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
            location.startsWith("/settings") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          )}>
            <Settings size={18} />
            Configurações
          </button>
        </Link>
      </nav>

      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground truncate mb-2 px-2">{user?.username}</p>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-secondary hover:bg-accent rounded-md transition-colors">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  );
}