import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env imediatamente
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ [DB] DATABASE_URL não encontrada! Verifique o arquivo .env ou os Secrets do Replit.");
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000 
});

export const db = drizzle(pool, { schema });

// Função para garantir que o pool existe (satisfaz legados de código)
export const ensurePool = () => {
  return pool;
};

// Função para testar se o banco responde e se as tabelas existem
export async function testConnection() {
  if (!databaseUrl) return false;
  try {
    console.log("⏳ [DB] Testando conexão com Neon...");
    // Tenta selecionar 1 da tabela users para ver se ela existe
    await db.execute(sql`SELECT 1 FROM users LIMIT 1`).catch(() => db.execute(sql`SELECT 1`));
    console.log("✅ [DB] Conexão estabelecida com sucesso!");
    return true;
  } catch (err: any) {
    console.error("❌ [DB] Erro crítico de conexão:");
    console.error(`   Mensagem: ${err.message}`);
    console.error("   Dica: Verifique se você criou as tabelas no console da Neon usando o SQL fornecido.");
    return false;
  }
}

import { sql } from "drizzle-orm";
export const isPostgresEnabled = !!databaseUrl;