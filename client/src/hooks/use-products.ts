import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateProductRequest, UpdateProductRequest, Product } from "@shared/schema";

export function useProducts() {
  return useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) return [];
      return await response.json() as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProduct(id: string | number) {
  return useQuery({
    queryKey: ["/api/products", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) return null;
      return await response.json() as Product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductRequest) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Erro ao criar produto");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateProductRequest) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Erro ao atualizar produto");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao excluir produto");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
  });
}