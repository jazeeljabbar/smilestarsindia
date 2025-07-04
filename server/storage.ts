import {
  User, InsertUser, School, InsertSchool, Camp, InsertCamp,
  Student, InsertStudent, Screening, InsertScreening, Report, InsertReport
} from "@shared/schema";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Schools
  createSchool(school: InsertSchool): Promise<School>;
  getAllSchools(): Promise<School[]>;
  getSchoolById(id: number): Promise<School | null>;
  updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School>;

  // Camps
  createCamp(camp: InsertCamp): Promise<Camp>;
  getAllCamps(): Promise<Camp[]>;
  getCampById(id: number): Promise<Camp | null>;
  getCampsBySchool(schoolId: number): Promise<Camp[]>;
  getCampsByDentist(dentistId: number): Promise<Camp[]>;
  updateCamp(id: number, updates: Partial<InsertCamp>): Promise<Camp>;

  // Students
  createStudent(student: InsertStudent): Promise<Student>;
  getAllStudents(): Promise<Student[]>;
  getStudentById(id: number): Promise<Student | null>;
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

class MemStorage implements IStorage {
  private users: User[] = [];
  private schools: School[] = [];
  private camps: Camp[] = [];
  private students: Student[] = [];
  private screenings: Screening[] = [];
  private reports: Report[] = [];
  private nextId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create admin user
    this.users.push({
      id: this.nextId++,
      email: "admin@smilestars.com",
      password: "$2b$10$hash", // In real app, this would be properly hashed
      name: "Dr. Admin",
      role: "admin",
      phoneNumber: "+91-9876543210",
      isActive: true,
      createdAt: new Date(),
    });

    // Create dentist user
    this.users.push({
      id: this.nextId++,
      email: "dentist@smilestars.com",
      password: "$2b$10$hash",
      name: "Dr. Priya Patel",
      role: "dentist",
      phoneNumber: "+91-9876543211",
      isActive: true,
      createdAt: new Date(),
    });

    // Create school admin user
    this.users.push({
      id: this.nextId++,
      email: "school@stmarysschool.edu.in",
      password: "$2b$10$hash",
      name: "St. Mary's School Admin",
      role: "school_admin",
      phoneNumber: "+91-9876543212",
      isActive: true,
      createdAt: new Date(),
    });

    // Create parent user
    this.users.push({
      id: this.nextId++,
      email: "parent@example.com",
      password: "$2b$10$hash",
      name: "Mrs. Sunita Patel",
      role: "parent",
      phoneNumber: "+91-9876543213",
      isActive: true,
      createdAt: new Date(),
    });

    // Create sample school
    const schoolId = this.nextId++;
    this.schools.push({
      id: schoolId,
      name: "St. Mary's High School",
      address: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      contactPerson: "Principal John",
      contactPhone: "+91-9876543212",
      contactEmail: "principal@stmarys.edu",
      adminUserId: 3, // School admin user ID
      isActive: true,
      createdAt: new Date(),
    });

    // Create sample camp
    const campId = this.nextId++;
    this.camps.push({
      id: campId,
      name: "St. Mary's Dental Screening Camp 2025",
      description: "Annual dental screening camp for students",
      schoolId: schoolId,
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-01-17'),
      status: "active",
      expectedStudents: 50,
      assignedDentistId: 2, // Dr. Priya Patel
      createdBy: 1, // Admin
      createdAt: new Date(),
    });

    // Create sample students
    const student1Id = this.nextId++;
    this.students.push({
      id: student1Id,
      name: "Arjun Patel",
      age: 12,
      gender: "Male",
      grade: "7th Grade",
      rollNumber: "SM-2025-001",
      schoolId: schoolId,
      campId: campId,
      parentName: "Mrs. Sunita Patel",
      parentPhone: "+91-9876543213",
      parentEmail: "parent@example.com",
      parentOccupation: "Software Engineer",
      createdAt: new Date(),
    });

    const student2Id = this.nextId++;
    this.students.push({
      id: student2Id,
      name: "Priya Sharma",
      age: 10,
      gender: "Female", 
      grade: "5th Grade",
      rollNumber: "SM-2025-002",
      schoolId: schoolId,
      campId: campId,
      parentName: "Mr. Raj Sharma",
      parentPhone: "+91-9876543214",
      parentEmail: "raj.sharma@example.com",
      parentOccupation: "Teacher",
      createdAt: new Date(),
    });

    const student3Id = this.nextId++;
    this.students.push({
      id: student3Id,
      name: "Kavya Singh",
      age: 8,
      gender: "Female",
      grade: "3rd Grade", 
      rollNumber: "SM-2025-003",
      schoolId: schoolId,
      campId: campId,
      parentName: "Mrs. Meera Singh",
      parentPhone: "+91-9876543215",
      parentEmail: "meera.singh@example.com",
      parentOccupation: "Doctor",
      createdAt: new Date(),
    });

    // Create sample screening for Arjun (parent's child)
    const screeningId = this.nextId++;
    this.screenings.push({
      id: screeningId,
      studentId: student1Id,
      campId: campId,
      dentistId: 2, // Dr. Priya Patel
      teethPresent: ["11", "12", "13", "21", "22", "23", "31", "32", "33", "41", "42", "43"],
      dentalAge: "12 years",
      decayedTeethCount: 2,
      missingTeethCount: 0,
      filledTeethCount: 1,
      crownedTeethCount: 0,
      oralHygiene: "fair",
      gumCondition: "mild_gingivitis",
      tongueExamination: "Normal tongue, no abnormalities detected",
      habits: "Thumb sucking observed",
      fluorideApplication: true,
      pitAndFissureSealant: false,
      oralHealthEducation: true,
      treatmentRequired: true,
      emergencyTreatment: false,
      referralRequired: true,
      followUpRequired: "3_months",
      treatmentPlan: "Fluoride treatment, oral hygiene education",
      oralHealthStatus: "fair",
      riskAssessment: "moderate",
      preventiveMeasures: "Regular brushing, fluoride toothpaste, reduce sugary snacks",
      completedAt: new Date(),
      isCompleted: true,
      createdAt: new Date(),
    });

