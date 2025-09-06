import {
  User, InsertUser, Franchise, InsertFranchise, School, InsertSchool, Camp, InsertCamp,
  CampApproval, InsertCampApproval, Student, InsertStudent, Screening, InsertScreening, Report, InsertReport,
  users, franchises, schools, camps, campApprovals, students, screenings, reports
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Franchises
  createFranchise(franchise: InsertFranchise): Promise<Franchise>;
  getAllFranchises(): Promise<Franchise[]>;
  getFranchiseById(id: number): Promise<Franchise | null>;
  getFranchisesByUser(userId: number): Promise<Franchise[]>;
  updateFranchise(id: number, updates: Partial<InsertFranchise>): Promise<Franchise>;

  // Schools
  createSchool(school: InsertSchool): Promise<School>;
  getAllSchools(): Promise<School[]>;
  getSchoolById(id: number): Promise<School | null>;
  getSchoolsByFranchise(franchiseId: number): Promise<School[]>;
  getSchoolsByUser(userId: number): Promise<School[]>;
  getSchoolsByAdmin(adminUserId: number): Promise<School[]>;
  updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School>;
  deleteSchool(id: number): Promise<void>;

  // Camps
  createCamp(camp: InsertCamp): Promise<Camp>;
  getAllCamps(): Promise<Camp[]>;
  getCampById(id: number): Promise<Camp | null>;
  getCampsBySchool(schoolId: number): Promise<Camp[]>;
  getCampsByDentist(dentistId: number): Promise<Camp[]>;
  getCampsByFranchise(franchiseId: number): Promise<Camp[]>;
  updateCamp(id: number, updates: Partial<InsertCamp>): Promise<Camp>;

  // Camp Approvals
  createCampApproval(approval: InsertCampApproval): Promise<CampApproval>;
  getAllCampApprovals(): Promise<CampApproval[]>;
  getCampApprovalById(id: number): Promise<CampApproval | null>;
  getCampApprovalByCamp(campId: number): Promise<CampApproval | null>;
  updateCampApproval(id: number, updates: Partial<InsertCampApproval>): Promise<CampApproval>;

  // Students
  createStudent(student: InsertStudent): Promise<Student>;
  getAllStudents(): Promise<Student[]>;
  getStudentById(id: number): Promise<Student | null>;
  getStudentByEmail(email: string): Promise<Student | null>;
  getStudentsByCamp(campId: number): Promise<Student[]>;
  getStudentsBySchool(schoolId: number): Promise<Student[]>;
  updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student>;

  // Screenings
  createScreening(screening: InsertScreening): Promise<Screening>;
  getAllScreenings(): Promise<Screening[]>;
  getScreeningById(id: number): Promise<Screening | null>;
  getScreeningByStudent(studentId: number): Promise<Screening | null>;
  getScreeningsByCamp(campId: number): Promise<Screening[]>;
  getScreeningsByDentist(dentistId: number): Promise<Screening[]>;
  updateScreening(id: number, updates: Partial<InsertScreening>): Promise<Screening>;

  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getAllReports(): Promise<Report[]>;
  getReportById(id: number): Promise<Report | null>;
  getReportByScreening(screeningId: number): Promise<Report | null>;
  getReportsByStudent(studentId: number): Promise<Report[]>;
  updateReport(id: number, updates: Partial<InsertReport>): Promise<Report>;
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

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Franchises
  async createFranchise(insertFranchise: InsertFranchise): Promise<Franchise> {
    const [franchise] = await db
      .insert(franchises)
      .values(insertFranchise)
      .returning();
    return franchise;
  }

  async getAllFranchises(): Promise<Franchise[]> {
    return await db.select().from(franchises);
  }

  async getFranchiseById(id: number): Promise<Franchise | null> {
    const [franchise] = await db.select().from(franchises).where(eq(franchises.id, id));
    return franchise || null;
  }

  async getFranchisesByUser(userId: number): Promise<Franchise[]> {
    return await db.select().from(franchises).where(eq(franchises.franchiseeUserId, userId));
  }

  async updateFranchise(id: number, updates: Partial<InsertFranchise>): Promise<Franchise> {
    const [franchise] = await db
      .update(franchises)
      .set(updates)
      .where(eq(franchises.id, id))
      .returning();
    return franchise;
  }

  // Schools
  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const [school] = await db
      .insert(schools)
      .values(insertSchool)
      .returning();
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async getSchoolById(id: number): Promise<School | null> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || null;
  }

  async getSchoolsByFranchise(franchiseId: number): Promise<School[]> {
    return await db.select().from(schools).where(eq(schools.franchiseId, franchiseId));
  }

  async getSchoolsByUser(userId: number): Promise<School[]> {
    console.log('Storage: getSchoolsByUser called with userId:', userId);
    const result = await db.select().from(schools).where(eq(schools.adminUserId, userId));
    console.log('Storage: Found schools:', result.length, result);
    return result;
  }

  async getSchoolsByAdmin(adminUserId: number): Promise<School[]> {
    return await db.select().from(schools).where(eq(schools.adminUserId, adminUserId));
  }

  async updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School> {
    const [school] = await db
      .update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  async deleteSchool(id: number): Promise<void> {
    // Check for dependencies before deletion
    const associatedCamps = await this.getCampsBySchool(id);
    const associatedStudents = await this.getStudentsBySchool(id);
    
    const dependencies = [];
    if (associatedCamps.length > 0) {
      dependencies.push(`${associatedCamps.length} camp(s)`);
    }
    if (associatedStudents.length > 0) {
      dependencies.push(`${associatedStudents.length} student(s)`);
    }
    
    if (dependencies.length > 0) {
      throw new Error(`Cannot delete school. It has associated ${dependencies.join(' and ')}. Please remove these dependencies first.`);
    }
    
    await db.delete(schools).where(eq(schools.id, id));
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
    return await db.select().from(camps);
  }

  async getCampById(id: number): Promise<Camp | null> {
    const [camp] = await db.select().from(camps).where(eq(camps.id, id));
    return camp || null;
  }

  async getCampsBySchool(schoolId: number): Promise<Camp[]> {
    return await db.select().from(camps).where(eq(camps.schoolId, schoolId));
  }

  async getCampsByDentist(dentistId: number): Promise<Camp[]> {
    return await db.select().from(camps).where(eq(camps.assignedDentistId, dentistId));
  }

  async getCampsByFranchise(franchiseId: number): Promise<Camp[]> {
    const franchiseSchools = await this.getSchoolsByFranchise(franchiseId);
    const schoolIds = franchiseSchools.map(s => s.id);
    if (schoolIds.length === 0) return [];
    
    // This would need a more complex query with IN clause
    const allCamps = await db.select().from(camps);
    return allCamps.filter(c => schoolIds.includes(c.schoolId));
  }

  async updateCamp(id: number, updates: Partial<InsertCamp>): Promise<Camp> {
    const [camp] = await db
      .update(camps)
      .set(updates)
      .where(eq(camps.id, id))
      .returning();
    return camp;
  }

  // Camp Approvals
  async createCampApproval(insertApproval: InsertCampApproval): Promise<CampApproval> {
    const [approval] = await db
      .insert(campApprovals)
      .values(insertApproval)
      .returning();
    return approval;
  }

  async getAllCampApprovals(): Promise<CampApproval[]> {
    return await db.select().from(campApprovals);
  }

  async getCampApprovalById(id: number): Promise<CampApproval | null> {
    const [approval] = await db.select().from(campApprovals).where(eq(campApprovals.id, id));
    return approval || null;
  }

  async getCampApprovalByCamp(campId: number): Promise<CampApproval | null> {
    const [approval] = await db.select().from(campApprovals).where(eq(campApprovals.campId, campId));
    return approval || null;
  }

  async updateCampApproval(id: number, updates: Partial<InsertCampApproval>): Promise<CampApproval> {
    const [approval] = await db
      .update(campApprovals)
      .set(updates)
      .where(eq(campApprovals.id, id))
      .returning();
    return approval;
  }

  // Students
  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values(insertStudent)
      .returning();
    return student;
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getStudentById(id: number): Promise<Student | null> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || null;
  }

  async getStudentByEmail(email: string): Promise<Student | null> {
    const [student] = await db.select().from(students).where(eq(students.email, email));
    return student || null;
  }

  async getStudentsByCamp(campId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.campId, campId));
  }

  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.schoolId, schoolId));
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student> {
    const [student] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return student;
  }

  // Screenings
  async createScreening(insertScreening: InsertScreening): Promise<Screening> {
    const [screening] = await db
      .insert(screenings)
      .values(insertScreening)
      .returning();
    return screening;
  }

  async getAllScreenings(): Promise<Screening[]> {
    return await db.select().from(screenings);
  }

  async getScreeningById(id: number): Promise<Screening | null> {
    const [screening] = await db.select().from(screenings).where(eq(screenings.id, id));
    return screening || null;
  }

  async getScreeningByStudent(studentId: number): Promise<Screening | null> {
    const [screening] = await db.select().from(screenings).where(eq(screenings.studentId, studentId));
    return screening || null;
  }

  async getScreeningsByCamp(campId: number): Promise<Screening[]> {
    return await db.select().from(screenings).where(eq(screenings.campId, campId));
  }

  async getScreeningsByDentist(dentistId: number): Promise<Screening[]> {
    return await db.select().from(screenings).where(eq(screenings.dentistId, dentistId));
  }

  async updateScreening(id: number, updates: Partial<InsertScreening>): Promise<Screening> {
    const [screening] = await db
      .update(screenings)
      .set(updates)
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
    return await db.select().from(reports);
  }

  async getReportById(id: number): Promise<Report | null> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || null;
  }

  async getReportByScreening(screeningId: number): Promise<Report | null> {
    const [report] = await db.select().from(reports).where(eq(reports.screeningId, screeningId));
    return report || null;
  }

  async getReportsByStudent(studentId: number): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.studentId, studentId));
  }

  async updateReport(id: number, updates: Partial<InsertReport>): Promise<Report> {
    const [report] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }
}

export const storage = new DatabaseStorage();