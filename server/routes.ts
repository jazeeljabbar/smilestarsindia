import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { 
  insertUserSchema, loginSchema, insertSchoolSchema, insertCampSchema,
  insertStudentSchema, insertScreeningSchema, insertReportSchema,
  User
} from "@shared/schema";

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
const authenticateToken = (req: any, res: any, next: any) => {
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
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
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

    // For demo purposes, accept "password" for all demo users
    // In production, use: const isValidPassword = await bcrypt.compare(password, user.password);
    const isValidPassword = password === 'password';

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

router.post('/auth/register', async (req, res) => {
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

router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await storage.getUserById(req.user.id);
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

// Schools routes
router.get('/schools', authenticateToken, async (req, res) => {
  try {
    const schools = await storage.getAllSchools();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

router.post('/schools', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const schoolData = insertSchoolSchema.parse(req.body);
    const school = await storage.createSchool(schoolData);
    res.status(201).json(school);
  } catch (error) {
    res.status(400).json({ error: 'Invalid school data' });
  }
});

router.get('/schools/:id', authenticateToken, async (req, res) => {
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

// Camps routes
router.get('/camps', authenticateToken, async (req, res) => {
  try {
    let camps;
    if (req.user.role === 'dentist') {
      camps = await storage.getCampsByDentist(req.user.id);
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

router.post('/camps', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campData = insertCampSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    const camp = await storage.createCamp(campData);
    res.status(201).json(camp);
  } catch (error) {
    res.status(400).json({ error: 'Invalid camp data' });
  }
});

router.get('/camps/:id', authenticateToken, async (req, res) => {
  try {
    const camp = await storage.getCampById(parseInt(req.params.id));
    if (!camp) {
      return res.status(404).json({ error: 'Camp not found' });
    }

    const school = await storage.getSchoolById(camp.schoolId);
    const students = await storage.getStudentsByCamp(camp.id);
    const screenings = await storage.getScreeningsByCamp(camp.id);

    res.json({
      ...camp,
      school,
      students,
      screenings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch camp' });
  }
});

// Students routes
router.get('/students', authenticateToken, async (req, res) => {
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

router.post('/students', authenticateToken, async (req, res) => {
  try {
    const studentData = insertStudentSchema.parse(req.body);
    const student = await storage.createStudent(studentData);
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: 'Invalid student data' });
  }
});

// Screenings routes
router.get('/screenings', authenticateToken, async (req, res) => {
  try {
    const { campId, studentId, dentistId } = req.query;
    let screenings;

    if (campId) {
      screenings = await storage.getScreeningsByCamp(parseInt(campId as string));
    } else if (studentId) {
      const screening = await storage.getScreeningByStudent(parseInt(studentId as string));
      screenings = screening ? [screening] : [];
    } else if (dentistId || req.user.role === 'dentist') {
      screenings = await storage.getScreeningsByDentist(
        dentistId ? parseInt(dentistId as string) : req.user.id
      );
    } else {
      screenings = await storage.getAllScreenings();
    }

    res.json(screenings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch screenings' });
  }
});

router.post('/screenings', authenticateToken, requireRole(['dentist', 'admin']), async (req, res) => {
  try {
    const screeningData = insertScreeningSchema.parse({
      ...req.body,
      dentistId: req.user.id
    });
    const screening = await storage.createScreening(screeningData);
    res.status(201).json(screening);
  } catch (error) {
    res.status(400).json({ error: 'Invalid screening data' });
  }
});

router.put('/screenings/:id', authenticateToken, requireRole(['dentist', 'admin']), async (req, res) => {
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
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.query;
    let reports;

    if (req.user.role === 'parent') {
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

router.post('/reports', authenticateToken, requireRole(['dentist', 'admin']), async (req, res) => {
  try {
    const reportData = insertReportSchema.parse({
      ...req.body,
      generatedBy: req.user.id
    });
    const report = await storage.createReport(reportData);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: 'Invalid report data' });
  }
});

router.post('/reports/:id/send', authenticateToken, requireRole(['admin']), async (req, res) => {
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
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
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
