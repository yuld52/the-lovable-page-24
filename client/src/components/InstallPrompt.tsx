// VERIFICAÇÃO ANTIGRAVITY: ESTOU EDITANDO ESTE ARQUIVO AGORA. SE VOCÊ VÊ ISTO, ESTAMOS NO MESMO DIRETÓRIO.
import { useEffect, useState } from "react";
import { Download, Smartphone, Monitor, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already installed as PWA
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches
            || (window.navigator as any).standalone === true;
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Check if device is iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        // Listen for install prompt (Chrome/Edge/Android)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Show banner after a delay even if beforeinstallprompt doesn't fire
        // (for desktop browsers that support PWA but have different UX)
        const timer = setTimeout(() => {
            if (!isStandalone) {
                setShowBanner(true);
            }
        }, 3000);

        // Listen for successful install
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            clearTimeout(timer);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setDeferredPrompt(null);
                setShowBanner(false);
            }
        }
    };

    if (isInstalled || dismissed) return null;
    if (!showBanner) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 p-4 rounded-2xl shadow-2xl max-w-sm relative">
                {/* Close button */}
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X size={16} />
                </button>

                {deferredPrompt ? (
                    /* Native install prompt available */
                    <div className="flex items-center gap-3">
                        <div className="min-w-12 min-h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                            <Download size={22} className="text-purple-400" />
                        </div>
                        <div className="flex-1 pr-4">
                            <p className="text-sm font-bold text-white mb-0.5">Instalar Meteorfy</p>
                            <p className="text-xs text-zinc-400 mb-2">Acesse direto da sua área de trabalho</p>
                            <Button
                                onClick={handleInstallClick}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 px-4 rounded-lg"
                            >
                                <Download size={14} className="mr-1.5" />
                                Instalar agora
                            </Button>
                        </div>
                    </div>
                ) : isIOS ? (
                    /* iOS instructions */
                    <div className="flex items-start gap-3 pr-4">
                        <div className="min-w-12 min-h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                            <Smartphone size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white mb-1">Instalar Meteorfy</p>
                            <p className="text-xs text-zinc-400">
                                Toque em <span className="font-bold text-zinc-200">Compartilhar</span>{" "}
                                e depois em <span className="font-bold text-zinc-200">Adicionar à Tela de Início</span>.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Desktop fallback instructions (Chrome/Edge) */
                    <div className="flex items-start gap-3 pr-4">
                        <div className="min-w-12 min-h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                            <Monitor size={22} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white mb-1">Instalar Meteorfy</p>
                            <p className="text-xs text-zinc-400">
                                Clique no menu do navegador{" "}
                                <span className="font-bold text-zinc-200">⋮</span> →{" "}
                                <span className="font-bold text-zinc-200">Instalar Meteorfy</span>{" "}
                                ou procure o ícone <span className="font-bold text-zinc-200">⊕</span> na barra de endereços.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
