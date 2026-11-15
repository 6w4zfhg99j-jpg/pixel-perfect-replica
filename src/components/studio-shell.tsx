import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Ticket,
  Wallet,
  Settings2,
  Flower2,
  ChevronRight,
  Bell,
  CircleHelp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioProvider, useStudio } from "./studio-provider";
import type { ReactNode } from "react";
const navigation = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/students", label: "Students", icon: Users },
  { to: "/memberships", label: "Memberships", icon: Ticket },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/settings", label: "Settings & backups", icon: Settings2 },
] as const;
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <StudioProvider>
      <Shell>{children}</Shell>
    </StudioProvider>
  );
}
function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const title = navigation.find((n) => n.to === path)?.label || "Class attendance";
  const { db, error } = useStudio();
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <div className="sidebar-brand px-3">
          <div className="wordmark">
            VONA<span className="text-primary">.</span>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Studio manager
          </p>
          <div className="mt-7 border-t border-border" />
        </div>
        <p className="sidebar-label mt-7 mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your studio
        </p>
        <nav className="space-y-1">
          {navigation.map((n) => (
            <Link key={n.to} to={n.to} className={"nav-link " + (path === n.to ? "active" : "")}>
              <n.icon size={19} strokeWidth={1.6} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer mt-auto">
          <div className="flex items-center gap-3 border-t border-border pt-5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-display text-lg text-primary">
              V
            </div>
            <div>
              <p className="text-xs font-semibold">VONA Studio</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Yoga & stretching</p>
            </div>
            <Flower2 size={16} className="ml-auto text-primary" />
          </div>
        </div>
      </aside>
      <main className="studio-main">
        <header className="studio-topbar">
          <div className="desktop-breadcrumb flex items-center gap-3 text-xs text-muted-foreground">
            <span>My studio</span>
            <ChevronRight size={13} />
            <span className="text-foreground">{title}</span>
          </div>
          <div className="mobile-brand">VONA.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <i className="status-dot" />
              {db ? "Saved locally" : "Opening studio"}
            </span>
            <span className="h-5 border-l border-border" />
            <Button variant="ghost" size="icon" asChild title="Settings & backups">
              <Link to="/settings">
                <CircleHelp size={18} />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="Membership alerts">
              <Link to="/memberships">
                <Bell size={18} />
              </Link>
            </Button>
          </div>
        </header>
        {error ? (
          <div role="alert" className="p-10 text-destructive">
            Your local studio could not open: {error}. Existing data has not been replaced.
          </div>
        ) : (
          <div className="studio-content">{children}</div>
        )}
      </main>
    </div>
  );
}
