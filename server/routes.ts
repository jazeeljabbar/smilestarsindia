import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from 'nodemailer';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { storage } from "./storage";
import {
  magicLinkRequestSchema, magicLinkConsumeSchema, acceptAgreementsSchema,
  createUserSchema, createMembershipSchema, inviteUserSchema,
  insertEntitySchema, insertCampSchema, insertScreeningSchema, insertReportSchema,
  User, Entity, Membership, InsertParentStudentLink, InsertAuditLog
} from "@shared/schema";
import { authService } from "./services/auth";
import { identityService } from "./services/identity";
import { organizationService } from "./services/organization";
import { campService } from "./services/camp";
import { consentService } from "./services/consent";
import { screeningService } from "./services/screening";
import { reportService } from "./services/report";
import { contentService } from "./services/content";
import { sendEmail } from "./services/email";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    roles: string[];
    entityIds: number[];
  };
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dental-care-secret-key";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter called:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/octet-stream' // Sometimes Excel files come as this
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (allowedTypes.includes(file.mimetype) || hasValidExtension) {
      cb(null, true);
    } else {
      console.log('File rejected:', file.mimetype, file.originalname);
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

// Gmail Email setup
let mailTransporter: nodemailer.Transporter | null = null;

// Initialize Gmail transporter
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // admin@smilestarsindia.com
      pass: process.env.GMAIL_APP_PASSWORD, // Gmail app password
    },
  });
}

// Email sending function (temporarily disabled)
// Email sending function
// Imports handled above, removing local definition and helpers
// Generate magic link token handled by AuthService


// Generate magic link URL
router.post('/auth/magic-link/request', async (req: Request, res: Response) => {
  try {
    const { email } = magicLinkRequestSchema.parse(req.body);
    await authService.requestMagicLink(email);
    res.json({ message: 'If an account exists with this email, a login link has been sent.' });
  } catch (error) {
    if (error.message === 'User not found') {
      res.json({ message: 'If an account exists with this email, a login link has been sent.' });
    } else {
      console.error('Magic link request error:', error);
      res.status(500).json({ error: 'Failed to request magic link' });
    }
  }
});

router.post('/auth/magic-link/consume', async (req: Request, res: Response) => {
  try {
    const { token } = magicLinkConsumeSchema.parse(req.body);
    const result = await authService.consumeMagicLink(token);
    res.json(result);
  } catch (error) {
    console.error('Magic link consume error:', error);
    res.status(401).json({ error: error.message || 'Invalid or expired token' });
  }
});
router.get('/entities/:type', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;
    const validTypes = ['ORGANIZATION', 'FRANCHISEE', 'SCHOOL', 'STUDENT'];

    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entities = await storage.getEntitiesByType(type.toUpperCase() as any);
    res.json(entities);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Get franchisees for admin dropdown
router.get('/franchisees/list', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchisees = await storage.getEntitiesByType('FRANCHISEE');
    res.json(franchisees);
  } catch (error) {
    console.error('Get franchisees error:', error);
    res.status(500).json({ error: 'Failed to get franchisees' });
  }
});

// Get schools for dropdown (filtered by user role)
router.get('/schools/list', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { franchiseeId } = req.query;
    let schools = await storage.getEntitiesByType('SCHOOL');

    // Filter schools based on user role and context
    if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
      // Admin can see all schools, optionally filtered by franchisee
      if (franchiseeId) {
        schools = schools.filter(school => school.parentId === parseInt(franchiseeId as string));
      }
    } else if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      // Franchise admin can only see schools under their franchisee
      const userMemberships = await storage.getMembershipsByUser(req.user!.id);
      const franchiseeMembership = userMemberships.find(m => m.role === 'FRANCHISE_ADMIN');
      if (franchiseeMembership) {
        schools = schools.filter(school => school.parentId === franchiseeMembership.entityId);
      } else {
        schools = [];
      }
    } else if (req.user!.roles.includes('SCHOOL_ADMIN')) {
      // School admin can only see their assigned school
      const userMemberships = await storage.getMembershipsByUser(req.user!.id);
      const schoolMembership = userMemberships.find(m => m.role === 'SCHOOL_ADMIN');
      if (schoolMembership) {
        schools = schools.filter(school => school.id === schoolMembership.entityId);
      } else {
        schools = [];
      }
    } else {
      schools = [];
    }

    res.json(schools);
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// Get schools by franchisee
router.get('/franchisees/:franchiseeId/schools', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchiseeId = parseInt(req.params.franchiseeId);
    const schools = await storage.getSchoolsByFranchisee(franchiseeId);
    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Get students by school
router.get('/schools/:schoolId/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const students = await storage.getStudentsBySchool(schoolId);
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Enhanced student registration with multiple parents
router.post('/students/register', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'DENTIST', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, age, gender, grade, rollNumber, schoolId, parents } = req.body;

    // Validation
    if (!name || !age || !gender || !grade || !rollNumber || !schoolId || !parents || !Array.isArray(parents) || parents.length === 0) {
      return res.status(400).json({ error: 'Missing required fields or invalid parent data' });
    }

    // Verify school exists and user has permission to register students there
    const school = await storage.getEntityById(schoolId);
    if (!school || school.type !== 'SCHOOL') {
      return res.status(400).json({ error: 'Invalid school selected' });
    }

    // Check permissions based on user role
    const userMemberships = await storage.getMembershipsByUser(req.user!.id);

    if (req.user!.roles.includes('SCHOOL_ADMIN')) {
      // School admin can only register for their assigned school
      const schoolMembership = userMemberships.find(m => m.role === 'SCHOOL_ADMIN');
      if (!schoolMembership || schoolMembership.entityId !== schoolId) {
        return res.status(403).json({ error: 'You can only register students for your assigned school' });
      }
    } else if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      // Franchise admin can only register for schools under their franchisee
      const franchiseeMembership = userMemberships.find(m => m.role === 'FRANCHISE_ADMIN');
      if (!franchiseeMembership || school.parentId !== franchiseeMembership.entityId) {
        return res.status(403).json({ error: 'You can only register students for schools under your franchisee' });
      }
    }
    // System admin and org admin can register for any school (no additional checks needed)

    // Check for duplicate student (same name + school combination)
    const existingStudents = await storage.getStudentsBySchool(schoolId);
    const duplicateStudent = existingStudents.find(student =>
      student.name.toLowerCase() === name.toLowerCase() ||
      (student.metadata?.rollNumber && student.metadata.rollNumber === rollNumber)
    );

    if (duplicateStudent) {
      return res.status(400).json({
        error: 'Student already exists',
        message: `A student with the same name or roll number already exists in this school.`
      });
    }

    // Create student entity
    const studentData = {
      type: 'STUDENT' as const,
      name,
      status: 'ACTIVE' as const,
      parentId: schoolId, // Students belong to schools
      metadata: {
        age,
        gender,
        grade,
        rollNumber,
      }
    };

    const student = await storage.createEntity(studentData);

    // Process each parent - create users and relationships
    const parentUsers = [];
    for (const parentData of parents) {
      const { name: parentName, email, phone, occupation, relationship, hasCustody, canPickup, emergencyContact, medicalDecisions } = parentData;

      // Check if parent user already exists
      let parentUser = await storage.getUserByEmail(email);

      if (!parentUser) {
        // Create new parent user
        const userData = {
          email,
          name: parentName,
          phone,
          status: 'ACTIVE' as const
        };

        parentUser = await storage.createUser(userData);

        // Create membership with PARENT role
        await storage.createMembership({
          userId: parentUser.id,
          entityId: schoolId, // Parents are associated with the school
          role: 'PARENT',
          isPrimary: false
        });
      }

      // Create parent-student relationship
      await storage.createParentStudentLink({
        parentUserId: parentUser.id,
        studentEntityId: student.id,
        relationship,
        custodyFlags: {
          hasCustody: hasCustody || false,
          canPickup: canPickup || false,
          emergencyContact: emergencyContact || false,
          medicalDecisions: medicalDecisions || false,
        }
      });

      parentUsers.push({
        id: parentUser.id,
        name: parentUser.name,
        email: parentUser.email,
        relationship
      });
    }

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_STUDENT',
      entityId: student.id,
      metadata: {
        studentName: student.name,
        schoolId,
        parentCount: parents.length
      }
    });

    res.json({
      student,
      parents: parentUsers,
      message: `Student ${name} registered successfully with ${parents.length} parent(s).`
    });

  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Failed to register student' });
  }
});

