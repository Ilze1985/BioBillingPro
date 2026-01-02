import {
  users,
  patients,
  billingCodes,
  sessions,
  financialPeriods,
  populationGroups,
  weeklyBillingStatements,
  monthlyBillingStatements,
  authSessions,
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type BillingCode,
  type InsertBillingCode,
  type Session,
  type InsertSession,
  type FinancialPeriod,
  type InsertFinancialPeriod,
  type PopulationGroup,
  type InsertPopulationGroup,
  type WeeklyBillingStatement,
  type InsertWeeklyBillingStatement,
  type MonthlyBillingStatement,
  type InsertMonthlyBillingStatement,
  type AuthSession,
  type InsertAuthSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ne, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Patients
  getPatient(id: number): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  getPatientsByPractitioner(practitionerId: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<boolean>;

  // Billing Codes
  getBillingCode(id: number): Promise<BillingCode | undefined>;
  getAllBillingCodes(): Promise<BillingCode[]>;
  getBillingCodesByType(billingType: 'medical_aid' | 'private'): Promise<BillingCode[]>;
  createBillingCode(code: InsertBillingCode): Promise<BillingCode>;
  updateBillingCode(id: number, data: Partial<InsertBillingCode>): Promise<BillingCode | undefined>;
  deleteBillingCode(id: number): Promise<boolean>;
  bulkCreateBillingCodes(codes: InsertBillingCode[]): Promise<BillingCode[]>;

  // Sessions
  getSession(id: number): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, data: Partial<InsertSession>): Promise<Session | undefined>;
  updateSessionStatus(id: number, status: 'captured' | 'invoiced' | 'paid'): Promise<Session | undefined>;
  updateSessionControlStatus(id: number, controlStatus: 'awaiting_review' | 'invoice_and_send'): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;

  // Financial Periods
  getFinancialPeriod(id: number): Promise<FinancialPeriod | undefined>;
  getAllFinancialPeriods(): Promise<FinancialPeriod[]>;
  createFinancialPeriod(period: InsertFinancialPeriod): Promise<FinancialPeriod>;
  updateFinancialPeriod(id: number, data: Partial<InsertFinancialPeriod>): Promise<FinancialPeriod | undefined>;
  deleteFinancialPeriod(id: number): Promise<boolean>;

  // Population Groups
  getAllPopulationGroups(): Promise<PopulationGroup[]>;
  createPopulationGroup(group: InsertPopulationGroup): Promise<PopulationGroup>;
  updatePopulationGroup(id: number, data: Partial<InsertPopulationGroup>): Promise<PopulationGroup | undefined>;
  deletePopulationGroup(id: number): Promise<boolean>;

  // Weekly Billing Statements
  getWeeklyBillingStatement(id: number): Promise<WeeklyBillingStatement | undefined>;
  getAllWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]>;
  getActiveWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]>;
  getArchivedWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]>;
  createWeeklyBillingStatement(statement: InsertWeeklyBillingStatement): Promise<WeeklyBillingStatement>;
  updateWeeklyBillingStatement(id: number, data: Partial<InsertWeeklyBillingStatement>): Promise<WeeklyBillingStatement | undefined>;
  updateWeeklyBillingStatementStatus(id: number, status: 'awaiting_review' | 'ready_to_send' | 'statement_sent' | 'archived', statementTypeNote?: string, sentDate?: string): Promise<WeeklyBillingStatement | undefined>;
  deleteWeeklyBillingStatement(id: number): Promise<boolean>;

  // Monthly Billing Statements
  getMonthlyBillingStatement(id: number): Promise<MonthlyBillingStatement | undefined>;
  getAllMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]>;
  getActiveMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]>;
  getArchivedMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]>;
  createMonthlyBillingStatement(statement: InsertMonthlyBillingStatement): Promise<MonthlyBillingStatement>;
  updateMonthlyBillingStatement(id: number, data: Partial<InsertMonthlyBillingStatement>): Promise<MonthlyBillingStatement | undefined>;
  updateMonthlyBillingStatementStatus(id: number, status: 'awaiting_review' | 'ready_to_send' | 'statement_sent' | 'archived', statementTypeNote?: string, sentDate?: string): Promise<MonthlyBillingStatement | undefined>;
  deleteMonthlyBillingStatement(id: number): Promise<boolean>;

  // Auth Sessions
  createAuthSession(session: InsertAuthSession): Promise<AuthSession>;
  getAuthSession(id: string): Promise<AuthSession | undefined>;
  deleteAuthSession(id: string): Promise<boolean>;
  deleteExpiredAuthSessions(): Promise<void>;

  // Practitioner-scoped queries
  getSessionsByPractitioner(practitionerId: number): Promise<Session[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Patients
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getPatientsByPractitioner(practitionerId: number): Promise<Patient[]> {
    return await db.select().from(patients).where(eq(patients.practitionerId, practitionerId));
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    return patient || undefined;
  }

  async deletePatient(id: number): Promise<boolean> {
    await db.delete(patients).where(eq(patients.id, id));
    return true;
  }

  // Billing Codes
  async getBillingCode(id: number): Promise<BillingCode | undefined> {
    const [code] = await db.select().from(billingCodes).where(eq(billingCodes.id, id));
    return code || undefined;
  }

  async getAllBillingCodes(): Promise<BillingCode[]> {
    return await db.select().from(billingCodes);
  }

  async getBillingCodesByType(billingType: 'medical_aid' | 'private'): Promise<BillingCode[]> {
    return await db.select().from(billingCodes).where(eq(billingCodes.billingType, billingType));
  }

  async createBillingCode(insertCode: InsertBillingCode): Promise<BillingCode> {
    const [code] = await db.insert(billingCodes).values(insertCode).returning();
    return code;
  }

  async updateBillingCode(id: number, data: Partial<InsertBillingCode>): Promise<BillingCode | undefined> {
    const [code] = await db.update(billingCodes).set(data).where(eq(billingCodes.id, id)).returning();
    return code || undefined;
  }

  async deleteBillingCode(id: number): Promise<boolean> {
    await db.delete(billingCodes).where(eq(billingCodes.id, id));
    return true;
  }

  async bulkCreateBillingCodes(codes: InsertBillingCode[]): Promise<BillingCode[]> {
    if (codes.length === 0) return [];
    const result = await db.insert(billingCodes).values(codes).returning();
    return result;
  }

  // Sessions
  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.createdAt));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSession(id: number, data: Partial<InsertSession>): Promise<Session | undefined> {
    const [session] = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning();
    return session || undefined;
  }

  async updateSessionStatus(id: number, status: 'captured' | 'invoiced' | 'paid'): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set({ status })
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async updateSessionControlStatus(id: number, controlStatus: 'awaiting_review' | 'invoice_and_send'): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set({ controlStatus })
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteSession(id: number): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.id, id));
    return true;
  }

  // Financial Periods
  async getFinancialPeriod(id: number): Promise<FinancialPeriod | undefined> {
    const [period] = await db.select().from(financialPeriods).where(eq(financialPeriods.id, id));
    return period || undefined;
  }

  async getAllFinancialPeriods(): Promise<FinancialPeriod[]> {
    return await db.select().from(financialPeriods);
  }

  async createFinancialPeriod(insertPeriod: InsertFinancialPeriod): Promise<FinancialPeriod> {
    const [period] = await db.insert(financialPeriods).values(insertPeriod).returning();
    return period;
  }

  async updateFinancialPeriod(id: number, data: Partial<InsertFinancialPeriod>): Promise<FinancialPeriod | undefined> {
    const [period] = await db.update(financialPeriods).set(data).where(eq(financialPeriods.id, id)).returning();
    return period || undefined;
  }

  async deleteFinancialPeriod(id: number): Promise<boolean> {
    await db.delete(financialPeriods).where(eq(financialPeriods.id, id));
    return true;
  }

  // Population Groups
  async getAllPopulationGroups(): Promise<PopulationGroup[]> {
    return await db.select().from(populationGroups);
  }

  async createPopulationGroup(group: InsertPopulationGroup): Promise<PopulationGroup> {
    const [newGroup] = await db.insert(populationGroups).values(group).returning();
    return newGroup;
  }

  async updatePopulationGroup(id: number, data: Partial<InsertPopulationGroup>): Promise<PopulationGroup | undefined> {
    const [group] = await db.update(populationGroups).set(data).where(eq(populationGroups.id, id)).returning();
    return group || undefined;
  }

  async deletePopulationGroup(id: number): Promise<boolean> {
    await db.delete(populationGroups).where(eq(populationGroups.id, id));
    return true;
  }

  // Weekly Billing Statements
  async getWeeklyBillingStatement(id: number): Promise<WeeklyBillingStatement | undefined> {
    const [statement] = await db.select().from(weeklyBillingStatements).where(eq(weeklyBillingStatements.id, id));
    return statement || undefined;
  }

  async getAllWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]> {
    return await db.select().from(weeklyBillingStatements).orderBy(desc(weeklyBillingStatements.createdAt));
  }

  async getActiveWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]> {
    return await db.select().from(weeklyBillingStatements)
      .where(ne(weeklyBillingStatements.status, 'archived'))
      .orderBy(desc(weeklyBillingStatements.createdAt));
  }

  async createWeeklyBillingStatement(insertStatement: InsertWeeklyBillingStatement): Promise<WeeklyBillingStatement> {
    const [statement] = await db.insert(weeklyBillingStatements).values(insertStatement).returning();
    return statement;
  }

  async updateWeeklyBillingStatement(id: number, data: Partial<InsertWeeklyBillingStatement>): Promise<WeeklyBillingStatement | undefined> {
    const [statement] = await db.update(weeklyBillingStatements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(weeklyBillingStatements.id, id))
      .returning();
    return statement || undefined;
  }

  async updateWeeklyBillingStatementStatus(
    id: number, 
    status: 'awaiting_review' | 'ready_to_send' | 'statement_sent' | 'archived',
    statementTypeNote?: string,
    sentDate?: string
  ): Promise<WeeklyBillingStatement | undefined> {
    const updateData: Partial<WeeklyBillingStatement> = { status, updatedAt: new Date() };
    if (statementTypeNote !== undefined) {
      updateData.statementTypeNote = statementTypeNote;
    }
    if (sentDate !== undefined) {
      updateData.sentDate = sentDate;
    }
    const [statement] = await db.update(weeklyBillingStatements)
      .set(updateData)
      .where(eq(weeklyBillingStatements.id, id))
      .returning();
    return statement || undefined;
  }

  async deleteWeeklyBillingStatement(id: number): Promise<boolean> {
    await db.delete(weeklyBillingStatements).where(eq(weeklyBillingStatements.id, id));
    return true;
  }

  async getArchivedWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]> {
    return await db.select().from(weeklyBillingStatements)
      .where(eq(weeklyBillingStatements.status, 'archived'))
      .orderBy(desc(weeklyBillingStatements.createdAt));
  }

  // Monthly Billing Statements
  async getMonthlyBillingStatement(id: number): Promise<MonthlyBillingStatement | undefined> {
    const [statement] = await db.select().from(monthlyBillingStatements).where(eq(monthlyBillingStatements.id, id));
    return statement || undefined;
  }

  async getAllMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]> {
    return await db.select().from(monthlyBillingStatements).orderBy(desc(monthlyBillingStatements.createdAt));
  }

  async getActiveMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]> {
    return await db.select().from(monthlyBillingStatements)
      .where(ne(monthlyBillingStatements.status, 'archived'))
      .orderBy(desc(monthlyBillingStatements.createdAt));
  }

  async getArchivedMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]> {
    return await db.select().from(monthlyBillingStatements)
      .where(eq(monthlyBillingStatements.status, 'archived'))
      .orderBy(desc(monthlyBillingStatements.createdAt));
  }

  async createMonthlyBillingStatement(insertStatement: InsertMonthlyBillingStatement): Promise<MonthlyBillingStatement> {
    const [statement] = await db.insert(monthlyBillingStatements).values(insertStatement).returning();
    return statement;
  }

  async updateMonthlyBillingStatement(id: number, data: Partial<InsertMonthlyBillingStatement>): Promise<MonthlyBillingStatement | undefined> {
    const [statement] = await db.update(monthlyBillingStatements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(monthlyBillingStatements.id, id))
      .returning();
    return statement || undefined;
  }

  async updateMonthlyBillingStatementStatus(
    id: number, 
    status: 'awaiting_review' | 'ready_to_send' | 'statement_sent' | 'archived',
    statementTypeNote?: string,
    sentDate?: string
  ): Promise<MonthlyBillingStatement | undefined> {
    const updateData: Partial<MonthlyBillingStatement> = { status, updatedAt: new Date() };
    if (statementTypeNote !== undefined) {
      updateData.statementTypeNote = statementTypeNote;
    }
    if (sentDate !== undefined) {
      updateData.sentDate = sentDate;
    }
    const [statement] = await db.update(monthlyBillingStatements)
      .set(updateData)
      .where(eq(monthlyBillingStatements.id, id))
      .returning();
    return statement || undefined;
  }

  async deleteMonthlyBillingStatement(id: number): Promise<boolean> {
    await db.delete(monthlyBillingStatements).where(eq(monthlyBillingStatements.id, id));
    return true;
  }

  // Auth Sessions
  async createAuthSession(session: InsertAuthSession): Promise<AuthSession> {
    const [authSession] = await db.insert(authSessions).values(session).returning();
    return authSession;
  }

  async getAuthSession(id: string): Promise<AuthSession | undefined> {
    const [session] = await db.select().from(authSessions).where(eq(authSessions.id, id));
    return session || undefined;
  }

  async deleteAuthSession(id: string): Promise<boolean> {
    await db.delete(authSessions).where(eq(authSessions.id, id));
    return true;
  }

  async deleteExpiredAuthSessions(): Promise<void> {
    await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  }

  // Practitioner-scoped queries
  async getSessionsByPractitioner(practitionerId: number): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.practitionerId, practitionerId));
  }
}

export const storage = new DatabaseStorage();
