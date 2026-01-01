import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateSession, useSessions, usePatients, useBillingCodesByType, useUsers, useFinancialPeriods, useUpdateSessionStatus, useWeeklyBillingStatements, useCreateWeeklyBillingStatement, useUpdateWeeklyBillingStatementStatus, useMonthlyBillingStatements, useUpdateMonthlyBillingStatementStatus, useArchivedWeeklyBillingStatements, useArchivedMonthlyBillingStatements, BillingType, StatementStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Plus, Search, Filter, FileCheck, User, Send, CheckCircle, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SessionsPage() {
  const { data: sessions = [], isLoading } = useSessions();
  const { data: patients = [] } = usePatients();
  const { data: users = [] } = useUsers();
  const { data: financialPeriods = [] } = useFinancialPeriods();
  const { data: weeklyStatements = [] } = useWeeklyBillingStatements();
  const { data: monthlyStatements = [] } = useMonthlyBillingStatements();
  const { data: archivedWeeklyStatements = [] } = useArchivedWeeklyBillingStatements();
  const { data: archivedMonthlyStatements = [] } = useArchivedMonthlyBillingStatements();
  const createSessionMutation = useCreateSession();
  const updateStatusMutation = useUpdateSessionStatus();
  const createStatementMutation = useCreateWeeklyBillingStatement();
  const updateStatementStatusMutation = useUpdateWeeklyBillingStatementStatus();
  const updateMonthlyStatementStatusMutation = useUpdateMonthlyBillingStatementStatus();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("sessions");
  const [statementNote, setStatementNote] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);
  const [isReadyToSendDialogOpen, setIsReadyToSendDialogOpen] = useState(false);
  const [isMonthlyStatement, setIsMonthlyStatement] = useState(false);
  const [monthlyStatementNote, setMonthlyStatementNote] = useState("");
  const [selectedMonthlyStatementId, setSelectedMonthlyStatementId] = useState<number | null>(null);
  const [isMonthlyReadyToSendDialogOpen, setIsMonthlyReadyToSendDialogOpen] = useState(false);
  const [archivedPeriodFilter, setArchivedPeriodFilter] = useState<string>("all");
  const [archivedPractitionerFilter, setArchivedPractitionerFilter] = useState<string>("all");
  const [archivedBillingTypeFilter, setArchivedBillingTypeFilter] = useState<string>("all");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");
  const [practitionerFilter, setPractitionerFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("practitioner");

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
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [codeSearchTerm, setCodeSearchTerm] = useState("");

  // Fetch billing codes based on selected type
  // Private and private_cash share the same tariff codes
  const billingTypeForCodes = selectedBillingType === 'private_cash' ? 'private' : selectedBillingType;
  const { data: allBillingCodes = [] } = useBillingCodesByType(billingTypeForCodes);
  
  // Filter codes by selected billing frequency
  const billingCodes = allBillingCodes.filter(code => code.billingFrequency === selectedBillingFrequency);

  // Auto-populate billing type from patient when patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id === parseInt(selectedPatientId));
      if (patient) {
        setSelectedBillingType(patient.billingType);
      }
    }
  }, [selectedPatientId, patients]);

  // Force billing frequency to weekly for medical aid
  useEffect(() => {
    if (selectedBillingType === 'medical_aid') {
      setSelectedBillingFrequency('weekly');
    }
  }, [selectedBillingType]);

  // Reset selected codes and discount when billing type or frequency changes
  useEffect(() => {
    setSelectedCodeIds([]);
    setDiscountAmount(0);
  }, [selectedBillingType, selectedBillingFrequency]);

  const handleSave = async () => {
    if (!selectedPractitionerId || !selectedPatientId || selectedCodeIds.length === 0) return;

    const patient = patients.find(p => p.id === parseInt(selectedPatientId));
    if (!patient) return;

    // Prevent billing for inactive patients on monthly billing
    if (selectedBillingFrequency === 'monthly' && patient.monthlyBillingActive === 'no') {
      toast({
        title: "Patient Inactive",
        description: `${patient.firstName} ${patient.surname} is marked as inactive. Please reactivate the patient before billing.`,
        variant: "destructive",
      });
      return;
    }

    // Prevent future dates for weekly billing
    if (selectedBillingFrequency === 'weekly') {
      const today = format(new Date(), "yyyy-MM-dd");
      if (sessionDate > today) {
        toast({
          title: "Invalid Date",
          description: "Weekly billing is done in arrears. Future dates are not allowed.",
          variant: "destructive",
        });
        return;
      }
    }

    const practitionerId = parseInt(selectedPractitionerId);

    const codeIds = selectedCodeIds.map(id => parseInt(id));

    try {
      await createSessionMutation.mutateAsync({
        practitionerId: practitionerId,
        patientId: patient.id,
        billingCodeIds: codeIds,
        billingType: selectedBillingType,
        billingFrequency: selectedBillingFrequency,
        date: sessionDate,
        time: selectedBillingFrequency === 'monthly' ? 'N/A' : (timeNotApplicable ? 'N/A' : sessionTime),
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
      setPatientSearchTerm("");
      setCodeSearchTerm("");
      
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

  const handleMarkAsInvoiced = async (sessionId: number) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: sessionId,
        status: 'invoiced',
        userRole: currentUserRole
      });
      toast({
        title: "Session Invoiced",
        description: "Session status has been updated to Invoiced.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update session status.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleReadyToSend = async () => {
    if (!selectedStatementId || !statementNote.trim()) return;
    try {
      await updateStatementStatusMutation.mutateAsync({
        id: selectedStatementId,
        status: 'ready_to_send' as StatementStatus,
        userRole: currentUserRole,
        statementTypeNote: statementNote.trim()
      });
      toast({
        title: "Statement Ready",
        description: "Statement has been marked as ready to send.",
      });
      setIsReadyToSendDialogOpen(false);
      setStatementNote("");
      setSelectedStatementId(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update statement status.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMarkStatementSent = async (statementId: number) => {
    try {
      await updateStatementStatusMutation.mutateAsync({
        id: statementId,
        status: 'statement_sent' as StatementStatus,
        userRole: currentUserRole
      });
      toast({
        title: "Statement Sent",
        description: "Statement has been marked as sent and archived.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update statement status.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleArchiveStatement = async (statementId: number) => {
    try {
      await updateStatementStatusMutation.mutateAsync({
        id: statementId,
        status: 'archived' as StatementStatus,
        userRole: currentUserRole
      });
      toast({
        title: "Statement Archived",
        description: "Statement has been archived.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to archive statement.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMonthlyReadyToSend = async () => {
    if (!selectedMonthlyStatementId || !monthlyStatementNote.trim()) return;
    try {
      await updateMonthlyStatementStatusMutation.mutateAsync({
        id: selectedMonthlyStatementId,
        status: 'ready_to_send' as StatementStatus,
        userRole: currentUserRole,
        statementTypeNote: monthlyStatementNote.trim()
      });
      toast({
        title: "Invoice & Statement Ready",
        description: "Monthly statement has been marked as ready to send.",
      });
      setIsMonthlyReadyToSendDialogOpen(false);
      setMonthlyStatementNote("");
      setSelectedMonthlyStatementId(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update statement status.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMarkMonthlyStatementSent = async (statementId: number) => {
    try {
      await updateMonthlyStatementStatusMutation.mutateAsync({
        id: statementId,
        status: 'statement_sent' as StatementStatus,
        userRole: currentUserRole
      });
      toast({
        title: "Statement Sent",
        description: "Monthly statement has been marked as sent and archived.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update statement status.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleArchiveMonthlyStatement = async (statementId: number) => {
    try {
      await updateMonthlyStatementStatusMutation.mutateAsync({
        id: statementId,
        status: 'archived' as StatementStatus,
        userRole: currentUserRole
      });
      toast({
        title: "Statement Archived",
        description: "Monthly statement has been archived.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to archive statement.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const canMarkAsInvoiced = currentUserRole === 'receptionist' || currentUserRole === 'admin';
  const canCaptureSession = currentUserRole === 'practitioner' || currentUserRole === 'admin';
  const isAdmin = currentUserRole === 'admin';
  const isReceptionist = currentUserRole === 'receptionist';

  // Get enriched statement data
  const enrichedStatements = weeklyStatements.map(statement => {
    const patient = patients.find(p => p.id === statement.patientId);
    const practitioner = users.find(u => u.id === statement.practitionerId);
    const period = financialPeriods.find(p => p.id === statement.financialPeriodId);
    return {
      ...statement,
      patientName: patient ? `${patient.firstName} ${patient.surname}` : 'Unknown',
      practitionerName: practitioner?.name || 'Unknown',
      periodName: period?.name || 'No Period'
    };
  });

  // Get enriched monthly statement data
  const enrichedMonthlyStatements = monthlyStatements.map(statement => {
    const patient = patients.find(p => p.id === statement.patientId);
    const practitioner = users.find(u => u.id === statement.practitionerId);
    const period = financialPeriods.find(p => p.id === statement.financialPeriodId);
    const session = sessions.find(s => s.id === statement.sessionId);
    return {
      ...statement,
      patientName: patient ? `${patient.firstName} ${patient.surname}` : 'Unknown',
      practitionerName: practitioner?.name || 'Unknown',
      periodName: period?.name || 'No Period',
      sessionDate: session?.date || 'Unknown'
    };
  });

  // Enriched archived statements for admin view
  const enrichedArchivedWeeklyStatements = archivedWeeklyStatements.map(statement => {
    const patient = patients.find(p => p.id === statement.patientId);
    const practitioner = users.find(u => u.id === statement.practitionerId);
    const period = financialPeriods.find(p => p.id === statement.financialPeriodId);
    return {
      ...statement,
      patientName: patient ? `${patient.firstName} ${patient.surname}` : 'Unknown',
      practitionerName: practitioner?.name || 'Unknown',
      periodName: period?.name || 'No Period',
      billingType: 'weekly' as const
    };
  });

  const enrichedArchivedMonthlyStatements = archivedMonthlyStatements.map(statement => {
    const patient = patients.find(p => p.id === statement.patientId);
    const practitioner = users.find(u => u.id === statement.practitionerId);
    const period = financialPeriods.find(p => p.id === statement.financialPeriodId);
    const session = sessions.find(s => s.id === statement.sessionId);
    return {
      ...statement,
      patientName: patient ? `${patient.firstName} ${patient.surname}` : 'Unknown',
      practitionerName: practitioner?.name || 'Unknown',
      periodName: period?.name || 'No Period',
      sessionDate: session?.date || 'Unknown',
      billingType: 'monthly' as const
    };
  });

  // Combine and filter archived statements
  const allArchivedStatements = [
    ...enrichedArchivedWeeklyStatements,
    ...enrichedArchivedMonthlyStatements
  ].filter(statement => {
    const matchesPeriod = archivedPeriodFilter === "all" || 
      statement.financialPeriodId?.toString() === archivedPeriodFilter;
    const matchesPractitioner = archivedPractitionerFilter === "all" || 
      statement.practitionerId?.toString() === archivedPractitionerFilter;
    const matchesBillingType = archivedBillingTypeFilter === "all" || 
      statement.billingType === archivedBillingTypeFilter;
    return matchesPeriod && matchesPractitioner && matchesBillingType;
  });

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.billingCodes.some(code => code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPeriod = selectedPeriodFilter === "all" || 
      (selectedPeriodFilter === "none" && !session.financialPeriodId) ||
      session.financialPeriodId?.toString() === selectedPeriodFilter;
    
    // Only apply practitioner/frequency filters for receptionist/admin roles
    const matchesPractitioner = !canMarkAsInvoiced || practitionerFilter === "all" || 
      session.practitionerId?.toString() === practitionerFilter;
    
    const matchesFrequency = !canMarkAsInvoiced || frequencyFilter === "all" || 
      session.billingFrequency === frequencyFilter;
    
    return matchesSearch && matchesPeriod && matchesPractitioner && matchesFrequency;
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={currentUserRole} onValueChange={setCurrentUserRole}>
              <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent" data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practitioner">Practitioner</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canCaptureSession && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm" data-testid="button-new-session">
                  <Plus className="h-4 w-4" />
                  Capture New Session
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
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
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="Search patients..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        className="h-8"
                        data-testid="input-patient-search"
                      />
                    </div>
                    {patients
                      .filter(p => p.surname.toLowerCase().includes(patientSearchTerm.toLowerCase()))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.firstName} {p.surname}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Billing Type</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm" data-testid="display-billing-type">
                    {selectedBillingType === 'medical_aid' ? 'Medical Aid' : selectedBillingType === 'private' ? 'Private' : selectedBillingType === 'private_cash' ? 'Private Cash' : 'Select patient first'}
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-filled from patient record</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billingFrequency">Billing Frequency</Label>
                  {selectedBillingType === 'medical_aid' ? (
                    <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm" data-testid="display-billing-frequency">
                      Weekly
                    </div>
                  ) : (
                    <Select value={selectedBillingFrequency} onValueChange={(v) => setSelectedBillingFrequency(v as "weekly" | "monthly")}>
                      <SelectTrigger id="billingFrequency" data-testid="select-billing-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={sessionDate} 
                    onChange={(e) => setSessionDate(e.target.value)}
                    max={selectedBillingFrequency === 'weekly' ? format(new Date(), "yyyy-MM-dd") : undefined}
                    data-testid="input-date"
                  />
                  {selectedBillingFrequency === 'weekly' && (
                    <p className="text-xs text-muted-foreground">Weekly billing is done in arrears (no future dates)</p>
                  )}
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
                    disabled={selectedBillingFrequency === 'monthly'}
                    className={selectedBillingFrequency === 'monthly' ? 'bg-muted text-muted-foreground' : ''}
                    data-testid="input-time"
                  />
                  {selectedBillingFrequency === 'monthly' ? (
                    <p className="text-xs text-muted-foreground">N/A for monthly billing</p>
                  ) : (
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
                        N/A
                      </Label>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tariff Codes</Label>
                <Input
                  placeholder="Search codes..."
                  value={codeSearchTerm}
                  onChange={(e) => setCodeSearchTerm(e.target.value)}
                  className="h-8 mb-2"
                  data-testid="input-code-search"
                />
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {[...billingCodes]
                    .filter(c => {
                      const searchLower = codeSearchTerm.toLowerCase();
                      return c.code.toLowerCase().includes(searchLower) || 
                             c.description.toLowerCase().includes(searchLower);
                    })
                    .sort((a, b) => {
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
          )}
        </div>
      </div>

      {canMarkAsInvoiced ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="sessions" data-testid="tab-sessions">All Sessions</TabsTrigger>
            <TabsTrigger value="weekly-statements" data-testid="tab-weekly-statements">Weekly Statements</TabsTrigger>
            <TabsTrigger value="monthly-statements" data-testid="tab-monthly-statements">Monthly Statements</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="archived" data-testid="tab-archived">Archived</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="sessions" className="mt-4">
            <SessionHistoryCard />
          </TabsContent>
          <TabsContent value="weekly-statements" className="mt-4">
            <WeeklyStatementsCard />
          </TabsContent>
          <TabsContent value="monthly-statements" className="mt-4">
            <MonthlyStatementsCard />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="archived" className="mt-4">
              <ArchivedStatementsCard />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <SessionHistoryCard />
      )}

      <Dialog open={isReadyToSendDialogOpen} onOpenChange={setIsReadyToSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to Send Statement</DialogTitle>
            <DialogDescription>
              Add a note about the statement type before marking as ready to send.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="statement-note">Statement Type Note</Label>
              <Textarea
                id="statement-note"
                value={statementNote}
                onChange={(e) => setStatementNote(e.target.value)}
                placeholder="e.g., Medical aid claim, Private account statement..."
                data-testid="input-statement-note"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleReadyToSend} 
              disabled={!statementNote.trim() || updateStatementStatusMutation.isPending}
              data-testid="button-confirm-ready"
            >
              Mark Ready to Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMonthlyReadyToSendDialogOpen} onOpenChange={setIsMonthlyReadyToSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice and Send Statement</DialogTitle>
            <DialogDescription>
              Add a note about the statement before marking as ready to invoice and send.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="monthly-statement-note">Statement Note</Label>
              <Textarea
                id="monthly-statement-note"
                value={monthlyStatementNote}
                onChange={(e) => setMonthlyStatementNote(e.target.value)}
                placeholder="e.g., Monthly billing statement for advance payment..."
                data-testid="input-monthly-statement-note"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleMonthlyReadyToSend} 
              disabled={!monthlyStatementNote.trim() || updateMonthlyStatementStatusMutation.isPending}
              data-testid="button-confirm-monthly-ready"
            >
              Invoice & Send Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );

  function SessionHistoryCard() {
    return (
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
              {canMarkAsInvoiced && (
                <>
                  <Select value={practitionerFilter} onValueChange={setPractitionerFilter}>
                    <SelectTrigger className="h-9 w-[160px]" data-testid="select-practitioner-filter">
                      <SelectValue placeholder="Practitioner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Practitioners</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger className="h-9 w-[140px]" data-testid="select-frequency-filter">
                      <SelectValue placeholder="Billing Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Billing</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
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
                  {canMarkAsInvoiced && (
                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Actions</th>
                  )}
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
                    {canMarkAsInvoiced && (
                      <td className="p-4 align-middle text-center">
                        {session.status === 'captured' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => handleMarkAsInvoiced(session.id)}
                                  disabled={updateStatusMutation.isPending}
                                  data-testid={`button-invoice-${session.id}`}
                                >
                                  <FileCheck className="h-3 w-3" />
                                  Invoice
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mark this session as invoiced. This will lock the session from editing.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {session.status === 'invoiced' ? 'Locked' : 'Paid'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  function WeeklyStatementsCard() {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Weekly Billing Statements</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track patient statements from invoice to archive
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {enrichedStatements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active weekly billing statements.</p>
              <p className="text-sm mt-1">Statements appear when all sessions for a patient are invoiced.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Period</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Week Range</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Note</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {enrichedStatements.map((statement) => (
                    <tr key={statement.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-statement-${statement.id}`}>
                      <td className="p-4 align-middle font-medium">{statement.patientName}</td>
                      <td className="p-4 align-middle text-muted-foreground">{statement.practitionerName}</td>
                      <td className="p-4 align-middle">
                        <Badge variant="outline">{statement.periodName}</Badge>
                      </td>
                      <td className="p-4 align-middle text-sm">
                        {statement.weekStartDate} - {statement.weekEndDate}
                      </td>
                      <td className="p-4 align-middle">
                        <Badge 
                          variant={
                            statement.status === 'awaiting_review' ? 'secondary' :
                            statement.status === 'ready_to_send' ? 'default' :
                            statement.status === 'statement_sent' ? 'outline' :
                            'secondary'
                          }
                          className={
                            statement.status === 'ready_to_send' ? 'bg-blue-100 text-blue-800' :
                            statement.status === 'statement_sent' ? 'bg-green-100 text-green-800' :
                            ''
                          }
                        >
                          {statement.status === 'awaiting_review' ? 'Awaiting Review' :
                           statement.status === 'ready_to_send' ? 'Ready to Send' :
                           statement.status === 'statement_sent' ? 'Statement Sent' :
                           'Archived'}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground max-w-[150px]">
                        {statement.statementTypeNote ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block cursor-help" data-testid={`note-${statement.id}`}>
                                  {statement.statementTypeNote}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <p className="whitespace-pre-wrap">{statement.statementTypeNote}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right font-medium">
                        R {statement.totalAmount || 0}
                      </td>
                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isAdmin && statement.status === 'awaiting_review' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => {
                                      setSelectedStatementId(statement.id);
                                      setIsReadyToSendDialogOpen(true);
                                    }}
                                    data-testid={`button-ready-${statement.id}`}
                                  >
                                    <Send className="h-3 w-3" />
                                    Ready
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark as ready to send statement (requires note)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {(isReceptionist || isAdmin) && statement.status === 'ready_to_send' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => handleMarkStatementSent(statement.id)}
                                    disabled={updateStatementStatusMutation.isPending}
                                    data-testid={`button-sent-${statement.id}`}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Sent
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark statement as sent (will be archived)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {statement.status === 'statement_sent' && (
                            <span className="text-xs text-green-600">Archived</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function MonthlyStatementsCard() {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Billing Statements</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track monthly billing from capture to archive
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {enrichedMonthlyStatements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active monthly billing statements.</p>
              <p className="text-sm mt-1">Statements appear when monthly sessions are captured.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Period</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Session Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Note</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {enrichedMonthlyStatements.map((statement) => (
                    <tr key={statement.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-monthly-statement-${statement.id}`}>
                      <td className="p-4 align-middle font-medium">{statement.patientName}</td>
                      <td className="p-4 align-middle text-muted-foreground">{statement.practitionerName}</td>
                      <td className="p-4 align-middle">
                        <Badge variant="outline">{statement.periodName}</Badge>
                      </td>
                      <td className="p-4 align-middle text-sm">{statement.sessionDate}</td>
                      <td className="p-4 align-middle">
                        <Badge 
                          variant={
                            statement.status === 'awaiting_review' ? 'secondary' :
                            statement.status === 'ready_to_send' ? 'default' :
                            statement.status === 'statement_sent' ? 'outline' :
                            'secondary'
                          }
                          className={
                            statement.status === 'ready_to_send' ? 'bg-blue-100 text-blue-800' :
                            statement.status === 'statement_sent' ? 'bg-green-100 text-green-800' :
                            ''
                          }
                        >
                          {statement.status === 'awaiting_review' ? 'Awaiting Review' :
                           statement.status === 'ready_to_send' ? 'Ready to Send' :
                           statement.status === 'statement_sent' ? 'Statement Sent' :
                           'Archived'}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground max-w-[150px]">
                        {statement.statementTypeNote ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block cursor-help" data-testid={`monthly-note-${statement.id}`}>
                                  {statement.statementTypeNote}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <p className="whitespace-pre-wrap">{statement.statementTypeNote}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right font-medium">
                        R {statement.totalAmount || 0}
                      </td>
                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isAdmin && statement.status === 'awaiting_review' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => {
                                      setSelectedMonthlyStatementId(statement.id);
                                      setIsMonthlyReadyToSendDialogOpen(true);
                                    }}
                                    data-testid={`button-monthly-ready-${statement.id}`}
                                  >
                                    <Send className="h-3 w-3" />
                                    Invoice & Send
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark as ready to invoice and send statement</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {(isReceptionist || isAdmin) && statement.status === 'ready_to_send' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => handleMarkMonthlyStatementSent(statement.id)}
                                    disabled={updateMonthlyStatementStatusMutation.isPending}
                                    data-testid={`button-monthly-sent-${statement.id}`}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Sent
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Mark statement as sent (will be archived)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {statement.status === 'statement_sent' && (
                            <span className="text-xs text-green-600">Archived</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function ArchivedStatementsCard() {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Archived Statements</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={archivedPeriodFilter} onValueChange={setArchivedPeriodFilter}>
                <SelectTrigger className="h-9 w-[150px]" data-testid="select-archived-period">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {financialPeriods.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={archivedPractitionerFilter} onValueChange={setArchivedPractitionerFilter}>
                <SelectTrigger className="h-9 w-[150px]" data-testid="select-archived-practitioner">
                  <SelectValue placeholder="Practitioner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Practitioners</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={archivedBillingTypeFilter} onValueChange={setArchivedBillingTypeFilter}>
                <SelectTrigger className="h-9 w-[130px]" data-testid="select-archived-billing-type">
                  <SelectValue placeholder="Billing Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allArchivedStatements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No archived statements found.</p>
              <p className="text-sm mt-1">Statements appear here after being marked as sent.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Period</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Note</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {allArchivedStatements.map((statement, index) => (
                    <tr key={`${statement.billingType}-${statement.id}`} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-archived-${statement.id}`}>
                      <td className="p-4 align-middle font-medium">{statement.patientName}</td>
                      <td className="p-4 align-middle text-muted-foreground">{statement.practitionerName}</td>
                      <td className="p-4 align-middle">
                        <Badge variant="outline">{statement.periodName}</Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge 
                          variant="secondary"
                          className={statement.billingType === 'weekly' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}
                        >
                          {statement.billingType === 'weekly' ? 'Weekly' : 'Monthly'}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground max-w-[200px]">
                        {statement.statementTypeNote ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block cursor-help">
                                  {statement.statementTypeNote}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <p className="whitespace-pre-wrap">{statement.statementTypeNote}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right font-medium">
                        R {statement.totalAmount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
