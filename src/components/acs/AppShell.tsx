import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  UserCircle2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AcsLogo } from "@/components/acs/AcsLogo";
import { useAcsStore } from "@/lib/acs-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const READ_NOTIFICATIONS_KEY = "acs_read_notifications_v1";

type AppRoutePath =
  | "/"
  | "/recruitment"
  | "/uniforms"
  | "/attendance"
  | "/esi-pf"
  | "/salary"
  | "/payslips"
  | "/billing"
  | "/settings";

interface RouteSearchTarget {
  to: AppRoutePath;
  search?: { tab: "profile" | "settings" };
}

interface NavItem {
  title: string;
  to: AppRoutePath;
  search?: { tab: "profile" | "settings" };
  icon: LucideIcon;
  section: string;
  keywords: string[];
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [
      {
        title: "Dashboard",
        to: "/",
        icon: LayoutDashboard,
        section: "Overview",
        keywords: ["dashboard", "home", "overview", "summary", "kpi"],
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        title: "Recruitment",
        to: "/recruitment",
        icon: UserPlus,
        section: "Operations",
        keywords: ["recruitment", "hiring", "candidate", "employee", "application", "guard"],
      },
      {
        title: "Uniforms & Accessories",
        to: "/uniforms",
        icon: Shirt,
        section: "Operations",
        keywords: ["uniform", "uniforms", "accessories", "stock", "shirt", "pant", "belt", "shoe", "badge", "cap", "jacket", "helmet", "id card", "kit", "registration"],
      },
      {
        title: "Attendance",
        to: "/attendance",
        icon: CalendarCheck2,
        section: "Operations",
        keywords: ["attendance", "shift", "present", "absent", "checkin", "duty"],
      },
    ],
  },
  {
    label: "PAYROLL & COMPLIANCE",
    items: [
      {
        title: "ESI & PF Management",
        to: "/esi-pf",
        icon: ShieldCheck,
        section: "Payroll & Compliance",
        keywords: ["esi", "esic", "pf", "epf", "uan", "statutory", "compliance"],
      },
      {
        title: "Salary Generation",
        to: "/salary",
        icon: FileSpreadsheet,
        section: "Payroll & Compliance",
        keywords: ["salary", "payroll", "wages", "pay", "deduction"],
      },
      {
        title: "Payslips",
        to: "/payslips",
        icon: FileText,
        section: "Payroll & Compliance",
        keywords: ["payslip", "slip", "salary slip", "pdf"],
      },
    ],
  },
  {
    label: "FINANCE",
    items: [
      {
        title: "Billing",
        to: "/billing",
        icon: ReceiptText,
        section: "Finance",
        keywords: ["billing", "invoice", "gst", "payment", "client"],
      },
    ],
  },
];

const ALL_SEARCH_MODULES: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  {
    title: "Settings",
    to: "/settings",
    search: { tab: "settings" },
    icon: Settings,
    section: "System",
    keywords: ["settings", "company", "logo", "preferences", "users"],
  },
  {
    title: "Admin Profile",
    to: "/settings",
    search: { tab: "profile" },
    icon: UserCircle2,
    section: "System",
    keywords: ["profile", "admin profile", "account", "password", "my account"],
  },
];

function moduleToTarget(moduleName: string): RouteSearchTarget {
  const m = moduleName.toLowerCase();
  if (m.includes("recruit")) return { to: "/recruitment" };
  if (m.includes("uniform")) return { to: "/uniforms" };
  if (m.includes("attend")) return { to: "/attendance" };
  if (m.includes("esi") || m.includes("pf") || m.includes("statut")) return { to: "/esi-pf" };
  if (m.includes("payslip")) return { to: "/payslips" };
  if (m.includes("payroll") || m.includes("salary")) return { to: "/salary" };
  if (m.includes("bill") || m.includes("invoice")) return { to: "/billing" };
  if (m.includes("auth") || m.includes("profile")) {
    return { to: "/settings", search: { tab: "profile" } };
  }
  if (m.includes("setting")) {
    return { to: "/settings", search: { tab: "settings" } };
  }
  return { to: "/" };
}

