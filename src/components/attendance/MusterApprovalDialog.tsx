import { useEffect, useState } from "react";
import { CheckCircle2, Eye, FileCheck2, Lock, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  MusterApprovalSavePayload,
  MusterVerificationStatus,
  SiteMusterApproval,
  UploadedDocumentFile,
} from "@/lib/acs-types";
import { formatMonthLabel, getLocalTodayIso } from "@/lib/attendance-utils";
import { useAuthorizedDocumentUrl } from "@/lib/document-url";

const STATUS_OPTIONS: { value: MusterVerificationStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft (Site Supervisor Working Copy)" },
  { value: "SUPERVISOR_SUBMITTED", label: "Supervisor Submitted" },
  { value: "CLIENT_VERIFIED", label: "Client / Unit-in-Charge Verified" },
  { value: "LOCKED_FOR_BILLING", label: "Locked for Billing" },
];

export function MusterApprovalDialog({
  open,
  onOpenChange,
  siteName,
  yearMonth,
  totals,
  approval,
  onUploadScan,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName: string;
  yearMonth: string;
  totals: {
    normalDuty: number;
    extraDuty: number;
    otHours: number;
    nhDays: number;
    totalDuty: number;
  };
  approval: SiteMusterApproval | null;
  onUploadScan: (file: File) => Promise<UploadedDocumentFile>;
  onSave: (payload: MusterApprovalSavePayload) => Promise<SiteMusterApproval | null>;
}) {
  const [verificationStatus, setVerificationStatus] = useState<MusterVerificationStatus>("DRAFT");
  const [verifiedByName, setVerifiedByName] = useState("");
  const [verifiedByDesignation, setVerifiedByDesignation] = useState("");
  const [verifiedDate, setVerifiedDate] = useState("");
  const [subUnit, setSubUnit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<UploadedDocumentFile | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const resolvedAttachmentUrl = useAuthorizedDocumentUrl(attachment?.fileUrl);

  useEffect(() => {
    if (!open) return;
    setVerificationStatus(approval?.verificationStatus ?? "DRAFT");
    setVerifiedByName(approval?.verifiedByName ?? "");
    setVerifiedByDesignation(approval?.verifiedByDesignation ?? "");
    setVerifiedDate(approval?.verifiedDate || getLocalTodayIso());
    setSubUnit(approval?.subUnit ?? "");
    setRemarks(approval?.remarks ?? "");
    setAttachment(approval?.attachment);
    setShowPreview(false);
  }, [open, approval]);

  const handleFilePick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await onUploadScan(file);
      setAttachment(uploaded);
      toast.success(`Attached "${uploaded.fileName}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload muster scan.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (verificationStatus === "CLIENT_VERIFIED" || verificationStatus === "LOCKED_FOR_BILLING") &&
      !verifiedByName.trim()
    ) {
      toast.error("Enter the verifying client / officer name before marking Client Verified or Locked.");
      return;
    }

    setSaving(true);
    try {
      const payload: MusterApprovalSavePayload = {
        siteName,
        ...(subUnit.trim() ? { subUnit: subUnit.trim() } : {}),
        monthKey: yearMonth,
        verificationStatus,
        ...(verifiedByName.trim() ? { verifiedByName: verifiedByName.trim() } : {}),
        ...(verifiedByDesignation.trim()
          ? { verifiedByDesignation: verifiedByDesignation.trim() }
          : {}),
        ...(verifiedDate.trim() ? { verifiedDate: verifiedDate.trim() } : {}),
        totalNormalDuty: totals.normalDuty,
        totalExtraDuty: totals.extraDuty,
        totalOtHours: totals.otHours,
        totalNhDays: totals.nhDays,
        totalBillableDuties: totals.totalDuty,
        ...(attachment?.fileUrl ? { attachment } : {}),
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      };
      const saved = await onSave(payload);
      if (saved) {
        toast.success(`Muster sign-off updated (${saved.verificationStatus}).`);
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const isPdf = Boolean(
    attachment?.mimeType?.includes("pdf") || attachment?.fileName?.toLowerCase().endsWith(".pdf"),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Muster Roll Verification &amp; Client Sign-Off</span>
            <StatusBadge status={approval?.verificationStatus ?? verificationStatus} />
          </DialogTitle>
          <DialogDescription>
            {siteName} · {formatMonthLabel(yearMonth)} — Record client unit-in-charge verification and attach the signed physical attendance muster PDF/photo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-5">
            <div>
              <p className="text-[11px] text-muted-foreground">Normal</p>
              <p className="font-semibold tabular-nums">{totals.normalDuty}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Extra (P/P)</p>
              <p className="font-semibold tabular-nums text-info">{totals.extraDuty}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">OT Hours</p>
              <p className="font-semibold tabular-nums">{totals.otHours}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">NH Days</p>
              <p className="font-semibold tabular-nums">{totals.nhDays}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Billable Duties</p>
              <p className="font-bold tabular-nums text-primary">{totals.totalDuty}</p>
            </div>
          </div>

          {verificationStatus === "LOCKED_FOR_BILLING" && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft/30 p-3 text-xs text-foreground">
              <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                Locking this muster prevents accidental attendance edits for {formatMonthLabel(yearMonth)} until unlocked.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="muster-status">Verification Stage *</Label>
              <Select
                value={verificationStatus}
                onValueChange={(v) => setVerificationStatus(v as MusterVerificationStatus)}
              >
                <SelectTrigger id="muster-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="muster-subunit">Sub-Unit / Department (Optional)</Label>
              <Input
                id="muster-subunit"
                value={subUnit}
                onChange={(e) => setSubUnit(e.target.value)}
                placeholder="e.g. Security / Housekeeping"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="muster-verifier">Verified By (Officer Name)</Label>
              <Input
                id="muster-verifier"
                value={verifiedByName}
                onChange={(e) => setVerifiedByName(e.target.value)}
                placeholder="e.g. Pratyush Kiran"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="muster-desig">Officer Designation</Label>
              <Input
                id="muster-desig"
                value={verifiedByDesignation}
                onChange={(e) => setVerifiedByDesignation(e.target.value)}
                placeholder="e.g. Administrative Officer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="muster-date">Sign-Off Date</Label>
              <Input
                id="muster-date"
                type="date"
                value={verifiedDate}
                onChange={(e) => setVerifiedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Signed Physical Muster / Stamped Sheet (PDF / JPG / PNG)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Attach the client-signed sheet with stamp (like FSSAI / MSME verified sheets).
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
                <Upload className="size-3.5 text-primary" />
                <span>{uploading ? "Uploading..." : attachment ? "Replace File" : "Upload Signed Scan"}</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  aria-label="Upload signed muster scan"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void handleFilePick(e.target.files?.[0])}
                />
              </label>
            </div>

            {attachment?.fileUrl ? (
              <div className="space-y-2 rounded-md border bg-background p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-4 text-success" />
                    <span className="font-medium text-foreground">{attachment.fileName}</span>
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <CheckCircle2 className="size-3" />
                      Attached
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowPreview((p) => !p)}
                    >
                      <Eye className="size-3.5" />
                      {showPreview ? "Hide Preview" : "Preview"}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-danger"
                      aria-label="Remove attachment"
                      onClick={() => {
                        setAttachment(undefined);
                        setShowPreview(false);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {showPreview && (
                  <div className="max-h-64 overflow-auto rounded border bg-muted/20 p-2">
                    {isPdf ? (
                      <iframe
                        title={attachment.fileName}
                        src={resolvedAttachmentUrl || attachment.fileUrl}
                        className="h-56 w-full rounded"
                      />
                    ) : (
                      <img
                        src={resolvedAttachmentUrl || attachment.fileUrl}
                        alt={attachment.fileName}
                        className="mx-auto max-h-56 rounded object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No signed scan uploaded yet.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="muster-remarks">Verification Remarks</Label>
            <Textarea
              id="muster-remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Attendance checked & stamped by Administrative Officer"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save Sign-Off"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
