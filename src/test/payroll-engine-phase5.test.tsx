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
import {
  buildPayslipPrintHtml,
  PayslipPreviewDialog,
} from "@/components/payslips/PayslipPreviewDialog";
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import type {
  BankAdviceResponse,
  ComplianceExportResponse,
  PayrollRunRecord,
  PayslipRecord,
  SalaryLineItemRecord,
  SalaryRuleProfileRecord,
} from "@/lib/acs-types";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { Route as EsiPfRoute } from "@/routes/esi-pf";
import { Route as SalaryRoute } from "@/routes/salary";

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

describe("Phase 5: Site Payroll Rule Profiles, Payroll Runs, EPF ECR/ESIC Exports & Rich Payslips", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("manages Site Salary Rules, generates/adjusts/locks a Payroll Run, and exports Bank Advice in /salary", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-advice");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const rulesState: SalaryRuleProfileRecord[] = [
      {
        id: "rule-balaram",
        profileCode: "BALARAM_CMOH",
        profileName: "Balaram Bose Hosp (CMOH)",
        siteName: "Balaram Bose Hosp",
        effectiveFrom: "2026-01-01",
        isTemplate: true,
        isActive: true,
        wageBasis: "MONTHLY_DIV_26",
        otMethod: "NONE",
        otFixedRate: 0,
        shiftRatioNumerator: 3,
        shiftRatioDenominator: 8,
        allowanceMethod: "NONE",
        fixedAllowanceMonthly: 0,
        bhelEnhancedMonthly: 0,
        grseAllowancePct: 0,
        canteenRatePerDay: 16,
        bonusMode: "IN_GROSS",
        bonusRatePct: 8.33,
        bonusCapType: "NONE",
        epfVariant: "UNCAPPED_12",
        epfWageBase: "PRESENT_WAGES",
        employerEpfRatePct: 13,
        esiVariant: "UNCAPPED_075",
        employerEsiRatePct: 3.25,
        ptSlabType: "WB_STANDARD",
        deductPtFromEmployee: false,
        gemChargeMonthly: 0,
        adminChargeMonthly: 0,
        roundMode: "ROUND",
        notes: "PT not deducted from employee",
      },
    ];

    const runsState: PayrollRunRecord[] = [];
    const lineItemsState: SalaryLineItemRecord[] = [
      {
        id: "li-1",
        payrollRunId: "run-1",
        monthKey: "2026-10",
        monthLabel: "October 2026",
        siteName: "Balaram Bose Hosp",
        ruleProfileId: "rule-balaram",
        ruleProfileCode: "BALARAM_CMOH",
        ruleProfileName: "Balaram Bose Hosp (CMOH)",
        employeeId: "ACS/SEC/2026/001",
        employeeName: "Subrata Roy",
        designation: "Security Guard",
        department: "Site Security",
        uanNumber: "100123456789",
        esiNumber: "4100998877",
        bankName: "AXIS BANK",
        accountNumber: "918010011223344",
        ifscCode: "UTIB0000436",
        wageRate: 10556,
        rateType: "MONTHLY",
        daysInMonth: 31,
        presentDays: 26,
        extraDays: 0,
        otHours: 0,
        nhDays: 0,
        relieverDays: 0,
        presentWages: 10556,
        extraDutyAmount: 0,
        allowanceAmount: 0,
        canteenAllowance: 0,
        bonusInGross: 879.31,
        bonusOutsideGross: 0,
        arrearAddition: 0,
        grossSalary: 11435.31,
        epfWage: 10556,
        epfEmployee: 1266.72,
        epfEmployer: 1372.28,
        esiWage: 10556,
        esiEmployee: 79.17,
        esiEmployer: 343.07,
        ptComputed: 110,
        ptDeducted: 0,
        deductPtFromEmployee: false,
        gemCharge: 0,
        adminCharge: 0,
        advanceDeduction: 500,
        uniformDeduction: 250,
        otherDeduction: 0,
        totalDeductions: 2095.89,
        netPay: 9339,
        actualPaidAmount: 0,
        uniformBalanceAfter: 750,
        advanceBalanceAfter: 0,
        payoutStatus: "UNPAID",
        paymentMode: "BANK_TRANSFER",
      },
    ];

    const patchRuleCalls: Array<{ id: string; notes?: string }> = [];
    const statusTransitions: string[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
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
                id: "site-balaram",
                siteCode: "BALARAM",
                siteName: "Balaram Bose Hosp",
                clientName: "CMOH North 24 PGS",
                gstMode: "INTRA_CGST_SGST",
                isActive: true,
              },
            ],
            salaryRuleProfiles: rulesState,
            payrollRuns: runsState,
          },
        });
      }

      if (url.startsWith("/api/admin/salary-rules") && method === "GET") {
        return createJsonResponse({ success: true, count: rulesState.length, data: rulesState });
      }

      if (url.match(/\/api\/admin\/salary-rules\/[^/]+$/) && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { notes?: string };
        if (rulesState[0]) {
          rulesState[0] = { ...rulesState[0], ...(body.notes ? { notes: body.notes } : {}) };
          patchRuleCalls.push({ id: rulesState[0].id, ...(body.notes ? { notes: body.notes } : {}) });
        }
        return createJsonResponse({ success: true, data: rulesState[0] });
      }

      if (url.startsWith("/api/admin/payroll-runs") && method === "GET" && !url.includes("/bank-advice") && !url.endsWith("/payroll-runs")) {
        if (url.endsWith("/run-1")) {
          return createJsonResponse({
            success: true,
            data: { run: runsState[0], lineItems: lineItemsState },
          });
        }
      }

      if (url.startsWith("/api/admin/payroll-runs") && method === "GET" && !url.includes("/bank-advice")) {
        return createJsonResponse({ success: true, data: runsState });
      }

      if (url.endsWith("/api/admin/payroll-runs/generate") && method === "POST") {
        const run: PayrollRunRecord = {
          id: "run-1",
          runCode: "PAY-2026-10-BALARAM",
          monthKey: "2026-10",
          monthLabel: "October 2026",
          daysInMonth: 31,
          siteName: "Balaram Bose Hosp",
          ruleProfileId: "rule-balaram",
          ruleProfileCode: "BALARAM_CMOH",
          ruleProfileName: "Balaram Bose Hosp (CMOH)",
          status: "DRAFT",
          headcount: 1,
          totalGross: 11435.31,
          totalBonusOutsideGross: 0,
          totalEpfEmployee: 1266.72,
          totalEpfEmployer: 1372.28,
          totalEsiEmployee: 79.17,
          totalEsiEmployer: 343.07,
          totalPt: 0,
          totalUniformDeduction: 250,
          totalAdvanceDeduction: 500,
          totalNetPay: 9339,
        };
        runsState.splice(0, runsState.length, run);
        return createJsonResponse({
          success: true,
          data: { run, ruleProfile: rulesState[0], lineItems: lineItemsState },
        });
      }

      if (url.match(/\/api\/admin\/payroll-runs\/line-items\/[^/]+$/) && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { arrearAddition?: number };
        const li = lineItemsState[0];
        if (li && body.arrearAddition !== undefined) {
          li.arrearAddition = body.arrearAddition;
          li.grossSalary = Number((11435.31 + body.arrearAddition).toFixed(2));
          li.netPay = 9339 + Math.round(body.arrearAddition);
        }
        if (runsState[0] && li) {
          runsState[0].totalNetPay = li.netPay;
        }
        return createJsonResponse({
          success: true,
          data: { lineItem: li, run: runsState[0] },
        });
      }

      if (url.endsWith("/api/admin/payroll-runs/run-1/status") && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { status: PayrollRunRecord["status"] };
        statusTransitions.push(body.status);
        if (runsState[0]) {
          runsState[0] = { ...runsState[0], status: body.status };
        }
        return createJsonResponse({ success: true, data: runsState[0] });
      }

      if (url.endsWith("/api/admin/payroll-runs/run-1/bank-advice") && method === "GET") {
        const advice: BankAdviceResponse = {
          runCode: "PAY-2026-10-BALARAM",
          monthKey: "2026-10",
          monthLabel: "October 2026",
          siteName: "Balaram Bose Hosp",
          count: 1,
          totalPayable: lineItemsState[0]?.netPay ?? 9839,
          rows: [
            {
              slNo: 1,
              employeeId: "ACS/SEC/2026/001",
              employeeName: "Subrata Roy",
              siteName: "Balaram Bose Hosp",
              bankName: "AXIS BANK",
              accountNumber: "918010011223344",
              ifscCode: "UTIB0000436",
              upiId: "",
              paymentMode: "BANK_TRANSFER",
              netPay: lineItemsState[0]?.netPay ?? 9839,
              voucherNo: null,
              payoutStatus: "UNPAID",
            },
          ],
        };
        return createJsonResponse({ success: true, data: advice });
      }

      return createJsonResponse({ success: true, data: {} });
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const rootRoute = createRootRoute({
      component: () => (
        <AuthProvider>
          <AcsStoreProvider>
            <Outlet />
          </AcsStoreProvider>
        </AuthProvider>
      ),
    });
    const salaryRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/salary",
      validateSearch: SalaryRoute.options.validateSearch,
      component: SalaryRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([salaryRoute]),
      history: createMemoryHistory({ initialEntries: ["/salary"] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // 1. Wait for route render, switch to Site Rules tab & configure CMOH rule
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Site Rules/i })).toBeInTheDocument();
    });
    const rulesTab = screen.getByRole("tab", { name: /Site Rules/i });
    fireEvent.mouseDown(rulesTab, { button: 0, ctrlKey: false });
    fireEvent.click(rulesTab);

    await waitFor(() => {
      expect(screen.getByText("Balaram Bose Hosp (CMOH)")).toBeInTheDocument();
      expect(screen.getByText("PT: Not Deducted")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Configure" }));
    await waitFor(() => {
      expect(screen.getByText("Configure Rule — Balaram Bose Hosp (CMOH)")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Formula Notes"), {
      target: { value: "Verified Oct-26 CMOH template" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Salary Rule" }));

    await waitFor(() => {
      expect(patchRuleCalls[0]?.notes).toBe("Verified Oct-26 CMOH template");
    });

    // 2. Switch to Payroll Runs tab, generate run, adjust line item, export Bank Advice & Lock
    const runsTab = screen.getByRole("tab", { name: /Payroll Runs/i });
    fireEvent.mouseDown(runsTab, { button: 0, ctrlKey: false });
    fireEvent.click(runsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generate Payroll Run/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Generate Payroll Run/i }));
    await waitFor(() => {
      expect(screen.getByText("Subrata Roy")).toBeInTheDocument();
      expect(screen.getByText(/PT: ₹0 \(Computed ₹110, not deducted\)/)).toBeInTheDocument();
    });

    // Add ₹500 arrear
    fireEvent.click(screen.getByRole("button", { name: "Adjust Subrata Roy" }));
    await waitFor(() => {
      expect(screen.getByText("Adjust Payroll Line Item")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Arrear Addition/i), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Adjustment" }));

    await waitFor(() => {
      expect(screen.getAllByText("₹9,839").length).toBeGreaterThanOrEqual(1);
    });

    // Export Bank Advice & Lock run
    fireEvent.click(screen.getByRole("button", { name: /Export Bank \/ NEFT Advice/i }));
    await waitFor(() => {
      expect(anchorClickSpy).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Lock & Sync Payslips \/ ECR/i }));
    await waitFor(() => {
      expect(statusTransitions).toContain("LOCKED");
    });
  });

  it("exports EPF ECR (#~# format) & ESIC Monthly Challan CSV on /esi-pf and renders rich Payslip breakup", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-compliance");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const complianceRequests: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

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
        return createJsonResponse({ success: true, data: INITIAL_ACS_DATA });
      }

      if (url.includes("/api/admin/statutory/compliance-export")) {
        complianceRequests.push(url);
        const payload: ComplianceExportResponse = {
          monthKey: "2026-10",
          siteName: "All",
          source: "SALARY_LINE_ITEMS",
          totals: {
            epfMembers: 1,
            epfEmployeeTotal: 1800,
            epfEmployerTotal: 1950,
            esicMembers: 1,
            esiEmployeeTotal: 113,
            esiEmployerTotal: 488,
          },
          ecrText: "100123456789#~#Anupam Sarkar#~#26208#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#5#~#0",
          rows: [
            {
              employeeId: "ACS-2001",
              employeeName: "Anupam Sarkar",
              siteName: "FSSAI",
              uanNumber: "100123456789",
              esiNumber: "4100998877",
              daysPaid: 26,
              grossWages: 26208,
              epfWages: 15000,
              epsWages: 15000,
              edliWages: 15000,
              epfEmployeeShare: 1800,
              epsEmployerShare: 1250,
              epfEpsDiffShare: 550,
              epfEmployerShare: 1950,
              esiWages: 15000,
              esiEmployeeShare: 113,
              esiEmployerShare: 488,
              ncpDays: 5,
            },
          ],
        };
        return createJsonResponse({ success: true, data: payload });
      }

      return createJsonResponse({ success: true, data: {} });
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const rootRoute = createRootRoute({
      component: () => (
        <AuthProvider>
          <AcsStoreProvider>
            <Outlet />
          </AcsStoreProvider>
        </AuthProvider>
      ),
    });
    const esiPfRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/esi-pf",
      component: EsiPfRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([esiPfRoute]),
      history: createMemoryHistory({ initialEntries: ["/esi-pf"] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Export EPF ECR/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Export EPF ECR/i }));
    await waitFor(() => {
      expect(complianceRequests).toHaveLength(1);
      expect(screen.getByRole("button", { name: /Export ESIC Challan/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /Export ESIC Challan/i }));

    await waitFor(() => {
      expect(complianceRequests).toHaveLength(2);
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });

    // Verify Rich Payslip Preview & Print HTML
    const richSlip: PayslipRecord = {
      id: "ps-soham-1",
      payslipId: "PS-202610-SOHAM01",
      employeeId: "ACS/FAC/2026/012",
      employeeName: "Dipak Das",
      designation: "Factory Operator",
      department: "SOHAM MVCC",
      location: "Soham Factory",
      salaryMonth: "October 2026",
      basicSalary: 18000,
      allowances: 0,
      overtime: 0,
      otherEarnings: 0,
      pfDeduction: 336,
      esiDeduction: 112,
      otherDeductions: 1110,
      generatedDate: "2026-11-02",
      status: "Generated",
      ruleProfileCode: "SOHAM_FACTORY",
      ruleProfileName: "Soham Factory Sheet",
      presentDays: 26,
      extraDays: 0,
      otHours: 0,
      nhDays: 0,
      bonusOutsideGross: 1499.4,
      canteenAllowance: 336,
      ptDeduction: 110,
      uniformDeduction: 500,
      advanceDeduction: 500,
      deductPtFromEmployee: true,
      factoryComponents: {
        basic: 2800,
        hra: 3200,
        uniformAllowance: 3000,
        medical: 1250,
        fuel: 1650,
        washing: 1500,
        balancingAllowance: 4600,
      },
      uniformBalanceAfter: 1000,
      advanceBalanceAfter: 1500,
      paymentMode: "CHEQUE",
      voucherNo: 41,
      uanNumber: "100998877665",
      esiNumber: "4100112233",
    };

    const printHtml = buildPayslipPrintHtml(richSlip, INITIAL_ACS_DATA.settings);
    expect(printHtml).toContain("Factory Breakup:");
    expect(printHtml).toContain("Bonus (Separate Outside Gross)");
    expect(printHtml).toContain("Canteen Allowance (Info)");
    expect(printHtml).toContain("#41");
    expect(printHtml).toContain("Dress Due Bal:");

    render(
      <PayslipPreviewDialog
        payslip={richSlip}
        settings={INITIAL_ACS_DATA.settings}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Factory Component Breakup")).toBeInTheDocument();
    expect(screen.getByText("Bonus (Outside Gross)")).toBeInTheDocument();
    expect(screen.getByText("Voucher #41")).toBeInTheDocument();
    expect(screen.getByText("Dress Balance: ₹1,000")).toBeInTheDocument();
  });
});
