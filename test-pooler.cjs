
const { Pool } = require('pg');

async function testPooler() {
    // Using the pooler URL format with project ref in the username
    const databaseUrl = 'postgresql://postgres.dozyujjqsxvxgjsgayia:M1Xq84EXXBXZ7JGP@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

    console.log("🔗 Connecting to POOLER...");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT current_database(), current_user');
        console.log("✅ Joined Pooler! Connected to:", res.rows[0]);

        const products = await pool.query('SELECT COUNT(*) FROM products');
        console.log("📦 Total Products:", products.rows[0].count);

        console.log("\n🚀 Pooler is working!");
    } catch (err) {
        console.error("❌ Pooler error:", err.message);
    } finally {
        await pool.end();
    }
}

testPooler();
