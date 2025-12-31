import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePatients, useCreatePatient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, CreditCard } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function PatientsPage() {
  const { data: patients = [], isLoading } = usePatients();
  const createPatientMutation = useCreatePatient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [medicalAid, setMedicalAid] = useState("");
  const [medicalAidNumber, setMedicalAidNumber] = useState("");

  const handleSave = () => {
    if (!name) return;

    createPatientMutation.mutate({
      name,
      email: email || null,
      phone: phone || null,
      medicalAid: medicalAid || null,
      medicalAidNumber: medicalAidNumber || null
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setName("");
        setEmail("");
        setPhone("");
        setMedicalAid("");
        setMedicalAidNumber("");
        
        toast({
          title: "Patient Added",
          description: `${name} has been added to the database.`,
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

  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.medicalAid && patient.medicalAid.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. John Doe"
                  data-testid="input-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="john@example.com"
                    data-testid="input-email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="082 123 4567"
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="medicalAid">Medical Aid</Label>
                  <Input 
                    id="medicalAid" 
                    value={medicalAid} 
                    onChange={(e) => setMedicalAid(e.target.value)} 
                    placeholder="Discovery"
                    data-testid="input-medical-aid"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maNumber">Number</Label>
                  <Input 
                    id="maNumber" 
                    value={medicalAidNumber} 
                    onChange={(e) => setMedicalAidNumber(e.target.value)} 
                    placeholder="123456789"
                    data-testid="input-medical-aid-number"
                  />
                </div>
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
              <CardTitle className="text-lg font-bold">{patient.name}</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {patient.name.charAt(0)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.email || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.phone || 'N/A'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CreditCard className="mr-2 h-4 w-4 text-primary/70" />
                  {patient.medicalAid || 'N/A'} {patient.medicalAidNumber ? `• ${patient.medicalAidNumber}` : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
