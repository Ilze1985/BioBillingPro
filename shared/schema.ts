import { pgTable, text, serial, integer, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['admin', 'practitioner', 'receptionist']);
export const sessionStatusEnum = pgEnum('session_status', ['captured', 'invoiced', 'paid']);
export const billingTypeEnum = pgEnum('billing_type', ['medical_aid', 'private', 'private_cash']);
export const billingFrequencyEnum = pgEnum('billing_frequency', ['weekly', 'monthly']);
export const statementStatusEnum = pgEnum('statement_status', ['awaiting_review', 'ready_to_send', 'statement_sent', 'archived']);
export const invoiceControlStatusEnum = pgEnum('invoice_control_status', ['awaiting_review', 'invoice_and_send']);
export const genderEnum = pgEnum('gender', ['male', 'female']);
export const populationGroupEnum = pgEnum('population_group', [
  'orthopaedic', 'metabolic', 'cardiac', 
  'conditioning_development_10_13', 'conditioning_adolescent_14_18', 
  'conditioning_adult', 'wellness', 'geriatric'
]);
export const practiceNameEnum = pgEnum('practice_name', ['DPP', 'IDP']);

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
  practitionerId: integer("practitioner_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  dateOfBirth: text("date_of_birth"),
  practiceName: practiceNameEnum("practice_name"),
  accountNumber: text("account_number"),
  billingType: billingTypeEnum("billing_type").notNull().default('medical_aid'),
  medicalAidName: text("medical_aid_name"),
  gender: genderEnum("gender"),
  populationGroup: populationGroupEnum("population_group"),
  mainstream: text("mainstream"),
  monthlyBillingActive: text("monthly_billing_active").default('yes'),
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
  billingFrequency: billingFrequencyEnum("billing_frequency").notNull().default('weekly'),
  date: text("date").notNull(),
  time: text("time").notNull(),
  notes: text("notes"),
  discountAmount: integer("discount_amount").default(0),
  status: sessionStatusEnum("status").notNull().default('captured'),
  controlStatus: invoiceControlStatusEnum("control_status").default('awaiting_review'),
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

export const weeklyBillingStatements = pgTable("weekly_billing_statements", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  financialPeriodId: integer("financial_period_id").references(() => financialPeriods.id),
  practitionerId: integer("practitioner_id").references(() => users.id),
  weekStartDate: text("week_start_date").notNull(),
  weekEndDate: text("week_end_date").notNull(),
  status: statementStatusEnum("status").notNull().default('awaiting_review'),
  statementTypeNote: text("statement_type_note"),
  totalAmount: integer("total_amount").default(0),
  sentDate: text("sent_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const weeklyBillingStatementsRelations = relations(weeklyBillingStatements, ({ one }) => ({
  patient: one(patients, {
    fields: [weeklyBillingStatements.patientId],
    references: [patients.id],
  }),
  financialPeriod: one(financialPeriods, {
    fields: [weeklyBillingStatements.financialPeriodId],
    references: [financialPeriods.id],
  }),
  practitioner: one(users, {
    fields: [weeklyBillingStatements.practitionerId],
    references: [users.id],
  }),
}));

export const monthlyBillingStatements = pgTable("monthly_billing_statements", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  financialPeriodId: integer("financial_period_id").references(() => financialPeriods.id),
  practitionerId: integer("practitioner_id").references(() => users.id),
  sessionId: integer("session_id").references(() => sessions.id),
  status: statementStatusEnum("status").notNull().default('awaiting_review'),
  statementTypeNote: text("statement_type_note"),
  totalAmount: integer("total_amount").default(0),
  sentDate: text("sent_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const monthlyBillingStatementsRelations = relations(monthlyBillingStatements, ({ one }) => ({
  patient: one(patients, {
    fields: [monthlyBillingStatements.patientId],
    references: [patients.id],
  }),
  financialPeriod: one(financialPeriods, {
    fields: [monthlyBillingStatements.financialPeriodId],
    references: [financialPeriods.id],
  }),
  practitioner: one(users, {
    fields: [monthlyBillingStatements.practitionerId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [monthlyBillingStatements.sessionId],
    references: [sessions.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertBillingCodeSchema = createInsertSchema(billingCodes).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true }).extend({
  discountAmount: z.number().min(0).optional().default(0)
});
export const insertFinancialPeriodSchema = createInsertSchema(financialPeriods).omit({ id: true });
export const insertWeeklyBillingStatementSchema = createInsertSchema(weeklyBillingStatements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMonthlyBillingStatementSchema = createInsertSchema(monthlyBillingStatements).omit({ id: true, createdAt: true, updatedAt: true });

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

export type WeeklyBillingStatement = typeof weeklyBillingStatements.$inferSelect;
export type InsertWeeklyBillingStatement = z.infer<typeof insertWeeklyBillingStatementSchema>;

export type MonthlyBillingStatement = typeof monthlyBillingStatements.$inferSelect;
export type InsertMonthlyBillingStatement = z.infer<typeof insertMonthlyBillingStatementSchema>;
