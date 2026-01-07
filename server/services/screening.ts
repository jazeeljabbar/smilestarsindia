import { storage } from "../storage";
import { insertScreeningSchema, Screening } from "@shared/schema";
import { z } from "zod";

export class ScreeningService {

    /**
     * Get all screenings (filtered by role permissions ideally, but basic fetch for now).
     */
    async getAllScreenings() {
        return await storage.getAllScreenings();
    }

    /**
     * Create a new screening record.
     * Ensures the student exists and is enrolled in a camp? (Validation logic can be added here)
     */
    async createScreening(data: z.infer<typeof insertScreeningSchema> & { dentistUserId: number }) {
        // 1. Validate Student Exists
        const student = await storage.getEntityById(data.studentEntityId);
        if (!student || student.type !== 'STUDENT') {
            throw new Error("Invalid student ID");
        }

        // 2. Validate Camp matches Student's camp? 
        // The schema has campId, ensure it matches student.campId if applicable, 
        // or arguably the screening is TIED to the camp the student is in.

        // 3. Create Screening
        return await storage.createScreening(data);
    }

    /**
     * Get screenings by camp.
     */
    async getScreeningsByCamp(campId: number) {
        return await storage.getScreeningsByCamp(campId);
    }

    /**
   * Get screenings by student.
   */
    async getScreeningsByStudent(studentId: number) {
        return await storage.getScreeningsByStudentEntity(studentId);
    }
}

export const screeningService = new ScreeningService();
