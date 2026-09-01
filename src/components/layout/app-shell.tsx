"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";

interface AppShellProps {
  children: React.ReactNode;
  organizationId?: string;
  organizationName?: string;
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

export function AppShell({
  children,
  organizationId,
  organizationName,
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
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
    <div className={cn("min-h-screen bg-background flex", sidebarCollapsed && "sidebar-collapsed", className)}>
      <Sidebar organizationId={organizationId} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={cn("flex-1 flex flex-col min-w-0 transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        <Header
          organizationId={organizationId}
          organizationName={organizationName}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          onSignOut={onSignOut}
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
  userName,
  userEmail,
  userAvatar,
  onSignOut,
  className,
}: Omit<AppShellProps, "pageTitle" | "pageDescription" | "pageEyebrow" | "pageAction" | "breadcrumbs">) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
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
    <div className={cn("min-h-screen bg-background flex", sidebarCollapsed && "sidebar-collapsed", className)}>
      <Sidebar organizationId={organizationId} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={cn("flex-1 flex flex-col min-w-0 transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        <Header
          organizationId={organizationId}
          organizationName={organizationName}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          onSignOut={onSignOut}
        />
        <main className="hr-app-main flex-1 p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
