import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Forçar o carregamento do .env antes de qualquer outra coisa
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ ERRO: DATABASE_URL não encontrada no ambiente!");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export function ensurePool() {
  console.log("[DB] Conexão PostgreSQL inicializada via Neon");
}

export const isPostgresEnabled = !!databaseUrl;