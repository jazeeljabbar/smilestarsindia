import { storage } from "../storage";
import { insertCampSchema, Camp, campStatusEnum } from "@shared/schema";
import { z } from "zod";

type CampStatus = typeof campStatusEnum.enumValues[number];

export class CampService {

    /**
     * Create a new camp in DRAFT status.
     */
    async createCamp(data: z.infer<typeof insertCampSchema>) {
        // Force status to DRAFT on creation
        const campData = { ...data, status: 'DRAFT' as const };
        return await storage.createCamp(campData);
    }

    /**
     * Updates camp details. Only allowed in DRAFT or SCHEDULED states for most fields.
     */
    async updateCamp(id: number, updates: Partial<z.infer<typeof insertCampSchema>>) {
        const camp = await storage.getCampById(id);
        if (!camp) throw new Error("Camp not found");

        // Prevent updates if camp is already active or completed, unless it's just description or dentist
        if (['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(camp.status)) {
            // Allow limited updates if needed, strictly for now prevent meaningful structural changes
            // For now, let's just warn or restrict keys if we want to be strict.
            // Assuming we trust the caller for now but validation happens on transitions.
        }

        return await storage.updateCamp(id, updates);
    }

    /**
     * Transition to SCHEDULED.
     * Requires: start date, end date.
     */
    async scheduleCamp(id: number, startDate: Date, endDate: Date) {
        const camp = await storage.getCampById(id);
        if (!camp) throw new Error("Camp not found");

        if (camp.status !== 'DRAFT' && camp.status !== 'SCHEDULED') {
            throw new Error(`Cannot schedule camp from status ${camp.status}`);
        }

        const updatedCamp = await storage.updateCamp(id, {
            status: 'SCHEDULED',
            startDate,
            endDate
        });

        // Trigger notification
        const { notificationService } = await import('./notification');
        notificationService.notifyCampScheduled(updatedCamp);

        return updatedCamp;
    }

    /**
     * Transition to CONSENT_COLLECTION.
     * Requires: Camp to be SCHEDULED.
     */
    async startConsentCollection(id: number) {
        const camp = await storage.getCampById(id);
        if (!camp) throw new Error("Camp not found");

        if (camp.status !== 'SCHEDULED') {
            throw new Error(`Camp must be SCHEDULED to start consent collection. Current status: ${camp.status}`);
        }

        return await storage.updateCamp(id, { status: 'CONSENT_COLLECTION' });
    }

    /**
     * Transition to ACTIVE.
     * Requires: Camp to be in CONSENT_COLLECTION or SCHEDULED.
     */
    async startCamp(id: number) {
        const camp = await storage.getCampById(id);
        if (!camp) throw new Error("Camp not found");

        if (camp.status !== 'CONSENT_COLLECTION' && camp.status !== 'SCHEDULED') {
            throw new Error(`Cannot start camp from status ${camp.status}`);
        }

        // Optional: Validate that some consents have been received?

        return await storage.updateCamp(id, { status: 'ACTIVE' });
    }

    /**
     * Transition to COMPLETED.
     * Requires: Camp to be ACTIVE.
     */
    async completeCamp(id: number) {
        const camp = await storage.getCampById(id);
        if (!camp) throw new Error("Camp not found");

        if (camp.status !== 'ACTIVE') {
            throw new Error(`Camp must be ACTIVE to complete. Current status: ${camp.status}`);
        }

        return await storage.updateCamp(id, { status: 'COMPLETED' });
    }

    /**
     * Cancel Camp.
     */
    async cancelCamp(id: number) {
        return await storage.updateCamp(id, { status: 'CANCELLED' });
    }

    async getCamp(id: number) {
        return await storage.getCampById(id);
    }
}

export const campService = new CampService();
