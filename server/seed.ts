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

    // Create patients with new schema
    const patient1 = await storage.createPatient({
      firstName: "Alice",
      surname: "Johnson",
      dateOfBirth: "1985-03-15",
      accountNumber: "ACC001",
      billingType: "medical_aid",
      medicalAidName: "Discovery"
    });

    const patient2 = await storage.createPatient({
      firstName: "Bob",
      surname: "Williams",
      dateOfBirth: "1990-07-22",
      accountNumber: "ACC002",
      billingType: "medical_aid",
      medicalAidName: "Momentum"
    });

    const patient3 = await storage.createPatient({
      firstName: "Charlie",
      surname: "Brown",
      dateOfBirth: "1978-11-08",
      accountNumber: "ACC003",
      billingType: "private",
      medicalAidName: null
    });

    const patient4 = await storage.createPatient({
      firstName: "Diana",
      surname: "Prince",
      dateOfBirth: "1992-05-30",
      accountNumber: "ACC004",
      billingType: "medical_aid",
      medicalAidName: "Bonitas"
    });

    const patient5 = await storage.createPatient({
      firstName: "Edward",
      surname: "Thompson",
      dateOfBirth: "1988-01-12",
      accountNumber: "ACC005",
      billingType: "private_cash",
      medicalAidName: null
    });

    const patient6 = await storage.createPatient({
      firstName: "Fiona",
      surname: "Green",
      dateOfBirth: "1995-09-25",
      accountNumber: "ACC006",
      billingType: "medical_aid",
      medicalAidName: "Gems"
    });

    // Create Medical Aid billing codes
    const maCode1 = await storage.createBillingCode({
      code: "901",
      description: "Initial Consultation (60min)",
      price: 850,
      billingType: "medical_aid"
    });

    const maCode2 = await storage.createBillingCode({
      code: "903",
      description: "Follow-up Session (45min)",
      price: 650,
      billingType: "medical_aid"
    });

    const maCode3 = await storage.createBillingCode({
      code: "905",
      description: "Rehabilitation Session (30min)",
      price: 450,
      billingType: "medical_aid"
    });

    const maCode4 = await storage.createBillingCode({
      code: "801",
      description: "Isokinetic Testing",
      price: 1200,
      billingType: "medical_aid"
    });

    // Create Private billing codes
    const pvtCode1 = await storage.createBillingCode({
      code: "PVT-001",
      description: "Initial Consultation (60min)",
      price: 950,
      billingType: "private"
    });

    const pvtCode2 = await storage.createBillingCode({
      code: "PVT-002",
      description: "Follow-up Session (45min)",
      price: 750,
      billingType: "private"
    });

    const pvtCode3 = await storage.createBillingCode({
      code: "PVT-003",
      description: "Rehabilitation Session (30min)",
      price: 550,
      billingType: "private"
    });

    // Create Private Cash billing codes
    const cashCode1 = await storage.createBillingCode({
      code: "CASH-001",
      description: "Cash Session (60min)",
      price: 800,
      billingType: "private_cash"
    });

    const cashCode2 = await storage.createBillingCode({
      code: "CASH-002",
      description: "Cash Session (30min)",
      price: 450,
      billingType: "private_cash"
    });

    // Create sample sessions
    const patients = [patient1, patient2, patient3, patient4, patient5, patient6];
    const maCodes = [maCode1, maCode2, maCode3];
    const pvtCodes = [pvtCode1, pvtCode2, pvtCode3];
    const cashCodes = [cashCode1, cashCode2];
    const practitioners = [admin, practitioner];

    const today = new Date();
    
    for (let i = 0; i < 20; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i % 14));
      
      const practitionerItem = practitioners[i % 2];
      const patient = patients[i % 6];
      
      let code;
      let billingType: 'medical_aid' | 'private' | 'private_cash';
      
      if (patient.billingType === 'medical_aid') {
        code = maCodes[i % 3];
        billingType = 'medical_aid';
      } else if (patient.billingType === 'private') {
        code = pvtCodes[i % 3];
        billingType = 'private';
      } else {
        code = cashCodes[i % 2];
        billingType = 'private_cash';
      }

      await storage.createSession({
        practitionerId: practitionerItem.id,
        patientId: patient.id,
        billingCodeId: code.id,
        billingType: billingType,
        date: date.toISOString().split('T')[0],
        time: `${9 + (i % 8)}:00`,
        status: i > 12 ? 'captured' : i > 6 ? 'invoiced' : 'paid',
        notes: i % 4 === 0 ? 'Patient progressing well with treatment plan.' : null
      });
    }

    log("Database seeded successfully!");
  } catch (error) {
    log(`Error seeding database: ${error}`, "seed");
    throw error;
  }
}
