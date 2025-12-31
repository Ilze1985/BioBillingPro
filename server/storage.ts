import {
  users,
  patients,
  billingCodes,
  sessions,
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type BillingCode,
  type InsertBillingCode,
  type Session,
  type InsertSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Patients
  getPatient(id: number): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;

  // Billing Codes
  getBillingCode(id: number): Promise<BillingCode | undefined>;
  getAllBillingCodes(): Promise<BillingCode[]>;
  getBillingCodesByType(billingType: 'medical_aid' | 'private'): Promise<BillingCode[]>;
  createBillingCode(code: InsertBillingCode): Promise<BillingCode>;

  // Sessions
  getSession(id: number): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionStatus(id: number, status: 'captured' | 'invoiced' | 'paid'): Promise<Session | undefined>;
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

  // Patients
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
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

  async updateSessionStatus(id: number, status: 'captured' | 'invoiced' | 'paid'): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set({ status })
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }
}

export const storage = new DatabaseStorage();
