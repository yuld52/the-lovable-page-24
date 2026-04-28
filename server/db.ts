import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configuração para o driver Neon serverless
neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta carregar do .env se existir (útil para desenvolvimento local)
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("⚠️ ALERTA: DATABASE_URL não encontrada! O sistema usará armazenamento temporário (MemoryStorage).");
} else {
  console.log("✅ DATABASE_URL detectada. Tentando conectar ao Neon...");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export function ensurePool() {
  if (databaseUrl) {
    console.log("[DB] Pool de conexões PostgreSQL pronto.");
  }
}

export const isPostgresEnabled = !!databaseUrl;