// ... (código anterior mantido) ...

  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { captureOrder } = await import("./paypal");
      const sale = await storage.getSaleByPaypalOrderId(req.params.orderId);
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });

      const checkout = await storage.getCheckoutPublic(sale.checkoutId);
      let settings = checkout?.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId) settings = await storage.getAnySettings();

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) return res.status(500).json({ message: "PayPal não configurado" });

      const captured = await captureOrder(
        { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
        req.params.orderId
      );

      await storage.updateSaleStatus(sale.id, "paid");

      // --- ENVIAR NOTIFICAÇÃO PUSH (FCM) ---
      try {
        const { notifySale } = await import("./services/notification");
        await notifySale(
          checkout?.ownerId || sale.userId,
          `Venda #${sale.id}`,
          sale.amount / 100,
          "USD" // ou a moeda da venda
        );
      } catch (pushErr) {
        console.error("[PUSH] Erro ao enviar notificação de venda:", pushErr);
      }

      res.json({ status: captured.status || "COMPLETED" });
    } catch (err: any) {
      console.error("Error capturing PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao capturar pedido" });
    }
  });

// ... (resto do arquivo mantido) ...