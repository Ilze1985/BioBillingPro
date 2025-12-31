import { create } from 'zustand';
import { format, subDays, addDays } from 'date-fns';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'practitioner';
  email: string;
}

export interface Patient {
  id: string;
  name: string;
  medicalAid: string;
  medicalAidNumber: string;
  email: string;
  phone: string;
}

export interface BillingCode {
  id: string;
  code: string;
  description: string;
  price: number;
}

export interface Session {
  id: string;
  practitionerId: string;
  practitionerName: string;
  patientId: string;
  patientName: string;
  date: string; // ISO date string
  time: string;
  billingCodeId: string;
  billingCode: string;
  price: number;
  notes?: string;
  status: 'captured' | 'invoiced' | 'paid';
}

interface AppState {
  currentUser: User | null;
  users: User[];
  patients: Patient[];
  billingCodes: BillingCode[];
  sessions: Session[];
  
  setCurrentUser: (user: User) => void;
  addUser: (user: User) => void;
  addPatient: (patient: Patient) => void;
  addSession: (session: Session) => void;
  addBillingCode: (code: BillingCode) => void;
}

// Initial Mock Data
const MOCK_USERS: User[] = [
  { id: '1', name: 'Dr. Sarah Smith', role: 'admin', email: 'sarah@bio.com' },
  { id: '2', name: 'John Doe', role: 'practitioner', email: 'john@bio.com' },
];

const MOCK_PATIENTS: Patient[] = [
  { id: '1', name: 'Alice Johnson', medicalAid: 'Discovery', medicalAidNumber: '123456789', email: 'alice@example.com', phone: '082 123 4567' },
  { id: '2', name: 'Bob Williams', medicalAid: 'Momentum', medicalAidNumber: '987654321', email: 'bob@example.com', phone: '083 987 6543' },
  { id: '3', name: 'Charlie Brown', medicalAid: 'Bonitas', medicalAidNumber: '456789123', email: 'charlie@example.com', phone: '072 345 6789' },
  { id: '4', name: 'Diana Prince', medicalAid: 'Discovery', medicalAidNumber: '789123456', email: 'diana@example.com', phone: '084 567 8901' },
];

const MOCK_CODES: BillingCode[] = [
  { id: '1', code: '901', description: 'Initial Consultation (60min)', price: 850 },
  { id: '2', code: '903', description: 'Follow-up Session (45min)', price: 650 },
  { id: '3', code: '905', description: 'Rehabilitation Session (30min)', price: 450 },
  { id: '4', code: '801', description: 'Isokinetic Testing', price: 1200 },
];

const generateMockSessions = (): Session[] => {
  const sessions: Session[] = [];
  const now = new Date();
  
  // Generate some past sessions
  for (let i = 0; i < 20; i++) {
    const date = subDays(now, i % 7);
    const practitioner = MOCK_USERS[i % 2];
    const patient = MOCK_PATIENTS[i % 4];
    const code = MOCK_CODES[i % 3];
    
    sessions.push({
      id: `session-${i}`,
      practitionerId: practitioner.id,
      practitionerName: practitioner.name,
      patientId: patient.id,
      patientName: patient.name,
      date: format(date, 'yyyy-MM-dd'),
      time: `${9 + (i % 8)}:00`,
      billingCodeId: code.id,
      billingCode: code.code,
      price: code.price,
      status: i > 10 ? 'captured' : 'invoiced',
      notes: i % 3 === 0 ? 'Patient complaining of lower back pain.' : undefined
    });
  }
  return sessions;
};

export const useStore = create<AppState>((set) => ({
  currentUser: MOCK_USERS[0],
  users: MOCK_USERS,
  patients: MOCK_PATIENTS,
  billingCodes: MOCK_CODES,
  sessions: generateMockSessions(),

  setCurrentUser: (user) => set({ currentUser: user }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  addPatient: (patient) => set((state) => ({ patients: [...state.patients, patient] })),
  addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),
  addBillingCode: (code) => set((state) => ({ billingCodes: [...state.billingCodes, code] })),
}));
