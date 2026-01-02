import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, AdminRoute } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SessionsPage from "@/pages/sessions";
import PatientsPage from "@/pages/patients";
import AdminPage from "@/pages/admin";
import BillingPage from "@/pages/billing";
import BirthdaysPage from "@/pages/birthdays";
import LoginPage from "@/pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/sessions">
        <ProtectedRoute>
          <SessionsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/patients">
        <ProtectedRoute>
          <PatientsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/birthdays">
        <ProtectedRoute>
          <BirthdaysPage />
        </ProtectedRoute>
      </Route>
      <Route path="/billing">
        <ProtectedRoute>
          <BillingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <AdminRoute>
          <AdminPage />
        </AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
