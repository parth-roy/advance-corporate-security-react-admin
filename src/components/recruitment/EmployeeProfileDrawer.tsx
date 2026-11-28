import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CreditCard,
  Eye,
  FileCheck2,
  Landmark,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  Shirt,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DocumentPreviewDialog } from "@/components/recruitment/DocumentPreviewDialog";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { useAcsStore } from "@/lib/acs-store";
import type {
  AttendanceRecord,
  Candidate,
  CandidateDocuments,
  EmployeeRecord,
  EmployeeStatus,
  PayslipRecord,
  SalaryAdvanceRecord,
  UniformIssueRecord,
  UniformRecoveryPlan,
  UploadedDocumentFile,
  VoucherRecord,
} from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";
import { useOptionalAuth } from "@/lib/auth";
import { CANDIDATE_DOCUMENT_CHECKLIST, hasUploadedFile } from "@/lib/candidate-documents";

const STATUS_BADGE_VARIANT: Record<EmployeeStatus, "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  LEFT: "danger",
  TRANSFERRED: "info",
};

interface EmployeeProfileDrawerProps {
  employee: EmployeeRecord | null;
  onClose: () => void;
  onEdit: (employee: EmployeeRecord) => void;
}

function matchesEmployeeKeys(
  emp: EmployeeRecord,
  rec: {
    employeeObjectId?: string | null;
    employeeId?: string;
    legacyEmpCode?: string;
    employeeName?: string;
    payeeName?: string;
  },
): boolean {
  if (rec.employeeObjectId && rec.employeeObjectId === emp.id) return true;
  const code = emp.empCode.trim().toUpperCase();
  const leg = (emp.legacyEmpCode ?? "").trim().toUpperCase();
  const recCode = (rec.employeeId ?? "").trim().toUpperCase();
  const recLeg = (rec.legacyEmpCode ?? "").trim().toUpperCase();
  if (code && (recCode === code || recLeg === code)) return true;
  if (leg && (recCode === leg || recLeg === leg)) return true;
  const fullName = emp.fullName.trim().toLowerCase();
  const recName = (rec.employeeName ?? rec.payeeName ?? "").trim().toLowerCase();
  return Boolean(fullName && recName && fullName === recName);
}

