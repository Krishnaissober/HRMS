"use client";

import * as React from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Archive,
  Bell,
  Menu,
  User,
  LogOut,
  Search,
  Moon,
  Sun,
  Settings,
  ChevronDown,
} from "lucide-react";
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

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

interface HeaderProps {
  organizationId?: string;
  organizationName?: string;
  isAdmin?: boolean;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onSignOut?: () => void;
  activePhase?: NavigationPhase;
  onPhaseChange?: (phase: NavigationPhase) => void;
  mobileMenuOpen?: boolean;
  onMobileMenuOpen?: () => void;
  showPhaseNavigation?: boolean;
  sidebarExpanded?: boolean;
}

type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  actionableUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type NavigationPhase = "recruitment" | "employee" | "workplace" | "reports" | "admin";

const workspaceSummary: Record<NavigationPhase, { phase: string; label: string }> = {
  recruitment: { phase: "Phase 1", label: "Hiring" },
  employee: { phase: "Phase 2", label: "Employee management" },
  workplace: { phase: "Phase 3", label: "Workplace & exit" },
  reports: { phase: "Workspace", label: "Reports" },
  admin: { phase: "Global", label: "Master Admin" },
};

const headerNavigation = [
  {
    label: "Recruitment",
    phase: "recruitment",
    links: [
      ["HR Dashboard", "/hr/dashboard"],
      ["Jobs & Forms", "/hr/candidates/new"],
      ["Recruitment Dashboard", "/hr/recruitment/dashboard"],
      ["Candidates", "/hr/candidates"],
      ["Interviews", "/hr/interviews"],
      ["Archive", "/hr/archive"],
    ],
  },
  {
    label: "Employee Operations",
    phase: "employee",
    links: [
      ["Employees", "/hr/employees"],
      ["Employee Operations Dashboard", "/hr/operations/dashboard"],
      ["Onboarding", "/hr/onboarding"],
      ["Documents", "/hr/documents"],
      ["Payroll", "/hr/payroll"],
    ],
  },
  {
    label: "Workplace & Exit",
    phase: "workplace",
    links: [
      ["Attendance", "/hr/attendance"],
      ["Leave", "/hr/leave"],
      ["Shifts", "/hr/shifts"],
      ["Workplace & Exit Dashboard", "/hr/workplace/dashboard"],
      ["Holidays", "/hr/holidays"],
      ["Visitors", "/hr/visitors"],
      ["Offboarding", "/hr/offboarding"],
    ],
  },
  {
    label: "Reports",
    phase: "reports",
    links: [["Reports & Analytics", "/hr/reports"]],
  },
] as const;

const adminNavigation = {
  label: "MASTER ADMIN",
  phase: "admin",
  links: [
    ["Admin Dashboard", "/admin"],
    ["Access Management", "/admin/access"],
    ["Executive Analytics", "/admin/analytics"],
    ["Audit Log", "/admin/audit"],
    ["Governance", "/admin/governance"],
    ["System Health", "/admin/health"],
    ["Operations Oversight", "/admin/operations"],
    ["Reports & Exports", "/admin/reports"],
    ["Account Security", "/admin/security"],
  ],
} as const;

type HeaderNavigationGroup = {
  label: string;
  phase: NavigationPhase;
  links: readonly (readonly [string, string])[];
};

