import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  LifeBuoy,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";

const CATEGORIES = [
  { value: "pagamentos", label: "Pagamentos" },
  { value: "produtos", label: "Produtos" },
  { value: "saques", label: "Saques" },
  { value: "conta", label: "Conta" },
  { value: "integracao", label: "Integração" },
  { value: "outro", label: "Outro" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  in_progress: { label: "Em andamento", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: MessageSquare },
  resolved: { label: "Resolvido", color: "text-green-400 bg-green-400/10 border-green-400/20", icon: CheckCircle2 },
  closed: { label: "Fechado", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", icon: X },
};

export default function Support() {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", message: "", category: "outro" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/support/tickets"],
  });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/support/tickets", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setForm({ subject: "", message: "", category: "outro" });
      setShowForm(false);
      toast({ title: "Ticket enviado!", description: "Responderemos em breve por email." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível enviar o ticket.", variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    create.mutate(form);
  };

  const openCount = tickets.filter((t: any) => t.status === "open" || t.status === "in_progress").length;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Suporte</h1>
              <p className="text-sm text-zinc-500">
                {openCount > 0 ? `${openCount} ticket${openCount > 1 ? "s" : ""} em aberto` : "Nenhum ticket em aberto"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancelar" : "Novo Ticket"}
          </Button>
        </div>

        {/* New Ticket Form */}
        {showForm && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
            <h2 className="font-bold text-white text-sm uppercase tracking-wide">Novo Pedido de Suporte</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Assunto</label>
                <Input
                  placeholder="Descreva brevemente o problema..."
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Categoria</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-700 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Mensagem</label>
              <textarea
                placeholder="Descreva o seu problema com o máximo de detalhes possível..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={5}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-600"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={create.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-2 w-full sm:w-auto"
            >
              {create.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Ticket
                </>
              )}
            </Button>
          </div>
        )}

        {/* Tickets List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <LifeBuoy className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">Nenhum ticket ainda</p>
            <p className="text-zinc-600 text-sm">Clique em "Novo Ticket" para entrar em contacto com o suporte.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: any) => {
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
                >
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
                          {CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                        </span>
                        <span className="text-xs text-zinc-600">#{ticket.id}</span>
                      </div>
                      <p className="font-semibold text-white text-sm truncate">{ticket.subject}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(ticket.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-1" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">A sua mensagem</p>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                        </div>
                      </div>

                      {ticket.adminReply && (
                        <div>
                          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2">Resposta do suporte</p>
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{ticket.adminReply}</p>
                            {ticket.repliedAt && (
                              <p className="text-xs text-zinc-500 mt-2">
                                {new Date(ticket.repliedAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {!ticket.adminReply && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Clock className="w-3.5 h-3.5" />
                          A aguardar resposta da equipa...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