// Archive student
router.post('/students/:id/archive', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await storage.getEntityById(studentId);

    if (!student || student.type !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Permission check
    // userMemberships check logic similar to register/upload...
    const userMemberships = await storage.getMembershipsByUser(req.user!.id);

    if (req.user!.roles.includes('SCHOOL_ADMIN')) {
      const schoolMembership = userMemberships.find(m => m.role === 'SCHOOL_ADMIN');
      if (!schoolMembership || schoolMembership.entityId !== student.parentId) {
        return res.status(403).json({ error: 'You can only archive students from your assigned school' });
      }
    } else if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      const franchiseeMembership = userMemberships.find(m => m.role === 'FRANCHISE_ADMIN');
      // Need to check if student's school belongs to this franchisee. 
      // This might be expensive to query every time, but necessary for security.
      const school = await storage.getEntityById(student.parentId!);
      if (!franchiseeMembership || !school || school.parentId !== franchiseeMembership.entityId) {
        return res.status(403).json({ error: 'You can only archive students from schools under your franchisee' });
      }
    }

    await storage.archiveStudent(studentId);

    // Log action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'ARCHIVE_STUDENT',
      entityId: studentId,
      metadata: { studentName: student.name, previousSchoolId: student.parentId }
    });

    res.json({ message: 'Student archived successfully' });
  } catch (error) {
    console.error('Archive student error:', error);
    res.status(500).json({ error: 'Failed to archive student' });
  }
});

// Move student to another school
router.post('/students/:id/move', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = parseInt(req.params.id);
    const { targetSchoolId } = req.body;

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'Target school ID is required' });
    }

    const student = await storage.getEntityById(studentId);
    if (!student || student.type !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const targetSchool = await storage.getEntityById(targetSchoolId);
    if (!targetSchool || targetSchool.type !== 'SCHOOL') {
      return res.status(400).json({ error: 'Invalid target school' });
    }

    // Permission check: User must have access to BOTH source and target schools? 
    // Usually moving implies admin level control.
    // Let's enforce that Franchise Admin can only move within their Franchisee.
    const userMemberships = await storage.getMembershipsByUser(req.user!.id);

    if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      const franchiseeMembership = userMemberships.find(m => m.role === 'FRANCHISE_ADMIN');

      const sourceSchool = await storage.getEntityById(student.parentId!);

      if (!franchiseeMembership ||
        !sourceSchool || sourceSchool.parentId !== franchiseeMembership.entityId ||
        targetSchool.parentId !== franchiseeMembership.entityId) {
        return res.status(403).json({ error: 'You can only move students between schools within your franchisee' });
      }
    }

    await storage.moveStudent(studentId, targetSchoolId);

    // Log action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'MOVE_STUDENT',
      entityId: studentId,
      metadata: {
        studentName: student.name,
        fromSchoolId: student.parentId,
        toSchoolId: targetSchoolId
      }
    });

    res.json({ message: 'Student moved successfully' });
  } catch (error) {
    console.error('Move student error:', error);
    res.status(500).json({ error: 'Failed to move student' });
  }
});

// Delete student
router.delete('/students/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await storage.getEntityById(studentId);

    if (!student || student.type !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Only System Admin or Org Admin can hard delete
    // Already enforced by requireRole middleware above

    await storage.deleteStudent(studentId);

    // Log action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'DELETE_STUDENT',
      entityId: studentId, // Note: entity itself is gone, but ID remains in log
      metadata: { studentName: student.name, deletedAt: new Date() }
    });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Download student template Excel file
