import { AdminSidebar } from "./AdminSidebar";
import { Toaster } from "@/components/ui/toaster";
import { Menu, Shield } from "lucide-react";
import { useState, useEffect } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("light");
    root.classList.remove("light");
    return () => {
      if (had) root.classList.add("light");
    };
  }, []);

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden dark">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Shield className="w-3 h-3 text-red-500" />
            </div>
            <span className="font-bold text-foreground text-sm">Admin Panel</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

      <Toaster />
    </div>
  );
}
