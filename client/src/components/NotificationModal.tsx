import { useState, useEffect } from "react";
import { Bell, X, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { enablePush, disablePush } from "@/lib/push";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const [isActivating, setIsActivating] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (settings) {
      setIsActive(settings.salesNotifications === true);
    }
  }, [settings]);

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      setIsActive(false);
      try {
        await disablePush(auth.currentUser);
        await updateSettings.mutateAsync({ salesNotifications: false });
        toast({ title: "Notificações desativadas" });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
      return;
    }

    setIsActivating(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado.");
      
      await enablePush(user);
      await updateSettings.mutateAsync({ salesNotifications: true });
      setIsActive(true);
      toast({ title: "Notificações ativadas!", description: "Você receberá alertas de vendas em tempo real." });
    } catch (err: any) {
      toast({ 
        title: "Falha na ativação", 
        description: err?.message || "Não foi possível ativar as notificações.", 
        variant: "destructive" 
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c0c0e] border-zinc-800 text-white max-w-[400px] rounded-3xl">
        <div className="relative p-8 flex flex-col items-center text-center">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Large Bell Icon */}
          <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800/50">
            <Bell className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Notificações de Vendas</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-[280px]">
            Receba alertas em tempo real quando uma venda for realizada.
          </p>

          {/* Toggle Card */}
          <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
              )}>
                <Bell size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Notificações ativas</p>
                <p className="text-[11px] text-zinc-500">Você receberá alertas de vendas</p>
              </div>
            </div>

            {isActivating ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            ) : (
              <Switch 
                checked={isActive} 
                onCheckedChange={handleToggle}
                className="data-[state=checked]:bg-emerald-500"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}