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
    const { agreementIds, token, password } = req.body;
    
    if (!agreementIds || !Array.isArray(agreementIds)) {
      return res.status(400).json({ error: 'Agreement IDs are required' });
    }

    let userId: number;
    let tokenType = 'REGULAR';
    let franchiseeId: number | null = null;
    
    if (token) {
      // Handle franchise agreement flow with token
      const magicToken = await storage.getMagicTokenByToken(token);
      if (!magicToken || magicToken.type !== 'FRANCHISE_AGREEMENT') {
        return res.status(400).json({ error: 'Invalid franchise agreement token' });
      }
      
      if (new Date() > magicToken.expiresAt) {
        return res.status(400).json({ error: 'Token has expired' });
      }
      
      const user = await storage.getUserByEmail(magicToken.email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      userId = user.id;
      tokenType = 'FRANCHISE_AGREEMENT';
      franchiseeId = magicToken.metadata?.franchiseeId || null;
      
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
    
    // If this is a franchise agreement flow, also update franchisee status
    if (tokenType === 'FRANCHISE_AGREEMENT' && franchiseeId) {
      await storage.updateEntity(franchiseeId, { status: 'ACTIVE' });
    }

    // Log the action
    await storage.createAuditLog({
      actorUserId: userId,
      action: tokenType === 'FRANCHISE_AGREEMENT' ? 'ACCEPT_FRANCHISE_AGREEMENTS' : 'ACCEPT_AGREEMENTS',
      targetId: userId,
      targetType: 'USER',
      metadata: {
        agreementIds: agreementIds.join(', '),
        totalAgreements: agreementIds.length,
        tokenType,
        franchiseeId
      }
    });

    res.json({ 
      success: true, 
      message: tokenType === 'FRANCHISE_AGREEMENT' ? 'Franchise activated successfully!' : 'Agreements accepted successfully',
      franchiseeActivated: tokenType === 'FRANCHISE_AGREEMENT'
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
    
    // Prepare user updates
    const userUpdates: any = {
      name: name || existingUser.name,
      email: email || existingUser.email,
    };
    
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
        agreementStatus: 'accepted', // Default for now, can be enhanced later
        agreementAcceptedAt: entity.createdAt, // Default for now
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
    
    // Create franchisee entity in PENDING status
    const franchiseeData = {
      ...entityData,
      type: 'FRANCHISEE' as const,
      parentId: 1, // Assume parent is Smile Stars India organization
      status: 'PENDING', // Start in pending status
      metadata
    };
    
    const entity = await storage.createEntity(franchiseeData);
    
    // Create primary contact user with FRANCHISE_ADMIN role
    let primaryContactUser = await storage.getUserByEmail(contactEmail);
    
    if (!primaryContactUser) {
      // Create new user
      const userData = {
        email: contactEmail,
        username: contactEmail.split('@')[0] + '_' + entity.id,
        firstName: contactPerson.split(' ')[0] || contactPerson,
        lastName: contactPerson.split(' ').slice(1).join(' ') || '',
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
    const magicToken = await storage.createMagicToken({
      email: contactEmail,
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