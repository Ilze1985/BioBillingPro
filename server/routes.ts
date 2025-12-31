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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getAllUsers();
    // Exclude passwords from response
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

        return {
          ...session,
          practitionerName: practitioner?.name || 'Unknown',
          patientName: patient?.name || 'Unknown',
          billingCode: billingCode?.code || 'Unknown',
          price: billingCode?.price || 0
        };
      });

      res.json(enrichedSessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enriched sessions" });
    }
  });

  return httpServer;
}