export function EmployeeProfileDrawer({
  employee,
  onClose,
  onEdit,
}: EmployeeProfileDrawerProps) {
  const { data } = useAcsStore();
  const auth = useOptionalAuth();

  const [remoteAtt, setRemoteAtt] = useState<AttendanceRecord[] | null>(null);
  const [remoteIssues, setRemoteIssues] = useState<UniformIssueRecord[] | null>(null);
  const [remotePlans, setRemotePlans] = useState<UniformRecoveryPlan[] | null>(null);
  const [remoteAdvances, setRemoteAdvances] = useState<SalaryAdvanceRecord[] | null>(null);
  const [remotePayslips, setRemotePayslips] = useState<PayslipRecord[] | null>(null);
  const [remoteVouchers, setRemoteVouchers] = useState<VoucherRecord[] | null>(null);
  const [linkedCandidate, setLinkedCandidate] = useState<Candidate | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    file: UploadedDocumentFile;
  } | null>(null);

  useEffect(() => {
    if (!employee) {
      setRemoteAtt(null);
      setRemoteIssues(null);
      setRemotePlans(null);
      setRemoteAdvances(null);
      setRemotePayslips(null);
      setRemoteVouchers(null);
      setLinkedCandidate(null);
      return;
    }

    if (auth?.status !== "authenticated") return;

    let active = true;
    setLoadingDetails(true);
    const searchKey = encodeURIComponent(employee.empCode);
    const nameKey = encodeURIComponent(employee.fullName);

    const requests: Promise<void>[] = [
      auth
        .apiRequest<AttendanceRecord[]>(`/api/admin/attendance?search=${searchKey}&limit=60`)
        .then((rows) => {
          if (active) setRemoteAtt(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {}),
      auth
        .apiRequest<UniformIssueRecord[]>(`/api/admin/uniform-issues?search=${searchKey}&limit=50`)
        .then((rows) => {
          if (active) setRemoteIssues(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {}),
      auth
        .apiRequest<UniformRecoveryPlan[]>(`/api/admin/uniform-recovery-plans?search=${searchKey}&limit=50`)
        .then((rows) => {
          if (active) setRemotePlans(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {}),
      auth
        .apiRequest<SalaryAdvanceRecord[]>(`/api/admin/advances?search=${searchKey}&limit=50`)
        .then((rows) => {
          if (active) setRemoteAdvances(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {}),
      auth
        .apiRequest<PayslipRecord[]>(`/api/admin/payslips?search=${searchKey}&limit=50`)
        .then((rows) => {
          if (active) setRemotePayslips(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {}),
      auth
        .apiRequest<VoucherRecord[]>(`/api/admin/vouchers?search=${nameKey}&limit=50`)
        .then((rows) => {
          if (active) setRemoteVouchers(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {}),
    ];

    if (employee.candidateId) {
      requests.push(
        auth
          .apiRequest<Candidate>(`/api/admin/candidates/${employee.candidateId}`)
          .then((cand) => {
            if (active && cand?.id) setLinkedCandidate(cand);
          })
          .catch(() => {}),
      );
    }

    void Promise.all(requests).finally(() => {
      if (active) setLoadingDetails(false);
    });

    return () => {
      active = false;
    };
  }, [employee, auth]);

  const uniformIssues = useMemo(() => {
    if (!employee) return [];
    const src = remoteIssues ?? data.uniformIssues;
    return src.filter((rec) => matchesEmployeeKeys(employee, rec));
  }, [employee, remoteIssues, data.uniformIssues]);

  const recoveryPlans = useMemo(() => {
    if (!employee) return [];
    const src = remotePlans ?? data.uniformRecoveryPlans ?? [];
    return src.filter((rec) => matchesEmployeeKeys(employee, rec));
  }, [employee, remotePlans, data.uniformRecoveryPlans]);

  const attendanceList = useMemo(() => {
    if (!employee) return [];
    const src = remoteAtt ?? data.attendance;
    return src
      .filter((rec) => matchesEmployeeKeys(employee, rec))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [employee, remoteAtt, data.attendance]);

  const attendanceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      Present: 0,
      "Double Duty": 0,
      "Half Day": 0,
      "National Holiday": 0,
      Absent: 0,
      Leave: 0,
      "Weekly Off": 0,
    };
    let totalDuty = 0;
    for (const row of attendanceList) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      totalDuty += (row.normalDuty ?? 0) + (row.extraDuty ?? 0);
    }
    return { counts, totalDuty: Number(totalDuty.toFixed(2)) };
  }, [attendanceList]);

  const advances = useMemo(() => {
    if (!employee) return [];
    const src = remoteAdvances ?? data.salaryAdvances ?? [];
    return src.filter((rec) => matchesEmployeeKeys(employee, rec));
  }, [employee, remoteAdvances, data.salaryAdvances]);

  const payslips = useMemo(() => {
    if (!employee) return [];
    const src = remotePayslips ?? data.payslips;
    return src.filter((rec) => matchesEmployeeKeys(employee, rec));
  }, [employee, remotePayslips, data.payslips]);

  const vouchers = useMemo(() => {
    if (!employee) return [];
    const src = remoteVouchers ?? data.vouchers ?? [];
    return src.filter((rec) => matchesEmployeeKeys(employee, rec));
  }, [employee, remoteVouchers, data.vouchers]);

  const mergedDocs = useMemo<CandidateDocuments>(() => {
    if (!employee) return {};
    const storeCand = employee.candidateId
      ? data.candidates.find((c) => c.id === employee.candidateId)
      : undefined;
    return {
      ...(storeCand?.documents ?? {}),
      ...(linkedCandidate?.documents ?? {}),
      ...(employee.documents ?? {}),
    };
  }, [employee, data.candidates, linkedCandidate]);

  const docEntries = useMemo(() => {
    const out: { label: string; file: UploadedDocumentFile }[] = [];
    for (const meta of CANDIDATE_DOCUMENT_CHECKLIST) {
      if (meta.key === "academicQualification") {
        const acad = mergedDocs.academicQualification;
        if (acad) {
          for (const lvl of ["10th", "12th", "Graduation", "Masters"] as const) {
            const f = acad[lvl];
            if (hasUploadedFile(f)) out.push({ label: `${meta.label} (${lvl})`, file: f! });
          }
        }
      } else if (meta.key === "previousEsiPf") {
        const pf = mergedDocs.previousEsiPf;
        if (hasUploadedFile(pf) && pf?.fileUrl) {
          out.push({
            label: meta.label,
            file: {
              fileName: pf.fileName || "Previous ESI/PF",
              fileUrl: pf.fileUrl,
              ...(pf.mimeType ? { mimeType: pf.mimeType } : {}),
              ...(pf.uploadedAt ? { uploadedAt: pf.uploadedAt } : {}),
            },
          });
        }
      } else {
        const simple = mergedDocs[meta.key as keyof Omit<CandidateDocuments, "academicQualification" | "previousEsiPf">];
        if (hasUploadedFile(simple)) {
          out.push({ label: meta.label, file: simple! });
        }
      }
    }
    return out;
  }, [mergedDocs]);

  return (
    <>
      <Sheet open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {employee && (
            <div className="space-y-5">
              <SheetHeader className="text-left">
                <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
                  <div className="space-y-1">
                    <SheetTitle>{employee.fullName}</SheetTitle>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="info" className="font-mono text-[11px]">
                        {employee.empCode}
                      </Badge>
                      {employee.legacyEmpCode && (
                        <Badge variant="neutral" className="font-mono text-[11px]">
                          Old ID #{employee.legacyEmpCode}
                        </Badge>
                      )}
                      {employee.candidateId && (
                        <Badge variant="neutral" className="text-[11px]">
                          Recruited &amp; Deployed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[employee.status]}>{employee.status}</Badge>
                </div>
                <SheetDescription>
                  {employee.designation} · {employee.siteName}
                  {employee.subUnit ? ` (${employee.subUnit})` : ""}
                  {loadingDetails ? " · Syncing live records..." : ""}
                </SheetDescription>
              </SheetHeader>

              {/* Contact, Posting & Wage Summary */}
              <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-3.5 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {employee.siteName}
                    {employee.subUnit ? ` · ${employee.subUnit}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-semibold tabular-nums">
                    {formatINR(employee.baseRate || 0)} / {employee.rateType === "DAILY" ? "Day" : "Month"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <span>{employee.mobile || "No mobile recorded"}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{employee.email || "No email"}</span>
                </div>
                <div className="text-xs text-muted-foreground sm:col-span-2">
                  Date of Joining: <strong className="text-foreground">{employee.dateOfJoining || "—"}</strong>
                  {employee.fatherOrHusbandName ? (
                    <> · Father/Husband: <strong className="text-foreground">{employee.fatherOrHusbandName}</strong></>
                  ) : null}
                </div>
              </div>

              {/* Bank & Statutory */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Landmark className="size-3.5 text-primary" />
                  Bank Payout &amp; Statutory (ESI / PF)
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border p-2.5">
                    <p className="text-muted-foreground">Bank &amp; Account</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {employee.bankDetails?.bankName || "—"} · {employee.bankDetails?.accountNumber || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      IFSC: {employee.bankDetails?.ifscCode || "—"} · Mode: {employee.bankDetails?.preferredPaymentMode || "BANK_TRANSFER"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <p className="text-muted-foreground">PF UAN &amp; ESIC</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      UAN: {employee.statutory?.pfUan || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ESI: {employee.statutory?.esiNumber || "—"}
                      {employee.originalIdCustody?.inCustody
                        ? ` · ID Held (${employee.originalIdCustody.documentType})`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assigned Uniforms & Recovery Plans */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Shirt className="size-3.5 text-primary" />
                    Assigned Uniforms ({uniformIssues.length}) &amp; EMI Plans ({recoveryPlans.length})
                  </p>
                </div>
                {uniformIssues.length === 0 && recoveryPlans.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No uniform items or EMI recovery plans assigned to this employee yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uniformIssues.map((iss) => (
                      <div key={iss.id} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-foreground">
                            {iss.itemName} ({iss.size}) × {iss.quantity}
                            {iss.returnedQty ? ` · Returned: ${iss.returnedQty}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Issued {iss.issueDate} · Site: {iss.site}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={iss.status} />
                          <span className="font-semibold tabular-nums">{formatINR(iss.totalAmount)}</span>
                        </div>
                      </div>
                    ))}
                    {recoveryPlans.map((pl) => (
                      <div key={pl.id} className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold text-foreground">
                            Uniform EMI Plan ({pl.recoveryMode})
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Monthly {formatINR(pl.monthlyAmount)} · Start {pl.startMonth} · Recovered {formatINR(pl.recoveredAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={pl.status === "SETTLED" ? "success" : "warning"}>{pl.status}</Badge>
                          <p className="mt-1 font-semibold tabular-nums">
                            Bal: {formatINR(pl.remainingBalance)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Attendance Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="size-3.5 text-primary" />
                    Attendance Summary ({attendanceList.length} logs · {attendanceBreakdown.totalDuty} total duties)
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] sm:grid-cols-7">
                  {(
                    [
                      ["P", attendanceBreakdown.counts["Present"]],
                      ["P/P", attendanceBreakdown.counts["Double Duty"]],
                      ["H", attendanceBreakdown.counts["Half Day"]],
                      ["NH", attendanceBreakdown.counts["National Holiday"]],
                      ["A", attendanceBreakdown.counts["Absent"]],
                      ["L", attendanceBreakdown.counts["Leave"]],
                      ["WO", attendanceBreakdown.counts["Weekly Off"]],
                    ] as const
                  ).map(([code, cnt]) => (
                    <div key={code} className="rounded border bg-background px-1.5 py-1.5">
                      <p className="font-bold text-foreground">{cnt}</p>
                      <p className="text-[10px] text-muted-foreground">{code}</p>
                    </div>
                  ))}
                </div>
                {attendanceList.length > 0 && (
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border bg-background p-2 text-xs">
                    {attendanceList.slice(0, 15).map((row) => (
                      <div key={row.id} className="flex items-center justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                        <span className="font-mono text-[11px] text-muted-foreground">{row.date}</span>
                        <span className="truncate px-2 text-foreground">{row.location}</span>
                        <StatusBadge status={row.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Advances, Payslips & Vouchers */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Wallet className="size-3.5 text-primary" />
                  Advances ({advances.length}) · Payslips ({payslips.length}) · Vouchers ({vouchers.length})
                </p>
                {advances.length === 0 && payslips.length === 0 && vouchers.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No salary advances, payslips, or payment vouchers recorded yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {payslips.map((ps) => {
                      const net =
                        ps.basicSalary +
                        ps.allowances +
                        ps.overtime +
                        ps.otherEarnings -
                        (ps.pfDeduction + ps.esiDeduction + ps.otherDeductions);
                      return (
                        <div key={ps.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              Payslip · {ps.salaryMonth} ({ps.payslipId})
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              PF {formatINR(ps.pfDeduction)} · ESI {formatINR(ps.esiDeduction)} · Days {ps.presentDays ?? "—"}
                              {ps.voucherNo ? ` · Vch #${ps.voucherNo}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold tabular-nums text-foreground">{formatINR(net)}</span>
                            <p className="text-[10px] text-muted-foreground">{ps.payoutStatus || ps.status}</p>
                          </div>
                        </div>
                      );
                    })}
                    {advances.map((adv) => (
                      <div key={adv.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                        <div>
                          <p className="font-semibold text-foreground">Advance #{adv.staffNo} ({adv.recoveryMode})</p>
                          <p className="text-[11px] text-muted-foreground">
                            {adv.date} · Bal: {formatINR(adv.remainingBalance)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={adv.status === "RECOVERED" ? "success" : "warning"}>{adv.status}</Badge>
                          <p className="mt-0.5 font-semibold tabular-nums">{formatINR(adv.amount)}</p>
                        </div>
                      </div>
                    ))}
                    {vouchers.map((vch) => (
                      <div key={vch.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            Voucher #{vch.voucherNo} ({vch.paymentMode})
                          </p>
                          <p className="text-[11px] text-muted-foreground">{vch.particulars}</p>
                        </div>
                        <span className="font-semibold tabular-nums text-foreground">{formatINR(vch.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Uploaded KYC Documents */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileCheck2 className="size-3.5 text-primary" />
                  KYC &amp; Uploaded Documents ({docEntries.length})
                </p>
                {docEntries.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No KYC documents attached to this employee record.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {docEntries.map((doc) => (
                      <div key={doc.label} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{doc.label}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{doc.file.fileName}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 px-2 text-xs"
                          tooltip={`Preview ${doc.label} stored in private Cloudflare R2`}
                          onClick={() => setPreviewDoc({ title: doc.label, file: doc.file })}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {employee.remarks && (
                <div className="rounded-lg border bg-background p-3 text-xs">
                  <p className="font-semibold text-muted-foreground">Remarks</p>
                  <p className="mt-1 text-foreground">{employee.remarks}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  className="flex-1"
                  tooltip={`Edit ${employee.fullName}'s site, wage rate, bank or statutory details`}
                  onClick={() => onEdit(employee)}
                >
                  <Pencil className="size-4" />
                  Edit Employee
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DocumentPreviewDialog
        open={Boolean(previewDoc)}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        title={previewDoc?.title ?? "Document Preview"}
        file={previewDoc?.file ?? null}
      />
    </>
  );
}
