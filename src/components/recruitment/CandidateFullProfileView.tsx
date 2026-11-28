import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Eye, FileCheck2, Mail, MapPin, Pencil, Phone, Shirt, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { DocumentPreviewDialog } from "@/components/recruitment/DocumentPreviewDialog";
import { useAcsStore } from "@/lib/acs-store";
import type { Candidate, CandidateStatus, UploadedDocumentFile } from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";
import {
  ACADEMIC_LEVELS,
  CANDIDATE_DOCUMENT_CHECKLIST,
  getAcademicDocsCount,
  hasUploadedFile,
  type SimpleDocumentKey,
} from "@/lib/candidate-documents";

export function CandidateFullProfileView({
  candidate,
  onBack,
  onEdit,
  onStatusChange,
  onDeploy,
}: {
  candidate: Candidate;
  onBack: () => void;
  onEdit: (candidate: Candidate) => void;
  onStatusChange: (candidate: Candidate, status: CandidateStatus) => void;
  onDeploy?: (candidate: Candidate) => void;
}) {
  const { data } = useAcsStore();
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    subtitle?: string;
    file?: Partial<UploadedDocumentFile> | null;
    metaRows?: { label: string; value: string }[];
  } | null>(null);

  const employeeIssues = data.uniformIssues.filter((issue) => {
    const candEmpId = (candidate.employeeId ?? "").trim().toLowerCase();
    const issEmpId = issue.employeeId.trim().toLowerCase();
    if (candEmpId && issEmpId && candEmpId === issEmpId) return true;
    return issue.employeeName.trim().toLowerCase() === candidate.fullName.trim().toLowerCase();
  });

  const colorPhotoUrl = candidate.documents?.colorPhoto?.fileUrl;
  const initials = candidate.fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to Recruitment
        </Button>
        <div className="flex flex-wrap gap-2">
          {onDeploy && (
            <Button size="sm" variant="outline" onClick={() => onDeploy(candidate)}>
              <UserCheck className="size-4" />
              {candidate.convertedEmployeeObjectId ? "Update Deployment" : "Deploy as Employee"}
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to="/uniforms" search={{ view: "issue", candidateId: candidate.id }}>
              <ArrowUpRight className="size-4" />
              Issue Uniform / Accessory
            </Link>
          </Button>
          <Button size="sm" onClick={() => onEdit(candidate)}>
            <Pencil className="size-4" />
            Edit Application &amp; Docs
          </Button>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="acs-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-20 border border-border">
              {colorPhotoUrl && <AvatarImage src={colorPhotoUrl} alt={candidate.fullName} className="object-cover" />}
              <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{candidate.fullName}</h2>
                {candidate.employeeId && (
                  <Badge variant="info" className="font-mono text-xs">{candidate.employeeId}</Badge>
                )}
                <StatusBadge status={candidate.status} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {candidate.position}
                {candidate.joiningAs && candidate.joiningAs !== candidate.position
                  ? ` · Deployed as ${candidate.joiningAs}`
                  : ""}
                {candidate.applicationDate ? ` · Applied ${candidate.applicationDate}` : ""}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {candidate.mobile}
                </span>
                {candidate.email && (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Mail className="size-3.5 text-muted-foreground" />
                    {candidate.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {candidate.location}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["New", "Shortlisted", "Selected", "Rejected"] as CandidateStatus[]).map((st) => (
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
      </section>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="acs-card p-6 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            Personal &amp; Physical Information
          </h3>
          <Separator />
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Father / Husband’s Name</p>
              <p className="font-semibold text-foreground">{candidate.fatherOrHusbandName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="font-semibold text-foreground">{candidate.dateOfBirth || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Marital Status</p>
              <p className="font-semibold text-foreground">{candidate.maritalStatus || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Highest Qualification</p>
              <p className="font-semibold text-foreground">{candidate.highestQualification || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Height / Weight / Chest</p>
              <p className="font-semibold text-foreground">
                {[candidate.height, candidate.weight, candidate.chest].filter(Boolean).join(" / ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Identification Marks</p>
              <p className="font-semibold text-foreground">{candidate.identificationMark || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-2">
            <div>
              <p className="font-semibold text-muted-foreground uppercase">Permanent Address</p>
              <p className="mt-1 text-foreground">{candidate.permanentAddress || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground uppercase">Present Address</p>
              <p className="mt-1 text-foreground">{candidate.presentAddress || "—"}</p>
            </div>
          </div>
        </section>

        <section className="acs-card p-6 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            Posting, Statutory &amp; Declaration
          </h3>
          <Separator />
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Experience / Category</p>
              <p className="font-semibold text-foreground">
                {candidate.experience || "—"}{candidate.serviceCategory ? ` (${candidate.serviceCategory})` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Joining</p>
              <p className="font-semibold text-foreground">{candidate.dateOfJoining || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salary</p>
              <p className="font-semibold text-foreground">{candidate.salary || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-semibold text-foreground">{candidate.reference || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nominee</p>
              <p className="font-semibold text-foreground">{candidate.nomineeName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ESI Holder &amp; Numbers</p>
              <p className="font-semibold text-foreground">
                {candidate.esiHolder || "No"}
                {candidate.esiHolder === "Yes" && (candidate.esiNumber || candidate.uanNumber)
                  ? ` · ESI: ${candidate.esiNumber || "—"} · UAN: ${candidate.uanNumber || "—"}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Previous ESI / PF (if any)</p>
              <p className="font-semibold text-foreground">
                {[
                  candidate.documents?.previousEsiPf?.esiNumber &&
                    `ESI: ${candidate.documents.previousEsiPf.esiNumber}`,
                  candidate.documents?.previousEsiPf?.pfNumber &&
                    `PF/UAN: ${candidate.documents.previousEsiPf.pfNumber}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Declaration</p>
              <p className="inline-flex items-center gap-1 font-semibold text-foreground">
                <UserCheck className="size-3.5 text-success" />
                {candidate.declarationAccepted ? "Accepted" : "Pending"}
                {candidate.declarationPlace ? ` · ${candidate.declarationPlace}` : ""}
              </p>
            </div>
          </div>
          {candidate.remarks && (
            <div className="border-t border-border pt-3 text-xs">
              <p className="font-semibold text-muted-foreground uppercase">Remarks</p>
              <p className="mt-1 text-foreground">{candidate.remarks}</p>
            </div>
          )}
        </section>
      </div>

      {/* Documents Checklist & Preview */}
      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
            <FileCheck2 className="size-4" />
            Uploaded Documents &amp; Verification
          </h3>
          <span className="text-xs text-muted-foreground">
            Click View on any row to inspect the uploaded file
          </span>
        </div>
        <Separator />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Document</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>File / Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CANDIDATE_DOCUMENT_CHECKLIST.map((meta) => {
                if (meta.key === "academicQualification") {
                  const acadCount = getAcademicDocsCount(candidate.documents);
                  return (
                    <TableRow key={meta.key}>
                      <TableCell className="font-medium text-foreground">
                        <div>{meta.label}</div>
                        <div className="text-[11px] text-muted-foreground">{meta.subtitle}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="danger">Required</Badge>
                      </TableCell>
                      <TableCell>
                        {acadCount === 0 ? (
                          <span className="text-xs text-muted-foreground">No certificates uploaded</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {ACADEMIC_LEVELS.map((lvl) => {
                              const lvlDoc = candidate.documents?.academicQualification?.[lvl];
                              if (!hasUploadedFile(lvlDoc)) return null;
                              return (
                                <Button
                                  key={lvl}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  onClick={() =>
                                    setPreviewDoc({
                                      title: `Academic Qualification — ${lvl}`,
                                      subtitle: lvlDoc.fileName,
                                      file: lvlDoc,
                                    })
                                  }
                                >
                                  <Eye className="size-3" />
                                  {lvl}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={acadCount > 0 ? "success" : "warning"}>
                          {acadCount > 0 ? `${acadCount} Uploaded` : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {acadCount > 0 ? "Select level" : "—"}
                      </TableCell>
                    </TableRow>
                  );
                }

                const docObj =
                  meta.key === "previousEsiPf"
                    ? candidate.documents?.previousEsiPf
                    : candidate.documents?.[meta.key as SimpleDocumentKey];
                const uploaded = hasUploadedFile(docObj);

                return (
                  <TableRow key={meta.key}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{meta.label}</span>
                        {uploaded && <CheckCircle2 className="size-3.5 text-success" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{meta.subtitle}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.required ? "danger" : "neutral"}>
                        {meta.required ? "Required" : "Optional"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {uploaded ? docObj?.fileName : "—"}
                      {meta.key === "previousEsiPf" &&
                        (candidate.documents?.previousEsiPf?.esiNumber ||
                          candidate.documents?.previousEsiPf?.pfNumber) && (
                          <div className="text-[11px] text-foreground">
                            ESI: {candidate.documents?.previousEsiPf?.esiNumber || "—"} · PF/UAN:{" "}
                            {candidate.documents?.previousEsiPf?.pfNumber || "—"}
                          </div>
                        )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={uploaded ? "success" : meta.required ? "warning" : "neutral"}>
                        {uploaded ? "Uploaded" : meta.required ? "Pending" : "Optional"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {uploaded ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPreviewDoc({
                              title: meta.label,
                              subtitle: meta.subtitle,
                              file: docObj,
                              metaRows:
                                meta.key === "previousEsiPf"
                                  ? [
                                      { label: "Previous ESI No", value: candidate.documents?.previousEsiPf?.esiNumber || "—" },
                                      { label: "Previous PF/UAN No", value: candidate.documents?.previousEsiPf?.pfNumber || "—" },
                                    ]
                                  : [],
                            })
                          }
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Family & Issued Uniforms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="acs-card p-6 space-y-3">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            Family / Dependent Members ({candidate.familyMembers?.length ?? 0})
          </h3>
          <Separator />
          {!candidate.familyMembers || candidate.familyMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No family/dependent members recorded.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border text-xs">
              {candidate.familyMembers.map((fm, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2.5">
                  <span className="font-medium text-foreground">
                    {idx + 1}. {fm.name} ({fm.relation || "—"})
                  </span>
                  <span className="text-muted-foreground">{fm.dateOfBirth || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="acs-card p-6 space-y-3">
          <h3 className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase">
            <Shirt className="size-4" />
            Issued Uniforms &amp; Accessories ({employeeIssues.length})
          </h3>
          <Separator />
          {employeeIssues.length === 0 ? (
            <p className="text-xs text-muted-foreground">No uniforms issued to this employee yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border text-xs">
              {employeeIssues.map((iss) => {
                const label = iss.subCategory || iss.itemName || iss.category || "Uniform Item";
                const computedTotal =
                  iss.totalAmount ??
                  iss.quantity * (iss.unitPrice ?? 0) + (iss.registrationCharge ?? 0);
                return (
                  <div key={iss.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div>
                      <p className="font-semibold text-foreground">
                        {label} ({iss.size}) × {iss.quantity}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Issued {iss.issueDate}
                        {iss.returnDate ? ` · Returned ${iss.returnDate}` : ""}
                        {iss.site ? ` · ${iss.site}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatINR(computedTotal)}
                      </span>
                      <StatusBadge status={iss.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <DocumentPreviewDialog
        open={Boolean(previewDoc)}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        title={previewDoc?.title ?? "Document Preview"}
        {...(previewDoc?.subtitle ? { subtitle: previewDoc.subtitle } : {})}
        file={previewDoc?.file ?? null}
        {...(previewDoc?.metaRows ? { metaRows: previewDoc.metaRows } : {})}
      />
    </div>
  );
}
