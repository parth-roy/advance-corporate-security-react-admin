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
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

describe("EmploymentApplicationForm", () => {
  it("starts with empty defaults and submits full payload after user input", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByText("Application Form for Employment")).toBeInTheDocument();
    expect(screen.getByLabelText("Designation *")).toHaveValue("");
    expect(screen.getByLabelText("Site *")).toHaveValue("");
    expect(screen.getByLabelText("Experience")).toHaveTextContent("Select experience");
    expect(screen.getByLabelText("Civil / Defense")).toHaveTextContent("Select Civil / Defense");
    expect(screen.getByLabelText("ESI Holder (Y/N)")).toHaveTextContent("Select Yes or No");

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Rajesh Kumar" } });
    fireEvent.change(screen.getByLabelText("Father / Husband’s Name"), { target: { value: "Mohan Kumar" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Height Inches"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Weight"), { target: { value: "72" } });
    fireEvent.change(screen.getByLabelText("Chest"), { target: { value: "36-38" } });
    fireEvent.change(screen.getByLabelText("Designation *"), { target: { value: "Security Guard" } });
    fireEvent.change(screen.getByLabelText("Employee ID Number"), { target: { value: "042" } });
    fireEvent.change(screen.getByLabelText("Site *"), { target: { value: "TechPark Phase II, Bengaluru" } });
    fireEvent.change(screen.getByLabelText("Family member 1 name"), { target: { value: "Sunita Devi" } });
    fireEvent.change(screen.getByLabelText("Family member 1 relation"), { target: { value: "Spouse" } });
    fireEvent.change(screen.getByLabelText("Place"), { target: { value: "Kolkata" } });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I hereby declare that the above-mentioned information/i,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedPayload = onSave.mock.calls[0]?.[0];
    expect(savedPayload.fullName).toBe("Rajesh Kumar");
    expect(savedPayload.mobile).toBe("9876543210");
    expect(savedPayload.position).toBe("Security Guard");
    expect(savedPayload.employeeId).toMatch(/^ACS\/SEC\/\d{4}\/042$/);
    expect(savedPayload.joiningAs).toBe("Security Guard");
    expect(savedPayload.location).toBe("TechPark Phase II, Bengaluru");
    expect(savedPayload.experience).toBe("");
    expect(savedPayload.serviceCategory).toBe("");
    expect(savedPayload.esiHolder).toBe("");
    expect(savedPayload.height).toBe("5 ft 9 in");
    expect(savedPayload.weight).toBe("72 kg");
    expect(savedPayload.chest).toBe("36-38 in");
    expect(savedPayload.fatherOrHusbandName).toBe("Mohan Kumar");
    expect(savedPayload.familyMembers).toEqual([
      { name: "Sunita Devi", relation: "Spouse", dateOfBirth: "" },
    ]);
    expect(savedPayload.declarationAccepted).toBe(true);
    expect(savedPayload.declarationPlace).toBe("Kolkata");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("rejects mobile numbers that are not exactly 10 digits", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Rajesh Kumar" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "98765" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(screen.getByText("Mobile Number must be exactly 10 digits.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("fuzzy-filters designations when typing 'sup' in the single combobox input", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    const designationInput = screen.getByLabelText("Designation *");
    fireEvent.focus(designationInput);
    fireEvent.change(designationInput, { target: { value: "sup" } });

    expect(screen.getByRole("option", { name: "Security Supervisor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Housekeeping Supervisor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Facility Supervisor / Manager" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Landscaping Supervisor" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("option", { name: "Security Supervisor" }));
    expect(designationInput).toHaveValue("Security Supervisor");
  });

  it("supports typing and saving a custom manual designation in the same box", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <EmploymentApplicationForm
        editing={{
          id: "c99",
          fullName: "Ramesh Das",
          mobile: "9876543210",
          email: "",
          position: "Crane Rigging Specialist",
          location: "TechPark Phase II, Bengaluru",
          experience: "Experienced",
          declarationAccepted: true,
          applicationDate: "2026-11-26",
          status: "New",
          resumeName: "",
          remarks: "",
        }}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const designationInput = screen.getByLabelText("Designation *");
    expect(designationInput).toHaveValue("Crane Rigging Specialist");
    fireEvent.change(designationInput, { target: { value: "Boom Lift Operator" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Employee Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0].position).toBe("Boom Lift Operator");
  });

  it("syncs As (Deployed Role) with Designation until manually overridden", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    const designationInput = screen.getByLabelText("Designation *");
    const deployedRoleInput = screen.getByLabelText("As (Deployed Role)");

    fireEvent.change(designationInput, { target: { value: "Security Supervisor" } });
    expect(deployedRoleInput).toHaveValue("Security Supervisor");

    fireEvent.change(deployedRoleInput, { target: { value: "Shift In-Charge" } });
    expect(deployedRoleInput).toHaveValue("Shift In-Charge");

    fireEvent.change(designationInput, { target: { value: "Field Officer" } });
    expect(deployedRoleInput).toHaveValue("Shift In-Charge");

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Rohan Sharma" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Site *"), { target: { value: "Corporate Park, Pune" } });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I hereby declare that the above-mentioned information/i,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0].position).toBe("Field Officer");
    expect(onSave.mock.calls[0]?.[0].joiningAs).toBe("Shift In-Charge");
  });

  it("requires custom text when 'Other' is selected in Civil / Defense or I/Mark", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Vikram Singh" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Designation *"), { target: { value: "Armed Guard" } });
    fireEvent.change(screen.getByLabelText("Site *"), { target: { value: "Bank Vault, Jaipur" } });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I hereby declare that the above-mentioned information/i,
      }),
    );

    fireEvent.click(screen.getByLabelText("Civil / Defense"));
    fireEvent.click(screen.getByRole("option", { name: "Other" }));
    expect(screen.getByLabelText("Other Service Category")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));
    expect(
      screen.getByText("Please specify the Civil / Defense details when Other is selected."),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Other Service Category"), {
      target: { value: "Ex-Paramilitary (CRPF)" },
    });

    fireEvent.click(screen.getByLabelText("I/Mark (Identification Mark)"));
    fireEvent.click(screen.getByRole("option", { name: "Other (Enter Manually)" }));
    expect(screen.getByLabelText("Other Identification Mark")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));
    expect(
      screen.getByText("Please specify the Identification Mark when Other is selected."),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Other Identification Mark"), {
      target: { value: "Small scar above left eyebrow" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedPayload = onSave.mock.calls[0]?.[0];
    expect(savedPayload.serviceCategory).toBe("Ex-Paramilitary (CRPF)");
    expect(savedPayload.identificationMark).toBe("Small scar above left eyebrow");
    expect(savedPayload.identificationMarks).toEqual(["Small scar above left eyebrow"]);
  });

  it("supports selecting one or multiple identification marks via outside click or Done button", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<EmploymentApplicationForm editing={null} onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Manoj Tiwari" } });
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByLabelText("Designation *"), { target: { value: "Security Guard" } });
    fireEvent.change(screen.getByLabelText("Site *"), { target: { value: "Metro Depot, Delhi" } });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I hereby declare that the above-mentioned information/i,
      }),
    );

    const imarkTrigger = screen.getByLabelText("I/Mark (Identification Mark)");
    fireEvent.click(imarkTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Mole on right cheek" }));

    // Clicking outside retains the chosen single mark and closes the dropdown
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(imarkTrigger).toHaveTextContent("Mole on right cheek");

    // Re-open, add a second mark and Other, then close with the Done button
    fireEvent.click(imarkTrigger);
    fireEvent.click(screen.getByRole("option", { name: "Cut scar on forehead" }));
    fireEvent.click(screen.getByRole("option", { name: "Other (Enter Manually)" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Other Identification Mark"), {
      target: { value: "Burn mark near ankle" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit Employment Application" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedPayload = onSave.mock.calls[0]?.[0];
    expect(savedPayload.identificationMarks).toEqual([
      "Mole on right cheek",
      "Cut scar on forehead",
      "Burn mark near ankle",
    ]);
    expect(savedPayload.identificationMark).toBe(
      "Mole on right cheek, Cut scar on forehead, Burn mark near ankle",
    );
  });
});
