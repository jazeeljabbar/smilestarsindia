import {
  User, InsertUser, Entity, InsertEntity, Membership, InsertMembership,
  ParentStudentLink, InsertParentStudentLink, Agreement, InsertAgreement,
  AgreementAcceptance, InsertAgreementAcceptance, AuditLog, InsertAuditLog,
  MagicToken, InsertMagicToken, Camp, InsertCamp, CampEnrollment, InsertCampEnrollment,
  Screening, InsertScreening, Report, InsertReport, Consent, InsertConsent, ContentItem, InsertContentItem,
  users, entities, memberships, parentStudentLinks, agreements, agreementAcceptances,
  auditLogs, magicTokens, camps, campEnrollments, screenings, reports, consents, contentItems
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, isNull, or } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Student Actions
  deleteStudent(id: number): Promise<void>;
  archiveStudent(id: number): Promise<void>;
  moveStudent(id: number, targetSchoolId: number): Promise<void>;

  // Entities
  createEntity(entity: InsertEntity): Promise<Entity>;
  getEntityById(id: number): Promise<Entity | null>;
  getEntitiesByType(type: string): Promise<Entity[]>;
  getEntitiesByParent(parentId: number): Promise<Entity[]>;
  getAllEntities(): Promise<Entity[]>;
  updateEntity(id: number, updates: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: number): Promise<void>;

  // Entity relationship helpers
  getSchoolsByFranchisee(franchiseeId: number): Promise<Entity[]>;
  getStudentsBySchool(schoolId: number): Promise<Entity[]>;

  // Memberships
  createMembership(membership: InsertMembership): Promise<Membership>;
  getMembershipsByUser(userId: number): Promise<Membership[]>;
  getMembershipsByEntity(entityId: number): Promise<Membership[]>;
  getMembershipsByRole(role: string): Promise<Membership[]>;
  updateMembership(id: number, updates: Partial<InsertMembership>): Promise<Membership>;
  deleteMembership(id: number): Promise<void>;

  // Parent-Student Links
  createParentStudentLink(link: InsertParentStudentLink): Promise<ParentStudentLink>;
  getParentStudentLinksByParent(parentUserId: number): Promise<ParentStudentLink[]>;
  getParentStudentLinksByStudent(studentEntityId: number): Promise<ParentStudentLink[]>;
  deleteParentStudentLink(id: number): Promise<void>;

  // Agreements
  createAgreement(agreement: InsertAgreement): Promise<Agreement>;
  getAgreementsByRole(roles: string[]): Promise<Agreement[]>;
  getAgreementById(id: number): Promise<Agreement | null>;
  getAllAgreements(): Promise<Agreement[]>;

  // Agreement Acceptances
  createAgreementAcceptance(acceptance: InsertAgreementAcceptance): Promise<AgreementAcceptance>;
  getAcceptancesByUser(userId: number): Promise<AgreementAcceptance[]>;
  hasUserAcceptedAgreement(userId: number, agreementId: number): Promise<boolean>;

  // Magic Tokens
  createMagicToken(token: InsertMagicToken): Promise<MagicToken>;
  getMagicTokenByToken(token: string): Promise<MagicToken | null>;
  markMagicTokenUsed(token: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByUser(userId: number): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityId: number): Promise<AuditLog[]>;

  // Camps
  createCamp(camp: InsertCamp): Promise<Camp>;
  getAllCamps(): Promise<Camp[]>;
  getCampById(id: number): Promise<Camp | null>;
  getCampsBySchoolEntity(schoolEntityId: number): Promise<Camp[]>;
  getCampsByDentist(dentistUserId: number): Promise<Camp[]>;
  updateCamp(id: number, updates: Partial<InsertCamp>): Promise<Camp>;

  // Camp Enrollments
  createCampEnrollment(enrollment: InsertCampEnrollment): Promise<CampEnrollment>;
  getCampEnrollmentsByCamp(campId: number): Promise<CampEnrollment[]>;
  getCampEnrollmentsByStudent(studentEntityId: number): Promise<CampEnrollment[]>;
  getEnrolledStudentsByCamp(campId: number): Promise<Entity[]>;
  getAvailableStudentsForCamp(campId: number): Promise<Entity[]>;
  deleteCampEnrollment(campId: number, studentEntityId: number): Promise<void>;

  // Screenings
  createScreening(screening: InsertScreening): Promise<Screening>;
  getAllScreenings(): Promise<Screening[]>;
  getScreeningById(id: number): Promise<Screening | null>;
  getScreeningsByStudentEntity(studentEntityId: number): Promise<Screening[]>;
  getScreeningsByCamp(campId: number): Promise<Screening[]>;
  getScreeningsByDentist(dentistUserId: number): Promise<Screening[]>;
  updateScreening(id: number, updates: Partial<InsertScreening>): Promise<Screening>;

  // Consents
  createConsent(consent: InsertConsent): Promise<Consent>;
  getConsentById(id: number): Promise<Consent | null>;
  getConsentByCampAndStudent(campId: number, studentEntityId: number): Promise<Consent | null>;
  updateConsent(id: number, updates: Partial<InsertConsent>): Promise<Consent>;

  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getAllReports(): Promise<Report[]>;
  getReportById(id: number): Promise<Report | null>;
  getReportsByStudentEntity(studentEntityId: number): Promise<Report[]>;
  updateReport(id: number, updates: Partial<InsertReport>): Promise<Report>;

  // Content (Twinky Corner)
  createContent(content: InsertContentItem): Promise<ContentItem>;
  getAllContent(): Promise<ContentItem[]>;
  getPublicContent(): Promise<ContentItem[]>;
  getContentBySlug(slug: string): Promise<ContentItem | null>;
  updateContent(id: number, updates: Partial<InsertContentItem>): Promise<ContentItem>;
  deleteContent(id: number): Promise<void>;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // Users
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Entities
  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    const [entity] = await db
      .insert(entities)
      .values(insertEntity)
      .returning();
    return entity;
  }

  async getEntityById(id: number): Promise<Entity | null> {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity || null;
  }

  async getEntitiesByType(type: string): Promise<Entity[]> {
    return await db.select().from(entities).where(eq(entities.type, type as any));
  }

  async getEntitiesByParent(parentId: number): Promise<Entity[]> {
    return await db.select().from(entities).where(eq(entities.parentId, parentId));
  }

  async getAllEntities(): Promise<Entity[]> {
    return await db.select().from(entities).orderBy(asc(entities.name));
  }

  async updateEntity(id: number, updates: Partial<InsertEntity>): Promise<Entity> {
    const [entity] = await db
      .update(entities)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(entities.id, id))
      .returning();
    return entity;
  }

  async deleteEntity(id: number): Promise<void> {
    await db.delete(entities).where(eq(entities.id, id));
  }

  // Student Actions Implementation
  async deleteStudent(id: number): Promise<void> {
    // Transactional delete of student and all related records
    await db.transaction(async (tx) => {
      // 1. Delete parent-student links
      await tx.delete(parentStudentLinks).where(eq(parentStudentLinks.studentEntityId, id));

      // 2. Delete camp enrollments
      await tx.delete(campEnrollments).where(eq(campEnrollments.studentEntityId, id));

      // 3. Delete reports (optional: could be kept if needed, but "delete" usually implies hard delete)
      await tx.delete(reports).where(eq(reports.studentEntityId, id));

      // 4. Delete screenings
      await tx.delete(screenings).where(eq(screenings.studentEntityId, id));

      // 5. Finally delete the student entity
      await tx.delete(entities).where(and(eq(entities.id, id), eq(entities.type, 'STUDENT')));
    });
  }

  async archiveStudent(id: number): Promise<void> {
    await db
      .update(entities)
      .set({
        status: 'ARCHIVED',
        parentId: null, // Remove association with current school
        updatedAt: new Date()
      })
      .where(and(eq(entities.id, id), eq(entities.type, 'STUDENT')));
  }

  async moveStudent(id: number, targetSchoolId: number): Promise<void> {
    await db
      .update(entities)
      .set({
        parentId: targetSchoolId,
        updatedAt: new Date()
      })
      .where(and(eq(entities.id, id), eq(entities.type, 'STUDENT')));
  }

  // Entity relationship helpers
  async getSchoolsByFranchisee(franchiseeId: number): Promise<Entity[]> {
    return await db.select().from(entities).where(and(eq(entities.type, 'SCHOOL'), eq(entities.parentId, franchiseeId)));
  }

  async getStudentsBySchool(schoolId: number): Promise<Entity[]> {
    return await db.select().from(entities).where(and(eq(entities.type, 'STUDENT'), eq(entities.parentId, schoolId)));
  }

  // Memberships
  async createMembership(insertMembership: InsertMembership): Promise<Membership> {
    const [membership] = await db
      .insert(memberships)
      .values([insertMembership])
      .returning();
    return membership;
  }

  async getMembershipsByUser(userId: number): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.userId, userId));
  }

  async deleteMembershipsByUser(userId: number): Promise<void> {
    await db.delete(memberships).where(eq(memberships.userId, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getMembershipsByEntity(entityId: number): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.entityId, entityId));
  }

  async getMembershipsByRole(role: string): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.role, role as any));
  }

  async updateMembership(id: number, updates: Partial<InsertMembership>): Promise<Membership> {
    const [membership] = await db
      .update(memberships)
      .set(updates)
      .where(eq(memberships.id, id))
      .returning();
    return membership;
  }

  async deleteMembership(id: number): Promise<void> {
    await db.delete(memberships).where(eq(memberships.id, id));
  }

  // Parent-Student Links
  async createParentStudentLink(insertLink: InsertParentStudentLink): Promise<ParentStudentLink> {
    const [link] = await db
      .insert(parentStudentLinks)
      .values([insertLink as any])
      .returning();
    return link;
  }

  async getParentStudentLinksByParent(parentUserId: number): Promise<ParentStudentLink[]> {
    return await db.select().from(parentStudentLinks).where(eq(parentStudentLinks.parentUserId, parentUserId));
  }

  async getParentStudentLinksByStudent(studentEntityId: number): Promise<ParentStudentLink[]> {
    return await db.select().from(parentStudentLinks).where(eq(parentStudentLinks.studentEntityId, studentEntityId));
  }

  async deleteParentStudentLink(id: number): Promise<void> {
    await db.delete(parentStudentLinks).where(eq(parentStudentLinks.id, id));
  }

  // Agreements
  async createAgreement(insertAgreement: InsertAgreement): Promise<Agreement> {
    const [agreement] = await db
      .insert(agreements)
      .values([insertAgreement as any])
      .returning();
    return agreement;
  }

  async getAgreementsByRole(roles: string[]): Promise<Agreement[]> {
    // Get agreements where requiredRoles array contains any of the provided roles
    const allAgreements = await db.select().from(agreements);
    return allAgreements.filter(agreement => {
      const requiredRoles = agreement.requiredRoles as string[];
      return requiredRoles.some(role => roles.includes(role));
    });
  }

  async getAgreementById(id: number): Promise<Agreement | null> {
    const [agreement] = await db.select().from(agreements).where(eq(agreements.id, id));
    return agreement || null;
  }

  async getAllAgreements(): Promise<Agreement[]> {
    return await db.select().from(agreements).orderBy(desc(agreements.effectiveAt));
  }

  // Agreement Acceptances
  async createAgreementAcceptance(insertAcceptance: InsertAgreementAcceptance): Promise<AgreementAcceptance> {
    const [acceptance] = await db
      .insert(agreementAcceptances)
      .values([insertAcceptance])
      .returning();
    return acceptance;
  }

  async getAcceptancesByUser(userId: number): Promise<AgreementAcceptance[]> {
    return await db.select().from(agreementAcceptances).where(eq(agreementAcceptances.userId, userId));
  }

  async hasUserAcceptedAgreement(userId: number, agreementId: number): Promise<boolean> {
    const [acceptance] = await db.select()
      .from(agreementAcceptances)
      .where(and(
        eq(agreementAcceptances.userId, userId),
        eq(agreementAcceptances.agreementId, agreementId)
      ));
    return !!acceptance;
  }

  // Magic Tokens
  async createMagicToken(insertToken: InsertMagicToken): Promise<MagicToken> {
    const [token] = await db
      .insert(magicTokens)
      .values([insertToken as any])
      .returning();
    return token;
  }

  async getMagicTokenByToken(token: string): Promise<MagicToken | null> {
    const [magicToken] = await db.select()
      .from(magicTokens)
      .where(and(
        eq(magicTokens.token, token),
        isNull(magicTokens.usedAt)
      ));
    return magicToken || null;
  }

  async markMagicTokenUsed(token: string): Promise<void> {
    await db
      .update(magicTokens)
      .set({ usedAt: new Date() })
      .where(eq(magicTokens.token, token));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(magicTokens)
      .where(and(
        isNull(magicTokens.usedAt),
        // Delete tokens older than 48 hours
        eq(magicTokens.expiresAt, new Date(Date.now() - 48 * 60 * 60 * 1000))
      ));
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values([insertLog])
      .returning();
    return log;
  }

  async getAuditLogsByUser(userId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.actorUserId, userId)).orderBy(desc(auditLogs.occurredAt));
  }

  async getAuditLogsByEntity(entityId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.entityId, entityId)).orderBy(desc(auditLogs.occurredAt));
  }

  // Camps
  async createCamp(insertCamp: InsertCamp): Promise<Camp> {
    const [camp] = await db
      .insert(camps)
      .values(insertCamp)
      .returning();
    return camp;
  }

  async getAllCamps(): Promise<Camp[]> {
    return await db.select().from(camps).orderBy(desc(camps.startDate));
  }

  async getCampById(id: number): Promise<Camp | null> {
    const [camp] = await db.select().from(camps).where(eq(camps.id, id));
    return camp || null;
  }

  async getCampsBySchoolEntity(schoolEntityId: number): Promise<Camp[]> {
    return await db.select().from(camps).where(eq(camps.schoolEntityId, schoolEntityId));
  }

  async getCampsByDentist(dentistUserId: number): Promise<Camp[]> {
    return await db.select().from(camps).where(eq(camps.assignedDentistId, dentistUserId));
  }

  async updateCamp(id: number, updates: Partial<InsertCamp>): Promise<Camp> {
    const [camp] = await db
      .update(camps)
      .set(updates)
      .where(eq(camps.id, id))
      .returning();
    return camp;
  }

  // Camp Enrollments
  async createCampEnrollment(insertEnrollment: InsertCampEnrollment): Promise<CampEnrollment> {
    const [enrollment] = await db
      .insert(campEnrollments)
      .values(insertEnrollment)
      .returning();
    return enrollment;
  }

  async getCampEnrollmentsByCamp(campId: number): Promise<CampEnrollment[]> {
    return await db.select().from(campEnrollments).where(eq(campEnrollments.campId, campId));
  }

  async getCampEnrollmentsByStudent(studentEntityId: number): Promise<CampEnrollment[]> {
    return await db.select().from(campEnrollments).where(eq(campEnrollments.studentEntityId, studentEntityId));
  }

  async getEnrolledStudentsByCamp(campId: number): Promise<Entity[]> {
    const enrollments = await db
      .select({
        studentEntityId: campEnrollments.studentEntityId
      })
      .from(campEnrollments)
      .where(eq(campEnrollments.campId, campId));

    if (enrollments.length === 0) return [];

    const studentIds = enrollments.map(e => e.studentEntityId);
    return await db
      .select()
      .from(entities)
      .where(inArray(entities.id, studentIds));
  }

  async getAvailableStudentsForCamp(campId: number): Promise<Entity[]> {
    // Get the camp to find its school
    const camp = await this.getCampById(campId);
    if (!camp) return [];

    // Get all students from the camp's school
    const allSchoolStudents = await this.getStudentsBySchool(camp.schoolEntityId);

    // Get already enrolled students
    const enrolledStudents = await this.getEnrolledStudentsByCamp(campId);
    const enrolledIds = enrolledStudents.map(s => s.id);

    // Return students not yet enrolled
    return allSchoolStudents.filter(student => !enrolledIds.includes(student.id));
  }

  async deleteCampEnrollment(campId: number, studentEntityId: number): Promise<void> {
    await db
      .delete(campEnrollments)
      .where(and(
        eq(campEnrollments.campId, campId),
        eq(campEnrollments.studentEntityId, studentEntityId)
      ));
  }

  // Screenings
  async createScreening(insertScreening: InsertScreening): Promise<Screening> {
    const [screening] = await db
      .insert(screenings)
      .values([insertScreening as any])
      .returning();
    return screening;
  }

  async getAllScreenings(): Promise<Screening[]> {
    return await db.select().from(screenings).orderBy(desc(screenings.createdAt));
  }

  async getScreeningById(id: number): Promise<Screening | null> {
    const [screening] = await db.select().from(screenings).where(eq(screenings.id, id));
    return screening || null;
  }

  async getScreeningsByStudentEntity(studentEntityId: number): Promise<Screening[]> {
    return await db.select().from(screenings).where(eq(screenings.studentEntityId, studentEntityId));
  }

  async getScreeningsByCamp(campId: number): Promise<Screening[]> {
    return await db.select().from(screenings).where(eq(screenings.campId, campId));
  }

  async getScreeningsByDentist(dentistUserId: number): Promise<Screening[]> {
    return await db.select().from(screenings).where(eq(screenings.dentistUserId, dentistUserId));
  }

  async updateScreening(id: number, updates: Partial<InsertScreening>): Promise<Screening> {
    const [screening] = await db
      .update(screenings)
      .set(updates as any)
      .where(eq(screenings.id, id))
      .returning();
    return screening;
  }

  // Reports
  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values(insertReport)
      .returning();
    return report;
  }

  async getAllReports(): Promise<Report[]> {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getReportById(id: number): Promise<Report | null> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || null;
  }

  async getReportsByStudentEntity(studentEntityId: number): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.studentEntityId, studentEntityId));
  }

  async updateReport(id: number, updates: Partial<InsertReport>): Promise<Report> {
    const [report] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }

  // Consents Implementation
  async createConsent(consent: InsertConsent): Promise<Consent> {
    const [newConsent] = await db.insert(consents).values(consent).returning();
    return newConsent;
  }

  async getConsentById(id: number): Promise<Consent | null> {
    const [consent] = await db.select().from(consents).where(eq(consents.id, id));
    return consent || null;
  }

  async getConsentByCampAndStudent(campId: number, studentEntityId: number): Promise<Consent | null> {
    const [consent] = await db
      .select()
      .from(consents)
      .where(and(eq(consents.campId, campId), eq(consents.studentEntityId, studentEntityId)));
    return consent || null;
  }

  async updateConsent(id: number, updates: Partial<InsertConsent>): Promise<Consent> {
    const [updatedConsent] = await db
      .update(consents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(consents.id, id))
      .returning();
    return updatedConsent;
  }



  // Content (Twinky Corner)
  async createContent(content: InsertContentItem): Promise<ContentItem> {
    const [item] = await db
      .insert(contentItems)
      .values(content)
      .returning();
    return item;
  }

  async getAllContent(): Promise<ContentItem[]> {
    return await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
  }

  async getPublicContent(): Promise<ContentItem[]> {
    return await db.select().from(contentItems)
      .where(eq(contentItems.status, 'PUBLISHED'))
      .orderBy(desc(contentItems.publishedAt));
  }

  async getContentBySlug(slug: string): Promise<ContentItem | null> {
    const [item] = await db.select().from(contentItems).where(eq(contentItems.slug, slug));
    return item || null;
  }

  async updateContent(id: number, updates: Partial<InsertContentItem>): Promise<ContentItem> {
    const [item] = await db
      .update(contentItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentItems.id, id))
      .returning();
    return item;
  }

  async deleteContent(id: number): Promise<void> {
    await db.delete(contentItems).where(eq(contentItems.id, id));
  }
}

export const storage = new DatabaseStorage();