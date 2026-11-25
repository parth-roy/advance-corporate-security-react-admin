import { FileText, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/acs/StatusBadge";
import type { Candidate, CandidateStatus } from "@/lib/acs-types";

interface CandidateDrawerProps {
  candidate: Candidate | null;
  onClose: () => void;
  onEdit: (candidate: Candidate) => void;
  onStatusChange: (candidate: Candidate, status: CandidateStatus) => void;
}

export function CandidateDrawer({ candidate, onClose, onEdit, onStatusChange }: CandidateDrawerProps) {
  return (
    <Sheet open={Boolean(candidate)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {candidate && (
          <div className="space-y-5">
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between gap-2 pr-6">
                <SheetTitle>{candidate.fullName}</SheetTitle>
                <StatusBadge status={candidate.status} />
              </div>
              <SheetDescription>{candidate.position} · Applied {candidate.applicationDate}</SheetDescription>
            </SheetHeader>

            <div className="space-y-2.5 rounded-lg border bg-background p-3.5 text-sm">
              <div className="flex items-center gap-2.5 text-foreground"><Phone className="size-4 text-muted-foreground" />{candidate.mobile}</div>
              <div className="flex items-center gap-2.5 text-foreground"><Mail className="size-4 text-muted-foreground" />{candidate.email}</div>
              <div className="flex items-center gap-2.5 text-foreground"><MapPin className="size-4 text-muted-foreground" />{candidate.location}</div>
              <div className="flex items-center gap-2.5 text-foreground"><FileText className="size-4 text-muted-foreground" />{candidate.resumeName}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="mt-0.5 font-semibold text-foreground">{candidate.experience}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Application Date</p>
                <p className="mt-0.5 font-semibold text-foreground">{candidate.applicationDate}</p>
              </div>
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

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" variant="outline" onClick={() => onEdit(candidate)}>Edit Details</Button>
              <Button className="flex-1" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}