router.get('/students/template', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Create role-specific template data
    const baseStudentData = {
      'Student Name': 'John Doe',
      'Age': 12,
      'Gender': 'MALE',
      'Grade': '7th Grade',
      'Roll Number': 'ST001',
    };

    const parentData = {
      'Parent 1 Name': 'Jane Doe',
      'Parent 1 Email': 'jane@example.com',
      'Parent 1 Phone': '+91-9876543210',
      'Parent 1 Relationship': 'MOTHER',
      'Parent 1 Occupation': 'Doctor',
      'Parent 1 Has Custody': 'TRUE',
      'Parent 1 Can Pickup': 'TRUE',
      'Parent 1 Emergency Contact': 'TRUE',
      'Parent 1 Medical Decisions': 'TRUE',
      'Parent 2 Name': 'John Doe Sr',
      'Parent 2 Email': 'john@example.com',
      'Parent 2 Phone': '+91-9876543211',
      'Parent 2 Relationship': 'FATHER',
      'Parent 2 Occupation': 'Engineer',
      'Parent 2 Has Custody': 'TRUE',
      'Parent 2 Can Pickup': 'TRUE',
      'Parent 2 Emergency Contact': 'FALSE',
      'Parent 2 Medical Decisions': 'FALSE'
    };

    // Build template data based on user role
    let templateRow = {};

    if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
      // Admin template: Include franchisee and school columns
      templateRow = {
        'Franchisee Name': 'Test Franchisee',
        'School Name': 'Test School',
        ...baseStudentData,
        ...parentData
      };
    } else if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      // Franchisee template: Include school column
      templateRow = {
        'School Name': 'Test School',
        ...baseStudentData,
        ...parentData
      };
    } else {
      // School admin template: No additional columns
      templateRow = {
        ...baseStudentData,
        ...parentData
      };
    }

    const templateData = [templateRow];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths based on template structure
    let colWidths = [];

    if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
      // Admin template with franchisee and school columns
      colWidths = [
        { wch: 20 }, // Franchisee Name
        { wch: 20 }, // School Name
        { wch: 20 }, // Student Name
        { wch: 5 },  // Age
        { wch: 8 },  // Gender
        { wch: 15 }, // Grade
        { wch: 12 }, // Roll Number
        { wch: 20 }, // Parent 1 Name
        { wch: 25 }, // Parent 1 Email
        { wch: 15 }, // Parent 1 Phone
        { wch: 12 }, // Parent 1 Relationship
        { wch: 15 }, // Parent 1 Occupation
        { wch: 12 }, // Parent 1 Has Custody
        { wch: 12 }, // Parent 1 Can Pickup
        { wch: 15 }, // Parent 1 Emergency Contact
        { wch: 15 }, // Parent 1 Medical Decisions
        { wch: 20 }, // Parent 2 Name
        { wch: 25 }, // Parent 2 Email
        { wch: 15 }, // Parent 2 Phone
        { wch: 12 }, // Parent 2 Relationship
        { wch: 15 }, // Parent 2 Occupation
        { wch: 12 }, // Parent 2 Has Custody
        { wch: 12 }, // Parent 2 Can Pickup
        { wch: 15 }, // Parent 2 Emergency Contact
        { wch: 15 }  // Parent 2 Medical Decisions
      ];
    } else if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      // Franchisee template with school column
      colWidths = [
        { wch: 20 }, // School Name
        { wch: 20 }, // Student Name
        { wch: 5 },  // Age
        { wch: 8 },  // Gender
        { wch: 15 }, // Grade
        { wch: 12 }, // Roll Number
        { wch: 20 }, // Parent 1 Name
        { wch: 25 }, // Parent 1 Email
        { wch: 15 }, // Parent 1 Phone
        { wch: 12 }, // Parent 1 Relationship
        { wch: 15 }, // Parent 1 Occupation
        { wch: 12 }, // Parent 1 Has Custody
        { wch: 12 }, // Parent 1 Can Pickup
        { wch: 15 }, // Parent 1 Emergency Contact
        { wch: 15 }, // Parent 1 Medical Decisions
        { wch: 20 }, // Parent 2 Name
        { wch: 25 }, // Parent 2 Email
        { wch: 15 }, // Parent 2 Phone
        { wch: 12 }, // Parent 2 Relationship
        { wch: 15 }, // Parent 2 Occupation
        { wch: 12 }, // Parent 2 Has Custody
        { wch: 12 }, // Parent 2 Can Pickup
        { wch: 15 }, // Parent 2 Emergency Contact
        { wch: 15 }  // Parent 2 Medical Decisions
      ];
    } else {
      // School admin template (original)
      colWidths = [
        { wch: 20 }, // Student Name
        { wch: 5 },  // Age
        { wch: 8 },  // Gender
        { wch: 15 }, // Grade
        { wch: 12 }, // Roll Number
        { wch: 20 }, // Parent 1 Name
        { wch: 25 }, // Parent 1 Email
        { wch: 15 }, // Parent 1 Phone
        { wch: 12 }, // Parent 1 Relationship
        { wch: 15 }, // Parent 1 Occupation
        { wch: 12 }, // Parent 1 Has Custody
        { wch: 12 }, // Parent 1 Can Pickup
        { wch: 15 }, // Parent 1 Emergency Contact
        { wch: 15 }, // Parent 1 Medical Decisions
        { wch: 20 }, // Parent 2 Name
        { wch: 25 }, // Parent 2 Email
        { wch: 15 }, // Parent 2 Phone
        { wch: 12 }, // Parent 2 Relationship
        { wch: 15 }, // Parent 2 Occupation
        { wch: 12 }, // Parent 2 Has Custody
        { wch: 12 }, // Parent 2 Can Pickup
        { wch: 15 }, // Parent 2 Emergency Contact
        { wch: 15 }  // Parent 2 Medical Decisions
      ];
    }
    ws['!cols'] = colWidths;

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers and send file with role-specific filename
    let filename = 'student_upload_template.xlsx';
    if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
      filename = 'student_upload_template_admin.xlsx';
    } else if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
      filename = 'student_upload_template_franchise.xlsx';
    } else {
      filename = 'student_upload_template_school.xlsx';
    }

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Bulk upload students
router.post('/students/bulk-upload', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  console.log('Bulk upload started');
  console.log('User:', req.user?.email);
  console.log('File received:', req.file ? 'Yes' : 'No');
  console.log('School ID from request:', req.body.schoolId);

  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Parse Excel file
    console.log('Parsing Excel file...');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet name:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('Raw Excel data:', jsonData.length, 'rows');
    console.log('First row sample:', jsonData[0]);

    if (!jsonData.length) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Determine target school ID based on user role and request
    let targetSchoolId: number | null = null;
    const userMemberships = await storage.getMembershipsByUser(req.user!.id);

    if (req.user!.roles.includes('SCHOOL_ADMIN')) {
      // School admin can only upload to their assigned school
      const schoolMembership = userMemberships.find(m => m.role === 'SCHOOL_ADMIN');
      if (schoolMembership) {
        targetSchoolId = schoolMembership.entityId;
      } else {
        return res.status(400).json({
          error: 'You must be assigned to a school to upload students.'
        });
      }
    } else {
      // Admin or franchise admin must specify school in request
      if (!req.body.schoolId) {
        return res.status(400).json({ error: 'School ID is required for bulk upload' });
      }
      targetSchoolId = parseInt(req.body.schoolId);

      // Validate permissions for the specified school
      if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
        const franchiseeMembership = userMemberships.find(m => m.role === 'FRANCHISE_ADMIN');
        if (franchiseeMembership) {
          const school = await storage.getEntityById(targetSchoolId);
          if (!school || school.parentId !== franchiseeMembership.entityId) {
            return res.status(403).json({ error: 'You can only upload students to schools under your franchisee' });
          }
        } else {
          return res.status(403).json({ error: 'Franchise admin membership not found' });
        }
      }
    }

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'Unable to determine target school for upload' });
    }

    console.log('Target school ID:', targetSchoolId);
    console.log('Excel data rows:', jsonData.length);

    // Transform and validate data
    const students: any[] = [];
    const errors: any[] = [];

    console.log('Starting row processing...');

    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      try {
        // For all users, use the pre-validated target school ID
        const studentSchoolId = targetSchoolId;

        // Extract student data
        const studentData = {
          name: row['Student Name']?.toString().trim(),
          age: parseInt(row['Age']) || 0,
          gender: row['Gender']?.toString().toUpperCase(),
          grade: row['Grade']?.toString().trim(),
          rollNumber: row['Roll Number']?.toString().trim(),
          schoolId: studentSchoolId,
          parents: []
        };

        // Extract up to 2 parents
        for (let p = 1; p <= 2; p++) {
          const parentName = row[`Parent ${p} Name`]?.toString().trim();
          if (parentName) {
            const parent = {
              name: parentName,
              email: row[`Parent ${p} Email`]?.toString().trim(),
              phone: row[`Parent ${p} Phone`]?.toString().trim(),
              relationship: row[`Parent ${p} Relationship`]?.toString().toUpperCase() || 'OTHER',
              occupation: row[`Parent ${p} Occupation`]?.toString().trim() || '',
              hasCustody: row[`Parent ${p} Has Custody`]?.toString().toUpperCase() === 'TRUE',
              canPickup: row[`Parent ${p} Can Pickup`]?.toString().toUpperCase() === 'TRUE',
              emergencyContact: row[`Parent ${p} Emergency Contact`]?.toString().toUpperCase() === 'TRUE',
              medicalDecisions: row[`Parent ${p} Medical Decisions`]?.toString().toUpperCase() === 'TRUE'
            };
            studentData.parents.push(parent);
          }
        }

        // Detailed validation with specific error messages
        const validationErrors: string[] = [];

        if (!studentData.name || studentData.name.trim() === '') {
          validationErrors.push('Student Name is required');
        }
        if (!studentData.age || studentData.age < 1 || studentData.age > 18) {
          validationErrors.push('Age must be a number between 1-18');
        }
        if (!studentData.gender || !['MALE', 'FEMALE', 'OTHER'].includes(studentData.gender)) {
          validationErrors.push('Gender must be exactly MALE, FEMALE, or OTHER');
        }
        if (!studentData.grade || studentData.grade.trim() === '') {
          validationErrors.push('Grade is required');
        }
        if (!studentData.rollNumber || studentData.rollNumber.trim() === '') {
          validationErrors.push('Roll Number is required');
        }
        if (studentData.parents.length === 0) {
          validationErrors.push('At least one parent is required');
        } else {
          // Validate parent data
          studentData.parents.forEach((parent: any, parentIndex: number) => {
            if (!parent.name || parent.name.trim() === '') {
              validationErrors.push(`Parent ${parentIndex + 1} Name is required`);
            }
            if (!parent.email || !/\S+@\S+\.\S+/.test(parent.email)) {
              validationErrors.push(`Parent ${parentIndex + 1} Email must be valid`);
            }
            if (!parent.phone || parent.phone.trim() === '') {
              validationErrors.push(`Parent ${parentIndex + 1} Phone is required`);
            }
            if (!['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'].includes(parent.relationship)) {
              validationErrors.push(`Parent ${parentIndex + 1} Relationship must be MOTHER, FATHER, GUARDIAN, or OTHER`);
            }
          });
        }

        if (validationErrors.length > 0) {
          errors.push({
            row: i + 2, // Excel row number (header is row 1)
            error: validationErrors.join('; '),
            data: studentData
          });
          continue;
        }

        students.push({
          ...studentData,
          rowNumber: i + 2
        });
        console.log(`Row ${i + 2}: Valid student ${studentData.name}`);

      } catch (error) {
        console.log(`Row ${i + 2}: Parsing error:`, error);
        errors.push({
          row: i + 2,
          error: 'Data parsing error: ' + (error as Error).message,
          data: row
        });
      }
    }

    console.log('Row processing complete. Errors:', errors.length, 'Valid students:', students.length);

    // If there are validation errors, return them immediately
    if (errors.length > 0) {
      console.log('Returning validation errors:', errors);
      return res.status(400).json({
        error: `Found ${errors.length} validation error(s) in your Excel file`,
        errors,
        totalRecords: jsonData.length
      });
    }

    // Check if any valid students found
    if (students.length === 0) {
      console.log('No valid students found');
      return res.status(400).json({
        error: 'No valid student records found in the Excel file. Please check the format and try again.',
        errors
      });
    }

    console.log('Found', students.length, 'valid students, checking for duplicates...');

    // Check for duplicates within the upload
    const duplicatesInFile: any[] = [];
    const seen = new Set();
    students.forEach((student, index) => {
      const key = `${student.name.toLowerCase()}-${student.rollNumber}`;
      if (seen.has(key)) {
        duplicatesInFile.push({
          row: student.rowNumber,
          error: 'Duplicate in file',
          student: student.name
        });
      }
      seen.add(key);
    });

    // Check for duplicates in database
    const existingStudents = targetSchoolId ? await storage.getStudentsBySchool(targetSchoolId) : [];
    const duplicatesInDB: any[] = [];

    students.forEach(student => {
      const duplicate = existingStudents.find(existing =>
        existing.name.toLowerCase() === student.name.toLowerCase() ||
        (existing.metadata?.rollNumber && existing.metadata.rollNumber === student.rollNumber)
      );
      if (duplicate) {
        duplicatesInDB.push({
          row: student.rowNumber,
          error: 'Already exists in database',
          student: student.name,
          existing: duplicate.name
        });
      }
    });

    // If there are any duplicates or errors, return them
    if (duplicatesInFile.length > 0 || duplicatesInDB.length > 0 || errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        duplicatesInFile,
        duplicatesInDB,
        errors,
        totalRecords: students.length
      });
    }

    // Process all students
    const results: any[] = [];
    for (const studentData of students) {
      try {
        // Create student using the same logic as individual registration
        const student = await storage.createEntity({
          type: 'STUDENT',
          name: studentData.name,
          status: 'ACTIVE',
          parentId: studentData.schoolId,
          metadata: {
            age: studentData.age,
            gender: studentData.gender,
            grade: studentData.grade,
            rollNumber: studentData.rollNumber,
          }
        });

        // Process parents
        const parentUsers = [];
        for (const parentData of studentData.parents) {
          let parentUser = await storage.getUserByEmail(parentData.email);

          if (!parentUser) {
            parentUser = await storage.createUser({
              email: parentData.email,
              name: parentData.name,
              phone: parentData.phone,
              status: 'ACTIVE'
            });

            await storage.createMembership({
              userId: parentUser.id,
              entityId: studentData.schoolId,
              role: 'PARENT',
              isPrimary: false
            });
          }

          await storage.createParentStudentLink({
            parentUserId: parentUser.id,
            studentEntityId: student.id,
            relationship: parentData.relationship,
            custodyFlags: {
              hasCustody: parentData.hasCustody,
              canPickup: parentData.canPickup,
              emergencyContact: parentData.emergencyContact,
              medicalDecisions: parentData.medicalDecisions,
            }
          });

          parentUsers.push({
            id: parentUser.id,
            name: parentUser.name,
            email: parentUser.email,
            relationship: parentData.relationship
          });
        }

        results.push({
          student: {
            id: student.id,
            name: student.name,
            rollNumber: studentData.rollNumber
          },
          parents: parentUsers,
          row: studentData.rowNumber
        });

      } catch (error) {
        results.push({
          error: 'Failed to create: ' + (error as Error).message,
          row: studentData.rowNumber,
          student: studentData.name
        });
      }
    }

    // Log the bulk action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'BULK_CREATE_STUDENTS',
      entityId: targetSchoolId || 0,
      metadata: {
        totalUploaded: results.filter(r => !r.error).length,
        totalFailed: results.filter(r => r.error).length,
        filename: req.file.originalname
      }
    });

    res.json({
      success: true,
      message: `Successfully processed ${results.filter(r => !r.error).length} out of ${results.length} students`,
      results,
      schoolId: targetSchoolId
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to process bulk upload: ' + (error as Error).message });
  }
});

