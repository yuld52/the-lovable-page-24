import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Checkout, CreateCheckoutRequest, UpdateCheckoutRequest } from "@shared/schema";
import { auth, db } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { collection, doc, getDoc, getDocs, deleteDoc, query, where } from "firebase/firestore";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  const idToken = await getIdToken(user);
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${idToken}`
  };
}

export function useCheckouts() {
  return useQuery({
    queryKey: ["checkouts"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) {
        return [] as Checkout[];
      }

      const headers = await getAuthHeaders();
      const response = await fetch("/api/checkouts", {
        method: "GET",
        headers
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar checkouts");
      }

      return response.json() as Promise<Checkout[]>;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCheckoutRequest) => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const headers = await getAuthHeaders();
      const response = await fetch("/api/checkouts", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao criar checkout");
      }

      return response.json() as Promise<Checkout>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkouts"] }),
  });
}

export function useUpdateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: updates }: { id: number; data: UpdateCheckoutRequest }) => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/checkouts/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao atualizar checkout");
      }

      return response.json() as Promise<Checkout>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["checkouts", id] });
    },
  });
}

export function useCheckout(id: number) {
  return useQuery({
    queryKey: ["checkouts", id],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/checkouts/${id}`, {
        method: "GET",
        headers
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Erro ao carregar checkout");
      }

      return response.json() as Promise<Checkout | null>;
    },
    enabled: !!id,
  });
}

export function useDeleteCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch(`/api/checkouts/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Erro ao excluir checkout");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkouts"] }),
  });
}
