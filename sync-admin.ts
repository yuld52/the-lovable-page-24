import { storage } from "./server/storage";
import bcrypt from "bcryptjs";

async function syncAdmin() {
    console.log("Syncing admin user...");
    const adminEmail = "juniornegocios015@gmail.com";
    const existing = await storage.getUserByUsername(adminEmail);

    if (!existing) {
        console.log("Admin not found in local DB. Creating...");
        const hashedPassword = await bcrypt.hash("admin123", 10); // Default password if they weren't in DB
        await storage.createUser({
            username: adminEmail,
            password: hashedPassword
        });
        console.log("Admin created in local DB.");
    } else {
        console.log("Admin already exists in local DB.");
    }
    process.exit(0);
}

syncAdmin().catch(err => {
    console.error(err);
    process.exit(1);
});
