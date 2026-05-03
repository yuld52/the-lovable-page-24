import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BADGES = [
  { id: 1, threshold: 1,   label: "1ª Venda",    color: "#f59e0b", glow: "#f59e0b", ring: "#fbbf24", bg: "#78350f", num: "1" },
  { id: 2, threshold: 5,   label: "5 Vendas",     color: "#a78bfa", glow: "#7c3aed", ring: "#8b5cf6", bg: "#3b0764", num: "5" },
  { id: 3, threshold: 10,  label: "10 Vendas",    color: "#34d399", glow: "#059669", ring: "#10b981", bg: "#064e3b", num: "10" },
  { id: 4, threshold: 25,  label: "25 Vendas",    color: "#60a5fa", glow: "#2563eb", ring: "#3b82f6", bg: "#1e3a5f", num: "25" },
  { id: 5, threshold: 50,  label: "50 Vendas",    color: "#fb923c", glow: "#ea580c", ring: "#f97316", bg: "#431407", num: "50" },
  { id: 6, threshold: 100, label: "100 Vendas",   color: "#f472b6", glow: "#db2777", ring: "#ec4899", bg: "#4a044e", num: "100" },
];

function BadgeSVG({ badge, unlocked, size = 44 }: { badge: typeof BADGES[0]; unlocked: boolean; size?: number }) {
  const color = unlocked ? badge.color : "#4b5563";
  const ring = unlocked ? badge.ring : "#374151";
  const bg = unlocked ? badge.bg : "#1f2937";
  const s = size;

  // First sale badge uses the custom image
  if (badge.id === 1) {
    return (
      <div style={{ width: s, height: s, position: "relative" }}>
        <img
          src="/badges/first-sale-badge.png"
          alt="1ª Venda"
          style={{
            width: s,
            height: s,
            objectFit: "contain",
            filter: unlocked
              ? "none"
              : "grayscale(100%) brightness(0.4)",
            transition: "filter 0.3s",
          }}
        />
      </div>
    );
  }

  return (
    <svg width={s} height={s} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {unlocked && (
          <radialGradient id={`glow-${badge.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={badge.glow} stopOpacity="0.5" />
            <stop offset="100%" stopColor={badge.glow} stopOpacity="0" />
          </radialGradient>
        )}
        <linearGradient id={`bg-${badge.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={unlocked ? badge.color : "#374151"} stopOpacity="0.25" />
          <stop offset="100%" stopColor={unlocked ? bg : "#111827"} stopOpacity="1" />
        </linearGradient>
      </defs>

      {unlocked && (
        <circle cx="22" cy="22" r="22" fill={`url(#glow-${badge.id})`} />
      )}

      <circle cx="22" cy="22" r="19" fill={`url(#bg-${badge.id})`} stroke={ring} strokeWidth="1.8" />
      <circle cx="22" cy="22" r="15" fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="2 2" />

      <g transform="translate(11, 14)">
        <path
          d="M1 1h2l1.5 7h9l1.5-5H5"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="9" cy="11" r="1" fill={color} />
        <circle cx="13" cy="11" r="1" fill={color} />
        {unlocked && (
          <>
            <circle cx="15.5" cy="3" r="4" fill={badge.color} />
            <text x="15.5" y="3" textAnchor="middle" dominantBaseline="central" fontSize={badge.num.length > 1 ? "3.2" : "4"} fontWeight="800" fill="#000" fontFamily="system-ui,sans-serif">
              {badge.num}
            </text>
          </>
        )}
        {!unlocked && (
          <>
            <circle cx="15.5" cy="3" r="4" fill="#374151" />
            <text x="15.5" y="3" textAnchor="middle" dominantBaseline="central" fontSize={badge.num.length > 1 ? "3.2" : "4"} fontWeight="700" fill="#6b7280" fontFamily="system-ui,sans-serif">
              {badge.num}
            </text>
          </>
        )}
      </g>

      {unlocked && (
        <circle cx="22" cy="22" r="19" fill="none" stroke={badge.color} strokeWidth="0.4" strokeOpacity="0.6" />
      )}
    </svg>
  );
}

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
                    className={`relative cursor-default transition-transform hover:scale-110 ${unlocked ? "drop-shadow-sm" : "opacity-50"}`}
                    style={unlocked ? { filter: `drop-shadow(0 0 6px ${badge.glow}66)` } : {}}
                  >
                    <BadgeSVG badge={badge} unlocked={unlocked} size={36} />
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
