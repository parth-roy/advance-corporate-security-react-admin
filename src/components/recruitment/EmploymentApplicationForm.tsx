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
import { ACS_LOCATIONS } from "@/lib/acs-seed";
import type { Candidate, CandidateStatus, FamilyMember } from "@/lib/acs-types";
import { isValidEmail, isValidPhone } from "@/lib/acs-utils";

interface EmploymentApplicationFormProps {
  editing: Candidate | null;
  onCancel: () => void;
  onSave: (payload: Omit<Candidate, "id">, editId?: string) => void;
}

const STATUSES: CandidateStatus[] = ["New", "Shortlisted", "Selected", "Rejected"];
const MARITAL_STATUSES = ["Single", "Married", "Widowed", "Divorced"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyFamilyRow(): FamilyMember {
  return { name: "", relation: "", dateOfBirth: "" };
}

export function EmploymentApplicationForm({ editing, onCancel, onSave }: EmploymentApplicationFormProps) {
  const [fullName, setFullName] = useState("");
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [highestQualification, setHighestQualification] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [position, setPosition] = useState("Security Guard");
  const [identificationMark, setIdentificationMark] = useState("");
  const [experience, setExperience] = useState("Fresher");
  const [serviceCategory, setServiceCategory] = useState<"Civil" | "Defense">("Civil");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<CandidateStatus>("New");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [location, setLocation] = useState<string>(ACS_LOCATIONS[0]);
  const [joiningAs, setJoiningAs] = useState("");
  const [salary, setSalary] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [esiHolder, setEsiHolder] = useState<"Yes" | "No">("No");
  const [esiNumber, setEsiNumber] = useState("");
  const [uanNumber, setUanNumber] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([emptyFamilyRow()]);
  const [declarationAccepted, setDeclarationAccepted] = useState(true);
  const [declarationDate, setDeclarationDate] = useState(todayIso());
  const [declarationPlace, setDeclarationPlace] = useState("");
  const [applicantSignature, setApplicantSignature] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [remarks, setRemarks] = useState("");
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
      setMaritalStatus(editing.maritalStatus ?? "Single");
      setHighestQualification(editing.highestQualification ?? "");
      setMobile(editing.mobile);
      setEmail(editing.email ?? "");
      setHeight(editing.height ?? "");
      setWeight(editing.weight ?? "");
      setChest(editing.chest ?? "");
      setPosition(editing.position);
      setIdentificationMark(editing.identificationMark ?? "");
      setExperience(editing.experience);
      setServiceCategory(editing.serviceCategory ?? "Civil");
      setReference(editing.reference ?? "");
      setStatus(editing.status);
      setDateOfJoining(editing.dateOfJoining ?? "");
      setLocation(editing.location);
      setJoiningAs(editing.joiningAs ?? "");
      setSalary(editing.salary ?? "");
      setNomineeName(editing.nomineeName ?? "");
      setEsiHolder(editing.esiHolder ?? "No");
      setEsiNumber(editing.esiNumber ?? "");
      setUanNumber(editing.uanNumber ?? "");
      setFamilyMembers(
        editing.familyMembers && editing.familyMembers.length > 0
          ? editing.familyMembers
          : [emptyFamilyRow()],
      );
      setDeclarationAccepted(editing.declarationAccepted ?? true);
      setDeclarationDate(editing.declarationDate ?? todayIso());
      setDeclarationPlace(editing.declarationPlace ?? "");
      setApplicantSignature(editing.applicantSignature ?? editing.fullName);
      setResumeName(editing.resumeName ?? "");
      setRemarks(editing.remarks ?? "");
    } else {
      setFullName("");
      setFatherOrHusbandName("");
      setDateOfBirth("");
      setPermanentAddress("");
      setPresentAddress("");
      setSameAsPermanent(false);
      setMaritalStatus("Single");
      setHighestQualification("");
      setMobile("");
      setEmail("");
      setHeight("");
      setWeight("");
      setChest("");
      setPosition("Security Guard");
      setIdentificationMark("");
      setExperience("Fresher");
      setServiceCategory("Civil");
      setReference("");
      setStatus("New");
      setDateOfJoining("");
      setLocation(ACS_LOCATIONS[0]);
      setJoiningAs("");
      setSalary("");
      setNomineeName("");
      setEsiHolder("No");
      setEsiNumber("");
      setUanNumber("");
      setFamilyMembers([emptyFamilyRow()]);
      setDeclarationAccepted(true);
      setDeclarationDate(todayIso());
      setDeclarationPlace("");
      setApplicantSignature("");
      setResumeName("");
      setRemarks("");
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
    if (!isValidPhone(mobile)) {
      setError("Enter a valid 10–15 digit Mobile Number.");
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

    const cleanedFamily = familyMembers
      .map((m) => ({
        name: m.name.trim(),
        relation: m.relation.trim(),
        dateOfBirth: m.dateOfBirth.trim(),
      }))
      .filter((m) => m.name || m.relation || m.dateOfBirth);

    onSave(
      {
        fullName: fullName.trim(),
        fatherOrHusbandName: fatherOrHusbandName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        permanentAddress: permanentAddress.trim(),
        presentAddress: (sameAsPermanent ? permanentAddress : presentAddress).trim(),
        maritalStatus,
        highestQualification: highestQualification.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        height: height.trim(),
        weight: weight.trim(),
        chest: chest.trim(),
        position: position.trim(),
        identificationMark: identificationMark.trim(),
        location: location.trim(),
        experience: experience.trim() || "Fresher",
        serviceCategory,
        reference: reference.trim(),
        applicationDate: editing?.applicationDate ?? todayIso(),
        status,
        dateOfJoining: dateOfJoining.trim(),
        joiningAs: joiningAs.trim(),
        salary: salary.trim(),
        nomineeName: nomineeName.trim(),
        esiHolder,
        esiNumber: esiHolder === "Yes" ? esiNumber.trim() : "",
        uanNumber: esiHolder === "Yes" ? uanNumber.trim() : "",
        familyMembers: cleanedFamily,
        declarationAccepted,
        declarationDate: declarationDate.trim() || todayIso(),
        declarationPlace: declarationPlace.trim(),
        applicantSignature: (applicantSignature || fullName).trim(),
        resumeName: resumeName || `${fullName.trim().replace(/\s+/g, "_")}_Application.pdf`,
        remarks: remarks.trim(),
      },
      editing?.id,
    );

    toast.success(editing ? "Employee application updated." : "Employee application registered.");
    onCancel();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="size-4" />
          Back to Recruitment
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          {editing ? `Editing Record: ${editing.fullName}` : "New Recruitment Entry"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="acs-card space-y-6 p-5 sm:p-8" noValidate>
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
                <SelectTrigger id="emp-marital"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-qual">Highest Qualification</Label>
              <Input
                id="emp-qual"
                value={highestQualification}
                onChange={(e) => setHighestQualification(e.target.value)}
                placeholder="e.g. 10th Pass, 12th Pass, Graduate"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-mobile">Mobile Number *</Label>
              <Input
                id="emp-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98450 11223"
                required
              />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-height">Height</Label>
              <Input
                id="emp-height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 5 ft 9 in / 175 cm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-weight">Weight</Label>
              <Input
                id="emp-weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 70 kg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-chest">Chest</Label>
              <Input
                id="emp-chest"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                placeholder="e.g. 36-38 in"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-imark">I/Mark (Identification Mark)</Label>
              <Input
                id="emp-imark"
                value={identificationMark}
                onChange={(e) => setIdentificationMark(e.target.value)}
                placeholder="e.g. Scar / Mole on right hand"
              />
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
              <Input
                id="emp-designation"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Security Guard"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-exp">Experience</Label>
              <Input
                id="emp-exp"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 3 Years / Fresher"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-civil-defense">Civil / Defense</Label>
              <Select value={serviceCategory} onValueChange={(v) => setServiceCategory(v as "Civil" | "Defense")}>
                <SelectTrigger id="emp-civil-defense"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Defense">Defense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CandidateStatus)}>
                <SelectTrigger id="emp-status"><SelectValue /></SelectTrigger>
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
                list="acs-sites-list"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Deployment site / location"
                required
              />
              <datalist id="acs-sites-list">
                {ACS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-as">As (Deployed Role)</Label>
              <Input
                id="emp-as"
                value={joiningAs}
                onChange={(e) => setJoiningAs(e.target.value)}
                placeholder="e.g. Shift Guard / Supervisor"
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
                <SelectTrigger id="emp-esi-holder"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No (N)</SelectItem>
                  <SelectItem value="Yes">Yes (Y)</SelectItem>
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
    </div>
  );
}
