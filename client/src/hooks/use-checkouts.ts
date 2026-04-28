import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Checkout, CreateCheckoutRequest, UpdateCheckoutRequest } from "@shared/schema";

export function useCheckouts() {
  return useQuery({
    queryKey: ["/api/checkouts"],
    queryFn: async () => {
      const response = await fetch("/api/checkouts");
      if (!response.ok) return [] as Checkout[];
      return response.json() as Promise<Checkout[]>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCheckoutRequest) => {
      const response = await fetch("/api/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Erro ao criar checkout");
      return response.json() as Promise<Checkout>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] }),
  });
}

export function useUpdateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: updates }: { id: number; data: UpdateCheckoutRequest }) => {
      const response = await fetch(`/api/checkouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Erro ao atualizar checkout");
      return response.json() as Promise<Checkout>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts", id] });
    },
  });
}

export function useCheckout(id: number) {
  return useQuery({
    queryKey: ["/api/checkouts", id],
    queryFn: async () => {
      const response = await fetch(`/api/checkouts/${id}`);
      if (!response.ok) return null;
      return response.json() as Promise<Checkout | null>;
    },
    enabled: !!id,
  });
}

export function useDeleteCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await fetch(`/api/checkouts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao excluir checkout");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] }),
  });
}