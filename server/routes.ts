import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { 
  insertUserSchema, loginSchema, insertFranchiseSchema, insertSchoolSchema, insertCampSchema,
  insertCampApprovalSchema, insertStudentSchema, insertScreeningSchema, insertReportSchema,
  User
} from "@shared/schema";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dental-care-secret-key";

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@smilestars.com',
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS || 'defaultpass'
  }
});

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Auth routes
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' });
  }
});

router.post('/auth/register', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' });
  }
});

router.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await storage.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User Management routes (Admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    // Remove password from response for security
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response for security
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/users', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    });

    // Remove password from response
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

router.put('/users/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const userData = req.body;

    // If password is being updated, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const updatedUser = await storage.updateUser(userId, userData);
    
    // Remove password from response
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      phoneNumber: updatedUser.phoneNumber,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent admin from deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, we'll deactivate the user instead of hard delete to maintain data integrity
    await storage.updateUser(userId, { isActive: false });
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// Schools routes
router.get('/schools', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getAllSchools();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.post('/schools', authenticateToken, requireRole(['admin', 'franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schoolData = insertSchoolSchema.parse(req.body);
    const school = await storage.createSchool(schoolData);
    res.status(201).json(school);
  } catch (error) {
    res.status(400).json({ error: 'Invalid school data' });
  }
});

router.get('/schools/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const school = await storage.getSchoolById(parseInt(req.params.id));
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json(school);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

router.put('/schools/:id', authenticateToken, requireRole(['admin', 'franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schoolId = parseInt(req.params.id);
    const schoolData = insertSchoolSchema.parse(req.body);
    
    const existingSchool = await storage.getSchoolById(schoolId);
    if (!existingSchool) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    const updatedSchool = await storage.updateSchool(schoolId, schoolData);
    res.json(updatedSchool);
  } catch (error) {
    res.status(400).json({ error: 'Invalid school data' });
  }
});

router.delete('/schools/:id', authenticateToken, requireRole(['admin', 'franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schoolId = parseInt(req.params.id);
    
    const existingSchool = await storage.getSchoolById(schoolId);
    if (!existingSchool) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    await storage.deleteSchool(schoolId);
    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete school';
    // Check if this is a dependency error
    if (errorMessage.includes('Cannot delete school. It has associated')) {
      return res.status(409).json({ error: errorMessage }); // 409 Conflict for dependency issues
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Franchises routes
router.get('/franchises', authenticateToken, requireRole(['admin', 'franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchises = await storage.getAllFranchises();
    res.json(franchises);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchises' });
  }
});

router.post('/franchises', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchiseData = insertFranchiseSchema.parse(req.body);
    const franchise = await storage.createFranchise(franchiseData);
    res.status(201).json(franchise);
  } catch (error) {
    res.status(400).json({ error: 'Invalid franchise data' });
  }
});

router.get('/franchises/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchise = await storage.getFranchiseById(parseInt(req.params.id));
    if (!franchise) {
      return res.status(404).json({ error: 'Franchise not found' });
    }
    res.json(franchise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchise' });
  }
});

router.get('/franchises/:id/schools', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getSchoolsByFranchise(parseInt(req.params.id));
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchise schools' });
  }
});

router.get('/franchises/:id/camps', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const camps = await storage.getCampsByFranchise(parseInt(req.params.id));
    res.json(camps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchise camps' });
  }
});

// Camps routes
router.get('/camps', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let camps;
    if (req.user!.role === 'dentist') {
      camps = await storage.getCampsByDentist(req.user!.id);
    } else {
      camps = await storage.getAllCamps();
    }

    // Enhance camps with school information
    const enhancedCamps = await Promise.all(
      camps.map(async (camp) => {
        const school = await storage.getSchoolById(camp.schoolId);
        const students = await storage.getStudentsByCamp(camp.id);
        const screenings = await storage.getScreeningsByCamp(camp.id);
        
        return {
          ...camp,
          school,
          studentsCount: students.length,
          screeningsCount: screenings.length
        };
      })
    );

    res.json(enhancedCamps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch camps' });
  }
});

router.post('/camps', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campData = insertCampSchema.parse({
      ...req.body,
      createdBy: req.user!.id
    });
    const camp = await storage.createCamp(campData);
    res.status(201).json(camp);
  } catch (error) {
    res.status(400).json({ error: 'Invalid camp data' });
  }
});

router.get('/camps/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const camp = await storage.getCampById(parseInt(req.params.id));
    if (!camp) {
      return res.status(404).json({ error: 'Camp not found' });
    }

    const school = await storage.getSchoolById(camp.schoolId);
    const students = await storage.getStudentsByCamp(camp.id);
    const screenings = await storage.getScreeningsByCamp(camp.id);
    const approval = await storage.getCampApprovalByCamp(camp.id);

    res.json({
      ...camp,
      school,
      students,
      screenings,
      approval
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch camp' });
  }
});

// Camp Approval routes
router.get('/camp-approvals', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const approvals = await storage.getAllCampApprovals();
    
    // Enhance with camp and school information
    const enhancedApprovals = await Promise.all(
      approvals.map(async (approval) => {
        const camp = await storage.getCampById(approval.campId);
        const school = camp ? await storage.getSchoolById(camp.schoolId) : null;
        return {
          ...approval,
          camp,
          school
        };
      })
    );

    res.json(enhancedApprovals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch camp approvals' });
  }
});

