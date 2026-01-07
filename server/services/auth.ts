import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { MediaType } from "express";
import { sendEmail } from "./email";
import { User, MagicToken } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dental-care-secret-key";

export class AuthService {
    // Generate magic link token
    generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    // Generate magic link URL
    generateMagicLink(token: string): string {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        return `${baseUrl}/auth/magic-link?token=${token}`;
    }

    // Request magic link
    async requestMagicLink(email: string): Promise<void> {
        const user = await storage.getUserByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await storage.createMagicToken({
            token,
            email,
            expiresAt,
            purpose: 'LOGIN'
        });

        const magicLink = this.generateMagicLink(token);
        const emailHtml = `
      <h2>Login to Smile Stars India</h2>
      <p>Hello ${user.name},</p>
      <p>Click the link below to log in to your account:</p>
      <a href="${magicLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Login to Account</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this login, please ignore this email.</p>
    `;

        await sendEmail(email, 'Login to Smile Stars India', emailHtml);
    }

    // Consume magic link
    async consumeMagicLink(token: string): Promise<{ token: string, user: any, requiresAgreements: boolean, pendingAgreements: any[], tokenType?: string, franchisee?: any }> {
        const magicToken = await storage.getMagicTokenByToken(token);

        if (!magicToken) {
            throw new Error('Invalid or expired token');
        }

        if (new Date() > magicToken.expiresAt) {
            throw new Error('Token has expired');
        }

        const user = await storage.getUserByEmail(magicToken.email);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.status === 'SUSPENDED') {
            throw new Error('Account suspended');
        }

        // Handle FRANCHISE_AGREEMENT special flow
        if (magicToken.type === 'FRANCHISE_AGREEMENT') {
            const franchiseeId = magicToken.metadata?.franchiseeId;
            if (!franchiseeId) {
                throw new Error('Invalid franchise agreement token');
            }

            const franchisee = await storage.getEntityById(franchiseeId);
            if (!franchisee) {
                throw new Error('Franchisee not found');
            }

            if (!user.entityIds?.includes(franchiseeId)) {
                throw new Error('Access denied to this franchisee');
            }

            await storage.markMagicTokenUsed(token);

            const memberships = await storage.getMembershipsByUser(user.id);
            const roles = memberships.map(m => m.role);

            const userAgreements = await storage.getAgreementsByRole(roles);
            const franchiseAgreements = await storage.getAgreementsByRole(['FRANCHISE_ADMIN']);

            const allAgreements = [...userAgreements, ...franchiseAgreements];
            const uniqueAgreements = allAgreements.filter((agreement, index, arr) =>
                arr.findIndex(a => a.id === agreement.id) === index
            );

            return {
                token: token, // keep original token
                tokenType: 'FRANCHISE_AGREEMENT',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: (user as any).firstName,
                    lastName: (user as any).lastName,
                    status: user.status
                },
                franchisee: {
                    id: franchisee.id,
                    name: franchisee.name,
                    status: franchisee.status
                },
                requiresAgreements: true,
                pendingAgreements: uniqueAgreements.map(a => ({
                    id: a.id,
                    title: a.title,
                    bodyMd: a.bodyMd
                }))
            };
        }

        // Standard flow
        await storage.markMagicTokenUsed(token);
        const result = await this.generateUserAuthResponse(user);
        return result;
    }

    // Login with password
    async login(email: string, password: string): Promise<any> {
        const user = await storage.getUserByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        if (!user.password) {
            throw new Error('Account not set up for password login. Please use magic link authentication.');
        }

        if (user.status === 'SUSPENDED') {
            throw new Error('Account suspended');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        return await this.generateUserAuthResponse(user);
    }

    // Helper to generate standard auth response
    private async generateUserAuthResponse(user: User) {
        const memberships = await storage.getMembershipsByUser(user.id);
        const roles = memberships.map(m => m.role);
        const entityIds = memberships.map(m => m.entityId);

        let pendingAgreements = [];
        let requiresAgreements = false;

        if (user.status === 'PENDING') {
            const applicableAgreements = await storage.getAgreementsByRole(roles);
            pendingAgreements = applicableAgreements;
            requiresAgreements = true;
        }

        const jwtToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                roles,
                entityIds
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token: jwtToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roles,
                status: user.status
            },
            requiresAgreements,
            pendingAgreements: pendingAgreements.map(a => ({
                id: a.id,
                title: a.title,
                bodyMd: a.bodyMd
            }))
        };
    }
}

export const authService = new AuthService();