// Authentication middleware
async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get user's memberships to determine roles and accessible entities
    const memberships = await storage.getMembershipsByUser(user.id);
    const roles = memberships.map(m => m.role);
    const entityIds = memberships.map(m => m.entityId);

    req.user = {
      id: user.id,
      email: user.email,
      roles,
      entityIds
    };

    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Authorization helper
function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}


// Traditional password login (for existing users)
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (error.message === 'Account suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact admin@smilestarsindia.com for assistance.',
        status: 'SUSPENDED'
      });
    }
    if (error.message.includes('magic link')) {
      return res.status(401).json({
        error: error.message,
        requiresMagicLink: true
      });
    }
    console.error('Password login error:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// Accept agreements endpoint
router.post('/auth/accept-agreements', async (req: Request, res: Response) => {
  try {
    const { agreementIds, token, password, entityId } = req.body;

    if (!agreementIds || !Array.isArray(agreementIds)) {
      return res.status(400).json({ error: 'Agreement IDs are required' });
    }

    let userId: number;
    let tokenType = 'REGULAR';
    let franchiseeId: number | null = null;

    if (token) {
      // Handle franchise or school agreement flow with token
      const magicToken = await storage.getMagicTokenByToken(token);
      if (!magicToken || !['FRANCHISE_AGREEMENT', 'SCHOOL_AGREEMENT'].includes(magicToken.purpose)) {
        return res.status(400).json({ error: 'Invalid agreement token' });
      }

      if (new Date() > magicToken.expiresAt) {
        return res.status(400).json({ error: 'Token has expired' });
      }

      const user = await storage.getUserByEmail(magicToken.email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      userId = user.id;
      tokenType = magicToken.purpose;
      franchiseeId = magicToken.metadata?.franchiseeId || magicToken.metadata?.schoolId || null;

      // Set password if provided
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await storage.updateUser(userId, { password: hashedPassword });
      }

      // Mark token as used now that we're processing the agreements
      await storage.markMagicTokenUsed(token);
    } else {
      // Handle regular agreement flow with authentication
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const jwtToken = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(jwtToken, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Create acceptance records for each agreement
    for (const agreementId of agreementIds) {
      const agreement = await storage.getAgreementById(agreementId);
      if (agreement) {
        await storage.createAgreementAcceptance({
          userId,
          agreementId,
          version: agreement.version,
          acceptedAt: new Date(),
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || null
        });
      }
    }

    // Update user status to ACTIVE after accepting agreements
    await storage.updateUser(userId, { status: 'ACTIVE' });

    // If this is a franchise or school agreement flow, also update entity status
    let entityToUpdate = franchiseeId;
    if (tokenType === 'REGULAR' && entityId) {
      // For regular authenticated agreement acceptance, use the provided entityId
      entityToUpdate = entityId;
    }

    if (entityToUpdate && (tokenType === 'FRANCHISE_AGREEMENT' || tokenType === 'SCHOOL_AGREEMENT' || (tokenType === 'REGULAR' && entityId))) {
      await storage.updateEntity(entityToUpdate, { status: 'ACTIVE' });
    }

    // Log the action
    await storage.createAuditLog({
      actorUserId: userId,
      action: tokenType === 'FRANCHISE_AGREEMENT' ? 'ACCEPT_FRANCHISE_AGREEMENTS' :
        tokenType === 'SCHOOL_AGREEMENT' ? 'ACCEPT_SCHOOL_AGREEMENTS' : 'ACCEPT_AGREEMENTS',
      targetId: userId,
      targetType: 'USER',
      metadata: {
        agreementIds: agreementIds.join(', '),
        totalAgreements: agreementIds.length,
        tokenType,
        entityId: entityToUpdate
      }
    });

    res.json({
      success: true,
      message: tokenType === 'FRANCHISE_AGREEMENT' ? 'Franchise activated successfully!' :
        tokenType === 'SCHOOL_AGREEMENT' ? 'School activated successfully!' : 'Agreements accepted successfully',
      entityActivated: !!entityToUpdate
    });
  } catch (error) {
    console.error('Accept agreements error:', error);
    res.status(500).json({ error: 'Failed to accept agreements' });
  }
});

// ===== USER & ENTITY MANAGEMENT ROUTES =====

// Get current user info
router.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await storage.getUserById(req.user!.id);
    const memberships = await storage.getMembershipsByUser(req.user!.id);
    const roles = memberships.map(m => m.role);

    // Return user object with roles array that frontend expects
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: roles,
      status: user.status,
      entityIds: memberships.map(m => m.entityId)
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get detailed memberships with entity information
router.get('/auth/memberships', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberships = await storage.getMembershipsByUser(req.user!.id);

    // Fetch entity details for each membership
    const detailedMemberships = await Promise.all(
      memberships.map(async (membership) => {
        const entity = await storage.getEntityById(membership.entityId);
        return {
          ...membership,
          entity: entity ? {
            id: entity.id,
            name: entity.name,
            type: entity.type
          } : null
        };
      })
    );

    res.json(detailedMemberships);
  } catch (error) {
    console.error('Get memberships error:', error);
    res.status(500).json({ error: 'Failed to get memberships' });
  }
});

// Get entities (with role-based filtering)
// GET /entities/:id - return single entity by ID
router.get('/entities/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityId = parseInt(req.params.id);
    const entity = await storage.getEntityById(entityId);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Check if user has access to this entity
    const accessibleEntityIds = req.user!.entityIds || [];
    const hasAccess = req.user!.roles.includes('SYSTEM_ADMIN') ||
      req.user!.roles.includes('ORG_ADMIN') ||
      accessibleEntityIds.includes(entity.id) ||
      accessibleEntityIds.includes(entity.parentId || 0);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this entity' });
    }

    res.json(entity);
  } catch (error) {
    console.error('Get entity by ID error:', error);
    res.status(500).json({ error: 'Failed to get entity' });
  }
});

