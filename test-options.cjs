
const { Pool } = require('pg');

async function testOptions() {
    const databaseUrl = 'postgresql://postgres:M1Xq84EXXBXZ7JGP@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=endpoint%3Ddozyujjqsxvxgjsgayia';

    console.log("🔗 Connecting with endpoint option...");
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

testOptions();
