import bcrypt from "bcrypt";
import { storage } from "./storage";
import { log } from "./index";

export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length > 0) {
      log("Database already seeded, skipping...");
      return;
    }

    log("Seeding database with initial data...");

    // Create users
    const admin = await storage.createUser({
      name: "Dr. Sarah Smith",
      email: "sarah@bio.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin"
    });

    const practitioner = await storage.createUser({
      name: "John Doe",
      email: "john@bio.com",
      password: await bcrypt.hash("practitioner123", 10),
      role: "practitioner"
    });

    // Create patients with new schema
    await storage.createPatient({
      firstName: "Alice",
      surname: "Johnson",
      dateOfBirth: "1985-03-15",
      accountNumber: "ACC001",
      billingType: "medical_aid",
      medicalAidName: "Discovery"
    });

    await storage.createPatient({
      firstName: "Bob",
      surname: "Williams",
      dateOfBirth: "1990-07-22",
      accountNumber: "ACC002",
      billingType: "medical_aid",
      medicalAidName: "Momentum"
    });

    await storage.createPatient({
      firstName: "Charlie",
      surname: "Brown",
      dateOfBirth: "1978-11-08",
      accountNumber: "ACC003",
      billingType: "private",
      medicalAidName: null
    });

    await storage.createPatient({
      firstName: "Diana",
      surname: "Prince",
      dateOfBirth: "1992-05-30",
      accountNumber: "ACC004",
      billingType: "medical_aid",
      medicalAidName: "Bonitas"
    });

    await storage.createPatient({
      firstName: "Edward",
      surname: "Thompson",
      dateOfBirth: "1988-01-12",
      accountNumber: "ACC005",
      billingType: "private_cash",
      medicalAidName: null
    });

    await storage.createPatient({
      firstName: "Fiona",
      surname: "Green",
      dateOfBirth: "1995-09-25",
      accountNumber: "ACC006",
      billingType: "medical_aid",
      medicalAidName: "Gems"
    });

    log("Database seeded successfully!");
  } catch (error) {
    log(`Error seeding database: ${error}`, "seed");
    throw error;
  }
}
