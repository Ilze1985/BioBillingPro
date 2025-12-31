import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertBillingCodeSchema, 
  insertSessionSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getAllUsers();
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateUserSchema = insertUserSchema.omit({ password: true }).partial();
      const userData = updateUserSchema.parse(req.body);
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

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Patients
  app.get("/api/patients", async (_req, res) => {
    const patients = await storage.getAllPatients();
    res.json(patients);
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patientData = insertPatientSchema.partial().parse(req.body);
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

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePatient(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Billing Codes
  app.get("/api/billing-codes", async (req, res) => {
    const { type } = req.query;
    if (type && (type === 'medical_aid' || type === 'private')) {
      const codes = await storage.getBillingCodesByType(type);
      res.json(codes);
    } else {
      const codes = await storage.getAllBillingCodes();
      res.json(codes);
    }
  });

  app.post("/api/billing-codes", async (req, res) => {
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

  app.patch("/api/billing-codes/:id", async (req, res) => {
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

  app.delete("/api/billing-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBillingCode(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete billing code" });
    }
  });

  app.post("/api/billing-codes/import", upload.single('file'), async (req, res) => {
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

  // Sessions
  app.get("/api/sessions", async (_req, res) => {
    const sessions = await storage.getAllSessions();
    res.json(sessions);
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sessionData = insertSessionSchema.partial().parse(req.body);
      const session = await storage.updateSession(id, sessionData);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.patch("/api/sessions/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['captured', 'invoiced', 'paid'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const session = await storage.updateSessionStatus(id, status);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session status" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSession(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Sessions with related data (enriched for frontend)
  app.get("/api/sessions/enriched", async (_req, res) => {
    try {
      const [sessions, users, patients, codes] = await Promise.all([
        storage.getAllSessions(),
        storage.getAllUsers(),
        storage.getAllPatients(),
        storage.getAllBillingCodes()
      ]);

      const enrichedSessions = sessions.map(session => {
        const practitioner = users.find(u => u.id === session.practitionerId);
        const patient = patients.find(p => p.id === session.patientId);
        const billingCode = codes.find(c => c.id === session.billingCodeId);
        const basePrice = billingCode?.price || 0;
        
        // Calculate final price with discounts
        let totalDiscountPercent = session.discountPercent || 0;
        // Private cash has a fixed 10% discount
        if (session.billingType === 'private_cash') {
          totalDiscountPercent += 10;
        }
        // Clamp discount to valid range
        totalDiscountPercent = Math.max(0, Math.min(100, totalDiscountPercent));
        const finalPrice = basePrice > 0 ? Math.round(basePrice * (1 - totalDiscountPercent / 100)) : 0;

        return {
          ...session,
          practitionerName: practitioner?.name || 'Unknown',
          patientName: patient ? `${patient.firstName} ${patient.surname}` : 'Unknown',
          billingCode: billingCode?.code || 'Unknown',
          price: basePrice,
          finalPrice: finalPrice
        };
      });

      res.json(enrichedSessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enriched sessions" });
    }
  });

  return httpServer;
}
