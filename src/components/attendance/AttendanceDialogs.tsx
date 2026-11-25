import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACS_LOCATIONS } from "@/lib/acs-seed";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/acs-types";

const STATUSES: AttendanceStatus[] = ["Present", "Absent", "Half Day", "Leave", "Weekly Off"];

export function AttendanceFormDialog({
  open,
  onOpenChange,
  editing,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AttendanceRecord | null;
  defaultDate: string;
  onSave: (record: Omit<AttendanceRecord, "id">, editId?: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("Security Guard");
  const [location, setLocation] = useState<string>(ACS_LOCATIONS[0]);
  const [date, setDate] = useState(defaultDate);
  const [checkIn, setCheckIn] = useState("08:00");
  const [checkOut, setCheckOut] = useState("16:00");
  const [workingHours, setWorkingHours] = useState("8h 00m");
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setEmployeeId(editing.employeeId);
      setEmployeeName(editing.employeeName);
      setDesignation(editing.designation);
      setLocation(editing.location);
      setDate(editing.date);
      setCheckIn(editing.checkIn);
      setCheckOut(editing.checkOut);
      setWorkingHours(editing.workingHours);
      setStatus(editing.status);
    } else {
      setEmployeeId("");
      setEmployeeName("");
      setDesignation("Security Guard");
      setLocation(ACS_LOCATIONS[0]);
      setDate(defaultDate);
      setCheckIn("08:00");
      setCheckOut("16:00");
      setWorkingHours("8h 00m");
      setStatus("Present");
    }
    setError("");
  }, [editing, defaultDate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !employeeName.trim() || !date) {
      setError("Employee ID, Name, and Date are required.");
      return;
    }
    const isOff = status === "Absent" || status === "Leave" || status === "Weekly Off";
    onSave(
      {
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        designation: designation.trim() || "Security Guard",
        location,
        date,
        checkIn: isOff ? "—" : checkIn || "08:00",
        checkOut: isOff ? "—" : checkOut || "16:00",
        workingHours: isOff ? "0h 00m" : workingHours || "8h 00m",
        status,
      },
      editing?.id,
    );
    toast.success(editing ? "Attendance updated." : "Attendance marked.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Attendance" : "Mark Attendance"}</DialogTitle>
          <DialogDescription>Record daily shift status and working hours.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="att-eid">Employee ID</Label>
              <Input id="att-eid" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="ACS-1009" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-name">Employee Name</Label>
              <Input id="att-name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-desig">Designation</Label>
              <Input id="att-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-date">Date</Label>
              <Input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location / Site</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACS_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Attendance Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="att-in">Check-in</Label>
              <Input id="att-in" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-out">Check-out</Label>
              <Input id="att-out" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-hrs">Working Hours</Label>
              <Input id="att-hrs" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Update Attendance" : "Save Attendance"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BulkAttendanceDialog({
  open,
  onOpenChange,
  records,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: AttendanceRecord[];
  onApply: (ids: string[], status: AttendanceStatus) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<AttendanceStatus>("Present");

  useEffect(() => {
    if (open) setSelectedIds(records.map((r) => r.id));
  }, [open, records]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const handleApply = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one employee.");
      return;
    }
    onApply(selectedIds, status);
    toast.success(`Updated ${selectedIds.length} employees to ${status}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Attendance</DialogTitle>
          <DialogDescription>Select employees and apply a unified attendance status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Apply Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
            {records.map((rec) => (
              <label key={rec.id} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2.5">
                  <Checkbox checked={selectedIds.includes(rec.id)} onCheckedChange={() => toggle(rec.id)} />
                  <span className="font-medium text-foreground">{rec.employeeName}</span>
                </span>
                <span className="text-xs text-muted-foreground">{rec.employeeId}</span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply}>Apply to {selectedIds.length} Employees</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}