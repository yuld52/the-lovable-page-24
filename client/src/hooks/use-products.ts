import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/queryClient";
import type { Product } from "@/lib/db";

export function useProducts(status?: string) {
  return useQuery({
    queryKey: ["api/products", status],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) return [];
      return db.products.getAll(user.id, status);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useProduct(id: string | number) {
  return useQuery({
    queryKey: ["api/products", id],
    queryFn: async () => db.products.getById(String(id)),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const user = getCurrentUser();
      if (!user) throw new Error("Não autenticado");
      return db.products.create({
        ...payload,
        ownerId: user.id,
        status: 'pending',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & any) => {
      return db.products.update(String(id), updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      db.products.delete(String(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/products"] }),
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return db.products.approve(String(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/products"] }),
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return db.products.reject(String(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api/products"] }),
  });
}