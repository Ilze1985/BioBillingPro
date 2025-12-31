import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// API Types matching backend
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'practitioner';
}

export interface Patient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  medicalAid: string | null;
  medicalAidNumber: string | null;
}

export interface BillingCode {
  id: number;
  code: string;
  description: string;
  price: number;
}

export interface Session {
  id: number;
  practitionerId: number;
  patientId: number;
  billingCodeId: number;
  date: string;
  time: string;
  notes: string | null;
  status: 'captured' | 'invoiced' | 'paid';
  createdAt: Date | null;
}

export interface EnrichedSession extends Session {
  practitionerName: string;
  patientName: string;
  billingCode: string;
  price: number;
}

// API Functions
async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

async function fetchPatients(): Promise<Patient[]> {
  const res = await fetch('/api/patients');
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

async function fetchBillingCodes(): Promise<BillingCode[]> {
  const res = await fetch('/api/billing-codes');
  if (!res.ok) throw new Error('Failed to fetch billing codes');
  return res.json();
}

async function fetchEnrichedSessions(): Promise<EnrichedSession[]> {
  const res = await fetch('/api/sessions/enriched');
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

async function createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient)
  });
  if (!res.ok) throw new Error('Failed to create patient');
  return res.json();
}

async function createSession(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

async function createBillingCode(code: Omit<BillingCode, 'id'>): Promise<BillingCode> {
  const res = await fetch('/api/billing-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(code)
  });
  if (!res.ok) throw new Error('Failed to create billing code');
  return res.json();
}

async function createUser(user: Omit<User, 'id'> & { password: string }): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
}

// React Query Hooks
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });
}

export function useBillingCodes() {
  return useQuery({
    queryKey: ['billingCodes'],
    queryFn: fetchBillingCodes,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: fetchEnrichedSessions,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useCreateBillingCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBillingCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingCodes'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
