# Configurando Neon Database no Meteorfy

## Passo a passo

### 1. Criar conta no Neon
1. Acesse [Neon](https://neon.tech) e crie uma conta
2. Crie um novo projeto (ex: "meteorfy")
3. Copie a connection string (DATABASE_URL) fornecida

### 2. Configurar variáveis de ambiente
Edite o arquivo `.env` e adicione:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/meteorfy?sslmode=require"
NEON_DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/meteorfy?sslmode=require"
```

### 3. Executar migrações do banco
```bash
npx drizzle-kit push
```

### 4. Reiniciar a aplicação
```bash
npm run dev
```

## O que foi alterado

- Substituímos o Firestore (Firebase) pelo Neon (PostgreSQL serverless)
- Todas as operações de banco de dados agora usam SQL através do driver `@neondatabase/serverless`
- Mantive o Firebase Auth para autenticação (mais simples)
- As tabelas continuam as mesmas (products, checkouts, sales, settings)

## Benefícios do Neon
- PostgreSQL completo e escalável
- Serverless (pague apenas pelo uso)
- Branching de banco de dados (para desenvolvimento)
- Compatível com Drizzle ORM

## Troubleshooting

Se houver erro de conexão:
1. Verifique se a DATABASE_URL está correta
2. Certifique-se que o Neon aceita conexões do seu IP
3. Tente adicionar `&sslmode=require` na URL se houver erro SSL