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
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import {
  deriveSiteEmployees,
  findRecordForEmployeeDate,
  getDefaultDutyForStatus,
  getExtendedDutyCounts,
  parseAttendanceCellValue,
  parseAttendanceCsv,
  parseStatusOrCode,
} from "@/lib/attendance-utils";
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

describe("Phase 2: Attendance NH, OT Hours, Fractional Shifts, Cross-Site Relievers & Muster Sign-Off", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports National Holiday (NH) and OT hours /8 day-equivalent calculation", () => {
    expect(parseStatusOrCode("NH")).toBe("National Holiday");
    expect(parseStatusOrCode("National Holiday")).toBe("National Holiday");
    expect(getDefaultDutyForStatus("National Holiday")).toEqual({
      normalDuty: 1,
      extraDuty: 0,
      checkIn: "08:00",
      checkOut: "16:00",
      workingHours: "8h 00m",
    });
    expect(
      getExtendedDutyCounts({
        status: "National Holiday",
        normalDuty: 1,
        extraDuty: 0,
        otHours: 4,
      }),
    ).toEqual({
      normalDuty: 1,
      extraDuty: 0,
      otHours: 4,
      otDayEquivalent: 0.5,
      nhDays: 1,
      shiftFraction: 1,
      totalDuty: 1,
    });
  });

  it("parses fractional shifts (0.5, 0.75, 0.333) and daily OT Hours / adjustment CSV columns", () => {
    expect(parseAttendanceCellValue("0.75")).toEqual({
      status: "Present",
      dutyType: "CUSTOM",
      normalDuty: 0.75,
      extraDuty: 0,
      shiftFraction: 0.75,
    });
    expect(parseAttendanceCellValue("0.333")).toEqual({
      status: "Half Day",
      dutyType: "CUSTOM",
      normalDuty: 0.333,
      extraDuty: 0,
      shiftFraction: 0.333,
    });

    const monthlyCsv = [
      "Employee ID,Employee Name,Designation,Site,1,2,3",
      "ACS/FAC/26/001,Kalyan Das,Guard,SOHAM Factory,0.75,0.483,NH",
    ].join("\n");

    const parsedMonthly = parseAttendanceCsv(monthlyCsv, "SOHAM Factory", "2026-10-01", "2026-10");
    expect(parsedMonthly.errors).toHaveLength(0);
    expect(parsedMonthly.records).toHaveLength(3);
    expect(parsedMonthly.records[0]?.shiftFraction).toBe(0.75);
    expect(parsedMonthly.records[0]?.dutyType).toBe("CUSTOM");
    expect(parsedMonthly.records[1]?.normalDuty).toBe(0.483);
    expect(parsedMonthly.records[2]?.status).toBe("National Holiday");

    const dailyCsv = [
      "Employee ID,Employee Name,Designation,Site,Date,Status,OT Hours,Adjustment,Remarks",
      "ACS/SEC/26/010,Birendra Roy,Guard,BHEL Employees Housing,2026-10-05,P,4,ADJUST ERTL,Reliever cover",
    ].join("\n");
    const parsedDaily = parseAttendanceCsv(dailyCsv, "", "2026-10-05", "2026-10");
    expect(parsedDaily.errors).toHaveLength(0);
    expect(parsedDaily.records[0]?.otHours).toBe(4);
    expect(parsedDaily.records[0]?.otDayEquivalent).toBe(0.5);
    expect(parsedDaily.records[0]?.adjustmentNote).toBe("ADJUST ERTL");
  });

  it("keeps home-site and cross-site reliever duties isolated on the same date", () => {
    const storeState = {
      ...INITIAL_ACS_DATA,
      sites: [
        {
          id: "site-ertl",
          siteCode: "ERTL",
          siteName: "ERTL",
          clientName: "ERTL Kolkata",
          gstMode: "INTRA_CGST_SGST" as const,
          isActive: true,
        },
        {
          id: "site-bhel",
          siteCode: "BHEL",
          siteName: "BHEL Employees Housing",
          clientName: "BHEL",
          gstMode: "INTRA_CGST_SGST" as const,
          isActive: true,
        },
      ],
      employees: [
        {
          id: "emp-birendra",
          empCode: "ACS/SEC/2026/004",
          siteName: "ERTL",
          fullName: "Birendra Roy",
          mobile: "9830000004",
          designation: "Security Guard",
          rateType: "DAILY" as const,
          baseRate: 700,
          status: "ACTIVE" as const,
        },
      ],
      attendance: [
        {
          id: "att-ertl-1",
          employeeId: "ACS/SEC/2026/004",
          employeeName: "Birendra Roy",
          designation: "Security Guard",
          location: "ERTL",
          date: "2026-10-05",
          checkIn: "08:00",
          checkOut: "16:00",
          workingHours: "8h 00m",
          status: "Present" as const,
          normalDuty: 1,
          extraDuty: 0,
        },
        {
          id: "att-bhel-1",
          employeeId: "ACS/SEC/2026/004",
          employeeName: "Birendra Roy",
          designation: "Security Guard",
          location: "BHEL Employees Housing",
          date: "2026-10-05",
          checkIn: "16:00",
          checkOut: "24:00",
          workingHours: "8h 00m",
          status: "Present" as const,
          normalDuty: 1,
          extraDuty: 0,
          otHours: 4,
          otDayEquivalent: 0.5,
          isReliever: true,
          primarySiteName: "ERTL",
          adjustmentNote: "ADJUST ERTL",
        },
      ],
    };

    const bhelRoster = deriveSiteEmployees(storeState, "BHEL Employees Housing");
    expect(bhelRoster).toHaveLength(1);
    expect(bhelRoster[0]?.isReliever).toBe(true);
    expect(bhelRoster[0]?.primarySiteName).toBe("ERTL");

    const ertlRec = findRecordForEmployeeDate(
      storeState.attendance,
      { employeeId: "ACS/SEC/2026/004", employeeName: "Birendra Roy", site: "ERTL" },
      "2026-10-05",
    );
    const bhelRec = findRecordForEmployeeDate(
      storeState.attendance,
      {
        employeeId: "ACS/SEC/2026/004",
        employeeName: "Birendra Roy",
        site: "BHEL Employees Housing",
      },
      "2026-10-05",
    );

    expect(ertlRec?.id).toBe("att-ertl-1");
    expect(bhelRec?.id).toBe("att-bhel-1");
    expect(bhelRec?.adjustmentNote).toBe("ADJUST ERTL");
  });

  it("supports reliever assignment, NH marking, and Client Muster Sign-Off upload in Attendance UI", async () => {
    const savedApprovals: Array<{
      verificationStatus?: string;
      verifiedByName?: string;
      attachment?: { fileName?: string };
    }> = [];
    const postedAttendance: Array<{ status?: string }> = [];

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
                id: "site-ertl",
                siteCode: "ERTL",
                siteName: "ERTL",
                clientName: "ERTL Kolkata",
                gstMode: "INTRA_CGST_SGST",
                isActive: true,
              },
              {
                id: "site-bhel",
                siteCode: "BHEL",
                siteName: "BHEL Employees Housing",
                clientName: "BHEL",
                gstMode: "INTRA_CGST_SGST",
                isActive: true,
              },
            ],
            employees: [
              {
                id: "emp-sasanka",
                empCode: "ACS/SEC/2026/001",
                siteName: "BHEL Employees Housing",
                fullName: "Sasanka Sekhar Mandal",
                mobile: "9830000001",
                designation: "Security Supervisor",
                rateType: "DAILY",
                baseRate: 750,
                status: "ACTIVE",
              },
              {
                id: "emp-birendra",
                empCode: "ACS/SEC/2026/004",
                siteName: "ERTL",
                fullName: "Birendra Roy",
                mobile: "9830000004",
                designation: "Security Guard",
                rateType: "DAILY",
                baseRate: 700,
                status: "ACTIVE",
              },
            ],
            attendance: [
              {
                id: "att-ertl-home",
                employeeId: "ACS/SEC/2026/004",
                employeeName: "Birendra Roy",
                designation: "Security Guard",
                location: "ERTL",
                date: "2026-10-05",
                checkIn: "08:00",
                checkOut: "16:00",
                workingHours: "8h 00m",
                status: "Present",
                normalDuty: 1,
                extraDuty: 0,
              },
            ],
          },
        });
      }

      if (url.includes("/api/admin/employees?")) {
        return createJsonResponse({
          success: true,
          data: [
            {
              id: "emp-birendra",
              empCode: "ACS/SEC/2026/004",
              siteName: "ERTL",
              fullName: "Birendra Roy",
              mobile: "9830000004",
              designation: "Security Guard",
              rateType: "DAILY",
              baseRate: 700,
              status: "ACTIVE",
            },
          ],
          pagination: { page: 1, limit: 15, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        });
      }

      if (url.endsWith("/api/admin/attendance") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const created = { id: `att-srv-${postedAttendance.length + 1}`, ...body };
        postedAttendance.push(created);
        return createJsonResponse({ success: true, data: created });
      }

      if (url.endsWith("/api/admin/attendance/muster-approvals/upload") && method === "POST") {
        return createJsonResponse({
          success: true,
          data: {
            fileName: "bhel-oct-2026-signed.pdf",
            fileUrl: "https://cdn.example.com/muster-approvals/bhel-oct-2026-signed.pdf",
            mimeType: "application/pdf",
            uploadedAt: "2026-11-02T10:00:00.000Z",
          },
        });
      }

      if (url.endsWith("/api/admin/attendance/muster-approvals") && method === "PUT") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const doc = { id: "muster-bhel-oct", ...body };
        savedApprovals.push(doc);
        return createJsonResponse({ success: true, data: doc });
      }

      return createJsonResponse({ success: true, data: {} });
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

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
      validateSearch: AttendanceRoute.options.validateSearch,
      component: AttendanceRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([attendanceRoute]),
      history: createMemoryHistory({
        initialEntries: ["/attendance?site=BHEL+Employees+Housing&date=2026-10-05&month=2026-10"],
      }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sasanka Sekhar Mandal")).toBeInTheDocument();
    });

    // Mark Sasanka Sekhar Mandal as National Holiday (NH)
    fireEvent.click(
      screen.getByRole("button", { name: "Mark Sasanka Sekhar Mandal National Holiday" }),
    );
    await waitFor(() => {
      expect(postedAttendance.some((r) => r.status === "National Holiday")).toBe(true);
    });

    // Open Reliever Assign dialog and log Birendra Roy from ERTL
    fireEvent.click(screen.getByRole("button", { name: /Assign Reliever/i }));
    await waitFor(() => {
      expect(screen.getByText(/Assign Cross-Site Reliever Duty/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Birendra Roy/i }));
    fireEvent.change(screen.getByLabelText(/OT Hours/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Reliever Duty/i }));

    await waitFor(() => {
      expect(screen.getByText("Birendra Roy")).toBeInTheDocument();
      expect(screen.getByText("Reliever")).toBeInTheDocument();
      expect(screen.getByText("+4h OT")).toBeInTheDocument();
    });

    // Switch to Monthly Register and verify NH & OT Hrs columns render (Radix Tabs switch on mouseDown)
    const registerTab = screen.getByRole("tab", { name: /Monthly Register/i });
    fireEvent.mouseDown(registerTab, { button: 0, ctrlKey: false });
    fireEvent.click(registerTab);

    await waitFor(() => {
      expect(screen.getByText("UNIT: BHEL Employees Housing · October 2026")).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "NH" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "OT Hrs" })).toBeInTheDocument();
    });

    // Open Muster Sign-Off, upload signed scan, and mark CLIENT_VERIFIED
    fireEvent.click(screen.getByRole("button", { name: /Muster Sign-Off/i }));
    await waitFor(() => {
      expect(screen.getByText(/Muster Roll Verification & Client Sign-Off/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Verified By/i), {
      target: { value: "Pratyush Kiran" },
    });
    fireEvent.change(screen.getByLabelText(/Officer Designation/i), {
      target: { value: "Administrative Officer" },
    });

    const scanInput = screen.getByLabelText(/Upload signed muster scan/i);
    const pdfFile = new File(["%PDF-1.4 sample"], "bhel-oct-2026-signed.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(scanInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText("bhel-oct-2026-signed.pdf")).toBeInTheDocument();
    });

    // Open Radix Select on pointerDown + click, select CLIENT_VERIFIED, and save sign-off
    const stageTrigger = screen.getByLabelText(/Verification Stage/i);
    fireEvent.pointerDown(stageTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(stageTrigger);
    const verifiedOption = await screen.findByRole("option", {
      name: /Client \/ Unit-in-Charge Verified/i,
    });
    fireEvent.click(verifiedOption);
    fireEvent.click(screen.getByRole("button", { name: /Save Sign-Off/i }));

    await waitFor(() => {
      expect(savedApprovals).toHaveLength(1);
      expect(savedApprovals[0]?.verificationStatus).toBe("CLIENT_VERIFIED");
      expect(savedApprovals[0]?.verifiedByName).toBe("Pratyush Kiran");
      expect(savedApprovals[0]?.attachment?.fileName).toBe("bhel-oct-2026-signed.pdf");
    });

    expect(fetchMock).toHaveBeenCalled();
  });
});
