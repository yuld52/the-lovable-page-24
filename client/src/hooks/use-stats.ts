import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/queryClient";

export function useStats(period?: string, productId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["api/stats", { period: period ?? "30", productId: productId ?? "all", startDate, endDate }],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) {
        return {
          salesToday: 0, revenuePaid: 0, salesApproved: 0,
          conversionRate: 0, revenueTarget: 10000, revenueCurrent: 0,
          chartData: [],
        };
      }
      return db.getDashboardStats(user.id, period, productId, startDate, endDate);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}