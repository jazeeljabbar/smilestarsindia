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
async function sendEmail(to: string, subject: string, html: string, from?: string) {
  const fromEmail = from || process.env.GMAIL_USER || 'admin@smilestarsindia.com';
  
  console.log('=== EMAIL SENDING DISABLED ===');
  console.log(`To: ${to}`);
  console.log(`From: ${fromEmail}`);
  console.log(`Subject: ${subject}`);
  console.log('📧 Email sending is temporarily disabled. Email content logged below:');
  console.log('--- EMAIL CONTENT ---');
  console.log(html);
  console.log('--- END EMAIL CONTENT ---');
  console.log('✅ Email logged successfully (not sent)');
  console.log('');
  
  // Return true to prevent errors in the application flow
  return true;
}

// Generate magic link token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate magic link URL
function generateMagicLink(token: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/auth/magic-link?token=${token}`;
}

// Get entities by type for dropdowns
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

    // If there are validation errors, return them immediately
    if (errors.length > 0) {
      return res.status(400).json({
        error: `Found ${errors.length} validation error(s) in your Excel file`,
        errors,
        totalRecords: jsonData.length
      });
    }

    // Check if any valid students found
    if (students.length === 0) {
      return res.status(400).json({ 
        error: 'No valid student records found in the Excel file. Please check the format and try again.',
        errors 
      });
    }

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
    const existingStudents = defaultSchoolId ? await storage.getStudentsBySchool(defaultSchoolId) : [];
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
      entityId: defaultSchoolId || 0,
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
      schoolId: defaultSchoolId
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

// ===== AUTHENTICATION ROUTES =====

// Request magic link
router.post('/auth/magic-link/request', async (req: Request, res: Response) => {
  try {
    const { email } = magicLinkRequestSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate magic token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await storage.createMagicToken({
      token,
      email,
      expiresAt,
      purpose: 'LOGIN'
    });

    // Send magic link email
    const magicLink = generateMagicLink(token);
    const emailHtml = `
      <h2>Login to Smile Stars India</h2>
      <p>Hello ${user.name},</p>
      <p>Click the link below to log in to your account:</p>
      <a href="${magicLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Login to Account</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this login, please ignore this email.</p>
    `;

    await sendEmail(email, 'Login to Smile Stars India', emailHtml);

    res.json({ message: 'Magic link sent to your email' });
  } catch (error) {
    console.error('Magic link request error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Consume magic link
router.post('/auth/magic-link/consume', async (req: Request, res: Response) => {
  try {
    const { token } = magicLinkConsumeSchema.parse(req.body);
    
    const magicToken = await storage.getMagicTokenByToken(token);
    if (!magicToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (new Date() > magicToken.expiresAt) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    const user = await storage.getUserByEmail(magicToken.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check user status before proceeding
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ 
        error: 'Account suspended', 
        message: 'Your account has been suspended. Please contact admin@smilestarsindia.com for assistance.',
        status: 'SUSPENDED'
      });
    }

    // Handle different token types
    if (magicToken.type === 'FRANCHISE_AGREEMENT') {
      // Handle franchise agreement flow
      const franchiseeId = magicToken.metadata?.franchiseeId;
      if (!franchiseeId) {
        return res.status(400).json({ error: 'Invalid franchise agreement token' });
      }
      
      const franchisee = await storage.getEntityById(franchiseeId);
      if (!franchisee) {
        return res.status(404).json({ error: 'Franchisee not found' });
      }
      
      // Verify user has access to this franchisee
      if (!user.entityIds?.includes(franchiseeId)) {
        return res.status(403).json({ error: 'Access denied to this franchisee' });
      }
      
      // Mark token as used
      await storage.markMagicTokenUsed(token);
      
      // Get user memberships
      const memberships = await storage.getMembershipsByUser(user.id);
      const roles = memberships.map(m => m.role);
      
      // For franchise agreement flow, get both user and franchise agreements
      const userAgreements = await storage.getAgreementsByRole(roles);
      const franchiseAgreements = await storage.getAgreementsByRole(['FRANCHISE_ADMIN']); // Get franchise-specific agreements
      
      // Combine and deduplicate agreements
      const allAgreements = [...userAgreements, ...franchiseAgreements];
      const uniqueAgreements = allAgreements.filter((agreement, index, arr) => 
        arr.findIndex(a => a.id === agreement.id) === index
      );
      
      res.json({
        success: true,
        tokenType: 'FRANCHISE_AGREEMENT',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        },
        franchisee: {
          id: franchisee.id,
          name: franchisee.name,
          status: franchisee.status
        },
        requiresPasswordSetup: !user.password,
        requiresAgreements: true,
        pendingAgreements: uniqueAgreements.map(a => ({
          id: a.id,
          title: a.title,
          bodyMd: a.bodyMd
        })),
        token: token // Keep original token for agreement acceptance
      });
      return;
    }

    // Mark token as used for non-franchise agreement flows
    await storage.markMagicTokenUsed(token);

    // Get user memberships and check for required agreements
    const memberships = await storage.getMembershipsByUser(user.id);
    const roles = memberships.map(m => m.role);
    
    // Check for pending agreements based on user status
    let pendingAgreements = [];
    let requiresAgreements = false;
    
    if (user.status === 'PENDING') {
      // PENDING users must always accept agreements, regardless of previous acceptances
      const applicableAgreements = await storage.getAgreementsByRole(roles);
      pendingAgreements = applicableAgreements;
      requiresAgreements = true;
    } else if (user.status === 'ACTIVE') {
      // ACTIVE users don't need to see agreements
      requiresAgreements = false;
    }
    // Note: SUSPENDED users are already handled above with early return

    // Generate JWT
    const jwtToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        roles,
        entityIds: memberships.map(m => m.entityId)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
        status: user.status
      },
      requiresAgreements: requiresAgreements,
      pendingAgreements: pendingAgreements.map(a => ({
        id: a.id,
        title: a.title,
        bodyMd: a.bodyMd
      }))
    });
  } catch (error) {
    console.error('Magic link consume error:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});


// Traditional password login (for existing users)
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(401).json({ 
        error: 'Account not set up for password login. Please use magic link authentication.',
        requiresMagicLink: true
      });
    }

    // Check user status before password verification
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ 
        error: 'Account suspended', 
        message: 'Your account has been suspended. Please contact admin@smilestarsindia.com for assistance.',
        status: 'SUSPENDED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get user memberships and roles
    const memberships = await storage.getMembershipsByUser(user.id);
    const roles = memberships.map(m => m.role);
    const entityIds = memberships.map(m => m.entityId);

    // Check for pending agreements based on user status
    let pendingAgreements = [];
    let requiresAgreements = false;
    
    if (user.status === 'PENDING') {
      // PENDING users must always accept agreements, regardless of previous acceptances
      const applicableAgreements = await storage.getAgreementsByRole(roles);
      pendingAgreements = applicableAgreements;
      requiresAgreements = true;
    } else if (user.status === 'ACTIVE') {
      // ACTIVE users don't need to see agreements
      requiresAgreements = false;
    }
    // Note: SUSPENDED users are already handled above with early return

    // Create JWT token
    const jwtToken = jwt.sign(
      { 
        id: user.id,  // Fixed: using 'id' to match magic link login
        email: user.email,
        roles,
        entityIds 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
        status: user.status
      },
      requiresAgreements: requiresAgreements,
      pendingAgreements: pendingAgreements.map(a => ({
        id: a.id,
        title: a.title,
        bodyMd: a.bodyMd
      }))
    });
    
    console.log(`✅ User logged in via password: ${user.email} (${roles.join(', ')})`);
  } catch (error) {
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
      if (!magicToken || !['FRANCHISE_AGREEMENT', 'SCHOOL_AGREEMENT'].includes(magicToken.type)) {
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
      tokenType = magicToken.type;
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
      role,
      isPrimary: true,
      validFrom: new Date()
    });

    // Generate magic token for invitation
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await storage.createMagicToken({
      token,
      email,
      expiresAt,
      purpose: 'INVITE',
      metadata: {
        targetEntityId,
        targetRole: role,
        invitedBy: req.user!.id
      }
    });

    // Send invitation email
    const magicLink = generateMagicLink(token);
    const emailHtml = `
      <h2>Welcome to Smile Stars India</h2>
      <p>Hello ${name},</p>
      <p>You have been invited to join Smile Stars India as a ${role}.</p>
      <p>Click the link below to set up your account:</p>
      <a href="${magicLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Set Up Account</a>
      <p>This invitation will expire in 48 hours.</p>
    `;

    await sendEmail(email, 'Welcome to Smile Stars India', emailHtml, 'admin@smilestarsindia.com');

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
    res.json(camps);
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
router.post('/camps', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Camp creation request body:', req.body);
    console.log('Start date type:', typeof req.body.startDate);
    console.log('End date type:', typeof req.body.endDate);
    
    // Convert date strings to Date objects before schema validation
    const requestBody = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
    };
    
    console.log('Converted request body:', requestBody);
    console.log('Converted start date type:', typeof requestBody.startDate);
    
    const campData = insertCampSchema.parse(requestBody);
    campData.createdBy = req.user!.id;
    
    const camp = await storage.createCamp(campData);
    
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

// ===== SCREENING ROUTES =====

// Get screenings
router.get('/screenings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screenings = await storage.getAllScreenings();
    res.json(screenings);
  } catch (error) {
    console.error('Get screenings error:', error);
    res.status(500).json({ error: 'Failed to get screenings' });
  }
});

// Create screening
router.post('/screenings', authenticateToken, requireRole(['DENTIST']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screeningData = insertScreeningSchema.parse(req.body);
    screeningData.dentistUserId = req.user!.id;
    
    const screening = await storage.createScreening(screeningData);
    res.json(screening);
  } catch (error) {
    console.error('Create screening error:', error);
    res.status(500).json({ error: 'Failed to create screening' });
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
      activeCamps: camps.filter(c => c.status === 'active').length,
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
    
    // Extract contact person details from metadata
    const contactEmail = metadata?.franchiseContactEmail;
    const contactPerson = metadata?.franchiseContactPerson;
    
    if (!contactEmail || !contactPerson) {
      return res.status(400).json({ error: 'Contact email and person name are required' });
    }
    
    // Create franchisee entity in DRAFT status (will be ACTIVE after agreement acceptance)
    const franchiseeData = {
      ...entityData,
      type: 'FRANCHISEE' as const,
      parentId: 1, // Assume parent is Smile Stars India organization
      status: 'DRAFT', // Start in draft status, will be activated after agreement
      metadata
    };
    
    const entity = await storage.createEntity(franchiseeData);
    
    // Create primary contact user with FRANCHISE_ADMIN role
    let primaryContactUser = await storage.getUserByEmail(contactEmail);
    
    if (!primaryContactUser) {
      // Create new user
      const userData = {
        email: contactEmail,
        name: contactPerson, // Use name field instead of firstName/lastName
        status: 'PENDING' as const,
        entityIds: [entity.id]
      };
      
      primaryContactUser = await storage.createUser(userData);
    } else {
      // Add entity to existing user's access
      const currentEntityIds = primaryContactUser.entityIds || [];
      if (!currentEntityIds.includes(entity.id)) {
        await storage.updateUser(primaryContactUser.id, {
          entityIds: [...currentEntityIds, entity.id]
        });
      }
    }
    
    // Create membership with FRANCHISE_ADMIN role
    await storage.createMembership({
      userId: primaryContactUser.id,
      entityId: entity.id,
      role: 'FRANCHISE_ADMIN'
    });
    
    // Generate magic token for agreement acceptance
    const token = generateToken(); // Generate the actual token string
    const magicToken = await storage.createMagicToken({
      email: contactEmail,
      token: token,
      type: 'FRANCHISE_AGREEMENT',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        franchiseeId: entity.id,
        franchiseeName: entity.name,
        userId: primaryContactUser.id
      }
    });
    
    // Send email with agreement link
    const agreementUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/franchise/agreement/${magicToken.token}`;
    const emailHtml = `
      <h2>Welcome to Smile Stars India!</h2>
      <p>Hello ${contactPerson},</p>
      
      <p>Congratulations! Your franchise application for <strong>${entity.name}</strong> has been created successfully.</p>
      
      <p>To activate your franchise and begin operations, you need to:</p>
      <ol>
        <li>Review and accept the Franchise Agreement</li>
        <li>Review and accept our User Terms & Conditions</li>
        <li>Set up your account password</li>
      </ol>
      
      <p>Please click the link below to complete the agreement process:</p>
      <p><a href="${agreementUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Agreements & Activate Franchise</a></p>
      
      <p>This link will expire in 7 days. If you need assistance, please contact our support team.</p>
      
      <p>Best regards,<br>Smile Stars India Team</p>
    `;
    
    await sendEmail(contactEmail, 'Welcome to Smile Stars India - Complete Your Franchise Setup', emailHtml);
    
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
    res.status(500).json({ error: 'Failed to create franchise' });
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
    
    // Check if franchise has any schools before deleting
    const schools = await storage.getEntitiesByParent(entityId);
    if (schools.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete franchise. It has ${schools.length} school(s) associated with it. Please reassign or delete the schools first.` 
      });
    }
    
    const entity = await storage.getEntityById(entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Franchise not found' });
    }
    
    // Get all memberships for this entity to find associated users
    const memberships = await storage.getMembershipsByEntity(entityId);
    const associatedUserIds = memberships.map(m => m.userId);
    
    // Delete all memberships for this entity
    for (const membership of memberships) {
      await storage.deleteMembership(membership.id);
    }
    
    // For each user, check if they have other memberships
    // If not, delete the user completely
    const usersToDelete = [];
    for (const userId of associatedUserIds) {
      const userMemberships = await storage.getMembershipsByUser(userId);
      if (userMemberships.length === 0) {
        // User has no other memberships, safe to delete
        usersToDelete.push(userId);
      }
    }
    
    // Delete users who have no other memberships
    for (const userId of usersToDelete) {
      await storage.deleteUser(userId);
    }
    
    // Delete the franchise entity
    await storage.deleteEntity(entityId);
    
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'DELETE_ENTITY',
      entityId: entityId,
      metadata: { 
        entityType: 'FRANCHISEE', 
        entityName: entity.name,
        deletedUsers: usersToDelete.length,
        deletedMemberships: memberships.length
      }
    });

    res.json({ 
      message: 'Franchise deleted successfully',
      details: {
        deletedUsers: usersToDelete.length,
        deletedMemberships: memberships.length
      }
    });
  } catch (error) {
    console.error('Delete franchise error:', error);
    res.status(500).json({ error: 'Failed to delete franchise' });
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
    
    // BUSINESS RULE: Every school must belong to exactly one franchise
    if (!parentId) {
      return res.status(400).json({ error: 'School must be assigned to a franchise (parentId required)' });
    }
    
    // Verify the parentId is a valid FRANCHISEE
    const parentEntity = await storage.getEntityById(parentId);
    if (!parentEntity || parentEntity.type !== 'FRANCHISEE') {
      return res.status(400).json({ error: 'Parent entity must be a valid franchise' });
    }
    
    // Check if school with same name already exists under ANY franchise
    const existingSchools = await storage.getEntitiesByType('SCHOOL');
    const duplicateSchool = existingSchools.find(school => 
      school.name.toLowerCase() === entityData.name.toLowerCase()
    );
    
    if (duplicateSchool) {
      return res.status(400).json({ 
        error: 'School name already exists', 
        message: `A school named "${entityData.name}" already exists under another franchise. Each school can only belong to one franchise.`
      });
    }
    
    // Create school entity in DRAFT status (will be ACTIVE after agreement acceptance)
    const schoolData = {
      ...entityData,
      type: 'SCHOOL' as const,
      status: 'DRAFT', // Start in draft status, will be activated after agreement
      parentId, // Ensure school is properly assigned to franchise
      metadata
    };
    
    const entity = await storage.createEntity(schoolData);
    
    // Create primary contact user (principal) with SCHOOL_ADMIN role
    let principalUser = await storage.getUserByEmail(contactEmail);
    
    if (!principalUser) {
      // Create new user
      const userData = {
        email: contactEmail,
        name: contactPerson,
        status: 'PENDING' as const
      };
      
      principalUser = await storage.createUser(userData);
    }
    
    // Create membership with SCHOOL_ADMIN role
    await storage.createMembership({
      userId: principalUser.id,
      entityId: entity.id,
      role: 'SCHOOL_ADMIN',
      isPrimary: true,
      validFrom: new Date()
    });
    
    // Generate magic token for agreement acceptance
    const token = generateToken();
    const magicToken = await storage.createMagicToken({
      email: contactEmail,
      token: token,
      type: 'SCHOOL_AGREEMENT',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        schoolId: entity.id,
        schoolName: entity.name,
        userId: principalUser.id
      }
    });
    
    // Send email with agreement link
    const agreementUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/school/agreement/${magicToken.token}`;
    const emailHtml = `
      <h2>Welcome to Smile Stars India School Program!</h2>
      <p>Hello ${contactPerson},</p>
      
      <p>Congratulations! Your school <strong>${entity.name}</strong> has been enrolled in the Smile Stars India dental care program.</p>
      
      <p>To activate your school's participation and begin scheduling dental camps, you need to:</p>
      <ol>
        <li>Review and accept the School Participation Agreement</li>
        <li>Review and accept our Terms & Conditions</li>
        <li>Set up your account password</li>
      </ol>
      
      <p>Please click the link below to complete the agreement process:</p>
      <p><a href="${agreementUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Agreements & Activate School</a></p>
      
      <p>This link will expire in 7 days. If you need assistance, please contact our support team.</p>
      
      <p>Best regards,<br>Smile Stars India Team</p>
    `;
    
    await sendEmail(contactEmail, 'Welcome to Smile Stars India School Program - Complete Your Setup', emailHtml, 'admin@smilestarsindia.com');
    
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
    res.status(500).json({ error: 'Failed to create school' });
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
    
    // Check if school exists
    const entity = await storage.getEntityById(entityId);
    if (!entity || entity.type !== 'SCHOOL') {
      return res.status(404).json({ error: 'School not found' });
    }
    
    // Check if school has any students before deleting
    const students = await storage.getEntitiesByParent(entityId);
    if (students.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete school. It has ${students.length} student(s) associated with it. Please reassign or delete the students first.` 
      });
    }
    
    // Get all memberships for this entity to find associated users
    const memberships = await storage.getMembershipsByEntity(entityId);
    const associatedUserIds = memberships.map(m => m.userId);
    
    // Delete all memberships for this entity
    for (const membership of memberships) {
      await storage.deleteMembership(membership.id);
    }
    
    // For each user, check if they have other memberships
    // If not, delete the user completely (for users created specifically for this school)
    const usersToDelete = [];
    for (const userId of associatedUserIds) {
      const userMemberships = await storage.getMembershipsByUser(userId);
      if (userMemberships.length === 0) {
        // User has no other memberships, safe to delete
        usersToDelete.push(userId);
      }
    }
    
    // Delete users who have no other memberships
    for (const userId of usersToDelete) {
      await storage.deleteUser(userId);
    }
    
    // Delete the school entity
    await storage.deleteEntity(entityId);
    
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'DELETE_ENTITY',
      entityId: entityId,
      metadata: { 
        entityType: 'SCHOOL', 
        entityName: entity.name,
        deletedUsers: usersToDelete.length,
        deletedMemberships: memberships.length
      }
    });

    res.json({ 
      message: 'School deleted successfully',
      details: {
        deletedUsers: usersToDelete.length,
        deletedMemberships: memberships.length
      }
    });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

// GET /api/students - return STUDENT entities
router.get('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campId, franchiseeId, schoolId, page = '1', pageSize = '20', search } = req.query;
    const students = await storage.getEntitiesByType('STUDENT');
    
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
      filteredStudents = students.filter(entity => {
        return accessibleEntityIds.includes(entity.id) || accessibleEntityIds.includes(entity.parentId || 0);
      });
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
router.get('/reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // For now, return empty array - will be implemented when reports storage is added
    res.json([]);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Get reports for current parent's children (optimized endpoint)
router.get('/reports/my-children', authenticateToken, requireRole(['PARENT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // For now, return empty array with proper structure for parents
    // This will be much faster than loading all system data
    res.json([]);
  } catch (error) {
    console.error('Get parent children reports error:', error);
    res.status(500).json({ error: 'Failed to get children reports' });
  }
});

export default router;