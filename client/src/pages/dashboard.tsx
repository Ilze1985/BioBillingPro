import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSessions, usePatients, useUsers } from "@/lib/api";
import { format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
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
  
  const totalDailyRevenue = todaysSessions.reduce((acc, s) => acc + s.price, 0);
  const totalWeeklyRevenue = weeklySessions.reduce((acc, s) => acc + s.price, 0);

  // Prepare chart data (Last 7 days)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayRevenue = sessions
      .filter(s => s.date === dateStr)
      .reduce((acc, s) => acc + s.price, 0);
    
    return {
      name: format(d, 'EEE'),
      total: dayRevenue
    };
  });

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardDescription>Daily revenue for the past 7 days</CardDescription>
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
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Latest captured sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center" data-testid={`session-recent-${session.id}`}>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{session.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.billingCode} • {format(parseISO(session.date), 'MMM dd')}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-sm">
                    +R{session.price}
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
