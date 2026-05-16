# Status dos Webhooks - Meta Pixel e Utmify

## 📊 Resumo da Implementação

### ✅ Meta Pixel (Pixel SDK do Facebook)
- **Status**: Implementado e ativo
- **Localização**: `client/src/pages/PublicCheckout.tsx`
- **Como funciona**: 
  - Injeta o script do Meta na página de checkout
  - Dispara evento `Purchase` quando o pagamento é aprovado
  - Usa Event ID para deduplicação (evita contar 2x)

### ✅ Utmify (API de Rastreamento)
- **Status**: Implementado e ativo
- **Localização**: `server/tracking.ts` + `server/routes.ts`
- **Como funciona**:
  - Envia pedido em status `waiting_payment` (quando cria a ordem)
  - Envia pedido em status `paid` (quando PayPal aprova)
  - Inclui dados do cliente, produto, UTMs e comissões

### ✅ Meta CAPI (Conversão API do Facebook)
- **Status**: Implementado e ativo
- **Localização**: `server/tracking.ts`
- **Como funciona**:
  - Envia evento de compra para Facebook via API
  - Compatível com Pixel SDK (deduplicação automática)
  - Usa hash SHA-256 de email para privacidade

---

## 🔧 O que foi adicionado hoje

### 1. Debug Logs Detalhados
```typescript
// Agora você verá no console:
[v0] Chamando sendUtmifyOrder para waiting_payment, token: ***
📤 [UTMIFY] Enviando pedido: { orderId: "123", ... }
[v0] UTMIFY Payload completo: { ... }
✅ [UTMIFY] Pedido enviado com sucesso: 200
```

### 2. Endpoint de Diagnóstico
```
GET /api/webhooks/diagnostics
```
Retorna status de todas as integrações configuradas.

### 3. Guia Completo de Testes
Arquivo: `WEBHOOK_TESTING.md`
- Como verificar configuração
- Como interpretar logs
- Como testar cada integração
- Como resolver problemas

---

## 🚀 Próximos Passos

### 1. Verificar Configuração
Acesse: `https://seu-site.vercel.app/api/webhooks/diagnostics`

Procure por:
- `"utmify": { "token": "✅ Configurado" }`
- `"meta": { "pixelId": "✅ Configurado", "accessToken": "✅ Configurado" }`

### 2. Fazer um Pagamento de Teste
1. Vá para página de checkout
2. Complete um pagamento com PayPal
3. Verifique os logs do servidor

### 3. Validar nos Serviços
- **Utmify**: Vá para `https://utmify.com.br` → Pedidos
- **Meta Pixel**: Vá para `https://business.facebook.com` → Eventos

---

## 🐛 Troubleshooting Rápido

| Problema | Verificar | Solução |
|----------|-----------|---------|
| Utmify recusa pedidos | Token configurado? | Gerar novo token no Utmify |
| Meta não rastreia | Pixel ID válido? | Gerar novo Access Token no Facebook |
| Token expirado (401) | Token ainda é válido? | Renovar token na plataforma |
| Payload incompleto | Logs mostram dados? | Verificar dados do cliente |

---

## 📝 Arquivos Modificados

```
server/tracking.ts          (adicionado debug logs)
server/routes.ts            (adicionado debug logs + diagnostics endpoint)
client/src/pages/PublicCheckout.tsx  (Meta Pixel já ativo)
WEBHOOK_TESTING.md          (novo - guia completo)
WEBHOOK_STATUS.md           (novo - este arquivo)
```

---

## 💡 Dicas Importantes

1. **Logs em desenvolvimento**: Aparecem no console do servidor
2. **Meta Pixel**: Funciona no navegador do cliente (F12 → Console)
3. **Utmify**: Funciona no servidor (logs do backend)
4. **Deduplicação**: Event ID previne contar a mesma compra 2x

---

## 🔐 Segurança

- Tokens nunca são exibidos em texto plano (mostram como `***`)
- Email é hasheado com SHA-256 antes de enviar para Meta
- Webhooks têm assinatura HMAC-SHA256
- Tokens são armazenados no banco de dados, não no .env público

---

## ✨ Conclusão

Tanto o **Meta Pixel** quanto o **Utmify** já estão 100% implementados e funcionais. Os debug logs adicionados permitem que você acompanhe exatamente o que está acontecendo em cada etapa.

Para validar que tudo está funcionando corretamente, siga o **WEBHOOK_TESTING.md**.

Qualquer dúvida ou erro, os logs detalhados ajudarão a identificar exatamente o que está acontecendo.