function readStoredReadIds(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function AcsSidebar({
  isProfileView,
  onLogoutClick,
}: {
  isProfileView: boolean;
  onLogoutClick: () => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data } = useAcsStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
        <Link to="/" className="outline-none">
          <AcsLogo compact={collapsed} initials={data.settings.logoInitials} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="rounded-lg font-medium data-[active=true]:bg-brand-accent-soft data-[active=true]:font-semibold data-[active=true]:text-primary"
                      >
                        <Link to={item.to}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/settings" && !isProfileView}
              tooltip="Settings"
              className="rounded-lg font-medium data-[active=true]:bg-brand-accent-soft data-[active=true]:font-semibold data-[active=true]:text-primary"
            >
              <Link to="/settings" search={{ tab: "settings" }}>
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isProfileView}
              tooltip="Admin Profile"
              className="rounded-lg font-medium data-[active=true]:bg-brand-accent-soft data-[active=true]:font-semibold data-[active=true]:text-primary"
            >
              <Link to="/settings" search={{ tab: "profile" }}>
                <UserCircle2 className="size-4" />
                <span>Admin Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={onLogoutClick}
              className="rounded-lg font-medium text-danger hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useAcsStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const locationState = useRouterState({ select: (s) => s.location });
  const pathname = locationState.pathname;
  const searchObj = locationState.search as Record<string, unknown> | undefined;
  const searchTab = searchObj?.["tab"];
  const searchView = searchObj?.["view"];
  const searchSite = typeof searchObj?.["site"] === "string" ? searchObj["site"] : "";
  const isProfileView = pathname === "/settings" && searchTab === "profile";
  const isIssueUniformView = pathname === "/uniforms" && searchView === "issue";
  const isAttendanceSiteView = pathname === "/attendance" && Boolean(searchSite.trim());

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setReadIds(readStoredReadIds());
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const currentTitle = isProfileView
    ? "Admin Profile"
    : isIssueUniformView
      ? "Issue Uniforms & Accessories"
      : isAttendanceSiteView
        ? `${searchSite} — Attendance`
        : (ALL_SEARCH_MODULES.find((r) => r.to === pathname)?.title ?? "Dashboard");
  const currentSection = isProfileView
    ? "System"
    : isIssueUniformView || isAttendanceSiteView
      ? "Operations"
      : (ALL_SEARCH_MODULES.find((r) => r.to === pathname)?.section ?? "Overview");

  const displayName = user?.name || "Administrator";
  const displaySub = user?.jobTitle || user?.email || "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: { label: string; sub: string; target: RouteSearchTarget }[] = [];

    ALL_SEARCH_MODULES.forEach((mod) => {
      const matched =
        mod.title.toLowerCase().includes(q) ||
        mod.section.toLowerCase().includes(q) ||
        mod.keywords.some((kw) => kw.includes(q) || q.includes(kw));
      if (matched) {
        hits.push({
          label: mod.title,
          sub: `Module · ${mod.section}`,
          target: mod.search ? { to: mod.to, search: mod.search } : { to: mod.to },
        });
      }
    });

    data.candidates.forEach((c) => {
      if (
        c.fullName.toLowerCase().includes(q) ||
        (c.employeeId ?? "").toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q)
      ) {
        hits.push({
          label: c.employeeId ? `${c.fullName} (${c.employeeId})` : c.fullName,
          sub: `Candidate · ${c.position}`,
          target: { to: "/recruitment" },
        });
      }
    });

    data.uniforms.forEach((u) => {
      const label = u.subCategory || u.category;
      if (
        label.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
      ) {
        hits.push({
          label: `${label} (${u.size})`,
          sub: `Uniforms & Accessories · ₹${u.unitPrice ?? 0} · ${u.availableQty} avail`,
          target: { to: "/uniforms" },
        });
      }
    });

    data.attendance.forEach((a) => {
      if (
        a.employeeName.toLowerCase().includes(q) ||
        a.employeeId.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      ) {
        hits.push({
          label: a.employeeName,
          sub: `Attendance · ${a.date} (${a.status})`,
          target: { to: "/attendance" },
        });
      }
    });

    data.salaries.forEach((s) => {
      if (s.employeeName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q)) {
        hits.push({
          label: s.employeeName,
          sub: `Salary · ${s.month} (${s.status})`,
          target: { to: "/salary" },
        });
      }
    });

    data.payslips.forEach((p) => {
      if (
        p.payslipId.toLowerCase().includes(q) ||
        p.employeeName.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q)
      ) {
        hits.push({
          label: p.payslipId,
          sub: `Payslip · ${p.employeeName}`,
          target: { to: "/payslips" },
        });
      }
    });

    data.invoices.forEach((inv) => {
      if (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.site.toLowerCase().includes(q)
      ) {
        hits.push({
          label: inv.invoiceNumber,
          sub: `Invoice · ${inv.clientName}`,
          target: { to: "/billing" },
        });
      }
    });

    const seen = new Set<string>();
    return hits
      .filter((hit) => {
        const key = `${hit.label}::${hit.target.to}::${hit.target.search?.tab ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [query, data.candidates, data.uniforms, data.attendance, data.salaries, data.payslips, data.invoices]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, searchResults.length]);

  const navigateToTarget = (target: RouteSearchTarget) => {
    if (target.search) {
      void navigate({ to: "/settings", search: target.search });
    } else {
      void navigate({ to: target.to });
    }
    setQuery("");
    setSearchOpen(false);
  };

  const notifications = useMemo(() => {
    const items: {
      id: string;
      title: string;
      detail: string;
      time: string;
      target: RouteSearchTarget;
    }[] = [];

    const lowStockCount = data.uniforms.filter((u) => u.availableQty <= 15).length;
    if (lowStockCount > 0) {
      items.push({
        id: `alert-low-stock-${lowStockCount}`,
        title: `${lowStockCount} uniform item${lowStockCount === 1 ? "" : "s"} low on stock`,
        detail: "Inventory requires replenishment",
        time: "Alert",
        target: { to: "/uniforms" },
      });
    }

    const pendingSalaryCount = data.salaries.filter((s) => s.status === "Pending").length;
    if (pendingSalaryCount > 0) {
      items.push({
        id: `alert-pending-salary-${pendingSalaryCount}-${data.settings.defaultMonth}`,
        title: `${pendingSalaryCount} pending salar${pendingSalaryCount === 1 ? "y" : "ies"}`,
        detail: `Reporting period: ${data.settings.defaultMonth}`,
        time: "Alert",
        target: { to: "/salary" },
      });
    }

    const overdueCount = data.invoices.filter((i) => i.status === "Overdue").length;
    if (overdueCount > 0) {
      items.push({
        id: `alert-overdue-inv-${overdueCount}`,
        title: `${overdueCount} overdue client invoice${overdueCount === 1 ? "" : "s"}`,
        detail: "Requires billing follow-up",
        time: "Alert",
        target: { to: "/billing" },
      });
    }

    data.activities.slice(0, 12).forEach((act) => {
      items.push({
        id: act.id || `${act.title}-${act.detail}`,
        title: act.title,
        detail: act.detail,
        time: act.timestamp || "Recent",
        target: moduleToTarget(act.module),
      });
    });

    return items;
  }, [data.activities, data.uniforms, data.salaries, data.invoices, data.settings.defaultMonth]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)).length,
    [notifications, readIds],
  );

  const persistReadIds = (next: string[]) => {
    setReadIds(next);
    try {
      window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next.slice(-100)));
    } catch {
      // Ignore storage errors
    }
  };

  const markNotificationRead = (id: string) => {
    if (!readIds.includes(id)) {
      persistReadIds([...readIds, id]);
    }
  };

  const markAllRead = () => {
    const allIds = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    persistReadIds(allIds);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AcsSidebar isProfileView={isProfileView} onLogoutClick={() => setLogoutOpen(true)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="shrink-0" />
              <div className="min-w-0">
                <Breadcrumb className="hidden sm:block">
                  <BreadcrumbList className="text-[11px]">
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild><Link to="/">ACS</Link></BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem><BreadcrumbPage>{currentSection}</BreadcrumbPage></BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">{currentTitle}</h1>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <div ref={searchContainerRef} className="relative w-full max-w-[210px] sm:max-w-xs lg:max-w-sm">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const picked = searchResults[activeIndex] ?? searchResults[0];
                    if (picked) {
                      navigateToTarget(picked.target);
                    } else if (query.trim()) {
                      setSearchOpen(true);
                    }
                  }}
                  className="relative flex items-center"
                >
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    aria-label="Global search"
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearchOpen(false);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSearchOpen(true);
                        setActiveIndex((prev) =>
                          searchResults.length > 0 ? (prev + 1) % searchResults.length : 0,
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSearchOpen(true);
                        setActiveIndex((prev) =>
                          searchResults.length > 0
                            ? (prev - 1 + searchResults.length) % searchResults.length
                            : 0,
                        );
                      }
                    }}
                    placeholder="Search modules, staff, invoices..."
                    className="h-9 w-full rounded-lg bg-background pr-16 pl-8 text-xs"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        setSearchOpen(false);
                      }}
                      className="absolute right-10 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    aria-label="Go to search result"
                    className="absolute right-1 h-7 px-2 text-[11px]"
                  >
                    Go
                  </Button>
                </form>

                {searchOpen && query.trim().length > 0 && (
                  <div
                    role="listbox"
                    aria-label="Search suggestions"
                    className="absolute top-11 right-0 z-30 max-h-80 w-full min-w-[270px] overflow-y-auto rounded-xl border bg-card p-1.5 shadow-lg"
                  >
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No matching modules or records found.
                      </p>
                    ) : (
                      searchResults.map((hit, i) => (
                        <button
                          key={`${hit.label}-${hit.sub}-${i}`}
                          type="button"
                          onClick={() => navigateToTarget(hit.target)}
                          className={cn(
                            "flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary",
                            i === activeIndex && "bg-secondary",
                          )}
                        >
                          <span className="text-xs font-semibold text-foreground">{hit.label}</span>
                          <span className="text-[11px] text-muted-foreground">{hit.sub}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Notifications" className="relative shrink-0 rounded-lg">
                    <Bell className="size-4 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span
                        data-testid="unread-notification-badge"
                        className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-primary-foreground"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-brand-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <CheckCheck className="size-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 divide-y divide-border overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-3.5 py-6 text-center text-xs text-muted-foreground">
                        No recent notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => {
                        const isUnread = !readIds.includes(n.id);
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotificationsOpen(false);
                              navigateToTarget(n.target);
                            }}
                            className={cn(
                              "flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary/70",
                              isUnread && "bg-brand-accent-soft/30",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-xs text-foreground", isUnread ? "font-semibold" : "font-medium")}>
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                            </div>
                            <span className="line-clamp-2 text-[11px] text-muted-foreground">{n.detail}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Link
                to="/settings"
                search={{ tab: "profile" }}
                aria-label="Open Admin Profile"
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-secondary"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-xs font-semibold text-foreground">{displayName}</p>
                  {displaySub && <p className="text-[11px] text-muted-foreground">{displaySub}</p>}
                </div>
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of ACS Admin Panel?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your active administrator session and returned to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setLogoutOpen(false);
                await logout();
                toast.success("Signed out successfully.");
              }}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
