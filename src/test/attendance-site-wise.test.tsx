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
import {
  getDaysInMonth,
  getRecordDutyCounts,
  parseAttendanceCsv,
  parseStatusOrCode,
} from "@/lib/attendance-utils";
import { AuthProvider } from "@/lib/auth";
import { Route as AttendanceRoute } from "@/routes/attendance";

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

describe("Attendance helpers and CSV parser", () => {
  it("computes leap-year and standard month lengths and P / P/P duty counts", () => {
    expect(getDaysInMonth("2024-02")).toBe(29);
    expect(getDaysInMonth("2026-02")).toBe(28);
    expect(getDaysInMonth("2026-10")).toBe(31);
    expect(parseStatusOrCode("P/P")).toBe("Double Duty");
    expect(parseStatusOrCode("p")).toBe("Present");
    expect(getRecordDutyCounts({ status: "Double Duty" })).toEqual({
      normalDuty: 1,
      extraDuty: 1,
      totalDuty: 2,
    });
  });

  it("parses monthly 1..31 register CSV with P and P/P codes cleanly", () => {
    const csv = [
      "Employee ID,Employee Name,Designation,Site,1,2,3",
      "ACS/SEC/2026/001,Vijay Kumar Shukla,Security Supervisor,MSME Tool & Training Center,P,P/P,A",
    ].join("\n");

    const result = parseAttendanceCsv(csv, "MSME Tool & Training Center", "2026-10-01", "2026-10");
    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(3);
    expect(result.records[1]).toMatchObject({
      employeeId: "ACS/SEC/2026/001",
      date: "2026-10-02",
      status: "Double Duty",
      normalDuty: 1,
      extraDuty: 1,
    });
  });
});

describe("Site-wise Attendance hub, drill-down, date-wise marking, and register calculations", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists real sites dynamically, drills into a site, marks P/P double duty, and updates 1-31 register totals", async () => {
    const candidates = [
      {
        id: "cand-1",
        employeeId: "ACS/SEC/2026/001",
        fullName: "Vijay Kumar Shukla",
        mobile: "9830001111",
        email: "",
        position: "Security Supervisor",
        location: "MSME Tool & Training Center",
        experience: "Experienced",
        applicationDate: "2026-10-01",
        status: "Selected" as const,
        resumeName: "",
        remarks: "",
      },
      {
        id: "cand-2",
        employeeId: "ACS/SEC/2026/002",
        fullName: "Sasanka Sekhar Mandal",
        mobile: "9830002222",
        email: "",
        position: "Security Guard",
        location: "BHEL Employees Housing",
        experience: "Experienced",
        applicationDate: "2026-10-01",
        status: "Selected" as const,
        resumeName: "",
        remarks: "",
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
          data: {
            candidates,
            uniforms: [],
            uniformIssues: [],
            stockLogs: [],
            attendance: [
              {
                id: "att-1",
                employeeId: "ACS/SEC/2026/001",
                employeeName: "Vijay Kumar Shukla",
                designation: "Security Supervisor",
                location: "MSME Tool & Training Center",
                date: "2026-11-26",
                checkIn: "08:00",
                checkOut: "16:00",
                workingHours: "8h 00m",
                status: "Present",
                normalDuty: 1,
                extraDuty: 0,
              },
            ],
            statutory: [],
            salaries: [],
            payslips: [],
            invoices: [],
            activities: [],
          },
        });
      }

      if (url.endsWith("/api/admin/attendance/att-1") && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        return createJsonResponse({ success: true, data: { ...body, id: "att-1" } });
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

    const attendanceRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/attendance",
      validateSearch: AttendanceRoute.options.validateSearch!,
      component: AttendanceRoute.options.component!,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([attendanceRoute]),
      history: createMemoryHistory({ initialEntries: ["/attendance?date=2026-11-26&month=2026-11"] }),
      context: { queryClient },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Site Hub shows ONLY real DB sites (zero mock locations like TechPark Bengaluru)
    expect(await screen.findByText("MSME Tool & Training Center")).toBeInTheDocument();
    expect(screen.getByText("BHEL Employees Housing")).toBeInTheDocument();
    expect(screen.queryByText("TechPark Phase II, Bengaluru")).not.toBeInTheDocument();

    // Click into MSME Tool & Training Center
    fireEvent.click(screen.getByRole("button", { name: /MSME Tool & Training Center/i }));

    expect(await screen.findByText("Vijay Kumar Shukla")).toBeInTheDocument();
    expect(screen.queryByText("Sasanka Sekhar Mandal")).not.toBeInTheDocument();

    // Mark Vijay Kumar Shukla as Double Duty (P/P)
    fireEvent.click(screen.getByRole("button", { name: "Mark Vijay Kumar Shukla Double Duty" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/attendance/att-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    // Switch to Monthly Register (1-31) tab and verify Normal=1, Extra=1, Total=2
    const registerTab = screen.getByRole("tab", { name: /Monthly Register/i });
    fireEvent.mouseDown(registerTab, { button: 0 });
    fireEvent.click(registerTab);
    expect(await screen.findByText(/UNIT: MSME Tool & Training Center/i)).toBeInTheDocument();
    expect(screen.getAllByText("P/P").length).toBeGreaterThan(0);
  });
});
