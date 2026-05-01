import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsRequest, Settings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useSettings() {
  return useQuery<Settings | null>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/settings");
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        return data as Settings;
      } catch (error: any) {
        console.error("Error fetching settings:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: UpdateSettingsRequest) => {
      const res = await apiRequest("POST", "/api/settings", updates);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao salvar configurações");
      }
      const data = await res.json();
      return data as Settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings"], data);
      toast({ title: "Sucesso", description: "Configurações salvas!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar configurações",
        variant: "destructive",
      });
    },
  });
}