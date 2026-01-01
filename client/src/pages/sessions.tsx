import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateSession, useSessions, usePatients, useBillingCodesByType, useUsers, useFinancialPeriods, BillingType } from "@/lib/api";
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
  const { data: financialPeriods = [] } = useFinancialPeriods();
  const createSessionMutation = useCreateSession();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [selectedPractitionerId, setSelectedPractitionerId] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [selectedBillingType, setSelectedBillingType] = useState<BillingType>("medical_aid");
  const [selectedBillingFrequency, setSelectedBillingFrequency] = useState<"weekly" | "monthly">("weekly");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sessionTime, setSessionTime] = useState("09:00");
  const [timeNotApplicable, setTimeNotApplicable] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Fetch billing codes based on selected type
  // Private and private_cash share the same tariff codes
  const billingTypeForCodes = selectedBillingType === 'private_cash' ? 'private' : selectedBillingType;
  const { data: allBillingCodes = [] } = useBillingCodesByType(billingTypeForCodes);
  
  // Filter codes by selected billing frequency
  const billingCodes = allBillingCodes.filter(code => code.billingFrequency === selectedBillingFrequency);

  // Reset selected codes and discount when billing type or frequency changes
  useEffect(() => {
    setSelectedCodeIds([]);
    setDiscountAmount(0);
  }, [selectedBillingType, selectedBillingFrequency]);

  const handleSave = async () => {
    if (!selectedPractitionerId || !selectedPatientId || selectedCodeIds.length === 0) return;

    const practitionerId = parseInt(selectedPractitionerId);

    const patient = patients.find(p => p.id === parseInt(selectedPatientId));
    if (!patient) return;

    const codeIds = selectedCodeIds.map(id => parseInt(id));

    try {
      await createSessionMutation.mutateAsync({
        practitionerId: practitionerId,
        patientId: patient.id,
        billingCodeIds: codeIds,
        billingType: selectedBillingType,
        billingFrequency: selectedBillingFrequency,
        date: sessionDate,
        time: timeNotApplicable ? 'N/A' : sessionTime,
        status: 'captured',
        notes: sessionNotes || null,
        discountPercent: (selectedBillingType === 'private' || selectedBillingType === 'private_cash') ? discountAmount : 0
      });
      
      setIsDialogOpen(false);
      setSelectedPractitionerId("");
      setSelectedPatientId("");
      setSelectedCodeIds([]);
      setSessionNotes("");
      setSelectedBillingType("medical_aid");
      setSelectedBillingFrequency("weekly");
      setDiscountAmount(0);
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

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.billingCodes.some(code => code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPeriod = selectedPeriodFilter === "all" || 
      (selectedPeriodFilter === "none" && !session.financialPeriodId) ||
      session.financialPeriodId?.toString() === selectedPeriodFilter;
    
    return matchesSearch && matchesPeriod;
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
                <Label htmlFor="practitioner">Practitioner</Label>
                <Select value={selectedPractitionerId} onValueChange={setSelectedPractitionerId}>
                  <SelectTrigger id="practitioner" data-testid="select-practitioner">
                    <SelectValue placeholder="Select practitioner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  {(() => {
                    const matchingPeriod = financialPeriods.find(p => 
                      sessionDate >= p.startDate && sessionDate <= p.endDate
                    );
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Financial Period:</span>
                        {matchingPeriod ? (
                          <span className="text-xs font-medium text-primary" data-testid="text-financial-period">{matchingPeriod.name}</span>
                        ) : (
                          <span className="text-xs text-amber-600" data-testid="text-financial-period-none">No matching period</span>
                        )}
                      </div>
                    );
                  })()}
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
              <div className="grid grid-cols-2 gap-4">
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
                <div className="grid gap-2">
                  <Label htmlFor="billingFrequency">Billing Frequency</Label>
                  <Select value={selectedBillingFrequency} onValueChange={(v) => setSelectedBillingFrequency(v as "weekly" | "monthly")}>
                    <SelectTrigger id="billingFrequency" data-testid="select-billing-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(selectedBillingType === 'private' || selectedBillingType === 'private_cash') && (
                <div className="grid gap-2">
                  <Label htmlFor="discount">Additional Discount (R)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                      setDiscountAmount(val);
                    }}
                    placeholder="0"
                    data-testid="input-discount"
                  />
                  {selectedBillingType === 'private_cash' && (
                    <p className="text-xs text-muted-foreground">Private cash includes automatic 10% discount (rounded to nearest R10)</p>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label>Tariff Codes</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {[...billingCodes].sort((a, b) => {
                    if (selectedBillingFrequency === 'weekly') {
                      // Weekly: medical aid first, then EV, RE, PEN, EQ
                      const weeklyPrefixOrder = ['EV', 'RE', 'PEN', 'EQ'];
                      const getWeeklyOrder = (code: typeof a) => {
                        if (code.billingType === 'medical_aid') return -1;
                        for (let i = 0; i < weeklyPrefixOrder.length; i++) {
                          if (code.code.startsWith(weeklyPrefixOrder[i])) return i;
                        }
                        return weeklyPrefixOrder.length;
                      };
                      const orderDiff = getWeeklyOrder(a) - getWeeklyOrder(b);
                      if (orderDiff !== 0) return orderDiff;
                    } else {
                      // Monthly: PVT8, PVT12, PEN8, PEN12, FA8, FA12, PFA8, PFA12
                      const monthlyPrefixOrder = ['PVT8', 'PVT12', 'PEN8', 'PEN12', 'FA8', 'FA12', 'PFA8', 'PFA12'];
                      const getMonthlyOrder = (code: string) => {
                        for (let i = 0; i < monthlyPrefixOrder.length; i++) {
                          if (code.startsWith(monthlyPrefixOrder[i])) return i;
                        }
                        return monthlyPrefixOrder.length;
                      };
                      const orderDiff = getMonthlyOrder(a.code) - getMonthlyOrder(b.code);
                      if (orderDiff !== 0) return orderDiff;
                    }
                    return a.code.localeCompare(b.code);
                  }).map(c => (
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
                {selectedCodeIds.length > 0 && (() => {
                  const selectedCodes = selectedCodeIds.map(id => billingCodes.find(c => c.id === parseInt(id))).filter(Boolean);
                  const totalPrice = selectedCodes.reduce((sum, c) => sum + (c?.price || 0), 0);
                  let finalPrice = totalPrice;
                  
                  if (selectedBillingType === 'private_cash') {
                    finalPrice = Math.round(totalPrice * 0.9 / 10) * 10;
                    if (discountAmount > 0) {
                      finalPrice = Math.max(0, finalPrice - discountAmount);
                    }
                  } else if (selectedBillingType === 'private' && discountAmount > 0) {
                    finalPrice = Math.max(0, totalPrice - discountAmount);
                  }
                  
                  return (
                    <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span className="text-sm text-muted-foreground">
                        {selectedCodeIds.length} code{selectedCodeIds.length > 1 ? 's' : ''} selected
                      </span>
                      <div className="text-right">
                        {finalPrice !== totalPrice ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-green-600">R {finalPrice}</span>
                            <span className="text-xs text-muted-foreground line-through">R {totalPrice}</span>
                          </div>
                        ) : (
                          <span className="font-semibold">R {totalPrice}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Billing Notes</Label>
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
              <Select value={selectedPeriodFilter} onValueChange={setSelectedPeriodFilter}>
                <SelectTrigger className="h-9 w-[180px]" data-testid="select-period-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Financial Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="none">No Period</SelectItem>
                  {financialPeriods.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Period</th>
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
                      {session.financialPeriod ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-orange-100 text-orange-800">
                          {session.financialPeriod}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
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
