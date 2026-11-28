import { Link } from "@tanstack/react-router";
import { ArrowUpRight, FileCheck2, FileText, Mail, MapPin, Maximize2, Phone, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { useAcsStore } from "@/lib/acs-store";
import type { Candidate, CandidateStatus } from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";
import { getMissingRequiredDocuments, REQUIRED_DOCUMENT_COUNT } from "@/lib/candidate-documents";

interface CandidateDrawerProps {
  candidate: Candidate | null;
  onClose: () => void;
  onEdit: (candidate: Candidate) => void;
  onStatusChange: (candidate: Candidate, status: CandidateStatus) => void;
  onViewFullScreen?: (candidate: Candidate) => void;
  onDeploy?: (candidate: Candidate) => void;
}

export function CandidateDrawer({
  candidate,
  onClose,
  onEdit,
  onStatusChange,
  onViewFullScreen,
  onDeploy,
}: CandidateDrawerProps) {
  const { data } = useAcsStore();

  const employeeIssues = candidate
    ? data.uniformIssues.filter((issue) => {
        const candEmpId = (candidate.employeeId ?? "").trim().toLowerCase();
        const issEmpId = issue.employeeId.trim().toLowerCase();
        if (candEmpId && issEmpId && candEmpId === issEmpId) return true;
        return issue.employeeName.trim().toLowerCase() === candidate.fullName.trim().toLowerCase();
      })
    : [];

  const missingDocsCount = candidate ? getMissingRequiredDocuments(candidate.documents).length : 0;
  const uploadedReqDocs = REQUIRED_DOCUMENT_COUNT - missingDocsCount;

  return (
    <Sheet open={Boolean(candidate)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {candidate && (
          <div className="space-y-5">
            {onViewFullScreen && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onViewFullScreen(candidate)}
                title="View in full screen to see all info of the employee"
                aria-label="View in full screen to see all info of the employee"
                className="absolute top-3 right-11 size-7 rounded-sm opacity-80 hover:opacity-100"
              >
                <Maximize2 className="size-4" />
              </Button>
            )}
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between gap-2 pr-14">
                <div className="space-y-1">
                  <SheetTitle>{candidate.fullName}</SheetTitle>
                  {candidate.employeeId && (
                    <Badge variant="info" className="font-mono text-[11px]">
                      {candidate.employeeId}
                    </Badge>
                  )}
                </div>
                <StatusBadge status={candidate.status} />
              </div>
              <SheetDescription>{candidate.position} · Applied {candidate.applicationDate}</SheetDescription>
            </SheetHeader>

            <div className="space-y-2.5 rounded-lg border bg-background p-3.5 text-sm">
              <div className="flex items-center gap-2.5 text-foreground"><Phone className="size-4 text-muted-foreground" />{candidate.mobile}</div>
              {candidate.email && (
                <div className="flex items-center gap-2.5 text-foreground"><Mail className="size-4 text-muted-foreground" />{candidate.email}</div>
              )}
              <div className="flex items-center gap-2.5 text-foreground"><MapPin className="size-4 text-muted-foreground" />{candidate.location}</div>
              <div className="flex items-center gap-2.5 text-foreground"><FileText className="size-4 text-muted-foreground" />{candidate.resumeName || "Application Form"}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Father / Husband’s Name</p>
                <p className="mt-0.5 font-semibold text-foreground">{candidate.fatherOrHusbandName || "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="mt-0.5 font-semibold text-foreground">{candidate.dateOfBirth || "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Experience / Category</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {candidate.experience || "—"}{candidate.serviceCategory ? ` (${candidate.serviceCategory})` : ""}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Qualification / Marital</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {candidate.highestQualification || "—"}{candidate.maritalStatus ? ` · ${candidate.maritalStatus}` : ""}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Height / Weight / Chest</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {[candidate.height, candidate.weight, candidate.chest].filter(Boolean).join(" / ") || "—"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">I/Mark</p>
                <p className="mt-0.5 font-semibold text-foreground">{candidate.identificationMark || "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Joining Date & Role</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {candidate.dateOfJoining || "—"}{candidate.joiningAs ? ` as ${candidate.joiningAs}` : ""}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Salary / Reference</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {candidate.salary || "—"}{candidate.reference ? ` · Ref: ${candidate.reference}` : ""}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Nominee</p>
                <p className="mt-0.5 font-semibold text-foreground">{candidate.nomineeName || "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">ESI Holder</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {candidate.esiHolder || "No"}
                  {candidate.esiHolder === "Yes" && (candidate.esiNumber || candidate.uanNumber)
                    ? ` (ESI: ${candidate.esiNumber || "—"} · UAN: ${candidate.uanNumber || "—"})`
                    : ""}
                </p>
              </div>
            </div>

            {(candidate.permanentAddress || candidate.presentAddress) && (
              <div className="space-y-2 text-xs">
                {candidate.permanentAddress && (
                  <div className="rounded-lg border bg-background p-3">
                    <p className="font-semibold text-muted-foreground uppercase">Permanent Address</p>
                    <p className="mt-1 text-foreground">{candidate.permanentAddress}</p>
                  </div>
                )}
                {candidate.presentAddress && (
                  <div className="rounded-lg border bg-background p-3">
                    <p className="font-semibold text-muted-foreground uppercase">Present Address</p>
                    <p className="mt-1 text-foreground">{candidate.presentAddress}</p>
                  </div>
                )}
              </div>
            )}

            {candidate.familyMembers && candidate.familyMembers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Family Members</p>
                <div className="divide-y divide-border rounded-lg border text-xs">
                  {candidate.familyMembers.map((fm, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium text-foreground">{idx + 1}. {fm.name} ({fm.relation})</span>
                      <span className="text-muted-foreground">{fm.dateOfBirth || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Shirt className="size-3.5" />
                  Issued Uniforms & Accessories ({employeeIssues.length})
                </p>
                <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                  <Link
                    to="/uniforms"
                    search={{ view: "issue", candidateId: candidate.id }}
                    onClick={onClose}
                  >
                    <ArrowUpRight className="size-3.5" />
                    Issue Uniform
                  </Link>
                </Button>
              </div>

              {employeeIssues.length === 0 ? (
                <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                  No uniforms or accessories issued to this employee yet.
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border text-xs">
                  {employeeIssues.map((iss) => {
                    const label = iss.subCategory || iss.itemName || iss.category || "Uniform Item";
                    const computedTotal =
                      iss.totalAmount ??
                      iss.quantity * (iss.unitPrice ?? 0) + (iss.registrationCharge ?? 0);
                    return (
                      <div key={iss.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-foreground">{label}</span>
                            <span className="text-muted-foreground">({iss.size}) × {iss.quantity}</span>
                            {iss.registrationCharge ? (
                              <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                                Reg {formatINR(iss.registrationCharge)}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Issued: {iss.issueDate}
                            {iss.status === "Returned" && iss.returnDate ? ` · Returned: ${iss.returnDate}` : ""}
                            {iss.site ? ` · ${iss.site}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={iss.status} />
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatINR(computedTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <span className="font-medium text-foreground">
                  Documents: {uploadedReqDocs} / {REQUIRED_DOCUMENT_COUNT} Required
                </span>
              </div>
              {onViewFullScreen && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => onViewFullScreen(candidate)}
                >
                  <Maximize2 className="size-3" />
                  Full Screen View
                </Button>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remarks</p>
              <p className="mt-1.5 rounded-lg border bg-background p-3 text-sm text-foreground">
                {candidate.remarks || "No remarks recorded."}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Update Stage</p>
              <div className="grid grid-cols-2 gap-2">
                {(["Shortlisted", "Selected", "New", "Rejected"] as CandidateStatus[]).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={candidate.status === st ? "default" : "outline"}
                    onClick={() => onStatusChange(candidate, st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {onDeploy && (
                <Button
                  className="flex-1"
                  onClick={() => onDeploy(candidate)}
                >
                  {candidate.convertedEmployeeObjectId ? "Update Deployment" : "Deploy as Employee"}
                </Button>
              )}
              <Button className="flex-1" variant="outline" onClick={() => onEdit(candidate)}>Edit Details</Button>
              <Button variant="outline" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
