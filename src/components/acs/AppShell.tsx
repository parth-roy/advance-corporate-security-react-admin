import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck2,
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

interface NavItem {
  title: string;
  to: AppRoutePath;
  icon: LucideIcon;
  section: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [{ title: "Dashboard", to: "/", icon: LayoutDashboard, section: "Overview" }],
  },
  {
    label: "OPERATIONS",
    items: [
      { title: "Recruitment", to: "/recruitment", icon: UserPlus, section: "Operations" },
      { title: "Uniform Management", to: "/uniforms", icon: Shirt, section: "Operations" },
      { title: "Attendance", to: "/attendance", icon: CalendarCheck2, section: "Operations" },
    ],
  },
  {
    label: "PAYROLL & COMPLIANCE",
    items: [
      { title: "ESI & PF Management", to: "/esi-pf", icon: ShieldCheck, section: "Payroll & Compliance" },
      { title: "Salary Generation", to: "/salary", icon: FileSpreadsheet, section: "Payroll & Compliance" },
      { title: "Payslips", to: "/payslips", icon: FileText, section: "Payroll & Compliance" },
    ],
  },
  {
    label: "FINANCE",
    items: [{ title: "Billing", to: "/billing", icon: ReceiptText, section: "Finance" }],
  },
];

const ALL_ROUTES: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  { title: "Settings", to: "/settings", icon: Settings, section: "System" },
];

function AcsSidebar({ onLogoutClick }: { onLogoutClick: () => void }) {
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
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings" className="rounded-lg font-medium">
              <Link to="/settings"><Settings className="size-4" /><span>Settings</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Admin Profile" className="rounded-lg font-medium">
              <Link to="/settings"><UserCircle2 className="size-4" /><span>Admin Profile</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={onLogoutClick} className="rounded-lg font-medium text-danger hover:bg-danger-soft hover:text-danger">
              <LogOut className="size-4" /><span>Logout</span>
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const current = ALL_ROUTES.find((r) => r.to === pathname) ?? ALL_ROUTES[0]!;
  const displayName = user?.name || data.settings.adminName;
  const displaySub = user?.email || data.settings.adminRole;
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: { label: string; sub: string; to: AppRoutePath }[] = [];
    ALL_ROUTES.forEach((r) => {
      if (r.title.toLowerCase().includes(q)) hits.push({ label: r.title, sub: `Module · ${r.section}`, to: r.to });
    });
    data.candidates.forEach((c) => {
      if (c.fullName.toLowerCase().includes(q) || c.position.toLowerCase().includes(q)) {
        hits.push({ label: c.fullName, sub: `Candidate · ${c.position}`, to: "/recruitment" });
      }
    });
    data.invoices.forEach((inv) => {
      if (inv.invoiceNumber.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q)) {
        hits.push({ label: inv.invoiceNumber, sub: `Invoice · ${inv.clientName}`, to: "/billing" });
      }
    });
    return hits.slice(0, 6);
  }, [query, data.candidates, data.invoices]);

  const notifications = [
    { id: "n1", title: `${data.uniforms.filter((u) => u.availableQty <= 15).length} uniform items low on stock`, to: "/uniforms" as const },
    { id: "n2", title: `${data.salaries.filter((s) => s.status === "Pending").length} pending salaries for ${data.settings.defaultMonth}`, to: "/salary" as const },
    { id: "n3", title: `${data.invoices.filter((i) => i.status === "Overdue").length} overdue client invoice requires follow-up`, to: "/billing" as const },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AcsSidebar onLogoutClick={() => setLogoutOpen(true)} />

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
                    <BreadcrumbItem><BreadcrumbPage>{current.section}</BreadcrumbPage></BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">{current.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 160)}
                  onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                  placeholder="Search modules, candidates, invoices..."
                  className="h-9 w-64 rounded-lg bg-background pl-9 text-xs lg:w-72"
                />
                {searchOpen && query.trim().length > 0 && (
                  <div className="absolute top-11 right-0 z-30 w-80 rounded-xl border bg-card p-1.5 shadow-lg">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No matching records.</p>
                    ) : (
                      searchResults.map((hit, i) => (
                        <button
                          key={`${hit.label}-${i}`}
                          type="button"
                          onMouseDown={() => {
                            void navigate({ to: hit.to });
                            setQuery("");
                            setSearchOpen(false);
                          }}
                          className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-secondary"
                        >
                          <span className="text-xs font-semibold text-foreground">{hit.label}</span>
                          <span className="text-[11px] text-muted-foreground">{hit.sub}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Notifications" className="relative rounded-lg">
                    <Bell className="size-4 text-muted-foreground" />
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-accent" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">Notifications</p>
                  <div className="space-y-1">
                    {notifications.map((n) => (
                      <Link key={n.id} to={n.to} className="block rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-secondary">
                        {n.title}
                      </Link>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Link to="/settings" className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-secondary">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-xs font-semibold text-foreground">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{displaySub}</p>
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
            <AlertDialogDescription>You will be signed out of your active administrator session and returned to the login screen.</AlertDialogDescription>
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