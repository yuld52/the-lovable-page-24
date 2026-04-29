import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, FileText, Lightbulb, Shield, Flag, Zap, Link2, Briefcase, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";

const collections = [
  {
    id: "cadastro-e-conta",
    title: "Cadastro e Conta",
    description: "Saiba sobre como funciona o cadastro no Meteorfy",
    icon: FileText,
    articles: [
      { id: "como-criar-conta", title: "Como criar uma conta", content: "Para criar uma conta no Meteorfy, acesse a página inicial e clique em 'Criar Conta'. Preencha seu e-mail e senha. Você receberá um link de confirmação por e-mail." },
      { id: "recuperar-senha", title: "Como recuperar sua senha", content: "Na página de login, clique em 'Esqueceu a senha?'. Insira seu e-mail e enviaremos um link para redefinição de senha." },
      { id: "alterar-email", title: "Como alterar seu e-mail", content: "Acesse seu perfil, clique em 'Configurações' e altere seu e-mail na seção de informações da conta." }
    ]
  },
  {
    id: "produtos",
    title: "Produtos",
    description: "Saiba tudo sobre como cadastrar produtos e criar páginas de checkout",
    icon: Briefcase,
    articles: [
      { id: "como-criar-produto", title: "Como criar um produto", content: "Acesse o menu 'Meus Produtos' e clique em 'Novo Produto'. Preencha as informações básicas: nome, preço, descrição e imagem de capa." },
      { id: "upload-arquivos", title: "Upload de arquivos de entrega", content: "Nos produtos digitais, você pode fazer upload de até 20 arquivos (máximo 64MB cada) ou fornecer um link de acesso." },
      { id: "status-produto", title: "O que significa o status do produto?", content: "Produtos podem estar como 'Pendente' (aguardando aprovação), 'Aprovado' ou 'Rejeitado'. Todos os produtos passam por análise antes de serem publicados." }
    ]
  },
  {
    id: "financas",
    title: "Finanças",
    description: "Saiba sobre todos os itens do menu Finanças",
    icon: DollarSign,
    articles: [
      { id: "como-funciona-saque", title: "Como funciona o saque?", content: "O saque é feito via PIX. Acesse o menu Finanças, informe o valor e sua chave PIX. O processamento leva até 3 dias úteis." }
    ]
  },
  {
    id: "checkout-e-conversao",
    title: "Checkout e conversão",
    description: "Otimize seu checkout para aumentar as conversões",
    icon: Zap,
    articles: [
      { id: "personalizar-checkout", title: "Personalizar página de checkout", content: "Acesse 'Checkouts', crie ou edite um checkout. Você pode alterar cores, textos, timer, depoimentos e produtos de upsell/order bump." }
    ]
  },
  {
    id: "integracoes",
    title: "Integrações",
    description: "Conecte o Meteorfy com outras ferramentas",
    icon: Link2,
    articles: [
      { id: "configurar-paypal", title: "Configurar PayPal", content: "Acesse Configurações > Integração > PayPal. Insira seu Client ID e Client Secret obtidos no painel de desenvolvedor do PayPal." }
    ]
  }
];

export default function FAQArticle() {
  const [match, params] = useRoute("/faq/:collectionId");
  const [, setLocation] = useLocation();
  
  if (!match || !params?.collectionId) {
    return (
      <div className="min-h-screen w-full bg-[#06061a] text-foreground font-sans flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Coleção não encontrada</h1>
          <Button onClick={() => setLocation("/faq")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para FAQ
          </Button>
        </div>
      </div>
    );
  }

  const collection = collections.find(c => c.id === params.collectionId);
  
  if (!collection) {
    return (
      <div className="min-h-screen w-full bg-[#06061a] text-foreground font-sans flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Coleção não encontrada</h1>
          <Button onClick={() => setLocation("/faq")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para FAQ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#06061a] text-foreground font-sans">
      {/* Hero Section */}
      <section className="relative flex min-h-[30vh] items-center overflow-hidden bg-[#00001B] py-20">
        <div className="pointer-events-none absolute left-0 top-0 h-[340px] w-[340px] -translate-x-1/3 -translate-y-1/4 rounded-full opacity-30 blur-[90px]" style={{ background: "radial-gradient(circle, #155DFC0, transparent 70%)" }}></div>
        
        <div className="container relative z-10 mx-auto flex flex-col items-center gap-8 px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 rounded-full border border-[#155dfc]/30 bg-[rgba(21,93,252,0.1)] px-3 py-1">
              <BookOpen className="h-3.5 w-3.5 text-[#155dfc]" />
              <span className="text-xs font-medium text-[#155dfc]">{collection.title}</span>
            </div>
            <h1 className="text-4xl font-bold text-white md:text-5xl">{collection.title}</h1>
            <p className="text-lg text-white/70 max-w-2xl">{collection.description}</p>
          </div>

          <Button 
            variant="outline" 
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 gap-2"
            onClick={() => setLocation("/faq")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Central de Ajuda
          </Button>
        </div>
      </section>

      {/* Articles */}
      <main className="container mx-auto px-6 pb-24 pt-14">
        <div className="max-w-3xl mx-auto space-y-6">
          {collection.articles.map((article, index) => (
            <div key={article.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#155dfc]/50 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#155dfc] rounded-l-md" />
              
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#155dfc]/30 bg-[rgba(21,93,252,0.15)] flex-shrink-0 mt-1">
                  <span className="text-sm font-bold text-[#155dfc]">{index + 1}</span>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white mb-3 group-hover:text-[#155dfc] transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-white/60 leading-relaxed">
                    {article.content}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Contact Section */}
          <section className="mt-20 border-t border-white/10 pt-12">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold text-white md:text-3xl">Não encontrou o que procurava?</h2>
              <p className="mt-2 text-sm text-white/50 md:text-base">Fale direto com nosso time de suporte.</p>
              
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button className="bg-[#25D366] hover:bg-[#1FBF56] text-white font-semibold h-12 px-6 gap-2">
                  <Zap className="h-4 w-4" />
                  Falar no WhatsApp
                </Button>
                <Button variant="outline" className="border-[#155dfc]/40 bg-[#155dfc]/10 text-[#155dfc] hover:bg-[#155dfc]/20 font-semibold h-12 px-6 gap-2">
                  <FileText className="h-4 w-4" />
                  Enviar email
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/30">suporte@meteorfy.com</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}