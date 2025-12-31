import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePatients, useCreatePatient, BillingType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Calendar, Hash } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function PatientsPage() {
  const { data: patients = [], isLoading } = usePatients();
  const createPatientMutation = useCreatePatient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [billingType, setBillingType] = useState<BillingType>("medical_aid");
  const [medicalAidName, setMedicalAidName] = useState("");

  const handleSave = () => {
    if (!firstName || !surname) return;

    createPatientMutation.mutate({
      firstName,
      surname,
      dateOfBirth: dateOfBirth || null,
      accountNumber: accountNumber || null,
      billingType,
      medicalAidName: billingType === 'medical_aid' ? (medicalAidName || null) : null
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFirstName("");
        setSurname("");
        setDateOfBirth("");
        setAccountNumber("");
        setBillingType("medical_aid");
        setMedicalAidName("");
        
        toast({
          title: "Patient Added",
          description: `${firstName} ${surname} has been added to the database.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to add patient. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.surname || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) ||
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

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-patients">Patients</h1>
          <p className="text-muted-foreground">Manage your patient database.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm" data-testid="button-add-patient">
              <Plus className="h-4 w-4" />
              Add New Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Patient</DialogTitle>
              <DialogDescription>
                Create a new patient record.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    placeholder="e.g. John"
                    data-testid="input-firstname"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input 
                    id="surname" 
                    value={surname} 
                    onChange={(e) => setSurname(e.target.value)} 
                    placeholder="e.g. Doe"
                    data-testid="input-surname"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input 
                  id="dateOfBirth" 
                  type="date" 
                  value={dateOfBirth} 
                  onChange={(e) => setDateOfBirth(e.target.value)} 
                  data-testid="input-dob"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input 
                  id="accountNumber" 
                  value={accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value)} 
                  placeholder="e.g. ACC001"
                  data-testid="input-account-number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billingType">Billing Type</Label>
                <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
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
                  value={medicalAidName} 
                  onChange={(e) => setMedicalAidName(e.target.value)} 
                  placeholder={billingType === 'medical_aid' ? "e.g. Discovery, Bonitas" : "N/A for private billing"}
                  disabled={billingType !== 'medical_aid'}
                  className={billingType !== 'medical_aid' ? 'bg-muted cursor-not-allowed' : ''}
                  data-testid="input-medical-aid-name"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSave} data-testid="button-save-patient">Add Patient</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search patients..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-patients"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="shadow-sm hover:shadow-md transition-all cursor-pointer" data-testid={`card-patient-${patient.id}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">{patient.firstName} {patient.surname}</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {patient.firstName?.charAt(0) || '?'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.dateOfBirth || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Hash className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.accountNumber || 'N/A'}
                </div>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
