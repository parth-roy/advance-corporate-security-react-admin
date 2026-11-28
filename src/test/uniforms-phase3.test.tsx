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
import { INITIAL_ACS_DATA, UNIFORM_DEFAULT_PRICES } from "@/lib/acs-seed";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { Route as UniformsRoute } from "@/routes/uniforms";

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

describe("Phase 3: Master Dress Rate Card, Bulk Site Issues, Partial Returns & EMI Recovery Plans", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes Badge ₹70 in UNIFORM_DEFAULT_PRICES and syncs rate card", async () => {
    expect(UNIFORM_DEFAULT_PRICES["Badge"]).toBe(70);

    const serverUniforms = [
      {
        id: "uni-badge",
        name: "Badge",
        category: "Badge",
        subCategory: "",
        size: "Std",
        unitPrice: 0,
        availableQty: 100,
        issuedQty: 0,
        lastUpdated: "2026-11-26",
      },
      {
        id: "uni-shirt",
        name: "Black Shirt",
        category: "Shirt",
        subCategory: "Black Shirt",
        size: "L",
        unitPrice: 450,
        availableQty: 50,
        issuedQty: 0,
        lastUpdated: "2026-11-26",
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
            ...INITIAL_ACS_DATA,
            uniforms: serverUniforms,
            uniformIssues: [],
            uniformRecoveryPlans: [],
          },
        });
      }

      if (url.endsWith("/api/admin/uniforms/sync-rate-card") && method === "POST") {
        serverUniforms[0]!.unitPrice = 70;
        return createJsonResponse({
          success: true,
          data: {
            updatedCount: 1,
            createdCount: 0,
            uniforms: serverUniforms,
          },
        });
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
    const uniformsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/uniforms",
      validateSearch: UniformsRoute.options.validateSearch,
      component: UniformsRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([uniformsRoute]),
      history: createMemoryHistory({ initialEntries: ["/uniforms"] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Badge")).toBeInTheDocument();
      expect(screen.getByText("₹0")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Sync Rate Card \(₹70 Badge\)/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/uniforms/sync-rate-card"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByText("₹70")).toBeInTheDocument();
    });
  });

  it("supports Bulk Site Issue (PHED), EMI Recovery Plans, Deductions & Partial Return Credits", async () => {
    const batchPayloads: Record<string, any>[] = [];
    const createdPlans: Record<string, any>[] = [];
    const returnPayloads: Record<string, any>[] = [];

    const uniformsDb = [
      {
        id: "uni-shirt-1",
        name: "Black Shirt",
        category: "Shirt",
        subCategory: "Black Shirt",
        size: "L",
        unitPrice: 450,
        availableQty: 40,
        issuedQty: 0,
        lastUpdated: "2026-11-27",
      },
      {
        id: "uni-shoe-1",
        name: "Shoe",
        category: "Shoe",
        subCategory: "",
        size: "8",
        unitPrice: 480,
        availableQty: 30,
        issuedQty: 0,
        lastUpdated: "2026-11-27",
      },
    ];

    const issuesDb: Record<string, any>[] = [
      {
        id: "iss-santosh-1",
        batchId: "batch-santosh",
        issueMode: "INDIVIDUAL",
        serialNo: "451",
        employeeId: "ACS/SEC/2026/001",
        legacyEmpCode: "3065",
        employeeName: "Santosh Prasad",
        site: "MSME Tool & Training Center",
        itemId: "uni-shirt-1",
        itemName: "Black Shirt",
        category: "Shirt",
        subCategory: "Black Shirt",
        size: "L",
        quantity: 2,
        returnedQty: 0,
        returnedAmount: 0,
        unitPrice: 450,
        registrationCharge: 250,
        totalAmount: 1150,
        issueDate: "2026-11-05",
        originalDocHeld: "ORIGINAL VOTER ID: 22/08/-",
        billToSite: false,
        recoveryPlanId: "plan-santosh-1",
        status: "Issued",
      },
    ];

    const plansDb: Record<string, any>[] = [
      {
        id: "plan-santosh-1",
        batchId: "batch-santosh",
        issueIds: ["iss-santosh-1"],
        employeeId: "ACS/SEC/2026/001",
        legacyEmpCode: "3065",
        employeeName: "Santosh Prasad",
        siteName: "MSME Tool & Training Center",
        totalCharge: 1150,
        recoveryMode: "EMI_COUNT",
        installmentCount: 4,
        monthlyAmount: 287.5,
        startMonth: "2026-11",
        recoveredAmount: 0,
        creditedAmount: 0,
        remainingBalance: 1150,
        status: "ACTIVE",
        installmentHistory: [],
        remarks: "4 monthly EMIs",
      },
    ];

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
                id: "site-phed",
                siteCode: "PHE-MPDY",
                siteName: "PHED Division",
                clientName: "PHE",
                gstMode: "INTRA_CGST_SGST",
                isActive: true,
              },
              {
                id: "site-msme",
                siteCode: "MSME",
                siteName: "MSME Tool & Training Center",
                clientName: "MSME",
                gstMode: "RCM",
                isActive: true,
              },
            ],
            uniforms: uniformsDb,
            uniformIssues: issuesDb,
            uniformRecoveryPlans: plansDb,
            stockLogs: [],
          },
        });
      }

      if (url.endsWith("/api/admin/uniform-issues/batch") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        batchPayloads.push(body);
        const created = {
          id: `iss-bulk-${issuesDb.length + 1}`,
          batchId: "batch-phed-1",
          issueMode: body.issueMode || "INDIVIDUAL",
          serialNo: body.serialNo || "",
          employeeId: body.employeeId,
          employeeName: body.employeeName,
          site: body.site,
          itemId: body.items[0].itemId,
          itemName: "Shoe",
          category: "Shoe",
          subCategory: "",
          size: "8",
          quantity: body.items[0].quantity,
          returnedQty: 0,
          returnedAmount: 0,
          unitPrice: body.items[0].unitPrice,
          registrationCharge: body.registrationCharge || 0,
          totalAmount: body.items[0].quantity * body.items[0].unitPrice,
          issueDate: body.issueDate,
          receivedBy: body.receivedBy || "",
          billToSite: Boolean(body.billToSite),
          status: "Issued",
        };
        issuesDb.unshift(created);
        return createJsonResponse({
          success: true,
          data: { issues: [created], uniforms: uniformsDb, stockLogs: [] },
        });
      }

      if (url.endsWith("/api/admin/uniform-issues/iss-santosh-1/return") && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        returnPayloads.push(body);
        const retQty = Number(body.returnQty ?? 1);
        const credit = retQty * 450;
        issuesDb[0]!["returnedQty"] = retQty;
        issuesDb[0]!["returnedAmount"] = credit;
        plansDb[0]!["creditedAmount"] = credit;
        plansDb[0]!["remainingBalance"] = 1150 - credit;
        return createJsonResponse({
          success: true,
          data: {
            issue: issuesDb[0],
            uniform: { ...uniformsDb[0], availableQty: 40 + retQty },
            recoveryPlan: plansDb[0],
          },
        });
      }

      if (url.includes("/api/admin/uniform-recovery-plans/payroll-preview")) {
        return createJsonResponse({
          success: true,
          data: {
            month: "2026-11",
            totalDueThisMonth: plansDb.reduce(
              (s, p) => s + Math.min(p["remainingBalance"], p["monthlyAmount"]),
              0,
            ),
            items: plansDb,
          },
        });
      }

      if (url.includes("/api/admin/uniform-recovery-plans?") && method === "GET") {
        return createJsonResponse({
          success: true,
          data: plansDb,
          pagination: { page: 1, limit: 100, total: plansDb.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
          summary: {
            activePlans: plansDb.filter((p) => p["status"] === "ACTIVE").length,
            totalOutstanding: plansDb.reduce((s, p) => s + Number(p["remainingBalance"] || 0), 0),
            totalRecovered: plansDb.reduce((s, p) => s + Number(p["recoveredAmount"] || 0), 0),
          },
        });
      }

      if (url.endsWith("/api/admin/uniform-recovery-plans") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const created = {
          id: `plan-${plansDb.length + 1}`,
          issueIds: [],
          employeeId: body.employeeId || "ACS/DRS/2026/010",
          employeeName: body.employeeName,
          siteName: body.siteName,
          totalCharge: Number(body.totalCharge),
          recoveryMode: body.recoveryMode,
          installmentCount: 2,
          monthlyAmount: 500,
          startMonth: body.startMonth,
          recoveredAmount: 0,
          creditedAmount: 0,
          remainingBalance: Number(body.totalCharge),
          status: "ACTIVE",
          installmentHistory: [],
          remarks: body.remarks || "",
        };
        createdPlans.push(created);
        plansDb.unshift(created);
        return createJsonResponse({ success: true, data: created });
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
    const uniformsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/uniforms",
      validateSearch: UniformsRoute.options.validateSearch,
      component: UniformsRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([uniformsRoute]),
      history: createMemoryHistory({ initialEntries: ["/uniforms?view=issue"] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // 1. Switch to Bulk Site Issue (PHED pattern)
    fireEvent.click(await screen.findByRole("button", { name: /Bulk Site Issue/i }));
    fireEvent.change(screen.getByLabelText("Search Site Location"), {
      target: { value: "PHED Division" },
    });
    fireEvent.change(screen.getByLabelText("Serial No"), { target: { value: "454" } });
    fireEvent.change(screen.getByLabelText(/Received By \*/i), {
      target: { value: "Ajit Mondal (PHED Supervisor)" },
    });

    const selectBtns = await screen.findAllByRole("button", { name: /Select Item/i });
    fireEvent.click(selectBtns[1]!); // Shoe
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity for Shoe" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Bulk Site Issue" }));

    await waitFor(() => {
      expect(batchPayloads).toHaveLength(1);
      expect(batchPayloads[0]?.["issueMode"]).toBe("BULK_SITE");
      expect(batchPayloads[0]?.["billToSite"]).toBe(true);
      expect(batchPayloads[0]?.["employeeId"]).toBe("BULK-SITE");
      expect(batchPayloads[0]?.["serialNo"]).toBe("454");
    });

    // 2. Now on Issue History tab -> verify Bulk Site badge & Santosh Prasad issue render, and perform Partial Return (1 of 2)
    await waitFor(() => {
      expect(screen.getByText("Santosh Prasad")).toBeInTheDocument();
      expect(screen.getByText("Bulk Site")).toBeInTheDocument();
    });

    const returnButtons = screen.getAllByRole("button", { name: /Return/i });
    const santoshReturnBtn = returnButtons.find((btn) =>
      btn.closest("tr")?.textContent?.includes("Santosh Prasad"),
    );
    expect(santoshReturnBtn).toBeDefined();
    fireEvent.click(santoshReturnBtn!);

    await waitFor(() => {
      expect(screen.getByText(/Return Issued Uniform \/ Accessory/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Return Quantity/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));

    await waitFor(() => {
      expect(returnPayloads).toHaveLength(1);
      expect(returnPayloads[0]?.["returnQty"]).toBe(1);
      expect(screen.getByText("1 ret")).toBeInTheDocument();
    });

    // 3. Switch to Recovery & EMI Plans tab -> add legacy due balance ("1000/- DUE FOR DRESS")
    const recTab = screen.getByRole("tab", { name: /Recovery & EMI Plans/i });
    fireEvent.mouseDown(recTab, { button: 0, ctrlKey: false });
    fireEvent.click(recTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add Opening \/ EMI Plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Opening \/ EMI Plan/i }));
    fireEvent.change(screen.getByLabelText(/Employee Name \*/i), {
      target: { value: "Rohan Shaw" },
    });
    fireEvent.change(screen.getByLabelText(/Site \/ Unit \*/i), {
      target: { value: "PHED Division" },
    });
    fireEvent.change(screen.getByLabelText(/Total Dress Charge/i), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Recovery Plan/i }));

    await waitFor(() => {
      expect(createdPlans).toHaveLength(1);
      expect(createdPlans[0]?.["employeeName"]).toBe("Rohan Shaw");
      expect(createdPlans[0]?.["totalCharge"]).toBe(1000);
    });
  });
});
