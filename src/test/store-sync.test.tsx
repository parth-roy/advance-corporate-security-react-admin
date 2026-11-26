import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/lib/auth";
import { AcsStoreProvider, useAcsStore } from "@/lib/acs-store";

function StoreProbe() {
  const { data, addCandidate } = useAcsStore();
  return (
    <div>
      <span data-testid="candidate-count">{data.candidates.length}</span>
      <span data-testid="first-candidate">{data.candidates[0]?.fullName ?? "none"}</span>
      <button
        type="button"
        onClick={() =>
          addCandidate({
            fullName: "Amit Sharma",
            fatherOrHusbandName: "Suresh Sharma",
            mobile: "9876543210",
            email: "",
            position: "Security Guard",
            location: "TechPark Phase II, Bengaluru",
            experience: "3 Years",
            height: "5 ft 9 in",
            weight: "72 kg",
            chest: "36-38 in",
            highestQualification: "Class 12 (Intermediate)",
            applicationDate: "2026-11-26",
            status: "New",
            esiHolder: "Yes",
            esiNumber: "ESI-101",
            uanNumber: "UAN-202",
            familyMembers: [{ name: "Priya Sharma", relation: "Spouse", dateOfBirth: "1995-04-10" }],
            declarationAccepted: true,
            declarationDate: "2026-11-26",
            declarationPlace: "Kolkata",
            applicantSignature: "Amit Sharma",
            resumeName: "",
            remarks: "",
          })
        }
      >
        Add
      </button>
    </div>
  );
}

describe("AcsStoreProvider backend DB sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates overview from backend DB and persists new employee applications", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
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
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              candidates: [
                {
                  id: "db-c1",
                  fullName: "Existing DB Guard",
                  mobile: "9988776655",
                  email: "",
                  position: "Security Guard",
                  location: "Kolkata",
                  experience: "2 Years",
                  applicationDate: "2026-11-25",
                  status: "New",
                  resumeName: "",
                  remarks: "",
                },
              ],
              uniforms: [],
              uniformIssues: [],
              stockLogs: [],
              attendance: [],
              statutory: [],
              salaries: [],
              payslips: [],
              invoices: [],
              activities: [],
              settings: {},
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "db-c2",
              fullName: "Amit Sharma",
              mobile: "9876543210",
              email: "",
              position: "Security Guard",
              location: "TechPark Phase II, Bengaluru",
              experience: "3 Years",
              applicationDate: "2026-11-26",
              status: "New",
              resumeName: "",
              remarks: "",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );

    render(
      <AuthProvider>
        <AcsStoreProvider>
          <StoreProbe />
        </AcsStoreProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("first-candidate")).toHaveTextContent("Existing DB Guard");
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByTestId("candidate-count")).toHaveTextContent("2");
      expect(screen.getByTestId("first-candidate")).toHaveTextContent("Amit Sharma");
    });

    const postCall = fetchMock.mock.calls.find(([url, init]) =>
      String(url).endsWith("/api/admin/candidates") && init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const sentBody = JSON.parse(String(postCall?.[1]?.body));
    expect(sentBody.mobile).toBe("9876543210");
    expect(sentBody.height).toBe("5 ft 9 in");
    expect(sentBody.highestQualification).toBe("Class 12 (Intermediate)");
    expect(sentBody.esiNumber).toBe("ESI-101");
    expect(sentBody.familyMembers).toHaveLength(1);
  });
});
