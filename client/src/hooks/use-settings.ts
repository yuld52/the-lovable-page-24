import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsRequest, Settings } from "@shared/schema";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
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
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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