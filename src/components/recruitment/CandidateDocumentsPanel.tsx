import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Eye, FileCheck2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DocumentPreviewDialog } from "@/components/recruitment/DocumentPreviewDialog";
import type { AcademicLevel, CandidateDocuments, UploadedDocumentFile } from "@/lib/acs-types";
import { useOptionalAuth } from "@/lib/auth";
import {
  ACADEMIC_LEVELS,
  CANDIDATE_DOCUMENT_CHECKLIST,
  getAcademicDocsCount,
  getMissingRequiredDocuments,
  hasUploadedFile,
  REQUIRED_DOCUMENT_COUNT,
  type DocumentChecklistKey,
  type SimpleDocumentKey,
} from "@/lib/candidate-documents";
import { cn } from "@/lib/utils";

interface PreviewTarget {
  key: DocumentChecklistKey;
  academicLevel?: AcademicLevel;
  title: string;
  subtitle?: string;
  file?: Partial<UploadedDocumentFile> | null | undefined;
  accept: string;
  metaRows?: { label: string; value: string }[];
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read selected file."));
    reader.readAsDataURL(file);
  });
}

export function CandidateDocumentsPanel({
  documents,
  onChange,
}: {
  documents: CandidateDocuments;
  onChange: (next: CandidateDocuments) => void;
}) {
  const auth = useOptionalAuth();
  const [expandedKey, setExpandedKey] = useState<DocumentChecklistKey | null>("academicQualification");
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  const missingRequired = getMissingRequiredDocuments(documents);
  const uploadedRequiredCount = REQUIRED_DOCUMENT_COUNT - missingRequired.length;

  const uploadSingleFile = async (file: File): Promise<UploadedDocumentFile> => {
    if (auth?.status === "authenticated") {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await auth.apiRequest<{
        fileName?: string;
        fileUrl?: string;
        mimeType?: string;
        uploadedAt?: string;
      }>("/api/admin/candidates/upload-document", {
        method: "POST",
        body: formData,
      });

      if (uploaded?.fileUrl) {
        return {
          fileName: uploaded.fileName || file.name,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType || file.type,
          uploadedAt: uploaded.uploadedAt || new Date().toISOString(),
        };
      }
    }

    const dataUrl = await readAsDataUrl(file);
    return {
      fileName: file.name,
      fileUrl: dataUrl,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
    };
  };

  const handleFileUpload = async (
    key: DocumentChecklistKey,
    file: File,
    academicLevel?: AcademicLevel,
  ) => {
    const slotId = academicLevel ? `${key}:${academicLevel}` : key;
    setUploadingSlot(slotId);
    try {
      const uploaded = await uploadSingleFile(file);
      if (key === "academicQualification" && academicLevel) {
        const nextDocs: CandidateDocuments = {
          ...documents,
          academicQualification: {
            ...(documents.academicQualification ?? {}),
            [academicLevel]: uploaded,
          },
        };
        onChange(nextDocs);
        if (previewTarget?.key === key && previewTarget.academicLevel === academicLevel) {
          setPreviewTarget({ ...previewTarget, file: uploaded });
        }
      } else if (key === "previousEsiPf") {
        const nextPrev = {
          ...(documents.previousEsiPf ?? {}),
          ...uploaded,
        };
        onChange({ ...documents, previousEsiPf: nextPrev });
        if (previewTarget?.key === key) {
          setPreviewTarget({ ...previewTarget, file: nextPrev });
        }
      } else {
        const simpleKey = key as SimpleDocumentKey;
        onChange({ ...documents, [simpleKey]: uploaded });
        if (previewTarget?.key === simpleKey) {
          setPreviewTarget({ ...previewTarget, file: uploaded });
        }
      }
      toast.success(`${uploaded.fileName} uploaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemoveFile = (key: DocumentChecklistKey, academicLevel?: AcademicLevel) => {
    if (key === "academicQualification" && academicLevel) {
      const nextAcad = { ...(documents.academicQualification ?? {}) };
      delete nextAcad[academicLevel];
      onChange({ ...documents, academicQualification: nextAcad });
      return;
    }
    if (key === "previousEsiPf") {
      onChange({
        ...documents,
        previousEsiPf: {
          esiNumber: documents.previousEsiPf?.esiNumber ?? "",
          pfNumber: documents.previousEsiPf?.pfNumber ?? "",
        },
      });
      return;
    }
    const nextDocs = { ...documents };
    delete nextDocs[key as SimpleDocumentKey];
    onChange(nextDocs);
  };

  return (
    <aside className="acs-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
            <FileCheck2 className="size-4 text-primary" />
            Employee Documents
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Click any document row to upload or preview copy
          </p>
        </div>
        <Badge variant={missingRequired.length === 0 ? "success" : "warning"}>
          {uploadedRequiredCount} / {REQUIRED_DOCUMENT_COUNT} Required
        </Badge>
      </div>

      <Separator />

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-[11px] font-semibold text-muted-foreground">
              <th className="px-3 py-2">Document</th>
              <th className="px-2 py-2 text-center">Req</th>
              <th className="px-2.5 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CANDIDATE_DOCUMENT_CHECKLIST.map((meta) => {
              const isExpanded = expandedKey === meta.key;

              let isUploaded = false;
              let uploadedName = "";
              if (meta.key === "academicQualification") {
                const count = getAcademicDocsCount(documents);
                isUploaded = count > 0;
                uploadedName = count > 0 ? `${count} level(s) uploaded` : "";
              } else if (meta.key === "previousEsiPf") {
                isUploaded = hasUploadedFile(documents.previousEsiPf);
                uploadedName = documents.previousEsiPf?.fileName ?? "";
              } else {
                const file = documents[meta.key as SimpleDocumentKey];
                isUploaded = hasUploadedFile(file);
                uploadedName = file?.fileName ?? "";
              }

              const hasPrevEsiNums =
                meta.key === "previousEsiPf" &&
                Boolean(
                  documents.previousEsiPf?.esiNumber?.trim() ||
                    documents.previousEsiPf?.pfNumber?.trim(),
                );

              return (
                <tr key={meta.key} className="align-top">
                  <td colSpan={3} className="p-0">
                    <div
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-accent/40",
                        isExpanded && "bg-accent/30",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedKey(isExpanded ? null : meta.key)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        <span className="mt-0.5 text-muted-foreground">
                          {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-foreground">{meta.label}</span>
                            {isUploaded && (
                              <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {uploadedName || meta.subtitle}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant={meta.required ? "danger" : "neutral"}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {meta.required ? "Req*" : "Opt"}
                        </Badge>

                        {meta.key !== "academicQualification" && (
                          <>
                            <label
                              aria-label={`Upload ${meta.label}`}
                              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-input bg-background px-2 text-[11px] font-medium hover:bg-accent"
                            >
                              <Upload className="size-3" />
                              <span>{uploadingSlot === meta.key ? "..." : isUploaded ? "Re-up" : "Upload"}</span>
                              <input
                                type="file"
                                accept={meta.accept}
                                disabled={uploadingSlot === meta.key}
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleFileUpload(meta.key, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`View ${meta.label}`}
                              className="h-7 px-2 text-[11px]"
                              onClick={() =>
                                setPreviewTarget({
                                  key: meta.key,
                                  title: meta.label,
                                  subtitle: meta.subtitle,
                                  file:
                                    (meta.key === "previousEsiPf"
                                      ? documents.previousEsiPf
                                      : documents[meta.key as SimpleDocumentKey]) ?? null,
                                  accept: meta.accept,
                                  metaRows:
                                    meta.key === "previousEsiPf" && hasPrevEsiNums
                                      ? [
                                          { label: "Previous ESI No", value: documents.previousEsiPf?.esiNumber || "—" },
                                          { label: "Previous PF / UAN No", value: documents.previousEsiPf?.pfNumber || "—" },
                                        ]
                                      : [],
                                })
                              }
                            >
                              <Eye className="size-3" />
                              View
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border/60 bg-muted/20 px-3 py-2.5 space-y-2">
                        {meta.key === "academicQualification" ? (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Select &amp; upload available qualification certificate(s):
                            </p>
                            {ACADEMIC_LEVELS.map((level) => {
                              const docFile = documents.academicQualification?.[level];
                              const levelUploaded = hasUploadedFile(docFile);
                              const slotId = `academicQualification:${level}`;
                              return (
                                <div
                                  key={level}
                                  className="flex items-center justify-between gap-2 rounded border bg-background px-2.5 py-1.5"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-foreground">{level}</span>
                                      {levelUploaded && <CheckCircle2 className="size-3 text-success" />}
                                    </div>
                                    {levelUploaded && (
                                      <p className="truncate text-[10px] text-muted-foreground">
                                        {docFile?.fileName}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <label
                                      aria-label={`Upload Academic ${level}`}
                                      className="inline-flex h-6 cursor-pointer items-center gap-1 rounded border border-input bg-card px-2 text-[11px] font-medium hover:bg-accent"
                                    >
                                      <Upload className="size-3" />
                                      <span>{uploadingSlot === slotId ? "..." : "Upload"}</span>
                                      <input
                                        type="file"
                                        accept={meta.accept}
                                        disabled={uploadingSlot === slotId}
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) void handleFileUpload("academicQualification", f, level);
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      aria-label={`View Academic ${level}`}
                                      className="h-6 px-1.5 text-[11px]"
                                      onClick={() =>
                                        setPreviewTarget({
                                          key: "academicQualification",
                                          academicLevel: level,
                                          title: `Academic Qualification — ${level}`,
                                          subtitle: `${level} Certificate / Marksheet`,
                                          file: docFile ?? null,
                                          accept: meta.accept,
                                        })
                                      }
                                    >
                                      <Eye className="size-3" />
                                    </Button>
                                    {levelUploaded && (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        aria-label={`Remove Academic ${level}`}
                                        className="size-6 text-danger"
                                        onClick={() => handleRemoveFile("academicQualification", level)}
                                      >
                                        <Trash2 className="size-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : meta.key === "previousEsiPf" ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor="doc-prev-esi" className="text-[11px]">Previous ESI Number</Label>
                              <Input
                                id="doc-prev-esi"
                                value={documents.previousEsiPf?.esiNumber ?? ""}
                                onChange={(e) =>
                                  onChange({
                                    ...documents,
                                    previousEsiPf: {
                                      ...(documents.previousEsiPf ?? {}),
                                      esiNumber: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Optional ESI No."
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="doc-prev-pf" className="text-[11px]">Previous PF / UAN Number</Label>
                              <Input
                                id="doc-prev-pf"
                                value={documents.previousEsiPf?.pfNumber ?? ""}
                                onChange={(e) =>
                                  onChange({
                                    ...documents,
                                    previousEsiPf: {
                                      ...(documents.previousEsiPf ?? {}),
                                      pfNumber: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Optional PF / UAN No."
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-muted-foreground">
                              {isUploaded
                                ? `Uploaded: ${uploadedName}`
                                : `${meta.subtitle} (Accepted: PDF / JPG / PNG)`}
                            </span>
                            {isUploaded && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] text-danger"
                                onClick={() => handleRemoveFile(meta.key)}
                              >
                                <Trash2 className="size-3" />
                                Remove
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DocumentPreviewDialog
        open={Boolean(previewTarget)}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
        title={previewTarget?.title ?? "Document Preview"}
        {...(previewTarget?.subtitle ? { subtitle: previewTarget.subtitle } : {})}
        file={previewTarget?.file ?? null}
        {...(previewTarget?.metaRows ? { metaRows: previewTarget.metaRows } : {})}
        accept={previewTarget?.accept ?? "image/*,.pdf"}
        uploading={uploadingSlot !== null}
        onReplaceFile={(file) => {
          if (previewTarget) {
            void handleFileUpload(previewTarget.key, file, previewTarget.academicLevel);
          }
        }}
      />
    </aside>
  );
}
