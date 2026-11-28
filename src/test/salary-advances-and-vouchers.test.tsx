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
import type { SalaryAdvanceRecord, SalaryRecord, VoucherRecord } from "@/lib/acs-types";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { buildVoucherPrintHtml, numberToIndianCurrencyWords } from "@/lib/finance-utils";
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

describe("Phase 4: Salary Advances Ledger, Atomic Sequential Vouchers & Multi-Mode Payouts", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats Indian Rupee amounts in words (Lakh/Crore + Paise) and builds printable A5/A4 Cheque voucher HTML", () => {
    expect(numberToIndianCurrencyWords(9703)).toBe("Rupees Nine Thousand Seven Hundred Three Only");
    expect(numberToIndianCurrencyWords(4884)).toBe("Rupees Four Thousand Eight Hundred Eighty Four Only");
    expect(numberToIndianCurrencyWords(125400.5)).toBe(
      "Rupees One Lakh Twenty Five Thousand Four Hundred and Fifty Paise Only",
    );

    const html = buildVoucherPrintHtml(
      {
        id: "vch-40",
        voucherNo: 40,
        date: "2026-10-20",
        monthKey: "2026-10",
        debitHead: "Salary to Staff",
        purposeType: "HOLD_RELEASE",
        payeeName: "Pratik Chakraborty",
        employeeId: "ACS-2010",
        onAccountOf: "TRSL-Titagarh",
        particulars: "Being the Amount paid Pratik Chakraborty work at TRSL-Titagarh salary (Hold Release)",
        amount: 9703,
        amountInWords: numberToIndianCurrencyWords(9703),
        paymentMode: "CHEQUE",
        chequeDetails: {
          chequeNo: "344936",
          chequeDate: "2026-10-20",
          bankAccount: "436010200019707",
          ifsc: "UTIB0000436",
          bankName: "AXIS BANK",
          chequeAmount: 9703,
        },
        preparedBy: "R. Das",
        approvedBy: "Director",
        receivedBy: "Pratik Chakraborty",
        status: "POSTED",
      },
      INITIAL_ACS_DATA.settings,
    );

    expect(html).toContain("PAYMENT VOUCHER");
    expect(html).toContain("#40");
    expect(html).toContain("344936");
    expect(html).toContain("436010200019707");
    expect(html).toContain("UTIB0000436");
    expect(html).toContain("AXIS BANK");
    expect(html).toContain("Rupees Nine Thousand Seven Hundred Three Only");
  });

  it("supports CHQ_HOLD release via sequential CHEQUE Voucher, Salary Advance issuance/recovery, and UPI Voucher voiding", async () => {
    const mockPrintWindow = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(mockPrintWindow);

    let nextVoucherCounter = 40;
    let nextStaffCounter = 1;
    const salariesState: SalaryRecord[] = [
      {
        id: "sal-pratik",
        employeeId: "ACS-2010",
        employeeName: "Pratik Chakraborty",
        designation: "Security Guard",
        department: "Site Security",
        category: "Security Personnel",
        location: "TRSL-Titagarh",
        month: "November 2026",
        year: "2026",
        basicSalary: 9703,
        allowances: 0,
        overtime: 0,
        otherEarnings: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        otherDeductions: 0,
        status: "Pending",
        payoutStatus: "UNPAID",
      },
    ];
    const advancesState: SalaryAdvanceRecord[] = [];
    const vouchersState: VoucherRecord[] = [];

    const holdCalls: Array<{ id: string; payoutStatus: string; holdReason?: string }> = [];
    const postedVouchers: Array<{ paymentMode?: string; salaryId?: string; chequeNo?: string; upiTxn?: string }> = [];
    const cancelledVoucherIds: string[] = [];

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
            salaries: salariesState,
            salaryAdvances: advancesState,
            vouchers: vouchersState,
          },
        });
      }

      if (url.match(/\/api\/admin\/salaries\/[^/]+\/hold-status$/) && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          payoutStatus: SalaryRecord["payoutStatus"];
          holdReason?: string;
        };
        const target = salariesState[0];
        if (target) {
          target.payoutStatus = body.payoutStatus ?? "CHQ_HOLD";
          target.status = target.payoutStatus === "HOLD" || target.payoutStatus === "CHQ_HOLD" ? "On Hold" : "Pending";
          if (body.holdReason) target.holdReason = body.holdReason;
          holdCalls.push({
            id: target.id,
            payoutStatus: String(target.payoutStatus),
            ...(body.holdReason ? { holdReason: body.holdReason } : {}),
          });
        }
        return createJsonResponse({ success: true, data: target });
      }

      if (url.endsWith("/api/admin/vouchers/next-number")) {
        return createJsonResponse({ success: true, data: { nextVoucherNo: nextVoucherCounter } });
      }

      if (url.endsWith("/api/admin/vouchers") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          voucherNo?: number;
          date: string;
          debitHead: string;
          purposeType: VoucherRecord["purposeType"];
          payeeName: string;
          employeeId?: string;
          onAccountOf?: string;
          particulars: string;
          amount: number;
          amountInWords?: string;
          paymentMode: VoucherRecord["paymentMode"];
          chequeDetails?: VoucherRecord["chequeDetails"];
          bankTransferDetails?: VoucherRecord["bankTransferDetails"];
          upiDetails?: VoucherRecord["upiDetails"];
          salaryId?: string;
          preparedBy?: string;
          approvedBy?: string;
          receivedBy?: string;
        };
        const assignedNo = body.voucherNo && body.voucherNo >= nextVoucherCounter ? body.voucherNo : nextVoucherCounter;
        nextVoucherCounter = assignedNo + 1;
        const created: VoucherRecord = {
          id: `vch-${assignedNo}`,
          voucherNo: assignedNo,
          date: body.date,
          monthKey: body.date.slice(0, 7),
          debitHead: body.debitHead,
          purposeType: body.purposeType,
          payeeName: body.payeeName,
          ...(body.employeeId ? { employeeId: body.employeeId } : {}),
          ...(body.onAccountOf ? { onAccountOf: body.onAccountOf } : {}),
          particulars: body.particulars,
          amount: body.amount,
          amountInWords: body.amountInWords || numberToIndianCurrencyWords(body.amount),
          paymentMode: body.paymentMode,
          ...(body.chequeDetails ? { chequeDetails: body.chequeDetails } : {}),
          ...(body.bankTransferDetails ? { bankTransferDetails: body.bankTransferDetails } : {}),
          ...(body.upiDetails ? { upiDetails: body.upiDetails } : {}),
          ...(body.salaryId ? { salaryId: body.salaryId } : {}),
          ...(body.preparedBy ? { preparedBy: body.preparedBy } : {}),
          ...(body.approvedBy ? { approvedBy: body.approvedBy } : {}),
          ...(body.receivedBy ? { receivedBy: body.receivedBy } : {}),
          status: "POSTED",
        };
        vouchersState.unshift(created);
        postedVouchers.push({
          paymentMode: body.paymentMode,
          ...(body.salaryId ? { salaryId: body.salaryId } : {}),
          ...(body.chequeDetails?.chequeNo ? { chequeNo: body.chequeDetails.chequeNo } : {}),
          ...(body.upiDetails?.upiTransactionId ? { upiTxn: body.upiDetails.upiTransactionId } : {}),
        });

        let updatedSalary: SalaryRecord | undefined;
        if (body.salaryId) {
          updatedSalary = salariesState.find((s) => s.id === body.salaryId);
          if (updatedSalary) {
            updatedSalary.status = "Processed";
            updatedSalary.payoutStatus = "PAID";
            updatedSalary.paidAmount = body.amount;
            updatedSalary.paymentMode = body.paymentMode;
            updatedSalary.voucherId = created.id;
            updatedSalary.voucherNo = created.voucherNo;
          }
        }
        return createJsonResponse({
          success: true,
          data: { voucher: created, ...(updatedSalary ? { salary: updatedSalary } : {}) },
        });
      }

      if (url.includes("/api/admin/vouchers?") && method === "GET") {
        const byMode: Record<string, number> = { CASH: 0, CHEQUE: 0, BANK_TRANSFER: 0, UPI: 0 };
        let totalAmount = 0;
        for (const v of vouchersState) {
          if (v.status === "POSTED") {
            totalAmount += v.amount;
            byMode[v.paymentMode] = (byMode[v.paymentMode] ?? 0) + v.amount;
          }
        }
        return createJsonResponse({
          success: true,
          data: vouchersState,
          pagination: { page: 1, limit: 50, total: vouchersState.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
          summary: { totalCount: vouchersState.length, totalAmount, byMode },
        });
      }

      if (url.match(/\/api\/admin\/vouchers\/[^/]+$/) && method === "PATCH") {
        const id = url.split("/").pop() ?? "";
        const target = vouchersState.find((v) => v.id === id);
        if (target) {
          target.status = "CANCELLED";
          cancelledVoucherIds.push(id);
        }
        return createJsonResponse({ success: true, data: target });
      }

      if (url.includes("/api/admin/advances/payroll-preview")) {
        const due = advancesState
          .filter((a) => a.status === "OPEN" || a.status === "PARTIAL")
          .reduce((s, a) => s + a.remainingBalance, 0);
        return createJsonResponse({
          success: true,
          data: { month: new Date().toISOString().slice(0, 7), totalDueThisMonth: due, items: [] },
        });
      }

      if (url.endsWith("/api/admin/advances") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          date: string;
          employeeId?: string;
          employeeName: string;
          onAccountOf: string;
          amount: number;
          recoveryMode: SalaryAdvanceRecord["recoveryMode"];
          signatures: SalaryAdvanceRecord["signatures"];
          issueVoucher?: boolean;
          paymentMode?: VoucherRecord["paymentMode"];
          bankTransferDetails?: VoucherRecord["bankTransferDetails"];
        };
        const staffNo = nextStaffCounter++;
        const vNo = nextVoucherCounter++;
        const monthKey = body.date.slice(0, 7);
        const advId = `adv-${staffNo}`;
        const vchId = `vch-${vNo}`;
        let createdVoucher: VoucherRecord | undefined;
        if (body.issueVoucher) {
          createdVoucher = {
            id: vchId,
            voucherNo: vNo,
            date: body.date,
            monthKey,
            debitHead: "Advance to Staff",
            purposeType: "ADVANCE",
            payeeName: body.employeeName,
            ...(body.employeeId ? { employeeId: body.employeeId } : {}),
            onAccountOf: body.onAccountOf,
            particulars: `Being the Advance paid to ${body.employeeName} (${body.onAccountOf})`,
            amount: body.amount,
            amountInWords: numberToIndianCurrencyWords(body.amount),
            paymentMode: body.paymentMode ?? "CASH",
            ...(body.bankTransferDetails ? { bankTransferDetails: body.bankTransferDetails } : {}),
            salaryAdvanceId: advId,
            status: "POSTED",
          };
          vouchersState.unshift(createdVoucher);
        }
        const createdAdvance: SalaryAdvanceRecord = {
          id: advId,
          staffNo,
          date: body.date,
          monthKey,
          employeeId: body.employeeId || `STAFF-${staffNo}`,
          employeeName: body.employeeName,
          onAccountOf: body.onAccountOf,
          amount: body.amount,
          recoveredAmount: 0,
          remainingBalance: body.amount,
          recoveryMode: body.recoveryMode,
          targetPayrollMonth: "2026-12",
          installmentCount: 1,
          monthlyAmount: body.amount,
          signatures: body.signatures,
          ...(createdVoucher ? { voucherId: createdVoucher.id, voucherNo: createdVoucher.voucherNo } : {}),
          recoveryHistory: [],
          status: "OPEN",
        };
        advancesState.unshift(createdAdvance);
        return createJsonResponse({
          success: true,
          data: { advance: createdAdvance, ...(createdVoucher ? { voucher: createdVoucher } : {}) },
        });
      }

      if (url.includes("/api/admin/advances?") && method === "GET") {
        const openCount = advancesState.filter((a) => a.status === "OPEN" || a.status === "PARTIAL").length;
        const totalIssued = advancesState.reduce((s, a) => s + a.amount, 0);
        const totalRecovered = advancesState.reduce((s, a) => s + a.recoveredAmount, 0);
        const totalOutstanding = advancesState.reduce((s, a) => s + a.remainingBalance, 0);
        return createJsonResponse({
          success: true,
          data: advancesState,
          pagination: { page: 1, limit: 50, total: advancesState.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
          summary: { openCount, totalIssued, totalRecovered, totalOutstanding },
        });
      }

      if (url.match(/\/api\/admin\/advances\/[^/]+$/) && method === "PATCH") {
        const id = url.split("/").pop() ?? "";
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          recordDeductionAmount?: number;
          deductMonth?: string;
          note?: string;
        };
        const adv = advancesState.find((a) => a.id === id);
        if (adv && body.recordDeductionAmount) {
          const applied = Math.min(adv.remainingBalance, body.recordDeductionAmount);
          adv.recoveredAmount = Number((adv.recoveredAmount + applied).toFixed(2));
          adv.remainingBalance = Math.max(0, Number((adv.amount - adv.recoveredAmount).toFixed(2)));
          adv.status = adv.remainingBalance <= 0 ? "RECOVERED" : "PARTIAL";
          adv.recoveryHistory.push({
            monthKey: body.deductMonth || adv.targetPayrollMonth,
            deductedAmount: applied,
            balanceAfter: adv.remainingBalance,
            source: "MANUAL",
            note: body.note || "Recovered",
            recordedAt: "2026-11-27",
          });
        }
        return createJsonResponse({ success: true, data: adv });
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

    // 1. Wait for Salary Sheet row & place Pratik Chakraborty on CHQ_HOLD
    await waitFor(() => {
      expect(screen.getByText("Pratik Chakraborty")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Hold Pratik Chakraborty" }));
    await waitFor(() => {
      expect(holdCalls).toHaveLength(1);
      expect(holdCalls[0]).toEqual({
        id: "sal-pratik",
        payoutStatus: "CHQ_HOLD",
        holdReason: "Held for clearance",
      });
      expect(screen.getByRole("button", { name: "Release Voucher" })).toBeInTheDocument();
    });

    // 2. Click Release Voucher -> auto-configured CHEQUE HOLD_RELEASE -> fill Cheque #344936 & Save & Print
    fireEvent.click(screen.getByRole("button", { name: "Release Voucher" }));
    await waitFor(() => {
      expect(screen.getByText("Release Payment Voucher — Pratik Chakraborty")).toBeInTheDocument();
      expect(screen.getByText("Rupees Nine Thousand Seven Hundred Three Only")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Cheque No/i), { target: { value: "344936" } });
    fireEvent.click(screen.getByRole("button", { name: /Save & Print Voucher/i }));

    await waitFor(() => {
      expect(postedVouchers).toHaveLength(1);
      expect(postedVouchers[0]).toEqual({
        paymentMode: "CHEQUE",
        salaryId: "sal-pratik",
        chequeNo: "344936",
      });
      expect(screen.getByText("Vch #40")).toBeInTheDocument();
      expect(screen.getByText("PAID")).toBeInTheDocument();
    });

    // 3. Switch to Salary Advances tab, record Advance with BANK_TRANSFER voucher, then record PARTIAL recovery
    const advancesTab = screen.getByRole("tab", { name: /Salary Advances/i });
    fireEvent.mouseDown(advancesTab, { button: 0, ctrlKey: false });
    fireEvent.click(advancesTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Issue Salary Advance/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Issue Salary Advance/i }));
    await waitFor(() => {
      expect(screen.getByText("Record Salary Advance (Advance Register)")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Employee Name/i), { target: { value: "Suman Mondal" } });
    fireEvent.change(screen.getByLabelText(/Employee ID/i), { target: { value: "ACS/SEC/2026/019" } });
    fireEvent.change(screen.getByLabelText(/On Account Of \(Site \/ Unit\)/i), { target: { value: "PHE" } });
    fireEvent.change(screen.getByLabelText(/Amount \(₹\)/i), { target: { value: "2500" } });
    fireEvent.change(screen.getByLabelText(/Manager Sign/i), { target: { value: "A. Sen" } });

    const advModeTrigger = screen.getByLabelText(/Disbursement Mode/i);
    fireEvent.pointerDown(advModeTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(advModeTrigger);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Bank Transfer (NEFT / RTGS)" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("option", { name: "Bank Transfer (NEFT / RTGS)" }));

    fireEvent.change(screen.getByLabelText(/UTR \/ Ref/i), { target: { value: "AXISN26331001" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Advance" }));

    await waitFor(() => {
      expect(screen.getByText("Suman Mondal")).toBeInTheDocument();
      expect(screen.getByText("NEXT_MONTH")).toBeInTheDocument();
      expect(screen.getByText("OPEN")).toBeInTheDocument();
    });

    // Record ₹1,000 partial recovery
    fireEvent.click(screen.getByRole("button", { name: "Recover" }));
    await waitFor(() => {
      expect(screen.getByText("Record Advance Recovery")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Recovered Amount/i), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Recovery" }));

    await waitFor(() => {
      expect(screen.getByText("PARTIAL")).toBeInTheDocument();
    });

    // 4. Switch to Payment Vouchers tab, issue a UPI voucher, then cancel it
    const vouchersTab = screen.getByRole("tab", { name: /Payment Vouchers/i });
    fireEvent.mouseDown(vouchersTab, { button: 0, ctrlKey: false });
    fireEvent.click(vouchersTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /New Payment Voucher/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /New Payment Voucher/i }));
    await waitFor(() => {
      expect(screen.getByText("Create Multi-Mode Payment Voucher")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Payee \/ Employee Name/i), { target: { value: "Rohan Verma" } });
    fireEvent.change(screen.getByLabelText(/On Account Of \(Site\)/i), { target: { value: "MSME" } });
    fireEvent.change(screen.getByLabelText(/Particulars/i), { target: { value: "Being amount paid for Diwali duty arrear" } });
    fireEvent.change(screen.getByLabelText(/Amount \(₹\)/i), { target: { value: "1500" } });

    const vchModeTrigger = screen.getByLabelText("Payment Mode *");
    fireEvent.pointerDown(vchModeTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(vchModeTrigger);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "UPI" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("option", { name: "UPI" }));

    fireEvent.change(screen.getByLabelText(/UPI Transaction ID/i), { target: { value: "632199887766" } });
    fireEvent.change(screen.getByLabelText(/UPI VPA \/ Phone/i), { target: { value: "rohan@okaxis" } });
    fireEvent.click(screen.getByRole("button", { name: "Post Voucher" }));

    await waitFor(() => {
      expect(postedVouchers.some((v) => v.paymentMode === "UPI" && v.upiTxn === "632199887766")).toBe(true);
      expect(screen.getByText("Rohan Verma")).toBeInTheDocument();
      expect(screen.getByText("UPI: 632199887766")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel Voucher #42" }));
    await waitFor(() => {
      expect(cancelledVoucherIds).toContain("vch-42");
    });
  });
});
