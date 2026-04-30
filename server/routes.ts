// ... (código anterior mantido) ...

  // --- VENDAS (Neon DB) ---
  // Atualizado para aceitar 'since' query param
  app.get(api.sales.list.path, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).user?.id || "");
      const sinceParam = req.query.since as string | undefined;
      
      const result = await storage.getSales(userId, sinceParam ? new Date(sinceParam) : undefined);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting sales:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar vendas" });
    }
  });

  // --- ENDPOINT PARA DISPARAR WEBHOOKS (Integrações) ---
  app.post("/api/track/sale-event", requireAuth, async (req, res) => {
    try {
      const { saleId, status, amount, productId } = req.body;
      const userId = String((req as any).user?.id || "");

      if (!saleId) return res.status(400).json({ message: "saleId required" });

      // Busca dados completos da venda
      const sale = await storage.getSale(saleId);
      if (!sale) return res.status(404).json({ message: "Sale not found" });

      // Busca configurações do usuário
      const settings = await storage.getSettings(userId);
      if (!settings) return res.json({ ok: true, message: "No settings found" });

      // Dispara eventos (UTMify, Meta Pixel, etc) usando a lógica existente
      // Nota: Como estamos no servidor, podemos reusar a lógica de tracking.ts
      try {
        // Exemplo: Se tiver UTMify configurado
        if (settings.utmifyToken) {
          // Lógica de envio para UTMify (simplificado)
          console.log(`[WEBHOOK] Disparando UTMify para venda ${saleId}`);
          // await sendUtmifyEvent(...); // Implementar conforme server/tracking.ts
        }
      } catch (trackErr) {
        console.error("[WEBHOOK] Erro no tracking:", trackErr);
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Error in sale-event:", err);
      res.status(500).json({ message: err.message });
    }
  });

// ... (resto do arquivo mantido) ...