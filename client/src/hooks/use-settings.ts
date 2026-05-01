import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsRequest } from "@shared/schema";
import type { Settings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useSettings() {
  return useQuery({
    queryKey: ["api", "settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      const data = await res.json();
      return data as Settings | null;
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
      const data = await res.json();
      return data as Settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["api", "settings"], data);
      toast({ title: "Sucesso", description: "Configurações salvas!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Falha ao salvar configurações", 
        variant: "destructive" 
      });
    },
  });
}