router.post('/camp-approvals', authenticateToken, requireRole(['admin', 'franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const approvalData = insertCampApprovalSchema.parse({
      ...req.body,
      submittedBy: req.user!.id
    });
    const approval = await storage.createCampApproval(approvalData);
    res.status(201).json(approval);
  } catch (error) {
    res.status(400).json({ error: 'Invalid approval data' });
  }
});

router.put('/camp-approvals/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const approval = await storage.updateCampApproval(
      parseInt(req.params.id),
      {
        ...req.body,
        reviewedBy: req.user!.id,
        reviewedAt: new Date()
      }
    );
    res.json(approval);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update approval' });
  }
});

router.get('/camp-approvals/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const approval = await storage.getCampApprovalById(parseInt(req.params.id));
    if (!approval) {
      return res.status(404).json({ error: 'Camp approval not found' });
    }
    
    const camp = await storage.getCampById(approval.campId);
    const school = camp ? await storage.getSchoolById(camp.schoolId) : null;
    
    res.json({
      ...approval,
      camp,
      school
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch camp approval' });
  }
});

// Students routes
router.get('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campId } = req.query;
    let students;
    
    if (campId) {
      students = await storage.getStudentsByCamp(parseInt(campId as string));
    } else {
      students = await storage.getAllStudents();
    }

    // Enhance students with screening information
    const enhancedStudents = await Promise.all(
      students.map(async (student) => {
        const screening = await storage.getScreeningByStudent(student.id);
        return {
          ...student,
          hasScreening: !!screening,
          screeningCompleted: screening?.isCompleted || false
        };
      })
    );

    res.json(enhancedStudents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.post('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentData = insertStudentSchema.parse(req.body);
    const student = await storage.createStudent(studentData);
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: 'Invalid student data' });
  }
});

// Screenings routes
router.get('/screenings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campId, studentId, dentistId } = req.query;
    let screenings;

    if (campId) {
      screenings = await storage.getScreeningsByCamp(parseInt(campId as string));
    } else if (studentId) {
      const screening = await storage.getScreeningByStudent(parseInt(studentId as string));
      screenings = screening ? [screening] : [];
    } else if (dentistId || req.user!.role === 'dentist') {
      screenings = await storage.getScreeningsByDentist(
        dentistId ? parseInt(dentistId as string) : req.user!.id
      );
    } else {
      screenings = await storage.getAllScreenings();
    }

    res.json(screenings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch screenings' });
  }
});

router.post('/screenings', authenticateToken, requireRole(['dentist', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screeningData = insertScreeningSchema.parse({
      ...req.body,
      dentistId: req.user!.id
    });
    const screening = await storage.createScreening(screeningData);
    res.status(201).json(screening);
  } catch (error) {
    res.status(400).json({ error: 'Invalid screening data' });
  }
});

router.put('/screenings/:id', authenticateToken, requireRole(['dentist', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const screening = await storage.updateScreening(
      parseInt(req.params.id),
      req.body
    );
    res.json(screening);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update screening' });
  }
});

// Reports routes
router.get('/reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.query;
    let reports;

    if (req.user!.role === 'parent') {
      // Parents can only see their child's reports
      reports = await storage.getReportsByStudent(parseInt(studentId as string));
    } else if (studentId) {
      reports = await storage.getReportsByStudent(parseInt(studentId as string));
    } else {
      reports = await storage.getAllReports();
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.post('/reports', authenticateToken, requireRole(['dentist', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportData = insertReportSchema.parse({
      ...req.body,
      generatedBy: req.user!.id
    });
    const report = await storage.createReport(reportData);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: 'Invalid report data' });
  }
});

router.post('/reports/:id/send', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await storage.getReportById(parseInt(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const student = await storage.getStudentById(report.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Send email with report
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@smilestars.com',
      to: student.parentEmail,
      subject: `Dental Health Report for ${student.name}`,
      html: `
        <h2>Smile Stars India - Dental Health Report</h2>
        <p>Dear ${student.parentName},</p>
        <p>Please find attached the dental health report for your child ${student.name}.</p>
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br>Smile Stars India Team</p>
      `,
      attachments: report.pdfData ? [{
        filename: `dental-report-${student.name}.pdf`,
        content: report.pdfData,
        encoding: 'base64'
      }] : []
    };

    await transporter.sendMail(mailOptions);

    // Update report as sent
    await storage.updateReport(report.id, {
      sentToParent: true,
      sentAt: new Date()
    });

    res.json({ message: 'Report sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send report' });
  }
});

// Dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getAllSchools();
    const camps = await storage.getAllCamps();
    const students = await storage.getAllStudents();
    const screenings = await storage.getAllScreenings();
    const reports = await storage.getAllReports();

    const activeCamps = camps.filter(c => c.status === 'active');
    const completedScreenings = screenings.filter(s => s.isCompleted);

    res.json({
      totalSchools: schools.length,
      totalCamps: camps.length,
      activeCamps: activeCamps.length,
      studentsScreened: completedScreenings.length,
      reportsGenerated: reports.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
