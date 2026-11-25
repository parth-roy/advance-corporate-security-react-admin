import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/routes/__root";

describe("Admin authentication gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks access and shows login form when unauthenticated", async () => {
    render(
      <AuthProvider>
        <AuthGate>
          <div>Protected Dashboard Content</div>
        </AuthGate>
      </AuthProvider>,
    );

    expect(await screen.findByText("Admin Portal Sign In")).toBeInTheDocument();
    expect(screen.queryByText("Protected Dashboard Content")).not.toBeInTheDocument();
  });

  it("denies login when backend rejects credentials (user not in DB)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          message: "Invalid email or password. Account not found in database.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <AuthProvider>
        <AuthGate>
          <div>Protected Dashboard Content</div>
        </AuthGate>
      </AuthProvider>,
    );

    const emailInput = await screen.findByLabelText("Work Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "unknown@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In to Dashboard" }));

    expect(
      await screen.findByText("Invalid email or password. Account not found in database."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Protected Dashboard Content")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows access after DB-backed login succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            token: "jwt-token-abc",
            user: {
              id: "u1",
              name: "Rajeshwar Nair",
              email: "admin@advancecorporatesecurity.com",
              role: "super_admin",
              isActive: true,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <AuthProvider>
        <AuthGate>
          <div>Protected Dashboard Content</div>
        </AuthGate>
      </AuthProvider>,
    );

    const emailInput = await screen.findByLabelText("Work Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "admin@advancecorporatesecurity.com" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In to Dashboard" }));

    await waitFor(() => {
      expect(screen.getByText("Protected Dashboard Content")).toBeInTheDocument();
    });
    expect(window.localStorage.getItem("acs_admin_auth_token")).toBe("jwt-token-abc");
  });
});
