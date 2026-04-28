import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export function useStats(period?: string, productId?: string) {
  return useQuery<DashboardStats>({
    queryKey: ["stats", { period: period ?? "30", productId: productId ?? "all" }],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) {
        return {
          salesToday: 0,
          revenuePaid: 0,
          salesApproved: 0,
          revenueTarget: 10000,
          revenueCurrent: 0,
          chartData: [],
        };
      }

      const idToken = await getIdToken(user);
      const params = new URLSearchParams();
      if (period) params.append("period", period);
      if (productId && productId !== "all") params.append("productId", productId);

      const response = await fetch(`/api/stats?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar estatísticas");
      }

      return response.json() as Promise<DashboardStats>;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });
}