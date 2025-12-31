import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type BillingType = 'medical_aid' | 'private' | 'private_cash';

// API Types matching backend
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'practitioner';
}

export interface Patient {
  id: number;
  firstName: string;
  surname: string;
  dateOfBirth: string | null;
  accountNumber: string | null;
  billingType: BillingType;
  medicalAidName: string | null;
}

export interface BillingCode {
  id: number;
  code: string;
  description: string;
  price: number;
  billingType: BillingType;
}

export interface Session {
  id: number;
  practitionerId: number;
  patientId: number;
  billingCodeId: number;
  billingType: BillingType;
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

async function fetchBillingCodesByType(type: BillingType): Promise<BillingCode[]> {
  const res = await fetch(`/api/billing-codes?type=${type}`);
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

async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
}

async function updatePatient(id: number, data: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update patient');
  return res.json();
}

async function deletePatient(id: number): Promise<void> {
  const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete patient');
}

async function updateBillingCode(id: number, data: Partial<BillingCode>): Promise<BillingCode> {
  const res = await fetch(`/api/billing-codes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update billing code');
  return res.json();
}

async function deleteBillingCode(id: number): Promise<void> {
  const res = await fetch(`/api/billing-codes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete billing code');
}

async function importBillingCodes(file: File): Promise<{ message: string; imported: number; errors?: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/billing-codes/import', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to import billing codes');
  }
  return res.json();
}

async function updateSession(id: number, data: Partial<Session>): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

async function deleteSession(id: number): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete session');
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

export function useBillingCodesByType(type: BillingType) {
  return useQuery({
    queryKey: ['billingCodes', type],
    queryFn: () => fetchBillingCodesByType(type),
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

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Patient> }) => updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdateBillingCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BillingCode> }) => updateBillingCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingCodes'] });
    },
  });
}

export function useDeleteBillingCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBillingCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingCodes'] });
    },
  });
}

export function useImportBillingCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importBillingCodes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingCodes'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Session> }) => updateSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
