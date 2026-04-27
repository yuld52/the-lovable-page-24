
const { Pool } = require('pg');

async function testFinalPooler() {
    const databaseUrl = 'postgresql://postgres.dozyujjqsxvxgjsgayia:M1Xq84EXXBXZ7JGP@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

    console.log("🔗 Connecting to POOLER on 5432...");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT 1');
        console.log("✅ SUCCESS!");
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

testFinalPooler();