router.get('/entities', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, parentId } = req.query;

    let entities;
    if (type) {
      entities = await storage.getEntitiesByType(type as string);
    } else if (parentId) {
      entities = await storage.getEntitiesByParent(parseInt(parentId as string));
    } else {
      entities = await storage.getAllEntities();
    }

    // Filter entities based on user's access
    const accessibleEntityIds = req.user!.entityIds;
    const filteredEntities = entities.filter(entity => {
      // System admins and org admins can see all entities
      if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
        return true;
      }

      // Users can see entities they have access to or their children
      return accessibleEntityIds.includes(entity.id) ||
        accessibleEntityIds.includes(entity.parentId || 0);
    });

    res.json(filteredEntities);
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to get entities' });
  }
});

// Create entity
router.post('/entities', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityData = insertEntitySchema.parse(req.body);
    const entity = await storage.createEntity(entityData);

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_ENTITY',
      entityId: entity.id,
      metadata: { entityType: entity.type, entityName: entity.name }
    });

    res.json(entity);
  } catch (error) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// Invite user
router.post('/auth/invite', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, targetEntityId, role } = inviteUserSchema.parse(req.body);

    const user = await identityService.inviteUser(req.user!.id, email, name, targetEntityId, role);

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'INVITE_USER',
      targetId: user.id,
      targetType: 'USER',
      metadata: { email, role, targetEntityId }
    });

    res.json({
      message: 'Invitation sent successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Get users
router.get('/users', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await storage.getAllUsers();

    // Fetch memberships for each user to include roles
    const usersWithMemberships = await Promise.all(
      users.map(async (user) => {
        try {
          const memberships = await storage.getMembershipsByUser(user.id);
          return {
            ...user,
            roles: memberships.map(m => m.role),
            memberships: memberships
          };
        } catch (error) {
          console.warn(`Failed to fetch memberships for user ${user.id}:`, error);
          return {
            ...user,
            roles: [],
            memberships: []
          };
        }
      })
    );

    res.json(usersWithMemberships);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, username, roles, franchiseeId, schoolId, password } = req.body;

    // Check if user exists
    const existingUser = await storage.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is being updated and prevent it
    if (username !== undefined) {
      return res.status(400).json({
        error: 'Username cannot be updated',
        message: 'Username updates are not allowed. You can update other fields like email, name, and password.'
      });
    }

    // Prepare user updates
    const userUpdates: any = {
      name: name || existingUser.name,
    };

    // Handle email update with duplicate check
    if (email && email !== existingUser.email) {
      // Check if email is already taken by another user
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser && existingEmailUser.id !== userId) {
        return res.status(400).json({
          error: 'Email already exists',
          message: `The email address '${email}' is already registered to another user. Please use a different email address.`
        });
      }
      userUpdates.email = email;
    } else {
      userUpdates.email = existingUser.email;
    }

    // Hash and update password if provided
    if (password && password.trim()) {
      userUpdates.password = await bcrypt.hash(password.trim(), 10);
    }

    // Update user basic info
    const updatedUser = await storage.updateUser(userId, userUpdates);

    // Update user memberships if roles are provided
    if (roles && roles.length > 0) {
      // Remove existing memberships
      await storage.deleteMembershipsByUser(userId);

      // Add new memberships
      for (const role of roles) {
        let entityId = 1; // Default to root organization

        // Determine entity ID based on role and provided IDs
        if (role === 'FRANCHISE_ADMIN' && franchiseeId) {
          entityId = franchiseeId;
        } else if (['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'].includes(role) && schoolId) {
          entityId = schoolId;
        } else if (role === 'PARENT' && schoolId) {
          entityId = schoolId;
        }

        await storage.createMembership({
          userId: userId,
          entityId: entityId,
          role: role as any,
          isPrimary: true,
          validFrom: new Date(),
        });
      }
    }

    // Get updated user with memberships
    const memberships = await storage.getMembershipsByUser(userId);
    const userWithRoles = {
      ...updatedUser,
      roles: memberships.map(m => m.role),
      memberships: memberships
    };

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'UPDATE_USER',
      targetId: userId,
      targetType: 'USER',
      metadata: {
        updatedUserEmail: updatedUser.email,
        updatedUserName: updatedUser.name,
        updatedRoles: roles?.join(', ') || 'No roles updated',
        passwordChanged: password && password.trim() ? 'Yes' : 'No'
      }
    });

    res.json(userWithRoles);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user status
router.patch('/users/:id/status', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    // Check if user exists
    const existingUser = await storage.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'INVITED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Prevent self-suspension
    if (userId === req.user!.id && status === 'SUSPENDED') {
      return res.status(400).json({ error: 'Cannot suspend yourself' });
    }

    // Update user status
    const updatedUser = await storage.updateUser(userId, { status });

    // Get user with memberships for response
    const memberships = await storage.getMembershipsByUser(userId);
    const userWithRoles = {
      ...updatedUser,
      roles: memberships.map(m => m.role),
      memberships: memberships
    };

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'UPDATE_USER_STATUS',
      targetId: userId,
      targetType: 'USER',
      metadata: {
        oldStatus: existingUser.status,
        newStatus: status,
        userEmail: updatedUser.email,
        userName: updatedUser.name
      }
    });

    res.json(userWithRoles);
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-deletion
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete user memberships first
    await storage.deleteMembershipsByUser(userId);

    // Delete the user
    await storage.deleteUser(userId);

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'DELETE_USER',
      targetId: userId,
      targetType: 'USER',
      metadata: {
        deletedUserEmail: user.email,
        deletedUserName: user.name
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===== DENTAL CAMP MANAGEMENT ROUTES =====

// Get camps
router.get('/camps', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const camps = await storage.getAllCamps();

    // Add school information and enrolled students count to each camp
    const campsWithSchools = await Promise.all(
      camps.map(async (camp) => {
        const school = await storage.getEntityById(camp.schoolEntityId);
        const enrolledStudents = await storage.getEnrolledStudentsByCamp(camp.id);
        return {
          ...camp,
          school: school ? {
            id: school.id,
            name: school.name,
            city: school.metadata?.city || '',
            state: school.metadata?.state || ''
          } : null,
          enrolledCount: enrolledStudents.length
        };
      })
    );

    res.json(campsWithSchools);
  } catch (error) {
    console.error('Get camps error:', error);
    res.status(500).json({ error: 'Failed to get camps' });
  }
});

// Get camps for current school admin's school
router.get('/camps/my-school', authenticateToken, requireRole(['SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user's school membership to find which school they manage
    const memberships = await storage.getMembershipsByUser(req.user!.id);
    const schoolMembership = memberships.find(m => m.role === 'SCHOOL_ADMIN');

    if (!schoolMembership) {
      return res.status(404).json({ error: 'No school found for this admin' });
    }

    const schoolEntityId = schoolMembership.entityId;

    // Get all camps and filter for this school
    const allCamps = await storage.getAllCamps();
    const schoolCamps = allCamps.filter(camp => camp.schoolEntityId === schoolEntityId);

    res.json(schoolCamps);
  } catch (error) {
    console.error('Get school camps error:', error);
    res.status(500).json({ error: 'Failed to get school camps' });
  }
});

// Create camp
// Create camp
router.post('/camps', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Convert date strings to Date objects before schema validation
    const requestBody = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
    };

    const campData = insertCampSchema.parse(requestBody);
    campData.createdBy = req.user!.id;

    const camp = await campService.createCamp(campData);

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_CAMP',
      entityId: camp.schoolEntityId,
      targetId: camp.id,
      targetType: 'CAMP',
      metadata: { campName: camp.name, startDate: camp.startDate, endDate: camp.endDate }
    });

    res.json(camp);
  } catch (error) {
    console.error('Create camp error:', error);
    res.status(500).json({ error: 'Failed to create camp' });
  }
});

