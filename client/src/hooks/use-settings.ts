import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsRequest, Settings } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return null;

      const idToken = await getIdToken(user);
      const response = await fetch("/api/settings", {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return { environment: "sandbox" } as Settings;
        throw new Error("Erro ao carregar configurações");
      }

      return response.json() as Promise<Settings>;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateSettingsRequest) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      const idToken = await getIdToken(user);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao salvar configurações");
      }

      return response.json() as Promise<Settings>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}