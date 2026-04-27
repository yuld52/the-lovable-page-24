
const { Pool } = require('pg');

async function testUSEast2() {
    const databaseUrl = 'postgresql://postgres.dozyujjqsxvxgjsgayia:M1Xq84EXXBXZ7JGP@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

    console.log("🔗 Connecting to US-EAST-2 POOLER...");
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

testUSEast2();
