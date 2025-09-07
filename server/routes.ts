import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { MailService } from '@sendgrid/mail';
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

// Initialize test users if they don't exist
async function initializeTestUsers() {
  const testUsers = [
    {
      email: 'admin@smilestars.com',
      password: '12345',
      name: 'Admin User',
      role: 'admin',
      isActive: true
    },
    {
      email: 'e.jazeel@gmail.com',
      password: '12345',
      name: 'Jazeel Franchise',
      role: 'franchisee',
      isActive: true
    },
    {
      email: 'school@example.com',
      password: '12345',
      name: 'School Admin',
      role: 'school_admin',
      isActive: true
    },
    {
      email: 'dentist@example.com',
      password: '12345',
      name: 'Dr. Smith',
      role: 'dentist',
      isActive: true
    },
    {
      email: 'parent@example.com',
      password: '12345',
      name: 'Parent User',
      role: 'parent',
      isActive: true
    }
  ];

  for (const userData of testUsers) {
    try {
      const existingUser = await storage.getUserByEmail(userData.email);
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await storage.createUser({
          ...userData,
          password: hashedPassword
        });
        console.log(`Created test user: ${userData.email}`);
      } else {
        // Update existing user with correct password hash
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await storage.updateUser(existingUser.id, {
          password: hashedPassword
        });
        console.log(`Updated password for existing user: ${userData.email}`);
      }
    } catch (error) {
      console.error(`Failed to create/update test user ${userData.email}:`, error);
    }
  }
}

// Initialize test users on startup
initializeTestUsers().catch(console.error);

// Create test franchise for the franchisee user
async function initializeTestFranchise() {
  try {
    const franchiseeUser = await storage.getUserByEmail('e.jazeel@gmail.com');
    if (franchiseeUser) {
      const existingFranchises = await storage.getFranchisesByUser(franchiseeUser.id);
      if (existingFranchises.length === 0) {
        await storage.createFranchise({
          name: 'Mumbai West Franchise',
          region: 'Mumbai West',
          contactPerson: 'Jazeel Franchise',
          contactEmail: 'e.jazeel@gmail.com',
          contactPhone: '+91-98765-43210',
          address: 'Mumbai, Maharashtra',
          city: 'Mumbai',
          state: 'Maharashtra',
          agreementStatus: 'pending',
          franchiseeUserId: franchiseeUser.id
        });
        console.log('Created test franchise for franchisee user');
      }
    }
  } catch (error) {
    console.error('Failed to create test franchise:', error);
  }
}

// Initialize test franchise after users
setTimeout(() => initializeTestFranchise().catch(console.error), 1000);

// Email configuration - Use SendGrid
let mailService: MailService | null = null;
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Fallback to Nodemailer for development (optional)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@smilestars.com',
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS || 'defaultpass'
  }
});

// Email sending function
async function sendEmail(to: string, subject: string, html: string, from: string = 'hope@hopelog.com') {
  console.log('=== SENDING EMAIL ===');
  console.log(`To: ${to}`);
  console.log(`From: ${from}`);
  console.log(`Subject: ${subject}`);
  
  if (mailService && process.env.SENDGRID_API_KEY) {
    try {
      await mailService.send({
        to,
        from,
        subject,
        html,
      });
      console.log(`✅ Email sent successfully to ${to} via SendGrid`);
      return true;
    } catch (error: any) {
      console.error('❌ SendGrid email error:', error);
      console.error('SendGrid error details:', error.response?.body);
      return false;
    }
  } else {
    console.log('📧 No SendGrid API key configured');
    return false;
  }
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('=== AUTHENTICATE TOKEN MIDDLEWARE ===');
  console.log('Request URL:', req.url);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
    console.log('Token verified, user:', user);
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('=== REQUIRE ROLE MIDDLEWARE ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user?.role);
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('Role check failed - insufficient permissions');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    console.log('Role check passed');
    next();
  };
};

// Auth routes
router.post('/auth/login', async (req, res) => {
  try {
    
    const { username, password } = loginSchema.parse(req.body);
    console.log('Parsed login data:', { username, passwordLength: password?.length });
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      console.log('User not found for username:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', { id: user.id, username: user.username, email: user.email, role: user.role });

    // Check password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log('Password validation failed for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', username);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error && typeof error === 'object' && 'errors' in error) {
      console.error('Validation errors:', (error as any).errors);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: 'Invalid request data', details: message });
  }
});

