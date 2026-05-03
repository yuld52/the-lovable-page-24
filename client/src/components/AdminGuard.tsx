import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { LoadingScreen } from "@/components/LoadingScreen";

const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const [, setLocation] = useLocation();

  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && !isAdmin) {
      setLocation("/admin-login");
    }
  }, [loading, isAdmin, setLocation]);

  if (loading) return <LoadingScreen />;
  if (!isAdmin) return null;

  return <>{children}</>;
}
