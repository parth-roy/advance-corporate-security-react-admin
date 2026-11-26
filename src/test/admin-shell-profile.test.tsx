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
import { AppShell } from "@/components/acs/AppShell";
import { AdminProfileView } from "@/components/settings/AdminProfileView";
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";
import { AcsStoreProvider } from "@/lib/acs-store";
import { AuthProvider } from "@/lib/auth";
import { Route as SettingsRoute } from "@/routes/settings";

beforeAll(() => {
  if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildTestRouter(queryClient: QueryClient) {
  const rootRoute = createRootRoute({
    component: () => (
      <AuthProvider>
        <AcsStoreProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </AcsStoreProvider>
      </AuthProvider>
    ),
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>Overview Content</div>,
  });

  const attendanceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/attendance",
    component: () => <div>Attendance Module View</div>,
  });

  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/settings",
    validateSearch: (search: Record<string, unknown>): { tab: "profile" | "settings" } => ({
      tab: search["tab"] === "profile" ? "profile" : "settings",
    }),
    component: function TestSettingsRoute() {
      const { tab } = settingsRoute.useSearch();
      if (tab === "profile") return <AdminProfileView />;
      const SettingsComp = SettingsRoute.options.component as React.ComponentType;
      return SettingsComp ? <SettingsComp /> : <div>Workspace Settings</div>;
    },
  });

  const routeTree = rootRoute.addChildren([indexRoute, attendanceRoute, settingsRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient },
  });
}

describe("Admin profile, dynamic notifications, and header search", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens dedicated Admin Profile screen on navbar click, saves live profile updates, tracks notifications, and navigates via search", async () => {
    let currentUser = {
      id: "admin-1",
      name: "Parth Roy",
      email: "parth@advancecorporatesecurity.com",
      phone: "9876543210",
      jobTitle: "Founder",
      role: "super_admin",
      isActive: true,
      lastLoginAt: "2026-11-26T07:30:00.000Z",
    };

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/admin/auth/me") && method === "GET") {
        return createJsonResponse({ success: true, data: { user: currentUser } });
      }
      if (url.endsWith("/api/admin/auth/me") && method === "PATCH") {
        const parsed = JSON.parse(String(init?.body ?? "{}")) as Partial<typeof currentUser>;
        currentUser = { ...currentUser, ...parsed };
        return createJsonResponse({
          success: true,
          data: { user: currentUser, token: "refreshed-jwt-token" },
        });
      }
      if (url.endsWith("/api/admin/auth/users")) {
        return createJsonResponse({ success: true, data: [currentUser] });
      }
      if (url.endsWith("/api/admin/overview")) {
        return createJsonResponse({
          success: true,
          data: {
            ...INITIAL_ACS_DATA,
            activities: [
              {
                id: "act-live-1",
                title: "Candidate shortlisted",
                detail: "Suresh Nair moved to Shortlisted.",
                module: "Recruitment",
                timestamp: "2 mins ago",
              },
            ],
          },
        });
      }
      return createJsonResponse({ success: true, data: {} });
    });

    const queryClient = new QueryClient();
    const router = buildTestRouter(queryClient);

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Wait for authenticated shell with live user identity from /me
    expect(await screen.findByText("Parth Roy")).toBeInTheDocument();

    // Check unread notifications badge renders dynamically and opens popover
    const unreadBadge = await screen.findByTestId("unread-notification-badge");
    expect(Number(unreadBadge.textContent)).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("Candidate shortlisted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Mark all read/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("unread-notification-badge")).not.toBeInTheDocument();
    });

    // Global search for "attendance" navigates directly to Attendance module
    const searchInput = screen.getByLabelText("Global search");
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "attendance" } });
    fireEvent.click(await screen.findByRole("button", { name: /Module · Operations/i }));

    expect(await screen.findByText("Attendance Module View")).toBeInTheDocument();

    // Clicking top-right profile link opens the separate Admin Profile screen (not Company Settings)
    fireEvent.click(screen.getByRole("link", { name: "Open Admin Profile" }));

    expect(await screen.findByRole("heading", { name: "Admin Profile" })).toBeInTheDocument();
    expect(screen.queryByText("Company Information & Logo")).not.toBeInTheDocument();

    const nameField = await screen.findByLabelText("Full Name *");
    const emailField = screen.getByLabelText("Email Address *");
    const phoneField = screen.getByLabelText("Phone Number");
    const titleField = screen.getByLabelText("Role / Designation");

    expect(nameField).toHaveValue("Parth Roy");
    expect(emailField).toHaveValue("parth@advancecorporatesecurity.com");
    expect(phoneField).toHaveValue("9876543210");
    expect(titleField).toHaveValue("Founder");

    // Edit profile dynamically and persist to backend /api/admin/auth/me
    fireEvent.change(nameField, { target: { value: "Parthasarathi Roy" } });
    fireEvent.change(phoneField, { target: { value: "9830011223" } });
    fireEvent.change(titleField, { target: { value: "Managing Director" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/auth/me"),
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(screen.getAllByText("Parthasarathi Roy").length).toBeGreaterThan(0);
    });

    // Saving profile triggers a fresh notification item in the bell
    expect(await screen.findByTestId("unread-notification-badge")).toHaveTextContent("1");
  });
});
