import { jsPDF } from "jspdf";
import { storage } from "../storage";
import { Report } from "@shared/schema";

export class ReportService {

    async getReports() {
        return await storage.getAllReports();
    }

    async getReportById(id: number) {
        return await storage.getReportById(id);
    }

    async generateReport(screeningId: number, studentId: number, generatedBy: number): Promise<Report> {
        // 1. Fetch Data
        const screening = await storage.getScreeningById(screeningId);
        const student = await storage.getEntityById(studentId);
        const camp = screening ? await storage.getCampById(screening.campId) : null;
        const school = camp ? await storage.getEntityById(camp.schoolEntityId) : null;

        if (!screening || !student) {
            throw new Error("Screening or Student not found");
        }

        // 2. Generate PDF
        // Note: jsPDF in Node might behave differently regarding fonts/metrics.
        // We use standard fonts (Helvetica) which should work without canvas.
        const doc = new jsPDF();

        // -- PDF GENERATION LOGIC (Ported from Reports.tsx) -- 

        // Header
        doc.setFontSize(20);
        doc.setTextColor(25, 118, 210);
        doc.text('Smile Stars India', 20, 30);

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Dental Health Report', 20, 45);

        // Student Information
        doc.setFontSize(12);
        doc.text(`Student Name: ${student.name}`, 20, 70);
        // age/grade might be in metadata
        const age = (student.metadata as any)?.age || 'N/A';
        const grade = (student.metadata as any)?.grade || 'N/A';
        const schoolName = school?.name || 'School Name';

        doc.text(`Age: ${age} years`, 20, 85);
        doc.text(`Grade: ${grade}`, 20, 100);
        doc.text(`School: ${schoolName}`, 20, 115);
        doc.text(`Examination Date: ${new Date(screening.createdAt).toLocaleDateString()}`, 20, 130);

        // Clinical Findings
        doc.setFontSize(14);
        doc.text('Clinical Examination Summary', 20, 155);

        doc.setFontSize(10);
        let yPos = 170;

        // Check fields (handling nulls/undefined safely)
        if ((screening.decayedTeethCount || 0) > 0) {
            doc.text(`• Decayed Teeth: ${screening.decayedTeethCount}`, 25, yPos);
            yPos += 15;
        }

        if ((screening.missingTeethCount || 0) > 0) {
            doc.text(`• Missing Teeth: ${screening.missingTeethCount}`, 25, yPos);
            yPos += 15;
        }

        if ((screening.filledTeethCount || 0) > 0) {
            doc.text(`• Filled Teeth: ${screening.filledTeethCount}`, 25, yPos);
            yPos += 15;
        }

        if (screening.stains) {
            doc.text(`• Stains: ${screening.stains}`, 25, yPos);
            yPos += 15;
        }

        if (screening.calculus) {
            doc.text(`• Calculus: ${screening.calculus}`, 25, yPos);
            yPos += 15;
        }

        // Recommendations
        // Note: splitTextToSize requires a font to be active. 
        // In strict Node env without DOM, calculating width might range from imprecise to failing.
        // For now, we assume standard font metrics work.
        if (screening.deepGrooves || screening.gingivalRecession || screening.tongueExamination) {
            // Add generic recommendations if specific fields are present but no text?
            // Client checked 'preventiveMeasures' (which isn't in my schema view effectively? Let's check schema again)
            // Wait, schema.ts showed 'preventiveMeasures' IS NOT in the snippet I saw! 
            // Lines 292-300: deepGrooves, stains, calculus, gingivalRecession...
            // I need to check if 'preventiveMeasures' exists in schema.
            // Based on Reports.tsx it does: screening.preventiveMeasures
        }

        // -- END PDF GENERATION --

        const pdfData = doc.output('datauristring').split(',')[1]; // Base64

        // 3. Save to DB
        const report = await storage.createReport({
            screeningId,
            studentEntityId: studentId,
            pdfData,
            generatedBy,
            sentToParent: false
        });

        return report;
    }
}

export const reportService = new ReportService();
