import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { MailService } from '@sendgrid/mail';
import { storage } from "./storage";
import { 
  magicLinkRequestSchema, magicLinkConsumeSchema, acceptAgreementsSchema,
  createUserSchema, createMembershipSchema, inviteUserSchema,
  insertEntitySchema, insertCampSchema, insertScreeningSchema, insertReportSchema,
  User, Entity, Membership
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

// Email setup
let mailService: MailService | null = null;
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email sending function
async function sendEmail(to: string, subject: string, html: string, from: string = 'noreply@smilestars.com') {
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
    console.log('📧 No SendGrid API key configured, logging email to console:');
    console.log('Subject:', subject);
    console.log('HTML:', html);
    return false;
  }
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

    // Mark token as used
    await storage.markMagicTokenUsed(token);

    // Get user memberships and check for required agreements
    const memberships = await storage.getMembershipsByUser(user.id);
    const roles = memberships.map(m => m.role);
    
    // Check if user needs to accept agreements
    const applicableAgreements = await storage.getAgreementsByRole(roles);
    const userAcceptances = await storage.getAcceptancesByUser(user.id);
    const acceptedAgreementIds = userAcceptances.map(a => a.agreementId);
    
    const pendingAgreements = applicableAgreements.filter(
      agreement => !acceptedAgreementIds.includes(agreement.id)
    );

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
      requiresAgreements: pendingAgreements.length > 0,
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

// Accept agreements
router.post('/auth/accept-agreements', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agreementIds } = acceptAgreementsSchema.parse(req.body);
    const userId = req.user!.id;
    
    // Create acceptance records
    for (const agreementId of agreementIds) {
      const agreement = await storage.getAgreementById(agreementId);
      if (agreement) {
        await storage.createAgreementAcceptance({
          userId,
          agreementId,
          version: agreement.version,
          acceptedAt: new Date(),
          ip: req.ip,
          userAgent: req.get('User-Agent') || null
        });
      }
    }

    res.json({ message: 'Agreements accepted successfully' });
  } catch (error) {
    console.error('Accept agreements error:', error);
    res.status(500).json({ error: 'Failed to accept agreements' });
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get user memberships and roles
    const memberships = await storage.getMembershipsByUser(user.id);
    const roles = memberships.map(m => m.role);
    const entityIds = memberships.map(m => m.entityId);

    // Check for pending agreements
    const applicableAgreements = await storage.getAgreementsByRole(roles);
    const userAcceptances = await storage.getAcceptancesByUser(user.id);
    const acceptedAgreementIds = userAcceptances.map(a => a.agreementId);
    const pendingAgreements = applicableAgreements.filter(
      agreement => !acceptedAgreementIds.includes(agreement.id)
    );

    // Create JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
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
      requiresAgreements: pendingAgreements.length > 0,
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

// ===== USER & ENTITY MANAGEMENT ROUTES =====

// Get current user info
router.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await storage.getUserById(req.user!.id);
    const memberships = await storage.getMembershipsByUser(req.user!.id);
    
    res.json({
      user,
      memberships: memberships.map(m => ({
        id: m.id,
        entityId: m.entityId,
        role: m.role,
        isPrimary: m.isPrimary
      }))
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get entities (with role-based filtering)
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

    await sendEmail(email, 'Welcome to Smile Stars India', emailHtml);

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
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
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

// Create camp
router.post('/camps', authenticateToken, requireRole(['FRANCHISE_ADMIN', 'PRINCIPAL', 'SCHOOL_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campData = insertCampSchema.parse(req.body);
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
      totalFranchisees: entities.filter(e => e.type === 'FRANCHISEE').length,
      totalSchools: entities.filter(e => e.type === 'SCHOOL').length,
      totalStudents: entities.filter(e => e.type === 'STUDENT').length,
      totalCamps: camps.length,
      totalScreenings: screenings.length,
      activeCamps: camps.filter(c => c.status === 'active').length,
      completedScreenings: screenings.filter(s => s.isCompleted).length
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

    res.json(filteredFranchisees);
  } catch (error) {
    console.error('Get franchises error:', error);
    res.status(500).json({ error: 'Failed to get franchises' });
  }
});

// POST /api/franchises - create FRANCHISEE entity
router.post('/franchises', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityData = {
      ...req.body,
      type: 'FRANCHISEE' as const,
      parentId: 1 // Assume parent is Smile Stars India organization
    };
    
    const entity = await storage.createEntity(entityData);
    
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_ENTITY',
      entityId: entity.id,
      metadata: { entityType: entity.type, entityName: entity.name }
    });

    res.json(entity);
  } catch (error) {
    console.error('Create franchise error:', error);
    res.status(500).json({ error: 'Failed to create franchise' });
  }
});

// GET /api/schools - return SCHOOL entities
router.get('/schools', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await storage.getEntitiesByType('SCHOOL');
    
    // Filter based on user access
    const accessibleEntityIds = req.user!.entityIds;
    const filteredSchools = schools.filter(entity => {
      if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
        return true;
      }
      return accessibleEntityIds.includes(entity.id) || accessibleEntityIds.includes(entity.parentId || 0);
    });

    res.json(filteredSchools);
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// POST /api/schools - create SCHOOL entity
router.post('/schools', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ORG_ADMIN', 'FRANCHISE_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entityData = {
      ...req.body,
      type: 'SCHOOL' as const
    };
    
    const entity = await storage.createEntity(entityData);
    
    await storage.createAuditLog({
      actorUserId: req.user!.id,
      action: 'CREATE_ENTITY',
      entityId: entity.id,
      metadata: { entityType: entity.type, entityName: entity.name }
    });

    res.json(entity);
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// GET /api/students - return STUDENT entities
router.get('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const students = await storage.getEntitiesByType('STUDENT');
    
    // Filter based on user access
    const accessibleEntityIds = req.user!.entityIds;
    const filteredStudents = students.filter(entity => {
      if (req.user!.roles.includes('SYSTEM_ADMIN') || req.user!.roles.includes('ORG_ADMIN')) {
        return true;
      }
      return accessibleEntityIds.includes(entity.id) || accessibleEntityIds.includes(entity.parentId || 0);
    });

    res.json(filteredStudents);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

export default router;