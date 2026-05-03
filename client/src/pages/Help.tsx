import { useState } from "react";
import { 
  Search, 
  MessageCircle, 
  Mail, 
  Phone, 
  ArrowRight,
  HelpCircle,
  BookOpen,
  ChevronRight,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const helpTopics = [
  {
    id: "getting-started",
    title: "Começando",
    description: "Aprenda a configurar sua conta e criar seu primeiro produto",
    icon: BookOpen,
    articles: 5
  },
  {
    id: "products",
    title: "Produtos",
    description: "Dúvidas sobre criação e gestão de produtos",
    icon: BookOpen,
    articles: 9
  },
  {
    id: "checkout",
    title: "Checkout",
    description: "Problemas com páginas de venda ou pagamentos",
    icon: HelpCircle,
    articles: 6
  },
  {
    id: "payments",
    title: "Pagamentos",
    description: "Dúvidas sobre PayPal, reembolsos e saques",
    icon: HelpCircle,
    articles: 8
  },
  {
    id: "account",
    title: "Conta",
    description: "Problemas com login, senha ou dados da conta",
    icon: HelpCircle,
    articles: 4
  }
];

export default function Help() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const filteredTopics = helpTopics.filter(topic => 
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await apiRequest("POST", "/api/support/tickets", {
        subject: "Contacto via Central de Ajuda",
        message,
        category: "outro",
      });
      setMessage("");
      setLocation("/support");
    } catch {
      alert("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06061a] text-foreground font-sans">
      {/* Hero Section */}
      <section className="relative flex min-h-[50vh] items-center overflow-hidden bg-[#00001B] py-20">
        <div className="pointer-events-none absolute left-0 top-0 h-[340px] w-[340px] -translate-x-1/3 -translate-y-1/4 rounded-full opacity-30 blur-[90px]" style={{ background: "radial-gradient(circle, #55DFC0, transparent 70%)" }}></div>
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/3 rounded-full opacity-25 blur-[90px]" style={{ background: "radial-gradient(circle, #155DFC, transparent 70%)" }}></div>
        
        <div className="container relative z-10 mx-auto flex flex-col items-center gap-8 px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 rounded-full border border-[#155dfc]/30 bg-[rgba(21,93,252,0.1)] px-3 py-1">
              <BookOpen className="h-3.5 w-3.5 text-[#155dfc]" />
              <span className="text-xs font-medium text-[#155dfc]">Central de Ajuda</span>
            </div>
            <h1 className="text-4xl font-bold text-white md:text-5xl">Como podemos te ajudar?</h1>
          </div>

          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#155dfc] h-5 w-5" />
            <Input 
              type="text" 
              className="h-14 w-full rounded-xl border-border/40 bg-card/50 pl-12 pr-4 text-white placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring"
              placeholder="Pesquise artigos, tutoriais..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#155dfc]/40 to-transparent"></div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 pb-24 pt-14">
        <div className="mb-8 flex items-center gap-3">
          <span className="h-4 w-0.5 rounded-full bg-[#155dfc]"></span>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">Tópicos de Ajuda</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {filteredTopics.map((topic) => (
            <div 
              key={topic.id}
              className="group relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#155dfc]/50 hover:shadow-[0_0_32px_rgba(21,93,252,0.12)] cursor-pointer"
              onClick={() => setLocation(`/faq#${topic.id}`)}
            >
              <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_top_left,rgba(21,93,252,0.1),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#155dfc]/30 bg-[rgba(21,93,252,0.15)]">
                  <topic.icon className="h-5 w-5 text-[#155dfc]" />
                </div>
              
                <div className="flex flex-1 flex-col gap-1.5">
                  <h2 className="text-base font-semibold text-white/80 transition-colors duration-200 group-hover:text-white">{topic.title}</h2>
                  <p className="text-sm leading-relaxed text-white/40">{topic.description}</p>
                </div>
              
                <div className="mt-auto">
                  <span className="inline-flex items-center rounded-full border border-[#155dfc]/20 bg-[rgba(21,93,252,0.08)] px-2.5 py-0.5 text-xs font-medium text-[#155dfc]/80">
                    {topic.articles} artigos
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <section className="mt-20 border-t border-white/10 pt-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Não encontrou o que procurava?</h2>
            <p className="text-sm text-white/50 md:text-base mb-8">
              Fale direto com nosso time de suporte. Estamos aqui para ajudar!
            </p>
            
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button 
                className="bg-[#25D366] hover:bg-[#1FBF56] text-white font-semibold h-12 px-6 gap-2"
                onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </Button>
              <Button 
                variant="outline" 
                className="border-[#155dfc]/40 bg-[#155dfc]/10 text-[#155dfc] hover:bg-[#155dfc]/20 font-semibold h-12 px-6 gap-2"
                onClick={() => window.location.href = "mailto:suporte@meteorfy.com"}
              >
                <Mail className="h-4 w-4" />
                Enviar email
              </Button>
            </div>
            <p className="mt-4 text-xs text-white/30">suporte@meteorfy.com</p>
          </div>
        </section>

        {/* Quick Contact Form */}
        <section className="mt-16 max-w-2xl mx-auto">
          <Card className="bg-[#18181b] border-zinc-800/60 shadow-lg">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-2">Envie uma mensagem</h3>
              <p className="text-sm text-zinc-500 mb-4">Descreva sua dúvida e nossa equipe entrará em contato.</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-200">Sua mensagem</label>
                  <textarea 
                    className="w-full bg-black/40 border border-zinc-800 rounded-md p-3 min-h-[120px] text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-600 resize-none"
                    placeholder="Descreva sua dúvida ou problema..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isSending}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {isSending ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      Enviando...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Enviar Mensagem
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}