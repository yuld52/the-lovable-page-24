import { storage } from "./server/storage";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value;
        }
    });
}

async function checkUsers() {
    console.log("Checking users in database...");
    const users = await storage.getUsers();
    console.log("Users in Local DB:", users.map(u => u.username));

    const sbUrl = process.env.SUPABASE_URL || "https://dozyujjqsxvxgjsgayia.supabase.co";
    const sbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (sbServiceKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseAdmin = createClient(sbUrl, sbServiceKey);
        const { data: { users: sbUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) {
            console.error("Supabase error:", error);
        } else {
            console.log("Users in Supabase:", sbUsers.map(u => u.email));
        }
    } else {
        console.warn("SUPABASE_SERVICE_ROLE_KEY not found in env");
    }
}

checkUsers().catch(console.error);
