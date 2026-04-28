import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

export function useUser() {
  const { data: user, isLoading: loading, error } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Falha ao buscar usuário");
      return res.json();
    },
    retry: false,
    staleTime: Infinity,
  });

  return { user, loading, error };
}