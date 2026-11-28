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
import { EmploymentApplicationForm } from "@/components/recruitment/EmploymentApplicationForm";
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

describe("Employee Document Checklist, Preview, and Full-Screen Profile View", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires uploading the 9 mandatory documents unless Draft pending docs is enabled, uploads & previews files", async () => {
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
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
      if (url.endsWith("/api/admin/candidates/upload-document")) {
        return createJsonResponse(
          {
            success: true,
            data: {
              fileName: "aadhar-front.png",
              fileUrl: "https://sgp1.digitaloceanspaces.com/acs-bkp-do/recruitment-docs/aadhar-front.png",
              mimeType: "image/png",
              uploadedAt: "2026-11-27T06:50:00.000Z",
            },
          },
          201,
        );
      }
      if (init?.method === "POST") {
        return createJsonResponse({ success: true, data: {} }, 201);
      }
      return createJsonResponse({ success: true, data: {} });
    });

    const onSave = vi.fn();
    render(
      <AuthProvider>
        <EmploymentApplicationForm editing={null} onSave={onSave} onCancel={vi.fn()} />
      </AuthProvider>,
    );

    expect(await screen.findByText("Employee Documents")).toBeInTheDocument();
    expect(screen.getByText("0 / 9 Required")).toBeInTheDocument();
    expect(screen.getByText("Aadhar Card")).toBeInTheDocument();
    expect(screen.getByText("Authorized by Local Councillor / MLA")).toBeInTheDocument();
    expect(screen.getByText("10th")).toBeInTheDocument();
    expect(screen.getByText("12th")).toBeInTheDocument();
    expect(screen.getByText("Graduation")).toBeInTheDocument();
    expect(screen.getByText("Masters")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Suresh Sen" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Designation *"), { target: { value: "Security Guard" } });
    fireEvent.change(screen.getByLabelText("Site *"), { target: { value: "BHEL Complex" } });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I hereby declare that the above-mentioned information/i,
      }),
    );

    // Submitting without required documents blocks cleanly
    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please upload all required documents");
    expect(onSave).not.toHaveBeenCalled();

    // Upload Aadhar Card file and verify multipart request & View preview modal
    const aadharUploadLabel = screen.getByLabelText("Upload Aadhar Card");
    const fileInput = aadharUploadLabel.querySelector("input[type='file']") as HTMLInputElement;
    const sampleFile = new File(["fake-image"], "aadhar-front.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [sampleFile] } });

    await waitFor(() => {
      expect(screen.getByText("1 / 9 Required")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/candidates/upload-document"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "View Aadhar Card" }));
    expect(await screen.findByRole("img", { name: "aadhar-front.png" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]!);

    // Check Draft allow pending docs and save
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Allow saving with pending required documents/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0].documents?.aadharCard?.fileName).toBe("aadhar-front.png");
  });

  it("opens full-screen employee profile view when clicking the expand arrow in CandidateDrawer", async () => {
    window.localStorage.setItem("acs_admin_auth_token", "test-jwt-token");
    const candidate = {
      id: "cand-fs-1",
      employeeId: "ACS/SEC/2026/007",
      fullName: "Arjun Mondal",
      mobile: "9831011223",
      email: "arjun@mail.in",
      position: "Security Supervisor",
      location: "BHEL Housing",
      experience: "Experienced",
      applicationDate: "2026-11-27",
      status: "Selected" as const,
      documents: {
        aadharCard: {
          fileName: "arjun-aadhar.jpg",
          fileUrl: "https://sgp1.digitaloceanspaces.com/acs-bkp-do/recruitment-docs/arjun-aadhar.jpg",
          mimeType: "image/jpeg",
        },
        academicQualification: {
          "10th": {
            fileName: "10th-marksheet.pdf",
            fileUrl: "https://sgp1.digitaloceanspaces.com/acs-bkp-do/recruitment-docs/10th-marksheet.pdf",
            mimeType: "application/pdf",
          },
        },
      },
      resumeName: "",
      remarks: "All checks cleared.",
    };

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
            candidates: [candidate],
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

    fireEvent.click(await screen.findByRole("button", { name: "View Arjun Mondal" }));

    const expandBtn = await screen.findByRole("button", {
      name: "View in full screen to see all info of the employee",
    });
    fireEvent.click(expandBtn);

    expect(await screen.findByText("Uploaded Documents & Verification")).toBeInTheDocument();
    expect(screen.getByText("Personal & Physical Information")).toBeInTheDocument();
    expect(screen.getByText("arjun-aadhar.jpg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10th" })).toBeInTheDocument();
  });
});
