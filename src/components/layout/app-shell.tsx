"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { NavigationPhase } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";

interface AppShellProps {
  children: React.ReactNode;
  organizationId?: string;
  organizationName?: string;
  isAdmin?: boolean;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onSignOut?: () => void;
  pageTitle?: string;
  pageDescription?: string;
  pageEyebrow?: string;
  pageAction?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

function phaseForPath(pathname: string): NavigationPhase {
  if (
    pathname.startsWith("/hr/operations") ||
    pathname.startsWith("/hr/employees") ||
    pathname.startsWith("/hr/onboarding") ||
    pathname.startsWith("/hr/leave") ||
    pathname.startsWith("/hr/attendance") ||
    pathname.startsWith("/hr/documents") ||
    pathname.startsWith("/hr/payroll")
  ) {
    return "employee";
  }
  if (
    pathname.startsWith("/hr/workplace") ||
    pathname.startsWith("/hr/shifts") ||
    pathname.startsWith("/hr/holidays") ||
    pathname.startsWith("/hr/visitors") ||
    pathname.startsWith("/hr/offboarding")
  ) {
    return "workplace";
  }
  if (pathname.startsWith("/hr/reports")) return "reports";
  return "recruitment";
}

export function AppShell({
  children,
  organizationId,
  organizationName,
  isAdmin = false,
  userName,
  userEmail,
  userAvatar,
  onSignOut,
  pageTitle,
  pageDescription,
  pageEyebrow,
  pageAction,
  breadcrumbs,
  className,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activePhase, setActivePhase] = React.useState<NavigationPhase>(() =>
    phaseForPath(pathname),
  );
  React.useEffect(() => setActivePhase(phaseForPath(pathname)), [pathname]);
  React.useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("triple-minds-sidebar-collapsed") === "true");
  }, []);
  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("triple-minds-sidebar-collapsed", String(next));
      return next;
    });
  }
  return (
    <div
      className={cn(
        "min-h-screen bg-background flex",
        sidebarCollapsed && "sidebar-collapsed",
        className,
      )}
    >
      <Sidebar
        organizationId={organizationId}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
      />
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[padding-left] duration-100 ease-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <Header
          organizationId={organizationId}
          organizationName={organizationName}
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          onSignOut={onSignOut}
          activePhase={activePhase}
          onPhaseChange={setActivePhase}
          showPhaseNavigation={sidebarCollapsed}
        />
        <main className="hr-app-main flex-1 p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
          {(pageTitle || breadcrumbs) && (
            <PageHeader
              title={pageTitle || ""}
              description={pageDescription}
              eyebrow={pageEyebrow}
              action={pageAction}
              breadcrumbs={breadcrumbs}
              className="mb-6"
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShellWithBreadcrumbs({
  children,
  organizationId,
  organizationName,
  isAdmin = false,
  userName,
  userEmail,
  userAvatar,
  onSignOut,
  className,
}: Omit<
  AppShellProps,
  "pageTitle" | "pageDescription" | "pageEyebrow" | "pageAction" | "breadcrumbs"
>) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activePhase, setActivePhase] = React.useState<NavigationPhase>(() =>
    phaseForPath(pathname),
  );
  React.useEffect(() => setActivePhase(phaseForPath(pathname)), [pathname]);
  React.useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("triple-minds-sidebar-collapsed") === "true");
  }, []);
  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("triple-minds-sidebar-collapsed", String(next));
      return next;
    });
  }
  // This variant reads breadcrumbs from the page context
  return (
    <div
      className={cn(
        "min-h-screen bg-background flex",
        sidebarCollapsed && "sidebar-collapsed",
        className,
      )}
    >
      <Sidebar
        organizationId={organizationId}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
      />
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[padding-left] duration-100 ease-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <Header
          organizationId={organizationId}
          organizationName={organizationName}
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          onSignOut={onSignOut}
          activePhase={activePhase}
          onPhaseChange={setActivePhase}
          showPhaseNavigation={sidebarCollapsed}
        />
        <main className="hr-app-main flex-1 p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
