import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@shared/schema";

export function useStats(period?: string, productId?: string) {
  return useQuery<DashboardStats>({
    queryKey: ["/api/stats", { period: period ?? "30", productId: productId ?? "all" }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append("period", period);
      if (productId && productId !== "all") params.append("productId", productId);

      const response = await fetch(`/api/stats?${params.toString()}`);
      if (!response.ok) {
        return {
          salesToday: 0,
          revenuePaid: 0,
          salesApproved: 0,
          revenueTarget: 10000,
          revenueCurrent: 0,
          chartData: [],
        };
      }
      return response.json() as Promise<DashboardStats>;
    },
    staleTime: 1000 * 60 * 5,
  });
}