router.post('/auth/register', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists (by email or username)
    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const existingUserByUsername = await storage.getUserByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username already taken' });
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
      username: user.username,
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
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      status: user.status,
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
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      status: user.status,
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
      status: user.status,
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
      status: updatedUser.status,
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
    await storage.updateUser(userId, { status: 'inactive' });
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// Update user status endpoint
router.patch('/users/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, inactive, or suspended' });
    }
    
    // Prevent admin from suspending themselves
    if (userId === req.user!.id && status === 'suspended') {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await storage.updateUser(userId, { status });
    
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      phoneNumber: updatedUser.phoneNumber,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user status' });
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
    
    // Set standard password for school admin
    const schoolAdminPassword = '12345';
    
    // Create user account for school admin (if contact email provided)
    let schoolAdminUser = null;
    if (schoolData.contactEmail && schoolData.contactPerson) {
      try {
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(schoolData.contactEmail);
        if (existingUser) {
          console.log(`User already exists for email: ${schoolData.contactEmail}`);
          schoolAdminUser = existingUser;
        } else {
          const hashedPassword = await bcrypt.hash(schoolAdminPassword, 10);
          schoolAdminUser = await storage.createUser({
            email: schoolData.contactEmail,
            password: hashedPassword,
            name: schoolData.contactPerson,
            role: 'school_admin',
            phoneNumber: schoolData.contactPhone || undefined,
            status: 'inactive', // Will be activated when they accept agreement
          });
          console.log(`Created school admin user: ${schoolData.contactEmail}`);
        }
      } catch (userError: any) {
        // If user creation fails (e.g., email exists), continue without user
        console.warn('Failed to create school admin user:', userError.message);
      }
    }

    // Generate agreement token
    const agreementToken = jwt.sign(
      { schoolId: 'temp', email: schoolData.contactEmail },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 days to accept agreement
    );

    // Create school with user link and agreement token
    const school = await storage.createSchool({
      ...schoolData,
      adminUserId: schoolAdminUser?.id || undefined,
      agreementToken,
      agreementStatus: 'pending',
    });

    // Update the token with actual school ID
    const finalAgreementToken = jwt.sign(
      { schoolId: school.id, email: schoolData.contactEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update school with final token
    await storage.updateSchool(school.id, {
      agreementToken: finalAgreementToken,
    });

    // Send welcome email with agreement link (if contact email provided)
    if (schoolData.contactEmail && schoolData.contactPerson) {
      try {
        const loginUrl = `${req.protocol}://${req.get('host')}/login`;
        
        await sendEmail(
          schoolData.contactEmail,
          'Welcome to Smile Stars India - School Registration Complete',
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Welcome to Smile Stars India!</h2>
              
              <p>Dear ${schoolData.contactPerson},</p>
              
              <p>Congratulations! Your school <strong>${schoolData.name}</strong> has been successfully registered in our dental care platform.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Your School Admin Login Details:</h3>
                <p><strong>Email:</strong> ${schoolData.contactEmail}</p>
                <p><strong>Password:</strong> ${schoolAdminPassword}</p>
                <p><strong>School:</strong> ${schoolData.name}</p>
                <p><strong>Location:</strong> ${schoolData.city}, ${schoolData.state}</p>
              </div>
              
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">Next Steps:</h3>
                <ol style="color: #065f46;">
                  <li><strong>Login to your account:</strong> <a href="${loginUrl}" style="color: #2563eb;">Click here to access your dashboard</a></li>
                  <li><strong>Review and accept the agreement</strong> to activate your account</li>
                  <li><strong>Start scheduling dental camps</strong> for your students</li>
                  <li><strong>Manage student registrations</strong> for upcoming camps</li>
                </ol>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>Important:</strong> You must accept the school agreement when you first login to activate your account and start using the platform.</p>
              </div>
              
              <p>Our platform will help you:</p>
              <ul>
                <li>Schedule preventive dental camps for your students</li>
                <li>Manage student registrations and data</li>
                <li>Track dental screenings and reports</li>
                <li>Communicate with parents about their child's dental health</li>
              </ul>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              The Smile Stars India Team</p>
            </div>
          `
        );
        
        res.status(201).json({
          success: true,
          message: 'School registered successfully and welcome email sent',
          school: {
            id: school.id,
            name: school.name,
            city: school.city,
            state: school.state,
            agreementStatus: school.agreementStatus,
          },
        });
      } catch (emailError) {
        console.error('Failed to send school welcome email:', emailError);
        res.status(201).json({
          success: true,
          message: 'School registered successfully, but email delivery failed. Please contact the school manually.',
          school: {
            id: school.id,
            name: school.name,
            city: school.city,
            state: school.state,
            agreementStatus: school.agreementStatus,
          },
        });
      }
    } else {
      res.status(201).json({
        success: true,
        message: 'School registered successfully (no email sent - contact email not provided)',
        school: {
          id: school.id,
          name: school.name,
          city: school.city,
          state: school.state,
          agreementStatus: school.agreementStatus,
        },
      });
    }
  } catch (error) {
    console.error('School creation error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: `Email address already exists. Please use a different email.` 
      });
    }
    
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// School Admin specific routes - MUST come before general schools/:id routes  
console.log('🚀 Registering /schools/my-school route');
router.get('/schools/my-school', authenticateToken, requireRole(['school_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== MY-SCHOOL API CALLED ===');
    console.log('User from middleware:', req.user);
    console.log('Getting schools for user ID:', req.user!.id);
    const schools = await storage.getSchoolsByUser(req.user!.id);
    console.log('Found schools:', schools.length, schools);
    if (schools.length === 0) {
      console.log('No schools found for user:', req.user!.id);
      return res.status(404).json({ error: 'No school found for this user' });
    }
    console.log('About to return school:', schools[0]);
    const school = schools[0];
    const response = {
      id: school.id,
      name: school.name,
      address: school.address,
      city: school.city,
      state: school.state,
      pincode: school.pincode,
      contactPerson: school.contactPerson,
      contactPhone: school.contactPhone,
      contactEmail: school.contactEmail,
      adminUserId: school.adminUserId,
      franchiseId: school.franchiseId,
      registrationNumber: school.registrationNumber,
      hasSubBranches: school.hasSubBranches,
      parentSchoolId: school.parentSchoolId,
      agreementStatus: school.agreementStatus,
      agreementAcceptedAt: school.agreementAcceptedAt ? school.agreementAcceptedAt.toISOString() : null,
      agreementToken: school.agreementToken,
      status: school.status || 'active',
      createdAt: school.createdAt ? school.createdAt.toISOString() : null,
    };
    console.log('Sending response:', response);
    res.json(response);
    console.log('=== RESPONSE SENT ===');
  } catch (error) {
    console.error('=== ERROR IN MY-SCHOOL API ===');
    console.error('Error fetching school data:', error);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({ error: 'Failed to fetch school data' });
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

router.get('/franchises/my-franchise', authenticateToken, requireRole(['franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchises = await storage.getFranchisesByUser(req.user.id);
    if (franchises.length === 0) {
      return res.status(404).json({ error: 'No franchise found for this user' });
    }
    res.json(franchises[0]); // Return the first franchise for this user
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch franchise data' });
  }
});

router.post('/franchises/accept-agreement', authenticateToken, requireRole(['franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchises = await storage.getFranchisesByUser(req.user.id);
    if (franchises.length === 0) {
      return res.status(404).json({ error: 'No franchise found for this user' });
    }
    
    const franchise = franchises[0];
    const updatedFranchise = await storage.updateFranchise(franchise.id, {
      agreementStatus: 'accepted',
      agreementAcceptedAt: new Date(),
    });
    
    // Also activate the user account
    await storage.updateUser(req.user.id, {
      status: 'active',
    });
    
    res.json({
      franchise: updatedFranchise,
      message: 'Franchise agreement accepted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept agreement' });
  }
});

router.post('/franchises', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchiseData = insertFranchiseSchema.parse(req.body);
    
    // Check if email already exists
    const existingUser = await storage.getUserByEmail(franchiseData.contactEmail);
    if (existingUser) {
      return res.status(409).json({ 
        error: `A user with email ${franchiseData.contactEmail} already exists. Please use a different email address.` 
      });
    }
    
    // Generate random password for franchisee
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    // Create user account for franchisee
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const franchiseeUser = await storage.createUser({
      email: franchiseData.contactEmail,
      password: hashedPassword,
      name: franchiseData.contactPerson,
      role: 'franchisee',
      phoneNumber: franchiseData.contactPhone,
      status: 'inactive', // Will be activated when they accept agreement
    });

    // Generate agreement token
    const agreementToken = jwt.sign(
      { franchiseId: 'temp', email: franchiseData.contactEmail },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 days to accept agreement
    );

    // Create franchise with user link and agreement token
    const franchise = await storage.createFranchise({
      ...franchiseData,
      franchiseeUserId: franchiseeUser.id,
      agreementToken,
      agreementStatus: 'pending',
    });

    // Update the token with actual franchise ID
    const finalAgreementToken = jwt.sign(
      { franchiseId: franchise.id, email: franchiseData.contactEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update franchise with final token
    await storage.updateFranchise(franchise.id, {
      agreementToken: finalAgreementToken,
    });

    // Send welcome email with agreement link
    try {
      const loginUrl = `${req.protocol}://${req.get('host')}/login`;
      
      await sendEmail(
        franchiseData.contactEmail,
        'Welcome to Smile Stars India - Your Account is Ready',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Smile Stars India!</h2>
            
            <p>Dear ${franchiseData.contactPerson},</p>
            
            <p>Congratulations! Your franchisee account for the <strong>${franchiseData.region}</strong> region has been created successfully.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Your Login Details:</h3>
              <p><strong>Email:</strong> ${franchiseData.contactEmail}</p>
              <p><strong>Password:</strong> 12345</p>
              <p><strong>Franchise Region:</strong> ${franchiseData.region}</p>
            </div>
            
            <p>To access your franchisee dashboard and get started, please login using the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Upon first login, you will be presented with the franchise agreement to review and accept. If you have any questions, please contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Best regards,<br>
              Smile Stars India Team
            </p>
          </div>
        `,
      );
      
      res.status(201).json({
        id: franchise.id,
        name: franchise.name,
        region: franchise.region,
        contactPerson: franchise.contactPerson,
        contactEmail: franchise.contactEmail,
        agreementStatus: franchise.agreementStatus,
        message: `Franchise created successfully. Welcome email sent to ${franchiseData.contactEmail}`,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      res.status(201).json({
        id: franchise.id,
        name: franchise.name,
        region: franchise.region,
        contactPerson: franchise.contactPerson,
        contactEmail: franchise.contactEmail,
        agreementStatus: franchise.agreementStatus,
        message: 'Franchise created successfully, but email delivery failed. The system tried both SendGrid and backup email service. Please contact the franchisee manually.',
      });
    }
  } catch (error) {
    console.error('Franchise creation error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: `Email address already exists. Please use a different email.` 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      const issues = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      return res.status(400).json({ error: `Validation error: ${issues}` });
    }
    
    // Generic error
    res.status(500).json({ 
      error: error.message || 'Failed to create franchise. Please check all required fields and try again.' 
    });
  }
});

router.put('/franchises/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchiseId = parseInt(req.params.id);
    const franchiseData = insertFranchiseSchema.parse(req.body);
    
    const existingFranchise = await storage.getFranchiseById(franchiseId);
    if (!existingFranchise) {
      return res.status(404).json({ error: 'Franchise not found' });
    }
    
    const updatedFranchise = await storage.updateFranchise(franchiseId, franchiseData);
    res.json(updatedFranchise);
  } catch (error) {
    console.error('Franchise update error:', error);
    if (error.name === 'ZodError') {
      const issues = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      return res.status(400).json({ error: `Validation error: ${issues}` });
    }
    res.status(500).json({ error: 'Failed to update franchise' });
  }
});

router.delete('/franchises/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const franchiseId = parseInt(req.params.id);
    
    const existingFranchise = await storage.getFranchiseById(franchiseId);
    if (!existingFranchise) {
      return res.status(404).json({ error: 'Franchise not found' });
    }
    
    await storage.deleteFranchise(franchiseId);
    res.json({ message: 'Franchise deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete franchise';
    // Check if this is a dependency error
    if (errorMessage.includes('Cannot delete franchise. It has associated')) {
      return res.status(409).json({ error: errorMessage }); // 409 Conflict for dependency issues
    }
    res.status(500).json({ error: errorMessage });
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

// Franchise agreement acceptance endpoint
router.post('/franchise/accept-agreement', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Agreement token is required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { franchiseId, email } = decoded;

    // Find franchise by ID and token
    const franchise = await storage.getFranchiseById(franchiseId);
    if (!franchise || franchise.agreementToken !== token) {
      return res.status(400).json({ error: 'Invalid or expired agreement token' });
    }

    if (franchise.agreementStatus === 'accepted') {
      return res.status(400).json({ error: 'Agreement already accepted' });
    }

    // Update franchise agreement status
    await storage.updateFranchise(franchiseId, {
      agreementStatus: 'accepted',
      agreementAcceptedAt: new Date(),
      agreementToken: null, // Clear the token after use
    });

    // Activate the franchisee user account
    if (franchise.franchiseeUserId) {
      await storage.updateUser(franchise.franchiseeUserId, {
        status: 'active',
      });
    }

    res.json({
      success: true,
      message: 'Franchise agreement accepted successfully',
      franchise: {
        id: franchise.id,
        name: franchise.name,
        region: franchise.region,
        agreementStatus: 'accepted',
      },
    });
  } catch (error) {
    console.error('Agreement acceptance error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Agreement link has expired. Please contact support.' });
    }
    res.status(400).json({ error: 'Invalid agreement token' });
  }
});

// Get agreement details (for frontend to display agreement page)
router.get('/franchise/agreement/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token without authenticating user
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { franchiseId, email } = decoded;

    // Find franchise
    const franchise = await storage.getFranchiseById(franchiseId);
    if (!franchise || franchise.agreementToken !== token) {
      return res.status(400).json({ error: 'Invalid or expired agreement token' });
    }

    res.json({
      franchise: {
        id: franchise.id,
        name: franchise.name,
        region: franchise.region,
        contactPerson: franchise.contactPerson,
        contactEmail: franchise.contactEmail,
        agreementStatus: franchise.agreementStatus,
      },
      token,
    });
  } catch (error) {
    console.error('Agreement fetch error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Agreement link has expired' });
    }
    res.status(400).json({ error: 'Invalid agreement token' });
  }
});

// School Agreement routes
router.post('/school/accept-agreement', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Agreement token is required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { schoolId, email } = decoded;

    // Find school by ID and token
    const school = await storage.getSchoolById(schoolId);
    if (!school || school.agreementToken !== token) {
      return res.status(400).json({ error: 'Invalid or expired agreement token' });
    }

    if (school.agreementStatus === 'accepted') {
      return res.status(400).json({ error: 'Agreement already accepted' });
    }

    // Update school agreement status
    await storage.updateSchool(schoolId, {
      agreementStatus: 'accepted',
      agreementAcceptedAt: new Date(),
      agreementToken: null, // Clear the token after use
    });

    // Activate the school admin user account
    if (school.adminUserId) {
      await storage.updateUser(school.adminUserId, {
        status: 'active',
      });
    }

    res.json({
      success: true,
      message: 'School agreement accepted successfully',
      school: {
        id: school.id,
        name: school.name,
        city: school.city,
        state: school.state,
        agreementStatus: 'accepted',
      },
    });
  } catch (error) {
    console.error('School agreement acceptance error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Agreement link has expired. Please contact support.' });
    }
    res.status(400).json({ error: 'Invalid agreement token' });
  }
});

// Get school agreement details (for frontend to display agreement page)
router.get('/school/agreement/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token without authenticating user
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { schoolId, email } = decoded;

    // Find school
    const school = await storage.getSchoolById(schoolId);
    if (!school || school.agreementToken !== token) {
      return res.status(400).json({ error: 'Invalid or expired agreement token' });
    }

    res.json({
      school: {
        id: school.id,
        name: school.name,
        city: school.city,
        state: school.state,
        contactPerson: school.contactPerson,
        contactEmail: school.contactEmail,
        agreementStatus: school.agreementStatus,
      },
      token,
    });
  } catch (error) {
    console.error('School agreement fetch error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Agreement link has expired' });
    }
    res.status(400).json({ error: 'Invalid agreement token' });
  }
});


router.post('/schools/accept-agreement', authenticateToken, requireRole(['school_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== SCHOOL ACCEPT AGREEMENT API CALLED ===');
    console.log('User:', req.user);
    
    const schools = await storage.getSchoolsByUser(req.user.id);
    console.log('Found schools for agreement:', schools.length);
    
    if (schools.length === 0) {
      console.log('No schools found for user:', req.user.id);
      return res.status(404).json({ error: 'No school found for this user' });
    }
    
    const school = schools[0];
    console.log('Current school agreement status:', school.agreementStatus);
    
    if (school.agreementStatus === 'accepted') {
      console.log('Agreement already accepted');
      return res.status(400).json({ error: 'Agreement already accepted' });
    }
    
    console.log('Updating school agreement status...');
    const updatedSchool = await storage.updateSchool(school.id, {
      agreementStatus: 'accepted',
      agreementAcceptedAt: new Date(),
    });
    console.log('School updated successfully');
    
    // Also activate the user account
    console.log('Activating user account...');
    await storage.updateUser(req.user.id, {
      status: 'active',
    });
    console.log('User account activated');
    
    const response = {
      school: {
        ...updatedSchool,
        agreementAcceptedAt: updatedSchool.agreementAcceptedAt ? updatedSchool.agreementAcceptedAt.toISOString() : null,
        createdAt: updatedSchool.createdAt ? updatedSchool.createdAt.toISOString() : null,
      },
      message: 'School agreement accepted successfully',
    };
    
    console.log('Sending successful response:', response);
    res.json(response);
  } catch (error) {
    console.error('=== ERROR IN ACCEPT AGREEMENT ===');
    console.error('Error:', error);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({ error: 'Failed to accept agreement' });
  }
});

router.get('/camps/my-school', authenticateToken, requireRole(['school_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getSchoolsByUser(req.user.id);
    if (schools.length === 0) {
      return res.status(404).json({ error: 'No school found for this user' });
    }
    
    const camps = await storage.getCampsBySchool(schools[0].id);
    res.json(camps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch school camps' });
  }
});

router.get('/students/my-school', authenticateToken, requireRole(['school_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getSchoolsByUser(req.user.id);
    if (schools.length === 0) {
      return res.status(404).json({ error: 'No school found for this user' });
    }
    
    const students = await storage.getStudentsBySchool(schools[0].id);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch school students' });
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

router.post('/camps', authenticateToken, requireRole(['admin', 'franchisee']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== CAMP CREATION API CALLED ===');
    console.log('Raw request body:', req.body);
    
    // Convert date strings to Date objects
    const processedBody = {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      createdBy: req.user!.id
    };
    
    console.log('Processed body with Date objects:', processedBody);
    
    const campData = insertCampSchema.parse(processedBody);

    // Validate that the school exists and has accepted agreement
    const school = await storage.getSchoolById(campData.schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    if (school.agreementStatus !== 'accepted') {
      return res.status(400).json({ error: 'Cannot schedule camp for school that has not accepted agreement' });
    }

    // Role-based validation for franchisees
    if (req.user!.role === 'franchisee') {
      const franchises = await storage.getFranchisesByUser(req.user!.id);
      const userFranchiseIds = franchises.map(f => f.id);
      
      if (!userFranchiseIds.includes(school.franchiseId)) {
        return res.status(403).json({ error: 'You can only create camps in schools under your franchise' });
      }
    }

    // Validate dates are in the future
    const now = new Date();
    const startDate = new Date(campData.startDate);
    const endDate = new Date(campData.endDate);
    
    if (startDate <= now || endDate <= now) {
      return res.status(400).json({ error: 'Camp dates must be in the future' });
    }
    
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const camp = await storage.createCamp(campData);
    
    // Send email notifications
    try {
      const adminUser = await storage.getUserById(req.user!.id);
      const franchise = school.franchiseId ? await storage.getFranchiseById(school.franchiseId) : null;
      const schoolAdminUser = school.adminUserId ? await storage.getUserById(school.adminUserId) : null;
      const franchiseeUser = franchise?.franchiseeUserId ? await storage.getUserById(franchise.franchiseeUserId) : null;

      const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };

      const emailSubject = `New Dental Camp Scheduled - ${camp.name}`;
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🦷 New Dental Camp Scheduled</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">Camp Details</h3>
            <p><strong>Camp Name:</strong> ${camp.name}</p>
            <p><strong>School:</strong> ${school.name}</p>
            <p><strong>Location:</strong> ${school.city}, ${school.state}</p>
            <p><strong>Start Date:</strong> ${formatDate(startDate)}</p>
            <p><strong>End Date:</strong> ${formatDate(endDate)}</p>
            <p><strong>Expected Students:</strong> ${camp.expectedStudents}</p>
            ${camp.description ? `<p><strong>Description:</strong> ${camp.description}</p>` : ''}
          </div>
          
          <p>This camp has been scheduled and is now in planning phase. All stakeholders will be notified of any updates.</p>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Next Steps:</strong> Please coordinate with your team to ensure all preparations are completed before the camp start date.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 14px;">
            This is an automated notification from Smile Stars India. 
            For any questions, please contact your administrator.
          </p>
        </div>
      `;

      // Send to school admin
      if (schoolAdminUser?.email) {
        await sendEmail(
          schoolAdminUser.email,
          emailSubject,
          emailContent,
          'noreply@smilestars.com'
        );
      }

      // Send to admin who scheduled the camp
      if (adminUser?.email) {
        await sendEmail(
          adminUser.email,
          `Camp Scheduled Confirmation - ${camp.name}`,
          emailContent,
          'noreply@smilestars.com'
        );
      }

      // Send to franchisee
      if (franchiseeUser?.email) {
        await sendEmail(
          franchiseeUser.email,
          emailSubject,
          emailContent,
          'noreply@smilestars.com'
        );
      }
    } catch (emailError) {
      console.error('Failed to send camp notification emails:', emailError);
      // Don't fail the camp creation if email fails
    }

    res.status(201).json({ 
      ...camp, 
      message: 'Camp scheduled successfully. Notification emails sent to relevant parties.' 
    });
  } catch (error) {
    console.error('Camp creation error:', error);
    if (error.name === 'ZodError') {
      const issues = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      return res.status(400).json({ error: `Validation error: ${issues}` });
    }
    res.status(500).json({ error: 'Failed to schedule camp' });
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

router.post('/students', authenticateToken, requireRole(['admin', 'franchisee', 'school_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentData = insertStudentSchema.parse(req.body);
    
    // Role-based validation
    if (req.user!.role === 'school_admin') {
      // School admins can only create students in their own school
      const userSchools = await storage.getSchoolsByAdmin(req.user!.id);
      if (userSchools.length === 0) {
        return res.status(403).json({ error: 'No school associated with this admin account' });
      }
      
      const adminSchool = userSchools[0]; // School admin should only have one school
      if (studentData.schoolId !== adminSchool.id) {
        return res.status(403).json({ error: 'You can only add students to your own school' });
      }
    } else if (req.user!.role === 'franchisee') {
      // Franchisees can only create students in schools under their franchise
      const school = await storage.getSchoolById(studentData.schoolId);
      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }
      
      const franchises = await storage.getFranchisesByUser(req.user!.id);
      const userFranchiseIds = franchises.map(f => f.id);
      
      if (!userFranchiseIds.includes(school.franchiseId)) {
        return res.status(403).json({ error: 'You can only add students to schools under your franchise' });
      }
    }
    
    // Check if student email already exists to ensure one school per student
    if (studentData.email) {
      const existingStudent = await storage.getStudentByEmail(studentData.email);
      if (existingStudent) {
        return res.status(400).json({ error: 'A student with this email is already registered in another school' });
      }
    }
    
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
    console.log('=== DASHBOARD STATS DEBUG ===');
    const schools = await storage.getAllSchools();
    console.log('Schools fetched:', schools.length, schools);
    
    const camps = await storage.getAllCamps();
    console.log('Camps fetched:', camps.length, camps);
    
    const students = await storage.getAllStudents();
    console.log('Students fetched:', students.length, students);
    
    const screenings = await storage.getAllScreenings();
    console.log('Screenings fetched:', screenings.length, screenings);
    
    const reports = await storage.getAllReports();
    console.log('Reports fetched:', reports.length, reports);
    
    const franchises = await storage.getAllFranchises();
    console.log('Franchises fetched:', franchises.length, franchises);
    
    const users = await storage.getAllUsers();
    console.log('Users fetched:', users.length, users);

    const activeCamps = camps.filter(c => c.status === 'active');
    const completedScreenings = screenings.filter(s => s.isCompleted);

    const statsData = {
      totalSchools: schools.length,
      totalCamps: camps.length,
      activeCamps: activeCamps.length,
      studentsScreened: completedScreenings.length,
      reportsGenerated: reports.length,
      totalFranchises: franchises.length,
      totalUsers: users.length
    };
    
    console.log('Final stats being sent:', statsData);
    res.json(statsData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
