import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Sale } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

// Admin: Get ALL products (no user filter)
export function useAdminProducts(): Promise<Product[]> {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const idToken = await getIdToken(user);
      const response = await fetch("/api/admin/products", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) {
        console.error("Failed to fetch admin products:", response.status);
        return [];
      }

      return response.json() as Promise<Product[]>;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// Admin: Get ALL checkouts
export function useAdminCheckouts(): Promise<any[]> {
  return useQuery({
    queryKey: ["admin", "checkouts"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const idToken = await getIdToken(user);
      const response = await fetch("/api/admin/checkouts", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) {
        console.error("Failed to fetch admin checkouts:", response.status);
        return [];
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// Admin: Get ALL sales
export function useAdminSales(): Promise<Sale[]> {
  return useQuery({
    queryKey: ["admin", "sales"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const idToken = await getIdToken(user);
      const response = await fetch("/api/admin/sales", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) {
        console.error("Failed to fetch admin sales:", response.status);
        return [];
      }

      return response.json() as Promise<Sale[]>;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useAdminApproveProduct() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    }
  });
}

export function useAdminRejectProduct() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    }
  });
}