
const { Pool } = require('pg');

async function testWorking() {
    const databaseUrl = 'postgresql://postgres.dozyujjqsxvxgjsgayia:M1Xq84EXXBXZ7JGP@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

    console.log("🔗 Connecting to 6543...");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const res = await pool.query('SELECT current_database(), current_user');
        console.log("✅ SUCCESS! Connected to:", res.rows[0]);
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

testWorking();
