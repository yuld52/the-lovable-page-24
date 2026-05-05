import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto pb-20">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
