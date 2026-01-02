import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertBillingCodeSchema, 
  insertSessionSchema,
  insertFinancialPeriodSchema,
  insertPopulationGroupSchema,
  insertWeeklyBillingStatementSchema,
  insertMonthlyBillingStatementSchema,
  loginSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth, requireAdmin, requirePractitionerOrAdmin } from "./auth";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(credentials.email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const isValid = await verifyPassword(credentials.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const sessionId = await createSession(user.id);
      
      res.cookie("session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid credentials format" });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", async (req, res) => {
    if (req.sessionId) {
      await destroySession(req.sessionId);
    }
    res.clearCookie("session");
    res.json({ message: "Logged out successfully" });
  });
  
  app.get("/api/auth/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...safeUser } = req.user;
    res.json({ user: safeUser });
  });

  // Users (admin only for mutations)
  app.get("/api/users", requireAuth, async (_req, res) => {
    const users = await storage.getAllUsers();
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({ ...userData, password: hashedPassword });
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateUserSchema = insertUserSchema.partial();
      const userData = updateUserSchema.parse(req.body);
      
      // Hash password if provided
      if (userData.password && userData.password.trim()) {
        userData.password = await hashPassword(userData.password);
      } else {
        delete userData.password;
      }
      
      const user = await storage.updateUser(id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  app.patch("/api/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { password: newPassword } = req.body;
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      const hashedPassword = await hashPassword(newPassword);
      const user = await storage.updateUser(id, { password: hashedPassword });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Patients - practitioners can only see/manage their own patients, admin/receptionist can see all
  app.get("/api/patients", requireAuth, async (req, res) => {
    if (req.user!.role === 'practitioner') {
      const patients = await storage.getPatientsByPractitioner(req.user!.id);
      res.json(patients);
    } else {
      const patients = await storage.getAllPatients();
      res.json(patients);
    }
  });

  app.post("/api/patients", requirePractitionerOrAdmin, async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      
      // Force practitionerId to current user for practitioners
      const dataWithPractitioner = {
        ...patientData,
        practitionerId: req.user!.role === 'practitioner' ? req.user!.id : patientData.practitionerId
      };
      
      // Check for duplicate date of birth
      if (dataWithPractitioner.dateOfBirth) {
        const existingPatients = await storage.getAllPatients();
        const duplicate = existingPatients.find(p => p.dateOfBirth === dataWithPractitioner.dateOfBirth);
        if (duplicate) {
          return res.status(409).json({ 
            message: `A patient with this date of birth already exists: ${duplicate.firstName} ${duplicate.surname}` 
          });
        }
      }
      
      const patient = await storage.createPatient(dataWithPractitioner);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.patch("/api/patients/:id", requirePractitionerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify ownership for practitioners
      if (req.user!.role === 'practitioner') {
        const existingPatient = await storage.getPatient(id);
        if (!existingPatient || existingPatient.practitionerId !== req.user!.id) {
          return res.status(403).json({ message: "You can only edit your own patients" });
        }
      }
      
      const patientData = insertPatientSchema.partial().parse(req.body);
      
      // Check for duplicate date of birth (excluding current patient)
      if (patientData.dateOfBirth) {
        const existingPatients = await storage.getAllPatients();
        const duplicate = existingPatients.find(p => p.dateOfBirth === patientData.dateOfBirth && p.id !== id);
        if (duplicate) {
          return res.status(409).json({ 
            message: `A patient with this date of birth already exists: ${duplicate.firstName} ${duplicate.surname}` 
          });
        }
      }
      
      const patient = await storage.updatePatient(id, patientData);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", requirePractitionerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify ownership for practitioners
      if (req.user!.role === 'practitioner') {
        const existingPatient = await storage.getPatient(id);
        if (!existingPatient || existingPatient.practitionerId !== req.user!.id) {
          return res.status(403).json({ message: "You can only delete your own patients" });
        }
      }
      
      await storage.deletePatient(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Billing Codes (read: all authenticated, write: admin only)
  app.get("/api/billing-codes", requireAuth, async (req, res) => {
    const { type } = req.query;
    if (type && (type === 'medical_aid' || type === 'private')) {
      const codes = await storage.getBillingCodesByType(type);
      res.json(codes);
    } else {
      const codes = await storage.getAllBillingCodes();
      res.json(codes);
    }
  });

  app.post("/api/billing-codes", requireAdmin, async (req, res) => {
    try {
      const codeData = insertBillingCodeSchema.parse(req.body);
      const code = await storage.createBillingCode(codeData);
      res.status(201).json(code);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid billing code data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create billing code" });
    }
  });

  app.patch("/api/billing-codes/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const codeData = insertBillingCodeSchema.partial().parse(req.body);
      const code = await storage.updateBillingCode(id, codeData);
      if (!code) {
        return res.status(404).json({ message: "Billing code not found" });
      }
      res.json(code);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid billing code data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update billing code" });
    }
  });

  app.delete("/api/billing-codes/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBillingCode(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete billing code" });
    }
  });

  app.post("/api/billing-codes/import", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      const codes: Array<{ code: string; description: string; price: number; billingType: 'medical_aid' | 'private' }> = [];
      const errors: string[] = [];

      data.forEach((row, index) => {
        const code = row['Code'] || row['code'] || row['CODE'];
        const description = row['Description'] || row['description'] || row['DESCRIPTION'];
        const price = row['Price'] || row['price'] || row['PRICE'] || row['Amount'] || row['amount'];
        const billingType = row['Type'] || row['type'] || row['TYPE'] || row['Billing Type'] || row['billing_type'];

        if (!code || !description || price === undefined) {
          errors.push(`Row ${index + 2}: Missing required fields (Code, Description, or Price)`);
          return;
        }

        const parsedPrice = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, ''));
        if (isNaN(parsedPrice)) {
          errors.push(`Row ${index + 2}: Invalid price value`);
          return;
        }

        let parsedType: 'medical_aid' | 'private' = 'medical_aid';
        if (billingType) {
          const typeStr = String(billingType).toLowerCase().trim();
          if (typeStr === 'private' || typeStr === 'pvt' || typeStr === 'p') {
            parsedType = 'private';
          } else if (typeStr === 'medical_aid' || typeStr === 'medical aid' || typeStr === 'med' || typeStr === 'm' || typeStr === 'ma') {
            parsedType = 'medical_aid';
          }
        }

        codes.push({
          code: String(code).trim(),
          description: String(description).trim(),
          price: parsedPrice,
          billingType: parsedType
        });
      });

      if (codes.length === 0) {
        return res.status(400).json({ 
          message: "No valid billing codes found in file",
          errors 
        });
      }

      const createdCodes = await storage.bulkCreateBillingCodes(codes);

      res.status(201).json({
        message: `Successfully imported ${createdCodes.length} billing codes`,
        imported: createdCodes.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ message: "Failed to import billing codes" });
    }
  });

  // Sessions - practitioners can only see/manage their own sessions
  app.get("/api/sessions", requireAuth, async (req, res) => {
    if (req.user!.role === 'practitioner') {
      const sessions = await storage.getSessionsByPractitioner(req.user!.id);
      res.json(sessions);
    } else {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    }
  });

  app.post("/api/sessions", requirePractitionerOrAdmin, async (req, res) => {
    try {
      console.log("Session create request body:", JSON.stringify(req.body));
      const sessionData = insertSessionSchema.parse(req.body);
      
      // Force practitionerId to current user for practitioners
      if (req.user!.role === 'practitioner') {
        sessionData.practitionerId = req.user!.id;
      }
      
      // Validate weekly billing cannot have future dates
      if (sessionData.billingFrequency === 'weekly') {
        const today = new Date().toISOString().split('T')[0];
        if (sessionData.date > today) {
          return res.status(400).json({ 
            message: "Weekly billing is done in arrears. Future dates are not allowed." 
          });
        }
      }
      
      console.log("Parsed session data:", JSON.stringify(sessionData));
      const session = await storage.createSession(sessionData);
      
      // Auto-create monthly billing statement when monthly session is captured
      if (sessionData.billingFrequency === 'monthly') {
        try {
          // Find the financial period based on session date
          const allPeriods = await storage.getAllFinancialPeriods();
          const period = allPeriods.find(p => {
            return session.date >= p.startDate && session.date <= p.endDate;
          });
          
          // Calculate session total
          const billingCodes = await storage.getAllBillingCodes();
          const sessionTotal = (session.billingCodeIds || []).reduce((sum, codeId) => {
            const code = billingCodes.find(c => c.id === codeId);
            return sum + (code?.price || 0);
          }, 0) - (session.discountAmount || 0);
          
          // Create monthly billing statement linked to this session (even without a period)
          await storage.createMonthlyBillingStatement({
            patientId: session.patientId,
            practitionerId: session.practitionerId,
            financialPeriodId: period?.id || null,
            sessionId: session.id,
            status: 'awaiting_review',
            totalAmount: sessionTotal
          });
        } catch (statementError) {
          console.error("Failed to create monthly billing statement:", statementError);
        }
      }
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Session creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.patch("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user!.role;
      
      // Check if session is invoiced - only admin can edit invoiced sessions
      const existingSession = await storage.getSession(id);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (existingSession.status === 'invoiced' || existingSession.status === 'paid') {
        if (userRole !== 'admin') {
          return res.status(403).json({ 
            message: "Invoiced sessions cannot be edited. Contact an administrator." 
          });
        }
      }
      
      const sessionData = insertSessionSchema.partial().parse(req.body);
      const session = await storage.updateSession(id, sessionData);
      
      // If session is updated and it's monthly, update the associated statement
      if (session && session.billingFrequency === 'monthly') {
        const statements = await storage.getAllMonthlyBillingStatements();
        const statement = statements.find(s => s.sessionId === session.id);
        if (statement) {
          const billingCodes = await storage.getAllBillingCodes();
          const sessionTotal = (session.billingCodeIds || []).reduce((sum, codeId) => {
            const code = billingCodes.find(c => c.id === codeId);
            return sum + (code?.price || 0);
          }, 0) - (session.discountAmount || 0);
          
          await storage.updateMonthlyBillingStatement(statement.id, {
            totalAmount: sessionTotal
          });
        }
      }
      
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.patch("/api/sessions/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const userRole = req.user!.role;
      
      if (!['captured', 'invoiced', 'paid'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Only receptionist or admin can mark sessions as invoiced or paid
      if ((status === 'invoiced' || status === 'paid') && userRole !== 'receptionist' && userRole !== 'admin') {
        return res.status(403).json({ 
          message: `Only receptionists or admins can mark sessions as ${status}.` 
        });
      }

      // Get the session before updating
      const existingSession = await storage.getSession(id);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }

      const session = await storage.updateSessionStatus(id, status);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Auto-create weekly billing statement when marking weekly session as invoiced
      if (status === 'invoiced' && session.billingFrequency === 'weekly') {
        try {
          // Find the financial period based on session date
          const allPeriods = await storage.getAllFinancialPeriods();
          const sessionDateStr = session.date;
          const period = allPeriods.find(p => {
            return sessionDateStr >= p.startDate && sessionDateStr <= p.endDate;
          });
          
          if (period) {
            // Calculate week boundaries based on session date
            const sessionDate = new Date(session.date);
            const periodStart = new Date(period.startDate);
            const diffTime = sessionDate.getTime() - periodStart.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNumber = Math.floor(diffDays / 7) + 1;
            
            // Calculate week start (Monday) and end (Sunday) dates
            const weekStart = new Date(periodStart);
            weekStart.setDate(periodStart.getDate() + (weekNumber - 1) * 7);
            const dayOfWeek = weekStart.getDay();
            if (dayOfWeek !== 1) {
              weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            }
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const weekEndStr = weekEnd.toISOString().split('T')[0];
            
        // Check if a statement already exists for this patient/practitioner/period/week
        const existingStatements = await storage.getAllWeeklyBillingStatements();
        const existingStatement = existingStatements.find(s => 
          s.patientId === session.patientId &&
          s.practitionerId === session.practitionerId &&
          s.financialPeriodId === period.id &&
          s.weekStartDate === weekStartStr &&
          s.weekEndDate === weekEndStr
        );
        
        // Calculate session total
        const billingCodes = await storage.getAllBillingCodes();
        const sessionTotal = (session.billingCodeIds || []).reduce((sum, codeId) => {
          const code = billingCodes.find(c => c.id === codeId);
          return sum + (code?.price || 0);
        }, 0) - (session.discountAmount || 0);
        
        if (existingStatement) {
              // Update existing statement total
              await storage.updateWeeklyBillingStatement(existingStatement.id, {
                totalAmount: (existingStatement.totalAmount || 0) + sessionTotal
              });
            } else {
              // Create new statement
              await storage.createWeeklyBillingStatement({
                patientId: session.patientId,
                practitionerId: session.practitionerId,
                financialPeriodId: period.id,
                weekStartDate: weekStartStr,
                weekEndDate: weekEndStr,
                status: 'awaiting_review',
                totalAmount: sessionTotal
              });
            }
          }
        } catch (statementError) {
          console.error("Failed to create/update weekly billing statement:", statementError);
        }
      }
      
      // Auto-create monthly billing statement when marking monthly session as invoiced
      if (status === 'invoiced' && session.billingFrequency === 'monthly') {
        try {
          // Check if a statement already exists for this session
          const existingStatements = await storage.getAllMonthlyBillingStatements();
          const existingStatement = existingStatements.find(s => s.sessionId === session.id);
          
          // Calculate session total with proper discount handling
          const billingCodes = await storage.getAllBillingCodes();
          const baseTotal = (session.billingCodeIds || []).reduce((sum, codeId) => {
            const code = billingCodes.find(c => c.id === codeId);
            return sum + (code?.price || 0);
          }, 0);
          
          // Apply discount
          const afterDiscount = baseTotal - (session.discountAmount || 0);
          
          // Apply cash discount for private_cash (10% rounded to nearest R10)
          let sessionTotal = afterDiscount;
          if (session.billingType === 'private_cash') {
            sessionTotal = Math.round(afterDiscount * 0.9 / 10) * 10;
          }
          
          // Find the financial period based on session date
          const allPeriods = await storage.getAllFinancialPeriods();
          const sessionDateStr = session.date;
          const period = allPeriods.find(p => {
            return sessionDateStr >= p.startDate && sessionDateStr <= p.endDate;
          });
          
          if (!existingStatement) {
            // Create new monthly statement
            await storage.createMonthlyBillingStatement({
              patientId: session.patientId,
              practitionerId: session.practitionerId,
              financialPeriodId: period?.id || null,
              sessionId: session.id,
              status: 'ready_to_send',
              totalAmount: sessionTotal
            });
          } else {
            // Update existing statement
            await storage.updateMonthlyBillingStatement(existingStatement.id, {
              status: 'ready_to_send',
              totalAmount: sessionTotal
            });
          }
        } catch (statementError) {
          console.error("Failed to create/update monthly billing statement:", statementError);
        }
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session status" });
    }
  });

  app.patch("/api/sessions/:id/control-status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { controlStatus } = req.body;
      
      if (!['awaiting_review', 'invoice_and_send'].includes(controlStatus)) {
        return res.status(400).json({ message: "Invalid control status value" });
      }
      
      // Get the session to check if it's monthly
      const existingSession = await storage.getSession(id);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Only monthly sessions can have control status changed
      if (existingSession.billingFrequency !== 'monthly') {
        return res.status(400).json({ message: "Control status can only be set for monthly sessions" });
      }

      const session = await storage.updateSessionControlStatus(id, controlStatus);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session control status" });
    }
  });

  app.delete("/api/sessions/:id", requirePractitionerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSession(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Financial Periods (read: all authenticated, write: admin only)
  app.get("/api/financial-periods", requireAuth, async (_req, res) => {
    const periods = await storage.getAllFinancialPeriods();
    res.json(periods);
  });

  app.post("/api/financial-periods", requireAdmin, async (req, res) => {
    try {
      const periodData = insertFinancialPeriodSchema.parse(req.body);
      const period = await storage.createFinancialPeriod(periodData);
      res.status(201).json(period);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid period data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create financial period" });
    }
  });

  app.patch("/api/financial-periods/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const periodData = insertFinancialPeriodSchema.partial().parse(req.body);
      const period = await storage.updateFinancialPeriod(id, periodData);
      if (!period) {
        return res.status(404).json({ message: "Financial period not found" });
      }
      res.json(period);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid period data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update financial period" });
    }
  });

  app.delete("/api/financial-periods/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFinancialPeriod(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete financial period" });
    }
  });

  // Population Groups (read: all authenticated, write: admin only)
  app.get("/api/population-groups", requireAuth, async (_req, res) => {
    const groups = await storage.getAllPopulationGroups();
    res.json(groups);
  });

  app.post("/api/population-groups", requireAdmin, async (req, res) => {
    try {
      const groupData = insertPopulationGroupSchema.parse(req.body);
      const group = await storage.createPopulationGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid population group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create population group" });
    }
  });

  app.patch("/api/population-groups/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const groupData = insertPopulationGroupSchema.partial().parse(req.body);
      const group = await storage.updatePopulationGroup(id, groupData);
      if (!group) {
        return res.status(404).json({ message: "Population group not found" });
      }
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid population group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update population group" });
    }
  });

  app.delete("/api/population-groups/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePopulationGroup(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete population group" });
    }
  });

  // Monthly billing rollover - copy previous month's sessions for active patients
  app.post("/api/sessions/monthly-rollover", requirePractitionerOrAdmin, async (req, res) => {
    try {
      const { sourceMonth, targetMonth } = req.body;
      
      if (!sourceMonth || !targetMonth) {
        return res.status(400).json({ message: "Source and target months are required" });
      }
      
      // Get all monthly sessions from source month
      const sessions = await storage.getAllSessions();
      const patients = await storage.getAllPatients();
      
      // Filter to active monthly billing patients
      const activePatientIds = new Set(
        patients
          .filter(p => p.monthlyBillingActive === 'yes')
          .map(p => p.id)
      );
      
      // Filter source month sessions (monthly frequency only, active patients)
      const sourceMonthSessions = sessions.filter(s => {
        const sessionMonth = s.date.substring(0, 7); // YYYY-MM
        return sessionMonth === sourceMonth && 
               s.billingFrequency === 'monthly' &&
               activePatientIds.has(s.patientId);
      });
      
      // Delete any existing sessions in target month first (to allow re-generation)
      const existingTargetSessions = sessions.filter(s => {
        const sessionMonth = s.date.substring(0, 7);
        return sessionMonth === targetMonth && s.billingFrequency === 'monthly';
      });
      
      for (const session of existingTargetSessions) {
        await storage.deleteSession(session.id);
      }
      
      // Create new sessions for target month
      const newSessions = [];
      const processedPatientIds = new Set<number>();
      
      for (const sourceSession of sourceMonthSessions) {
        if (processedPatientIds.has(sourceSession.patientId)) {
          continue; // Skip duplicate patients within same batch
        }
        
        // Calculate target date (same day of month, or last day if not valid)
        const sourceDate = new Date(sourceSession.date);
        const targetDate = new Date(targetMonth + '-01');
        targetDate.setDate(Math.min(sourceDate.getDate(), new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate()));
        
        const newSession = await storage.createSession({
          practitionerId: sourceSession.practitionerId,
          patientId: sourceSession.patientId,
          billingCodeIds: sourceSession.billingCodeIds,
          billingType: sourceSession.billingType,
          billingFrequency: 'monthly',
          date: targetDate.toISOString().split('T')[0],
          time: sourceSession.time,
          status: 'captured',
          notes: sourceSession.notes,
          discountAmount: sourceSession.discountAmount || 0
        });
        
        newSessions.push(newSession);
        processedPatientIds.add(sourceSession.patientId);
      }
      
      res.status(201).json({
        message: `Created ${newSessions.length} sessions for ${targetMonth}`,
        created: newSessions.length,
        deleted: existingTargetSessions.length
      });
    } catch (error) {
      console.error("Monthly rollover error:", error);
      res.status(500).json({ message: "Failed to perform monthly rollover" });
    }
  });

  // Undo monthly rollover - delete all monthly sessions for a specific month
  app.delete("/api/sessions/monthly-rollover/:month", requirePractitionerOrAdmin, async (req, res) => {
    try {
      const { month } = req.params;
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Valid month in YYYY-MM format is required" });
      }
      
      const sessions = await storage.getAllSessions();
      
      // Find all monthly sessions for the specified month
      const targetSessions = sessions.filter(s => {
        const sessionMonth = s.date.substring(0, 7);
        return sessionMonth === month && s.billingFrequency === 'monthly';
      });
      
      // Delete all matching sessions
      for (const session of targetSessions) {
        await storage.deleteSession(session.id);
      }
      
      res.json({
        message: `Deleted ${targetSessions.length} sessions for ${month}`,
        deleted: targetSessions.length
      });
    } catch (error) {
      console.error("Undo monthly rollover error:", error);
      res.status(500).json({ message: "Failed to undo monthly rollover" });
    }
  });

  // Sessions with related data (enriched for frontend)
  app.get("/api/sessions/enriched", requireAuth, async (req, res) => {
    try {
      const [sessions, users, patients, codes, financialPeriods] = await Promise.all([
        storage.getAllSessions(),
        storage.getAllUsers(),
        storage.getAllPatients(),
        storage.getAllBillingCodes(),
        storage.getAllFinancialPeriods()
      ]);

      const enrichedSessions = sessions.map(session => {
        const practitioner = users.find(u => u.id === session.practitionerId);
        const patient = patients.find(p => p.id === session.patientId);
        
        // Get all billing codes for this session
        const sessionCodes = (session.billingCodeIds || []).map(id => codes.find(c => c.id === id)).filter(Boolean);
        const billingCodeNames = sessionCodes.map(c => c?.code || 'Unknown');
        const totalPrice = sessionCodes.reduce((sum, c) => sum + (c?.price || 0), 0);
        
        // Find matching financial period based on session date
        const matchingPeriod = financialPeriods.find(p => 
          session.date >= p.startDate && session.date <= p.endDate
        );
        
        // Calculate final price with discounts
        const additionalDiscount = (session as any).discountAmount || 0; // Now stores R-value
        let finalPrice = totalPrice;
        
        // Private cash has a fixed 10% discount, rounded to nearest R10
        if (session.billingType === 'private_cash') {
          const discountedPrice = totalPrice * 0.9;
          finalPrice = Math.round(discountedPrice / 10) * 10;
          // Apply additional R-value discount on top if any
          if (additionalDiscount > 0) {
            finalPrice = Math.max(0, finalPrice - additionalDiscount);
          }
        } else if (additionalDiscount > 0) {
          // For private billing with additional R-value discount only
          finalPrice = Math.max(0, totalPrice - additionalDiscount);
        }

        return {
          ...session,
          practitionerName: practitioner?.name || 'Unknown',
          patientName: patient ? `${patient.firstName} ${patient.surname}` : 'Unknown',
          practiceName: patient?.practiceName || null,
          billingCodes: billingCodeNames,
          totalPrice: totalPrice,
          finalPrice: finalPrice,
          financialPeriod: matchingPeriod?.name || null,
          financialPeriodId: matchingPeriod?.id || null,
          controlStatus: (session as any).controlStatus || 'awaiting_review'
        };
      });

      res.json(enrichedSessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enriched sessions" });
    }
  });

  // Weekly Billing Statements
  app.get("/api/weekly-billing-statements", requireAuth, async (_req, res) => {
    try {
      const statements = await storage.getActiveWeeklyBillingStatements();
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly billing statements" });
    }
  });

  app.get("/api/weekly-billing-statements/all", requireAuth, async (_req, res) => {
    try {
      const statements = await storage.getAllWeeklyBillingStatements();
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all weekly billing statements" });
    }
  });

  app.post("/api/weekly-billing-statements", requireAuth, async (req, res) => {
    try {
      const statementData = insertWeeklyBillingStatementSchema.parse(req.body);
      const statement = await storage.createWeeklyBillingStatement(statementData);
      res.status(201).json(statement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid statement data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create weekly billing statement" });
    }
  });

  app.patch("/api/weekly-billing-statements/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, statementTypeNote } = req.body;
      const userRole = req.headers['x-user-role'] as string;
      
      if (!['awaiting_review', 'ready_to_send', 'statement_sent', 'archived'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Only admin can mark as ready_to_send
      if (status === 'ready_to_send' && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only administrators can mark statements as ready to send." 
        });
      }
      
      // Only receptionist or admin can mark as statement_sent
      if (status === 'statement_sent' && userRole !== 'receptionist' && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only receptionists or administrators can mark statements as sent." 
        });
      }

      // Set sentDate when marking as statement_sent
      const sentDate = status === 'statement_sent' ? new Date().toISOString().split('T')[0] : undefined;
      const statement = await storage.updateWeeklyBillingStatementStatus(id, status, statementTypeNote, sentDate);
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      res.json(statement);
    } catch (error) {
      res.status(500).json({ message: "Failed to update statement status" });
    }
  });

  app.delete("/api/weekly-billing-statements/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWeeklyBillingStatement(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete weekly billing statement" });
    }
  });

  app.get("/api/weekly-billing-statements/archived", requireAuth, async (_req, res) => {
    try {
      const statements = await storage.getArchivedWeeklyBillingStatements();
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived weekly billing statements" });
    }
  });

  // Monthly Billing Statements
  app.get("/api/monthly-billing-statements", requireAuth, async (_req, res) => {
    try {
      const statements = await storage.getActiveMonthlyBillingStatements();
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly billing statements" });
    }
  });

  app.get("/api/monthly-billing-statements/all", requireAuth, async (_req, res) => {
    try {
      const statements = await storage.getAllMonthlyBillingStatements();
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all monthly billing statements" });
    }
  });

  app.get("/api/monthly-billing-statements/archived", requireAuth, async (_req, res) => {
    try {
      const statements = await storage.getArchivedMonthlyBillingStatements();
      res.json(statements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived monthly billing statements" });
    }
  });

  app.post("/api/monthly-billing-statements", requireAuth, async (req, res) => {
    try {
      const statementData = insertMonthlyBillingStatementSchema.parse(req.body);
      const statement = await storage.createMonthlyBillingStatement(statementData);
      res.status(201).json(statement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid statement data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create monthly billing statement" });
    }
  });

  app.patch("/api/monthly-billing-statements/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, statementTypeNote } = req.body;
      const userRole = req.headers['x-user-role'] as string;
      
      if (!['awaiting_review', 'ready_to_send', 'statement_sent', 'archived'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Only admin can mark as ready_to_send (invoice and send statement)
      if (status === 'ready_to_send' && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only administrators can mark statements as ready to send." 
        });
      }
      
      // Only receptionist or admin can mark as statement_sent
      if (status === 'statement_sent' && userRole !== 'receptionist' && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only receptionists or administrators can mark statements as sent." 
        });
      }

      // If marking as statement_sent, set the sent date to today
      const sentDate = status === 'statement_sent' ? new Date().toISOString().split('T')[0] : undefined;
      const statement = await storage.updateMonthlyBillingStatementStatus(id, status, statementTypeNote, sentDate);
      if (!statement) {
        return res.status(404).json({ message: "Statement not found" });
      }
      res.json(statement);
    } catch (error) {
      res.status(500).json({ message: "Failed to update statement status" });
    }
  });

  app.delete("/api/monthly-billing-statements/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMonthlyBillingStatement(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete monthly billing statement" });
    }
  });

  return httpServer;
}
