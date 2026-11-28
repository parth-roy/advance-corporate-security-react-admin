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
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import {
  parseEmployeesCsv,
  parseOpeningAdvancesCsv,
  parseOpeningUniformPlansCsv,
  parseSitesCsv,
} from "@/lib/onboarding-csv";
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

describe("Phase 7 (P7.1 & P7.3): Legacy Onboarding CSV/Excel Importer & Settings Migration UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses copied Excel TSV and quoted CSV rows for Sites, 600+ Employees, Advances & Uniform EMIs", () => {
    const sitesParsed = parseSitesCsv(
      [
        "Unit Code,Unit,Client,GSTIN,Tax Mode,Sub Units",
        'NIELIT-PATNA,NIELIT PATNA,"Director, NIELIT Bihta",10AAATD0315M1ZC,IGST,"PATNA CAMPUS | BIHTA"',
      ].join("\n"),
    );
    expect(sitesParsed.rows).toHaveLength(1);
    expect(sitesParsed.rows[0]?.siteCode).toBe("NIELIT-PATNA");
    expect(sitesParsed.rows[0]?.clientName).toBe("Director, NIELIT Bihta");
    expect(sitesParsed.rows[0]?.clientGstin).toBe("10AAATD0315M1ZC");

    // Simulate 600 employees pasted directly from Excel (Tab-delimited)
    const tsvHeader = "Staff No\tName\tLocation\tRank\tWage Basis\tRate\tUAN\tESIC\tIFSC";
    const tsvLines = Array.from({ length: 600 }, (_, i) =>
      `${1781 + i}\tGuard ${i + 1}\tMSME TOOL ROOM\tSecurity Guard\tDAILY\t414\t100900${i}\t3100${i}\tutib0000436`,
    );
    const empParsed = parseEmployeesCsv([tsvHeader, ...tsvLines].join("\n"));
    expect(empParsed.rows).toHaveLength(600);
    expect(empParsed.rows[0]?.legacyEmpCode).toBe("1781");
    expect(empParsed.rows[0]?.fullName).toBe("Guard 1");
    expect(empParsed.rows[0]?.siteName).toBe("MSME TOOL ROOM");
    expect(empParsed.rows[0]?.baseRate).toBe("414");

    const advParsed = parseOpeningAdvancesCsv(
      "Legacy Code\tName\tSite\tAmount\tRecovered\tEMIs\n1072\tAMIT BANERJEE\tPHE MPDY\t5000\t2000\t3",
    );
    expect(advParsed.rows).toHaveLength(1);
    expect(advParsed.rows[0]?.amount).toBe("5000");
    expect(advParsed.rows[0]?.recoveredAmount).toBe("2000");

    const uniParsed = parseOpeningUniformPlansCsv(
      "Legacy Code,Employee Name,Site,Total Charge,Recovered,EMIs\n3065,SANTOH PRASDA,MSME TOOL ROOM,2500,625,3",
    );
    expect(uniParsed.rows).toHaveLength(1);
    expect(uniParsed.rows[0]?.totalCharge).toBe("2500");
    expect(uniParsed.rows[0]?.installmentCount).toBe("3");
  });

  it("stages rows across tabs inside /settings?tab=migration, runs dry-run preview, and commits via API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.endsWith("/api/admin/auth/me")) {
        return createJsonResponse({
          success: true,
          data: {
            user: {
              id: "admin-1",
              name: "Jai Gopal Roy",
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
          data: INITIAL_ACS_DATA,
        });
      }

      if (url.endsWith("/api/admin/onboarding-import") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const empCount = Array.isArray(body.employees) ? body.employees.length : 0;
        const uniCount = Array.isArray(body.openingUniformPlans) ? body.openingUniformPlans.length : 0;
        return createJsonResponse({
          success: true,
          data: {
            dryRun: Boolean(body.dryRun),
            defaultMonthKey: body.defaultMonthKey || "2026-11",
            received: {
              sites: 0,
              employees: empCount,
              openingAdvances: 0,
              openingUniformPlans: uniCount,
            },
            valid: {
              sites: 0,
              employees: empCount,
              openingAdvances: 0,
              openingUniformPlans: uniCount,
            },
            applied: {
              sitesCreated: 1,
              sitesUpdated: 0,
              employeesCreated: empCount,
              employeesUpdated: 0,
              advancesCreated: 0,
              advancesSkippedDuplicate: 0,
              uniformPlansCreated: uniCount,
              uniformPlansSkippedDuplicate: 0,
            },
            errors: [],
          },
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
    const settingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/settings",
      validateSearch: SettingsRoute.options.validateSearch!,
      component: SettingsRoute.options.component!,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([settingsRoute]),
      history: createMemoryHistory({ initialEntries: ["/settings?tab=migration"] }),
      context: { queryClient },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Legacy Excel & CSV Onboarding Importer"),
    ).toBeInTheDocument();

    // Wait for AuthProvider session + /api/admin/overview hydration to settle into "authenticated"
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([reqUrl]) =>
          String(reqUrl).endsWith("/api/admin/overview"),
        ),
      ).toBe(true);
    });

    // Load sample rows into Employees tab
    fireEvent.click(screen.getByRole("button", { name: /Load Sample Rows/i }));
    expect(await screen.findByText("ANJAN GOSWAMI")).toBeInTheDocument();

    // Switch to Uniform EMIs tab and load sample rows
    fireEvent.click(screen.getByRole("button", { name: /Unpaid Dress \/ Uniform EMIs/i }));
    fireEvent.click(screen.getByRole("button", { name: /Load Sample Rows/i }));
    expect(await screen.findByText("JIT KUNDU")).toBeInTheDocument();

    // Run Dry-Run preview
    fireEvent.click(screen.getByRole("button", { name: /Validate & Dry-Run Preview/i }));
    expect(await screen.findByText("Dry-Run Validation Report")).toBeInTheDocument();
    expect(screen.getByText("+3 created · 0 updated")).toBeInTheDocument();

    // Commit Batch Import
    fireEvent.click(screen.getByRole("button", { name: /Commit Import/i }));
    expect(await screen.findByText("Committed Onboarding Summary")).toBeInTheDocument();

    await waitFor(() => {
      const importCalls = fetchMock.mock.calls.filter(([reqUrl]) =>
        String(reqUrl).endsWith("/api/admin/onboarding-import"),
      );
      expect(importCalls).toHaveLength(2);
    });
  });
});
