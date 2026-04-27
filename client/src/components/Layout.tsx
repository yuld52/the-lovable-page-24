import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";


interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto pb-20">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
