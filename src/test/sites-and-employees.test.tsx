import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { deriveDynamicSites, deriveSiteEmployees } from "@/lib/attendance-utils";
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import { Route as RecruitmentRoute } from "@/routes/recruitment";
import { Route as SettingsRoute } from "@/routes/settings";

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Phase 1: Site Master, Candidate->Employee Deployment & Paginated Employee Directory", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives dynamic sites and workforce from normalized AdminSite and AdminEmployee first", () => {
    const sites = deriveDynamicSites({
      ...INITIAL_ACS_DATA,
      sites: [
        {
          id: "site-1",
          siteCode: "FSSAI-KOL",
          siteName: "FSSAI ERO Kolkata",
          clientName: "FSSAI",
          gstMode: "INTRA_CGST_SGST",
          isActive: true,
        },
        {
          id: "site-arch",
          siteCode: "OLD-UNIT",
          siteName: "Archived Unit",
          clientName: "Old",
          gstMode: "RCM",
          isActive: false,
        },
      ],
      candidates: [],
      attendance: [],
      salaries: [],
      statutory: [],
      invoices: [],
    });

    expect(sites).toEqual(["FSSAI ERO Kolkata"]);

    const roster = deriveSiteEmployees(
      {
        ...INITIAL_ACS_DATA,
        employees: [
          {
            id: "emp-1",
            empCode: "ACS/SEC/2026/001",
            siteName: "FSSAI ERO Kolkata",
            fullName: "Anupam Sarkar",
            mobile: "9830000001",
            designation: "Security Guard",
            rateType: "DAILY",
            baseRate: 1008,
            status: "ACTIVE",
          },
          {
            id: "emp-left",
            empCode: "ACS/SEC/2026/002",
            siteName: "FSSAI ERO Kolkata",
            fullName: "Exited Staff",
            mobile: "9830000002",
            designation: "Security Guard",
            rateType: "DAILY",
            baseRate: 1008,
            status: "LEFT",
          },
        ],
        candidates: [],
        attendance: [],
        salaries: [],
        statutory: [],
      },
      "FSSAI ERO Kolkata",
    );

    expect(roster).toHaveLength(1);
    expect(roster[0]?.employeeName).toBe("Anupam Sarkar");
    expect(roster[0]?.employeeId).toBe("ACS/SEC/2026/001");
  });

  it("manages Client Sites under /settings?tab=sites with GST auto-detection and site creation", async () => {
    const sitesDb = [
      {
        id: "site-1",
        siteCode: "MSME-TOOL",
        siteName: "MSME Tool & Training Center",
        clientName: "Central Tool Room & Training Centre",
        clientGstin: "19AAATC0001A1Z5",
        stateCode: "19",
        gstMode: "RCM" as const,
        sacCode: "998525",
        serviceChargePct: 0,
        subUnits: ["S.S", "S.G"],
        isActive: true,
        employeeCount: 25,
      },
    ];

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/admin/auth/me")) {
        return createJsonResponse({
          success: true,
          data: {
            user: {
              id: "u1",
              name: "Admin",
              email: "admin@advancecorporatesecurity.com",
              role: "super_admin",
              isActive: true,
            },
          },
        });
      }

      if (url.endsWith("/api/admin/overview")) {
        return createJsonResponse({
          success: true,
          data: { ...INITIAL_ACS_DATA, sites: sitesDb, employees: [] },
        });
      }

      if (url.includes("/api/admin/sites?") && method === "GET") {
        return createJsonResponse({
          success: true,
          data: sitesDb,
          pagination: {
            page: 1,
            limit: 15,
            total: sitesDb.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
          summary: {
            totalSites: sitesDb.length,
            activeSites: sitesDb.length,
            inactiveSites: 0,
            totalAssignedEmployees: 25,
          },
        });
      }

      if (url.endsWith("/api/admin/sites") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const created = { ...body, id: "site-2", siteCode: body.siteCode || "NIELIT-PATNA", employeeCount: 0 };
        sitesDb.push(created);
        return createJsonResponse({ success: true, data: created }, 201);
      }

      return createJsonResponse({ success: true, data: {} });
    });

    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
      component: () => (
        <AuthProvider>
          <AcsStoreProvider>
            <Outlet />
          </AcsStoreProvider>
        </AuthProvider>
      ),
    });
    const settingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/settings",
      validateSearch: SettingsRoute.options.validateSearch!,
      component: SettingsRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([settingsRoute]),
      history: createMemoryHistory({ initialEntries: ["/settings?tab=sites"] }),
      context: { queryClient },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("MSME Tool & Training Center")).toBeInTheDocument();
    expect(screen.getByText("MSME-TOOL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add Client Site/i }));
    fireEvent.change(await screen.findByLabelText("Site Name *"), {
      target: { value: "NIELIT Patna" },
    });
    fireEvent.change(screen.getByLabelText("Client GSTIN"), {
      target: { value: "10AAATD0315M1ZC" },
    });
    expect(screen.getByLabelText("State Code")).toHaveValue("10");

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith("/api/admin/sites") && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(String(postCall?.[1]?.body));
      expect(body.siteName).toBe("NIELIT Patna");
      expect(body.stateCode).toBe("10");
      expect(body.gstMode).toBe("INTER_IGST");
    });
  });

  it("deploys a candidate into Employee Directory and queries paginated employees", async () => {
    const candidate = {
      id: "cand-1",
      employeeId: "",
      fullName: "Pratik Chakraborty",
      mobile: "9831122334",
      email: "",
      position: "Security Guard",
      location: "TRSL Titagarh",
      experience: "Experienced",
      applicationDate: "2026-10-01",
      salary: "489",
      status: "Shortlisted" as const,
      resumeName: "",
      remarks: "",
    };

    const employeesDb: Record<string, any>[] = [];

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/admin/auth/me")) {
        return createJsonResponse({
          success: true,
          data: {
            user: {
              id: "u1",
              name: "Admin",
              email: "admin@advancecorporatesecurity.com",
              role: "super_admin",
              isActive: true,
            },
          },
        });
      }

      if (url.endsWith("/api/admin/overview")) {
        return createJsonResponse({
          success: true,
          data: {
            ...INITIAL_ACS_DATA,
            sites: [
              {
                id: "site-tsl",
                siteCode: "TRSL-TITAGARH",
                siteName: "TRSL Titagarh",
                clientName: "Titagarh Rail Systems",
                gstMode: "RCM",
                isActive: true,
              },
            ],
            employees: employeesDb,
            candidates: [candidate],
          },
        });
      }

      if (url.includes("/api/admin/employees/generate-code")) {
        return createJsonResponse({ success: true, data: { empCode: "ACS/SEC/2026/015" } });
      }

      if (url.endsWith("/api/admin/candidates/cand-1/deploy") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const createdEmp = {
          id: "emp-created-1",
          empCode: body.empCode || "ACS/SEC/2026/015",
          legacyEmpCode: body.legacyEmpCode || "3065",
          candidateId: "cand-1",
          primarySiteId: "site-tsl",
          siteName: body.siteName,
          fullName: candidate.fullName,
          mobile: candidate.mobile,
          designation: body.designation,
          rateType: body.rateType,
          baseRate: body.baseRate,
          status: "ACTIVE",
        };
        employeesDb.push(createdEmp);
        return createJsonResponse({
          success: true,
          data: {
            candidate: {
              ...candidate,
              status: "Selected",
              employeeId: createdEmp.empCode,
              convertedEmployeeObjectId: createdEmp.id,
            },
            employee: createdEmp,
          },
        });
      }

      if (url.includes("/api/admin/employees?") && method === "GET") {
        return createJsonResponse({
          success: true,
          data: employeesDb,
          pagination: {
            page: 1,
            limit: 25,
            total: employeesDb.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
          summary: {
            total: employeesDb.length,
            active: employeesDb.length,
            onHold: 0,
            left: 0,
            transferred: 0,
          },
          filterOptions: { designations: ["Security Guard"] },
        });
      }

      return createJsonResponse({ success: true, data: {} });
    });

    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
      component: () => (
        <AuthProvider>
          <AcsStoreProvider>
            <Outlet />
          </AcsStoreProvider>
        </AuthProvider>
      ),
    });
    const recRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/recruitment",
      validateSearch: RecruitmentRoute.options.validateSearch!,
      component: RecruitmentRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([recRoute]),
      history: createMemoryHistory({ initialEntries: ["/recruitment"] }),
      context: { queryClient },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Pratik Chakraborty")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Deploy Pratik Chakraborty as employee"));
    expect(await screen.findByText("Deploy Candidate as Employee")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("Employee Code (ACS)")).toHaveValue("ACS/SEC/2026/015");
    });

    fireEvent.change(screen.getByLabelText("Legacy Register Code (Optional)"), {
      target: { value: "3065" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Deployment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/candidates/cand-1/deploy"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.queryByText("Deploy Candidate as Employee")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Employee Directory \(1\)/i })).toBeInTheDocument();
    });

    // Switch to Employee Directory tab and see deployed employee listed from /api/admin/employees
    fireEvent.click(screen.getByRole("button", { name: /Employee Directory \(1\)/i }));
    expect(await screen.findByText("Total Deployed Staff")).toBeInTheDocument();
    expect(await screen.findByText("ACS/SEC/2026/015")).toBeInTheDocument();
    expect(screen.getByText("Legacy #3065")).toBeInTheDocument();
    expect(screen.getByText("TRSL Titagarh")).toBeInTheDocument();
  });
});
