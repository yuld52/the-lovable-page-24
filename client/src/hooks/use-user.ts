import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { restoreSession, setCurrentUser } from "@/lib/queryClient";
import type { User } from "@/lib/db";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession().then((u) => {
      setUser(u);
      setCurrentUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}