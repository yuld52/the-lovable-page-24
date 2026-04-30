# Sistema de Afiliados - Meteorfy

## Visão Geral

O sistema de afiliados permite que você crie uma rede de marketing de afiliados, onde outras pessoas podem promover seus produtos e receber uma comissão por cada venda realizada.

## Campos Adicionados

### Na Tabela `products` (PostgreSQL/Neon)

- `is_affiliate` (boolean): Define se o produto participa do programa de afiliados.
- `affiliate_commission` (integer): Porcentagem de comissão (ex: 10 para 10%).
- `affiliate_cookie_days` (integer): Dias de validade do cookie do afiliado (padrão: 30 dias).

### Na Tabela `sales` (PostgreSQL/Neon)

- `affiliate_id` (text): ID do afiliado que gerou a venda.
- `affiliate_commission_paid` (integer): Valor da comissão paga ao afiliado (em centavos).

## Como Usar

### 1. Criar um Produto com Afiliação

1. Vá em **Produtos** > **Novo Produto**.
2. Preencha as informações básicas (passo 1).
3. Selecione os métodos de pagamento (passo 2).
4. Configure o método de entrega (passo 3).
5. No passo 4 (**Afiliados**):
   - Ative a chave **"Ativar Sistema de Afiliados"**.
   - Defina a **Comissão do Afiliado** (ex: 10 para 10% de comissão).
   - Defina os **Dias de Cookie** (ex: 30 dias).

### 2. Gerar Link de Afiliado

Quando o produto estiver aprovado, o link de afiliado será:
```
https://seudosite.com/checkout/{slug}?aff={affiliate_id}
```

### 3. Funcionamento

1. O afiliado compartilha o link com seu ID único.
2. Quando um cliente clica no link, um cookie é criado no navegador (válido pelo período definido).
3. Se o cliente comprar dentro deste período, o sistema:
   - Registra o `affiliate_id` na venda.
   - Calcula a comissão baseada na porcentagem definida no produto.
   - Salva o valor em `affiliate_commission_paid`.

### 4. Acompanhar Vendas de Afiliados

No painel **Vendas**, você verá as vendas com:
- `affiliate_id`: ID do afiliado.
- `affiliate_commission_paid`: Valor da comissão (em centavos).

## Próximos Passos (Roadmap)

- [ ] Criar painel para afiliados verem suas comissões.
- [ ] Criar sistema de pagamento automático de comissões via PIX.
- [ ] Adicionar relatórios de afiliados no dashboard.
- [ ] Criar links de afiliado personalizados.

## Notas Técnicas

- O cookie é armazenado como `meteorfy_aff_{productId}` com duração definida em `affiliate_cookie_days`.
- A comissão é calculada no momento da criação da venda (`/api/paypal/create-order`).
- O sistema é compatível com PayPal, Stripe e PIX (quando implementados).

## Exemplo de Cálculo

Se um produto de **$100** tem **10%** de comissão:
- Venda: $100 (10.000 centavos)
- Comissão: 10.000 * (10 / 100) = **1.000 centavos ($10)**
- O afiliado recebe $10 automaticamente.