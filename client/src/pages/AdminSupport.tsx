import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
} from "lucide-react";

const CATEGORIES: Record<string, string> = {
  pagamentos: "Pagamentos",
  produtos: "Produtos",
  saques: "Saques",
  conta: "Conta",
  integracao: "Integração",
  outro: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  in_progress: { label: "Em andamento", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: MessageSquare },
  resolved: { label: "Resolvido", color: "text-green-400 bg-green-400/10 border-green-400/20", icon: CheckCircle2 },
  closed: { label: "Fechado", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", icon: X },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const FILTER_OPTIONS = ["all", "open", "in_progress", "resolved", "closed"] as const;
const FILTER_LABELS: Record<string, string> = { all: "Todos", open: "Abertos", in_progress: "Em andamento", resolved: "Resolvidos", closed: "Fechados" };

export default function AdminSupport() {
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyStatus, setReplyStatus] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tickets = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/support"],
  });

  const reply = useMutation({
    mutationFn: ({ id, text, status }: { id: number; text: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/support/${id}/reply`, { reply: text, status }).then(r => r.json()),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/support"] });
      setReplyText(prev => ({ ...prev, [vars.id]: "" }));
      toast({ title: "Resposta enviada!", description: "O utilizador foi notificado por email." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível enviar a resposta.", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/support/${id}/status`, { status }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/support"] }),
    onError: () => toast({ title: "Erro", description: "Não foi possível actualizar o status.", variant: "destructive" }),
  });

  const filtered = tickets.filter((t: any) => filter === "all" || t.status === filter);
  const counts: Record<string, number> = { all: tickets.length };
  for (const t of tickets as any[]) counts[t.status] = (counts[t.status] || 0) + 1;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <LifeBuoy className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Tickets de Suporte</h1>
                <p className="text-sm text-zinc-500">{counts.open || 0} abertos · {tickets.length} total</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-zinc-400 border-zinc-700">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {FILTER_LABELS[f]} {counts[f] !== undefined ? `(${counts[f]})` : "(0)"}
              </button>
            ))}
          </div>

          {/* Tickets */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
                <LifeBuoy className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ticket: any) => {
                const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === ticket.id;
                const currentReply = replyText[ticket.id] ?? "";
                const currentStatus = replyStatus[ticket.id] ?? (ticket.status === "open" ? "in_progress" : ticket.status);

                return (
                  <div key={ticket.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <button
                      className="w-full text-left p-4 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                            {CATEGORIES[ticket.category] || ticket.category}
                          </span>
                          <span className="text-xs text-zinc-600 font-mono">#{ticket.id}</span>
                          <span className="text-xs text-zinc-500 truncate max-w-[200px]">{ticket.userId}</span>
                        </div>
                        <p className="font-semibold text-white text-sm truncate">{ticket.subject}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(ticket.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-800 p-4 space-y-4">
                        {/* Original message */}
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Mensagem do utilizador</p>
                          <div className="bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                          </div>
                        </div>

                        {/* Previous reply */}
                        {ticket.adminReply && (
                          <div>
                            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">Resposta anterior</p>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{ticket.adminReply}</p>
                            </div>
                          </div>
                        )}

                        {/* Reply form */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            {ticket.adminReply ? "Nova resposta" : "Responder"}
                          </p>
                          <textarea
                            placeholder="Escreva a sua resposta..."
                            value={currentReply}
                            onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            rows={4}
                            className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-zinc-600"
                          />
                          <div className="flex items-center gap-3 flex-wrap">
                            <select
                              value={currentStatus}
                              onChange={e => setReplyStatus(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              className="h-9 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <Button
                              onClick={() => reply.mutate({ id: ticket.id, text: currentReply, status: currentStatus })}
                              disabled={!currentReply.trim() || reply.isPending}
                              className="bg-red-600 hover:bg-red-500 text-white gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Enviar Resposta
                            </Button>
                            <button
                              onClick={() => updateStatus.mutate({ id: ticket.id, status: ticket.status === "closed" ? "open" : "closed" })}
                              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              {ticket.status === "closed" ? "Reabrir" : "Fechar ticket"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