// Schedule camp
router.patch('/camps/:id/schedule', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) return res.status(400).json({ error: "Start and end dates are required" });

    const camp = await campService.scheduleCamp(campId, new Date(startDate), new Date(endDate));

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'SCHEDULE_CAMP',
      entityId: camp.schoolEntityId,
      targetId: camp.id,
      targetType: 'CAMP',
      metadata: { newStatus: 'SCHEDULED' }
    });

    res.json(camp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start Consent Collection
router.patch('/camps/:id/start-consent', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const camp = await campService.startConsentCollection(campId);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'START_CONSENT',
      entityId: camp.schoolEntityId,
      targetId: camp.id,
      targetType: 'CAMP',
      metadata: { newStatus: 'CONSENT_COLLECTION' }
    });

    res.json(camp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start Camp (Active)
router.patch('/camps/:id/start', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const camp = await campService.startCamp(campId);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'START_CAMP',
      entityId: camp.schoolEntityId,
      targetId: camp.id,
      targetType: 'CAMP',
      metadata: { newStatus: 'ACTIVE' }
    });

    res.json(camp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete Camp
router.patch('/camps/:id/complete', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const camp = await campService.completeCamp(campId);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'COMPLETE_CAMP',
      entityId: camp.schoolEntityId,
      targetId: camp.id,
      targetType: 'CAMP',
      metadata: { newStatus: 'COMPLETED' }
    });

    res.json(camp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel Camp
router.patch('/camps/:id/cancel', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const camp = await campService.cancelCamp(campId);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CANCEL_CAMP',
      entityId: camp.schoolEntityId,
      targetId: camp.id,
      targetType: 'CAMP',
      metadata: { newStatus: 'CANCELLED' }
    });

    res.json(camp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// ===== CAMP ENROLLMENT ROUTES =====

// Get enrolled students for a camp
router.get('/camps/:id/enrollments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const enrolledStudents = await storage.getEnrolledStudentsByCamp(campId);

    // Transform student data to include metadata fields at top level
    const transformedStudents = enrolledStudents.map(student => ({
      ...student,
      age: student.metadata?.age || '',
      gender: student.metadata?.gender || '',
      grade: student.metadata?.grade || '',
      rollNumber: student.metadata?.rollNumber || '',
    }));

    res.json(transformedStudents);
  } catch (error) {
    console.error('Get camp enrollments error:', error);
    res.status(500).json({ error: 'Failed to get camp enrollments' });
  }
});

// Get available students for enrollment (from camp's school, not yet enrolled)
router.get('/camps/:id/available-students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const availableStudents = await storage.getAvailableStudentsForCamp(campId);

    // Transform student data to include metadata fields at top level
    const transformedStudents = availableStudents.map(student => ({
      ...student,
      age: student.metadata?.age || '',
      gender: student.metadata?.gender || '',
      grade: student.metadata?.grade || '',
      rollNumber: student.metadata?.rollNumber || '',
    }));

    res.json(transformedStudents);
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ error: 'Failed to get available students' });
  }
});

// Add students to camp enrollment
router.post('/camps/:id/enrollments', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Student IDs array is required' });
    }

    const enrollments = [];
    for (const studentId of studentIds) {
      try {
        const enrollment = await storage.createCampEnrollment({
          campId,
          studentEntityId: studentId,
          enrolledBy: req.user!.id,
          status: 'ENROLLED'
        });
        enrollments.push(enrollment);
      } catch (error) {
        // Skip if already enrolled (duplicate constraint)
        console.log(`Student ${studentId} already enrolled in camp ${campId}`);
      }
    }

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'ENROLL_STUDENTS_TO_CAMP',
      entityId: campId,
      metadata: {
        enrolledStudents: enrollments.length,
        requestedStudents: studentIds.length
      }
    });

    res.json({
      success: true,
      enrolled: enrollments.length,
      message: `Successfully enrolled ${enrollments.length} out of ${studentIds.length} students`
    });
  } catch (error) {
    console.error('Add camp enrollments error:', error);
    res.status(500).json({ error: 'Failed to add camp enrollments' });
  }
});

// Remove student from camp enrollment
router.delete('/camps/:id/enrollments/:studentId', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campId = parseInt(req.params.id);
    const studentId = parseInt(req.params.studentId);

    await storage.deleteCampEnrollment(campId, studentId);

    // Log the action
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'REMOVE_STUDENT_FROM_CAMP',
      entityId: campId,
      targetId: studentId,
      targetType: 'STUDENT'
    });

    res.json({ success: true, message: 'Student removed from camp successfully' });
  } catch (error) {
    console.error('Remove camp enrollment error:', error);
    res.status(500).json({ error: 'Failed to remove student from camp' });
  }
});

// ===== SCREENING ROUTES =====

// Get screenings
// Get screenings
router.get('/screenings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screenings = await screeningService.getAllScreenings();
    res.json(screenings);
  } catch (error) {
    console.error('Get screenings error:', error);
    res.status(500).json({ error: 'Failed to get screenings' });
  }
});

// Create screening
// Create screening
router.post('/screenings', authenticateToken, requireRole(['DENTIST']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screeningData = insertScreeningSchema.parse(req.body);

    // Use service
    const screening = await screeningService.createScreening({
      ...screeningData,
      dentistUserId: req.user!.id
    });

    res.json(screening);
  } catch (error) {
    console.error('Create screening error:', error);
    res.status(500).json({ error: error.message || 'Failed to create screening' });
  }
});

// ===== DASHBOARD STATS =====

router.get('/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [users, entities, camps, screenings] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllEntities(),
      storage.getAllCamps(),
      storage.getAllScreenings()
    ]);

    const stats = {
      totalUsers: users.length,
      totalEntities: entities.length,
      totalFranchises: entities.filter(e => e.type === 'FRANCHISEE').length, // Match frontend field name
      totalFranchisees: entities.filter(e => e.type === 'FRANCHISEE').length,
      totalSchools: entities.filter(e => e.type === 'SCHOOL').length,
      totalStudents: entities.filter(e => e.type === 'STUDENT').length,
      totalCamps: camps.length,
      totalScreenings: screenings.length,
      activeCamps: camps.filter(c => c.status === 'ACTIVE' || c.status === 'CONSENT_COLLECTION').length,
      completedScreenings: screenings.filter(s => s.isCompleted).length,
      studentsScreened: screenings.filter(s => s.isCompleted).length, // Add missing field
      reportsGenerated: screenings.filter(s => s.isCompleted).length // Add missing field
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// ===== LEGACY COMPATIBILITY ROUTES (for smooth transition) =====

// Legacy login route (for backwards compatibility)
router.post('/login', async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'Legacy password login is no longer supported. Please use magic link authentication.',
    magicLinkEndpoint: '/auth/magic-link/request'
  });
});

// Legacy API compatibility routes - map old endpoints to new entity system
// GET /api/franchises - return FRANCHISEE entities
router.get('/franchises', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchisees = await storage.getEntitiesByType('FRANCHISEE');

    // Filter based on user access
    const accessibleEntityIds = req.user!.entityIds;
    const filteredFranchisees = franchisees.filter(entity => {
      if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
        return true;
      }
      return accessibleEntityIds.includes(entity.id) || accessibleEntityIds.includes(entity.parentId || 0);
    });

    // Transform entities to include mapped properties and school counts
    const transformedFranchisees = await Promise.all(filteredFranchisees.map(async entity => {
      const metadata = entity.metadata || {};

      // Get school count for this franchisee
      const schools = await storage.getEntitiesByParent(entity.id);
      const schoolCount = schools.filter(school => school.type === 'SCHOOL').length;

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        status: entity.status,
        parentId: entity.parentId,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        // Map metadata properties to flat structure for frontend compatibility
        region: metadata.region || '',
        contactPerson: metadata.franchiseContactPerson || '',
        contactEmail: metadata.franchiseContactEmail || '',
        contactPhone: metadata.franchiseContactPhone || '',
        address: metadata.franchiseAddress || '',
        city: metadata.franchiseCity || '',
        state: metadata.franchiseState || '',
        pincode: metadata.franchisePincode || '',
        // Additional computed properties
        schoolCount,
        isActive: entity.status === 'ACTIVE',
        agreementStatus: entity.status === 'ACTIVE' ? 'accepted' : 'pending',
        agreementAcceptedAt: entity.status === 'ACTIVE' ? entity.updatedAt : null,
        // Keep original metadata for any additional needs
        metadata
      };
    }));

    res.json(transformedFranchisees);
  } catch (error) {
    console.error('Get franchises error:', error);
    res.status(500).json({ error: 'Failed to get franchises' });
  }
});

// POST /api/franchises - create FRANCHISEE entity and primary contact user
router.post('/franchises', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { metadata, ...entityData } = req.body;
    const contactEmail = metadata?.franchiseContactEmail;
    const contactPerson = metadata?.franchiseContactPerson;

    if (!contactEmail || !contactPerson) {
      return res.status(400).json({ error: 'Contact email and person name are required' });
    }

    const { entity, primaryContactUser } = await organizationService.createFranchise(
      req.user!.id,
      { ...entityData, metadata },
      contactPerson,
      contactEmail
    );

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_ENTITY',
      entityId: entity.id,
      metadata: {
        entityType: entity.type,
        entityName: entity.name,
        primaryContactEmail: contactEmail,
        primaryContactName: contactPerson
      }
    });

    res.json({
      entity,
      primaryContactUser: {
        id: primaryContactUser.id,
        email: primaryContactUser.email,
        firstName: primaryContactUser.firstName,
        lastName: primaryContactUser.lastName,
        status: primaryContactUser.status
      },
      message: 'Franchisee created successfully. Agreement email will be sent to the contact person.'
    });
  } catch (error) {
    console.error('Create franchise error:', error);
    res.status(500).json({ error: error.message || 'Failed to create franchise' });
  }
});

