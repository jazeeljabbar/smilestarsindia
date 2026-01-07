import { storage } from "../storage";
import { identityService } from "./identity";
import { authService } from "./auth";
import { sendEmail } from "./email";
import { Entity } from "@shared/schema";

export class OrganizationService {

    async getEntitiesByType(type: string) {
        return await storage.getEntitiesByType(type);
    }

    async getEntityById(id: number) {
        return await storage.getEntityById(id);
    }

    // Orchestrated Franchise Creation
    async createFranchise(actorId: number, entityData: any, contactPerson: string, contactEmail: string) {
        // Create entity in DRAFT
        const franchiseeData = {
            ...entityData,
            type: 'FRANCHISEE' as const,
            parentId: 1, // Root
            status: 'DRAFT',
            metadata: {
                ...entityData.metadata,
                franchiseContactPerson: contactPerson,
                franchiseContactEmail: contactEmail
            }
        };

        const entity = await storage.createEntity(franchiseeData);

        // Create/Find User using Identity Service
        // We can't reuse inviteUser exactly because we need a specific flow (Agreement Token), 
        // but we can reuse parts or just use storage for lower level atomic ops.
        // For now, mirroring routes.ts logic but cleaner

        let primaryContactUser = await storage.getUserByEmail(contactEmail);

        if (!primaryContactUser) {
            primaryContactUser = await storage.createUser({
                email: contactEmail,
                name: contactPerson,
                status: 'PENDING'
            });
        } else {
            // Access is defined by memberships, creating below.
            // No need to update user entityIds as it's not a column.
        }

        // Create Membership
        await storage.createMembership({
            userId: primaryContactUser.id,
            entityId: entity.id,
            role: 'FRANCHISE_ADMIN',
            isPrimary: true,
            validFrom: new Date()
        });

        // Create AGREEMENT Token (Auth concern, but specific to this flow)
        const token = authService.generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const magicToken = await storage.createMagicToken({
            email: contactEmail,
            token: token,
            purpose: 'FRANCHISE_AGREEMENT',
            expiresAt,
            metadata: {
                franchiseeId: entity.id,
                franchiseeName: entity.name,
                userId: primaryContactUser.id
            }
        });

        // Send Email
        const agreementUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/franchise/agreement/${magicToken.token}`;
        const emailHtml = `
      <h2>Welcome to Smile Stars India!</h2>
      <p>Hello ${contactPerson},</p>
      <p>Congratulations! Your franchise application for <strong>${entity.name}</strong> has been created successfully.</p>
      <p>Please click the link below to complete the agreement process:</p>
      <p><a href="${agreementUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Agreements & Activate Franchise</a></p>
    `;

        await sendEmail(contactEmail, 'Welcome to Smile Stars India - Complete Your Franchise Setup', emailHtml);

        return { entity, primaryContactUser };
    }

    // Orchestrated School Creation
    async createSchool(actorId: number, entityData: any, contactPerson: string, contactEmail: string, parentId: number) {
        if (!parentId) throw new Error('Parent ID required');

        // Validate Parent
        const parentEntity = await storage.getEntityById(parentId);
        if (!parentEntity || parentEntity.type !== 'FRANCHISEE') {
            throw new Error('Parent must be a valid franchise');
        }

        // Duplicate Check
        const existingSchools = await storage.getEntitiesByType('SCHOOL');
        const duplicate = existingSchools.find(s => s.name.toLowerCase() === entityData.name.toLowerCase());
        if (duplicate) {
            throw new Error(`School named "${entityData.name}" already exists`);
        }

        const schoolData = {
            ...entityData,
            type: 'SCHOOL' as const,
            parentId,
            status: 'DRAFT',
            metadata: {
                ...entityData.metadata,
                principalName: contactPerson,
                principalEmail: contactEmail
            }
        };

        const entity = await storage.createEntity(schoolData);

        // Create/Find User
        let principalUser = await storage.getUserByEmail(contactEmail);
        if (!principalUser) {
            principalUser = await storage.createUser({
                email: contactEmail,
                name: contactPerson,
                status: 'PENDING'
            });
        }

        await storage.createMembership({
            userId: principalUser.id,
            entityId: entity.id,
            role: 'SCHOOL_ADMIN',
            isPrimary: true,
            validFrom: new Date()
        });

        // Create AGREEMENT Token
        const token = authService.generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const magicToken = await storage.createMagicToken({
            email: contactEmail,
            token: token,
            purpose: 'SCHOOL_AGREEMENT',
            expiresAt,
            metadata: {
                schoolId: entity.id,
                schoolName: entity.name,
                userId: principalUser.id
            }
        });

        const agreementUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/school/agreement/${magicToken.token}`;
        const emailHtml = `
      <h2>Welcome to Smile Stars India School Program!</h2>
      <p>Hello ${contactPerson},</p>
      <p>Your school <strong>${entity.name}</strong> has been enrolled.</p>
      <p><a href="${agreementUrl}">Accept Agreements & Activate School</a></p>
    `;

        await sendEmail(contactEmail, 'Welcome to Smile Stars India - Complete Your Setup', emailHtml);
        return { entity, principalUser };
    }

    async updateEntity(actorId: number, id: number, updates: any) {
        return await storage.updateEntity(id, updates);
    }

    async deleteFranchise(actorId: number, id: number) {
        const schools = await storage.getEntitiesByParent(id);
        if (schools.length > 0) throw new Error(`Cannot delete franchise. Has ${schools.length} schools.`);

        // Get all memberships for this entity to find associated users
        const memberships = await storage.getMembershipsByEntity(id);
        const associatedUserIds = memberships.map(m => m.userId);

        // Delete all memberships for this entity
        for (const m of memberships) await storage.deleteMembership(m.id);

        // For each user, check if they have other memberships. If not, delete user.
        for (const userId of associatedUserIds) {
            const userMemberships = await storage.getMembershipsByUser(userId);
            if (userMemberships.length === 0) {
                await storage.deleteUser(userId);
            }
        }

        await storage.deleteEntity(id);
    }

    async deleteSchool(actorId: number, id: number) {
        const students = await storage.getEntitiesByParent(id);
        if (students.length > 0) throw new Error(`Cannot delete school. Has ${students.length} students.`);

        // Get all memberships for this entity to find associated users
        const memberships = await storage.getMembershipsByEntity(id);
        const associatedUserIds = memberships.map(m => m.userId);

        // Delete all memberships for this entity
        for (const m of memberships) await storage.deleteMembership(m.id);

        // For each user, check if they have other memberships. If not, delete user.
        for (const userId of associatedUserIds) {
            const userMemberships = await storage.getMembershipsByUser(userId);
            if (userMemberships.length === 0) {
                await storage.deleteUser(userId);
            }
        }

        await storage.deleteEntity(id);
    }
}

export const organizationService = new OrganizationService();
