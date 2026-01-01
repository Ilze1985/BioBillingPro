import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSessions, usePatients, useUsers } from "@/lib/api";
import { format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { CalendarDays, DollarSign, Users, Activity } from "lucide-react";

export default function Dashboard() {
  const { data: sessions = [], isLoading: loadingSessions } = useSessions();
  const { data: patients = [] } = usePatients();
  const { data: users = [] } = useUsers();
  
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Calculate stats
  const todaysSessions = sessions.filter(s => isSameDay(parseISO(s.date), today));
  const weeklySessions = sessions.filter(s => 
    isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd })
  );
  
  const totalDailyRevenue = todaysSessions.reduce((acc, s) => acc + s.finalPrice, 0);
  const totalWeeklyRevenue = weeklySessions.reduce((acc, s) => acc + s.finalPrice, 0);

  // Monthly revenue calculation
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthSessions = sessions.filter(s => 
    isWithinInterval(parseISO(s.date), { start: monthStart, end: monthEnd })
  );
  const totalMonthlyRevenue = monthSessions.reduce((acc, s) => acc + s.finalPrice, 0);

  // Prepare chart data (Monthly view with weekly totals)
  const chartData = Array.from({ length: 5 }).map((_, i) => {
    const weekNum = i + 1;
    const weekStartDate = new Date(monthStart);
    weekStartDate.setDate(monthStart.getDate() + i * 7);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    
    const weekRevenue = monthSessions
      .filter(s => {
        const sessionDate = parseISO(s.date);
        return isWithinInterval(sessionDate, { 
          start: weekStartDate, 
          end: weekEndDate > monthEnd ? monthEnd : weekEndDate 
        });
      })
      .reduce((acc, s) => acc + s.finalPrice, 0);
    
    return {
      name: `Week ${weekNum}`,
      total: weekRevenue
    };
  });

  // Population group breakdown
  const populationGroups = patients.reduce((acc, patient) => {
    const group = patient.populationGroup || 'Not specified';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const populationChartData = Object.entries(populationGroups).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  if (loadingSessions) {
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-dashboard">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to your practice overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-daily-revenue">R {totalDailyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {todaysSessions.length} sessions today
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Revenue</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-weekly-revenue">R {totalWeeklyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {weeklySessions.length} sessions this week
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Total</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-monthly-revenue">R {totalMonthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {monthSessions.length} sessions in {format(today, 'MMMM')}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Patients</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-patient-count">{patients.length}</div>
            <p className="text-xs text-muted-foreground">
              Total registered
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">
              {sessions.filter(s => s.status === 'captured').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions needing invoicing
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Weekly revenue for {format(today, 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`R ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Patient Population Groups</CardTitle>
            <CardDescription>Distribution by condition type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {populationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={populationChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                      labelLine={false}
                    >
                      {populationChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No population group data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Latest captured sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center p-3 border rounded-lg" data-testid={`session-recent-${session.id}`}>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{session.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.billingCodes.join(', ')} • {format(parseISO(session.date), 'MMM dd')}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-sm text-green-600">
                    +R{session.finalPrice.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
