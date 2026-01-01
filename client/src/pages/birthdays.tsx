import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePatients } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cake } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatBirthday(dateOfBirth: string): string {
  const date = new Date(dateOfBirth);
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });
}

export default function BirthdaysPage() {
  const { data: patients = [], isLoading } = usePatients();
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());

  const patientsWithBirthdays = patients
    .filter(p => p.dateOfBirth)
    .filter(p => {
      const birthMonth = new Date(p.dateOfBirth!).getMonth();
      return birthMonth === parseInt(selectedMonth);
    })
    .sort((a, b) => {
      const dayA = new Date(a.dateOfBirth!).getDate();
      const dayB = new Date(b.dateOfBirth!).getDate();
      return dayA - dayB;
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-birthdays">Birthdays</h1>
          <p className="text-muted-foreground">View patient birthdays by month.</p>
        </div>
        <div className="w-48">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger data-testid="select-month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            {months[parseInt(selectedMonth)]} Birthdays ({patientsWithBirthdays.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {patientsWithBirthdays.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No birthdays in {months[parseInt(selectedMonth)]}.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Patient Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Birthday</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Age</th>
                </tr>
              </thead>
              <tbody>
                {patientsWithBirthdays.map((patient) => (
                  <tr key={patient.id} className="border-t hover:bg-muted/30" data-testid={`row-birthday-${patient.id}`}>
                    <td className="py-3 px-4 font-medium">{patient.firstName} {patient.surname}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatBirthday(patient.dateOfBirth!)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                        {calculateAge(patient.dateOfBirth!)} years
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
