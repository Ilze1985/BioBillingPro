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
      password: "admin123",
      role: "admin"
    });

    const practitioner = await storage.createUser({
      name: "John Doe",
      email: "john@bio.com",
      password: "practitioner123",
      role: "practitioner"
    });

    // Create patients
    const patient1 = await storage.createPatient({
      name: "Alice Johnson",
      email: "alice@example.com",
      phone: "082 123 4567",
      medicalAid: "Discovery",
      medicalAidNumber: "123456789"
    });

    const patient2 = await storage.createPatient({
      name: "Bob Williams",
      email: "bob@example.com",
      phone: "083 987 6543",
      medicalAid: "Momentum",
      medicalAidNumber: "987654321"
    });

    const patient3 = await storage.createPatient({
      name: "Charlie Brown",
      email: "charlie@example.com",
      phone: "072 345 6789",
      medicalAid: "Bonitas",
      medicalAidNumber: "456789123"
    });

    const patient4 = await storage.createPatient({
      name: "Diana Prince",
      email: "diana@example.com",
      phone: "084 567 8901",
      medicalAid: "Discovery",
      medicalAidNumber: "789123456"
    });

    // Create billing codes
    const code1 = await storage.createBillingCode({
      code: "901",
      description: "Initial Consultation (60min)",
      price: 850
    });

    const code2 = await storage.createBillingCode({
      code: "903",
      description: "Follow-up Session (45min)",
      price: 650
    });

    const code3 = await storage.createBillingCode({
      code: "905",
      description: "Rehabilitation Session (30min)",
      price: 450
    });

    const code4 = await storage.createBillingCode({
      code: "801",
      description: "Isokinetic Testing",
      price: 1200
    });

    // Create sample sessions
    const patients = [patient1, patient2, patient3, patient4];
    const codes = [code1, code2, code3];
    const practitioners = [admin, practitioner];

    const today = new Date();
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i % 7));
      
      const practitioner = practitioners[i % 2];
      const patient = patients[i % 4];
      const code = codes[i % 3];

      await storage.createSession({
        practitionerId: practitioner.id,
        patientId: patient.id,
        billingCodeId: code.id,
        date: date.toISOString().split('T')[0],
        time: `${9 + (i % 8)}:00`,
        status: i > 10 ? 'captured' : 'invoiced',
        notes: i % 3 === 0 ? 'Patient complaining of lower back pain.' : undefined
      });
    }

    log("Database seeded successfully!");
  } catch (error) {
    log(`Error seeding database: ${error}`, "seed");
    throw error;
  }
}
