# 🗄️ Guia de Teste - Conexão Neon Database

## Status Atual
- **Banco**: Neon PostgreSQL
- **URL**: `NEON_DATABASE_URL` (variável de ambiente)
- **Status**: Configurado em Vercel

---

## 🔍 Como Testar a Conexão

### 1. Verificar Variáveis de Ambiente
Acesse a dashboard do Vercel:
1. Vá para **Settings** → **Environment Variables**
2. Procure por `NEON_DATABASE_URL`
3. Verifique se está marcada como presente (✅)

Se não estiver, copie de: https://console.neon.tech → Project → Connection Details

---

### 2. Testar Endpoint de Conexão

#### No seu navegador:
```
https://seu-site.vercel.app/api/db-connection-test
```

#### Resposta esperada (sucesso):
```json
{
  "ok": true,
  "message": "Conexão com Neon estabelecida com sucesso",
  "timestamp": "2026-05-06T12:34:56.789Z",
  "dbTime": "2026-05-06T12:34:56.789Z",
  "env": {
    "NEON_DATABASE_URL": "✅ Configurada",
    "DATABASE_URL": "❌"
  }
}
```

#### Resposta esperada (erro):
Se receber erro, verifique:
1. **Timeout**: Problema de conectividade de rede
2. **Connection refused**: URL incorreta ou servidor desligado
3. **ENOENT/ENOTFOUND**: DNS não conseguiu resolver o host

---

### 3. Verificar Logs no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Clique em **Deployments**
4. Selecione o deployment mais recente
5. Clique em **Logs** ou **Overview**
6. Procure por linhas com `[v0]` para ver os logs de debug

---

## 📋 Logs que Você Verá

### Se a Conexão Funcionar:
```
[v0] Database URL encontrada: postgresql://...
[v0] Criando novo Pool de conexão Neon...
[v0] ✅ Pool conectado ao Neon com sucesso
[v0] getProducts: Conectando ao Neon...
[v0] getProducts: ✅ Conectado ao Neon
[v0] getProducts: Executando query...
[v0] getProducts: ✅ 5 produtos encontrados
```

### Se a Conexão Falhar:
```
[v0] NEON_DATABASE_URL: undefined
[v0] DATABASE_URL: undefined
❌ NEON_DATABASE_URL não configurada

OU

[v0] Error getting products: Error: getaddrinfo ENOTFOUND ep-square-sound-a...
[v0] Error stack: (stack trace completo do erro)
```

---

## ⚙️ Possíveis Problemas e Soluções

### ❌ "NEON_DATABASE_URL não configurada"
**Solução**: Vá para Vercel Settings → Environment Variables e adicione a variável

### ❌ "Connection refused"
**Possíveis causas**:
- URL do Neon incorreta
- Whitelist de IP não configurada no Neon
- Neon project está desligado

**Solução**:
1. Vá para https://console.neon.tech
2. Clique no seu project
3. Vá para **Settings** → **IP Allowlist**
4. Adicione `0.0.0.0/0` (ou IP específico do Vercel)

### ❌ "Timeout"
**Possível causa**: Problema de rede ou query muito lenta

**Solução**:
1. Verifique se o Neon está respondendo: https://console.neon.tech
2. Tente reconectar via Vercel redeploy
3. Verifique logs do Neon: https://console.neon.tech → **Monitoring**

### ❌ "no more connections available in pool"
**Causa**: Pool de conexões cheio

**Solução**: A aplicação está gerando muitas conexões simultâneas
- Aumente o pool size em `neon-storage.ts` (altere `max: 1` para `max: 5`)
- Verifique se há conexões não sendo liberadas

---

## 🚀 Próximos Passos

Uma vez que a conexão estiver funcionando:

1. **Produtos carregam**: ✅ `/api/products`
2. **Sales funcionam**: ✅ `/api/sales`
3. **Checkout funciona**: ✅ `/checkout/{id}`

---

## 📊 Diagrama de Conexão

```
App (Next.js/Express)
        ↓
   neon-storage.ts (Pool)
        ↓
   Neon PostgreSQL (Cloud)
        ↓
   Dados (products, sales, users, etc)
```

---

## 💡 Dicas

- Sempre use `NEON_DATABASE_URL` em produção (Vercel)
- Em desenvolvimento local, você pode usar `DATABASE_URL`
- Nunca commite URLs de banco no Git
- Sempre use `.env` e `.env.local` local
- As variáveis de environment do Vercel substituem as locais

---

**Precisa de ajuda?** Verifique os logs com `[v0]` no Vercel Logs e compare com os padrões acima.
