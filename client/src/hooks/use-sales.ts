import { useQuery } from "@tanstack/react-query";
import type { Sale } from "@shared/schema";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [] as Sale[];

      const idToken = await getIdToken(user);
      const response = await fetch("/api/sales", {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar vendas");
      }

      return response.json() as Promise<Sale[]>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}