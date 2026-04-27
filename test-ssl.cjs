
const { Pool } = require('pg');

async function test6543() {
    const databaseUrl = 'postgresql://postgres.dozyujjqsxvxgjsgayia:M1Xq84EXXBXZ7JGP@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require';

    console.log("🔗 Connecting to 6543 with sslmode=require...");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT 1');
        console.log("✅ OK!");
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

test6543();
