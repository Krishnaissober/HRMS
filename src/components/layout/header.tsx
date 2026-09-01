"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bell, Menu, User, LogOut, Search, Moon, Sun, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

interface HeaderProps {
  organizationId?: string;
  organizationName?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onSignOut?: () => void;
}

type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  actionableUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function Header({
  userName,
  userEmail,
  userAvatar,
  onSignOut,
}: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<HeaderNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(true);
  const [notificationsError, setNotificationsError] = React.useState(false);
  const mobileSections = [
    { label: "Recruitment", links: [["HR Dashboard", "/hr/dashboard"], ["Recruitment Dashboard", "/hr/recruitment/dashboard"], ["Candidates", "/hr/candidates"], ["Interviews", "/hr/interviews"]] },
    { label: "People & operations", links: [["Employees", "/hr/employees"], ["Onboarding", "/hr/onboarding"], ["Leave", "/hr/leave"], ["Attendance", "/hr/attendance"], ["Documents", "/hr/documents"], ["Payroll", "/hr/payroll"], ["Reports & Analytics", "/hr/reports"]] },
    { label: "Workplace & exit", links: [["Shifts", "/hr/shifts"], ["Holidays", "/hr/holidays"], ["Visitors", "/hr/visitors"], ["Offboarding", "/hr/offboarding"]] },
    { label: "Account", links: [["Notifications", "/hr/notifications"], ["My profile", "/me/profile"]] },
  ] as const;
  const tenantHref = (path: string) => path;

  const loadNotifications = React.useCallback(async (showLoading = true, markVisibleAsRead = false) => {
    if (showLoading) setNotificationsLoading(true);
    setNotificationsError(false);
    try {
      const response = await fetch("/api/v1/notifications?unreadOnly=true&page=1&pageSize=5", { cache: "no-store" });
      if (!response.ok) throw new Error("Notification request failed");
      const payload = await response.json() as { data?: { items?: HeaderNotification[]; total?: number } };
      const items = payload.data?.items ?? [];
      setNotifications(items);
      setUnreadNotificationCount(payload.data?.total ?? 0);
      if (markVisibleAsRead && items.length) {
        await Promise.all(items.map((notification) => fetch(`/api/v1/notifications/${encodeURIComponent(notification.id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ read: true }),
        })));
        setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || new Date().toISOString() })));
        setUnreadNotificationCount(0);
      }
    } catch {
      setNotificationsError(true);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadNotifications();
    const refresh = () => void loadNotifications(false);
    const interval = window.setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadNotifications]);

  return (
    <>
      <header className="app-header sticky top-0 z-30 h-[4.5rem] border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="relative flex h-full items-center px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="absolute left-1/2 hidden w-[min(42rem,45vw)] -translate-x-1/2 lg:block">
          <div>
            <Button variant="ghost" size="sm" className="app-search w-full justify-start gap-2 text-left" asChild>
              <Link href="/hr/search">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">Search candidates, employees, jobs…</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
          </Button>

          <DropdownMenu onOpenChange={(open) => { if (open) void loadNotifications(false, true); }}>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl" aria-label={unreadNotificationCount ? `${unreadNotificationCount} unread notifications` : "Notifications"}>
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadNotificationCount > 0 && <span className="absolute right-1.5 top-1.5 flex min-h-2 min-w-2 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-3 text-destructive-foreground" aria-hidden="true">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="font-medium">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificationsLoading && <DropdownMenuItem className="text-sm text-muted-foreground" disabled>Loading notifications…</DropdownMenuItem>}
              {!notificationsLoading && notificationsError && <DropdownMenuItem className="text-sm text-destructive" disabled>Notifications could not be loaded</DropdownMenuItem>}
              {!notificationsLoading && !notificationsError && !notifications.length && <DropdownMenuItem className="text-sm text-muted-foreground" disabled>You’re all caught up</DropdownMenuItem>}
              {!notificationsLoading && !notificationsError && notifications.map((notification) => {
                const href = notification.actionableUrl?.startsWith("/") ? notification.actionableUrl : "/hr/notifications";
                return <DropdownMenuItem key={notification.id} asChild className={cn("items-start gap-2", !notification.readAt && "bg-primary/5")}><Link href={href} className="grid w-full gap-1 whitespace-normal"><span className="flex items-center gap-2 font-medium"><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", notification.readAt ? "bg-muted" : "bg-primary")} aria-hidden="true" />{notification.title}</span><span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span><time className="text-[10px] text-muted-foreground" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time></Link></DropdownMenuItem>;
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/hr/notifications" className="w-full">View all notifications</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label={`${userName || "User"} profile menu`}>
                <Avatar className="h-10 w-10" src={userAvatar} alt={userName || "User avatar"} fallback={<User className="h-5 w-5" aria-hidden="true" />} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/me/profile" className="flex items-center gap-2 w-full">
                  <User className="h-4 w-4" aria-hidden="true" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/me/settings" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive flex items-center gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      </header>
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button className="mobile-nav-backdrop absolute inset-0" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation overlay" />
          <aside className="mobile-nav-drawer relative" aria-label="Mobile navigation drawer">
            <div className="mobile-nav-header">
              <Link href="/hr/dashboard" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-brand">Triple Minds HR</Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="mobile-nav-close">
                <span aria-hidden="true" className="text-xl">×</span>
              </Button>
            </div>
            <nav className="mobile-nav-list" aria-label="Mobile navigation links">
              {mobileSections.map((section) => <div key={section.label} className="mobile-nav-section"><h2 className="mobile-nav-section-title">{section.label}</h2><div className="mobile-nav-links">{section.links.map(([label, href]) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={tenantHref(href)} onClick={() => setMobileMenuOpen(false)} className={cn("mobile-nav-link", active && "is-active")} aria-current={active ? "page" : undefined}>{label}</Link>; })}</div></div>)}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
