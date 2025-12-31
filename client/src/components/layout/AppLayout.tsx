import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  LogOut, 
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsers } from "@/lib/api";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: users = [] } = useUsers();
  const currentUser = users[0];

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Sessions", href: "/sessions", icon: CalendarDays },
    { name: "Patients", href: "/patients", icon: Users },
    { name: "Admin View", href: "/admin", icon: FileSpreadsheet, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-sidebar-primary-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground">B</span>
            </div>
            <span>BioKinetics<span className="text-primary">Pro</span></span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              if (item.adminOnly && currentUser?.role !== 'admin') return null;
              
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}>
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground")} />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium text-sidebar-accent-foreground">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{currentUser?.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{currentUser?.role}</p>
            </div>
            <button className="text-sidebar-foreground/50 hover:text-sidebar-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-muted/20 p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
