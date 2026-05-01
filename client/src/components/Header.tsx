import * as React from "react";
import { Bell, UserCircle, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { NotificationModal } from "./NotificationModal";
import { logoutUser } from "@/lib/queryClient";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setLocation("/");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <header className="h-28 border-b border-border/50 bg-background/80 backdrop-blur-md px-8 flex items-center justify-between w-full shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-lg text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-accent text-zinc-400 hover:text-white transition-colors"
          onClick={() => setIsNotificationOpen(true)}
          title="Notificações"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-accent"
              title="Perfil"
            >
              <UserCircle className="h-5 w-5 text-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-64 p-2 bg-card border-border shadow-2xl rounded-2xl" 
            align="end"
            sideOffset={8}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-3 p-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center border border-purple-500/20">
                  <UserCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {user?.email?.split('@')[0] || "Usuário"}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {user?.email || ""}
                  </p>
                </div>
              </div>

              <div className="h-px bg-border/50 mx-1 my-1"></div>

              <div className="space-y-1 mt-1">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-accent text-foreground"
                  onClick={() => setLocation("/profile")}
                >
                  <UserCircle className="w-4 h-4" />
                  Meu Perfil
                </button>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-accent text-foreground"
                  onClick={() => toast({ title: "Em breve", description: "Central de ajuda será implementada em breve." })}
                >
                  <HelpCircle className="w-4 h-4" />
                  Ajuda & Suporte
                </button>
              </div>

              <div className="h-px bg-border/50 mx-1 my-1"></div>

              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 text-red-400"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <NotificationModal 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </header>
  );
}