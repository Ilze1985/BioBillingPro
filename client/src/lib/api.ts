import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type BillingType = 'medical_aid' | 'private' | 'private_cash';

// API Types matching backend
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'practitioner' | 'receptionist';
}

export interface Patient {
  id: number;
  practitionerId: number | null;
  firstName: string;
  surname: string;
  dateOfBirth: string | null;
  practiceName: string | null;
  accountNumber: string | null;
  billingType: BillingType;
  medicalAidName: string | null;
  gender: string | null;
  populationGroup: string | null;
  mainstream: string | null;
  monthlyBillingActive: string | null;
}

export interface BillingCode {
  id: number;
  code: string;
  description: string;
  price: number;
  billingType: BillingType;
  billingFrequency: 'weekly' | 'monthly';
}

export type ControlStatus = 'awaiting_review' | 'invoice_and_send';

export interface Session {
  id: number;
  practitionerId: number;
  patientId: number;
  billingCodeIds: number[];
  billingType: BillingType;
  billingFrequency: 'weekly' | 'monthly';
  date: string;
  time: string;
  notes: string | null;
  discountAmount: number | null;
  status: 'captured' | 'invoiced' | 'paid';
  controlStatus?: ControlStatus | null;
  createdAt: Date | null;
}

export interface EnrichedSession extends Session {
  practitionerName: string;
  patientName: string;
  practiceName: string | null;
  billingCodes: string[];
  totalPrice: number;
  finalPrice: number;
  financialPeriod: string | null;
  financialPeriodId: number | null;
}

export interface FinancialPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface PopulationGroup {
  id: number;
  name: string;
  description: string | null;
}

export type StatementStatus = 'awaiting_review' | 'ready_to_send' | 'statement_sent' | 'archived';

export interface WeeklyBillingStatement {
  id: number;
  patientId: number;
  financialPeriodId: number | null;
  practitionerId: number | null;
  weekStartDate: string;
  weekEndDate: string;
  status: StatementStatus;
  statementTypeNote: string | null;
  totalAmount: number | null;
  sentDate: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface MonthlyBillingStatement {
  id: number;
  patientId: number;
  financialPeriodId: number | null;
  practitionerId: number | null;
  sessionId: number | null;
  status: StatementStatus;
  statementTypeNote: string | null;
  totalAmount: number | null;
  sentDate: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
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

async function updateSessionStatus(id: number, status: string, userRole: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Role': userRole
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update session status');
  }
  return res.json();
}

async function updateSessionControlStatus(id: number, controlStatus: ControlStatus, userRole: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}/control-status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Role': userRole
    },
    body: JSON.stringify({ controlStatus })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update session control status');
  }
  return res.json();
}

async function fetchFinancialPeriods(): Promise<FinancialPeriod[]> {
  const res = await fetch('/api/financial-periods');
  if (!res.ok) throw new Error('Failed to fetch financial periods');
  return res.json();
}

async function createFinancialPeriod(period: Omit<FinancialPeriod, 'id'>): Promise<FinancialPeriod> {
  const res = await fetch('/api/financial-periods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(period)
  });
  if (!res.ok) throw new Error('Failed to create financial period');
  return res.json();
}

async function updateFinancialPeriod(id: number, data: Partial<FinancialPeriod>): Promise<FinancialPeriod> {
  const res = await fetch(`/api/financial-periods/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update financial period');
  return res.json();
}

async function deleteFinancialPeriod(id: number): Promise<void> {
  const res = await fetch(`/api/financial-periods/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete financial period');
}

async function fetchPopulationGroups(): Promise<PopulationGroup[]> {
  const res = await fetch('/api/population-groups');
  if (!res.ok) throw new Error('Failed to fetch population groups');
  return res.json();
}

async function createPopulationGroup(group: Omit<PopulationGroup, 'id'>): Promise<PopulationGroup> {
  const res = await fetch('/api/population-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group)
  });
  if (!res.ok) throw new Error('Failed to create population group');
  return res.json();
}

async function updatePopulationGroup(id: number, data: Partial<PopulationGroup>): Promise<PopulationGroup> {
  const res = await fetch(`/api/population-groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update population group');
  return res.json();
}

async function deletePopulationGroup(id: number): Promise<void> {
  const res = await fetch(`/api/population-groups/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete population group');
}

async function monthlyRollover(sourceMonth: string, targetMonth: string): Promise<{ message: string; created: number; deleted: number }> {
  const res = await fetch('/api/sessions/monthly-rollover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceMonth, targetMonth })
  });
  if (!res.ok) throw new Error('Failed to perform monthly rollover');
  return res.json();
}

