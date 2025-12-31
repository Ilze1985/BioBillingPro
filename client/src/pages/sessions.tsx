import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateSession, useSessions, usePatients, useBillingCodesByType, useUsers, BillingType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Plus, Search, Filter } from "lucide-react";
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

export default function SessionsPage() {
  const { data: sessions = [], isLoading } = useSessions();
  const { data: patients = [] } = usePatients();
  const { data: users = [] } = useUsers();
  const createSessionMutation = useCreateSession();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [selectedBillingType, setSelectedBillingType] = useState<BillingType>("medical_aid");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sessionTime, setSessionTime] = useState("09:00");
  const [timeNotApplicable, setTimeNotApplicable] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Fetch billing codes based on selected type
  const { data: billingCodes = [] } = useBillingCodesByType(selectedBillingType);

  // Reset selected codes and discount when billing type changes
  useEffect(() => {
    setSelectedCodeIds([]);
    setDiscountPercent(0);
  }, [selectedBillingType]);

  // Use first user as current user (in a real app, this would come from auth)
  const currentUser = users[0];

  const handleSave = async () => {
    if (!selectedPatientId || selectedCodeIds.length === 0 || !currentUser) return;

    const patient = patients.find(p => p.id === parseInt(selectedPatientId));
    if (!patient) return;

    const codeIds = selectedCodeIds.map(id => parseInt(id));

    try {
      await createSessionMutation.mutateAsync({
        practitionerId: currentUser.id,
        patientId: patient.id,
        billingCodeIds: codeIds,
        billingType: selectedBillingType,
        date: sessionDate,
        time: timeNotApplicable ? 'N/A' : sessionTime,
        status: 'captured',
        notes: sessionNotes || null,
        discountPercent: (selectedBillingType === 'private' || selectedBillingType === 'private_cash') ? discountPercent : 0
      });
      
      setIsDialogOpen(false);
      setSelectedPatientId("");
      setSelectedCodeIds([]);
      setSessionNotes("");
      setSelectedBillingType("medical_aid");
      setDiscountPercent(0);
      setTimeNotApplicable(false);
      setSessionTime("09:00");
      
      toast({
        title: "Session Captured",
        description: `Successfully captured session with ${codeIds.length} code${codeIds.length > 1 ? 's' : ''} for ${patient.firstName} ${patient.surname}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to capture session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredSessions = sessions.filter(session => 
    session.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.billingCodes.some(code => code.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-sessions">Sessions</h1>
          <p className="text-muted-foreground">Capture and manage patient sessions.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm" data-testid="button-new-session">
              <Plus className="h-4 w-4" />
              Capture New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Capture Session</DialogTitle>
              <DialogDescription>
                Enter the details for the new patient session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="patient">Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger id="patient" data-testid="select-patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.firstName} {p.surname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={sessionDate} 
                    onChange={(e) => setSessionDate(e.target.value)}
                    data-testid="input-date"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Time</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    value={sessionTime} 
                    onChange={(e) => setSessionTime(e.target.value)}
                    disabled={timeNotApplicable}
                    data-testid="input-time"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="time-na"
                      checked={timeNotApplicable}
                      onChange={(e) => setTimeNotApplicable(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                      data-testid="checkbox-time-na"
                    />
                    <Label htmlFor="time-na" className="text-sm font-normal text-muted-foreground cursor-pointer">
                      N/A (monthly package)
                    </Label>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="billingType">Billing Type</Label>
                <Select value={selectedBillingType} onValueChange={(v) => setSelectedBillingType(v as BillingType)}>
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
              {(selectedBillingType === 'private' || selectedBillingType === 'private_cash') && (
                <div className="grid gap-2">
                  <Label htmlFor="discount">Additional Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                      setDiscountPercent(val);
                    }}
                    placeholder="0"
                    data-testid="input-discount"
                  />
                  {selectedBillingType === 'private_cash' && (
                    <p className="text-xs text-muted-foreground">Private cash includes automatic 10% discount</p>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label>Tariff Codes</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {billingCodes.map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`code-${c.id}`}
                        checked={selectedCodeIds.includes(c.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCodeIds([...selectedCodeIds, c.id.toString()]);
                          } else {
                            setSelectedCodeIds(selectedCodeIds.filter(id => id !== c.id.toString()));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid={`checkbox-code-${c.id}`}
                      />
                      <Label htmlFor={`code-${c.id}`} className="text-sm font-normal cursor-pointer flex-1">
                        {c.code} - R{c.price} ({c.description})
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedCodeIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCodeIds.length} code{selectedCodeIds.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Clinical Notes</Label>
                <Textarea 
                  id="notes" 
                  value={sessionNotes} 
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Enter session notes..."
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSave} data-testid="button-save-session">Save Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Session History</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search sessions..."
                  className="pl-8 h-9 w-[200px] lg:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-session-${session.id}`}>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium">{session.date}</span>
                        <span className="text-xs text-muted-foreground">{session.time}</span>
                      </div>
                    </td>
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
                    <td className="p-4 align-middle">
                      <div className="flex flex-wrap gap-1">
                        {session.billingCodes.map((code, idx) => (
                          <span key={idx} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">{session.practitionerName}</td>
                    <td className="p-4 align-middle">
                      <span className={
                        session.status === 'paid' ? "text-green-600 font-medium" :
                        session.status === 'invoiced' ? "text-blue-600 font-medium" :
                        "text-amber-600 font-medium"
                      }>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-right font-medium">
                      {session.finalPrice !== session.totalPrice ? (
                        <div className="flex flex-col items-end">
                          <span>R {session.finalPrice}</span>
                          <span className="text-xs text-muted-foreground line-through">R {session.totalPrice}</span>
                        </div>
                      ) : (
                        <span>R {session.totalPrice}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
