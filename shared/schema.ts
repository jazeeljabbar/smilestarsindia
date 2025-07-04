import { pgTable, text, integer, boolean, timestamp, json, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and role management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // admin, dentist, school_admin, parent
  phoneNumber: text("phone_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schools table
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode"),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  adminUserId: integer("admin_user_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Camps table for dental camp scheduling
export const camps = pgTable("camps", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  expectedStudents: integer("expected_students").notNull(),
  status: text("status").notNull(), // planned, active, completed
  description: text("description"),
  assignedDentistId: integer("assigned_dentist_id"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  grade: text("grade").notNull(),
  rollNumber: text("roll_number").notNull(),
  schoolId: integer("school_id").notNull(),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone").notNull(),
  parentEmail: text("parent_email").notNull(),
  parentOccupation: text("parent_occupation"),
  campId: integer("camp_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dental screenings table
export const screenings = pgTable("screenings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  campId: integer("camp_id").notNull(),
  dentistId: integer("dentist_id").notNull(),
  
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  screeningId: integer("screening_id").notNull(),
  studentId: integer("student_id").notNull(),
  pdfData: text("pdf_data"), // Base64 encoded PDF
  sentToParent: boolean("sent_to_parent").default(false),
  sentAt: timestamp("sent_at"),
  generatedBy: integer("generated_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true, createdAt: true });
export const insertCampSchema = createInsertSchema(camps).omit({ id: true, createdAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true });
export const insertScreeningSchema = createInsertSchema(screenings).omit({ id: true, createdAt: true, completedAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type Camp = typeof camps.$inferSelect;
export type InsertCamp = z.infer<typeof insertCampSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Screening = typeof screenings.$inferSelect;
export type InsertScreening = z.infer<typeof insertScreeningSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type LoginData = z.infer<typeof loginSchema>;
