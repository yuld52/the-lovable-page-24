// ... (código anterior mantido) ...

  // --- PAYPAL (atualizado para comissões de afiliados) ---
  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { createOrderBodySchema, createOrder } = await import("./paypal");
      const body = createOrderBodySchema.parse(req.body);
      const checkout = await storage.getCheckoutPublic(body.checkoutId);
      const product = await storage.getProduct(body.productId);
      if (!checkout || !product) return res.status(404).json({ message: "Checkout/Produto não encontrado" });

      if (product.status !== 'approved') {
        return res.status(403).json({ message: "Produto não aprovado" });
      }

      let settings = checkout.ownerId ? await storage.getSettings(String(checkout.ownerId)) : null;
      if (!settings?.paypalClientId) settings = await storage.getAnySettings();

      if (!settings?.paypalClientId || !settings?.paypalClientSecret) {
        return res.status(500).json({ message: "PayPal não configurado" });
      }

      const order = await createOrder(
        { clientId: settings.paypalClientId, clientSecret: settings.paypalClientSecret, environment: (settings.environment || "production") as any },
        { currency: body.currency, amountMinor: body.totalMinor, description: product.name }
      );

      // Check if there's an affiliate referral
      let affiliateId = null;
      if (body.refCode) {
        const affiliate = await storage.getAffiliateByCode(body.refCode);
        if (affiliate && affiliate.status === 'active') {
          affiliateId = affiliate.id;
        }
      }

      await storage.createSale({
        checkoutId: body.checkoutId,
        productId: body.productId,
        userId: checkout.ownerId,
        amount: body.totalUsdCents,
        status: "pending",
        customerEmail: body.customerData?.email || null,
        paypalOrderId: order.id,
        paypalCurrency: body.currency,
        paypalAmountMinor: body.totalMinor,
        affiliateId: affiliateId, // Store affiliate reference
      });

      res.json({ id: order.id });
    } catch (err: any) {
      console.error("Error creating PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao criar pedido" });
    }
  });

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

      // Create commission if there's an affiliate
      if (sale.affiliateId) {
        const affiliate = await storage.getAffiliate(sale.affiliateId);
        if (affiliate && affiliate.status === 'active') {
          const commissionRate = parseFloat(affiliate.commissionRate) / 100;
          const commissionAmount = Math.round(sale.amount * commissionRate);
          
          await storage.createCommission({
            affiliateId: sale.affiliateId,
            saleId: sale.id,
            productId: sale.productId,
            amount: sale.amount,
            commissionRate: affiliate.commissionRate,
            commissionAmount: commissionAmount,
            status: 'pending'
          });

          // Increment link conversions if applicable
          // (You'd need to track which link was used)
        }
      }

      res.json({ status: captured.status || "COMPLETED" });
    } catch (err: any) {
      console.error("Error capturing PayPal order:", err);
      res.status(500).json({ message: err.message || "Erro ao capturar pedido" });
    }
  });

// ... (resto do arquivo mantido) ...