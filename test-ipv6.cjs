
const { Pool } = require('pg');

async function testIPv6() {
    const databaseUrl = 'postgresql://postgres:M1Xq84EXXBXZ7JGP@[2600:1f1c:f9:4d00:48fc:d4af:f230:5db]:5432/postgres';

    console.log("🔗 Connecting with direct IPv6...");
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

testIPv6();
