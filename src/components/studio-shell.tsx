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
  { to: "/", label: "Panoramica", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendario", icon: CalendarDays },
  { to: "/students", label: "Allieve", icon: Users },
  { to: "/memberships", label: "Abbonamenti", icon: Ticket },
  { to: "/finance", label: "Finanze", icon: Wallet },
  { to: "/settings", label: "Impostazioni e backup", icon: Settings2 },
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
  const title = navigation.find((n) => n.to === path)?.label || "Presenze della lezione";
  const { db, error } = useStudio();
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <div className="sidebar-brand px-3">
          <div className="wordmark">
            VONA
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Gestione dello studio
          </p>
          <div className="mt-7 border-t border-border" />
        </div>
        <p className="sidebar-label mt-7 mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Il tuo studio
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yoga-soft font-display text-lg text-primary">
              V
            </div>
            <div>
              <p className="text-xs font-semibold">VONA Studio</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Yoga e stretching</p>
            </div>
            <Flower2 size={16} className="ml-auto text-primary" />
          </div>
        </div>
      </aside>
      <main className="studio-main">
        <header className="studio-topbar">
          <div className="desktop-breadcrumb flex items-center gap-3 text-xs text-muted-foreground">
            <span>Il mio studio</span>
            <ChevronRight size={13} />
            <span className="text-foreground">{title}</span>
          </div>
          <div className="mobile-brand">VONA</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <i className="status-dot" />
              {db ? "Salvato in locale" : "Apertura dello studio"}
            </span>
            <span className="h-5 border-l border-border" />
            <Button variant="ghost" size="icon" asChild title="Impostazioni e backup">
              <Link to="/settings">
                <CircleHelp size={18} />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="Avvisi abbonamenti">
              <Link to="/memberships">
                <Bell size={18} />
              </Link>
            </Button>
          </div>
        </header>
        {error ? (
          <div role="alert" className="p-10 text-destructive">
            Impossibile aprire il tuo studio locale: {error}. I dati esistenti non sono stati sostituiti.
          </div>
        ) : (
          <div className="studio-content">{children}</div>
        )}
      </main>
    </div>
  );
}
