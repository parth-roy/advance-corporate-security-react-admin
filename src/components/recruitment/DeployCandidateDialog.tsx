import { useEffect, useState } from "react";
import { UserCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAcsStore } from "@/lib/acs-store";
import type { Candidate, EmployeeRateType } from "@/lib/acs-types";
import { isSyntheticAttendanceId } from "@/lib/attendance-utils";

interface DeployCandidateDialogProps {
  candidate: Candidate | null;
  onClose: () => void;
  onDeployed?: (empCode: string) => void;
}

function parseSalaryDigits(raw?: string): number {
  const digits = String(raw || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/)?.[1];
  const parsed = digits ? Number(digits) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function DeployCandidateDialog({
  candidate,
  onClose,
  onDeployed,
}: DeployCandidateDialogProps) {
  const { data, deployCandidateToEmployee, previewNextEmployeeCode } = useAcsStore();

  const [siteName, setSiteName] = useState("");
  const [subUnit, setSubUnit] = useState("");
  const [designation, setDesignation] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [legacyEmpCode, setLegacyEmpCode] = useState("");
  const [rateType, setRateType] = useState<EmployeeRateType>("MONTHLY");
  const [baseRate, setBaseRate] = useState("0");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [idInCustody, setIdInCustody] = useState(false);
  const [custodyDocType, setCustodyDocType] = useState("Original Voter ID");
  const [custodyRefNo, setCustodyRefNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    const desig = (candidate.joiningAs || candidate.position || "Security Guard").trim();
    const numericSalary = parseSalaryDigits(candidate.salary);
    setSiteName(candidate.location || "");
    setSubUnit("");
    setDesignation(desig);
    setLegacyEmpCode("");
    setBaseRate(String(numericSalary));
    setRateType(numericSalary > 0 && numericSalary < 2500 ? "DAILY" : "MONTHLY");
    setDateOfJoining(candidate.dateOfJoining || new Date().toISOString().slice(0, 10));
    setIdInCustody(false);
    setCustodyRefNo("");

    const existingId = (candidate.employeeId || "").trim().toUpperCase();
    if (existingId && !isSyntheticAttendanceId(existingId)) {
      setEmpCode(existingId);
    } else {
      setEmpCode("");
      void previewNextEmployeeCode(desig, (candidate.dateOfJoining || "").slice(0, 4)).then((code) => {
        setEmpCode(code);
      });
    }
  }, [candidate, previewNextEmployeeCode]);

  const handleGenerateCode = async () => {
    const generated = await previewNextEmployeeCode(designation, dateOfJoining.slice(0, 4));
    setEmpCode(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;
    if (!siteName.trim()) {
      toast.error("Please enter or select a deployment site.");
      return;
    }

    const matchedSite = data.sites.find(
      (s) => s.siteName.trim().toLowerCase() === siteName.trim().toLowerCase(),
    );
    const parsedRate = Number(baseRate || 0);
    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      toast.error("Base Rate must be a valid non-negative number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await deployCandidateToEmployee(candidate.id, {
        ...(matchedSite ? { siteId: matchedSite.id } : {}),
        siteName: siteName.trim(),
        subUnit: subUnit.trim(),
        designation: designation.trim(),
        ...(empCode.trim() ? { empCode: empCode.trim().toUpperCase() } : {}),
        ...(legacyEmpCode.trim() ? { legacyEmpCode: legacyEmpCode.trim().toUpperCase() } : {}),
        rateType,
        baseRate: parsedRate,
        dateOfJoining: dateOfJoining.trim(),
        ...(idInCustody
          ? {
              originalIdCustody: {
                documentType: custodyDocType.trim() || "Original Voter ID",
                referenceNo: custodyRefNo.trim(),
                depositedDate: new Date().toISOString().slice(0, 10),
                inCustody: true,
                notes: "Collected at deployment",
              },
            }
          : {}),
      });
      if (res) {
        toast.success(
          `${res.employee.fullName} deployed to ${res.employee.siteName} (${res.employee.empCode}).`,
        );
        onDeployed?.(res.employee.empCode);
        onClose();
      } else {
        toast.error("Sign in to the live server to deploy candidates to the employee directory.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deploy candidate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            Deploy Candidate as Employee
          </DialogTitle>
          <DialogDescription>
            Creates a site-linked Employee Directory record for <strong>{candidate?.fullName}</strong> without overwriting recruitment history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deploy-site">Deployment Site *</Label>
              <Input
                id="deploy-site"
                list="deploy-site-options"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Select or enter site name"
                required
              />
              <datalist id="deploy-site-options">
                {data.sites.map((s) => (
                  <option key={s.id} value={s.siteName} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deploy-subunit">Sub-Unit / Dept (Optional)</Label>
              <Input
                id="deploy-subunit"
                value={subUnit}
                onChange={(e) => setSubUnit(e.target.value)}
                placeholder="e.g. BO Guwahati, MVCC"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deploy-code">Employee Code (ACS)</Label>
              <div className="flex gap-1.5">
                <Input
                  id="deploy-code"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                  placeholder="Auto-generated if blank"
                  className="font-mono uppercase"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="Generate next sequence ID"
                  aria-label="Generate next employee code"
                  onClick={() => void handleGenerateCode()}
                >
                  <Wand2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deploy-legacy-code">Legacy Register Code (Optional)</Label>
              <Input
                id="deploy-legacy-code"
                value={legacyEmpCode}
                onChange={(e) => setLegacyEmpCode(e.target.value.toUpperCase())}
                placeholder="e.g. 3065"
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="deploy-desig">Deployed Rank / Role</Label>
              <Input
                id="deploy-desig"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deploy-rate-type">Wage Basis</Label>
              <Select value={rateType} onValueChange={(v) => setRateType(v as EmployeeRateType)}>
                <SelectTrigger id="deploy-rate-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly Salary</SelectItem>
                  <SelectItem value="DAILY">Per-Day Duty Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deploy-rate">Base Rate (₹)</Label>
              <Input
                id="deploy-rate"
                type="number"
                step="any"
                min={0}
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deploy-doj">Date of Joining</Label>
              <Input
                id="deploy-doj"
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-background p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <Checkbox
                checked={idInCustody}
                onCheckedChange={(checked) => setIdInCustody(checked === true)}
              />
              <span>Original Identity Document held in office custody (e.g. Voter ID)</span>
            </label>
            {idInCustody && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input
                  value={custodyDocType}
                  onChange={(e) => setCustodyDocType(e.target.value)}
                  placeholder="Document type (Voter ID)"
                />
                <Input
                  value={custodyRefNo}
                  onChange={(e) => setCustodyRefNo(e.target.value)}
                  placeholder="ID / Card Number"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Deploying..." : "Confirm Deployment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
