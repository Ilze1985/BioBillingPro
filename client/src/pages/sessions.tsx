import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore, Session } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Plus, Search, Calendar as CalendarIcon, Filter } from "lucide-react";
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
  const { sessions, patients, billingCodes, currentUser, addSession } = useStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedCodeId, setSelectedCodeId] = useState("");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sessionTime, setSessionTime] = useState("09:00");
  const [sessionNotes, setSessionNotes] = useState("");

  const handleSave = () => {
    if (!selectedPatientId || !selectedCodeId || !currentUser) return;

    const patient = patients.find(p => p.id === selectedPatientId);
    const code = billingCodes.find(c => c.id === selectedCodeId);

    if (!patient || !code) return;

    const newSession: Session = {
      id: `session-${Date.now()}`,
      practitionerId: currentUser.id,
      practitionerName: currentUser.name,
      patientId: patient.id,
      patientName: patient.name,
      date: sessionDate,
      time: sessionTime,
      billingCodeId: code.id,
      billingCode: code.code,
      price: code.price,
      status: 'captured',
      notes: sessionNotes
    };

    addSession(newSession);
    setIsDialogOpen(false);
    
    // Reset form
    setSelectedPatientId("");
    setSelectedCodeId("");
    setSessionNotes("");
    
    toast({
      title: "Session Captured",
      description: `Successfully captured session for ${patient.name}`,
    });
  };

  const filteredSessions = sessions.filter(session => 
    session.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.billingCode.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sessions</h1>
          <p className="text-muted-foreground">Capture and manage patient sessions.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
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
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Time</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    value={sessionTime} 
                    onChange={(e) => setSessionTime(e.target.value)} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Billing Code</Label>
                <Select value={selectedCodeId} onValueChange={setSelectedCodeId}>
                  <SelectTrigger id="code">
                    <SelectValue placeholder="Select code" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingCodes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - R{c.price} ({c.description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Clinical Notes</Label>
                <Textarea 
                  id="notes" 
                  value={sessionNotes} 
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Enter session notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSave}>Save Session</Button>
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Code</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Practitioner</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium">{session.date}</span>
                        <span className="text-xs text-muted-foreground">{session.time}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle font-medium">{session.patientName}</td>
                    <td className="p-4 align-middle">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        {session.billingCode}
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
                    <td className="p-4 align-middle text-right font-medium">R {session.price}</td>
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
