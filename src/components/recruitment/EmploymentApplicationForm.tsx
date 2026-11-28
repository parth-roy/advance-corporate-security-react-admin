import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AcsLogo } from "@/components/acs/AcsLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DesignationCombobox } from "@/components/recruitment/DesignationCombobox";
import { IdentificationMarkMultiSelect } from "@/components/recruitment/IdentificationMarkMultiSelect";
import { CandidateDocumentsPanel } from "@/components/recruitment/CandidateDocumentsPanel";
import { ACS_IDENTIFICATION_MARK_GROUPS } from "@/lib/acs-seed";
import { useOptionalAcsStore } from "@/lib/acs-store";
import type { Candidate, CandidateDocuments, CandidateStatus, FamilyMember } from "@/lib/acs-types";
import { isValidEmail } from "@/lib/acs-utils";
import { getMissingRequiredDocuments } from "@/lib/candidate-documents";
import { buildEmployeeId, inferDepartmentCode, parseEmployeeId } from "@/lib/employee-id";

interface EmploymentApplicationFormProps {
  editing: Candidate | null;
  onCancel: () => void;
  onSave: (payload: Omit<Candidate, "id">, editId?: string) => void;
}

const STATUSES: CandidateStatus[] = ["New", "Shortlisted", "Selected", "Rejected"];
const MARITAL_STATUSES = ["Single", "Married", "Widowed", "Divorced"];
const EXPERIENCE_OPTIONS = ["Fresher", "Experienced"] as const;
const PRESET_IDENTIFICATION_MARKS = ACS_IDENTIFICATION_MARK_GROUPS.flatMap((g) => g.marks);
const QUALIFICATION_OPTIONS = [
  "Class 8",
  "Class 9",
  "Class 10 (Matric)",
  "Class 12 (Intermediate)",
  "ITI / Diploma",
  "Graduate",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD / Doctorate",
  "Other",
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyFamilyRow(): FamilyMember {
  return { name: "", relation: "", dateOfBirth: "" };
}

type HeightUnit = "ft" | "cm" | "m" | "in";
type WeightUnit = "kg" | "lbs";
type ChestUnit = "in" | "cm";

function parseHeightValue(raw?: string): { unit: HeightUnit; primary: string; secondary: string } {
  const text = (raw ?? "").trim();
  if (!text) return { unit: "ft", primary: "", secondary: "" };

  const ftInMatch = text.match(/^(\d+(?:\.\d+)?)\s*(?:ft|')\s*(\d+(?:\.\d+)?)?\s*(?:in|")?$/i);
  if (ftInMatch) {
    return { unit: "ft", primary: ftInMatch[1] ?? "", secondary: ftInMatch[2] ?? "" };
  }
  const cmMatch = text.match(/^(\d+(?:\.\d+)?)\s*cm$/i);
  if (cmMatch) return { unit: "cm", primary: cmMatch[1] ?? "", secondary: "" };

  const mMatch = text.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (mMatch) return { unit: "m", primary: mMatch[1] ?? "", secondary: "" };

  const inMatch = text.match(/^(\d+(?:\.\d+)?)\s*(?:in|")$/i);
  if (inMatch) return { unit: "in", primary: inMatch[1] ?? "", secondary: "" };

  return { unit: "ft", primary: text, secondary: "" };
}

function formatHeightValue(unit: HeightUnit, primary: string, secondary: string): string {
  const p = primary.trim();
  const s = secondary.trim();
  if (!p && !s) return "";
  if (unit === "ft") {
    if (p && s) return `${p} ft ${s} in`;
    if (p) return `${p} ft`;
    return `${s} in`;
  }
  return p ? `${p} ${unit}` : "";
}

function heightConversionHint(unit: HeightUnit, primary: string, secondary: string): string {
  const p = Number.parseFloat(primary);
  const s = Number.parseFloat(secondary || "0");
  if (!Number.isFinite(p) || p <= 0) {
    if (unit === "ft") return "Example: 5 ft 9 in (or enter feet only, e.g. 5.9)";
    if (unit === "cm") return "Example: 175 cm";
    if (unit === "m") return "Example: 1.75 m";
    return "Example: 69 in";
  }

  let cm = 0;
  if (unit === "ft") {
    const inches = Number.isFinite(s) && s > 0 ? s : 0;
    cm = (p * 12 + inches) * 2.54;
  } else if (unit === "cm") {
    cm = p;
  } else if (unit === "m") {
    cm = p * 100;
  } else {
    cm = p * 2.54;
  }

  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const remInches = totalInches % 12;
  if (unit === "ft") return `≈ ${Math.round(cm)} cm (${(cm / 100).toFixed(2)} m)`;
  return `≈ ${feet} ft ${remInches} in (${Math.round(cm)} cm)`;
}

function parseUnitMeasurement<U extends string>(
  raw: string | undefined,
  allowedUnits: readonly U[],
  defaultUnit: U,
): { value: string; unit: U } {
  const text = (raw ?? "").trim();
  if (!text) return { value: "", unit: defaultUnit };
  for (const unit of allowedUnits) {
    const match = text.match(new RegExp(`^(.+?)\\s*${unit}$`, "i"));
    if (match?.[1]) {
      return { value: match[1].trim(), unit };
    }
  }
  return { value: text, unit: defaultUnit };
}

function formatUnitMeasurement(value: string, unit: string): string {
  const trimmed = value.trim();
  return trimmed ? `${trimmed} ${unit}` : "";
}

export function EmploymentApplicationForm({ editing, onCancel, onSave }: EmploymentApplicationFormProps) {
  const store = useOptionalAcsStore();
  const knownSites = store?.data.sites ?? [];
  const [fullName, setFullName] = useState("");
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState("");
  const [highestQualification, setHighestQualification] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("ft");
  const [heightPrimary, setHeightPrimary] = useState("");
  const [heightSecondary, setHeightSecondary] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [chestValue, setChestValue] = useState("");
  const [chestUnit, setChestUnit] = useState<ChestUnit>("in");
  const [position, setPosition] = useState("");
  const [empDeptCode, setEmpDeptCode] = useState("SEC");
  const [empDeptManual, setEmpDeptManual] = useState(false);
  const [empYear, setEmpYear] = useState(String(new Date().getFullYear()));
  const [empNumber, setEmpNumber] = useState("");
  const [imarkSelections, setImarkSelections] = useState<string[]>([]);
  const [imarkOtherSelected, setImarkOtherSelected] = useState(false);
  const [imarkOther, setImarkOther] = useState("");
  const [experience, setExperience] = useState("");
  const [serviceCategoryChoice, setServiceCategoryChoice] = useState<"" | "Civil" | "Defense" | "Other">("");
  const [serviceCategoryOther, setServiceCategoryOther] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<CandidateStatus | "">("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [location, setLocation] = useState("");
  const [joiningAs, setJoiningAs] = useState("");
  const [joiningAsManual, setJoiningAsManual] = useState(false);
  const [salary, setSalary] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [esiHolder, setEsiHolder] = useState<"Yes" | "No" | "">("");
  const [esiNumber, setEsiNumber] = useState("");
  const [uanNumber, setUanNumber] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([emptyFamilyRow()]);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [declarationDate, setDeclarationDate] = useState("");
  const [declarationPlace, setDeclarationPlace] = useState("");
  const [applicantSignature, setApplicantSignature] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [documents, setDocuments] = useState<CandidateDocuments>({});
  const [allowPendingDocs, setAllowPendingDocs] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setFullName(editing.fullName);
      setFatherOrHusbandName(editing.fatherOrHusbandName ?? "");
      setDateOfBirth(editing.dateOfBirth ?? "");
      setPermanentAddress(editing.permanentAddress ?? "");
      setPresentAddress(editing.presentAddress ?? "");
      setSameAsPermanent(
        Boolean(editing.permanentAddress && editing.permanentAddress === editing.presentAddress),
      );
      setMaritalStatus(editing.maritalStatus ?? "");
      setHighestQualification(editing.highestQualification ?? "");
      setMobile(editing.mobile.replace(/\D/g, "").slice(-10));
      setEmail(editing.email ?? "");
      const parsedHeight = parseHeightValue(editing.height);
      setHeightUnit(parsedHeight.unit);
      setHeightPrimary(parsedHeight.primary);
      setHeightSecondary(parsedHeight.secondary);
      const parsedWeight = parseUnitMeasurement<WeightUnit>(editing.weight, ["kg", "lbs"], "kg");
      setWeightValue(parsedWeight.value);
      setWeightUnit(parsedWeight.unit);
      const parsedChest = parseUnitMeasurement<ChestUnit>(editing.chest, ["in", "cm"], "in");
      setChestValue(parsedChest.value);
      setChestUnit(parsedChest.unit);
      setPosition(editing.position);
      const parsedId = parseEmployeeId(editing.employeeId, editing.position);
      setEmpDeptCode(parsedId.deptCode);
      setEmpDeptManual(Boolean(editing.employeeId));
      setEmpYear(parsedId.year);
      setEmpNumber(parsedId.number);
      const rawImarks =
        editing.identificationMarks && editing.identificationMarks.length > 0
          ? editing.identificationMarks.map((m) => m.trim()).filter(Boolean)
          : (editing.identificationMark ?? "")
              .split(/[;,]+/)
              .map((m) => m.trim())
              .filter(Boolean);
      const presetMarks = rawImarks.filter((m) => PRESET_IDENTIFICATION_MARKS.includes(m));
      const customMarks = rawImarks.filter((m) => !PRESET_IDENTIFICATION_MARKS.includes(m));
      setImarkSelections(presetMarks);
      setImarkOtherSelected(customMarks.length > 0);
      setImarkOther(customMarks.join(", "));
      setExperience(editing.experience ?? "");
      const rawSvc = (editing.serviceCategory ?? "").trim();
      if (!rawSvc) {
        setServiceCategoryChoice("");
        setServiceCategoryOther("");
      } else if (rawSvc === "Civil" || rawSvc === "Defense") {
        setServiceCategoryChoice(rawSvc);
        setServiceCategoryOther("");
      } else {
        setServiceCategoryChoice("Other");
        setServiceCategoryOther(rawSvc);
      }
      setReference(editing.reference ?? "");
      setStatus(editing.status ?? "");
      setDateOfJoining(editing.dateOfJoining ?? "");
      setLocation(editing.location ?? "");
      const rawJoiningAs = (editing.joiningAs ?? "").trim();
      setJoiningAs(rawJoiningAs || editing.position);
      setJoiningAsManual(Boolean(rawJoiningAs && rawJoiningAs !== editing.position));
      setSalary(editing.salary ?? "");
      setNomineeName(editing.nomineeName ?? "");
      setEsiHolder(editing.esiHolder ?? "");
      setEsiNumber(editing.esiNumber ?? "");
      setUanNumber(editing.uanNumber ?? "");
      setFamilyMembers(
        editing.familyMembers && editing.familyMembers.length > 0
          ? editing.familyMembers
          : [emptyFamilyRow()],
      );
      setDeclarationAccepted(editing.declarationAccepted ?? false);
      setDeclarationDate(editing.declarationDate ?? "");
      setDeclarationPlace(editing.declarationPlace ?? "");
      setApplicantSignature(editing.applicantSignature ?? editing.fullName);
      setResumeName(editing.resumeName ?? "");
      setRemarks(editing.remarks ?? "");
      const existingDocs = editing.documents ?? {};
      setDocuments(existingDocs);
      setAllowPendingDocs(getMissingRequiredDocuments(existingDocs).length > 0);
    } else {
      setFullName("");
      setFatherOrHusbandName("");
      setDateOfBirth("");
      setPermanentAddress("");
      setPresentAddress("");
      setSameAsPermanent(false);
      setMaritalStatus("");
      setHighestQualification("");
      setMobile("");
      setEmail("");
      setHeightUnit("ft");
      setHeightPrimary("");
      setHeightSecondary("");
      setWeightValue("");
      setWeightUnit("kg");
      setChestValue("");
      setChestUnit("in");
      setPosition("");
      setEmpDeptCode("SEC");
      setEmpDeptManual(false);
      setEmpYear(String(new Date().getFullYear()));
      setEmpNumber("");
      setImarkSelections([]);
      setImarkOtherSelected(false);
      setImarkOther("");
      setExperience("");
      setServiceCategoryChoice("");
      setServiceCategoryOther("");
      setReference("");
      setStatus("");
      setDateOfJoining("");
      setLocation("");
      setJoiningAs("");
      setJoiningAsManual(false);
      setSalary("");
      setNomineeName("");
      setEsiHolder("");
      setEsiNumber("");
      setUanNumber("");
      setFamilyMembers([emptyFamilyRow()]);
      setDeclarationAccepted(false);
      setDeclarationDate("");
      setDeclarationPlace("");
      setApplicantSignature("");
      setResumeName("");
      setRemarks("");
      setDocuments({});
      setAllowPendingDocs(false);
    }
    setError("");
  }, [editing]);

  const handleSameAddressToggle = (checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) {
      setPresentAddress(permanentAddress);
    }
  };

  const handlePermanentAddressChange = (val: string) => {
    setPermanentAddress(val);
    if (sameAsPermanent) {
      setPresentAddress(val);
    }
  };

  const updateFamilyRow = (index: number, field: keyof FamilyMember, value: string) => {
    setFamilyMembers((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)),
    );
  };

  const addFamilyRow = () => {
    setFamilyMembers((prev) => [...prev, emptyFamilyRow()]);
  };

  const removeFamilyRow = (index: number) => {
    setFamilyMembers((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : [emptyFamilyRow()]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Full Name is required.");
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      setError("Mobile Number must be exactly 10 digits.");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setError("Enter a valid Email address or leave it blank.");
      return;
    }
    if (!position.trim()) {
      setError("Designation is required.");
      return;
    }
    if (imarkOtherSelected && !imarkOther.trim()) {
      setError("Please specify the Identification Mark when Other is selected.");
      return;
    }
    if (serviceCategoryChoice === "Other" && !serviceCategoryOther.trim()) {
      setError("Please specify the Civil / Defense details when Other is selected.");
      return;
    }
    if (!location.trim()) {
      setError("Site / Location is required.");
      return;
    }
    if (esiHolder === "Yes" && (!esiNumber.trim() || !uanNumber.trim())) {
      setError("Please provide both ESI No and UAN No when ESI Holder is Yes.");
      return;
    }
    if (!declarationAccepted) {
      setError("Please confirm the declaration before submitting.");
      return;
    }

    const missingDocs = getMissingRequiredDocuments(documents);
    if (missingDocs.length > 0 && !allowPendingDocs) {
      setError(
        `Please upload all required documents (${missingDocs.map((d) => d.label).join(", ")}), or check "Save with pending documents (Draft)".`,
      );
      return;
    }

    const cleanedFamily = familyMembers
      .map((m) => ({
        name: m.name.trim(),
        relation: m.relation.trim(),
        dateOfBirth: m.dateOfBirth.trim(),
      }))
      .filter((m) => m.name || m.relation || m.dateOfBirth);

    const resolvedImarks = Array.from(
      new Set([
        ...imarkSelections.map((m) => m.trim()).filter(Boolean),
        ...(imarkOtherSelected && imarkOther.trim() ? [imarkOther.trim()] : []),
      ]),
    );
    const resolvedImark = resolvedImarks.join(", ");
    const resolvedServiceCategory =
      serviceCategoryChoice === "Other" ? serviceCategoryOther.trim() : serviceCategoryChoice;
    const resolvedJoiningAs = joiningAs.trim() || position.trim();

    const resolvedEmployeeId = buildEmployeeId({
      deptCode: empDeptCode,
      year: empYear,
      number: empNumber,
    });

    onSave(
      {
        employeeId: resolvedEmployeeId,
        fullName: fullName.trim(),
        fatherOrHusbandName: fatherOrHusbandName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        permanentAddress: permanentAddress.trim(),
        presentAddress: (sameAsPermanent ? permanentAddress : presentAddress).trim(),
        maritalStatus,
        highestQualification: highestQualification.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        height: formatHeightValue(heightUnit, heightPrimary, heightSecondary),
        weight: formatUnitMeasurement(weightValue, weightUnit),
        chest: formatUnitMeasurement(chestValue, chestUnit),
        position: position.trim(),
        identificationMark: resolvedImark,
        identificationMarks: resolvedImarks,
        location: location.trim(),
        experience: experience.trim(),
        serviceCategory: resolvedServiceCategory,
        reference: reference.trim(),
        applicationDate: editing?.applicationDate ?? todayIso(),
        status: status || "New",
        dateOfJoining: dateOfJoining.trim(),
        joiningAs: resolvedJoiningAs,
        salary: salary.trim(),
        nomineeName: nomineeName.trim(),
        esiHolder,
        esiNumber: esiHolder === "Yes" ? esiNumber.trim() : "",
        uanNumber: esiHolder === "Yes" ? uanNumber.trim() : "",
        familyMembers: cleanedFamily,
        declarationAccepted,
        declarationDate: declarationDate.trim(),
        declarationPlace: declarationPlace.trim(),
        applicantSignature: (applicantSignature || fullName).trim(),
        documents,
        resumeName: resumeName || `${fullName.trim().replace(/\s+/g, "_")}_Application.pdf`,
        remarks: remarks.trim(),
      },
      editing?.id,
    );

    toast.success(editing ? "Employee application updated." : "Employee application registered.");
    onCancel();
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="size-4" />
          Back to Recruitment
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          {editing ? `Editing Record: ${editing.fullName}` : "New Recruitment Entry"}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <form onSubmit={handleSubmit} className="acs-card space-y-6 p-5 sm:p-7 xl:col-span-8" noValidate>
        <div className="flex flex-col items-start justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <AcsLogo />
          <div className="sm:text-right">
            <h2 className="text-lg font-bold tracking-wide text-foreground uppercase sm:text-xl">
              Application Form for Employment
            </h2>
            <p className="text-xs text-muted-foreground">
              Advance Corporate Security — Personnel Recruitment & Onboarding Record
            </p>
          </div>
        </div>

        {/* Section 1: Personal & Contact */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            1. Personal & Address Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-full-name">Full Name *</Label>
              <Input
                id="emp-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-father-name">Father / Husband’s Name</Label>
              <Input
                id="emp-father-name"
                value={fatherOrHusbandName}
                onChange={(e) => setFatherOrHusbandName(e.target.value)}
                placeholder="Enter father or husband name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-dob">Date of Birth</Label>
              <Input
                id="emp-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-marital">Marital Status</Label>
              <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                <SelectTrigger id="emp-marital">
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-qual">Highest Qualification</Label>
              <Select value={highestQualification} onValueChange={setHighestQualification}>
                <SelectTrigger id="emp-qual">
                  <SelectValue placeholder="Select qualification" />
                </SelectTrigger>
                <SelectContent>
                  {highestQualification &&
                    !QUALIFICATION_OPTIONS.includes(
                      highestQualification as (typeof QUALIFICATION_OPTIONS)[number],
                    ) && (
                      <SelectItem value={highestQualification}>{highestQualification}</SelectItem>
                    )}
                  {QUALIFICATION_OPTIONS.map((qual) => (
                    <SelectItem key={qual} value={qual}>{qual}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-mobile">Mobile Number *</Label>
              <Input
                id="emp-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Must be exactly 10 digits ({mobile.length}/10)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-perm-addr">Permanent Address</Label>
              <Textarea
                id="emp-perm-addr"
                rows={3}
                value={permanentAddress}
                onChange={(e) => handlePermanentAddressChange(e.target.value)}
                placeholder="House No, Street, Village/Town, District, State, PIN"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emp-pres-addr">Present Address</Label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox
                    checked={sameAsPermanent}
                    onCheckedChange={(checked) => handleSameAddressToggle(checked === true)}
                  />
                  <span>Same as Permanent</span>
                </label>
              </div>
              <Textarea
                id="emp-pres-addr"
                rows={3}
                value={sameAsPermanent ? permanentAddress : presentAddress}
                onChange={(e) => {
                  setSameAsPermanent(false);
                  setPresentAddress(e.target.value);
                }}
                placeholder="Current residential address"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 2: Physical & Identification */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            2. Physical Measurements & Identification
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-height">Height</Label>
              <div className="flex items-center gap-2">
                {heightUnit === "ft" ? (
                  <>
                    <div className="relative flex-1">
                      <Input
                        id="emp-height"
                        type="number"
                        min={0}
                        max={9}
                        step="any"
                        value={heightPrimary}
                        onChange={(e) => setHeightPrimary(e.target.value)}
                        placeholder="5"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                        ft
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        id="emp-height-in"
                        aria-label="Height Inches"
                        type="number"
                        min={0}
                        max={11}
                        step="any"
                        value={heightSecondary}
                        onChange={(e) => setHeightSecondary(e.target.value)}
                        placeholder="9"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                        in
                      </span>
                    </div>
                  </>
                ) : (
                  <Input
                    id="emp-height"
                    type="number"
                    min={0}
                    step="any"
                    value={heightPrimary}
                    onChange={(e) => setHeightPrimary(e.target.value)}
                    placeholder={heightUnit === "cm" ? "175" : heightUnit === "m" ? "1.75" : "69"}
                    className="flex-1"
                  />
                )}
                <Select
                  value={heightUnit}
                  onValueChange={(val) => {
                    setHeightUnit(val as HeightUnit);
                    setHeightSecondary("");
                  }}
                >
                  <SelectTrigger aria-label="Height Unit" className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ft">ft / in</SelectItem>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="in">in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {heightConversionHint(heightUnit, heightPrimary, heightSecondary)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-weight">Weight</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="emp-weight"
                  type="number"
                  min={0}
                  step="any"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder={weightUnit === "kg" ? "72" : "158"}
                  className="flex-1"
                />
                <Select value={weightUnit} onValueChange={(val) => setWeightUnit(val as WeightUnit)}>
                  <SelectTrigger aria-label="Weight Unit" className="w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {weightUnit === "kg" ? "Example: 72 kg" : "Example: 158 lbs"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-chest">Chest</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="emp-chest"
                  value={chestValue}
                  onChange={(e) => setChestValue(e.target.value.replace(/[^0-9.\-]/g, ""))}
                  placeholder={chestUnit === "in" ? "36 or 36-38" : "92 or 92-97"}
                  className="flex-1"
                />
                <Select value={chestUnit} onValueChange={(val) => setChestUnit(val as ChestUnit)}>
                  <SelectTrigger aria-label="Chest Unit" className="w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">in</SelectItem>
                    <SelectItem value="cm">cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {chestUnit === "in"
                  ? "Example: 36 in or 36-38 in (normal - expanded)"
                  : "Example: 92 cm or 92-97 cm"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-imark">I/Mark (Identification Mark)</Label>
              <IdentificationMarkMultiSelect
                id="emp-imark"
                selectedMarks={imarkSelections}
                onSelectedMarksChange={setImarkSelections}
                otherSelected={imarkOtherSelected}
                onOtherSelectedChange={setImarkOtherSelected}
                otherValue={imarkOther}
                onOtherValueChange={setImarkOther}
              />
              <p className="text-[11px] text-muted-foreground">
                Select one or more visible marks (mole, scar, birthmark, tattoo), or use Done / click outside
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 3: Designation, Experience, Reference, Posting */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            3. Service, Posting & Compensation Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-designation">Designation *</Label>
              <DesignationCombobox
                id="emp-designation"
                value={position}
                onChange={(nextPos) => {
                  setPosition(nextPos);
                  if (!joiningAsManual) {
                    setJoiningAs(nextPos);
                  }
                  if (!empDeptManual) {
                    setEmpDeptCode(inferDepartmentCode(nextPos));
                  }
                }}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="emp-id-number">Employee ID (ACS / Dept / Year / Number)</Label>
              <div className="flex items-center gap-1.5">
                <span className="flex h-9 items-center rounded-md border border-input bg-muted px-2.5 text-xs font-semibold text-foreground">
                  ACS
                </span>
                <span className="text-muted-foreground">/</span>
                <Input
                  id="emp-id-dept"
                  aria-label="Employee Department Code"
                  value={empDeptCode}
                  onChange={(e) => {
                    setEmpDeptCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8));
                    setEmpDeptManual(true);
                  }}
                  placeholder="SEC"
                  className="w-20 text-center font-semibold uppercase"
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="emp-id-year"
                  aria-label="Employee ID Year"
                  value={empYear}
                  onChange={(e) => setEmpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="2026"
                  className="w-20 text-center tabular-nums"
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="emp-id-number"
                  aria-label="Employee ID Number"
                  value={empNumber}
                  onChange={(e) => setEmpNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                  placeholder="e.g. 001"
                  className="min-w-0 flex-1 font-medium uppercase"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {empNumber.trim()
                  ? `Formatted ID: ${buildEmployeeId({ deptCode: empDeptCode, year: empYear, number: empNumber })}`
                  : `Auto prefix from designation: ACS/${empDeptCode || "SEC"}/${empYear}/... (enter number)`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-exp">Experience</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger id="emp-exp">
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  {experience &&
                    !EXPERIENCE_OPTIONS.includes(
                      experience as (typeof EXPERIENCE_OPTIONS)[number],
                    ) && <SelectItem value={experience}>{experience}</SelectItem>}
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-civil-defense">Civil / Defense</Label>
              <Select
                value={serviceCategoryChoice}
                onValueChange={(v) => {
                  const next = v as "Civil" | "Defense" | "Other";
                  setServiceCategoryChoice(next);
                  if (next !== "Other") setServiceCategoryOther("");
                }}
              >
                <SelectTrigger id="emp-civil-defense">
                  <SelectValue placeholder="Select Civil / Defense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Defense">Defense</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {serviceCategoryChoice === "Other" && (
                <Input
                  id="emp-civil-defense-other"
                  aria-label="Other Service Category"
                  value={serviceCategoryOther}
                  onChange={(e) => setServiceCategoryOther(e.target.value)}
                  placeholder="Specify service category (e.g. Paramilitary)"
                  className="mt-1.5"
                  required
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CandidateStatus)}>
                <SelectTrigger id="emp-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-doj">Date of Joining</Label>
              <Input
                id="emp-doj"
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-site">Site *</Label>
              <Input
                id="emp-site"
                list="acs-real-sites-list"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter deployment site name"
                required
              />
              {knownSites.length > 0 && (
                <datalist id="acs-real-sites-list">
                  {knownSites.map((s) => (
                    <option key={s.id} value={s.siteName} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-as">As (Deployed Role)</Label>
              <Input
                id="emp-as"
                value={joiningAs}
                onChange={(e) => {
                  setJoiningAs(e.target.value);
                  setJoiningAsManual(true);
                }}
                placeholder="Defaults to Designation unless changed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-salary">Salary</Label>
              <Input
                id="emp-salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. ₹18,500 / month"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emp-ref">Reference</Label>
              <Input
                id="emp-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Referred by name / contact number"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email (Optional)</Label>
              <Input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@mail.in"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-resume">Resume / Document</Label>
              <Input
                id="emp-resume"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => setResumeName(e.target.files?.[0]?.name ?? resumeName)}
              />
              {resumeName && <p className="truncate text-[11px] text-muted-foreground">Selected: {resumeName}</p>}
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 4: Nominee & ESI/UAN */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            4. Nominee & Statutory (ESI / UAN) Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-nominee">Name of Nominee</Label>
              <Input
                id="emp-nominee"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                placeholder="Enter nominee full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-esi-holder">ESI Holder (Y/N)</Label>
              <Select value={esiHolder} onValueChange={(v) => setEsiHolder(v as "Yes" | "No")}>
                <SelectTrigger id="emp-esi-holder">
                  <SelectValue placeholder="Select Yes or No" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes (Y)</SelectItem>
                  <SelectItem value="No">No (N)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-esi-no">ESI No {esiHolder === "Yes" ? "*" : ""}</Label>
              <Input
                id="emp-esi-no"
                value={esiNumber}
                onChange={(e) => setEsiNumber(e.target.value)}
                placeholder={esiHolder === "Yes" ? "Enter ESI Number" : "If ESI Holder is Yes"}
                disabled={esiHolder !== "Yes"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-uan-no">UAN No {esiHolder === "Yes" ? "*" : ""}</Label>
              <Input
                id="emp-uan-no"
                value={uanNumber}
                onChange={(e) => setUanNumber(e.target.value)}
                placeholder={esiHolder === "Yes" ? "Enter UAN Number" : "If ESI Holder is Yes"}
                disabled={esiHolder !== "Yes"}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 5: Family / Dependent Details Table */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
                5. Family / Dependent Details
              </h3>
              <p className="text-xs text-muted-foreground">List nominee & family members for ESI/EPF records</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addFamilyRow}>
              <Plus className="size-3.5" />
              Add Row
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="acs-table-header hover:bg-transparent">
                  <TableHead className="w-16">Sl No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Relation</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead className="w-16 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyMembers.map((member, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={member.name}
                        onChange={(e) => updateFamilyRow(index, "name", e.target.value)}
                        placeholder="Member name"
                        aria-label={`Family member ${index + 1} name`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={member.relation}
                        onChange={(e) => updateFamilyRow(index, "relation", e.target.value)}
                        placeholder="e.g. Father, Mother, Spouse, Child"
                        aria-label={`Family member ${index + 1} relation`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={member.dateOfBirth}
                        onChange={(e) => updateFamilyRow(index, "dateOfBirth", e.target.value)}
                        aria-label={`Family member ${index + 1} date of birth`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() => removeFamilyRow(index)}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <Separator />

        {/* Section 6: Remarks & Declaration */}
        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp-remarks">Remarks / Verification Notes</Label>
            <Textarea
              id="emp-remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Interview notes, police verification, shift readiness..."
            />
          </div>

          <div className="space-y-4 rounded-xl border bg-background p-4">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <Checkbox
                checked={declarationAccepted}
                onCheckedChange={(checked) => setDeclarationAccepted(checked === true)}
                className="mt-0.5"
              />
              <span>
                I hereby declare that the above-mentioned information given by me is true to best of my knowledge.
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-decl-date">Date</Label>
                <Input
                  id="emp-decl-date"
                  type="date"
                  value={declarationDate}
                  onChange={(e) => setDeclarationDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-decl-place">Place</Label>
                <Input
                  id="emp-decl-place"
                  value={declarationPlace}
                  onChange={(e) => setDeclarationPlace(e.target.value)}
                  placeholder="City / Site location"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-decl-sig">Applicant Signature / Name</Label>
                <Input
                  id="emp-decl-sig"
                  value={applicantSignature}
                  onChange={(e) => setApplicantSignature(e.target.value)}
                  placeholder="Applicant full name / signature"
                />
              </div>
            </div>
          </div>
        </section>

        {getMissingRequiredDocuments(documents).length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
            <Checkbox
              checked={allowPendingDocs}
              onCheckedChange={(checked) => setAllowPendingDocs(checked === true)}
            />
            <span>
              Allow saving with pending required documents (Draft / Verify Later — {getMissingRequiredDocuments(documents).length} required remaining)
            </span>
          </label>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">
            <Save className="size-4" />
            {editing ? "Update Employee Application" : "Submit Employment Application"}
          </Button>
        </div>
      </form>

      <div className="xl:col-span-4 xl:sticky xl:top-20">
        <CandidateDocumentsPanel documents={documents} onChange={setDocuments} />
      </div>
      </div>
    </div>
  );
}
