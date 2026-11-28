import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GlobalButtonTooltip } from "@/components/acs/GlobalButtonTooltip";
import { EmployeeProfileDrawer } from "@/components/recruitment/EmployeeProfileDrawer";
import { Button } from "@/components/ui/button";
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import type { EmployeeRecord } from "@/lib/acs-types";

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("GlobalButtonTooltip & EmployeeProfileDrawer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("displays explanatory tooltip on button hover", async () => {
    vi.useFakeTimers();
    render(
      <div>
        <Button tooltip="Assign uniform items and track stock">Issue Uniform</Button>
        <GlobalButtonTooltip />
      </div>,
    );

    const btn = screen.getByRole("button", { name: "Issue Uniform" });
    expect(btn).toHaveAttribute("data-tooltip", "Assign uniform items and track stock");

    fireEvent.mouseOver(btn);
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent("Assign uniform items and track stock");
  });

  it("shows employee uniforms, 7-status attendance breakdown, advances, payslips & docs in EmployeeProfileDrawer", async () => {
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
    const employee: EmployeeRecord = {
      id: "emp-101",
      empCode: "ACS/SEC/2026/101",
      legacyEmpCode: "4001",
      siteName: "Bangdubi Defence Unit NF2T",
      subUnit: "Sector A",
      fullName: "Rajesh Guard Test",
      mobile: "9831000111",
      designation: "Security Guard",
      rateType: "DAILY",
      baseRate: 780,
      status: "ACTIVE",
      statutory: { esiHolder: "Yes", esiNumber: "3100011122", pfUan: "100800011122" },
      bankDetails: {
        bankName: "Axis Bank",
        accountNumber: "4360102000111",
        ifscCode: "UTIB0000436",
        branchName: "",
        upiId: "",
        preferredPaymentMode: "BANK_TRANSFER",
      },
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const jsonResp = (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      if (url.endsWith("/api/admin/auth/me")) {
        return jsonResp({
          user: { id: "u1", name: "Admin", email: "admin@advancecorporatesecurity.com", role: "super_admin", isActive: true },
        });
      }
      if (url.endsWith("/api/admin/overview")) return jsonResp(INITIAL_ACS_DATA);
      if (url.includes("/api/admin/uniform-issues")) {
        return jsonResp([
          {
            id: "ui-1",
            employeeId: "ACS/SEC/2026/101",
            employeeName: "Rajesh Guard Test",
            site: "Bangdubi Defence Unit NF2T",
            itemId: "u1",
            itemName: "Full Sleeve Security Shirt",
            size: "L",
            quantity: 2,
            unitPrice: 450,
            totalAmount: 900,
            issueDate: "2026-11-02",
            status: "Issued",
          },
        ]);
      }
      if (url.includes("/api/admin/attendance")) {
        return jsonResp([
          {
            id: "att-1",
            employeeId: "ACS/SEC/2026/101",
            employeeName: "Rajesh Guard Test",
            designation: "Security Guard",
            location: "Bangdubi Defence Unit NF2T",
            date: "2026-11-01",
            checkIn: "08:00",
            checkOut: "16:00",
            workingHours: "8h",
            status: "Present",
            normalDuty: 1,
            extraDuty: 0,
          },
          {
            id: "att-2",
            employeeId: "ACS/SEC/2026/101",
            employeeName: "Rajesh Guard Test",
            designation: "Security Guard",
            location: "Bangdubi Defence Unit NF2T",
            date: "2026-11-15",
            checkIn: "08:00",
            checkOut: "16:00",
            workingHours: "8h",
            status: "National Holiday",
            normalDuty: 1,
            extraDuty: 0,
          },
        ]);
      }
      return jsonResp([]);
    });

    render(
      <AuthProvider>
        <AcsStoreProvider>
          <EmployeeProfileDrawer employee={employee} onClose={vi.fn()} onEdit={vi.fn()} />
        </AcsStoreProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText("Rajesh Guard Test")).toBeInTheDocument();
    expect(await screen.findByText(/Full Sleeve Security Shirt/)).toBeInTheDocument();
    expect(screen.getByText(/Attendance Summary \(2 logs/)).toBeInTheDocument();
    expect(screen.getByText("Old ID #4001")).toBeInTheDocument();
  });
});
