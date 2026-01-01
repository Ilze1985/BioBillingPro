import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSessions, useFinancialPeriods, usePatients, useMonthlyRollover, useUndoMonthlyRollover, useUpdatePatient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, TrendingUp, Copy, EyeOff, Eye, Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function getWeekNumber(sessionDate: string, periodStart: string): number {
  const session = new Date(sessionDate);
  const start = new Date(periodStart);
  const diffTime = session.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffDays / 7);
  return Math.max(weekIndex, 0) + 1;
}

function getWeekCount(periodStart: string, periodEnd: string): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil((diffDays + 1) / 7);
}

function getWeekDates(periodStart: string, weekNumber: number): { monday: Date; friday: Date } {
  const start = new Date(periodStart);
  // Find the Monday of the given week (week 1 starts at period start)
  const monday = new Date(start);
  monday.setDate(start.getDate() + (weekNumber - 1) * 7);
  // Adjust to Monday if period doesn't start on Monday
  const dayOfWeek = monday.getDay();
  if (dayOfWeek !== 1) {
    const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  }
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { monday, friday };
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString()}`;
}

export default function BillingPage() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: financialPeriods = [], isLoading: periodsLoading } = useFinancialPeriods();
  const { data: patients = [] } = usePatients();
  const monthlyRolloverMutation = useMonthlyRollover();
  const undoRolloverMutation = useUndoMonthlyRollover();
  const updatePatientMutation = useUpdatePatient();
  const { toast } = useToast();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [showInactive, setShowInactive] = useState<boolean>(false);

  const selectedPeriod = financialPeriods.find(p => p.id.toString() === selectedPeriodId);
  
  // Build a map of patient IDs to their active status
  const patientActiveMap = useMemo(() => {
    const map = new Map<number, boolean>();
    patients.forEach(p => map.set(p.id, p.monthlyBillingActive !== 'no'));
    return map;
  }, [patients]);

  const periodSessions = useMemo(() => {
    if (!selectedPeriod) return [];
    return sessions.filter(s => 
      s.date >= selectedPeriod.startDate && s.date <= selectedPeriod.endDate
    );
  }, [sessions, selectedPeriod]);

  const weeklySessions = useMemo(() => {
    return periodSessions.filter(session => session.billingFrequency === 'weekly');
  }, [periodSessions]);

  const monthlySessions = useMemo(() => {
    return periodSessions.filter(session => session.billingFrequency === 'monthly');
  }, [periodSessions]);

  const weeklyData = useMemo(() => {
    if (!selectedPeriod) {
      return Array.from({ length: 4 }, (_, i) => ({
        week: i + 1,
        sessions: [] as typeof sessions,
        total: 0,
        count: 0,
      }));
    }

    const weekCount = getWeekCount(selectedPeriod.startDate, selectedPeriod.endDate);
    const weeks = Array.from({ length: weekCount }, (_, i) => ({
      week: i + 1,
      sessions: [] as typeof sessions,
      total: 0,
      count: 0,
    }));

    weeklySessions.forEach(session => {
      const weekNum = getWeekNumber(session.date, selectedPeriod.startDate);
      const weekIndex = weekNum - 1;
      if (weekIndex >= 0 && weekIndex < weeks.length) {
        weeks[weekIndex].sessions.push(session);
        weeks[weekIndex].total += session.finalPrice;
        weeks[weekIndex].count += 1;
      }
    });

    return weeks;
  }, [weeklySessions, selectedPeriod]);

  // Filter monthly sessions based on active/inactive toggle
  const filteredMonthlySessions = useMemo(() => {
    if (showInactive) return monthlySessions;
    return monthlySessions.filter(session => patientActiveMap.get(session.patientId) !== false);
  }, [monthlySessions, showInactive, patientActiveMap]);

  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { 
      month: string; 
      label: string; 
      sessions: typeof filteredMonthlySessions; 
      total: number; 
      originalTotal: number;
      count: number; 
    }>();

    filteredMonthlySessions.forEach(session => {
      const date = new Date(session.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { 
          month: monthKey, 
          label: monthLabel, 
          sessions: [], 
          total: 0,
          originalTotal: 0,
          count: 0 
        });
      }
      const monthData = monthMap.get(monthKey)!;
      monthData.sessions.push(session);
      monthData.total += session.finalPrice;
      monthData.originalTotal += session.totalPrice;
      monthData.count += 1;
    });

    const months = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    const totalRevenue = filteredMonthlySessions.reduce((sum, s) => sum + s.finalPrice, 0);
    const totalOriginal = filteredMonthlySessions.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalDiscount = totalOriginal - totalRevenue;
    
    // Count unique patients
    const uniquePatientIds = new Set(filteredMonthlySessions.map(s => s.patientId));
    const patientCount = uniquePatientIds.size;
    
    // Sort sessions by patient surname alphabetically
    const sortedSessions = [...filteredMonthlySessions].sort((a, b) => {
      const patientA = patients.find(p => p.id === a.patientId);
      const patientB = patients.find(p => p.id === b.patientId);
      const surnameA = patientA?.surname || '';
      const surnameB = patientB?.surname || '';
      return surnameA.localeCompare(surnameB);
    });

    return {
      months,
      sessions: filteredMonthlySessions,
      sortedSessions,
      totalRevenue,
      totalOriginal,
      totalDiscount,
      count: filteredMonthlySessions.length,
      patientCount,
    };
  }, [filteredMonthlySessions, patientActiveMap, patients]);

  // Get the latest month from existing monthly sessions to use as source for rollover
  const latestMonth = useMemo(() => {
    if (monthlyData.months.length === 0) return null;
    return monthlyData.months[monthlyData.months.length - 1].month;
  }, [monthlyData.months]);

  // Calculate next month for rollover target
  const getNextMonth = (month: string): string => {
    const [year, monthNum] = month.split('-').map(Number);
    const nextDate = new Date(year, monthNum, 1); // monthNum is 0-indexed, so adding 1 month
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleMonthlyRollover = async () => {
    if (!latestMonth) {
      toast({
        title: "No Source Data",
        description: "No monthly sessions found to copy from.",
        variant: "destructive",
      });
      return;
    }
    
    const targetMonth = getNextMonth(latestMonth);
    
    try {
      const result = await monthlyRolloverMutation.mutateAsync({
        sourceMonth: latestMonth,
        targetMonth: targetMonth,
      });
      
      toast({
        title: "Monthly Rollover Complete",
        description: `Created ${result.created} sessions for ${targetMonth}.${result.deleted > 0 ? ` Replaced ${result.deleted} existing.` : ''}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to perform monthly rollover.",
        variant: "destructive",
      });
    }
  };

  const handleUndoRollover = async () => {
    if (!latestMonth) {
      toast({
        title: "No Data to Undo",
        description: "No monthly sessions found.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const result = await undoRolloverMutation.mutateAsync(latestMonth);
      
      toast({
        title: "Undo Complete",
        description: `Deleted ${result.deleted} sessions from ${latestMonth}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to undo monthly rollover.",
        variant: "destructive",
      });
    }
  };

  // Count inactive patients in current view
  const inactiveCount = useMemo(() => {
    const uniquePatientIds = new Set(monthlySessions.map(s => s.patientId));
    let inactive = 0;
    uniquePatientIds.forEach(id => {
      if (patientActiveMap.get(id) === false) inactive++;
    });
    return inactive;
  }, [monthlySessions, patientActiveMap]);

  const weeklyTotal = weeklyData.reduce((sum, w) => sum + w.total, 0);

  if (sessionsLoading || periodsLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-billing">Billing</h1>
          <p className="text-muted-foreground">View weekly and monthly billing summaries.</p>
        </div>
        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-[220px]" data-testid="select-billing-period">
            <SelectValue placeholder="Select Financial Period" />
          </SelectTrigger>
          <SelectContent>
            {financialPeriods.length === 0 ? (
              <SelectItem value="none" disabled data-testid="select-period-none">No periods available</SelectItem>
            ) : (
              financialPeriods.map(p => (
                <SelectItem key={p.id} value={p.id.toString()} data-testid={`select-period-${p.id}`}>{p.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {!selectedPeriod ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Select a Financial Period</p>
            <p className="text-sm text-muted-foreground">Choose a period above to view billing details.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="weekly" className="mt-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly Billing</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {weeklyData.map((week) => {
                const dates = getWeekDates(selectedPeriod.startDate, week.week);
                return (
                  <Card key={week.week} className="shadow-sm" data-testid={`card-week-${week.week}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-medium">Week {week.week}</CardTitle>
                        <p className="text-xs text-muted-foreground">{formatShortDate(dates.monday)} - {formatShortDate(dates.friday)}</p>
                      </div>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(week.total)}</div>
                      <p className="text-xs text-muted-foreground">{week.count} session{week.count !== 1 ? 's' : ''}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Weekly Total</CardTitle>
                  <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <TrendingUp className="h-5 w-5" />
                    {formatCurrency(weeklyTotal)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Week</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Dates</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Sessions</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {weeklyData.map((week) => {
                        const dates = getWeekDates(selectedPeriod.startDate, week.week);
                        return (
                          <tr key={week.week} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-week-${week.week}`}>
                            <td className="p-4 align-middle font-medium">Week {week.week}</td>
                            <td className="p-4 align-middle text-muted-foreground">{formatShortDate(dates.monday)} - {formatShortDate(dates.friday)}</td>
                            <td className="p-4 align-middle text-muted-foreground">{week.count}</td>
                            <td className="p-4 align-middle text-right font-medium">{formatCurrency(week.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-background">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Week</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Codes</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {weeklySessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground">No weekly billing sessions in this period</td>
                        </tr>
                      ) : (
                        weeklySessions.map((session) => (
                          <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-session-${session.id}`}>
                            <td className="p-4 align-middle">
                              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                                Week {getWeekNumber(session.date, selectedPeriod.startDate)}
                              </span>
                            </td>
                            <td className="p-4 align-middle">{new Date(session.date).toLocaleDateString()}</td>
                            <td className="p-4 align-middle font-medium">{session.patientName}</td>
                            <td className="p-4 align-middle">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                session.billingType === 'medical_aid' ? 'bg-green-100 text-green-800' :
                                session.billingType === 'private' ? 'bg-purple-100 text-purple-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {session.billingType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 align-middle text-muted-foreground">{session.billingCodes.join(', ')}</td>
                            <td className="p-4 align-middle text-right font-medium">{formatCurrency(session.finalPrice)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                    data-testid="switch-show-inactive"
                  />
                  <Label htmlFor="show-inactive" className="flex items-center gap-2 cursor-pointer">
                    {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {showInactive ? 'Showing all patients' : 'Hiding inactive patients'}
                    {inactiveCount > 0 && !showInactive && (
                      <span className="text-xs text-muted-foreground">({inactiveCount} hidden)</span>
                    )}
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!latestMonth || undoRolloverMutation.isPending}
                      className="gap-2"
                      data-testid="button-undo-rollover"
                    >
                      <Undo2 className="h-4 w-4" />
                      {undoRolloverMutation.isPending ? 'Deleting...' : 'Undo Last Month'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Undo Monthly Billing?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all monthly billing sessions for {latestMonth}. 
                        This action cannot be undone. Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUndoRollover} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Delete Sessions
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  onClick={handleMonthlyRollover}
                  disabled={!latestMonth || monthlyRolloverMutation.isPending}
                  className="gap-2"
                  data-testid="button-monthly-rollover"
                >
                  <Copy className="h-4 w-4" />
                  {monthlyRolloverMutation.isPending ? 'Creating...' : 'Generate Next Month'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-sm" data-testid="card-monthly-revenue">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(monthlyData.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Monthly billing codes</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm" data-testid="card-monthly-patients">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Patients</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthlyData.patientCount}</div>
                  <p className="text-xs text-muted-foreground">Patients billed this period</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm" data-testid="card-monthly-discount">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{formatCurrency(monthlyData.totalDiscount)}</div>
                  <p className="text-xs text-muted-foreground">Cash + additional discounts</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Revenue by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Month</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Sessions</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Original</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Discounts</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {monthlyData.months.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">No monthly billing sessions in this period</td>
                        </tr>
                      ) : (
                        monthlyData.months.map((month) => (
                          <tr key={month.month} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-month-${month.month}`}>
                            <td className="p-4 align-middle font-medium">{month.label}</td>
                            <td className="p-4 align-middle text-muted-foreground">{month.count}</td>
                            <td className="p-4 align-middle text-right text-muted-foreground">{formatCurrency(month.originalTotal)}</td>
                            <td className="p-4 align-middle text-right text-amber-600">{formatCurrency(month.originalTotal - month.total)}</td>
                            <td className="p-4 align-middle text-right font-medium">{formatCurrency(month.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-background">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Active</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Month</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practice</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Codes</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Original</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Final</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {monthlyData.sortedSessions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-muted-foreground">No monthly billing sessions in this period</td>
                        </tr>
                      ) : (
                        monthlyData.sortedSessions.map((session) => {
                          const sessionDate = new Date(session.date);
                          const monthLabel = sessionDate.toLocaleDateString('en-US', { month: 'short' });
                          const patient = patients.find(p => p.id === session.patientId);
                          const isActive = patient?.monthlyBillingActive !== 'no';
                          return (
                            <tr key={session.id} className={`border-b transition-colors hover:bg-muted/50 ${!isActive ? 'opacity-50' : ''}`} data-testid={`row-monthly-session-${session.id}`}>
                              <td className="p-4 align-middle text-center">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={(e) => {
                                    if (patient) {
                                      updatePatientMutation.mutate({
                                        id: patient.id,
                                        data: { monthlyBillingActive: e.target.checked ? 'yes' : 'no' }
                                      }, {
                                        onSuccess: () => {
                                          toast({
                                            title: e.target.checked ? "Patient Activated" : "Patient Deactivated",
                                            description: `${patient.firstName} ${patient.surname} is now ${e.target.checked ? 'active' : 'inactive'}. ${!e.target.checked ? 'No further billing allowed until reactivated.' : ''}`,
                                          });
                                        }
                                      });
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                  data-testid={`checkbox-billing-active-${session.id}`}
                                />
                              </td>
                              <td className="p-4 align-middle">
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800">
                                  {monthLabel}
                                </span>
                              </td>
                              <td className="p-4 align-middle">{sessionDate.toLocaleDateString()}</td>
                              <td className="p-4 align-middle font-medium">{session.patientName}</td>
                              <td className="p-4 align-middle text-muted-foreground">{patient?.practiceName || 'N/A'}</td>
                              <td className="p-4 align-middle">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                  session.billingType === 'private' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {session.billingType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-4 align-middle text-muted-foreground">{session.billingCodes.join(', ')}</td>
                              <td className="p-4 align-middle text-right text-muted-foreground">{formatCurrency(session.totalPrice)}</td>
                              <td className="p-4 align-middle text-right font-medium">{formatCurrency(session.finalPrice)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
