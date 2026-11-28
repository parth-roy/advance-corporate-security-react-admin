import { useEffect, useMemo, useRef, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
import { useAcsStore } from "@/lib/acs-store";
import type { AttendanceRecord, AttendanceStatus, EmployeeRecord } from "@/lib/acs-types";
import { getDefaultDutyForStatus, getLocalTodayIso } from "@/lib/attendance-utils";

const RELIEVER_STATUSES: AttendanceStatus[] = [
  "Present",
  "Double Duty",
  "Half Day",
  "National Holiday",
];

export function RelieverAssignDialog({
  open,
  onOpenChange,
  siteName,
  selectedDate,
  availableSites,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName: string;
  selectedDate: string;
  availableSites: string[];
  onSave: (record: Omit<AttendanceRecord, "id">) => void;
}) {
  const { data, fetchEmployeesPaginated } = useAcsStore();
  const fetchEmployeesRef = useRef(fetchEmployeesPaginated);
  fetchEmployeesRef.current = fetchEmployeesPaginated;
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteEmployees, setRemoteEmployees] = useState<EmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("Security Guard");
  const [primarySiteName, setPrimarySiteName] = useState("");
  const [date, setDate] = useState(selectedDate || getLocalTodayIso());
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [otHours, setOtHours] = useState("0");
  const [shiftFraction, setShiftFraction] = useState("1");
  const [adjustmentNote, setAdjustmentNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    setEmployeeId("");
    setEmployeeName("");
    setDesignation("Security Guard");
    setPrimarySiteName("");
    setDate(selectedDate || getLocalTodayIso());
    setStatus("Present");
    setOtHours("0");
    setShiftFraction("1");
    setAdjustmentNote("");
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void fetchEmployeesRef.current({ search: searchQuery, limit: 15 }).then((res) => {
      if (active && Array.isArray(res.items)) {
        setRemoteEmployees(res.items);
      }
    });
    return () => {
      active = false;
    };
  }, [open, searchQuery]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const combined: Array<{
      key: string;
      empCode: string;
      fullName: string;
      designation: string;
      siteName: string;
    }> = [];

    const addCandidate = (empCode: string, fullName: string, desig: string, homeSite: string) => {
      const cleanName = fullName.trim();
      if (!cleanName) return;
      if (homeSite.trim().toLowerCase() === siteName.trim().toLowerCase()) return;
      const key = `${empCode.trim().toUpperCase()}::${cleanName.toLowerCase()}`;
      if (seen.has(key)) return;
      if (
        q &&
        !cleanName.toLowerCase().includes(q) &&
        !empCode.toLowerCase().includes(q) &&
        !homeSite.toLowerCase().includes(q)
      ) {
        return;
      }
      seen.add(key);
      combined.push({
        key,
        empCode: empCode.trim().toUpperCase(),
        fullName: cleanName,
        designation: desig.trim() || "Security Guard",
        siteName: homeSite.trim(),
      });
    };

    remoteEmployees.forEach((e) => {
      if (e.status !== "LEFT") addCandidate(e.empCode, e.fullName, e.designation, e.siteName);
    });
    data.employees.forEach((e) => {
      if (e.status !== "LEFT") addCandidate(e.empCode, e.fullName, e.designation, e.siteName);
    });
    data.candidates.forEach((c) => {
      addCandidate(c.employeeId ?? "", c.fullName, c.joiningAs || c.position, c.location);
    });
    return combined.slice(0, 8);
  }, [remoteEmployees, data.employees, data.candidates, searchQuery, siteName]);

  const handlePickSuggestion = (item: (typeof suggestions)[number]) => {
    setEmployeeId(item.empCode);
    setEmployeeName(item.fullName);
    setDesignation(item.designation);
    setPrimarySiteName(item.siteName);
    if (item.siteName && !adjustmentNote) {
      setAdjustmentNote(`ADJUST ${item.siteName.toUpperCase()}`);
    }
  };

  const handleStatusChange = (nextStatus: AttendanceStatus) => {
    setStatus(nextStatus);
    const defaults = getDefaultDutyForStatus(nextStatus);
    setShiftFraction(String(defaults.normalDuty));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !date) {
      toast.error("Reliever employee name and duty date are required.");
      return;
    }

    const defaults = getDefaultDutyForStatus(status);
    const parsedFraction = Math.max(0, Math.min(3, Number(shiftFraction) || defaults.normalDuty));
    const parsedOt = Math.max(0, Math.min(24, Number(otHours) || 0));
    const otEq = parsedOt > 0 ? Number((parsedOt / 8).toFixed(3)) : 0;
    const isCustom = parsedFraction !== defaults.normalDuty;
    const resolvedNormal = parsedFraction;
    const resolvedExtra = status === "Double Duty" ? defaults.extraDuty : 0;

    const cleanId =
      employeeId.trim().toUpperCase() ||
      `ACS/REL/${date.slice(0, 4)}/${employeeName.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "001"}`;

    onSave({
      employeeId: cleanId,
      employeeName: employeeName.trim(),
      designation: designation.trim() || "Security Guard",
      location: siteName,
      date,
      checkIn: defaults.checkIn,
      checkOut: defaults.checkOut,
      workingHours: defaults.workingHours,
      status,
      dutyType: isCustom ? "CUSTOM" : status === "Double Duty" ? "P/P" : status === "Half Day" ? "H" : status === "National Holiday" ? "NH" : "P",
      shiftFraction: parsedFraction,
      normalDuty: resolvedNormal,
      extraDuty: resolvedExtra,
      otHours: parsedOt,
      otDayEquivalent: otEq || resolvedExtra,
      isReliever: true,
      ...(primarySiteName.trim() ? { primarySiteName: primarySiteName.trim() } : {}),
      ...(adjustmentNote.trim() ? { adjustmentNote: adjustmentNote.trim() } : {}),
      remarks: adjustmentNote.trim() || `Reliever from ${primarySiteName.trim() || "External Site"}`,
    });

    toast.success(`Logged cross-site reliever duty for ${employeeName.trim()} at ${siteName}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <span>Assign Cross-Site Reliever Duty</span>
          </DialogTitle>
          <DialogDescription>
            Log an employee deployed primarily at another unit (e.g. ERTL / MSME) who worked a shift at {siteName}. Their home-site attendance remains intact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Label htmlFor="rel-search" className="text-xs font-semibold">
              Find Deployed Staff from Another Site
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="rel-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name, code, or home site..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto pt-1">
                {suggestions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handlePickSuggestion(item)}
                    className="flex items-center justify-between rounded border bg-background px-2.5 py-1.5 text-left text-xs hover:border-primary/50 hover:bg-accent/40"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{item.fullName}</span>
                      {item.empCode && (
                        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                          ({item.empCode})
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground">{item.designation}</p>
                    </div>
                    <Badge variant="neutral" className="text-[10px]">
                      Home: {item.siteName || "Unassigned"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rel-name">Reliever Name *</Label>
              <Input
                id="rel-name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Birendra Roy"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-id">Employee Code</Label>
              <Input
                id="rel-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="e.g. ACS/SEC/2026/004"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-desig">Rank / Designation</Label>
              <Input
                id="rel-desig"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-home">Home / Primary Site</Label>
              <Input
                id="rel-home"
                list="rel-home-sites"
                value={primarySiteName}
                onChange={(e) => setPrimarySiteName(e.target.value)}
                placeholder="e.g. ERTL"
              />
              <datalist id="rel-home-sites">
                {availableSites
                  .filter((s) => s.toLowerCase() !== siteName.toLowerCase())
                  .map((s) => (
                    <option key={s} value={s} />
                  ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="rel-date">Duty Date *</Label>
              <Input
                id="rel-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-status">Shift Code *</Label>
              <Select value={status} onValueChange={(v) => handleStatusChange(v as AttendanceStatus)}>
                <SelectTrigger id="rel-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELIEVER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-frac">Shift Factor</Label>
              <Input
                id="rel-frac"
                type="number"
                step="0.001"
                min={0}
                max={3}
                value={shiftFraction}
                onChange={(e) => setShiftFraction(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-ot">OT Hours</Label>
              <Input
                id="rel-ot"
                type="number"
                step="0.5"
                min={0}
                max={24}
                value={otHours}
                onChange={(e) => setOtHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rel-note">Adjustment Note (Salary / Muster Sheet Note)</Label>
            <Input
              id="rel-note"
              value={adjustmentNote}
              onChange={(e) => setAdjustmentNote(e.target.value)}
              placeholder="e.g. ADJUST ERTL or MD MOMIN ADJAST BHEL"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Reliever Duty</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
