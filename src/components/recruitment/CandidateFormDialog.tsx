import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ACS_LOCATIONS } from "@/lib/acs-seed";
import type { Candidate, CandidateStatus } from "@/lib/acs-types";
import { isValidEmail, isValidPhone } from "@/lib/acs-utils";

interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Candidate | null;
  onSave: (payload: Omit<Candidate, "id">, editId?: string) => void;
}

const STATUSES: CandidateStatus[] = ["New", "Shortlisted", "Selected", "Rejected"];

export function CandidateFormDialog({ open, onOpenChange, editing, onSave }: CandidateFormDialogProps) {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Security Guard");
  const [location, setLocation] = useState<string>(ACS_LOCATIONS[0]);
  const [experience, setExperience] = useState("2 Years");
  const [status, setStatus] = useState<CandidateStatus>("New");
  const [resumeName, setResumeName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setFullName(editing.fullName);
      setMobile(editing.mobile);
      setEmail(editing.email);
      setPosition(editing.position);
      setLocation(editing.location);
      setExperience(editing.experience);
      setStatus(editing.status);
      setResumeName(editing.resumeName);
      setRemarks(editing.remarks);
    } else {
      setFullName("");
      setMobile("");
      setEmail("");
      setPosition("Security Guard");
      setLocation(ACS_LOCATIONS[0]);
      setExperience("2 Years");
      setStatus("New");
      setResumeName("");
      setRemarks("");
    }
    setError("");
  }, [editing, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !position.trim() || !experience.trim()) {
      setError("Full Name, Position, and Experience are required.");
      return;
    }
    if (!isValidPhone(mobile)) {
      setError("Enter a valid 10–15 digit mobile number.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    onSave(
      {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        position: position.trim(),
        location,
        experience: experience.trim(),
        applicationDate: editing?.applicationDate ?? new Date().toISOString().slice(0, 10),
        status,
        resumeName: resumeName || `${fullName.trim().replace(/\s+/g, "_")}_CV.pdf`,
        remarks: remarks.trim(),
      },
      editing?.id,
    );
    toast.success(editing ? "Candidate profile updated." : "Candidate registered successfully.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Candidate" : "Add Candidate"}</DialogTitle>
          <DialogDescription>Enter applicant details for Advance Corporate Security recruitment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cand-name">Full Name</Label>
              <Input id="cand-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rohan Deshpande" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-mobile">Mobile Number</Label>
              <Input id="cand-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98450 11223" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-email">Email</Label>
              <Input id="cand-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="candidate@mail.in" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-pos">Position</Label>
              <Input id="cand-pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Security Guard" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACS_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-exp">Experience</Label>
              <Input id="cand-exp" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="3 Years" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as CandidateStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-resume">Resume Upload</Label>
              <Input
                id="cand-resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeName(e.target.files?.[0]?.name ?? resumeName)}
              />
              {resumeName && <p className="truncate text-[11px] text-muted-foreground">Selected: {resumeName}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cand-remarks">Remarks</Label>
            <Textarea id="cand-remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Interview notes, shift readiness, verification status..." />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save Changes" : "Register Candidate"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}