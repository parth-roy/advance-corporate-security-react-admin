import { useState } from "react";
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
import { CandidateDrawer } from "@/components/recruitment/CandidateDrawer";
import { IssueUniformPage } from "@/components/uniforms/IssueUniformPage";
import { AddUniformDialog } from "@/components/uniforms/UniformDialogs";
import { INITIAL_ACS_DATA, UNIFORM_CATEGORIES, UNIFORM_DEFAULT_PRICES } from "@/lib/acs-seed";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { buildEmployeeId, inferDepartmentCode, parseEmployeeId } from "@/lib/employee-id";

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

describe("Employee ID helpers and Uniforms & Accessories catalog", () => {
  it("generates and parses ACS/<DEPT>/<YEAR>/<NUMBER> employee IDs dynamically", () => {
    expect(inferDepartmentCode("Security Guard")).toBe("SEC");
    expect(inferDepartmentCode("Housekeeping Staff / Cleaner")).toBe("CLE");
    expect(inferDepartmentCode("Ward Boy / Hospital Attendant")).toBe("MED");
    expect(inferDepartmentCode("Electrician (HT / LT)")).toBe("TEC");

    expect(
      buildEmployeeId({ deptCode: "cle", year: "2026", number: "015" }),
    ).toBe("ACS/CLE/2026/015");

    expect(parseEmployeeId("ACS/CLE/2026/015", "Housekeeping Staff / Cleaner")).toEqual({
      org: "ACS",
      deptCode: "CLE",
      year: "2026",
      number: "015",
    });
  });

  it("enforces category-driven AddUniformDialog without freeform item name and defaults category pricing", () => {
    const onAdd = vi.fn();
    const onOpenChange = vi.fn();

    render(<AddUniformDialog open onOpenChange={onOpenChange} onAdd={onAdd} />);

    // Ensure freeform "Item Name" is removed
    expect(screen.queryByLabelText(/Item Name/i)).not.toBeInTheDocument();
    expect(UNIFORM_CATEGORIES).toHaveLength(13);
    expect(UNIFORM_DEFAULT_PRICES["Shirt"]).toBe(450);
    expect(UNIFORM_DEFAULT_PRICES["T-Shirt"]).toBe(285);
    expect(UNIFORM_DEFAULT_PRICES["Pant"]).toBe(460);
    expect(UNIFORM_DEFAULT_PRICES["Belt"]).toBe(120);
    expect(UNIFORM_DEFAULT_PRICES["Cap"]).toBe(120);
    expect(UNIFORM_DEFAULT_PRICES["Lanyard + Whistle"]).toBe(90);
    expect(UNIFORM_DEFAULT_PRICES["Shoe"]).toBe(480);
    expect(UNIFORM_DEFAULT_PRICES["ID Card"]).toBe(50);
    expect(UNIFORM_DEFAULT_PRICES["Safety Gloves"]).toBe(180);
    expect(UNIFORM_DEFAULT_PRICES["Safety Shoe"]).toBe(570);
    expect(UNIFORM_DEFAULT_PRICES["Safety Helmet"]).toBe(200);
    expect(UNIFORM_DEFAULT_PRICES["Jacket"]).toBe(550);

    fireEvent.click(screen.getByRole("button", { name: "Add to Inventory" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toEqual({
      name: "Black Shirt",
      category: "Shirt",
      subCategory: "Black Shirt",
      size: "L",
      unitPrice: 450,
      availableQty: 25,
    });
  });
});

describe("IssueUniformPage batch flow and CandidateDrawer history", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searches employee by name/ID, issues multiple items with registration charge, updates stock, and displays in CandidateDrawer", async () => {
    const mockCandidate = {
      id: "cand-101",
      employeeId: "ACS/CLE/2026/009",
      fullName: "Sunil Verma",
      mobile: "9876543210",
      email: "",
      position: "Housekeeping Staff / Cleaner",
      location: "CyberHub Tower B, Gurugram",
      experience: "Experienced",
      applicationDate: "2026-11-26",
      status: "Selected" as const,
      resumeName: "",
      remarks: "",
    };

    const serverUniforms = [
      {
        id: "uni-shirt-black",
        name: "Black Shirt",
        category: "Shirt",
        subCategory: "Black Shirt",
        size: "L",
        unitPrice: 450,
        availableQty: 50,
        issuedQty: 0,
        lastUpdated: "2026-11-26",
      },
      {
        id: "uni-belt",
        name: "Belt",
        category: "Belt",
        subCategory: "",
        size: "Free",
        unitPrice: 120,
        availableQty: 40,
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
            candidates: [mockCandidate],
            uniforms: serverUniforms,
            uniformIssues: [],
          },
        });
      }

      if (url.endsWith("/api/admin/uniform-issues/batch") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          employeeId: string;
          employeeName: string;
          site: string;
          issueDate: string;
          registrationCharge: number;
          items: { itemId: string; quantity: number; unitPrice: number }[];
        };

        return createJsonResponse(
          {
            success: true,
            data: {
              issues: body.items.map((line, idx) => {
                const sku = serverUniforms.find((u) => u.id === line.itemId)!;
                const reg = idx === 0 ? body.registrationCharge : 0;
                return {
                  id: `saved-issue-${idx}`,
                  batchId: "batch-srv-1",
                  employeeId: body.employeeId,
                  employeeName: body.employeeName,
                  site: body.site,
                  itemId: sku.id,
                  itemName: sku.name,
                  category: sku.category,
                  subCategory: sku.subCategory,
                  size: sku.size,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  registrationCharge: reg,
                  totalAmount: line.quantity * line.unitPrice + reg,
                  issueDate: body.issueDate,
                  status: "Issued",
                };
              }),
              uniforms: serverUniforms.map((u) => {
                const line = body.items.find((x) => x.itemId === u.id);
                return line
                  ? {
                      ...u,
                      availableQty: u.availableQty - line.quantity,
                      issuedQty: u.issuedQty + line.quantity,
                    }
                  : u;
              }),
            },
          },
          201,
        );
      }

      return createJsonResponse({ success: true, data: {} });
    });

    const onIssuedSuccess = vi.fn();
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
    const issueRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/uniforms",
      component: function IssueAndDrawerHarness() {
        const [drawerOpen, setDrawerOpen] = useState(false);
        return (
          <div>
            <IssueUniformPage onBack={vi.fn()} onIssuedSuccess={onIssuedSuccess} />
            <button type="button" onClick={() => setDrawerOpen(true)}>
              Open Candidate Drawer
            </button>
            <CandidateDrawer
              candidate={drawerOpen ? mockCandidate : null}
              onClose={() => setDrawerOpen(false)}
              onEdit={vi.fn()}
              onStatusChange={vi.fn()}
            />
          </div>
        );
      },
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([issueRoute]),
      history: createMemoryHistory({ initialEntries: ["/uniforms"] }),
      context: { queryClient },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Search employee by name
    const empNameInput = await screen.findByLabelText("Search Employee Name");
    fireEvent.focus(empNameInput);
    fireEvent.change(empNameInput, { target: { value: "Sunil" } });
    fireEvent.click(await screen.findByRole("button", { name: /Sunil Verma/i }));

    // Verify Employee ID parts populated dynamically
    expect(screen.getByLabelText("Issue Employee Dept Code")).toHaveValue("CLE");
    expect(screen.getByLabelText("Search Employee ID Number")).toHaveValue("009");
    expect(screen.getByLabelText("Search Site Location")).toHaveValue("CyberHub Tower B, Gurugram");

    // Select Black Shirt & Belt
    const selectButtons = await screen.findAllByRole("button", { name: /Select Item/i });
    fireEvent.click(selectButtons[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity for Black Shirt" }));
    fireEvent.click(selectButtons[1]!);

    // Total = (2 * 450) + (1 * 120) + 250 registration charge = ₹1,270
    expect(screen.getByText("₹1,270")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm & Issue Uniform Kit" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/uniform-issues/batch"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(onIssuedSuccess).toHaveBeenCalledTimes(1);
    });

    // Verify newly issued uniform kit renders inside CandidateDrawer for Sunil Verma
    fireEvent.click(screen.getByRole("button", { name: "Open Candidate Drawer" }));
    expect(await screen.findByText(/Issued Uniforms & Accessories \(2\)/)).toBeInTheDocument();
  });
});
