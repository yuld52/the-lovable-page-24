import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Construction } from "lucide-react";

export default function Afiliados() {
  return (
    <Layout title="Afiliados" subtitle="Gerencie seus afiliados e comissões">
      <Card className="bg-[#18181b] border-zinc-800/60 flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-zinc-900 p-6 rounded-full mb-6">
          <Construction className="w-12 h-12 text-purple-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Em Construção</h3>
        <p className="text-zinc-500 max-w-md mx-auto">
          Estamos preparando uma experiência incrível para você gerenciar seus afiliados, links de indicação e comissões. Em breve disponível!
        </p>
      </Card>
    </Layout>
  );
}