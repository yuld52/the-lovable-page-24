
const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("❌ DATABASE_URL not found in .env");
        process.exit(1);
    }

    console.log("🔗 Connecting to database...");
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT current_database(), current_user');
        console.log("✅ Connected to:", res.rows[0]);

        const products = await pool.query('SELECT COUNT(*) FROM products');
        console.log("📦 Total Products in DB:", products.rows[0].count);

        const checkouts = await pool.query('SELECT COUNT(*) FROM checkouts');
        console.log("🛒 Total Checkouts in DB:", checkouts.rows[0].count);

        const settings = await pool.query('SELECT COUNT(*) FROM settings');
        console.log("⚙️  Total Settings rows:", settings.rows[0].count);

        console.log("\n🚀 All systems seem healthy from the database perspective!");
    } catch (err) {
        console.error("❌ Database connection error:", err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