async function undoMonthlyRollover(month: string): Promise<{ message: string; deleted: number }> {
  const res = await fetch(`/api/sessions/monthly-rollover/${month}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to undo monthly rollover');
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

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, userRole }: { id: number; status: string; userRole: string }) => 
      updateSessionStatus(id, status, userRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyBillingStatements'] });
    },
  });
}

export function useUpdateSessionControlStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, controlStatus, userRole }: { id: number; controlStatus: ControlStatus; userRole: string }) => 
      updateSessionControlStatus(id, controlStatus, userRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useFinancialPeriods() {
  return useQuery({
    queryKey: ['financialPeriods'],
    queryFn: fetchFinancialPeriods,
  });
}

export function useCreateFinancialPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinancialPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialPeriods'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useUpdateFinancialPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FinancialPeriod> }) => updateFinancialPeriod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialPeriods'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useDeleteFinancialPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFinancialPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialPeriods'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function usePopulationGroups() {
  return useQuery({
    queryKey: ['populationGroups'],
    queryFn: fetchPopulationGroups,
  });
}

export function useCreatePopulationGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPopulationGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['populationGroups'] });
    },
  });
}

export function useUpdatePopulationGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PopulationGroup> }) => updatePopulationGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['populationGroups'] });
    },
  });
}

export function useDeletePopulationGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePopulationGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['populationGroups'] });
    },
  });
}

export function useMonthlyRollover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceMonth, targetMonth }: { sourceMonth: string; targetMonth: string }) => 
      monthlyRollover(sourceMonth, targetMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useUndoMonthlyRollover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => undoMonthlyRollover(month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

// Weekly Billing Statements
async function fetchWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]> {
  const res = await fetch('/api/weekly-billing-statements');
  if (!res.ok) throw new Error('Failed to fetch weekly billing statements');
  return res.json();
}

async function fetchAllWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]> {
  const res = await fetch('/api/weekly-billing-statements/all');
  if (!res.ok) throw new Error('Failed to fetch all weekly billing statements');
  return res.json();
}

async function createWeeklyBillingStatement(statement: Omit<WeeklyBillingStatement, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeeklyBillingStatement> {
  const res = await fetch('/api/weekly-billing-statements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statement)
  });
  if (!res.ok) throw new Error('Failed to create weekly billing statement');
  return res.json();
}

async function updateWeeklyBillingStatementStatus(
  id: number, 
  status: StatementStatus, 
  userRole: string,
  statementTypeNote?: string
): Promise<WeeklyBillingStatement> {
  const res = await fetch(`/api/weekly-billing-statements/${id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Role': userRole
    },
    body: JSON.stringify({ status, statementTypeNote })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update statement status');
  }
  return res.json();
}

export function useWeeklyBillingStatements() {
  return useQuery({
    queryKey: ['weeklyBillingStatements'],
    queryFn: fetchWeeklyBillingStatements,
  });
}

export function useAllWeeklyBillingStatements() {
  return useQuery({
    queryKey: ['allWeeklyBillingStatements'],
    queryFn: fetchAllWeeklyBillingStatements,
  });
}

export function useCreateWeeklyBillingStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWeeklyBillingStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyBillingStatements'] });
      queryClient.invalidateQueries({ queryKey: ['allWeeklyBillingStatements'] });
    },
  });
}

export function useUpdateWeeklyBillingStatementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, userRole, statementTypeNote }: { 
      id: number; 
      status: StatementStatus; 
      userRole: string;
      statementTypeNote?: string;
    }) => updateWeeklyBillingStatementStatus(id, status, userRole, statementTypeNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyBillingStatements'] });
      queryClient.invalidateQueries({ queryKey: ['allWeeklyBillingStatements'] });
      queryClient.invalidateQueries({ queryKey: ['archivedWeeklyBillingStatements'] });
    },
  });
}

// Monthly Billing Statements API
async function fetchMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]> {
  const res = await fetch('/api/monthly-billing-statements');
  if (!res.ok) throw new Error('Failed to fetch monthly billing statements');
  return res.json();
}

async function fetchAllMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]> {
  const res = await fetch('/api/monthly-billing-statements/all');
  if (!res.ok) throw new Error('Failed to fetch all monthly billing statements');
  return res.json();
}

async function fetchArchivedMonthlyBillingStatements(): Promise<MonthlyBillingStatement[]> {
  const res = await fetch('/api/monthly-billing-statements/archived');
  if (!res.ok) throw new Error('Failed to fetch archived monthly billing statements');
  return res.json();
}

async function fetchArchivedWeeklyBillingStatements(): Promise<WeeklyBillingStatement[]> {
  const res = await fetch('/api/weekly-billing-statements/archived');
  if (!res.ok) throw new Error('Failed to fetch archived weekly billing statements');
  return res.json();
}

async function updateMonthlyBillingStatementStatus(
  id: number, 
  status: StatementStatus, 
  userRole: string,
  statementTypeNote?: string
): Promise<MonthlyBillingStatement> {
  const res = await fetch(`/api/monthly-billing-statements/${id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Role': userRole
    },
    body: JSON.stringify({ status, statementTypeNote })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update statement status');
  }
  return res.json();
}

export function useMonthlyBillingStatements() {
  return useQuery({
    queryKey: ['monthlyBillingStatements'],
    queryFn: fetchMonthlyBillingStatements,
  });
}

export function useAllMonthlyBillingStatements() {
  return useQuery({
    queryKey: ['allMonthlyBillingStatements'],
    queryFn: fetchAllMonthlyBillingStatements,
  });
}

export function useArchivedMonthlyBillingStatements() {
  return useQuery({
    queryKey: ['archivedMonthlyBillingStatements'],
    queryFn: fetchArchivedMonthlyBillingStatements,
  });
}

export function useArchivedWeeklyBillingStatements() {
  return useQuery({
    queryKey: ['archivedWeeklyBillingStatements'],
    queryFn: fetchArchivedWeeklyBillingStatements,
  });
}

export function useUpdateMonthlyBillingStatementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, userRole, statementTypeNote }: { 
      id: number; 
      status: StatementStatus; 
      userRole: string;
      statementTypeNote?: string;
    }) => updateMonthlyBillingStatementStatus(id, status, userRole, statementTypeNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBillingStatements'] });
      queryClient.invalidateQueries({ queryKey: ['allMonthlyBillingStatements'] });
      queryClient.invalidateQueries({ queryKey: ['archivedMonthlyBillingStatements'] });
    },
  });
}