// PUT /api/franchises/:id - update FRANCHISEE entity
router.put('/franchises/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityId = parseInt(req.params.id);
    const entityData = {
      ...req.body,
      type: 'FRANCHISEE' as const,
    };

    const entity = await storage.updateEntity(entityId, entityData);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'UPDATE_ENTITY',
      entityId: entity.id,
      metadata: { entityType: entity.type, entityName: entity.name }
    });

    res.json({ message: 'Franchise updated successfully', entity });
  } catch (error) {
    console.error('Update franchise error:', error);
    res.status(500).json({ error: 'Failed to update franchise' });
  }
});

// DELETE /api/franchises/:id - delete FRANCHISEE entity and all associated users
router.delete('/franchises/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityId = parseInt(req.params.id);
    await organizationService.deleteFranchise(req.user!.id, entityId);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'DELETE_ENTITY',
      entityId: entityId,
      metadata: {
        entityType: 'FRANCHISEE'
      }
    });

    res.json({ message: 'Franchise deleted successfully' });
  } catch (error) {
    console.error('Delete franchise error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete franchise' });
  }
});

// GET /api/schools - return SCHOOL entities filtered by active entity context
router.get('/schools', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getEntitiesByType('SCHOOL');

    // Get active entity context from query parameter (sent by frontend role switcher)
    const activeEntityId = req.query.entityId ? parseInt(req.query.entityId as string) : null;

    // Filter schools based on user's active entity context and roles
    const filteredSchools = schools.filter(school => {
      // System and Org Admins can see all schools
      if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
        return true;
      }

      // For franchise admins with active entity context, only show schools under that specific franchise
      if (req.user!.roles.includes('FRANCHISE_ADMIN') && activeEntityId) {
        // Verify user has access to the requested entity
        const userEntityIds = req.user!.entityIds || [];
        if (userEntityIds.includes(activeEntityId)) {
          return school.parentId === activeEntityId;
        }
        return false;
      }

      // Fallback: For franchise admins without entity context, show schools from all their franchises
      if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
        const userEntityIds = req.user!.entityIds || [];
        return userEntityIds.includes(school.parentId || 0);
      }

      // For school admins, show only schools they are assigned to
      if (req.user!.roles.includes('SCHOOL_ADMIN')) {
        const accessibleEntityIds = req.user!.entityIds || [];
        return accessibleEntityIds.includes(school.id);
      }

      // For other roles, allow access based on direct entity membership
      const accessibleEntityIds = req.user!.entityIds || [];
      return accessibleEntityIds.includes(school.id) || accessibleEntityIds.includes(school.parentId || 0);
    });

    // Flatten metadata fields for frontend compatibility
    const schoolsWithFlattenedData = filteredSchools.map(school => ({
      ...school,
      // Flatten metadata fields to top level for frontend access
      address: school.metadata?.address,
      city: school.metadata?.city,
      state: school.metadata?.state,
      pincode: school.metadata?.pincode,
      contactPerson: school.metadata?.contactPerson,
      contactPhone: school.metadata?.contactPhone,
      contactEmail: school.metadata?.contactEmail,
      registrationNumber: school.metadata?.registrationNumber,
      hasSubBranches: school.metadata?.hasSubBranches,
      // Legacy field mappings for backward compatibility
      contactPersonName: school.metadata?.contactPerson,
      isActive: school.status === 'ACTIVE'
    }));

    res.json(schoolsWithFlattenedData);
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// POST /api/schools - create SCHOOL entity
router.post('/schools', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { metadata, parentId, ...entityData } = req.body;

    // Extract principal/contact person details from metadata
    const contactEmail = metadata?.principalEmail || metadata?.schoolContactEmail;
    const contactPerson = metadata?.principalName || metadata?.schoolContactPerson;

    if (!contactEmail || !contactPerson) {
      return res.status(400).json({ error: 'Principal email and name are required' });
    }

    const { entity, principalUser } = await organizationService.createSchool(
      req.user!.id,
      { ...entityData, metadata },
      contactPerson,
      contactEmail,
      parentId
    );

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_ENTITY',
      entityId: entity.id,
      metadata: {
        entityType: entity.type,
        entityName: entity.name,
        principalEmail: contactEmail,
        agreementSent: true
      }
    });

    res.json({
      entity,
      principalUser: {
        id: principalUser.id,
        email: principalUser.email,
        status: principalUser.status
      },
      message: 'School created successfully. Agreement email will be sent to the principal.'
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: error.message || 'Failed to create school' });
  }
});

// PUT /api/schools/:id - update SCHOOL entity
router.put('/schools/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityId = parseInt(req.params.id);
    const entityData = {
      ...req.body,
      type: 'SCHOOL' as const,
    };

    // Check if school exists
    const existingSchool = await storage.getEntityById(entityId);
    if (!existingSchool || existingSchool.type !== 'SCHOOL') {
      return res.status(404).json({ error: 'School not found' });
    }

    // For franchise admins, ensure they can only update schools under their franchise
    if (req.user!.roles.includes('FRANCHISE_ADMIN') && !req.user!.roles.includes('SYSTEM_ADMIN') && !req.user!.roles.includes('ORG_ADMIN')) {
      const userMemberships = await storage.getMembershipsByUser(req.user!.id);
      const franchiseeMembership = userMemberships.find(m => m.role === 'FRANCHISE_ADMIN');

      if (!franchiseeMembership || existingSchool.parentId !== franchiseeMembership.entityId) {
        return res.status(403).json({ error: 'Access denied. You can only update schools under your franchise.' });
      }
    }

    const entity = await storage.updateEntity(entityId, entityData);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'UPDATE_ENTITY',
      entityId: entity.id,
      metadata: { entityType: entity.type, entityName: entity.name }
    });

    res.json({ message: 'School updated successfully', entity });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// DELETE /api/schools/:id - delete SCHOOL entity
router.delete('/schools/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityId = parseInt(req.params.id);
    await organizationService.deleteSchool(req.user!.id, entityId);

    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'DELETE_ENTITY',
      entityId: entityId,
      metadata: {
        entityType: 'SCHOOL'
      }
    });

    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete school' });
  }
});

