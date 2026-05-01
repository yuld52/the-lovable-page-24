import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/queryClient";

export function useAdminProducts() {
  return useQuery({
    queryKey: ["api/admin/products"],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user || user.email !== 'yuldchissico11@gmail.com') return [];
      return db.products.getAll();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useAdminCheckouts() {
  return useQuery({
    queryKey: ["api/admin/checkouts"],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user || user.email !== 'yuldchissico11@gmail.com') return [];
      return db.checkouts.getAll();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useAdminApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => db.products.approve(String(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/admin/products"] }),
  });
}

export function useAdminRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => db.products.reject(String(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/admin/products"] }),
  });
}