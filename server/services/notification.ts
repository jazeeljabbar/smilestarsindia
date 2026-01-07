import { EventEmitter } from 'events';
import { sendEmail } from './email';
import { Camp } from '@shared/schema';
import { storage } from '../storage';

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.setupListeners();
    }

    private setupListeners() {
        this.on('CAMP_SCHEDULED', this.handleCampScheduled.bind(this));
        this.on('CONSENT_REQUESTED', this.handleConsentRequested.bind(this));
    }

    /* Event Handlers */

    private async handleCampScheduled(camp: Camp) {
        try {
            console.log(`[Notification] Processing CAMP_SCHEDULED for camp ${camp.id}`);

            // Logic to find recipients (e.g. School Principal)
            // 1. Get School Entity
            const school = await storage.getEntityById(camp.schoolEntityId);
            if (!school) return;

            // 2. We need to find the Principal or School Admin. 
            // Currently, we might rely on the School Metadata or Memberships.
            // For simpler POC, check metadata email.
            const contactEmail = school.metadata?.principalEmail || school.metadata?.schoolContactEmail || school.metadata?.contactEmail;

            if (contactEmail) {
                const subject = `Camp Scheduled: ${camp.name}`;
                const html = `
                <h2>Camp Scheduled</h2>
                <p>Hello,</p>
                <p>A new dental camp <strong>${camp.name}</strong> has been scheduled at your school.</p>
                <p><strong>Dates:</strong> ${new Date(camp.startDate).toLocaleDateString()} - ${new Date(camp.endDate).toLocaleDateString()}</p>
                <p>Please log in to the portal to manage consents.</p>
            `;
                await sendEmail(contactEmail, subject, html);
            }

        } catch (error) {
            console.error('[Notification] Error handling CAMP_SCHEDULED:', error);
        }
    }

    private async handleConsentRequested(payload: { campId: number, studentId: number }) {
        console.log(`[Notification] Consent requested for student ${payload.studentId} in camp ${payload.campId}`);
        // Future: Send email/SMS to parent
    }

    /* Public Trigger Methods */

    public notifyCampScheduled(camp: Camp) {
        this.emit('CAMP_SCHEDULED', camp);
    }

    public notifyConsentRequested(campId: number, studentId: number) {
        this.emit('CONSENT_REQUESTED', { campId, studentId });
    }
}

export const notificationService = new NotificationService();
