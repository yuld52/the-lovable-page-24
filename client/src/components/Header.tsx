import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { UserCircle } from "lucide-react";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2026, 0, 1),
    to: new Date(2026, 0, 29),
  });
  
  const { user } = useUser();
  const [, setLocation] = useLocation();

  return (
    <header className="h-28 border-b border-border/50 bg-background/80 backdrop-blur-md px-8 flex items-center justify-between w-full shrink-0">
      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-lg text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* User Profile Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-accent"
          onClick={() => setLocation("/profile")}
          title="Perfil"
        >
          <UserCircle className="h-5 w-5 text-foreground" />
        </Button>
      </div>
    </header>
  );
}