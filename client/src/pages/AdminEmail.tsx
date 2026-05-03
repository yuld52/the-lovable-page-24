import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mail, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const TEMPLATES = [
  {
    id: "welcome",
    label: "Boas-vindas",
    emoji: "👋",
    subject: "Bem-vindo à Meteorfy! 🚀",
    body: `Olá,

Seja bem-vindo(a) à Meteorfy!

Estamos muito felizes por tê-lo(a) connosco. A nossa plataforma foi criada para ajudar criadores digitais a vender os seus produtos de forma simples e eficiente.

Para começar:
• Crie o seu primeiro produto
• Configure o seu checkout personalizado
• Partilhe o link e comece a vender

Se tiver alguma dúvida, não hesite em entrar em contacto com o nosso suporte.

Boas vendas!
Equipa Meteorfy`,
  },
  {
    id: "approved",
    label: "Produto Aprovado",
    emoji: "✅",
    subject: "O seu produto foi aprovado ✅",
    body: `Olá,

Temos o prazer de informar que o seu produto foi aprovado e já está disponível para venda na plataforma Meteorfy.

Pode agora:
• Criar o seu checkout personalizado
• Partilhar o link de vendas
• Acompanhar as suas vendas no painel

Obrigado por fazer parte da nossa comunidade!

Equipa Meteorfy`,
  },
  {
    id: "rejected",
    label: "Produto Rejeitado",
    emoji: "⚠️",
    subject: "Produto pendente de revisão ⚠️",
    body: `Olá,

O seu produto foi analisado pela nossa equipa e, infelizmente, não cumpre alguns dos nossos requisitos de publicação.

Motivos comuns de rejeição:
• Descrição insuficiente (mínimo 200 caracteres)
• Imagem de capa em falta ou de baixa qualidade
• Conteúdo que viola os nossos termos de uso

Por favor, reveja o seu produto, faça as devidas correções e submeta novamente para análise.

Se tiver dúvidas sobre os motivos específicos, responda a este email.

Equipa Meteorfy`,
  },
  {
    id: "withdrawal",
    label: "Saque Processado",
    emoji: "💰",
    subject: "O seu saque foi processado 💰",
    body: `Olá,

O seu pedido de saque foi processado com sucesso!

O valor solicitado será transferido para a sua conta nos próximos 1–2 dias úteis, entre as 9:30h e as 15:30h.

Caso não receba o pagamento dentro do prazo, entre em contacto com o nosso suporte.

Obrigado por confiar na Meteorfy!

Equipa Meteorfy`,
  },
  {
    id: "security",
    label: "Aviso de Segurança",
    emoji: "🔒",
    subject: "Aviso importante sobre a sua conta 🔒",
    body: `Olá,

A nossa equipa de segurança detetou uma atividade incomum na sua conta.

Por precaução, recomendamos que:
• Altere a sua palavra-passe imediatamente
• Verifique os seus dados de pagamento
• Reveja as transações recentes

Se não reconhece esta atividade, entre em contacto connosco com urgência respondendo a este email.

Equipa de Segurança Meteorfy`,
  },
  {
    id: "maintenance",
    label: "Manutenção Programada",
    emoji: "🛠️",
    subject: "Manutenção programada na plataforma 🛠️",
    body: `Olá,

Informamos que a plataforma Meteorfy estará em manutenção programada no próximo dia [DATA] das [HORA INÍCIO] às [HORA FIM].

Durante este período, poderá ocorrer instabilidade nos serviços.

O que será afetado:
• Processamento de pagamentos
• Acesso ao painel de controlo
• Envio de emails automáticos

Pedimos desculpa pela inconveniência e agradecemos a sua compreensão.

Equipa Meteorfy`,
  },
  {
    id: "promo",
    label: "Novidade / Promoção",
    emoji: "🎉",
    subject: "Novidades na Meteorfy 🎉",
    body: `Olá,

Temos novidades para si!

[Descreva aqui a novidade ou promoção]

Aceda já ao seu painel e descubra tudo o que preparámos para si.

Boas vendas!
Equipa Meteorfy`,
  },
];

export default function AdminEmail() {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users-v2");
      return res.json();
    },
  });

  const knownEmails = (users || [])
    .map((u: any) => u.email)
    .filter((e: string) => e && e.includes("@"));

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSelectedTemplate(tpl.id);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await apiRequest("POST", "/api/admin/send-email", {
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      setSent(true);
      toast({ title: "Email enviado com sucesso!" });
      setTimeout(() => {
        setTo("");
        setSubject("");
        setBody("");
        setSelectedTemplate(null);
        setSent(false);
      }, 2000);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Mail className="w-7 h-7 text-purple-400" />
              Enviar Email
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Envie uma mensagem personalizada para qualquer utilizador da plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

            {/* Left — Templates */}
            <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Templates</span>
              </div>
              <div className="p-3 space-y-1">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                      selectedTemplate === tpl.id
                        ? "bg-purple-600/20 border border-purple-500/40 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="text-base leading-none">{tpl.emoji}</span>
                    <span className="flex-1 font-medium">{tpl.label}</span>
                    {selectedTemplate === tpl.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <div className="px-5 py-3 border-t border-zinc-800/60">
                  <p className="text-xs text-purple-400">
                    Template aplicado. Pode editar antes de enviar.
                  </p>
                </div>
              )}
            </div>

            {/* Right — Composition */}
            <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Composição</span>
              </div>

              <div className="p-6 space-y-5">
                {/* To */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Para (email)
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    list="known-emails"
                    className="bg-zinc-900/50 border-zinc-700 focus:border-purple-500/60 h-10"
                  />
                  <datalist id="known-emails">
                    {knownEmails.map((email: string) => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>

                  {/* Email chips */}
                  {knownEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {knownEmails.slice(0, 6).map((email: string) => (
                        <button
                          key={email}
                          type="button"
                          onClick={() => setTo(email)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            to === email
                              ? "bg-purple-600/30 border-purple-500/60 text-purple-300"
                              : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-purple-500/40 hover:text-zinc-200"
                          }`}
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Assunto
                  </Label>
                  <Input
                    placeholder="Assunto do email"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-700 focus:border-purple-500/60 h-10"
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Mensagem
                  </Label>
                  <Textarea
                    placeholder="Escreva a sua mensagem aqui…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={14}
                    className="bg-zinc-900/50 border-zinc-700 focus:border-purple-500/60 resize-none font-mono text-sm"
                  />
                  {body && (
                    <p className="text-xs text-zinc-600 text-right">
                      {body.length} caracteres
                    </p>
                  )}
                </div>

                {/* Send */}
                <Button
                  className={`w-full gap-2 text-white font-semibold h-11 transition-all ${
                    sent
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : "bg-purple-600 hover:bg-purple-500"
                  }`}
                  onClick={handleSend}
                  disabled={sending || sent}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : sent ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? "A enviar…" : sent ? "Enviado!" : "Enviar Email"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
