import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessions, useFinancialPeriods } from "@/lib/api";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";

function getWeekNumber(sessionDate: string, periodStart: string): number {
  const session = new Date(sessionDate);
  const start = new Date(periodStart);
  const diffTime = session.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffDays / 7);
  return Math.min(Math.max(weekIndex, 0), 3) + 1;
}

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString()}`;
}

export default function BillingPage() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: financialPeriods = [], isLoading: periodsLoading } = useFinancialPeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

  const selectedPeriod = financialPeriods.find(p => p.id.toString() === selectedPeriodId);

  const periodSessions = useMemo(() => {
    if (!selectedPeriod) return [];
    return sessions.filter(s => 
      s.date >= selectedPeriod.startDate && s.date <= selectedPeriod.endDate
    );
  }, [sessions, selectedPeriod]);

  const weeklyData = useMemo(() => {
    if (!selectedPeriod) return [
      { week: 1, sessions: [], total: 0, count: 0 },
      { week: 2, sessions: [], total: 0, count: 0 },
      { week: 3, sessions: [], total: 0, count: 0 },
      { week: 4, sessions: [], total: 0, count: 0 },
    ];

    const weeks = [
      { week: 1, sessions: [] as typeof sessions, total: 0, count: 0 },
      { week: 2, sessions: [] as typeof sessions, total: 0, count: 0 },
      { week: 3, sessions: [] as typeof sessions, total: 0, count: 0 },
      { week: 4, sessions: [] as typeof sessions, total: 0, count: 0 },
    ];

    periodSessions.forEach(session => {
      const weekNum = getWeekNumber(session.date, selectedPeriod.startDate);
      const weekIndex = weekNum - 1;
      weeks[weekIndex].sessions.push(session);
      weeks[weekIndex].total += session.finalPrice;
      weeks[weekIndex].count += 1;
    });

    return weeks;
  }, [periodSessions, selectedPeriod]);

  const monthlyData = useMemo(() => {
    const privateSessions = periodSessions.filter(s => 
      s.billingType === 'private' || s.billingType === 'private_cash'
    );

    const totalRevenue = privateSessions.reduce((sum, s) => sum + s.finalPrice, 0);
    const totalOriginal = privateSessions.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalDiscount = totalOriginal - totalRevenue;

    return {
      sessions: privateSessions,
      totalRevenue,
      totalOriginal,
      totalDiscount,
      count: privateSessions.length,
    };
  }, [periodSessions]);

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
              {weeklyData.map((week) => (
                <Card key={week.week} className="shadow-sm" data-testid={`card-week-${week.week}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Week {week.week}</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(week.total)}</div>
                    <p className="text-xs text-muted-foreground">{week.count} session{week.count !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              ))}
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
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Sessions</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {weeklyData.map((week) => (
                        <tr key={week.week} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-week-${week.week}`}>
                          <td className="p-4 align-middle font-medium">Week {week.week}</td>
                          <td className="p-4 align-middle text-muted-foreground">{week.count}</td>
                          <td className="p-4 align-middle text-right font-medium">{formatCurrency(week.total)}</td>
                        </tr>
                      ))}
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
                      {periodSessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground">No sessions in this period</td>
                        </tr>
                      ) : (
                        periodSessions.map((session) => (
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-sm" data-testid="card-monthly-revenue">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(monthlyData.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Private billing only</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm" data-testid="card-monthly-sessions">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthlyData.count}</div>
                  <p className="text-xs text-muted-foreground">Private & private cash</p>
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
              <CardHeader>
                <CardTitle>Private Billing Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-background">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Codes</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Original</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Final</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {monthlyData.sessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground">No private billing sessions in this period</td>
                        </tr>
                      ) : (
                        monthlyData.sessions.map((session) => (
                          <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-monthly-session-${session.id}`}>
                            <td className="p-4 align-middle">{new Date(session.date).toLocaleDateString()}</td>
                            <td className="p-4 align-middle font-medium">{session.patientName}</td>
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
                        ))
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
