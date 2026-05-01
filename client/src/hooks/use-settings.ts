import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/queryClient";

export function useSettings() {
  return useQuery({
    queryKey: ["api/settings"],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) return null;
      return db.settings.get(user.id) || { environment: 'sandbox', salesNotifications: false };
    },
    staleTime: 0,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
      const user = getCurrentUser();
      if (!user) throw new Error("Não autenticado");
      return db.settings.upsert(user.id, updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/settings"] }),
  });
}