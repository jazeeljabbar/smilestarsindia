
import "dotenv/config";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";
import { authService } from "../server/services/auth";

async function createCredentials() {
    console.log("🔑 Creating Test Credentials...");

    try {
        const email = `test.admin.${Date.now()}@smilestars.example.com`;

        // Create User
        const user = await storage.createUser({
            email: email,
            name: "Test Admin",
            status: 'ACTIVE'
        });

        // Add Role/Membership
        // For simplicity, let's make them a SYSTEM_ADMIN to see everything, OR SCHOOL_ADMIN
        // Let's do SYSTEM_ADMIN to verify robustly.
        await storage.createMembership({
            userId: user.id,
            entityId: 1, // Assuming Root Org exists, else we might fail. Use createEntity if needed.
            role: 'SYSTEM_ADMIN',
            isPrimary: true,
            validFrom: new Date()
        });

        // Generate Magic Link (simulating login)
        // In real app, we email it. Here we just print it.
        const token = authService.generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await storage.createMagicToken({
            email,
            token,
            purpose: 'LOGIN',
            expiresAt
        });

        const magicLink = `http://localhost:3000/auth/magic-link?token=${token}`;

        console.log("\n✅ Test User Created:");
        console.log(`Email: ${email}`);
        console.log(`Magic Link: ${magicLink}`);

    } catch (error) {
        console.error("❌ Credential Creation Failed:", error);
        process.exit(1);
    }
}

createCredentials();
