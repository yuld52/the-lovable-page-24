# Guia de Teste - Webhooks Meta Pixel e Utmify

## 1. Verificar Configuração Atual

Acesse: `https://seu-site.vercel.app/api/webhooks/diagnostics`

Você verá um JSON com o status de todas as integrações:

```json
{
  "timestamp": "2026-05-06T10:30:00Z",
  "webhooks": {
    "paypal": { "webhookId": "✅ Configurado" },
    "meta": {
      "pixelId": "✅ Configurado",
      "accessToken": "✅ Configurado",
      "enabled": true
    },
    "utmify": {
      "token": "✅ Configurado",
      "enabled": true
    }
  }
}
```

### O que significa cada status?

- ✅ **Configurado**: A credencial foi salva nas settings
- ❌ **Não configurado**: Falta adicionar a credencial nas settings

---

## 2. Verificar Logs em Tempo Real

Quando você faz uma compra, verifique o console do seu servidor:

### Meta Pixel (Browser-side)
```
📘 [META PIXEL] Inicializado com pixelId: 123456789
📘 [META PIXEL] Purchase disparado eventId: abc-def-123
```

### Utmify (Server-side)
```
[v0] Chamando sendUtmifyOrder para waiting_payment, token: ***
📤 [UTMIFY] Enviando pedido: { orderId: "123", status: "waiting_payment", ... }
[v0] UTMIFY Payload completo: { ... }
✅ [UTMIFY] Pedido enviado com sucesso: 200

[v0] Chamando sendUtmifyOrder para paid, token: ***, saleId: 123
📤 [UTMIFY] Enviando pedido: { orderId: "123", status: "paid", ... }
✅ [UTMIFY] Pedido enviado com sucesso: 200
```

### Meta CAPI (Server-side)
```
📘 [META CAPI] Evento 'Purchase' pixelId=123456789 eventId=xyz-789
[v0] META CAPI Payload: { ... }
✅ [META CAPI] Evento 'Purchase' enviado
```

---

## 3. Checklist de Configuração

### Meta Pixel
- [ ] Facebook Pixel ID configurado nas Settings
- [ ] Facebook Access Token configurado nas Settings
- [ ] Meta está **Enabled** nas Settings
- [ ] Track Purchase está **ativado** nas Settings

Onde encontrar:
1. Vá em **Settings** no seu app
2. Procure **Integração de Pixel do Meta**
3. Adicione seu **Pixel ID** e **Access Token**

### Utmify
- [ ] Token do Utmify configurado nas Settings
- [ ] Utmify está **Enabled** nas Settings
- [ ] Você tem uma conta ativa em https://utmify.com.br

Onde encontrar o token:
1. Acesse https://utmify.com.br
2. Vá para **Integrações** → **API**
3. Copie o **Token da API**
4. Cole em **Settings** → **Integração UTMify** → **Token**

---

## 4. Testando a Integração Completa

### Passo 1: Preparar o Teste
```bash
# Abra o Developer Tools do seu navegador (F12)
# Acesse a aba Console para ver logs
```

### Passo 2: Fazer uma Compra
1. Acesse a página de checkout
2. Preencha os dados do cliente
3. Complete o pagamento com PayPal

### Passo 3: Verificar Logs
- **Console do Navegador**: Procure por logs com 📘 (Meta Pixel)
- **Console do Servidor**: Procure por logs com 📤 e ✅ (Utmify, Meta CAPI)

### Passo 4: Verificar no Utmify
1. Acesse https://utmify.com.br
2. Vá para **Pedidos** ou **Dashboard**
3. Procure pelo pedido que acabou de fazer
4. Verifique se os dados estão corretos (cliente, produto, UTMs, etc)

### Passo 5: Verificar no Meta Pixel
1. Acesse https://business.facebook.com
2. Vá para **Eventos** → seu **Pixel ID**
3. Procure pelo evento **Purchase** recente
4. Verifique se o `eventID` combina com o log

---

## 5. Resolvendo Problemas

### Utmify não recebe os pedidos

**Verificar:**
```bash
# 1. Token está configurado?
curl https://seu-site.vercel.app/api/webhooks/diagnostics
# Procure por: "utmify": { "token": "✅ Configurado" }

# 2. Está habilitado?
# No app, Settings → Utmify → deve estar "Ativado"

# 3. Verificar erros no console:
# Procure por: "[UTMIFY] Erro:" ou "❌ [UTMIFY]"
```

**Solução:**
- Gere um novo token no Utmify
- Salve nas Settings novamente
- Teste uma nova compra

### Meta Pixel não dispara

**Verificar:**
```bash
# 1. Pixel ID está configurado?
curl https://seu-site.vercel.app/api/webhooks/diagnostics

# 2. Access Token é válido?
# No Facebook, vá para Settings → Tokens

# 3. Meta está habilitado?
# No app, Settings → Meta → deve estar "Ativado"
```

**Solução:**
- Gere um novo Access Token no Facebook
- Salve nas Settings novamente
- Teste uma nova compra

### Recebi erro 401/403

**Significado:**
- 401: Token inválido ou expirado
- 403: Credenciais sem permissão

**Solução:**
- Revise o token na plataforma (Utmify/Facebook)
- Gere um novo token se necessário
- Teste novamente

---

## 6. Monitoramento Contínuo

Para acompanhar em tempo real:

```bash
# Terminal 1: Acompanhe os logs
tail -f seu-app.log | grep -E "UTMIFY|META|WEBHOOK"

# Terminal 2: Envie um pedido de teste
curl -X POST https://seu-site.vercel.app/api/paypal/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "seu-checkout-id",
    "productId": 1,
    "currency": "BRL",
    "totalMinor": 100000,
    "customerData": {
      "name": "Test Customer",
      "email": "test@example.com"
    }
  }'
```

---

## 7. Conclusão

Se tudo está funcionando, você verá:
- ✅ Logs "Pedido enviado com sucesso" para Utmify
- ✅ Pedidos aparecendo no Utmify em minutos
- ✅ Eventos de compra no Meta Pixel

Se algo não funciona, revise os logs com os padrões acima e entre em contato com suporte.
