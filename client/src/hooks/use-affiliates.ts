import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Affiliate, InsertAffiliate, Commission, AffiliateLink, InsertAffiliateLink, AffiliateWithdrawal, InsertAffiliateWithdrawal } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export function useAffiliateStats() {
  return useQuery({
    queryKey: ["affiliates", "stats"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return { totalAffiliates: 0, activeAffiliates: 0, totalEarnings: 0, totalConversions: 0 };
      
      const idToken = await getIdToken(user);
      const response = await fetch("/api/affiliates/stats", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error("Erro ao carregar estatísticas");
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAffiliates() {
  return useQuery({
    queryKey: ["affiliates"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];
      
      const idToken = await getIdToken(user);
      const response = await fetch("/api/affiliates", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) return [];
      return response.json() as Promise<Affiliate[]>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAffiliate) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch("/api/affiliates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Erro ao criar afiliado");
      }

      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
  });
}

export function useUpdateAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertAffiliate>) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch(`/api/affiliates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error("Erro ao atualizar afiliado");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
  });
}

export function useApproveAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch(`/api/affiliates/${id}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error("Erro ao aprovar afiliado");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
  });
}

export function useRejectAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch(`/api/affiliates/${id}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error("Erro ao rejeitar afiliado");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
  });
}

export function useDeleteAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch(`/api/affiliates/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error("Erro ao excluir afiliado");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
  });
}

// Affiliate Links
export function useAffiliateLinks(affiliateId?: number) {
  return useQuery({
    queryKey: ["affiliate-links", affiliateId],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];
      
      const idToken = await getIdToken(user);
      const url = affiliateId ? `/api/affiliate-links?affiliateId=${affiliateId}` : "/api/affiliate-links";
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) return [];
      return response.json() as Promise<AffiliateLink[]>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAffiliateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAffiliateLink) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch("/api/affiliate-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Erro ao criar link");
      }

      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliate-links"] }),
  });
}

export function useDeleteAffiliateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch(`/api/affiliate-links/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error("Erro ao excluir link");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliate-links"] }),
  });
}

// Commissions
export function useCommissions(affiliateId?: number) {
  return useQuery({
    queryKey: ["commissions", affiliateId],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];
      
      const idToken = await getIdToken(user);
      const url = affiliateId ? `/api/commissions?affiliateId=${affiliateId}` : "/api/commissions";
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) return [];
      return response.json() as Promise<Commission[]>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// Affiliate Withdrawals
export function useCreateAffiliateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAffiliateWithdrawal) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      
      const idToken = await getIdToken(user);
      const response = await fetch("/api/affiliate-withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Erro ao solicitar saque");
      }

      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliate-withdrawals"] }),
  });
}