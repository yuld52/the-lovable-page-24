
const { Pool } = require('pg');

async function testConnection() {
    const databaseUrl = 'postgresql://postgres:M1Xq84EXXBXZ7JGP@db.dozyujjqsxvxgjsgayia.supabase.co:5432/postgres';

    console.log("🔗 Connecting to database...");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT current_database(), current_user');
        console.log("✅ Connected to:", res.rows[0]);

        const products = await pool.query('SELECT COUNT(*) FROM products');
        console.log("📦 Total Products:", products.rows[0].count);

        const checkouts = await pool.query('SELECT COUNT(*) FROM checkouts');
        console.log("🛒 Total Checkouts:", checkouts.rows[0].count);

        const checkoutsNoOwner = await pool.query('SELECT COUNT(*) FROM checkouts WHERE owner_id IS NULL');
        console.log("⚠️  Checkouts without owner:", checkoutsNoOwner.rows[0].count);

        const paypal = await pool.query('SELECT COUNT(*) FROM settings WHERE paypal_client_id IS NOT NULL');
        console.log("💳 PayPal Configs found:", paypal.rows[0].count);

        console.log("\n🚀 All systems seem healthy!");
    } catch (err) {
        console.error("❌ Database error:", err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
