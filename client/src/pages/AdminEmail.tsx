import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mail, FileText, ChevronRight } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const TEMPLATES = [
  {
    id: "welcome",
    label: "Boas-vindas",
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
    subject: "O seu produto foi aprovado ✅",
    body: `Olá,

Temos o prazer de informar que o seu produto foi **aprovado** e já está disponível para venda na plataforma Meteorfy.

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

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users-v2");
      return res.json();
    },
  });

  const knownEmails = users?.map(u => u.email).filter(Boolean) || [];

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
      await apiRequest("POST", "/api/admin/send-email", { to: to.trim(), subject: subject.trim(), body: body.trim() });
      toast({ title: "Email enviado com sucesso!" });
      setTo("");
      setSubject("");
      setBody("");
      setSelectedTemplate(null);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Enviar Email</h1>
        <p className="text-muted-foreground text-sm mb-6">Envie uma mensagem personalizada para qualquer utilizador</p>

        <div className="max-w-2xl space-y-4">

          {/* Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Templates Prontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                      selectedTemplate === tpl.id
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-purple-500/60 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{tpl.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs text-purple-400 mt-3">
                  Template aplicado — pode editar o assunto e a mensagem antes de enviar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Composition */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                Composição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Para (email)</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  list="known-emails"
                />
                <datalist id="known-emails">
                  {knownEmails.map(email => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
                {knownEmails.length > 0 && (
                  <p className="text-xs text-muted-foreground">Sugestões: {knownEmails.slice(0, 5).join(", ")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  placeholder="Assunto do email"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Escreva a sua mensagem aqui…"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={12}
                  className="resize-none font-mono text-sm"
                />
              </div>

              <Button
                className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "A enviar…" : "Enviar Email"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            O email é enviado com o template Meteorfy. A mensagem aparece no corpo principal.
          </p>
        </div>
      </main>
    </div>
  );
}
