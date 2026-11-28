import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/acs-types";
import {
  getDefaultDutyForStatus,
  getDaysInMonth,
  getLocalTodayIso,
  parseAttendanceCsv,
  type SiteEmployeeSummary,
} from "@/lib/attendance-utils";
import { downloadCsv } from "@/lib/acs-utils";

const STATUSES: AttendanceStatus[] = [
  "Present",
  "Double Duty",
  "Half Day",
  "National Holiday",
  "Absent",
  "Leave",
  "Weekly Off",
];

export function AttendanceFormDialog({
  open,
  onOpenChange,
  editing,
  defaultDate,
  defaultSite = "",
  availableSites = [],
  siteEmployees = [],
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AttendanceRecord | null;
  defaultDate: string;
  defaultSite?: string;
  availableSites?: string[];
  siteEmployees?: SiteEmployeeSummary[];
  onSave: (record: Omit<AttendanceRecord, "id">, editId?: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("Security Guard");
  const [location, setLocation] = useState(defaultSite);
  const [date, setDate] = useState(defaultDate || getLocalTodayIso());
  const [checkIn, setCheckIn] = useState("08:00");
  const [checkOut, setCheckOut] = useState("16:00");
  const [workingHours, setWorkingHours] = useState("8h 00m");
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [normalDuty, setNormalDuty] = useState("1");
  const [extraDuty, setExtraDuty] = useState("0");
  const [otHours, setOtHours] = useState("0");
  const [shiftFraction, setShiftFraction] = useState("1");
  const [isReliever, setIsReliever] = useState(false);
  const [primarySiteName, setPrimarySiteName] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [remarks, setRemarks] = useState("");
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
      const defaults = getDefaultDutyForStatus(editing.status);
      setNormalDuty(String(editing.normalDuty ?? defaults.normalDuty));
      setExtraDuty(String(editing.extraDuty ?? defaults.extraDuty));
      setOtHours(String(editing.otHours ?? 0));
      setShiftFraction(String(editing.shiftFraction ?? editing.normalDuty ?? defaults.normalDuty));
      setIsReliever(Boolean(editing.isReliever));
      setPrimarySiteName(editing.primarySiteName ?? "");
      setAdjustmentNote(editing.adjustmentNote ?? "");
      setRemarks(editing.remarks ?? "");
    } else {
      setEmployeeId("");
      setEmployeeName("");
      setDesignation("Security Guard");
      setLocation(defaultSite || availableSites[0] || "");
      setDate(defaultDate || getLocalTodayIso());
      setStatus("Present");
      setCheckIn("08:00");
      setCheckOut("16:00");
      setWorkingHours("8h 00m");
      setNormalDuty("1");
      setExtraDuty("0");
      setOtHours("0");
      setShiftFraction("1");
      setIsReliever(false);
      setPrimarySiteName("");
      setAdjustmentNote("");
      setRemarks("");
    }
    setError("");
  }, [editing, defaultDate, defaultSite, availableSites, open]);

  const handleStatusChange = (nextStatus: AttendanceStatus) => {
    setStatus(nextStatus);
    const defaults = getDefaultDutyForStatus(nextStatus);
    setCheckIn(defaults.checkIn);
    setCheckOut(defaults.checkOut);
    setWorkingHours(defaults.workingHours);
    setNormalDuty(String(defaults.normalDuty));
    setExtraDuty(String(defaults.extraDuty));
    setShiftFraction(String(defaults.normalDuty));
  };

  const handlePickExistingEmployee = (empKey: string) => {
    const chosen = siteEmployees.find((e) => e.key === empKey);
    if (!chosen) return;
    setEmployeeId(chosen.employeeId);
    setEmployeeName(chosen.employeeName);
    setDesignation(chosen.designation);
    if (chosen.site) setLocation(chosen.site);
    setIsReliever(Boolean(chosen.isReliever));
    setPrimarySiteName(chosen.primarySiteName ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !location.trim() || !date) {
      setError("Employee Name, Site, and Date are required.");
      return;
    }
    const cleanId =
      employeeId.trim().toUpperCase() ||
      `ACS/ATT/${date.slice(0, 4)}/${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const isOff = status === "Absent" || status === "Leave" || status === "Weekly Off";
    const parsedNormal = Math.max(0, Math.min(3, Number(normalDuty) || 0));
    const parsedExtra = Math.max(0, Math.min(3, Number(extraDuty) || 0));
    const parsedOt = Math.max(0, Math.min(24, Number(otHours) || 0));
    const parsedFraction = Math.max(0, Math.min(3, Number(shiftFraction) || parsedNormal));
    const otEq = parsedOt > 0 ? Number((parsedOt / 8).toFixed(3)) : parsedExtra;
    const defaults = getDefaultDutyForStatus(status);
    const dutyType =
      parsedFraction !== defaults.normalDuty
        ? "CUSTOM"
        : status === "Double Duty"
          ? "P/P"
          : status === "Half Day"
            ? "H"
            : status === "National Holiday"
              ? "NH"
              : status === "Absent"
                ? "A"
                : status === "Leave"
                  ? "L"
                  : status === "Weekly Off"
                    ? "WO"
                    : "P";

    onSave(
      {
        employeeId: cleanId,
        employeeName: employeeName.trim(),
        designation: designation.trim() || "Security Guard",
        location: location.trim(),
        date,
        checkIn: isOff ? "—" : checkIn.trim() || "08:00",
        checkOut: isOff ? "—" : checkOut.trim() || "16:00",
        workingHours: isOff ? "0h 00m" : workingHours.trim() || "8h 00m",
        status,
        dutyType,
        shiftFraction: parsedFraction,
        normalDuty: parsedNormal,
        extraDuty: parsedExtra,
        otHours: parsedOt,
        otDayEquivalent: otEq,
        isReliever,
        ...(primarySiteName.trim() ? { primarySiteName: primarySiteName.trim() } : {}),
        ...(adjustmentNote.trim() ? { adjustmentNote: adjustmentNote.trim() } : {}),
        remarks: remarks.trim(),
      },
      editing?.id,
    );
    toast.success(editing ? "Attendance updated." : "Attendance recorded.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Attendance Entry" : "Add / Mark Attendance Record"}</DialogTitle>
          <DialogDescription>
            Record shift attendance, normal &amp; extra duty (P/P), timings, and remarks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && siteEmployees.length > 0 && (
            <div className="space-y-1.5">
              <Label>Quick Pick Site Employee (Optional)</Label>
              <Select onValueChange={handlePickExistingEmployee}>
                <SelectTrigger><SelectValue placeholder="Choose existing employee or type manually below" /></SelectTrigger>
                <SelectContent>
                  {siteEmployees.map((emp) => (
                    <SelectItem key={emp.key} value={emp.key}>
                      {emp.employeeName} {emp.employeeId ? `(${emp.employeeId})` : ""} — {emp.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="att-name">Employee Name *</Label>
              <Input
                id="att-name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-eid">Employee ID</Label>
              <Input
                id="att-eid"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="ACS/SEC/2026/001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-desig">Rank / Designation *</Label>
              <Input
                id="att-desig"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Security Guard"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-date">Date *</Label>
              <Input
                id="att-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="att-site">Site / Unit *</Label>
              <Input
                id="att-site"
                list="att-site-suggestions"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter deployment site name"
              />
              <datalist id="att-site-suggestions">
                {availableSites.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-status">Attendance Status *</Label>
              <Select value={status} onValueChange={(v) => handleStatusChange(v as AttendanceStatus)}>
                <SelectTrigger id="att-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "Double Duty"
                        ? "Double Duty (P/P)"
                        : s === "National Holiday"
                          ? "National Holiday (NH)"
                          : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="att-in">Check-in</Label>
              <Input id="att-in" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-out">Check-out</Label>
              <Input id="att-out" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-hrs">Hours</Label>
              <Input id="att-hrs" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-norm">Normal Duty</Label>
              <Input
                id="att-norm"
                type="number"
                step="0.001"
                min={0}
                max={3}
                value={normalDuty}
                onChange={(e) => {
                  setNormalDuty(e.target.value);
                  setShiftFraction(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-ext">Extra Duty</Label>
              <Input
                id="att-ext"
                type="number"
                step="0.5"
                min={0}
                max={3}
                value={extraDuty}
                onChange={(e) => setExtraDuty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-ot">OT Hours (÷8d)</Label>
              <Input
                id="att-ot"
                type="number"
                step="0.5"
                min={0}
                max={24}
                value={otHours}
                onChange={(e) => setOtHours(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Checkbox
                checked={isReliever}
                onCheckedChange={(checked) => setIsReliever(checked === true)}
              />
              <span>Cross-site Reliever Duty (primary unit differs from work site)</span>
            </label>
            {isReliever && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="att-primary-site" className="text-xs">Home / Primary Site</Label>
                  <Input
                    id="att-primary-site"
                    list="att-site-suggestions"
                    value={primarySiteName}
                    onChange={(e) => setPrimarySiteName(e.target.value)}
                    placeholder="e.g. ERTL"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="att-adj-note" className="text-xs">Adjustment Note</Label>
                  <Input
                    id="att-adj-note"
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder="e.g. ADJUST ERTL"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-remarks">Remarks</Label>
            <Input
              id="att-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional note (e.g. Night shift cover / extra duty)"
            />
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

export function AttendanceImportDialog({
  open,
  onOpenChange,
  defaultSite,
  defaultDate,
  defaultMonth,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSite: string;
  defaultDate: string;
  defaultMonth: string;
  onImport: (records: Array<Omit<AttendanceRecord, "id">>) => Promise<void>;
}) {
  const [site, setSite] = useState(defaultSite);
  const [month, setMonth] = useState(defaultMonth);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setSite(defaultSite);
      setMonth(defaultMonth);
    }
  }, [open, defaultSite, defaultMonth]);

  const preview = csvText.trim()
    ? parseAttendanceCsv(csvText, site, defaultDate, month)
    : { records: [], errors: [] };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleDaily = () => {
    downloadCsv(
      "acs-attendance-daily-sample.csv",
      ["Employee ID", "Employee Name", "Designation", "Site", "Date", "Status", "Check-in", "Check-out", "Remarks"],
      [
        ["ACS/SEC/2026/001", "Vijay Kumar Shukla", "Security Supervisor", site || "MSME Tool & Training Center", defaultDate, "P", "08:00", "16:00", ""],
        ["ACS/SEC/2026/002", "Indradeo Das", "Security Guard", site || "MSME Tool & Training Center", defaultDate, "P/P", "08:00", "24:00", "Double duty"],
      ],
    );
  };

  const downloadSampleMonthly = () => {
    const days = getDaysInMonth(month);
    const dayHeaders = Array.from({ length: days }, (_, i) => String(i + 1));
    downloadCsv(
      `acs-muster-sheet-sample-${month}.csv`,
      ["Employee ID", "Employee Name", "Designation", "Site", ...dayHeaders],
      [
        ["ACS/SEC/2026/001", "Vijay Kumar Shukla", "Security Supervisor", site || "MSME Tool & Training Center", ...dayHeaders.map((d) => (d === "3" ? "P/P" : "P"))],
        ["ACS/SEC/2026/002", "Aman Sen", "Security Guard", site || "MSME Tool & Training Center", ...dayHeaders.map((d) => (d === "1" ? "A" : "P"))],
      ],
    );
  };

  const handleConfirmImport = async () => {
    if (preview.records.length === 0) {
      toast.error("No valid attendance rows found to import.");
      return;
    }
    setImporting(true);
    try {
      await onImport(preview.records);
      toast.success(`Imported ${preview.records.length} attendance entries.`);
      setCsvText("");
      onOpenChange(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Site Attendance (CSV / Register Sheet)</DialogTitle>
          <DialogDescription>
            Supports Daily Attendance CSV (with OT Hours) and Monthly Muster Roll CSV (`1..31` columns using codes P, P/P, NH, H, A, L, WO, or fractions like 0.5, 0.75, 0.333).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="imp-site">Default Site (if omitted in CSV)</Label>
              <Input id="imp-site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="Site name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imp-month">Target Month (for 1..31 Register CSV)</Label>
              <Input id="imp-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <Upload className="size-4 text-primary" />
              <span>Choose CSV File</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={downloadSampleDaily}>
                <Download className="size-3.5" />Daily Sample
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={downloadSampleMonthly}>
                <Download className="size-3.5" />Monthly 1–31 Sample
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imp-csv-text">Paste CSV Data</Label>
            <Textarea
              id="imp-csv-text"
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Employee ID,Employee Name,Designation,Site,Date,Status&#10;ACS/SEC/2026/001,Vijay Shukla,Supervisor,MSME Center,2026-11-26,P/P"
              className="font-mono text-xs"
            />
          </div>

          {csvText.trim() && (
            <div className="rounded-lg border p-3 text-xs">
              <p className="font-semibold text-foreground">
                Ready to import: {preview.records.length} attendance entry(s)
              </p>
              {preview.errors.length > 0 && (
                <p className="mt-1 text-danger">{preview.errors.slice(0, 3).join(" · ")}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={importing || preview.records.length === 0} onClick={() => void handleConfirmImport()}>
            {importing ? "Importing..." : `Import ${preview.records.length} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
