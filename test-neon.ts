import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ No database URL found");
  process.exit(1);
}

console.log("🔗 Tentando conectar ao Neon...");
console.log("URL:", databaseUrl.substring(0, 50) + "...");

const sql = neon(databaseUrl);

(async () => {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log("✅ Neon conectado com sucesso!");
    console.log("Resultado:", result);
    
    // Try to get tables
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("📊 Tabelas encontradas:", tables.map(t => t.table_name).join(", "));
  } catch (error) {
    console.error("❌ Erro ao conectar:", (error as any).message);
  }
})();
