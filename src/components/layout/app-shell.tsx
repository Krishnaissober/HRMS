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
  // Tab-isolated sessions may prefix application routes with /t/<tab-id>.
  // Detect the workspace from the actual application path, not the tab scope.
  const appPath = pathname.replace(/^\/t\/[^/]+/, "") || "/";
  if (appPath.startsWith("/admin")) return "admin";
  if (
    appPath.startsWith("/hr/operations") ||
    appPath.startsWith("/hr/employees") ||
    appPath.startsWith("/hr/onboarding") ||
    appPath.startsWith("/hr/documents") ||
    appPath.startsWith("/hr/payroll")
  ) {
    return "employee";
  }
  if (
    appPath.startsWith("/hr/workplace") ||
    appPath.startsWith("/hr/leave") ||
    appPath.startsWith("/hr/attendance") ||
    appPath.startsWith("/hr/employee-attendance") ||
    appPath.startsWith("/hr/shifts") ||
    appPath.startsWith("/hr/holidays") ||
    appPath.startsWith("/hr/visitors") ||
    appPath.startsWith("/hr/offboarding")
  ) {
    return "workplace";
  }
  if (appPath.startsWith("/hr/reports")) return "reports";
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
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
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
        "min-h-screen bg-muted/30 flex",
        sidebarCollapsed && "sidebar-collapsed",
        className,
      )}
    >
      <Sidebar
        organizationId={organizationId}
        isAdmin={isAdmin}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activePhase={activePhase}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />
      <div
        className={cn(
          "flex-1 flex min-w-0 flex-col transition-[padding-left] duration-150 ease-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-60",
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
          mobileMenuOpen={mobileNavOpen}
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          showPhaseNavigation
          sidebarExpanded={!sidebarCollapsed}
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
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
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
        "min-h-screen bg-muted/30 flex",
        sidebarCollapsed && "sidebar-collapsed",
        className,
      )}
    >
      <Sidebar
        organizationId={organizationId}
        isAdmin={isAdmin}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activePhase={activePhase}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />
      <div
        className={cn(
          "flex-1 flex min-w-0 flex-col transition-[padding-left] duration-150 ease-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-60",
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
          mobileMenuOpen={mobileNavOpen}
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          showPhaseNavigation
          sidebarExpanded={!sidebarCollapsed}
        />
        <main className="hr-app-main flex-1 p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
