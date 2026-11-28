import { ExternalLink, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UploadedDocumentFile } from "@/lib/acs-types";
import { useAuthorizedDocumentUrl } from "@/lib/document-url";

function isImageFile(file: Partial<UploadedDocumentFile>): boolean {
  const mime = (file.mimeType ?? "").toLowerCase();
  const nameOrUrl = `${file.fileName ?? ""} ${file.fileUrl ?? ""}`.toLowerCase();
  return (
    mime.startsWith("image/") ||
    nameOrUrl.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif|bmp)(\?|#|$)/i.test(nameOrUrl)
  );
}

function isPdfFile(file: Partial<UploadedDocumentFile>): boolean {
  const mime = (file.mimeType ?? "").toLowerCase();
  const nameOrUrl = `${file.fileName ?? ""} ${file.fileUrl ?? ""}`.toLowerCase();
  return mime.includes("pdf") || nameOrUrl.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(nameOrUrl);
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  file,
  metaRows = [],
  onReplaceFile,
  uploading = false,
  accept = "image/*,.pdf",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  file?: Partial<UploadedDocumentFile> | null;
  metaRows?: { label: string; value: string }[];
  onReplaceFile?: (file: File) => void;
  uploading?: boolean;
  accept?: string;
}) {
  const hasUrl = Boolean(file?.fileUrl);
  const authorizedUrl = useAuthorizedDocumentUrl(file?.fileUrl);
  const displayUrl = authorizedUrl || file?.fileUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subtitle || (hasUrl ? file?.fileName : "No file uploaded for this document yet.")}
          </DialogDescription>
        </DialogHeader>

        {metaRows.length > 0 && (
          <div className="grid grid-cols-1 gap-2 rounded-lg border bg-background p-3 text-xs sm:grid-cols-2">
            {metaRows.map((row) => (
              <div key={row.label}>
                <span className="text-muted-foreground">{row.label}: </span>
                <span className="font-semibold text-foreground">{row.value || "—"}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-lg border bg-muted/20 p-3">
          {!hasUrl || !file ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              <FileText className="mx-auto mb-2 size-8 text-muted-foreground/60" />
              No document file uploaded yet. Use the upload button below to attach one.
            </div>
          ) : !displayUrl ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Loading secure document preview...
            </div>
          ) : isImageFile(file) ? (
            <img
              src={displayUrl}
              alt={file.fileName || title}
              className="max-h-[55vh] w-auto rounded object-contain"
            />
          ) : isPdfFile(file) ? (
            <iframe
              src={displayUrl}
              title={file.fileName || title}
              className="h-[55vh] w-full rounded border-0 bg-white"
            />
          ) : (
            <div className="space-y-2 py-8 text-center text-xs">
              <FileText className="mx-auto size-8 text-primary" />
              <p className="font-semibold text-foreground">{file.fileName}</p>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open Uploaded File
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {hasUrl && displayUrl && (
              <Button asChild type="button" variant="outline" size="sm">
                <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open in New Tab
                </a>
              </Button>
            )}
            {onReplaceFile && (
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                <Upload className="size-3.5" />
                <span>{uploading ? "Uploading..." : hasUrl ? "Replace File" : "Upload File"}</span>
                <input
                  type="file"
                  accept={accept}
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) onReplaceFile(picked);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
