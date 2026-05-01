import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/queryClient";

export function useSales() {
  return useQuery({
    queryKey: ["api/sales"],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) return [];
      return db.sales.getAll(user.id);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}