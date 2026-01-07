import { pgTable, text, integer, boolean, timestamp, json, serial, varchar, pgEnum, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Enums
export const userStatusEnum = pgEnum("user_status", ["INVITED", "PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"]);
export const entityTypeEnum = pgEnum("entity_type", ["ORGANIZATION", "FRANCHISEE", "SCHOOL", "STUDENT"]);
export const entityStatusEnum = pgEnum("entity_status", ["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"]);
export const roleEnum = pgEnum("role", [
  "SYSTEM_ADMIN",
  "ORG_ADMIN",
  "FRANCHISE_ADMIN",
  "FRANCHISE_STAFF",
  "PRINCIPAL",
  "SCHOOL_ADMIN",
  "TEACHER",
  "PARENT",
  "DENTIST",
  "TECHNICIAN"
]);
export const relationshipEnum = pgEnum("relationship", ["MOTHER", "FATHER", "GUARDIAN", "OTHER"]);
export const campStatusEnum = pgEnum("camp_status", ["DRAFT", "SCHEDULED", "CONSENT_COLLECTION", "ACTIVE", "COMPLETED", "CANCELLED"]);
export const consentStatusEnum = pgEnum("consent_status", ["REQUESTED", "GRANTED", "DENIED", "REVOKED"]);

// Core Tables

// Users table - single login per person
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for magic-link users, required after first login
  phone: text("phone"),
  status: userStatusEnum("status").notNull().default("INVITED"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

// Entity hierarchy table - represents organizations, franchisees, schools, students
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  type: entityTypeEnum("type").notNull(),
  name: text("name").notNull(),
  parentId: integer("parent_id"), // Self-referencing FK for hierarchy
  status: entityStatusEnum("status").notNull().default("DRAFT"),

  // Additional fields for different entity types
  metadata: json("metadata").$type<{
    // For ORGANIZATION
    orgDescription?: string;

    // For FRANCHISEE
    region?: string;
    franchiseContactPerson?: string;
    franchiseContactEmail?: string;
    franchiseContactPhone?: string;
    franchiseAddress?: string;
    franchiseCity?: string;
    franchiseState?: string;
    franchisePincode?: string;

    // For SCHOOL
    schoolAddress?: string;
    schoolCity?: string;
    schoolState?: string;
    schoolPincode?: string;
    schoolContactPerson?: string;
    schoolContactPhone?: string;
    schoolContactEmail?: string;
    registrationNumber?: string;
    hasSubBranches?: boolean;

    // For STUDENT
    age?: number;
    gender?: string;
    grade?: string;
    rollNumber?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    parentOccupation?: string;

    // Generic aliases (used in some places)
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("entities_type_idx").on(table.type),
  parentIdx: index("entities_parent_idx").on(table.parentId),
  statusIdx: index("entities_status_idx").on(table.status),
}));

// Membership table - links users to entities with roles
export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  entityId: integer("entity_id").notNull(),
  role: roleEnum("role").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("memberships_user_idx").on(table.userId),
  entityIdx: index("memberships_entity_idx").on(table.entityId),
  roleIdx: index("memberships_role_idx").on(table.role),
}));

// Parent-Student relationships (many-to-many)
export const parentStudentLinks = pgTable("parent_student_links", {
  id: serial("id").primaryKey(),
  parentUserId: integer("parent_user_id").notNull(),
  studentEntityId: integer("student_entity_id").notNull(), // FK to entities where type=STUDENT
  relationship: relationshipEnum("relationship").notNull(),
  custodyFlags: json("custody_flags").$type<{
    hasCustody?: boolean;
    canPickup?: boolean;
    emergencyContact?: boolean;
    medicalDecisions?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("parent_student_parent_idx").on(table.parentUserId),
  studentIdx: index("parent_student_student_idx").on(table.studentEntityId),
  // Prevent duplicate parent-student pairs
  parentStudentUnique: unique("parent_student_unique").on(table.parentUserId, table.studentEntityId),
}));

