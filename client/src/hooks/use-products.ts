import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateProductRequest, UpdateProductRequest, Product } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export function useProducts(status?: string) {
  return useQuery({
    queryKey: ["products", status],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const idToken = await getIdToken(user);
      const url = status ? `/api/products?status=${status}` : "/api/products";
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      
      if (!response.ok) return [];
      return await response.json() as Product[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useProduct(id: string | number) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user || !id) return null;

      const idToken = await getIdToken(user);
      const response = await fetch(`/api/products/${id}`, {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

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
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar produto");
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateProductRequest) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error("Erro ao atualizar produto");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error("Erro ao excluir produto");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch(`/api/products/${id}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Erro ao aprovar produto");
      }

      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch(`/api/products/${id}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Erro ao rejeitar produto");
      }

      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}