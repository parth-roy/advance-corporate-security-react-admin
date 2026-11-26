import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { Route as RecruitmentRoute } from "@/routes/recruitment";

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

describe("Recruitment dynamic site, designation, status, mobile, and date filters", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filters strictly by real candidate sites (no mock locations), mobile, designation, status, and date range", async () => {
    const candidates = [
      {
        id: "r1",
        employeeId: "ACS/SEC/2026/001",
        fullName: "Arun Roy",
        mobile: "9830112233",
        email: "",
        position: "Security Guard",
        location: "Salt Lake IT Park",
        experience: "Experienced",
        applicationDate: "2026-10-15",
        status: "Selected" as const,
        resumeName: "",
        remarks: "",
      },
      {
        id: "r2",
        employeeId: "ACS/CLE/2026/002",
        fullName: "Bikash Das",
        mobile: "9900887766",
        email: "",
        position: "Housekeeping Staff / Cleaner",
        location: "Howrah Logistics Hub",
        experience: "Fresher",
        applicationDate: "2026-11-20",
        status: "Shortlisted" as const,
        resumeName: "",
        remarks: "",
      },
    ];

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
        return createJsonResponse({
          success: true,
          data: {
            candidates,
            uniforms: [],
            uniformIssues: [],
            stockLogs: [],
            attendance: [],
            statutory: [],
            salaries: [],
            payslips: [],
            invoices: [],
            activities: [],
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

    expect(await screen.findByText("Arun Roy")).toBeInTheDocument();
    expect(screen.getByText("Bikash Das")).toBeInTheDocument();

    // Site filter dropdown contains ONLY real DB sites (zero mock Bengaluru/Mumbai entries)
    fireEvent.click(screen.getByLabelText("Filter by Site"));
    expect(await screen.findByRole("option", { name: "Salt Lake IT Park" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "TechPark Phase II, Bengaluru" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Salt Lake IT Park" }));

    expect(screen.getByText("Arun Roy")).toBeInTheDocument();
    expect(screen.queryByText("Bikash Das")).not.toBeInTheDocument();

    // Reset filters and filter by date range + mobile
    fireEvent.click(screen.getByRole("button", { name: /Reset Filters/i }));
    expect(screen.getByText("Bikash Das")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Application From Date"), {
      target: { value: "2026-11-01" },
    });
    expect(screen.queryByText("Arun Roy")).not.toBeInTheDocument();
    expect(screen.getByText("Bikash Das")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search recruitment"), {
      target: { value: "990088" },
    });
    expect(screen.getByText("Bikash Das")).toBeInTheDocument();
  });
});