function HeaderPhaseMenu({
  group,
  active,
  activePhase,
  onPhaseChange,
}: {
  group: HeaderNavigationGroup;
  active: boolean;
  activePhase?: NavigationPhase;
  onPhaseChange?: (phase: NavigationPhase) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });

  function positionMenu() {
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!anchor) return;
    setMenuPosition({ top: anchor.bottom + 2, left: anchor.left });
  }

  function cancelClose() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }

  function scheduleClose() {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 280);
  }

  function scheduleOpen() {
    if (open || openTimer.current !== null) return;
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      positionMenu();
      setOpen(true);
    }, 120);
  }

  React.useEffect(
    () => () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        scheduleOpen();
      }}
      onMouseLeave={scheduleClose}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 shrink-0 cursor-pointer gap-1 rounded-lg px-3 text-xs font-bold",
          activePhase === group.phase || active
            ? "bg-primary-light text-primary-ink dark:bg-primary-light/60 dark:text-primary-ink"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          positionMenu();
          setOpen((current) => !current);
        }}
      >
        {group.label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      {open && (
        <div
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          className="fixed z-[60] w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          onMouseEnter={() => {
            cancelClose();
            if (openTimer.current !== null) {
              window.clearTimeout(openTimer.current);
              openTimer.current = null;
            }
          }}
          onMouseLeave={scheduleClose}
        >
          <div className="px-2 py-1.5 text-sm font-semibold">{group.label}</div>
          <div className="-mx-1 my-1 h-px bg-border" />
          {group.links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              onClick={(event) => {
                event.preventDefault();
                if (group.phase !== "admin") onPhaseChange?.(group.phase);
                setOpen(false);
                router.push(href);
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({
  organizationId,
  organizationName,
  isAdmin = false,
  userName,
  userEmail,
  userAvatar,
  onSignOut,
  activePhase,
  onPhaseChange,
  mobileMenuOpen = false,
  onMobileMenuOpen,
  showPhaseNavigation = true,
  sidebarExpanded = false,
}: HeaderProps) {
  const pathname = usePathname();
  const accountThemeKey = userEmail
    ? `triple-minds-theme:${organizationId || "default"}:${userEmail.trim().toLowerCase()}`
    : null;
  // Keep the initial render identical on the server and client. The saved
  // account theme is applied immediately after hydration in the effect below.
  const [accountTheme, setAccountTheme] = React.useState<"light" | "dark">("light");
  const [themeMounted, setThemeMounted] = React.useState(false);
  const [notifications, setNotifications] = React.useState<HeaderNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(true);
  const [notificationsError, setNotificationsError] = React.useState(false);
  const [headerVisible, setHeaderVisible] = React.useState(true);
  const visibleHeaderNavigation = isAdmin
    ? [...headerNavigation, adminNavigation]
    : headerNavigation;
  const appPath = pathname.replace(/^\/t\/[^/]+/, "") || "/";
  const archiveActive = appPath.startsWith("/hr/archive");
  const currentWorkspace = workspaceSummary[activePhase || "recruitment"];

  useIsomorphicLayoutEffect(() => {
    setThemeMounted(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!accountThemeKey) return;
    const savedTheme = window.localStorage.getItem(accountThemeKey);
    const nextTheme: "light" | "dark" = savedTheme === "dark" ? "dark" : "light";
    setAccountTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, [accountThemeKey]);

  function toggleAccountTheme() {
    const nextTheme: "light" | "dark" = accountTheme === "dark" ? "light" : "dark";
    setAccountTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    if (accountThemeKey) window.localStorage.setItem(accountThemeKey, nextTheme);
  }

  React.useEffect(() => {
    let previousScrollY = window.scrollY;
    let frame: number | null = null;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 8) {
        setHeaderVisible(true);
      } else if (currentScrollY > previousScrollY + 4) {
        setHeaderVisible(false);
      } else if (currentScrollY < previousScrollY - 4) {
        setHeaderVisible(true);
      }
      previousScrollY = currentScrollY;
      frame = null;
    };

    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateHeaderVisibility);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);
  const loadNotifications = React.useCallback(
    async (showLoading = true, markVisibleAsRead = false) => {
      if (showLoading) setNotificationsLoading(true);
      setNotificationsError(false);
      try {
        const response = await fetch("/api/v1/notifications?unreadOnly=true&page=1&pageSize=5", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Notification request failed");
        const payload = (await response.json()) as {
          data?: { items?: HeaderNotification[]; total?: number };
        };
        const items = payload.data?.items ?? [];
        setNotifications(items);
        setUnreadNotificationCount(payload.data?.total ?? 0);
        if (markVisibleAsRead && items.length) {
          await Promise.all(
            items.map((notification) =>
              fetch(`/api/v1/notifications/${encodeURIComponent(notification.id)}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ read: true }),
              }),
            ),
          );
          setNotifications((current) =>
            current.map((notification) => ({
              ...notification,
              readAt: notification.readAt || new Date().toISOString(),
            })),
          );
          setUnreadNotificationCount(0);
        }
      } catch {
        setNotificationsError(true);
      } finally {
        setNotificationsLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    // Let the active page finish its first render before loading secondary chrome data.
    const initialLoad = window.setTimeout(() => void loadNotifications(), 750);
    const refresh = () => {
      if (document.visibilityState === "visible") void loadNotifications(false);
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadNotifications]);

  return (
    <>
      <header
        className={cn(
          "app-header sticky top-0 z-30 border-b border-border bg-card transition-transform duration-150 ease-out",
          !headerVisible && "-translate-y-full",
        )}
      >
        <div className="relative flex h-[4.5rem] items-center gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMobileMenuOpen}
              aria-label="Open navigation"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Link
              href="/hr/dashboard"
              className={cn("hidden items-center gap-2 xl:flex", sidebarExpanded && "xl:hidden")}
              aria-label={organizationName || "Triple Minds HR"}
            >
              <BrandLogo compact />
            </Link>
            <div className="flex min-w-0 items-center gap-2" aria-label="Current workspace">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              <span className="min-w-0 leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {currentWorkspace.phase}
                </span>
                <span className="block truncate text-xs font-semibold text-foreground">
                  {currentWorkspace.label}
                </span>
              </span>
            </div>
          </div>

          <div className="absolute left-1/2 hidden w-[min(42vw,28rem)] -translate-x-1/2 lg:block">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="app-search w-full justify-start gap-2 text-left"
                asChild
              >
                <Link href="/hr/search">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">Search candidates, employees, jobs…</span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" asChild className="lg:hidden">
              <Link href="/hr/search" aria-label="Search">
                <Search className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "h-10 gap-2 rounded-xl px-2 text-muted-foreground hover:text-foreground sm:px-3",
                archiveActive &&
                  "bg-primary-light text-primary-ink hover:bg-primary-light dark:bg-primary-light/60",
              )}
            >
              <Link
                href="/hr/archive"
                aria-label="Open candidate archive"
                title="Candidate archive"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Archive</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={toggleAccountTheme}
              aria-label={
                themeMounted && accountTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <Sun
                className={cn(
                  "h-5 w-5 transition-all",
                  accountTheme === "dark" ? "-rotate-90 scale-0" : "rotate-0 scale-100",
                )}
                aria-hidden="true"
              />
              <Moon
                className={cn(
                  "absolute h-5 w-5 transition-all",
                  accountTheme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0",
                )}
                aria-hidden="true"
              />
            </Button>

            <DropdownMenu
              onOpenChange={(open) => {
                if (open) void loadNotifications(false, true);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
                  aria-label={
                    unreadNotificationCount
                      ? `${unreadNotificationCount} unread notifications`
                      : "Notifications"
                  }
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unreadNotificationCount > 0 && (
                    <span
                      className="absolute right-1.5 top-1.5 flex min-h-2 min-w-2 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-3 text-destructive-foreground"
                      aria-hidden="true"
                    >
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-medium">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationsLoading && (
                  <DropdownMenuItem className="text-sm text-muted-foreground" disabled>
                    Loading notifications…
                  </DropdownMenuItem>
                )}
                {!notificationsLoading && notificationsError && (
                  <DropdownMenuItem className="text-sm text-destructive" disabled>
                    Notifications could not be loaded
                  </DropdownMenuItem>
                )}
                {!notificationsLoading && !notificationsError && !notifications.length && (
                  <DropdownMenuItem className="text-sm text-muted-foreground" disabled>
                    You’re all caught up
                  </DropdownMenuItem>
                )}
                {!notificationsLoading &&
                  !notificationsError &&
                  notifications.map((notification) => {
                    const href = notification.actionableUrl?.startsWith("/")
                      ? notification.actionableUrl
                      : "/hr/notifications";
                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        asChild
                        className={cn("items-start gap-2", !notification.readAt && "bg-primary/5")}
                      >
                        <Link href={href} className="grid w-full gap-1 whitespace-normal">
                          <span className="flex items-center gap-2 font-medium">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                notification.readAt ? "bg-muted" : "bg-primary",
                              )}
                              aria-hidden="true"
                            />
                            {notification.title}
                          </span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {notification.body}
                          </span>
                          <time
                            className="text-[10px] text-muted-foreground"
                            dateTime={notification.createdAt}
                          >
                            {new Date(notification.createdAt).toLocaleString()}
                          </time>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/hr/notifications" className="w-full">
                    View all notifications
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label={`${userName || "User"} profile menu`}
                >
                  <Avatar
                    className="h-10 w-10"
                    src={userAvatar}
                    alt={userName || "User avatar"}
                    fallback={<User className="h-5 w-5 text-primary-ink" aria-hidden="true" />}
                  />
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
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-destructive focus:text-destructive flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {showPhaseNavigation && (
          <nav
            className="header-prism-nav hidden min-h-11 items-center gap-1 overflow-visible px-4 sm:px-6 lg:flex"
            aria-label="Workspace navigation"
          >
            {visibleHeaderNavigation.map((group) => {
              const active = group.links.some(
                ([, href]) => appPath === href || appPath.startsWith(`${href}/`),
              );
              return (
                <HeaderPhaseMenu
                  key={group.label}
                  group={group}
                  active={active}
                  activePhase={activePhase}
                  onPhaseChange={onPhaseChange}
                />
              );
            })}
          </nav>
        )}
      </header>
    </>
  );
}
