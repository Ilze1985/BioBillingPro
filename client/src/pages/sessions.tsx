import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateSession, useSessions, usePatients, useBillingCodesByType, useUsers, useFinancialPeriods, useUpdateSessionStatus, useUpdateSessionControlStatus, useWeeklyBillingStatements, useCreateWeeklyBillingStatement, useUpdateWeeklyBillingStatementStatus, useMonthlyBillingStatements, useUpdateMonthlyBillingStatementStatus, useArchivedWeeklyBillingStatements, useArchivedMonthlyBillingStatements, BillingType, StatementStatus, ControlStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  const { user: currentUser } = useAuth();
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
  const updateControlStatusMutation = useUpdateSessionControlStatus();
  const createStatementMutation = useCreateWeeklyBillingStatement();
  const updateStatementStatusMutation = useUpdateWeeklyBillingStatementStatus();
  const updateMonthlyStatementStatusMutation = useUpdateMonthlyBillingStatementStatus();
  const { toast } = useToast();
  
  // Get role from authenticated user
  const currentUserRole = currentUser?.role || "practitioner";
  
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
  const [weeklyPeriodFilter, setWeeklyPeriodFilter] = useState<string>("all");
  const [weeklyPractitionerFilter, setWeeklyPractitionerFilter] = useState<string>("all");
  const [monthlyPeriodFilter, setMonthlyPeriodFilter] = useState<string>("all");
  const [monthlyPractitionerFilter, setMonthlyPractitionerFilter] = useState<string>("all");
  
  // Reconciliation filters
  const [reconPeriodFilter, setReconPeriodFilter] = useState<string>("all");
  const [reconStartDate, setReconStartDate] = useState<string>("");
  const [reconEndDate, setReconEndDate] = useState<string>("");
  const [reconPracticeFilter, setReconPracticeFilter] = useState<string>("all");
  const [reconPractitionerFilter, setReconPractitionerFilter] = useState<string>("all");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");
  const [practitionerFilter, setPractitionerFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
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

    // Validate that session date falls within a financial period
    const validPeriod = financialPeriods.find(period => 
      sessionDate >= period.startDate && sessionDate <= period.endDate
    );
    if (!validPeriod) {
      toast({
        title: "Invalid Date",
        description: "The selected date does not fall within any financial period. Please select a date within a valid financial period.",
        variant: "destructive",
      });
      return;
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
        discountAmount: (selectedBillingType === 'private' || selectedBillingType === 'private_cash') ? discountAmount : 0
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
    if (!selectedMonthlyStatementId) return;
    try {
      await updateMonthlyStatementStatusMutation.mutateAsync({
        id: selectedMonthlyStatementId,
        status: 'ready_to_send' as StatementStatus,
        userRole: currentUserRole,
        statementTypeNote: monthlyStatementNote.trim() || undefined
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

  // Get enriched statement data with filters
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
  }).filter(statement => {
    const matchesPeriod = weeklyPeriodFilter === "all" || 
      statement.financialPeriodId?.toString() === weeklyPeriodFilter;
    const matchesPractitioner = weeklyPractitionerFilter === "all" || 
      statement.practitionerId?.toString() === weeklyPractitionerFilter;
    return matchesPeriod && matchesPractitioner;
  });

  // Get enriched monthly statement data with filters
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
  }).filter(statement => {
    const matchesPeriod = monthlyPeriodFilter === "all" || 
      statement.financialPeriodId?.toString() === monthlyPeriodFilter;
    const matchesPractitioner = monthlyPractitionerFilter === "all" || 
      statement.practitionerId?.toString() === monthlyPractitionerFilter;
    return matchesPeriod && matchesPractitioner;
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
            <Badge variant="secondary" className="capitalize" data-testid="badge-user-role">
              {currentUserRole}
            </Badge>
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
                    {users.filter(u => u.role === 'practitioner' || u.role === 'admin').map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="patient">Patient</Label>
                <Select value={selectedPatientId} onValueChange={(value) => { setSelectedPatientId(value); setPatientSearchTerm(""); }}>
                  <SelectTrigger id="patient" data-testid="select-patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2" onPointerDown={(e) => e.stopPropagation()}>
                      <Input
                        placeholder="Search patients..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
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
                            setCodeSearchTerm("");
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
                    <div className="flex justify-between items-center p-2 bg-muted rounded-md gap-2">
                      <span className="text-sm font-medium truncate flex-1">
                        {selectedCodes.map(c => c?.code).join(', ')}
                      </span>
                      <div className="text-right shrink-0">
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
                      const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
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
            <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">Reconciliation</TabsTrigger>
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
          <TabsContent value="reconciliation" className="mt-4">
            <ReconciliationCard />
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
              disabled={updateMonthlyStatementStatusMutation.isPending}
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
                      {users.filter(u => u.role === 'practitioner' || u.role === 'admin').map(u => (
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
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Date</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Practice</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Type</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Code</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Practitioner</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Period</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground text-destructive">Discount</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-green-600">Cash Disc.</th>
                  <th className="h-10 px-3 text-right align-middle text-xs font-medium text-muted-foreground">Total</th>
                  {canMarkAsInvoiced && (
                    <th className="h-10 px-3 text-center align-middle text-xs font-medium text-muted-foreground">Control</th>
                  )}
                  {canMarkAsInvoiced && (
                    <th className="h-10 px-3 text-center align-middle text-xs font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-session-${session.id}`}>
                    <td className="p-3 align-middle">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{session.date}</span>
                        <span className="text-[10px] text-muted-foreground">{session.time}</span>
                      </div>
                    </td>
                    <td className="p-3 align-middle text-xs font-medium">{session.patientName}</td>
                    <td className="p-3 align-middle text-xs text-muted-foreground">{session.practiceName || '-'}</td>
                    <td className="p-3 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        session.billingType === 'private' 
                          ? 'bg-purple-100 text-purple-800' 
                          : session.billingType === 'private_cash'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {session.billingType === 'private' ? 'Private' : session.billingType === 'private_cash' ? 'Cash' : 'Med Aid'}
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex flex-wrap gap-1">
                        {session.billingCodes.map((code, idx) => (
                          <span key={idx} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-secondary text-secondary-foreground">
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 align-middle text-xs text-muted-foreground">{session.practitionerName}</td>
                    <td className="p-3 align-middle">
                      {session.financialPeriod ? (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-orange-100 text-orange-800">
                          {session.financialPeriod}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 align-middle">
                      <span className={`text-xs ${
                        session.status === 'paid' ? "text-green-600 font-medium" :
                        session.status === 'invoiced' ? "text-blue-600 font-medium" :
                        "text-amber-600 font-medium"
                      }`}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 align-middle text-left text-xs font-medium">
                      R {session.totalPrice?.toFixed(2) || "0.00"}
                    </td>
                    <td className="p-3 align-middle text-left text-xs font-medium text-destructive">
                      {session.discountAmount && session.discountAmount > 0 ? (
                        <span>- R {session.discountAmount.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 align-middle text-left text-xs font-medium text-green-600">
                      {session.billingType === 'private_cash' && session.totalPrice ? (() => {
                        const roundedCashPrice = Math.round(session.totalPrice * 0.9 / 10) * 10;
                        const cashDiscount = session.totalPrice - roundedCashPrice;
                        return <span>- R {cashDiscount.toFixed(2)}</span>;
                      })() : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 align-middle text-right text-xs font-bold text-primary">
                      R {session.finalPrice?.toFixed(2) || "0.00"}
                    </td>
                    {canMarkAsInvoiced && (
                      <td className="p-3 align-middle text-center">
                        {session.billingFrequency === 'monthly' ? (
                          isAdmin ? (
                            <Select
                              value={session.controlStatus || 'awaiting_review'}
                              onValueChange={(value: ControlStatus) => {
                                updateControlStatusMutation.mutate({
                                  id: session.id,
                                  controlStatus: value,
                                  userRole: currentUserRole
                                }, {
                                  onSuccess: () => {
                                    toast({
                                      title: "Control Updated",
                                      description: `Session control status updated to ${value === 'invoice_and_send' ? 'Invoice and send' : 'Awaiting review'}.`,
                                    });
                                  },
                                  onError: (error: Error) => {
                                    toast({
                                      title: "Error",
                                      description: error.message,
                                      variant: "destructive",
                                    });
                                  }
                                });
                              }}
                              disabled={updateControlStatusMutation.isPending}
                            >
                              <SelectTrigger className="h-7 w-[120px] text-[10px]" data-testid={`select-control-${session.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="awaiting_review" className="text-xs">Awaiting review</SelectItem>
                                <SelectItem value="invoice_and_send" className="text-xs">Invoice and send</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-[10px] font-medium ${session.controlStatus === 'invoice_and_send' ? 'text-green-600' : 'text-amber-600'}`}>
                              {session.controlStatus === 'invoice_and_send' ? 'Invoice and send' : 'Awaiting review'}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                    {canMarkAsInvoiced && (
                      <td className="p-3 align-middle text-center">
                        {session.status === 'captured' ? (
                          (() => {
                            const isMonthlyAwaitingReview = session.billingFrequency === 'monthly' && session.controlStatus !== 'invoice_and_send';
                            const buttonDisabled = updateStatusMutation.isPending || (isReceptionist && isMonthlyAwaitingReview);
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 h-7 text-xs px-2"
                                      onClick={() => handleMarkAsInvoiced(session.id)}
                                      disabled={buttonDisabled}
                                      data-testid={`button-invoice-${session.id}`}
                                    >
                                      <FileCheck className="h-3 w-3" />
                                      Invoice
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isReceptionist && isMonthlyAwaitingReview 
                                      ? 'Admin must set control to "Invoice and send" first' 
                                      : 'Mark this session as invoiced. This will lock the session from editing.'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
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
            <div className="flex items-center gap-2">
              <Select value={weeklyPeriodFilter} onValueChange={setWeeklyPeriodFilter}>
                <SelectTrigger className="h-9 w-[150px]" data-testid="select-weekly-period">
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
              <Select value={weeklyPractitionerFilter} onValueChange={setWeeklyPractitionerFilter}>
                <SelectTrigger className="h-9 w-[150px]" data-testid="select-weekly-practitioner">
                  <SelectValue placeholder="Practitioner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Practitioners</SelectItem>
                  {users.filter(u => u.role === 'practitioner' || u.role === 'admin').map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                            <span className="text-xs text-green-600">
                              Sent {statement.sentDate ? `(${statement.sentDate})` : ''}
                            </span>
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
            <div className="flex items-center gap-2">
              <Select value={monthlyPeriodFilter} onValueChange={setMonthlyPeriodFilter}>
                <SelectTrigger className="h-9 w-[150px]" data-testid="select-monthly-period">
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
              <Select value={monthlyPractitionerFilter} onValueChange={setMonthlyPractitionerFilter}>
                <SelectTrigger className="h-9 w-[150px]" data-testid="select-monthly-practitioner">
                  <SelectValue placeholder="Practitioner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Practitioners</SelectItem>
                  {users.filter(u => u.role === 'practitioner' || u.role === 'admin').map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                            <span className="text-xs text-green-600">
                              Sent {statement.sentDate ? `(${statement.sentDate})` : ''}
                            </span>
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
                  {users.filter(u => u.role === 'practitioner' || u.role === 'admin').map(u => (
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

  function ReconciliationCard() {
    // Get unique practice names from sessions dynamically
    const uniquePractices = Array.from(new Set(sessions.map(s => s.practiceName).filter(Boolean))) as string[];
    
    // Get selected period for date validation
    const selectedPeriod = reconPeriodFilter !== "all" 
      ? financialPeriods.find(p => p.id.toString() === reconPeriodFilter) 
      : null;
    
    // Filter sessions based on reconciliation criteria
    const filteredSessions = sessions.filter(session => {
      // Period filter
      if (reconPeriodFilter !== "all" && session.financialPeriodId?.toString() !== reconPeriodFilter) {
        return false;
      }
      
      // Date range filter
      if (reconStartDate && session.date < reconStartDate) return false;
      if (reconEndDate && session.date > reconEndDate) return false;
      
      // Practice filter
      if (reconPracticeFilter !== "all" && session.practiceName !== reconPracticeFilter) return false;
      
      // Practitioner filter
      if (reconPractitionerFilter !== "all" && session.practitionerId?.toString() !== reconPractitionerFilter) return false;
      
      return true;
    });

    // Calculate totals with safe number handling
    const safeAmount = (val: number | null | undefined): number => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    
    const medicalAidTotal = filteredSessions
      .filter(s => s.billingType === 'medical_aid')
      .reduce((sum, s) => sum + safeAmount(s.finalPrice), 0);
    
    const privateTotal = filteredSessions
      .filter(s => s.billingType === 'private')
      .reduce((sum, s) => sum + safeAmount(s.finalPrice), 0);
    
    const privateCashTotal = filteredSessions
      .filter(s => s.billingType === 'private_cash')
      .reduce((sum, s) => sum + safeAmount(s.finalPrice), 0);
    
    const grandTotal = medicalAidTotal + privateTotal + privateCashTotal;

    // Auto-set date range when period changes
    const handlePeriodChange = (value: string) => {
      setReconPeriodFilter(value);
      if (value !== "all") {
        const period = financialPeriods.find(p => p.id.toString() === value);
        if (period) {
          setReconStartDate(period.startDate);
          setReconEndDate(period.endDate);
        }
      } else {
        setReconStartDate("");
        setReconEndDate("");
      }
    };
    
    // Validate and clamp date within selected period
    const handleStartDateChange = (value: string) => {
      if (selectedPeriod) {
        // Clamp to period bounds
        if (value < selectedPeriod.startDate) value = selectedPeriod.startDate;
        if (value > selectedPeriod.endDate) value = selectedPeriod.endDate;
        if (reconEndDate && value > reconEndDate) value = reconEndDate;
      }
      setReconStartDate(value);
    };
    
    const handleEndDateChange = (value: string) => {
      if (selectedPeriod) {
        // Clamp to period bounds
        if (value < selectedPeriod.startDate) value = selectedPeriod.startDate;
        if (value > selectedPeriod.endDate) value = selectedPeriod.endDate;
        if (reconStartDate && value < reconStartDate) value = reconStartDate;
      }
      setReconEndDate(value);
    };

    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Reconciliation</CardTitle>
          <p className="text-sm text-muted-foreground">Filter and calculate session totals for reconciliation.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Financial Period</Label>
              <Select value={reconPeriodFilter} onValueChange={handlePeriodChange}>
                <SelectTrigger data-testid="select-recon-period">
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {financialPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id.toString()}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={reconStartDate} 
                onChange={(e) => handleStartDateChange(e.target.value)}
                min={selectedPeriod?.startDate}
                max={selectedPeriod?.endDate}
                data-testid="input-recon-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={reconEndDate} 
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={selectedPeriod?.startDate}
                max={selectedPeriod?.endDate}
                data-testid="input-recon-end-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Practice Name</Label>
              <Select value={reconPracticeFilter} onValueChange={setReconPracticeFilter}>
                <SelectTrigger data-testid="select-recon-practice">
                  <SelectValue placeholder="All Practices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Practices</SelectItem>
                  {uniquePractices.map((practice) => (
                    <SelectItem key={practice} value={practice}>
                      {practice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Practitioner</Label>
              <Select value={reconPractitionerFilter} onValueChange={setReconPractitionerFilter}>
                <SelectTrigger data-testid="select-recon-practitioner">
                  <SelectValue placeholder="All Practitioners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Practitioners</SelectItem>
                  {users.filter(u => u.role === 'practitioner' || u.role === 'admin').map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-600 font-medium">Medical Aid</p>
                <p className="text-2xl font-bold text-blue-800">R {medicalAidTotal.toFixed(2)}</p>
                <p className="text-xs text-blue-500">{filteredSessions.filter(s => s.billingType === 'medical_aid').length} sessions</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <p className="text-sm text-purple-600 font-medium">Private</p>
                <p className="text-2xl font-bold text-purple-800">R {privateTotal.toFixed(2)}</p>
                <p className="text-xs text-purple-500">{filteredSessions.filter(s => s.billingType === 'private').length} sessions</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <p className="text-sm text-green-600 font-medium">Private Cash</p>
                <p className="text-2xl font-bold text-green-800">R {privateCashTotal.toFixed(2)}</p>
                <p className="text-xs text-green-500">{filteredSessions.filter(s => s.billingType === 'private_cash').length} sessions</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 border-gray-300">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 font-medium">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900">R {grandTotal.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{filteredSessions.length} sessions</p>
              </CardContent>
            </Card>
          </div>

          {/* Sessions Table */}
          <div className="rounded-md border mt-4">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Date</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Practice</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Practitioner</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Type</th>
                  <th className="h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-3 text-right align-middle text-xs font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No sessions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => (
                    <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-recon-${session.id}`}>
                      <td className="p-3 align-middle">{session.date}</td>
                      <td className="p-3 align-middle font-medium">{session.patientName}</td>
                      <td className="p-3 align-middle">{session.practiceName || '-'}</td>
                      <td className="p-3 align-middle">{session.practitionerName}</td>
                      <td className="p-3 align-middle">
                        <Badge 
                          variant="secondary"
                          className={
                            session.billingType === 'medical_aid' ? 'bg-blue-100 text-blue-800' :
                            session.billingType === 'private' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }
                        >
                          {session.billingType === 'medical_aid' ? 'Medical Aid' :
                           session.billingType === 'private' ? 'Private' : 'Private Cash'}
                        </Badge>
                      </td>
                      <td className="p-3 align-middle capitalize">{session.status}</td>
                      <td className="p-3 align-middle text-right font-medium">R {session.finalPrice?.toFixed(2) || "0.00"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }
}
