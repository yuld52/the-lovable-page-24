import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BADGES = [
  { id: 1, threshold: 1,   label: "1ª Venda",   img: "/badges/first-sale-badge.png" },
  { id: 2, threshold: 5,   label: "5 Vendas",   img: "/badges/badge-5.png" },
  { id: 3, threshold: 10,  label: "10 Vendas",  img: "/badges/badge-10.png" },
  { id: 4, threshold: 25,  label: "25 Vendas",  img: "/badges/badge-25.png" },
  { id: 5, threshold: 50,  label: "50 Vendas",  img: "/badges/badge-50.png" },
  { id: 6, threshold: 100, label: "100 Vendas", img: "/badges/badge-100.png" },
];

export function SalesBadges() {
  const { data: sales } = useQuery<any[]>({
    queryKey: ["sales"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];
      const token = await getIdToken(user);
      const res = await fetch("/api/sales", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
  });

  const totalSales = sales?.length ?? 0;
  const unlockedCount = BADGES.filter(b => totalSales >= b.threshold).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {BADGES.map((badge) => {
            const unlocked = totalSales >= badge.threshold;
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div
                    className="relative cursor-default transition-transform hover:scale-110"
                    style={{ width: 40, height: 40 }}
                  >
                    <img
                      src={badge.img}
                      alt={badge.label}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "contain",
                        filter: unlocked
                          ? "drop-shadow(0 0 5px rgba(255,200,50,0.5))"
                          : "grayscale(100%) brightness(0.35)",
                        transition: "filter 0.3s",
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-700 text-xs">
                  <span className={unlocked ? "text-white font-semibold" : "text-zinc-500"}>
                    {badge.label}
                  </span>
                  {!unlocked && (
                    <span className="text-zinc-600 ml-1">— {badge.threshold - totalSales} em falta</span>
                  )}
                  {unlocked && <span className="text-emerald-400 ml-1">✓ Desbloqueado</span>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">
          {unlockedCount}/{BADGES.length} selos · {totalSales} venda{totalSales !== 1 ? "s" : ""}
        </p>
      </div>
    </TooltipProvider>
  );
}