// Agreements and acceptance tracking
export const agreements = pgTable("agreements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // e.g., 'TOS_PARENT', 'TOS_STAFF'
  version: text("version").notNull(),
  title: text("title").notNull(),
  bodyMd: text("body_md").notNull(), // Markdown content
  effectiveAt: timestamp("effective_at").notNull(),
  requiredRoles: json("required_roles").$type<string[]>().notNull(), // Array of role strings
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  codeVersionUnique: unique("agreement_code_version").on(table.code, table.version),
  codeIdx: index("agreements_code_idx").on(table.code),
}));

export const agreementAcceptances = pgTable("agreement_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  agreementId: integer("agreement_id").notNull(),
  version: text("version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
}, (table) => ({
  userIdx: index("acceptances_user_idx").on(table.userId),
  agreementIdx: index("acceptances_agreement_idx").on(table.agreementId),
}));

// Audit logging
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id"), // Can be null for system actions
  action: text("action").notNull(),
  entityId: integer("entity_id"),
  targetId: integer("target_id"),
  targetType: text("target_type"),
  metadata: json("metadata").$type<Record<string, any>>(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("audit_actor_idx").on(table.actorUserId),
  actionIdx: index("audit_action_idx").on(table.action),
  timestampIdx: index("audit_timestamp_idx").on(table.occurredAt),
}));

// Magic link tokens for passwordless auth
export const magicTokens = pgTable("magic_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  purpose: text("purpose").notNull().default("LOGIN"), // LOGIN, INVITE
  metadata: json("metadata").$type<{
    targetEntityId?: number;
    targetRole?: string;
    invitedBy?: number;
    firstName?: string;
    lastName?: string;
    franchiseeId?: number;
    franchiseeName?: string;
    schoolId?: number;
    schoolName?: string;
    userId?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("magic_tokens_token_idx").on(table.token),
  emailIdx: index("magic_tokens_email_idx").on(table.email),
  expiresIdx: index("magic_tokens_expires_idx").on(table.expiresAt),
}));

// Dental-specific tables (keeping the core functionality)

// Camps table
export const camps = pgTable("camps", {
  id: serial("id").primaryKey(),
  schoolEntityId: integer("school_entity_id").notNull(), // FK to entities where type=SCHOOL
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  expectedStudents: integer("expected_students").notNull(),
  status: campStatusEnum("status").notNull().default("DRAFT"), // State machine managed
  description: text("description"),
  assignedDentistId: integer("assigned_dentist_id"), // FK to users with DENTIST role
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  schoolIdx: index("camps_school_idx").on(table.schoolEntityId),
  statusIdx: index("camps_status_idx").on(table.status),
}));

// Consents table - tracks parental permission for camps
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").notNull(), // FK to camps
  studentEntityId: integer("student_entity_id").notNull(), // FK to entities where type=STUDENT
  status: consentStatusEnum("status").notNull().default("REQUESTED"),

  // Decision details
  grantedAt: timestamp("granted_at"),
  deniedAt: timestamp("denied_at"),
  denialReason: text("denial_reason"),

  // Audit details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  campIdx: index("consents_camp_idx").on(table.campId),
  studentIdx: index("consents_student_idx").on(table.studentEntityId),
  statusIdx: index("consents_status_idx").on(table.status),
  // One consent record per student per camp
  uniqueConsent: unique("camp_student_consent_unique").on(table.campId, table.studentEntityId),
}));

// Camp enrollments - links specific students to camps
export const campEnrollments = pgTable("camp_enrollments", {
  id: serial("id").primaryKey(),
  campId: integer("camp_id").notNull(), // FK to camps
  studentEntityId: integer("student_entity_id").notNull(), // FK to entities where type=STUDENT
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  enrolledBy: integer("enrolled_by").notNull(), // FK to users
  status: text("status").notNull().default("ENROLLED"), // ENROLLED, DROPPED, COMPLETED
}, (table) => ({
  campIdx: index("camp_enrollments_camp_idx").on(table.campId),
  studentIdx: index("camp_enrollments_student_idx").on(table.studentEntityId),
  // Prevent duplicate enrollments
  campStudentUnique: unique("camp_student_unique").on(table.campId, table.studentEntityId),
}));

