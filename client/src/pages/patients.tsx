import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient, BillingType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Calendar, Hash, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type PatientFormData = {
  firstName: string;
  surname: string;
  dateOfBirth: string;
  accountNumber: string;
  billingType: BillingType;
  medicalAidName: string;
  gender: string;
  populationGroup: string;
  mainstream: string;
};

const emptyFormData: PatientFormData = {
  firstName: "",
  surname: "",
  dateOfBirth: "",
  accountNumber: "",
  billingType: "medical_aid",
  medicalAidName: "",
  gender: "",
  populationGroup: "",
  mainstream: "",
};

export default function PatientsPage() {
  const { data: patients = [], isLoading } = usePatients();
  const createPatientMutation = useCreatePatient();
  const updatePatientMutation = useUpdatePatient();
  const deletePatientMutation = useDeletePatient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<number | null>(null);
  const [deletePatient, setDeletePatient] = useState<number | null>(null);
  const [formData, setFormData] = useState<PatientFormData>(emptyFormData);

  const handleAdd = () => {
    if (!formData.firstName || !formData.surname) return;

    createPatientMutation.mutate({
      practitionerId: null,
      firstName: formData.firstName,
      surname: formData.surname,
      dateOfBirth: formData.dateOfBirth || null,
      accountNumber: formData.accountNumber || null,
      billingType: formData.billingType,
      medicalAidName: formData.billingType === 'medical_aid' ? (formData.medicalAidName || null) : null,
      gender: formData.gender || null,
      populationGroup: formData.populationGroup || null,
      mainstream: formData.mainstream || null,
    }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setFormData(emptyFormData);
        toast({
          title: "Patient Added",
          description: `${formData.firstName} ${formData.surname} has been added.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to add patient.",
          variant: "destructive",
        });
      }
    });
  };

  const handleEdit = () => {
    if (!editPatient || !formData.firstName || !formData.surname) return;

    updatePatientMutation.mutate({
      id: editPatient,
      data: {
        firstName: formData.firstName,
        surname: formData.surname,
        dateOfBirth: formData.dateOfBirth || null,
        accountNumber: formData.accountNumber || null,
        billingType: formData.billingType,
        medicalAidName: formData.billingType === 'medical_aid' ? (formData.medicalAidName || null) : null,
        gender: formData.gender || null,
        populationGroup: formData.populationGroup || null,
        mainstream: formData.mainstream || null,
      }
    }, {
      onSuccess: () => {
        setEditPatient(null);
        setFormData(emptyFormData);
        toast({
          title: "Patient Updated",
          description: `${formData.firstName} ${formData.surname} has been updated.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update patient.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!deletePatient) return;
    const patient = patients.find(p => p.id === deletePatient);

    deletePatientMutation.mutate(deletePatient, {
      onSuccess: () => {
        setDeletePatient(null);
        toast({
          title: "Patient Deleted",
          description: patient ? `${patient.firstName} ${patient.surname} has been removed.` : "Patient deleted.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete patient.",
          variant: "destructive",
        });
      }
    });
  };

  const openEditDialog = (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setFormData({
        firstName: patient.firstName,
        surname: patient.surname,
        dateOfBirth: patient.dateOfBirth || "",
        accountNumber: patient.accountNumber || "",
        billingType: patient.billingType,
        medicalAidName: patient.medicalAidName || "",
        gender: patient.gender || "",
        populationGroup: patient.populationGroup || "",
        mainstream: patient.mainstream || "",
      });
      setEditPatient(patientId);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return patient.surname.toLowerCase().includes(searchLower) ||
      (patient.accountNumber && patient.accountNumber.toLowerCase().includes(searchLower));
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const PatientFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            value={formData.firstName} 
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} 
            placeholder="e.g. John"
            data-testid="input-firstname"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="surname">Surname</Label>
          <Input 
            id="surname" 
            value={formData.surname} 
            onChange={(e) => setFormData({ ...formData, surname: e.target.value })} 
            placeholder="e.g. Doe"
            data-testid="input-surname"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input 
            id="dateOfBirth" 
            type="date" 
            value={formData.dateOfBirth} 
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} 
            data-testid="input-dob"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input 
            id="accountNumber" 
            value={formData.accountNumber} 
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} 
            placeholder="e.g. ACC001"
            data-testid="input-account-number"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="billingType">Billing Type</Label>
          <Select value={formData.billingType} onValueChange={(v) => setFormData({ ...formData, billingType: v as BillingType })}>
            <SelectTrigger id="billingType" data-testid="select-billing-type">
              <SelectValue placeholder="Select billing type" />
            </SelectTrigger>
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
            value={formData.medicalAidName} 
            onChange={(e) => setFormData({ ...formData, medicalAidName: e.target.value })} 
            placeholder={formData.billingType === 'medical_aid' ? "e.g. Discovery" : "N/A"}
            disabled={formData.billingType !== 'medical_aid'}
            className={formData.billingType !== 'medical_aid' ? 'bg-muted cursor-not-allowed' : ''}
            data-testid="input-medical-aid-name"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
            <SelectTrigger data-testid="select-gender"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="populationGroup">Population Group</Label>
          <Select value={formData.populationGroup} onValueChange={(v) => setFormData({ ...formData, populationGroup: v })}>
            <SelectTrigger data-testid="select-population-group"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="orthopaedic">Orthopaedic</SelectItem>
              <SelectItem value="metabolic">Metabolic</SelectItem>
              <SelectItem value="cardiac">Cardiac</SelectItem>
              <SelectItem value="conditioning_development_10_13">Conditioning Development (10-13y)</SelectItem>
              <SelectItem value="conditioning_adolescent_14_18">Conditioning Adolescent (14-18y)</SelectItem>
              <SelectItem value="conditioning_adult">Conditioning Adult</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
              <SelectItem value="geriatric">Geriatric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mainstream">Mainstream</Label>
          <Select value={formData.mainstream} onValueChange={(v) => setFormData({ ...formData, mainstream: v })}>
            <SelectTrigger data-testid="select-mainstream"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-patients">Patients</h1>
          <p className="text-muted-foreground">Manage your patient database.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setFormData(emptyFormData); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm" data-testid="button-add-patient">
              <Plus className="h-4 w-4" />
              Add New Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Patient</DialogTitle>
              <DialogDescription>Create a new patient record.</DialogDescription>
            </DialogHeader>
            <PatientFormFields />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd} data-testid="button-save-patient">Add Patient</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by surname or account..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-patients"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="shadow-sm hover:shadow-md transition-all" data-testid={`card-patient-${patient.id}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">{patient.firstName} {patient.surname}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(patient.id)} data-testid={`button-edit-patient-${patient.id}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletePatient(patient.id)} data-testid={`button-delete-patient-${patient.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mt-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.dateOfBirth || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Hash className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.accountNumber || 'N/A'}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    patient.billingType === 'private' 
                      ? 'bg-purple-100 text-purple-800' 
                      : patient.billingType === 'private_cash'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {patient.billingType === 'private' ? 'Private' : patient.billingType === 'private_cash' ? 'Private Cash' : 'Medical Aid'}
                  </span>
                  {patient.gender && (
                    <span className="text-xs text-muted-foreground capitalize">{patient.gender}</span>
                  )}
                  {patient.mainstream === 'yes' && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-800">Mainstream</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editPatient} onOpenChange={(open) => { if (!open) { setEditPatient(null); setFormData(emptyFormData); } }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Update patient information.</DialogDescription>
          </DialogHeader>
          <PatientFormFields />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEdit} data-testid="button-update-patient">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePatient} onOpenChange={(open) => { if (!open) setDeletePatient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the patient record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
