import { storage } from "../storage";
import { insertConsentSchema } from "@shared/schema";
import { z } from "zod";

export class ConsentService {

    /**
     * Request consent for a student to participate in a camp.
     * Creates a consent record in REQUESTED status.
     */
    async requestConsent(campId: number, studentEntityId: number, ipAddress?: string, userAgent?: string) {
        // 1. Verify Camp exists and is in CONSENT_COLLECTION state
        const camp = await storage.getCampById(campId);
        if (!camp) throw new Error("Camp not found");
        if (camp.status !== 'CONSENT_COLLECTION' && camp.status !== 'SCHEDULED') {
            throw new Error("Camp is not accepting consents at this time");
        }

        // 2. Check if student exists
        const student = await storage.getEntityById(studentEntityId);
        if (!student || student.type !== 'STUDENT') throw new Error("Student not found");

        // 3. Create or Update Consent record
        // Check if consent already exists
        const existing = await storage.getConsentByCampAndStudent(campId, studentEntityId);

        if (existing) {
            // If already exists, we might just return it, or update if it was previously revoked?
            // For now, return existing.
            return existing;
        }

        const consent = await storage.createConsent({
            campId,
            studentEntityId,
            status: 'REQUESTED',
            ipAddress,
            userAgent
        });

        return consent;
    }

    /**
     * Grant consent for a student.
     * Updates status to GRANTED.
     */
    async grantConsent(consentId: number, ipAddress?: string, userAgent?: string) {
        const consent = await storage.getConsentById(consentId);
        if (!consent) throw new Error("Consent record not found");

        if (consent.status === 'GRANTED') return consent; // Already granted

        const updated = await storage.updateConsent(consentId, {
            status: 'GRANTED',
            grantedAt: new Date(),
            deniedAt: null,
            denialReason: null,
            ipAddress,
            userAgent
        });

        return updated;
    }

    /**
     * Deny consent for a student.
     * Updates status to DENIED.
     */
    async denyConsent(consentId: number, reason: string, ipAddress?: string, userAgent?: string) {
        const consent = await storage.getConsentById(consentId);
        if (!consent) throw new Error("Consent record not found");

        const updated = await storage.updateConsent(consentId, {
            status: 'DENIED',
            deniedAt: new Date(),
            denialReason: reason,
            grantedAt: null,
            ipAddress,
            userAgent
        });

        return updated;
    }

    /**
     * Get consent status for a student in a camp.
     */
    async getConsentStatus(campId: number, studentEntityId: number) {
        return await storage.getConsentByCampAndStudent(campId, studentEntityId);
    }
}

export const consentService = new ConsentService();
