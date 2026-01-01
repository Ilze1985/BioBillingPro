import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useSessions, useUsers, useBillingCodes, usePatients, useFinancialPeriods,
  useDeleteUser, useDeletePatient, useDeleteBillingCode, useDeleteSession, useDeleteFinancialPeriod,
  useUpdateUser, useUpdatePatient, useUpdateBillingCode, useUpdateFinancialPeriod,
  useCreateUser, useCreatePatient, useCreateBillingCode, useCreateFinancialPeriod,
  useImportBillingCodes,
  type User, type Patient, type BillingCode, type BillingType, type FinancialPeriod
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, Pencil, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { data: sessions = [], isLoading: loadingSessions } = useSessions();
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: billingCodes = [], isLoading: loadingCodes } = useBillingCodes();
  const { data: patients = [], isLoading: loadingPatients } = usePatients();
  const { data: financialPeriods = [], isLoading: loadingPeriods } = useFinancialPeriods();

  const deleteUserMutation = useDeleteUser();
  const deletePatientMutation = useDeletePatient();
  const deleteBillingCodeMutation = useDeleteBillingCode();
  const deleteSessionMutation = useDeleteSession();
  const deleteFinancialPeriodMutation = useDeleteFinancialPeriod();
  const updateUserMutation = useUpdateUser();
  const updatePatientMutation = useUpdatePatient();
  const updateBillingCodeMutation = useUpdateBillingCode();
  const updateFinancialPeriodMutation = useUpdateFinancialPeriod();
  const createUserMutation = useCreateUser();
  const createPatientMutation = useCreatePatient();
  const createBillingCodeMutation = useCreateBillingCode();
  const createFinancialPeriodMutation = useCreateFinancialPeriod();
  const importBillingCodesMutation = useImportBillingCodes();

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: number; name: string } | null>(null);
  const [editUserDialog, setEditUserDialog] = useState<User | null>(null);
  const [editPatientDialog, setEditPatientDialog] = useState<Patient | null>(null);
  const [editCodeDialog, setEditCodeDialog] = useState<BillingCode | null>(null);
  const [editPeriodDialog, setEditPeriodDialog] = useState<FinancialPeriod | null>(null);
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newPatientDialog, setNewPatientDialog] = useState(false);
  const [newCodeDialog, setNewCodeDialog] = useState(false);
  const [newPeriodDialog, setNewPeriodDialog] = useState(false);

  const [formData, setFormData] = useState<Record<string, string>>({});

  const isLoading = loadingSessions || loadingUsers || loadingCodes || loadingPatients || loadingPeriods;

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === 'user') {
        await deleteUserMutation.mutateAsync(deleteDialog.id);
      } else if (deleteDialog.type === 'patient') {
        await deletePatientMutation.mutateAsync(deleteDialog.id);
      } else if (deleteDialog.type === 'code') {
        await deleteBillingCodeMutation.mutateAsync(deleteDialog.id);
      } else if (deleteDialog.type === 'session') {
        await deleteSessionMutation.mutateAsync(deleteDialog.id);
      } else if (deleteDialog.type === 'period') {
        await deleteFinancialPeriodMutation.mutateAsync(deleteDialog.id);
      }
      toast({ title: "Deleted", description: `${deleteDialog.name} has been deleted.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
    setDeleteDialog(null);
  };

  const handleUpdateUser = async () => {
    if (!editUserDialog) return;
    try {
      await updateUserMutation.mutateAsync({
        id: editUserDialog.id,
        data: { name: formData.name, email: formData.email, role: formData.role as 'admin' | 'practitioner' }
      });
      toast({ title: "Updated", description: "User has been updated." });
      setEditUserDialog(null);
    } catch {
      toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'admin' | 'practitioner'
      });
      toast({ title: "Created", description: "User has been created." });
      setNewUserDialog(false);
      setFormData({});
    } catch {
      toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
    }
  };

  const handleUpdatePatient = async () => {
    if (!editPatientDialog) return;
    try {
      const bt = formData.billingType as BillingType;
      await updatePatientMutation.mutateAsync({
        id: editPatientDialog.id,
        data: { 
          firstName: formData.firstName, 
          surname: formData.surname, 
          dateOfBirth: formData.dateOfBirth || null,
          accountNumber: formData.accountNumber || null,
          billingType: bt,
          medicalAidName: bt === 'medical_aid' ? (formData.medicalAidName || null) : null
        }
      });
      toast({ title: "Updated", description: "Patient has been updated." });
      setEditPatientDialog(null);
    } catch {
      toast({ title: "Error", description: "Failed to update patient.", variant: "destructive" });
    }
  };

  const handleCreatePatient = async () => {
    try {
      const bt = formData.billingType as BillingType;
      await createPatientMutation.mutateAsync({
        firstName: formData.firstName,
        surname: formData.surname,
        dateOfBirth: formData.dateOfBirth || null,
        accountNumber: formData.accountNumber || null,
        billingType: bt,
        medicalAidName: bt === 'medical_aid' ? (formData.medicalAidName || null) : null
      });
      toast({ title: "Created", description: "Patient has been created." });
      setNewPatientDialog(false);
      setFormData({});
    } catch {
      toast({ title: "Error", description: "Failed to create patient.", variant: "destructive" });
    }
  };

  const handleUpdateCode = async () => {
    if (!editCodeDialog) return;
    try {
      const billingType = formData.billingType as BillingType;
      const billingFrequency = billingType === 'medical_aid' ? 'weekly' : (formData.billingFrequency || 'weekly');
      await updateBillingCodeMutation.mutateAsync({
        id: editCodeDialog.id,
        data: { 
          code: formData.code, 
          description: formData.description, 
          price: parseFloat(formData.price),
          billingType,
          billingFrequency: billingFrequency as 'weekly' | 'monthly'
        }
      });
      toast({ title: "Updated", description: "Billing code has been updated." });
      setEditCodeDialog(null);
    } catch {
      toast({ title: "Error", description: "Failed to update billing code.", variant: "destructive" });
    }
  };

  const handleCreateCode = async () => {
    try {
      const billingType = formData.billingType as BillingType;
      const billingFrequency = billingType === 'medical_aid' ? 'weekly' : (formData.billingFrequency || 'weekly');
      await createBillingCodeMutation.mutateAsync({
        code: formData.code,
        description: formData.description,
        price: parseFloat(formData.price),
        billingType,
        billingFrequency: billingFrequency as 'weekly' | 'monthly'
      });
      toast({ title: "Created", description: "Billing code has been created." });
      setNewCodeDialog(false);
      setFormData({});
    } catch {
      toast({ title: "Error", description: "Failed to create billing code.", variant: "destructive" });
    }
  };

  const handleUpdatePeriod = async () => {
    if (!editPeriodDialog) return;
    try {
      await updateFinancialPeriodMutation.mutateAsync({
        id: editPeriodDialog.id,
        data: { 
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate
        }
      });
      toast({ title: "Updated", description: "Financial period has been updated." });
      setEditPeriodDialog(null);
    } catch {
      toast({ title: "Error", description: "Failed to update financial period.", variant: "destructive" });
    }
  };

  const handleCreatePeriod = async () => {
    try {
      await createFinancialPeriodMutation.mutateAsync({
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate
      });
      toast({ title: "Created", description: "Financial period has been created." });
      setNewPeriodDialog(false);
      setFormData({});
    } catch {
      toast({ title: "Error", description: "Failed to create financial period.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await importBillingCodesMutation.mutateAsync(file);
      toast({ 
        title: "Import Successful", 
        description: result.message 
      });
      if (result.errors && result.errors.length > 0) {
        console.log('Import errors:', result.errors);
      }
    } catch (error) {
      toast({ 
        title: "Import Failed", 
        description: error instanceof Error ? error.message : "Failed to import billing codes.",
        variant: "destructive" 
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-admin">Admin View</h1>
          <p className="text-muted-foreground">Master view of all practice data.</p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-export">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Tabs defaultValue="all-sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-sessions" data-testid="tab-sessions">All Sessions</TabsTrigger>
          <TabsTrigger value="patients" data-testid="tab-patients">Patients</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">Staff</TabsTrigger>
          <TabsTrigger value="codes" data-testid="tab-codes">Billing Codes</TabsTrigger>
          <TabsTrigger value="periods" data-testid="tab-periods">Financial Periods</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-sessions" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Master Session List</CardTitle>
              <CardDescription>
                Complete history of all sessions across all practitioners.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-admin-session-${session.id}`}>
                        <td className="p-4 align-middle font-mono text-xs">{session.id}</td>
                        <td className="p-4 align-middle">{session.date}</td>
                        <td className="p-4 align-middle font-medium">{session.patientName}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            session.billingType === 'private' 
                              ? 'bg-purple-100 text-purple-800' 
                              : session.billingType === 'private_cash'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {session.billingType === 'private' ? 'Private' : session.billingType === 'private_cash' ? 'Private Cash' : 'Medical Aid'}
                          </span>
                        </td>
                        <td className="p-4 align-middle">{session.practitionerName}</td>
                        <td className="p-4 align-middle">{session.billingCodes.join(', ')}</td>
                        <td className="p-4 align-middle text-right">R {session.finalPrice}</td>
                        <td className="p-4 align-middle text-right capitalize">{session.status}</td>
                        <td className="p-4 align-middle text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ type: 'session', id: session.id, name: `Session #${session.id}` })}
                            data-testid={`button-delete-session-${session.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Patient Management</CardTitle>
                <CardDescription>Manage patient records and information.</CardDescription>
              </div>
              <Button className="gap-2" onClick={() => { setFormData({}); setNewPatientDialog(true); }} data-testid="button-add-patient">
                <Plus className="h-4 w-4" />
                Add Patient
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date of Birth</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Account No.</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Billing Type</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {patients.map((patient) => (
                      <tr key={patient.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-patient-${patient.id}`}>
                        <td className="p-4 align-middle font-medium">{patient.firstName} {patient.surname}</td>
                        <td className="p-4 align-middle">{patient.dateOfBirth || '-'}</td>
                        <td className="p-4 align-middle">{patient.accountNumber || '-'}</td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              patient.billingType === 'private' 
                                ? 'bg-purple-100 text-purple-800' 
                                : patient.billingType === 'private_cash'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {patient.billingType === 'private' ? 'Private' : patient.billingType === 'private_cash' ? 'Private Cash' : 'Medical Aid'}
                            </span>
                            {patient.billingType === 'medical_aid' && patient.medicalAidName && (
                              <span className="text-xs text-muted-foreground">({patient.medicalAidName})</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => { 
                              setFormData({ 
                                firstName: patient.firstName, 
                                surname: patient.surname, 
                                dateOfBirth: patient.dateOfBirth || '',
                                accountNumber: patient.accountNumber || '',
                                billingType: patient.billingType,
                                medicalAidName: patient.medicalAidName || ''
                              }); 
                              setEditPatientDialog(patient); 
                            }}
                            data-testid={`button-edit-patient-${patient.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ type: 'patient', id: patient.id, name: `${patient.firstName} ${patient.surname}` })}
                            data-testid={`button-delete-patient-${patient.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Manage practitioner access and roles.</CardDescription>
              </div>
              <Button className="gap-2" onClick={() => { setFormData({ role: 'practitioner' }); setNewUserDialog(true); }} data-testid="button-add-user">
                <Plus className="h-4 w-4" />
                Add Staff
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {users.map((user) => (
                      <tr key={user.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-user-${user.id}`}>
                        <td className="p-4 align-middle font-medium">{user.name}</td>
                        <td className="p-4 align-middle">{user.email}</td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 capitalize">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => { 
                              setFormData({ name: user.name, email: user.email, role: user.role }); 
                              setEditUserDialog(user); 
                            }}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ type: 'user', id: user.id, name: user.name })}
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Billing Codes</CardTitle>
                <CardDescription>Manage tariff codes and pricing.</CardDescription>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-import"
                />
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importBillingCodesMutation.isPending}
                  data-testid="button-import-codes"
                >
                  <Upload className="h-4 w-4" />
                  {importBillingCodesMutation.isPending ? 'Importing...' : 'Import from Excel'}
                </Button>
                <Button className="gap-2" onClick={() => { setFormData({ billingType: 'medical_aid', billingFrequency: 'weekly' }); setNewCodeDialog(true); }} data-testid="button-add-code">
                  <Plus className="h-4 w-4" />
                  Add Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Excel Import Format</p>
                    <p className="text-xs text-muted-foreground">Your Excel file should have columns: Code, Description, Price, Type (medical_aid or private)</p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Frequency</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Price</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {[...billingCodes].sort((a, b) => {
                      // Sort order: medical_aid first, then private weekly, then private monthly
                      const getOrder = (code: typeof a) => {
                        if (code.billingType === 'medical_aid') return 0;
                        if ((code.billingType === 'private' || code.billingType === 'private_cash') && code.billingFrequency === 'weekly') return 1;
                        return 2; // monthly
                      };
                      const orderDiff = getOrder(a) - getOrder(b);
                      if (orderDiff !== 0) return orderDiff;
                      return a.code.localeCompare(b.code);
                    }).map((code) => (
                      <tr key={code.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-code-${code.id}`}>
                        <td className="p-4 align-middle font-bold">{code.code}</td>
                        <td className="p-4 align-middle">{code.description}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            code.billingType === 'private' 
                              ? 'bg-purple-100 text-purple-800' 
                              : code.billingType === 'private_cash'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {code.billingType === 'private' ? 'Private' : code.billingType === 'private_cash' ? 'Private Cash' : 'Medical Aid'}
                          </span>
                        </td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            code.billingFrequency === 'monthly' ? 'bg-orange-100 text-orange-800' : 'bg-cyan-100 text-cyan-800'
                          }`}>
                            {code.billingFrequency === 'monthly' ? 'Monthly' : 'Weekly'}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right font-medium">R {code.price}</td>
                        <td className="p-4 align-middle text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => { 
                              setFormData({ 
                                code: code.code, 
                                description: code.description, 
                                price: code.price.toString(),
                                billingType: code.billingType,
                                billingFrequency: code.billingFrequency
                              }); 
                              setEditCodeDialog(code); 
                            }}
                            data-testid={`button-edit-code-${code.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ type: 'code', id: code.id, name: code.code })}
                            data-testid={`button-delete-code-${code.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Periods</CardTitle>
                <CardDescription>Define financial periods for reporting and filtering.</CardDescription>
              </div>
              <Button className="gap-2" onClick={() => { setFormData({}); setNewPeriodDialog(true); }} data-testid="button-add-period">
                <Plus className="h-4 w-4" />
                Add Period
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Start Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">End Date</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {financialPeriods.map((period) => (
                      <tr key={period.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-period-${period.id}`}>
                        <td className="p-4 align-middle font-medium">{period.name}</td>
                        <td className="p-4 align-middle">{period.startDate}</td>
                        <td className="p-4 align-middle">{period.endDate}</td>
                        <td className="p-4 align-middle text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => { 
                              setFormData({ 
                                name: period.name,
                                startDate: period.startDate,
                                endDate: period.endDate
                              }); 
                              setEditPeriodDialog(period); 
                            }}
                            data-testid={`button-edit-period-${period.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ type: 'period', id: period.id, name: period.name })}
                            data-testid={`button-delete-period-${period.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteDialog?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editUserDialog} onOpenChange={() => setEditUserDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update the staff member's information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-edit-user-name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-edit-user-email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role || 'practitioner'} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-edit-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="practitioner">Practitioner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateUser} data-testid="button-save-user">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>Create a new staff member account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-new-user-name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-new-user-email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} data-testid="input-new-user-password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role || 'practitioner'} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-new-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="practitioner">Practitioner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateUser} data-testid="button-create-user">Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPatientDialog} onOpenChange={() => setEditPatientDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Update the patient's information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName || ''} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} data-testid="input-edit-patient-firstname" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="surname">Surname</Label>
                <Input id="surname" value={formData.surname || ''} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} data-testid="input-edit-patient-surname" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} data-testid="input-edit-patient-dob" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" value={formData.accountNumber || ''} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} data-testid="input-edit-patient-account" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingType">Billing Type</Label>
              <Select value={formData.billingType || 'medical_aid'} onValueChange={(v) => setFormData({ ...formData, billingType: v })}>
                <SelectTrigger data-testid="select-edit-patient-billing-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_aid">Medical Aid</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="private_cash">Private Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medicalAidName">Medical Aid Name</Label>
              <Input 
                id="medicalAidName" 
                value={formData.medicalAidName || ''} 
                onChange={(e) => setFormData({ ...formData, medicalAidName: e.target.value })} 
                placeholder={formData.billingType === 'medical_aid' ? "e.g. Discovery, Bonitas" : "N/A for private billing"}
                disabled={formData.billingType !== 'medical_aid'}
                className={formData.billingType !== 'medical_aid' ? 'bg-muted cursor-not-allowed' : ''}
                data-testid="input-edit-patient-medical-aid-name" 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdatePatient} data-testid="button-save-patient">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newPatientDialog} onOpenChange={setNewPatientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient</DialogTitle>
            <DialogDescription>Create a new patient record.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName || ''} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} data-testid="input-new-patient-firstname" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="surname">Surname</Label>
                <Input id="surname" value={formData.surname || ''} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} data-testid="input-new-patient-surname" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} data-testid="input-new-patient-dob" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" value={formData.accountNumber || ''} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} data-testid="input-new-patient-account" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingType">Billing Type</Label>
              <Select value={formData.billingType || 'medical_aid'} onValueChange={(v) => setFormData({ ...formData, billingType: v })}>
                <SelectTrigger data-testid="select-new-patient-billing-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_aid">Medical Aid</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="private_cash">Private Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medicalAidName">Medical Aid Name</Label>
              <Input 
                id="medicalAidName" 
                value={formData.medicalAidName || ''} 
                onChange={(e) => setFormData({ ...formData, medicalAidName: e.target.value })} 
                placeholder={formData.billingType === 'medical_aid' ? "e.g. Discovery, Bonitas" : "N/A for private billing"}
                disabled={formData.billingType !== 'medical_aid'}
                className={formData.billingType !== 'medical_aid' ? 'bg-muted cursor-not-allowed' : ''}
                data-testid="input-new-patient-medical-aid-name" 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreatePatient} data-testid="button-create-patient">Create Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCodeDialog} onOpenChange={() => setEditCodeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Billing Code</DialogTitle>
            <DialogDescription>Update the billing code details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} data-testid="input-edit-code-code" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} data-testid="input-edit-code-description" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price (R)</Label>
              <Input id="price" type="number" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} data-testid="input-edit-code-price" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingType">Billing Type</Label>
              <Select value={formData.billingType || 'medical_aid'} onValueChange={(v) => setFormData({ ...formData, billingType: v, billingFrequency: v === 'medical_aid' ? 'weekly' : formData.billingFrequency })}>
                <SelectTrigger data-testid="select-edit-code-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_aid">Medical Aid</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="private_cash">Private Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.billingType === 'private' || formData.billingType === 'private_cash') && (
              <div className="grid gap-2">
                <Label htmlFor="billingFrequency">Billing Frequency</Label>
                <Select value={formData.billingFrequency || 'weekly'} onValueChange={(v) => setFormData({ ...formData, billingFrequency: v })}>
                  <SelectTrigger data-testid="select-edit-code-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateCode} data-testid="button-save-code">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newCodeDialog} onOpenChange={setNewCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Billing Code</DialogTitle>
            <DialogDescription>Create a new tariff code.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} data-testid="input-new-code-code" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} data-testid="input-new-code-description" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price (R)</Label>
              <Input id="price" type="number" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} data-testid="input-new-code-price" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingType">Billing Type</Label>
              <Select value={formData.billingType || 'medical_aid'} onValueChange={(v) => setFormData({ ...formData, billingType: v, billingFrequency: v === 'medical_aid' ? 'weekly' : formData.billingFrequency })}>
                <SelectTrigger data-testid="select-new-code-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_aid">Medical Aid</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="private_cash">Private Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.billingType === 'private' || formData.billingType === 'private_cash') && (
              <div className="grid gap-2">
                <Label htmlFor="billingFrequency">Billing Frequency</Label>
                <Select value={formData.billingFrequency || 'weekly'} onValueChange={(v) => setFormData({ ...formData, billingFrequency: v })}>
                  <SelectTrigger data-testid="select-new-code-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateCode} data-testid="button-create-code">Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPeriodDialog} onOpenChange={() => setEditPeriodDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Financial Period</DialogTitle>
            <DialogDescription>Update the financial period details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Period Name</Label>
              <Input id="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. FY 2024/2025" data-testid="input-edit-period-name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} data-testid="input-edit-period-start" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={formData.endDate || ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} data-testid="input-edit-period-end" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdatePeriod} data-testid="button-save-period">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newPeriodDialog} onOpenChange={setNewPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Financial Period</DialogTitle>
            <DialogDescription>Create a new financial period for reporting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Period Name</Label>
              <Input id="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. FY 2024/2025" data-testid="input-new-period-name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} data-testid="input-new-period-start" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={formData.endDate || ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} data-testid="input-new-period-end" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreatePeriod} data-testid="button-create-period">Create Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