// Dental screenings table
export const screenings = pgTable("screenings", {
  id: serial("id").primaryKey(),
  studentEntityId: integer("student_entity_id").notNull(), // FK to entities where type=STUDENT
  campId: integer("camp_id").notNull(),
  dentistUserId: integer("dentist_user_id").notNull(), // FK to users with DENTIST role

  // Dental examination data
  teethPresent: json("teeth_present").$type<string[]>(),
  dentalAge: text("dental_age"),
  decayedTeethCount: integer("decayed_teeth_count").default(0),
  decayedTeeth: json("decayed_teeth").$type<string[]>(),
  missingTeethCount: integer("missing_teeth_count").default(0),
  missingTeeth: json("missing_teeth").$type<string[]>(),
  filledTeethCount: integer("filled_teeth_count").default(0),
  filledTeeth: json("filled_teeth").$type<string[]>(),
  crownedTeethCount: integer("crowned_teeth_count").default(0),
  crownedTeeth: json("crowned_teeth").$type<string[]>(),

  // Clinical findings
  deepGrooves: boolean("deep_grooves").default(false),
  stains: text("stains"), // +, ++, +++
  calculus: text("calculus"), // +, ++, +++
  gingivalRecession: boolean("gingival_recession").default(false),
  tongueExamination: text("tongue_examination"),
  primateSpacing: boolean("primate_spacing").default(false),
  midlineDiastema: boolean("midline_diastema").default(false),
  delayedEruption: boolean("delayed_eruption").default(false),

  // Occlusion
  crossBiteUnilateral: boolean("cross_bite_unilateral").default(false),
  crossBiteBilateral: boolean("cross_bite_bilateral").default(false),
  crossBiteAnterior: boolean("cross_bite_anterior").default(false),
  crossBiteTeethType: text("cross_bite_teeth_type"), // primary, permanent
  openBiteAnterior: boolean("open_bite_anterior").default(false),
  openBitePosteriorUnilateral: boolean("open_bite_posterior_unilateral").default(false),
  openBitePosteriorBilateral: boolean("open_bite_posterior_bilateral").default(false),
  deepBite: boolean("deep_bite").default(false),
  occlusion: text("occlusion"),

  // Relationships
  canineRelationshipPrimary: text("canine_relationship_primary"), // class_i, class_ii, class_iii
  canineRelationshipPermanent: text("canine_relationship_permanent"),
  molarRelationshipPrimary: text("molar_relationship_primary"),
  molarRelationshipPermanent: text("molar_relationship_permanent"),

  // Other findings
  dentalAnomalies: text("dental_anomalies"),
  abnormalFrenalAttachments: boolean("abnormal_frenal_attachments").default(false),
  developmentalDefects: text("developmental_defects"),
  habits: text("habits"),

  // Trauma
  traumaType: text("trauma_type"), // Ellis classification I-IX
  traumaRootDevelopment: text("trauma_root_development"), // immature, mature

  // Recommendations
  preventiveMeasures: text("preventive_measures"),

  // Status
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  screeningId: integer("screening_id").notNull(),
  studentEntityId: integer("student_entity_id").notNull(),
  pdfData: text("pdf_data"), // Base64 encoded PDF
  sentToParent: boolean("sent_to_parent").default(false),
  sentAt: timestamp("sent_at"),
  generatedBy: integer("generated_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Content Management (Twinky Corner)
export const contentStatusEnum = pgEnum("content_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const contentTypeEnum = pgEnum("content_type", ["ARTICLE", "VIDEO", "INFOGRAPHIC"]);

export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(), // unique-url-friendly-title
  type: contentTypeEnum("type").notNull(),
  description: text("description"), // Short summary
  content: text("content"), // Markdown body or text content
  mediaUrl: text("media_url"), // External URL (YouTube, S3)
  thumbnailUrl: text("thumbnail_url"),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  authorId: integer("author_id"), // FK to users

  viewCount: integer("view_count").default(0),

  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("content_status_idx").on(table.status),
  typeIdx: index("content_type_idx").on(table.type),
  slugIdx: index("content_slug_idx").on(table.slug),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEntitySchema = createInsertSchema(entities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMembershipSchema = createInsertSchema(memberships).omit({ id: true, createdAt: true });
export const insertParentStudentLinkSchema = createInsertSchema(parentStudentLinks).omit({ id: true, createdAt: true });
export const insertAgreementSchema = createInsertSchema(agreements).omit({ id: true, createdAt: true });
export const insertAgreementAcceptanceSchema = createInsertSchema(agreementAcceptances).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export const insertMagicTokenSchema = createInsertSchema(magicTokens).omit({ id: true, createdAt: true });
export const insertCampSchema = createInsertSchema(camps).omit({ id: true, createdAt: true });
export const insertCampEnrollmentSchema = createInsertSchema(campEnrollments).omit({ id: true, enrolledAt: true });
export const insertConsentSchema = createInsertSchema(consents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScreeningSchema = createInsertSchema(screenings).omit({ id: true, createdAt: true, completedAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

// Auth schemas
export const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const magicLinkConsumeSchema = z.object({
  token: z.string().min(1),
});

export const acceptAgreementsSchema = z.object({
  agreementIds: z.array(z.number()),
});

// User creation schemas
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const createMembershipSchema = z.object({
  userId: z.number(),
  entityId: z.number(),
  role: z.enum(["SYSTEM_ADMIN", "ORG_ADMIN", "FRANCHISE_ADMIN", "FRANCHISE_STAFF", "PRINCIPAL", "SCHOOL_ADMIN", "TEACHER", "PARENT", "DENTIST", "TECHNICIAN"]),
  isPrimary: z.boolean().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  targetEntityId: z.number(),
  role: z.enum(["SYSTEM_ADMIN", "ORG_ADMIN", "FRANCHISE_ADMIN", "FRANCHISE_STAFF", "PRINCIPAL", "SCHOOL_ADMIN", "TEACHER", "PARENT", "DENTIST", "TECHNICIAN"]),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type ParentStudentLink = typeof parentStudentLinks.$inferSelect;
export type InsertParentStudentLink = z.infer<typeof insertParentStudentLinkSchema>;
export type Agreement = typeof agreements.$inferSelect;
export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type AgreementAcceptance = typeof agreementAcceptances.$inferSelect;
export type InsertAgreementAcceptance = z.infer<typeof insertAgreementAcceptanceSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type MagicToken = typeof magicTokens.$inferSelect;
export type InsertMagicToken = z.infer<typeof insertMagicTokenSchema>;
export type Camp = typeof camps.$inferSelect;
export type InsertCamp = z.infer<typeof insertCampSchema>;
export type CampEnrollment = typeof campEnrollments.$inferSelect;
export type InsertCampEnrollment = z.infer<typeof insertCampEnrollmentSchema>;
export type Screening = typeof screenings.$inferSelect;
export type InsertScreening = z.infer<typeof insertScreeningSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Consent = typeof consents.$inferSelect;
export type InsertConsent = z.infer<typeof insertConsentSchema>;

// Auth types
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkConsume = z.infer<typeof magicLinkConsumeSchema>;
export type AcceptAgreements = z.infer<typeof acceptAgreementsSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type CreateMembership = z.infer<typeof createMembershipSchema>;
export type InviteUser = z.infer<typeof inviteUserSchema>;

// Content Schemas
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;