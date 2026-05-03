import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mail } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function AdminEmail() {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users-v2"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users-v2");
      return res.json();
    },
  });

  const knownEmails = users?.map(u => u.email).filter(Boolean) || [];

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                Composição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* To */}
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

              {/* Subject */}
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  placeholder="Assunto do email"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Escreva a sua mensagem aqui…"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
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

          {/* Preview note */}
          <p className="text-xs text-muted-foreground text-center">
            O email é enviado com o template Meteorfy. A mensagem aparece no corpo principal.
          </p>
        </div>
      </main>
    </div>
  );
}
