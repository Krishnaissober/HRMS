"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClientTabPath } from "@/lib/tab-session-client";
import {
  AlarmClock,
  Banknote,
  BarChart2,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import type { NavigationPhase } from "@/components/layout/header";

interface SidebarProps {
  organizationId?: string;
  isAdmin?: boolean;
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  activePhase?: NavigationPhase;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
};

type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

type NavigationSection = {
  phase: NavigationPhase;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  groups: SidebarGroup[];
};

const navigation: NavigationSection[] = [
  {
    phase: "recruitment",
    label: "Phase 1 · Hiring",
    shortLabel: "Hiring",
    description: "Jobs, candidates and interviews",
    icon: Users,
    groups: [
      {
        label: "Hiring",
        items: [
          { label: "HR Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
          { label: "Jobs & Forms", href: "/hr/candidates/new", icon: FolderOpen },
          { label: "Recruitment Dashboard", href: "/hr/recruitment/dashboard", icon: BarChart2 },
          { label: "Candidates", href: "/hr/candidates", icon: Users },
          { label: "Interviews", href: "/hr/interviews", icon: Calendar },
        ],
      },
      {
        label: "Follow-up",
        items: [
          { label: "Hiring alerts", href: "/hr/alerts", icon: AlarmClock },
          { label: "Archive", href: "/hr/archive", icon: FolderOpen },
        ],
      },
    ],
  },
  {
    phase: "employee",
    label: "Phase 2 · Employee management",
    shortLabel: "Employee management",
    description: "Onboarding, people and documents",
    icon: Building2,
    groups: [
      {
        label: "People",
        items: [
          {
            label: "Operations Dashboard",
            href: "/hr/operations/dashboard",
            icon: LayoutDashboard,
          },
          { label: "Onboarding", href: "/hr/onboarding", icon: UserPlus },
          { label: "Employees", href: "/hr/employees", icon: UserCheck },
          { label: "Documents", href: "/hr/documents", icon: FolderOpen },
        ],
      },
      {
        label: "Employee operations",
        items: [{ label: "Payroll", href: "/hr/payroll", icon: Banknote }],
      },
    ],
  },
  {
    phase: "workplace",
    label: "Phase 3 · Workplace & exit",
    shortLabel: "Workplace & exit",
    description: "Shifts, visitors and offboarding",
    icon: Shield,
    groups: [
      {
        label: "Workplace",
        items: [
          { label: "Workplace Dashboard", href: "/hr/workplace/dashboard", icon: LayoutDashboard },
          { label: "Attendance", href: "/hr/attendance", icon: Clock },
          { label: "Leave", href: "/hr/leave", icon: CalendarDays },
          { label: "Shifts", href: "/hr/shifts", icon: Clock },
          { label: "Holidays", href: "/hr/holidays", icon: Calendar },
          { label: "Visitors", href: "/hr/visitors", icon: UserPlus },
          { label: "Offboarding", href: "/hr/offboarding", icon: LogOut },
        ],
      },
    ],
  },
  {
    phase: "reports",
    label: "Reports",
    shortLabel: "Reports",
    description: "Business insights and exports",
    icon: BarChart2,
    groups: [
      {
        label: "Insights",
        items: [{ label: "Reports & Analytics", href: "/hr/reports", icon: BarChart2 }],
      },
    ],
  },
  {
    phase: "admin",
    label: "MASTER ADMIN",
    shortLabel: "Master Admin",
    description: "System and company control",
    icon: Shield,
    groups: [
      {
        label: "Control center",
        items: [
          { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
          { label: "Executive Analytics", href: "/admin/analytics", icon: BarChart2 },
          { label: "Hiring approvals", href: "/admin/hiring-approvals", icon: CheckCircle2 },
        ],
      },
      {
        label: "Administration",
        items: [
          { label: "Access Management", href: "/admin/access", icon: Users },
          { label: "Governance", href: "/admin/governance", icon: Shield },
          { label: "Account Security", href: "/admin/security", icon: Settings },
        ],
      },
      {
        label: "Monitoring",
        items: [
          { label: "System Health", href: "/admin/health", icon: AlarmClock },
          { label: "Operations Oversight", href: "/admin/operations", icon: Building2 },
          { label: "Audit Log", href: "/admin/audit", icon: FolderOpen },
          { label: "Reports & Exports", href: "/admin/reports", icon: BarChart2 },
        ],
      },
    ],
  },
];

function getSection(phase: NavigationPhase, isAdmin: boolean) {
  if (phase === "admin" && !isAdmin) return navigation[0];
  return navigation.find((section) => section.phase === phase) || navigation[0];
}

function isRouteActive(pathname: string, href: string) {
  const appPath = pathname.replace(/^\/t\/[^/]+/, "") || "/";
  return appPath === href || (href !== "/admin" && appPath.startsWith(`${href}/`));
}

function SidebarItem({
  item,
  pathname,
  collapsed,
  onClick,
}: {
  item: SidebarItem;
  pathname: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const ItemIcon = item.icon;
  const router = useRouter();
  const active = isRouteActive(pathname, item.href);

  return (
    <li>
      <Link
        href={item.href}
        onClick={(event) => {
          event.preventDefault();
          onClick?.();
          router.push(getClientTabPath(item.href));
        }}
        className={cn(
          "group relative flex min-h-11 items-center rounded-xl text-sm font-semibold outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-primary/80",
          collapsed ? "mx-auto h-11 w-11 justify-center px-0" : "gap-3 px-3",
          active
            ? "bg-sidebar-accent text-white"
            : "text-sidebar-muted hover:bg-white/[0.06] hover:text-white",
        )}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary"
            aria-hidden="true"
          />
        )}
        <ItemIcon
          className={cn(
            "h-[1.05rem] w-[1.05rem] shrink-0",
            active ? "text-sidebar-primary" : "text-sidebar-muted",
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge !== undefined && (
          <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-sidebar-muted">
            {item.badge}
          </span>
        )}
        {collapsed && (
          <span
            role="tooltip"
            className="pointer-events-none absolute left-[calc(100%+0.75rem)] z-50 hidden whitespace-nowrap rounded-lg border border-slate-700 bg-sidebar px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100"
          >
            {item.label}
          </span>
        )}
      </Link>
    </li>
  );
}

function SidebarNavigation({
  activeSection,
  pathname,
  collapsed,
  onItemClick,
}: {
  activeSection: NavigationSection;
  pathname: string;
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  return (
    <nav
      className="min-h-0 flex-1 overflow-y-auto overflow-x-visible px-3 py-6"
      aria-label="Navigation"
    >
      <div className={cn(collapsed ? "mb-5 px-2" : "mb-6 flex items-center gap-2 px-3")}>
        {collapsed ? (
          <span className="block h-px w-full bg-sidebar-border" aria-hidden="true" />
        ) : (
          <>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-primary"
              aria-hidden="true"
            />
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-muted">
              {activeSection.label}
            </span>
          </>
        )}
      </div>
      <div className="space-y-6">
        {activeSection.groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            {!collapsed && (
              <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-muted">
                {group.label}
              </h2>
            )}
            <ul className="space-y-1" role="list">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  onClick={onItemClick}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <Link
        href="/me/profile"
        onClick={(event) => {
          event.preventDefault();
          router.push(getClientTabPath("/me/profile"));
        }}
        className={cn(
          "flex min-h-11 items-center rounded-xl text-sm font-semibold text-sidebar-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-primary/80",
          collapsed ? "mx-auto w-11 justify-center" : "gap-3 px-3",
        )}
        aria-label="Profile and settings"
        title={collapsed ? "Profile and settings" : undefined}
      >
        <Settings
          className="h-[1.05rem] w-[1.05rem] shrink-0 text-sidebar-muted"
          aria-hidden="true"
        />
        {!collapsed && <span>Profile and settings</span>}
      </Link>
    </div>
  );
}

function SidebarPanel({
  activeSection,
  pathname,
  collapsed,
  mobile,
  onToggle,
  onClose,
}: {
  activeSection: NavigationSection;
  pathname: string;
  collapsed: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  return (
    <div className="enterprise-sidebar relative isolate flex h-full flex-col bg-sidebar text-sidebar-muted">
      <div className="flex h-24 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <Link
          href="/hr/dashboard"
          onClick={(event) => {
            event.preventDefault();
            onClose?.();
            router.push(getClientTabPath("/hr/dashboard"));
          }}
          className={cn(
            "brand-link flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-primary/80",
            collapsed && "hidden",
          )}
          aria-label="Triple Minds HR dashboard"
        >
          <BrandLogo />
        </Link>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 text-sidebar-muted hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-primary/80"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 text-sidebar-muted hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-primary/80",
              collapsed ? "mx-auto" : "ml-auto",
            )}
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      <SidebarNavigation
        activeSection={activeSection}
        pathname={pathname}
        collapsed={collapsed}
        onItemClick={onClose}
      />
      <SidebarFooter collapsed={mobile ? false : collapsed} />
    </div>
  );
}

export function Sidebar({
  className,
  isAdmin = false,
  collapsed = false,
  onToggle,
  activePhase = "recruitment",
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();
  const mobilePanel = React.useRef<HTMLElement>(null);
  const activeSection = getSection(activePhase, isAdmin);
  const closeMobile = React.useCallback(() => onMobileOpenChange?.(false), [onMobileOpenChange]);

  React.useEffect(() => {
    onMobileOpenChange?.(false);
  }, [pathname, onMobileOpenChange]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobilePanel.current?.querySelector<HTMLElement>("a, button")?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeMobile();
      // Radix portals manage their own menu focus while the selector is open.
      if (event.key !== "Tab" || !mobilePanel.current?.contains(document.activeElement)) return;
      const controls = mobilePanel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex="0"]',
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar shadow-none transition-[width] duration-150 ease-out lg:flex",
          collapsed ? "w-20" : "w-60",
          className,
        )}
        aria-label="Main navigation"
      >
        <SidebarPanel
          activeSection={activeSection}
          pathname={pathname}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={closeMobile}
            aria-label="Close navigation"
          />
          <aside
            ref={mobilePanel}
            className="relative h-full w-[min(22rem,calc(100vw-1rem))] border-r border-sidebar-border shadow-sm"
          >
            <SidebarPanel
              activeSection={activeSection}
              pathname={pathname}
              collapsed={false}
              mobile
              onClose={closeMobile}
            />
          </aside>
        </div>
      )}
    </>
  );
}
