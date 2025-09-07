import { storage } from './storage';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Generate random token for magic links
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate magic link URL
function generateMagicLink(token: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/auth/magic-link?token=${token}`;
}

// Hash password for existing users
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Create Root Organization Entity
    console.log('Creating root organization...');
    const rootOrg = await storage.createEntity({
      type: 'ORGANIZATION',
      name: 'Smile Stars India',
      status: 'ACTIVE',
      parentId: null,
      metadata: {
        orgDescription: 'Leading dental care platform for school children across India'
      }
    });
    console.log(`✅ Created organization: ${rootOrg.name}`);

    // 2. Create Franchisee Entity
    console.log('Creating franchisee...');
    const franchisee = await storage.createEntity({
      type: 'FRANCHISEE',
      name: 'HappySmiles Franchise – Hyderabad',
      status: 'ACTIVE',
      parentId: rootOrg.id,
      metadata: {
        region: 'South India',
        franchiseContactPerson: 'Rajesh Kumar',
        franchiseContactEmail: 'rajesh@happysmiles.com',
        franchiseContactPhone: '+91-9876543210',
        franchiseAddress: '123 Tech City Road',
        franchiseCity: 'Hyderabad',
        franchiseState: 'Telangana',
        franchisePincode: '500032'
      }
    });
    console.log(`✅ Created franchisee: ${franchisee.name}`);

    // 3. Create School Entity
    console.log('Creating school...');
    const school = await storage.createEntity({
      type: 'SCHOOL',
      name: 'Sunrise Public School',
      status: 'ACTIVE',
      parentId: franchisee.id,
      metadata: {
        schoolAddress: '456 Education Lane',
        schoolCity: 'Hyderabad',
        schoolState: 'Telangana',
        schoolPincode: '500035',
        schoolContactPerson: 'Dr. Priya Sharma',
        schoolContactPhone: '+91-9123456789',
        schoolContactEmail: 'principal@sunriseschool.edu',
        registrationNumber: 'EDU-HYD-2019-0156',
        hasSubBranches: false
      }
    });
    console.log(`✅ Created school: ${school.name}`);

    // 4. Create Student Entities
    console.log('Creating students...');
    const student1 = await storage.createEntity({
      type: 'STUDENT',
      name: 'Arjun Patel',
      status: 'ACTIVE',
      parentId: school.id,
      metadata: {
        age: 12,
        gender: 'Male',
        grade: '7th',
        rollNumber: 'SR-2024-001',
        parentName: 'Suresh Patel',
        parentPhone: '+91-9876543211',
        parentEmail: 'suresh.patel@email.com',
        parentOccupation: 'Software Engineer'
      }
    });

    const student2 = await storage.createEntity({
      type: 'STUDENT',
      name: 'Kavya Reddy',
      status: 'ACTIVE',
      parentId: school.id,
      metadata: {
        age: 11,
        gender: 'Female',
        grade: '6th',
        rollNumber: 'SR-2024-002',
        parentName: 'Suresh Patel',
        parentPhone: '+91-9876543211',
        parentEmail: 'suresh.patel@email.com',
        parentOccupation: 'Software Engineer'
      }
    });

    const student3 = await storage.createEntity({
      type: 'STUDENT',
      name: 'Aadhya Singh',
      status: 'ACTIVE',
      parentId: school.id,
      metadata: {
        age: 13,
        gender: 'Female',
        grade: '8th',
        rollNumber: 'SR-2024-003',
        parentName: 'Vikram Singh',
        parentPhone: '+91-9876543212',
        parentEmail: 'vikram.singh@email.com',
        parentOccupation: 'Business Owner'
      }
    });

    console.log(`✅ Created ${3} students`);

    // 5. Create Users and Memberships

    // Hash default password for all users
    console.log('Hashing default password...');
    const defaultPassword = await hashPassword('12345');
    console.log('✅ Default password ready');

    // System Admin User
    console.log('Creating system admin user...');
    const systemAdminUser = await storage.createUser({
      name: 'System Administrator',
      email: 'admin@smilestars.com',
      password: defaultPassword,
      phone: '+91-9000000001',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const systemAdminMembership = await storage.createMembership({
      userId: systemAdminUser.id,
      entityId: rootOrg.id,
      role: 'SYSTEM_ADMIN',
      isPrimary: true,
      validFrom: new Date()
    });

    // Organization Admin User
    console.log('Creating organization admin user...');
    const orgAdminUser = await storage.createUser({
      name: 'Organization Admin',
      email: 'orgadmin@smilestars.com',
      password: defaultPassword,
      phone: '+91-9000000002',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const orgAdminMembership = await storage.createMembership({
      userId: orgAdminUser.id,
      entityId: rootOrg.id,
      role: 'ORG_ADMIN',
      isPrimary: true,
      validFrom: new Date()
    });

    // Franchise Admin User
    console.log('Creating franchise admin user...');
    const franchiseAdminUser = await storage.createUser({
      name: 'Rajesh Kumar',
      email: 'rajesh@happysmiles.com',
      password: defaultPassword,
      phone: '+91-9876543210',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const franchiseAdminMembership = await storage.createMembership({
      userId: franchiseAdminUser.id,
      entityId: franchisee.id,
      role: 'FRANCHISE_ADMIN',
      isPrimary: true,
      validFrom: new Date()
    });

    // Principal User (exactly one per school)
    console.log('Creating principal user...');
    const principalUser = await storage.createUser({
      name: 'Dr. Priya Sharma',
      email: 'principal@sunriseschool.edu',
      password: defaultPassword,
      phone: '+91-9123456789',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const principalMembership = await storage.createMembership({
      userId: principalUser.id,
      entityId: school.id,
      role: 'PRINCIPAL',
      isPrimary: true,
      validFrom: new Date()
    });

    // School Admin User (exactly one per school)
    console.log('Creating school admin user...');
    const schoolAdminUser = await storage.createUser({
      name: 'Mrs. Anita Verma',
      email: 'admin@sunriseschool.edu',
      password: defaultPassword,
      phone: '+91-9123456788',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const schoolAdminMembership = await storage.createMembership({
      userId: schoolAdminUser.id,
      entityId: school.id,
      role: 'SCHOOL_ADMIN',
      isPrimary: true,
      validFrom: new Date()
    });

    // Teacher Users (many per school)
    console.log('Creating teacher users...');
    const teacher1User = await storage.createUser({
      name: 'Mr. Amit Kumar',
      email: 'amit.kumar@sunriseschool.edu',
      password: defaultPassword,
      phone: '+91-9123456787',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const teacher1Membership = await storage.createMembership({
      userId: teacher1User.id,
      entityId: school.id,
      role: 'TEACHER',
      isPrimary: true,
      validFrom: new Date()
    });

    const teacher2User = await storage.createUser({
      name: 'Ms. Deepika Nair',
      email: 'deepika.nair@sunriseschool.edu',
      password: defaultPassword,
      phone: '+91-9123456786',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const teacher2Membership = await storage.createMembership({
      userId: teacher2User.id,
      entityId: school.id,
      role: 'TEACHER',
      isPrimary: true,
      validFrom: new Date()
    });

    // Dentist User
    console.log('Creating dentist user...');
    const dentistUser = await storage.createUser({
      name: 'Dr. Ramesh Gupta',
      email: 'dentist@smilestars.com',
      password: defaultPassword,
      phone: '+91-9876543213',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const dentistMembership = await storage.createMembership({
      userId: dentistUser.id,
      entityId: rootOrg.id, // Dentists work across the organization
      role: 'DENTIST',
      isPrimary: true,
      validFrom: new Date()
    });

    // Parent User (linked to multiple students)
    console.log('Creating parent user...');
    const parentUser = await storage.createUser({
      name: 'Suresh Patel',
      email: 'suresh.patel@email.com',
      password: defaultPassword,
      phone: '+91-9876543211',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const parentMembership = await storage.createMembership({
      userId: parentUser.id,
      entityId: school.id, // Parents are associated with schools
      role: 'PARENT',
      isPrimary: true,
      validFrom: new Date()
    });

    // Create Parent-Student Links (many-to-many relationship)
    console.log('Creating parent-student relationships...');
    await storage.createParentStudentLink({
      parentUserId: parentUser.id,
      studentEntityId: student1.id,
      relationship: 'FATHER',
      custodyFlags: {
        hasCustody: true,
        canPickup: true,
        emergencyContact: true,
        medicalDecisions: true
      }
    });

    await storage.createParentStudentLink({
      parentUserId: parentUser.id,
      studentEntityId: student2.id,
      relationship: 'FATHER',
      custodyFlags: {
        hasCustody: true,
        canPickup: true,
        emergencyContact: true,
        medicalDecisions: true
      }
    });

    // Create another parent for the third student
    const parent2User = await storage.createUser({
      name: 'Vikram Singh',
      email: 'vikram.singh@email.com',
      password: defaultPassword,
      phone: '+91-9876543212',
      status: 'ACTIVE',
      mfaEnabled: false
    });

    const parent2Membership = await storage.createMembership({
      userId: parent2User.id,
      entityId: school.id,
      role: 'PARENT',
      isPrimary: true,
      validFrom: new Date()
    });

    await storage.createParentStudentLink({
      parentUserId: parent2User.id,
      studentEntityId: student3.id,
      relationship: 'FATHER',
      custodyFlags: {
        hasCustody: true,
        canPickup: true,
        emergencyContact: true,
        medicalDecisions: true
      }
    });

    // 6. Create Sample Agreements
    console.log('Creating sample agreements...');
    const parentAgreement = await storage.createAgreement({
      code: 'TOS_PARENT',
      version: '1.0',
      title: 'Terms of Service for Parents',
      bodyMd: `# Terms of Service for Parents

## Consent for Dental Screening

By using Smile Stars India platform, you agree to:

1. Allow authorized dental professionals to conduct oral health screenings of your child
2. Receive digital dental reports via email
3. Share student health information with school administrators for educational purposes
4. Follow recommended dental care guidelines provided by our certified dentists

## Data Privacy

We protect your child's health information according to applicable privacy laws and regulations.

## Contact Information

For questions, contact us at support@smilestars.com`,
      effectiveAt: new Date(),
      requiredRoles: ['PARENT']
    });

    const staffAgreement = await storage.createAgreement({
      code: 'TOS_STAFF',
      version: '1.0',
      title: 'Terms of Service for Staff',
      bodyMd: `# Terms of Service for Staff

## Professional Conduct

By using Smile Stars India platform, you agree to:

1. Maintain professional standards in all interactions with students and parents
2. Protect student health information and privacy
3. Follow established protocols for dental screenings and reporting
4. Complete required training and certification programs

## Data Handling

Staff must handle all student data according to privacy policies and regulatory requirements.

## Compliance

All staff must comply with institutional policies and applicable laws.`,
      effectiveAt: new Date(),
      requiredRoles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'FRANCHISE_ADMIN', 'DENTIST', 'TECHNICIAN']
    });

    // 7. Create Magic Link Tokens for First-Time Login
    console.log('Creating magic link tokens for development...');
    const users = [
      { user: systemAdminUser, role: 'SYSTEM_ADMIN' },
      { user: orgAdminUser, role: 'ORG_ADMIN' },
      { user: franchiseAdminUser, role: 'FRANCHISE_ADMIN' },
      { user: principalUser, role: 'PRINCIPAL' },
      { user: schoolAdminUser, role: 'SCHOOL_ADMIN' },
      { user: teacher1User, role: 'TEACHER' },
      { user: teacher2User, role: 'TEACHER' },
      { user: dentistUser, role: 'DENTIST' },
      { user: parentUser, role: 'PARENT' },
      { user: parent2User, role: 'PARENT' }
    ];

    console.log('\n🔗 Development Magic Links:');
    console.log('========================================');

    for (const { user, role } of users) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      await storage.createMagicToken({
        token,
        email: user.email,
        expiresAt,
        purpose: 'INVITE',
        metadata: {
          invitedBy: systemAdminUser.id,
          firstName: user.name.split(' ')[0],
          lastName: user.name.split(' ').slice(1).join(' ')
        }
      });

      const magicLink = generateMagicLink(token);
      console.log(`📧 ${role}: ${user.name} (${user.email})`);
      console.log(`   ${magicLink}`);
      console.log('');
    }

    console.log('========================================');
    console.log('🎉 Database seeded successfully!');
    console.log('\nEntity Hierarchy:');
    console.log(`📋 ${rootOrg.name} (Organization)`);
    console.log(`  └── ${franchisee.name} (Franchisee)`);
    console.log(`      └── ${school.name} (School)`);
    console.log(`          ├── ${student1.name} (Student)`);
    console.log(`          ├── ${student2.name} (Student)`);
    console.log(`          └── ${student3.name} (Student)`);
    console.log('\nUsers Created:');
    console.log(`👑 System Admin: ${systemAdminUser.email}`);
    console.log(`🏢 Org Admin: ${orgAdminUser.email}`);
    console.log(`🏪 Franchise Admin: ${franchiseAdminUser.email}`);
    console.log(`🎓 Principal: ${principalUser.email}`);
    console.log(`📚 School Admin: ${schoolAdminUser.email}`);
    console.log(`👨‍🏫 Teachers: ${teacher1User.email}, ${teacher2User.email}`);
    console.log(`🦷 Dentist: ${dentistUser.email}`);
    console.log(`👨‍👩‍👧‍👦 Parents: ${parentUser.email}, ${parent2User.email}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}