// Debug route to check database state
router.get('/debug/entities', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allStudents = await storage.getEntitiesByType('STUDENT');
    const allSchools = await storage.getEntitiesByType('SCHOOL');
    const allFranchisees = await storage.getEntitiesByType('FRANCHISEE');
    const userMemberships = await storage.getMembershipsByUser(req.user!.id);

    res.json({
      students: allStudents.length,
      schools: allSchools.length,
      franchisees: allFranchisees.length,
      userMemberships,
      userRoles: req.user!.roles,
      userEntityIds: req.user!.entityIds,
      sampleStudents: allStudents.slice(0, 3),
      sampleSchools: allSchools.slice(0, 3)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students - return STUDENT entities
router.get('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campId, franchiseeId, schoolId, page = '1', pageSize = '20', search } = req.query;
    const students = await storage.getEntitiesByType('STUDENT');

    // Debug logging (remove after testing)
    console.log('DEBUG Students endpoint:');
    console.log('- Total students in DB:', students.length);
    console.log('- User roles:', req.user!.roles);
    console.log('- User entityIds:', req.user!.entityIds);

    // Filter based on user access and role
    const accessibleEntityIds = req.user!.entityIds;
    let filteredStudents = students;

    if (req.user!.roles.includes('PARENT')) {
      // Parents should only see their own children
      const parentStudentLinks = await storage.getParentStudentLinksByParent(req.user!.id);
      const parentStudentIds = parentStudentLinks.map(link => link.studentEntityId);
      filteredStudents = students.filter(student => parentStudentIds.includes(student.id));
    } else if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
      // System/Org admins can see all students
      filteredStudents = students;
    } else {
      // Other roles (franchise admin, school admin, etc.) see students based on entity access
      if (req.user!.roles.includes('FRANCHISE_ADMIN')) {
        // Franchise admins see students from all schools under their franchisee
        const userMemberships = await storage.getMembershipsByUser(req.user!.id);
        const franchiseeMemberships = userMemberships.filter(m => m.role === 'FRANCHISE_ADMIN');

        if (franchiseeMemberships.length > 0) {
          const franchiseeIds = franchiseeMemberships.map(m => m.entityId);
          const allSchools = await storage.getEntitiesByType('SCHOOL');
          const franchiseeSchools = allSchools.filter(school => franchiseeIds.includes(school.parentId || 0));
          const franchiseeSchoolIds = franchiseeSchools.map(school => school.id);
          filteredStudents = students.filter(student => franchiseeSchoolIds.includes(student.parentId || 0));

          console.log('- Franchise filtering:');
          console.log('  - Franchise memberships:', franchiseeMemberships.length);
          console.log('  - Franchisee IDs:', franchiseeIds);
          console.log('  - All schools:', allSchools.length);
          console.log('  - Franchisee schools:', franchiseeSchools.length);
          console.log('  - Franchisee school IDs:', franchiseeSchoolIds);
          console.log('  - Filtered students:', filteredStudents.length);
        } else {
          filteredStudents = [];
          console.log('- No franchise memberships found');
        }
      } else {
        // School admins and other roles see students based on direct entity access
        filteredStudents = students.filter(entity => {
          return accessibleEntityIds.includes(entity.id) || accessibleEntityIds.includes(entity.parentId || 0);
        });
      }
    }

    // Apply additional filters
    if (schoolId) {
      filteredStudents = filteredStudents.filter(student => student.parentId === parseInt(schoolId as string));
    }

    if (franchiseeId) {
      // Filter by franchisee through school's parent relationship
      const allSchools = await storage.getEntitiesByType('SCHOOL');
      const franchiseeSchools = allSchools.filter(school => school.parentId === parseInt(franchiseeId as string));
      const franchiseeSchoolIds = franchiseeSchools.map(school => school.id);
      filteredStudents = filteredStudents.filter(student => franchiseeSchoolIds.includes(student.parentId || 0));
    }

    // Transform student data to include metadata fields at top level and parent info
    const transformedStudents = await Promise.all(filteredStudents.map(async (student) => {
      // Get parent information
      const parentLinks = await storage.getParentStudentLinksByStudent(student.id);
      let parentName = '';
      let parentPhone = '';

      if (parentLinks.length > 0) {
        const primaryParent = parentLinks.find(link => link.custodyFlags?.emergencyContact) || parentLinks[0];
        const parentUser = await storage.getUserById(primaryParent.parentUserId);
        if (parentUser) {
          parentName = parentUser.name;
          parentPhone = parentUser.phone || '';
        }
      }

      // Check screening status
      const screenings = await storage.getScreeningsByStudentEntity(student.id);
      const hasScreening = screenings.length > 0;
      const screeningCompleted = screenings.some((s: any) => s.status === 'COMPLETED');

      return {
        ...student,
        // Flatten metadata fields for easier access
        age: student.metadata?.age || '',
        gender: student.metadata?.gender || '',
        grade: student.metadata?.grade || '',
        rollNumber: student.metadata?.rollNumber || '',
        // Add parent information
        parentName,
        parentPhone,
        // Add screening status
        hasScreening,
        screeningCompleted
      };
    }));

    // Apply camp and search filters to transformed students
    let finalStudents = transformedStudents;
    if (campId) {
      finalStudents = finalStudents.filter(student => student.campId === parseInt(campId as string));
    }

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase().trim();
      finalStudents = finalStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm) ||
        student.rollNumber?.toLowerCase().includes(searchTerm) ||
        student.parentName?.toLowerCase().includes(searchTerm)
      );
    }

    // Get total count before pagination
    const total = finalStudents.length;

    // Apply pagination
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedStudents = finalStudents.slice(startIndex, endIndex);

    res.json({
      students: paginatedStudents,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum)
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

// Get school data for current school admin
router.get('/schools/my-school', authenticateToken, requireRole(['SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user's school membership to find which school they manage
    const memberships = await storage.getMembershipsByUser(req.user!.id);
    const schoolMembership = memberships.find(m => m.role === 'SCHOOL_ADMIN');

    if (!schoolMembership) {
      return res.status(404).json({ error: 'No school found for this admin' });
    }

    const schoolEntityId = schoolMembership.entityId;

    // Get the school entity
    const schoolEntity = await storage.getEntityById(schoolEntityId);

    if (!schoolEntity || schoolEntity.type !== 'SCHOOL') {
      return res.status(404).json({ error: 'School entity not found' });
    }

    // Flatten metadata fields for frontend compatibility (same as other schools endpoint)
    const schoolWithFlattenedData = {
      ...schoolEntity,
      // Flatten metadata fields to top level for frontend access
      address: schoolEntity.metadata?.address,
      city: schoolEntity.metadata?.city,
      state: schoolEntity.metadata?.state,
      pincode: schoolEntity.metadata?.pincode,
      contactPerson: schoolEntity.metadata?.contactPerson,
      contactPhone: schoolEntity.metadata?.contactPhone,
      contactEmail: schoolEntity.metadata?.contactEmail,
      registrationNumber: schoolEntity.metadata?.registrationNumber,
      hasSubBranches: schoolEntity.metadata?.hasSubBranches,
      // Legacy field mappings for backward compatibility
      contactPersonName: schoolEntity.metadata?.contactPerson,
      isActive: schoolEntity.status === 'ACTIVE'
    };

    res.json(schoolWithFlattenedData);
  } catch (error) {
    console.error('Get my school error:', error);
    res.status(500).json({ error: 'Failed to get school data' });
  }
});

// Get students for current school admin's school
router.get('/students/my-school', authenticateToken, requireRole(['SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user's school membership to find which school they manage
    const memberships = await storage.getMembershipsByUser(req.user!.id);
    const schoolMembership = memberships.find(m => m.role === 'SCHOOL_ADMIN');

    if (!schoolMembership) {
      return res.status(404).json({ error: 'No school found for this admin' });
    }

    const schoolEntityId = schoolMembership.entityId;

    // Get students for this school using the existing method
    const schoolStudents = await storage.getStudentsBySchool(schoolEntityId);

    res.json(schoolStudents || []);
  } catch (error) {
    console.error('Get school students error:', error);
    res.status(500).json({ error: 'Failed to get school students' });
  }
});

// ===== REPORTS ROUTES =====

// Get all reports (for admin users)
// Get all reports (for admin users)
router.get('/reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = await reportService.getReports();
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Generate a new report
router.post('/reports', authenticateToken, requireRole(['DENTIST', 'SCHOOL_ADMIN', 'SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { screeningId, studentId } = req.body;

    if (!screeningId || !studentId) {
      return res.status(400).json({ error: "screeningId and studentId are required" });
    }

    const report = await reportService.generateReport(parseInt(screeningId), parseInt(studentId), req.user!.id);
    res.json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// Download Report PDF
router.get('/reports/:id/download', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const report = await reportService.getReportById(reportId);

    if (!report || !report.pdfData) {
      return res.status(404).json({ error: "Report not found or PDF missing" });
    }

    const pdfBuffer = Buffer.from(report.pdfData, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${reportId}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Get reports for current parent's children (optimized endpoint)
router.get('/reports/my-children', authenticateToken, requireRole(['PARENT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // This needs proper implementation filtering by parent's students
    // For now, return empty array to match previous placeholder behavior but logged
    console.log(`[Reports] Fetching reports for parent ${req.user!.id}`);
    res.json([]);
  } catch (error) {
    console.error('Get parent children reports error:', error);
    res.status(500).json({ error: 'Failed to get children reports' });
  }
});

// ===== CONTENT ROUTES (TWINKY CORNER) =====

// Public Content (Available to all authenticated users)
router.get('/content/public', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const content = await contentService.getPublicContent();
    res.json(content);
  } catch (error) {
    console.error('Get public content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

router.get('/content/:slug', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const content = await contentService.getContentBySlug(req.params.slug);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    console.error('Get content by slug error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Admin Content Management
router.post('/content', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const content = await contentService.createContent({
      ...req.body,
      authorId: req.user!.id
    });
    res.json(content);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

router.get('/content', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const content = await contentService.getAllContent();
    res.json(content);
  } catch (error) {
    console.error('Get all content error:', error);
    res.status(500).json({ error: 'Failed to get all content' });
  }
});

router.patch('/content/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const content = await contentService.updateContent(parseInt(req.params.id), req.body);
    res.json(content);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

router.delete('/content/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await contentService.deleteContent(parseInt(req.params.id));
    res.sendStatus(204);
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

export default router;