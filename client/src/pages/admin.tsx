import { AppLayout } from "@/components/layout/AppLayout";
import { useSessions, useUsers, useBillingCodes } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function AdminPage() {
  const { data: sessions = [], isLoading: loadingSessions } = useSessions();
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: billingCodes = [], isLoading: loadingCodes } = useBillingCodes();

  const isLoading = loadingSessions || loadingUsers || loadingCodes;

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-admin">Admin View</h1>
          <p className="text-muted-foreground">Master view of all practice data.</p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-export">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Tabs defaultValue="all-sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-sessions" data-testid="tab-sessions">All Sessions</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">Staff</TabsTrigger>
          <TabsTrigger value="codes" data-testid="tab-codes">Billing Codes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-sessions" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Master Session List</CardTitle>
              <CardDescription>
                Complete history of all sessions across all practitioners.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Patient</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-admin-session-${session.id}`}>
                        <td className="p-4 align-middle font-mono text-xs">{session.id}</td>
                        <td className="p-4 align-middle">{session.date}</td>
                        <td className="p-4 align-middle font-medium">{session.patientName}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            session.billingType === 'private' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {session.billingType === 'private' ? 'Private' : 'Medical Aid'}
                          </span>
                        </td>
                        <td className="p-4 align-middle">{session.practitionerName}</td>
                        <td className="p-4 align-middle">{session.billingCode}</td>
                        <td className="p-4 align-middle text-right">R {session.price}</td>
                        <td className="p-4 align-middle text-right capitalize">{session.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage practitioner access and roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {users.map((user) => (
                      <tr key={user.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-user-${user.id}`}>
                        <td className="p-4 align-middle font-medium">{user.name}</td>
                        <td className="p-4 align-middle">{user.email}</td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 capitalize">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Billing Codes</CardTitle>
              <CardDescription>
                Manage tariff codes and pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Price</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {billingCodes.map((code) => (
                      <tr key={code.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`row-code-${code.id}`}>
                        <td className="p-4 align-middle font-bold">{code.code}</td>
                        <td className="p-4 align-middle">{code.description}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            code.billingType === 'private' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {code.billingType === 'private' ? 'Private' : 'Medical Aid'}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right font-medium">R {code.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
