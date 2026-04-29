import { useState } from "react";
import { 
  Search, 
  BookOpen, 
  FileText, 
  Briefcase, 
  DollarSign, 
  Zap, 
  Link2, 
  Lightbulb, 
  Shield, 
  Flag, 
  MessageCircle, 
  Mail,
  ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const collections = [
  {
    id: "cadastro-e-conta",
    title: "Cadastro e Conta",
    description: "Saiba sobre como funciona o cadastro no Meteorfy",
    icon: FileText,
    articles: 3
  },
  {
    id: "produtos",
    title: "Produtos",
    description: "Saiba tudo sobre como cadastrar produtos e criar páginas de checkout",
    icon: Briefcase,
    articles: 9
  },
  {
    id: "financas",
    title: "Finanças",
    description: "Saiba sobre todos os itens do menu Finanças",
    icon: DollarSign,
    articles: 6
  },
  {
    id: "checkout-e-conversao",
    title: "Checkout e conversão",
    description: "Otimize seu checkout para aumentar as conversões",
    icon: Zap,
    articles: 6
  },
  {
    id: "integracoes",
    title: "Integrações",
    description: "Conecte o Meteorfy com outras ferramentas",
    icon: Link2,
    articles: 8
  },
  {
    id: "como-fazer",
    title: "Como fazer?",
    description: "Veja os tutoriais de como fazer diversas ações dentro da plataforma",
    icon: Lightbulb,
    articles: 5
  },
  {
    id: "consumidor",
    title: "Consumidor",
    description: "Informações para quem está comprando",
    icon: Shield,
    articles: 4
  },
  {
    id: "denuncia-de-plagio",
    title: "Denúncia de plágio",
    description: "Saiba como denunciar conteúdo plagiado",
    icon: Flag,
    articles: 2
  },
  {
    id: "upsell-one-click",
    title: "Upsell One Click",
    description: "Saiba como configurar o upsell no Meteorfy",
    icon: Zap,
    articles: 3
  }
];

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCollections = collections.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#06061a] text-foreground font-sans">
      {/* Hero Section */}
      <section className="relative flex min-h-[52vh] items-center overflow-hidden bg-[#00001B] py-20">
        <div className="pointer-events-none absolute left-0 top-0 h-[340px] w-[340px] -translate-x-1/3 -translate-y-1/4 rounded-full opacity-30 blur-[90px]" style={{ background: "radial-gradient(circle, #55DFC0, transparent 70%)" }}></div>
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/3 rounded-full opacity-25 blur-[90px]" style={{ background: "radial-gradient(circle, #155DFC, transparent 70%)" }}></div>
        
        <div className="absolute right-6 top-8 z-20">
          <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 gap-2">
            <span className="text-base">🇧🇷</span>
            <span className="hidden sm:inline">Português</span>
            <ChevronDown className="h-4 w-4 text-white/60" />
          </Button>
        </div>

        <div className="container relative z-10 mx-auto flex flex-col items-center gap-8 px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 rounded-full border border-[#155dfc]/30 bg-[rgba(21,93,252,0.1)] px-3 py-1">
              <BookOpen className="h-3.5 w-3.5 text-[#155dfc]" />
              <span className="text-xs font-medium text-[#155dfc]">Central de Ajuda</span>
            </div>
            <h1 className="text-4xl font-bold text-white md:text-5xl">Olá, como podemos te ajudar?</h1>
          </div>

          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#155dfc] h-5 w-5" />
            <Input 
              type="text" 
              className="h-14 w-full rounded-xl border border-[#155dfc]/40 bg-white/5 pl-12 pr-4 text-white placeholder:text-white/30 focus:border-[#155dfc] focus:ring-1 focus:ring-[#155dfc]/30" 
              placeholder="Pesquisar artigos..." 
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
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">Coleções</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCollections.map((collection) => (
            <Link key={collection.id} href={`/faq/${collection.id}`}>
              <div className="group relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#155dfc]/50 hover:shadow-[0_0_32px_rgba(21,93,252,0.12)] cursor-pointer">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#155dfc] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_top_left,rgba(21,93,252,0.1),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                
                <div className="relative flex h-full flex-col gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#155dfc]/30 bg-[rgba(21,93,252,0.15)]">
                    <collection.icon className="h-5 w-5 text-[#155dfc]" />
                  </div>
                  
                  <div className="flex flex-1 flex-col gap-1.5">
                    <h2 className="text-base font-semibold text-white/80 transition-colors duration-200 group-hover:text-white">{collection.title}</h2>
                    <p className="text-sm leading-relaxed text-white/40">{collection.description}</p>
                  </div>
                  
                  <div className="mt-auto">
                    <span className="inline-flex items-center rounded-full border border-[#155dfc]/20 bg-[rgba(21,93,252,0.08)] px-2.5 py-0.5 text-xs font-medium text-[#155dfc]/80">
                      {collection.articles} artigos
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Contact Section */}
        <section className="mt-20 border-t border-white/10 pt-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">Não encontrou o que procurava?</h2>
            <p className="mt-2 text-sm text-white/50 md:text-base">Fale direto com nosso time de suporte.</p>
            
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button className="bg-[#25D366] hover:bg-[#1FBF56] text-white font-semibold h-12 px-6 gap-2">
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </Button>
              <Button variant="outline" className="border-[#155dfc]/40 bg-[#155dfc]/10 text-[#155dfc] hover:bg-[#155dfc]/20 font-semibold h-12 px-6 gap-2">
                <Mail className="h-4 w-4" />
                Enviar email
              </Button>
            </div>
            <p className="mt-4 text-xs text-white/30">suporte@meteorfy.com</p>
          </div>
        </section>
      </main>
    </div>
  );
}