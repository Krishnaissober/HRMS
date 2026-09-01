"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart2,
  Users,
  Calendar,
  UserCheck,
  UserPlus,
  CalendarDays,
  Clock,
  FolderOpen,
  Banknote,
  LogOut,
  Building2,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  organizationId?: string;
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const navigation = [
  {
    label: "Recruitment",
    icon: Users,
    items: [
      { label: "HR Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
      { label: "Recruitment Dashboard", href: "/hr/recruitment/dashboard", icon: BarChart2 },
      { label: "Candidates", href: "/hr/candidates", icon: Users },
      { label: "Interviews", href: "/hr/interviews", icon: Calendar },
    ],
  },
  {
    label: "People & operations",
    icon: Building2,
    items: [
      { label: "Employees", href: "/hr/employees", icon: UserCheck },
      { label: "Onboarding", href: "/hr/onboarding", icon: UserPlus },
      { label: "Leave", href: "/hr/leave", icon: CalendarDays },
      { label: "Attendance", href: "/hr/attendance", icon: Clock },
      { label: "Documents", href: "/hr/documents", icon: FolderOpen },
      { label: "Payroll", href: "/hr/payroll", icon: Banknote },
      { label: "Reports & Analytics", href: "/hr/reports", icon: BarChart2 },
    ],
  },
  {
    label: "Workplace & exit",
    icon: Shield,
    items: [
{ label: "Shifts", href: "/hr/shifts", icon: Clock },
      { label: "Holidays", href: "/hr/holidays", icon: Calendar },
      { label: "Visitors", href: "/hr/visitors", icon: UserPlus },
      { label: "Offboarding", href: "/hr/offboarding", icon: LogOut },
    ],
  },
];

export function Sidebar({ className, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const buildHref = (href: string) => href;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen border-r border-sidebar-border bg-sidebar lg:flex transition-all duration-200 flex-col",
        collapsed ? "w-20" : "w-64",
        className
      )}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-[4.5rem] items-center border-b border-sidebar-border", collapsed ? "justify-center px-3" : "justify-between px-5")}>
        <Link href={buildHref("/hr/dashboard")} className="flex items-center gap-2 font-semibold text-lg text-sidebar-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          {!collapsed && <span className="tracking-tight">Triple Minds HR</span>}
        </Link>
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navigation">
        {navigation.map((section) => (
          <div key={section.label} className="mb-7">
            {!collapsed && <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white">{section.label}</h3>}
            <ul className="space-y-1" role="list">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.label}>
                    <Link
                      href={buildHref(item.href)}
                      className={cn(
                        "group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-150",
                        collapsed ? "justify-center px-3" : "gap-3 px-3",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive ? "opacity-100" : "opacity-70")} aria-hidden="true" />
                      {!collapsed && item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href={buildHref("/me/profile")}
          className={cn(
            "flex items-center rounded-lg py-2 text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "justify-center px-3" : "gap-3 px-3"
          )}
          aria-label="Settings"
          title={collapsed ? "Profile and settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && "Profile and settings"}
        </Link>
      </div>
    </aside>
  );
}
