import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EmploymentApplicationForm } from "@/components/recruitment/EmploymentApplicationForm";

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("EmploymentApplicationForm", () => {
  it("renders all required employment form sections and submits full payload", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByText("Application Form for Employment")).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Father / Husband’s Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of Birth")).toBeInTheDocument();
    expect(screen.getByLabelText("Permanent Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Present Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Highest Qualification")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile Number *")).toBeInTheDocument();
    expect(screen.getByLabelText("Height")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight")).toBeInTheDocument();
    expect(screen.getByLabelText("Chest")).toBeInTheDocument();
    expect(screen.getByLabelText("Designation *")).toBeInTheDocument();
    expect(screen.getByLabelText("I/Mark (Identification Mark)")).toBeInTheDocument();
    expect(screen.getByLabelText("Experience")).toBeInTheDocument();
    expect(screen.getByLabelText("Reference")).toBeInTheDocument();
    expect(screen.getByLabelText("Date of Joining")).toBeInTheDocument();
    expect(screen.getByLabelText("Site *")).toBeInTheDocument();
    expect(screen.getByLabelText("As (Deployed Role)")).toBeInTheDocument();
    expect(screen.getByLabelText("Salary")).toBeInTheDocument();
    expect(screen.getByLabelText("Name of Nominee")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Rajesh Kumar" } });
    fireEvent.change(screen.getByLabelText("Father / Husband’s Name"), { target: { value: "Mohan Kumar" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "+91 98765 43210" } });
    fireEvent.change(screen.getByLabelText("Designation *"), { target: { value: "Senior Security Guard" } });
    fireEvent.change(screen.getByLabelText("Family member 1 name"), { target: { value: "Sunita Devi" } });
    fireEvent.change(screen.getByLabelText("Family member 1 relation"), { target: { value: "Spouse" } });
    fireEvent.change(screen.getByLabelText("Place"), { target: { value: "Kolkata" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedPayload = onSave.mock.calls[0]?.[0];
    expect(savedPayload.fullName).toBe("Rajesh Kumar");
    expect(savedPayload.fatherOrHusbandName).toBe("Mohan Kumar");
    expect(savedPayload.familyMembers).toEqual([
      { name: "Sunita Devi", relation: "Spouse", dateOfBirth: "" },
    ]);
    expect(savedPayload.declarationAccepted).toBe(true);
    expect(savedPayload.declarationPlace).toBe("Kolkata");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
