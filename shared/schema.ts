import { pgTable, text, serial, integer, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['admin', 'practitioner']);
export const sessionStatusEnum = pgEnum('session_status', ['captured', 'invoiced', 'paid']);
export const billingTypeEnum = pgEnum('billing_type', ['medical_aid', 'private', 'private_cash']);
export const billingFrequencyEnum = pgEnum('billing_frequency', ['weekly', 'monthly']);

export const financialPeriods = pgTable("financial_periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default('practitioner'),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  dateOfBirth: text("date_of_birth"),
  accountNumber: text("account_number"),
  billingType: billingTypeEnum("billing_type").notNull().default('medical_aid'),
  medicalAidName: text("medical_aid_name"),
});

export const patientsRelations = relations(patients, ({ many }) => ({
  sessions: many(sessions),
}));

export const billingCodes = pgTable("billing_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  billingType: billingTypeEnum("billing_type").notNull().default('medical_aid'),
  billingFrequency: billingFrequencyEnum("billing_frequency").notNull().default('weekly'),
});

export const billingCodesRelations = relations(billingCodes, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  practitionerId: integer("practitioner_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  billingCodeIds: integer("billing_code_ids").array().notNull(),
  billingType: billingTypeEnum("billing_type").notNull().default('medical_aid'),
  date: text("date").notNull(),
  time: text("time").notNull(),
  notes: text("notes"),
  discountPercent: integer("discount_percent").default(0),
  status: sessionStatusEnum("status").notNull().default('captured'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  practitioner: one(users, {
    fields: [sessions.practitionerId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [sessions.patientId],
    references: [patients.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertBillingCodeSchema = createInsertSchema(billingCodes).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true }).extend({
  discountPercent: z.number().min(0).optional().default(0)
});
export const insertFinancialPeriodSchema = createInsertSchema(financialPeriods).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type BillingCode = typeof billingCodes.$inferSelect;
export type InsertBillingCode = z.infer<typeof insertBillingCodeSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type FinancialPeriod = typeof financialPeriods.$inferSelect;
export type InsertFinancialPeriod = z.infer<typeof insertFinancialPeriodSchema>;
