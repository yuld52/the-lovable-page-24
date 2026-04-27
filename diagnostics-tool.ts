import { storage } from "./server/storage";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { createClient } from "@supabase/supabase-js";

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

async function runDiagnostics() {
    const adminEmail = "juniornegocios015@gmail.com";
    const results = {
        env: {
            hasDbUrl: !!process.env.DATABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        localDb: [] as string[],
        supabase: [] as string[],
        error: null as any
    };

    try {
        const localUsers = await storage.getUsers();
        results.localDb = localUsers.map(u => u.username);

        const sbUrl = process.env.SUPABASE_URL || "https://dozyujjqsxvxgjsgayia.supabase.co";
        const sbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (sbServiceKey) {
            const supabaseAdmin = createClient(sbUrl, sbServiceKey);
            const { data: { users: sbUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
            if (error) results.error = error;
            else results.supabase = sbUsers.map(u => u.email || 'no-email');
        }
    } catch (err) {
        results.error = err;
    }

    fs.writeFileSync('diagnostics.json', JSON.stringify(results, null, 2));
    console.log("Diagnostics written to diagnostics.json");
}

runDiagnostics();
