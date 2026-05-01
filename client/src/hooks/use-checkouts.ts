import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/queryClient";
import type { Checkout } from "@/lib/db";

export function useCheckouts() {
  return useQuery({
    queryKey: ["api/checkouts"],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) return [];
      return db.checkouts.getAll(user.id);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const user = getCurrentUser();
      if (!user) throw new Error("Não autenticado");
      const baseUrl = window.location.origin;
      return db.checkouts.create({
        ...payload,
        ownerId: user.id,
        publicUrl: `${baseUrl}/checkout/${payload.slug}`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/checkouts"] }),
  });
}

export function useUpdateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: updates }: { id: number; data: any }) => {
      return db.checkouts.update(String(id), updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/checkouts"] }),
  });
}

export function useCheckout(id: number) {
  return useQuery({
    queryKey: ["api/checkouts", id],
    queryFn: async () => db.checkouts.getById(String(id)),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useDeleteCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      db.checkouts.delete(String(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/checkouts"] }),
  });
}