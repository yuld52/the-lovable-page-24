import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { sendNotification } from "@/lib/push";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

const POLLING_INTERVAL = 45000; // 45 segundos

export function useNotifications(userId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    console.log("[POLLING] Iniciando verificação de vendas...");

    const checkSales = async () => {
      try {
        // Busca vendas desde a última verificação
        const params = new URLSearchParams();
        params.append("since", lastCheck.toISOString());

        const response = await apiRequest("GET", `/api/sales?${params.toString()}`);
        const newSales: Sale[] = await response.json();

        if (newSales && newSales.length > 0) {
          console.log(`[POLLING] ${newSales.length} nova(s) venda(s) detectada(s)!`);

          newSales.forEach((sale) => {
            const productName = `Produto #${sale.productId}`;
            const amount = (sale.amount / 100).toFixed(2);

            // 1. Dispara Notificação Nativa
            sendNotification("Venda Aprovada! 🎉", {
              body: `${productName} - R$ ${amount}`,
              data: { url: "/sales" },
            });

            // 2. Dispara Integrações (Webhooks/UTMify/Pixel)
            // Isso chama o backend para processar os webhooks
            apiRequest("POST", "/api/track/sale-event", {
              saleId: sale.id,
              status: sale.status,
              amount: sale.amount,
              productId: sale.productId,
            }).catch(err => console.error("[POLLING] Erro ao disparar webhook:", err));

            // 3. Mostra Toast (opcional)
            toast({
              title: "Nova Venda!",
              description: `${productName} - R$ ${amount}`,
            });
          });

          // Atualiza a lista de vendas na tela
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
        }

        // Atualiza o timestamp da última verificação
        setLastCheck(new Date());
      } catch (err) {
        console.error("[POLLING] Erro na verificação:", err);
      }
    };

    // Executa imediatamente e depois a cada 45s
    checkSales();
    intervalRef.current = setInterval(checkSales, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, userId, lastCheck, queryClient]);
}