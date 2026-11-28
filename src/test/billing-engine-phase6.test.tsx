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
  buildInvoicePrintHtml,
  isInvoiceOverdue30Days,
} from "@/components/billing/InvoicePreviewDialog";
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import type {
  BillingRuleProfileRecord,
  InvoiceDeductionCategory,
  InvoiceRecord,
  PaymentMode,
} from "@/lib/acs-types";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { Route as BillingRoute } from "@/routes/billing";

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

describe("Phase 6: Site Billing Engine, GST Regimes & Pre/Post-Payment Tracking", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ACS letterhead, RCM/Factory Act clause, Axis Bank details, and >30d 24% overdue check", () => {
    const overdueInv: InvoiceRecord = {
      id: "inv-cbdt-old",
      invoiceNumber: "ADV/SEP26/31",
      clientName: "CBDT Income Tax Medinipur",
      clientAddress: "Medinipur, WB",
      clientGstin: "19GOVTCBDT01Z1",
      stateCode: "19",
      billingMonth: "September 2026",
      periodLabel: "01-09-2026 to 30-09-2026",
      site: "CBDT Medinipur",
      serviceType: "Manned Security & Guarding Services",
      serviceDescription: "CBDT Type 2",
      sacCode: "998533",
      archetype: "DAY_RATE_STATUTORY_MARKUP",
      gstMode: "RCM",
      quantity: 78,
      rate: 646.35,
      taxRate: 0,
      wagesSubtotal: 43368,
      statutoryTotal: 7047.3,
      serviceChargePct: 3.2627,
      serviceChargeAmount: 1644.9,
      taxableSubtotal: 52060.2,
      totalInvoiceAmount: 52060,
      includeFactoryActNote: true,
      invoiceDate: "2026-10-01",
      dueDate: "2026-10-31",
      paymentTerms: "Net 30 Days",
      status: "Pending",
      paymentStage: "PRE_PAYMENT_SUBMITTED",
      interestRatePct: 24,
    };

    expect(isInvoiceOverdue30Days(overdueInv, "2026-11-27")).toBe(true);
    const html = buildInvoicePrintHtml(overdueInv, INITIAL_ACS_DATA.settings);
    expect(html).toContain("436010200019707");
    expect(html).toContain("UTIB0000436");
    expect(html).toContain("UDYAM-WB-14-0002254");
    expect(html).toContain("Reverse Charge Mechanism");
    expect(html).toContain("Factory Act (Bonus, CL, PL and etc.)");
    expect(html).toContain("24% p.a.");
  });

  it("generates multi-month GST site bill, records TDS deduction slip & Bank receipt to SETTLED, and edits Billing Rules", async () => {
    const billingRulesState: BillingRuleProfileRecord[] = [
      {
        id: "br-phe",
        profileCode: "PHE_WORKS",
        profileName: "PHE Govt Works (-0.02% Deduct + 18% GST + 1% Cess)",
        siteName: "PHE",
        isTemplate: true,
        isActive: true,
        archetype: "GOVT_WORKS_DEDUCT_CESS",
        gstMode: "INTRA_CGST_SGST",
        sacCode: "998533",
        epfEmployerPct: 12,
        edliPct: 0.5,
        pfAdminPct: 0.5,
        pfFixedPerDay: 0,
        poolEpfMode: "UNCAPPED",
        esiEmployerPct: 3.25,
        poolEsiMode: "UNCAPPED",
        bonusPct: 0,
        serviceChargePct: 0,
        stripGstFromTenderRate: false,
        tenderTaxPct: 18,
        govtDeductionPct: 0.02,
        cessPct: 1,
        subtotalRoundMode: "EXACT_PAISE",
        gstRoundMode: "ROUND",
        totalRoundMode: "ROUND",
        includeFactoryActNote: false,
        interestRatePct: 24,
      },
      {
        id: "br-msme-sg",
        profileCode: "MSME_SG",
        profileName: "MSME Tool Room — Security Guard (RCM GST-Stripped /1.18)",
        subUnit: "S.G",
        isTemplate: true,
        isActive: true,
        archetype: "ALL_INCLUSIVE_RATE",
        gstMode: "RCM",
        sacCode: "998533",
        epfEmployerPct: 12,
        edliPct: 0.5,
        pfAdminPct: 0.5,
        pfFixedPerDay: 0,
        poolEpfMode: "UNCAPPED",
        esiEmployerPct: 3.25,
        poolEsiMode: "UNCAPPED",
        bonusPct: 0,
        serviceChargePct: 0,
        stripGstFromTenderRate: true,
        tenderTaxPct: 18,
        govtDeductionPct: 0,
        cessPct: 0,
        subtotalRoundMode: "EXACT_PAISE",
        gstRoundMode: "ROUND",
        totalRoundMode: "ROUND",
        includeFactoryActNote: false,
        interestRatePct: 24,
      },
    ];

    const invoicesState: InvoiceRecord[] = [];
    const generatedPayloads: Array<{ periodMonths?: string[]; subUnit?: string }> = [];
    const rulePatchCalls: Array<{ id: string; notes?: string }> = [];

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
                id: "site-phe",
                siteCode: "PHE",
                siteName: "PHE",
                clientName: "Public Health Engineering Dept.",
                gstMode: "INTRA_CGST_SGST",
                isActive: true,
              },
            ],
            billingRuleProfiles: billingRulesState,
            invoices: invoicesState,
          },
        });
      }

      if (url.startsWith("/api/admin/billing-rules") && method === "GET") {
        return createJsonResponse({ success: true, data: billingRulesState });
      }

      if (url.match(/\/api\/admin\/billing-rules\/[^/]+$/) && method === "PATCH") {
        const id = url.split("/").pop() ?? "";
        const body = JSON.parse(String(init?.body ?? "{}")) as { notes?: string };
        rulePatchCalls.push({ id, ...(body.notes ? { notes: body.notes } : {}) });
        const idx = billingRulesState.findIndex((r) => r.id === id);
        if (idx >= 0) {
          billingRulesState[idx] = { ...billingRulesState[idx]!, ...body };
        }
        return createJsonResponse({ success: true, data: billingRulesState[idx] });
      }

      if (url.includes("/api/admin/invoices/next-number")) {
        return createJsonResponse({ success: true, data: { nextInvoiceNumber: "ADV/NOV26/31" } });
      }

      if (url.endsWith("/api/admin/invoices/generate") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          periodMonths?: string[];
          subUnit?: string;
        };
        generatedPayloads.push(body);
        const generated: InvoiceRecord = {
          id: "inv-phe-31",
          invoiceNumber: "ADV/NOV26/31",
          siteId: "site-phe",
          billingRuleProfileId: "br-phe",
          ruleProfileCode: "PHE_WORKS",
          clientName: "Public Health Engineering Dept.",
          clientAddress: "Barasat Division, WB",
          clientGstin: "19GOVTPHE0001Z5",
          stateCode: "19",
          billingMonth: "September 2026 – October 2026",
          periodMonths: body.periodMonths ?? ["2026-09", "2026-10"],
          periodLabel: "01-09-2026 to 31-10-2026",
          site: "PHE",
          subUnit: body.subUnit ?? "WORKS",
          serviceType: "Manned Security & Guarding Services",
          serviceDescription: "PHE Govt Works (01-09-2026 to 31-10-2026)",
          sacCode: "998533",
          archetype: "GOVT_WORKS_DEDUCT_CESS",
          gstMode: "INTRA_CGST_SGST",
          quantity: 100,
          rate: 685.86,
          taxRate: 18,
          wagesSubtotal: 68600,
          govtDeductionPct: 0.02,
          govtDeductionAmount: 13.72,
          taxableSubtotal: 68586.28,
          cgstRate: 9,
          cgstAmount: 6173,
          sgstRate: 9,
          sgstAmount: 6173,
          cessPct: 1,
          cessAmount: 809.32,
          totalInvoiceAmount: 81742,
          amountInWords: "Rupees Eighty One Thousand Seven Hundred Forty Two Only",
          invoiceDate: "2026-10-15",
          dueDate: "2026-11-14",
          paymentTerms: "Payment within 30 days (24% p.a. interest thereafter)",
          status: "Pending",
          paymentStage: "PRE_PAYMENT_SUBMITTED",
          deductionsSlip: [],
          totalDeductions: 0,
          paymentReceipts: [],
          totalReceived: 0,
          balanceReceivable: 81742,
          interestRatePct: 24,
        };
        invoicesState.unshift(generated);
        return createJsonResponse({
          success: true,
          data: { invoice: generated, ruleProfile: billingRulesState[0] },
        });
      }

      if (url.endsWith("/api/admin/invoices/inv-phe-31/deductions") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          category: InvoiceDeductionCategory;
          amount: number;
          note?: string;
        };
        const inv = invoicesState[0]!;
        inv.deductionsSlip = [
          ...(inv.deductionsSlip ?? []),
          {
            category: body.category,
            amount: body.amount,
            note: body.note ?? "",
            recordedAt: "2026-11-27",
          },
        ];
        inv.totalDeductions = (inv.totalDeductions ?? 0) + body.amount;
        inv.balanceReceivable = Math.max(
          0,
          (inv.totalInvoiceAmount ?? 81742) - inv.totalDeductions - (inv.totalReceived ?? 0),
        );
        inv.paymentStage = "DEDUCTION_DISPUTED";
        return createJsonResponse({ success: true, data: { ...inv } });
      }

      if (url.endsWith("/api/admin/invoices/inv-phe-31/receipts") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          receiptDate: string;
          amount: number;
          paymentMode: PaymentMode;
          referenceNo?: string;
          bankName?: string;
          note?: string;
        };
        const inv = invoicesState[0]!;
        inv.paymentReceipts = [
          ...(inv.paymentReceipts ?? []),
          {
            receiptDate: body.receiptDate,
            amount: body.amount,
            paymentMode: body.paymentMode,
            referenceNo: body.referenceNo ?? "",
            bankName: body.bankName ?? "",
            note: body.note ?? "",
          },
        ];
        inv.totalReceived = (inv.totalReceived ?? 0) + body.amount;
        inv.balanceReceivable = Math.max(
          0,
          (inv.totalInvoiceAmount ?? 81742) - (inv.totalDeductions ?? 0) - inv.totalReceived,
        );
        if (inv.balanceReceivable <= 0.01) {
          inv.paymentStage = "SETTLED";
          inv.status = "Paid";
        } else {
          inv.paymentStage = "PARTIAL_PAID";
        }
        return createJsonResponse({ success: true, data: { ...inv } });
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
    const billingRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/billing",
      component: BillingRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([billingRoute]),
      history: createMemoryHistory({ initialEntries: ["/billing"] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // 1. Open Generate Site Bill & create multi-month invoice
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generate Site Bill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Generate Site Bill/i }));
    await waitFor(() => {
      expect(screen.getByText("Generate Site Bill from Verified Attendance")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Sub-Unit \/ Split/i), { target: { value: "WORKS" } });
    fireEvent.change(screen.getByLabelText(/Billing Period Month/i), {
      target: { value: "2026-09, 2026-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Official Tax Invoice" }));

    await waitFor(() => {
      expect(generatedPayloads).toHaveLength(1);
      expect(generatedPayloads[0]?.periodMonths).toEqual(["2026-09", "2026-10"]);
      expect(screen.getByText("ADV/NOV26/31")).toBeInTheDocument();
      expect(screen.getByText("PRE_PAYMENT_SUBMITTED")).toBeInTheDocument();
      expect(screen.getByText(">30d 24% p.a.")).toBeInTheDocument();
    });

    // 2. Open Reconcile, add ₹1,500 TDS deduction slip, then record ₹80,242 NEFT receipt -> SETTLED
    fireEvent.click(screen.getByRole("button", { name: "Reconcile" }));
    await waitFor(() => {
      expect(screen.getByText(/Pre\/Post-Payment Reconciliation — ADV\/NOV26\/31/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Deduction Amount/i), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText(/Slip Note/i), { target: { value: "2% Income Tax TDS" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Deduction Slip" }));

    await waitFor(() => {
      expect(screen.getByText("2% Income Tax TDS")).toBeInTheDocument();
      expect(screen.getAllByText("DEDUCTION_DISPUTED").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.change(screen.getByLabelText(/Received \(₹\)/i), { target: { value: "80242" } });
    fireEvent.change(screen.getByLabelText(/UTR \/ Cheque No/i), {
      target: { value: "AXISN26331999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post Payment Receipt" }));

    await waitFor(() => {
      expect(screen.getAllByText("SETTLED").length).toBeGreaterThanOrEqual(1);
    });

    // Close dialog & check Site Billing Rules tab
    fireEvent.keyDown(document, { key: "Escape" });

    const rulesTab = screen.getByRole("tab", { name: /Site Billing Rules/i });
    fireEvent.mouseDown(rulesTab, { button: 0, ctrlKey: false });
    fireEvent.click(rulesTab);

    await waitFor(() => {
      expect(
        screen.getByText("MSME Tool Room — Security Guard (RCM GST-Stripped /1.18)"),
      ).toBeInTheDocument();
      expect(screen.getByText("Strips 18% GST (/1.18)")).toBeInTheDocument();
    });

    const configureBtns = screen.getAllByRole("button", { name: "Configure" });
    fireEvent.click(configureBtns[0]!);
    await waitFor(() => {
      expect(screen.getByLabelText("Billing Formula Notes")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Billing Formula Notes"), {
      target: { value: "Verified Oct-26 PHE works formula" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Billing Rule" }));

    await waitFor(() => {
      expect(rulePatchCalls[0]?.notes).toBe("Verified Oct-26 PHE works formula");
    });
  });
});
