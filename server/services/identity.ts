import crypto from "crypto";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { sendEmail } from "./email";
import { User, InsertUser } from "@shared/schema";

export class IdentityService {
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private generateMagicLink(token: string): string {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        return `${baseUrl}/auth/magic-link?token=${token}`;
    }

    async getAllUsers() {
        return await storage.getAllUsers();
    }

    async getUserById(id: number) {
        return await storage.getUserById(id);
    }

    async inviteUser(actorId: number, email: string, name: string, targetEntityId: number, role: string) {
        // Check if user already exists
        let user = await storage.getUserByEmail(email);

        if (!user) {
            // Create new user
            user = await storage.createUser({
                name,
                email,
                status: 'INVITED'
            });
        }

        // Create membership
        await storage.createMembership({
            userId: user.id,
            entityId: targetEntityId,
            role: role as any,
            isPrimary: true,
            validFrom: new Date()
        });

        // Generate magic token for invitation
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        await storage.createMagicToken({
            token,
            email,
            expiresAt,
            purpose: 'INVITE',
            metadata: {
                targetEntityId,
                targetRole: role,
                invitedBy: actorId
            }
        });

        // Send invitation email
        const magicLink = this.generateMagicLink(token);
        const emailHtml = `
      <h2>Welcome to Smile Stars India</h2>
      <p>Hello ${name},</p>
      <p>You have been invited to join Smile Stars India as a ${role}.</p>
      <p>Click the link below to set up your account:</p>
      <a href="${magicLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Set Up Account</a>
      <p>This invitation will expire in 48 hours.</p>
    `;

        await sendEmail(email, 'Welcome to Smile Stars India', emailHtml);

        return user;
    }

    async updateUser(actorId: number, userId: number, updates: any) {
        const existingUser = await storage.getUserById(userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        if (updates.username !== undefined) {
            throw new Error('Username cannot be updated');
        }

        const { roles, franchiseeId, schoolId, password, ...userFields } = updates;
        const userUpdates: any = { ...userFields };

        // Handle email uniqueness
        if (userUpdates.email && userUpdates.email !== existingUser.email) {
            const existingEmailUser = await storage.getUserByEmail(userUpdates.email);
            if (existingEmailUser && existingEmailUser.id !== userId) {
                throw new Error('Email already exists');
            }
        }

        // Hash password
        if (password && password.trim()) {
            userUpdates.password = await bcrypt.hash(password.trim(), 10);
        }

        const updatedUser = await storage.updateUser(userId, userUpdates);

        // Update memberships
        if (roles && roles.length > 0) {
            await storage.deleteMembershipsByUser(userId);

            for (const role of roles) {
                let entityId = 1; // Default
                if (role === 'FRANCHISE_ADMIN' && franchiseeId) entityId = franchiseeId;
                else if (['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'].includes(role) && schoolId) entityId = schoolId;

                await storage.createMembership({
                    userId: userId,
                    entityId: entityId,
                    role: role as any,
                    isPrimary: true,
                    validFrom: new Date(),
                });
            }
        }

        return updatedUser;
    }

    async updateUserStatus(actorId: number, userId: number, status: string) {
        if (actorId === userId && status === 'SUSPENDED') {
            throw new Error('Cannot suspend yourself');
        }
        return await storage.updateUser(userId, { status: status as any });
    }

    async deleteUser(actorId: number, userId: number) {
        if (actorId === userId) {
            throw new Error('Cannot delete yourself');
        }

        const user = await storage.getUserById(userId);
        if (!user) throw new Error('User not found');

        await storage.deleteMembershipsByUser(userId);
        await storage.deleteUser(userId);
    }
}

export const identityService = new IdentityService();