    // Create sample report
    this.reports.push({
      id: this.nextId++,
      studentId: student1Id,
      screeningId: screeningId,
      pdfData: "Sample PDF data for Arjun Patel's dental report",
      sentToParent: true,
      sentAt: new Date(),
      generatedBy: 2, // Dr. Priya Patel
      createdAt: new Date(),
    });
  }

  // Users
  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.nextId++,
      createdAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    this.users[index] = { ...this.users[index], ...updates };
    return this.users[index];
  }

  // Schools
  async createSchool(school: InsertSchool): Promise<School> {
    const newSchool: School = {
      ...school,
      id: this.nextId++,
      createdAt: new Date(),
    };
    this.schools.push(newSchool);
    return newSchool;
  }

  async getAllSchools(): Promise<School[]> {
    return this.schools;
  }

  async getSchoolById(id: number): Promise<School | null> {
    return this.schools.find(s => s.id === id) || null;
  }

  async updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School> {
    const index = this.schools.findIndex(s => s.id === id);
    if (index === -1) throw new Error("School not found");
    this.schools[index] = { ...this.schools[index], ...updates };
    return this.schools[index];
  }

  // Camps
  async createCamp(camp: InsertCamp): Promise<Camp> {
    const newCamp: Camp = {
      ...camp,
      id: this.nextId++,
      createdAt: new Date(),
    };
    this.camps.push(newCamp);
    return newCamp;
  }

  async getAllCamps(): Promise<Camp[]> {
    return this.camps;
  }

  async getCampById(id: number): Promise<Camp | null> {
    return this.camps.find(c => c.id === id) || null;
  }

  async getCampsBySchool(schoolId: number): Promise<Camp[]> {
    return this.camps.filter(c => c.schoolId === schoolId);
  }

  async getCampsByDentist(dentistId: number): Promise<Camp[]> {
    return this.camps.filter(c => c.assignedDentistId === dentistId);
  }

  async updateCamp(id: number, updates: Partial<InsertCamp>): Promise<Camp> {
    const index = this.camps.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Camp not found");
    this.camps[index] = { ...this.camps[index], ...updates };
    return this.camps[index];
  }

  // Students
  async createStudent(student: InsertStudent): Promise<Student> {
    const newStudent: Student = {
      ...student,
      id: this.nextId++,
      createdAt: new Date(),
    };
    this.students.push(newStudent);
    return newStudent;
  }

  async getAllStudents(): Promise<Student[]> {
    return this.students;
  }

  async getStudentById(id: number): Promise<Student | null> {
    return this.students.find(s => s.id === id) || null;
  }

  async getStudentsByCamp(campId: number): Promise<Student[]> {
    return this.students.filter(s => s.campId === campId);
  }

  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    return this.students.filter(s => s.schoolId === schoolId);
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student> {
    const index = this.students.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Student not found");
    this.students[index] = { ...this.students[index], ...updates };
    return this.students[index];
  }

  // Screenings
  async createScreening(screening: InsertScreening): Promise<Screening> {
    const newScreening: Screening = {
      ...screening,
      id: this.nextId++,
      createdAt: new Date(),
      completedAt: screening.isCompleted ? new Date() : null,
    };
    this.screenings.push(newScreening);
    return newScreening;
  }

  async getAllScreenings(): Promise<Screening[]> {
    return this.screenings;
  }

  async getScreeningById(id: number): Promise<Screening | null> {
    return this.screenings.find(s => s.id === id) || null;
  }

  async getScreeningByStudent(studentId: number): Promise<Screening | null> {
    return this.screenings.find(s => s.studentId === studentId) || null;
  }

  async getScreeningsByCamp(campId: number): Promise<Screening[]> {
    return this.screenings.filter(s => s.campId === campId);
  }

  async getScreeningsByDentist(dentistId: number): Promise<Screening[]> {
    return this.screenings.filter(s => s.dentistId === dentistId);
  }

  async updateScreening(id: number, updates: Partial<InsertScreening>): Promise<Screening> {
    const index = this.screenings.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Screening not found");
    this.screenings[index] = { 
      ...this.screenings[index], 
      ...updates,
      completedAt: updates.isCompleted ? new Date() : this.screenings[index].completedAt
    };
    return this.screenings[index];
  }

  // Reports
  async createReport(report: InsertReport): Promise<Report> {
    const newReport: Report = {
      ...report,
      id: this.nextId++,
      createdAt: new Date(),
    };
    this.reports.push(newReport);
    return newReport;
  }

  async getAllReports(): Promise<Report[]> {
    return this.reports;
  }

  async getReportById(id: number): Promise<Report | null> {
    return this.reports.find(r => r.id === id) || null;
  }

  async getReportByScreening(screeningId: number): Promise<Report | null> {
    return this.reports.find(r => r.screeningId === screeningId) || null;
  }

  async getReportsByStudent(studentId: number): Promise<Report[]> {
    return this.reports.filter(r => r.studentId === studentId);
  }

  async updateReport(id: number, updates: Partial<InsertReport>): Promise<Report> {
    const index = this.reports.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Report not found");
    this.reports[index] = { ...this.reports[index], ...updates };
    return this.reports[index];
  }
}

export const storage = new MemStorage();
