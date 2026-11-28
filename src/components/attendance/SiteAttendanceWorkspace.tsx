import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Lock,
  Pencil,
  Plus,
  Search,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { AttendanceFormDialog, AttendanceImportDialog } from "@/components/attendance/AttendanceDialogs";
import { MonthlyCalendar } from "@/components/attendance/MonthlyCalendar";
import { MonthlyRegisterGrid } from "@/components/attendance/MonthlyRegisterGrid";
import { MusterApprovalDialog } from "@/components/attendance/MusterApprovalDialog";
import { RelieverAssignDialog } from "@/components/attendance/RelieverAssignDialog";
import { useAcsStore } from "@/lib/acs-store";
import type { AttendanceRecord, AttendanceStatus, SiteMusterApproval } from "@/lib/acs-types";
import {
  ATTENDANCE_STATUS_META,
  deriveDynamicSites,
  deriveSiteEmployees,
  findRecordForEmployeeDate,
  formatMonthLabel,
  getDefaultDutyForStatus,
  getExtendedDutyCounts,
  getLocalTodayIso,
  shiftIsoDate,
  type SiteEmployeeSummary,
} from "@/lib/attendance-utils";
import { downloadCsv } from "@/lib/acs-utils";
import { cn } from "@/lib/utils";

export function SiteAttendanceWorkspace({
  siteName,
  selectedDate,
  yearMonth,
  activeTab,
  onBack,
  onChangeSite,
  onChangeDate,
  onChangeMonth,
  onChangeTab,
}: {
  siteName: string;
  selectedDate: string;
  yearMonth: string;
  activeTab: "mark" | "register" | "calendar" | "log";
  onBack: () => void;
  onChangeSite: (nextSite: string) => void;
  onChangeDate: (nextDate: string) => void;
  onChangeMonth: (nextMonth: string) => void;
  onChangeTab: (nextTab: "mark" | "register" | "calendar" | "log") => void;
}) {
  const {
    data,
    upsertAttendance,
    upsertAttendanceBatch,
    fetchMusterApproval,
    saveMusterApproval,
    uploadMusterScan,
  } = useAcsStore();
  const fetchApprovalRef = useRef(fetchMusterApproval);
  fetchApprovalRef.current = fetchMusterApproval;

  const [empSearch, setEmpSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEmpKeys, setSelectedEmpKeys] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [relieverOpen, setRelieverOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [musterApproval, setMusterApproval] = useState<SiteMusterApproval | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const isLocked = musterApproval?.verificationStatus === "LOCKED_FOR_BILLING";

  useEffect(() => {
    let active = true;
    void fetchApprovalRef.current(siteName, yearMonth).then((doc) => {
      if (active) setMusterApproval(doc);
    });
    return () => {
      active = false;
    };
  }, [siteName, yearMonth]);

  const allSites = useMemo(() => deriveDynamicSites(data), [data]);
  const siteEmployees = useMemo(() => deriveSiteEmployees(data, siteName), [data, siteName]);

  const siteRecordsForDate = useMemo(
    () =>
      data.attendance.filter(
        (a) =>
          a.date === selectedDate &&
          a.location.trim().toLowerCase() === siteName.trim().toLowerCase(),
      ),
    [data.attendance, selectedDate, siteName],
  );

  const siteRecordsForMonth = useMemo(
    () =>
      data.attendance.filter(
        (a) =>
          a.date.startsWith(yearMonth) &&
          a.location.trim().toLowerCase() === siteName.trim().toLowerCase(),
      ),
    [data.attendance, yearMonth, siteName],
  );

  const rosterWithStatus = useMemo(() => {
    return siteEmployees.map((emp) => {
      const rec = findRecordForEmployeeDate(siteRecordsForDate, emp, selectedDate);
      return { emp, rec };
    });
  }, [siteEmployees, siteRecordsForDate, selectedDate]);

  const filteredRoster = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return rosterWithStatus.filter(({ emp, rec }) => {
      const matchesQ =
        !q ||
        emp.employeeName.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        (emp.primarySiteName ?? "").toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (statusFilter === "All") return true;
      if (statusFilter === "Relievers") return Boolean(emp.isReliever);
      if (statusFilter === "Unmarked") return !rec;
      if (statusFilter === "Marked") return Boolean(rec);
      return rec?.status === statusFilter;
    });
  }, [rosterWithStatus, empSearch, statusFilter]);

  const dateSummary = useMemo(() => {
    let present = 0;
    let doubleDuty = 0;
    let nationalHoliday = 0;
    let halfDay = 0;
    let absentOrLeave = 0;
    let unmarked = 0;
    rosterWithStatus.forEach(({ rec }) => {
      if (!rec) {
        unmarked += 1;
        return;
      }
      if (rec.status === "Present") present += 1;
      else if (rec.status === "Double Duty") doubleDuty += 1;
      else if (rec.status === "National Holiday") nationalHoliday += 1;
      else if (rec.status === "Half Day") halfDay += 1;
      else if (rec.status === "Absent" || rec.status === "Leave") absentOrLeave += 1;
    });

    let monthNormalDuty = 0;
    let monthExtraDuty = 0;
    let monthOtHours = 0;
    let monthNhDays = 0;
    siteRecordsForMonth.forEach((rec) => {
      const counts = getExtendedDutyCounts(rec);
      monthNormalDuty += counts.normalDuty;
      monthExtraDuty += counts.extraDuty;
      monthOtHours += counts.otHours;
      monthNhDays += counts.nhDays;
    });

    const relieverCount = siteEmployees.filter((e) => e.isReliever).length;
    return {
      totalStaff: siteEmployees.length,
      relieverCount,
      presentTotal: present + doubleDuty + nationalHoliday,
      doubleDuty,
      nationalHoliday,
      halfDay,
      absentOrLeave,
      unmarked,
      monthNormalDuty: Number(monthNormalDuty.toFixed(2)),
      monthExtraDuty: Number(monthExtraDuty.toFixed(2)),
      monthOtHours: Number(monthOtHours.toFixed(1)),
      monthNhDays,
      monthDutyTotal: Number((monthNormalDuty + monthExtraDuty).toFixed(1)),
    };
  }, [rosterWithStatus, siteEmployees, siteRecordsForMonth]);

  const markEmployeeStatus = (emp: SiteEmployeeSummary, dateIso: string, status: AttendanceStatus) => {
    if (isLocked) {
      toast.error("Muster is LOCKED_FOR_BILLING. Unlock sign-off before modifying attendance.");
      return;
    }
    const existing = findRecordForEmployeeDate(data.attendance, emp, dateIso);
    const defaults = getDefaultDutyForStatus(status);
    const resolvedId = existing?.id ?? undefined;
    const empId =
      emp.employeeId ||
      existing?.employeeId ||
      `ACS/SITE/${dateIso.slice(0, 4)}/${emp.employeeName.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "001"}`;

    const homeSite = emp.primarySiteName || existing?.primarySiteName || "";

    upsertAttendance(
      {
        employeeId: empId,
        employeeName: emp.employeeName,
        designation: emp.designation,
        location: emp.site || siteName,
        date: dateIso,
        checkIn: defaults.checkIn,
        checkOut: defaults.checkOut,
        workingHours: defaults.workingHours,
        status,
        shiftFraction: defaults.normalDuty,
        normalDuty: defaults.normalDuty,
        extraDuty: defaults.extraDuty,
        ...(existing?.otHours !== undefined ? { otHours: existing.otHours } : {}),
        ...(existing?.otDayEquivalent !== undefined ? { otDayEquivalent: existing.otDayEquivalent } : {}),
        ...(emp.isReliever || existing?.isReliever ? { isReliever: true } : {}),
        ...(homeSite ? { primarySiteName: homeSite } : {}),
        ...(existing?.adjustmentNote ? { adjustmentNote: existing.adjustmentNote } : {}),
        remarks: existing?.remarks ?? "",
      },
      resolvedId,
    );
  };

  const applyBatchToRoster = async (targets: SiteEmployeeSummary[], status: AttendanceStatus) => {
    if (isLocked) {
      toast.error("Muster is LOCKED_FOR_BILLING. Unlock sign-off before modifying attendance.");
      return;
    }
    if (targets.length === 0) {
      toast.error("Select at least one employee first.");
      return;
    }
    const defaults = getDefaultDutyForStatus(status);
    await upsertAttendanceBatch(
      targets.map((emp, idx) => ({
        employeeId:
          emp.employeeId ||
          `ACS/SITE/${selectedDate.slice(0, 4)}/${String(idx + 1).padStart(3, "0")}`,
        employeeName: emp.employeeName,
        designation: emp.designation,
        location: emp.site || siteName,
        date: selectedDate,
        checkIn: defaults.checkIn,
        checkOut: defaults.checkOut,
        workingHours: defaults.workingHours,
        status,
        shiftFraction: defaults.normalDuty,
        normalDuty: defaults.normalDuty,
        extraDuty: defaults.extraDuty,
        ...(emp.isReliever ? { isReliever: true } : {}),
        ...(emp.primarySiteName ? { primarySiteName: emp.primarySiteName } : {}),
        remarks: "",
      })),
    );
    setSelectedEmpKeys([]);
    toast.success(`Marked ${targets.length} employee(s) as ${status} on ${selectedDate}.`);
  };

  const toggleSelectEmp = (key: string) => {
    setSelectedEmpKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleExportDaily = () => {
    downloadCsv(
      `acs-attendance-${siteName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${selectedDate}.csv`,
      [
        "Employee ID",
        "Employee Name",
        "Designation",
        "Site",
        "Reliever Home Site",
        "Date",
        "Status",
        "Normal Duty",
        "Extra Duty",
        "OT Hours",
        "Adjustment Note",
        "Check-in",
        "Check-out",
        "Remarks",
      ],
      filteredRoster.map(({ emp, rec }) => {
        const counts = rec
          ? getExtendedDutyCounts(rec)
          : { normalDuty: 0, extraDuty: 0, otHours: 0 };
        return [
          emp.employeeId || "—",
          emp.employeeName,
          emp.designation,
          emp.site,
          emp.isReliever ? emp.primarySiteName || "External" : "",
          selectedDate,
          rec?.status ?? "Unmarked",
          String(counts.normalDuty),
          String(counts.extraDuty),
          String(counts.otHours),
          rec?.adjustmentNote ?? "",
          rec?.checkIn ?? "—",
          rec?.checkOut ?? "—",
          rec?.remarks ?? "",
        ];
      }),
    );
    toast.success(`Exported ${selectedDate} attendance for ${siteName}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            All Sites
          </Button>
          {allSites.length > 0 && (
            <Select value={siteName} onValueChange={onChangeSite}>
              <SelectTrigger aria-label="Switch deployment site" className="h-9 w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!allSites.includes(siteName) && (
                  <SelectItem value={siteName}>{siteName}</SelectItem>
                )}
                {allSites.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Filter month"
            type="month"
            value={yearMonth}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="h-9 w-40 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setApprovalOpen(true)}
            className="gap-1.5"
          >
            <FileCheck2 className="size-4 text-primary" />
            <span>Muster Sign-Off</span>
            <StatusBadge status={musterApproval?.verificationStatus ?? "DRAFT"} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLocked}
            onClick={() => setRelieverOpen(true)}
          >
            <UserPlus className="size-4" />
            Assign Reliever
          </Button>
          <Button variant="outline" size="sm" disabled={isLocked} onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportDaily}>
            <Download className="size-4" />
            Export Daily
          </Button>
          <Button
            size="sm"
            disabled={isLocked}
            onClick={() => {
              setEditingRecord(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Record
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/40 bg-success-soft/30 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Lock className="size-4 text-success" />
            <span>
              {formatMonthLabel(yearMonth)} muster for {siteName} is LOCKED_FOR_BILLING
              {musterApproval?.verifiedByName ? ` (Verified by ${musterApproval.verifiedByName})` : ""}.
            </span>
          </div>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setApprovalOpen(true)}>
            Manage Sign-Off
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Site Workforce"
          value={dateSummary.totalStaff}
          hint={
            dateSummary.relieverCount > 0
              ? `${dateSummary.relieverCount} cross-site reliever(s)`
              : siteName
          }
          icon={Users}
          tone="primary"
        />
        <StatCard
          label={`Present (${selectedDate})`}
          value={dateSummary.presentTotal}
          hint={
            dateSummary.nationalHoliday > 0
              ? `${dateSummary.doubleDuty} P/P · ${dateSummary.nationalHoliday} NH`
              : dateSummary.doubleDuty > 0
                ? `${dateSummary.doubleDuty} Double Duty (P/P)`
                : `${dateSummary.unmarked} Unmarked`
          }
          icon={UserCheck}
          tone="success"
        />
        <StatCard
          label="Absent / Leave"
          value={dateSummary.absentOrLeave}
          hint={`${dateSummary.halfDay} Half Day`}
          icon={UserX}
          tone="danger"
        />
        <StatCard
          label={`${formatMonthLabel(yearMonth)} Duties`}
          value={dateSummary.monthDutyTotal}
          hint={
            dateSummary.monthOtHours > 0 || dateSummary.monthNhDays > 0
              ? `${dateSummary.monthOtHours}h OT · ${dateSummary.monthNhDays} NH`
              : "Normal + Extra Duty total"
          }
          icon={Clock}
          tone="info"
        />
      </section>

      <section className="acs-card p-5 space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => onChangeTab(v as "mark" | "register" | "calendar" | "log")}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="mark">Mark Attendance (Date-Wise)</TabsTrigger>
              <TabsTrigger value="register">
                <FileSpreadsheet className="mr-1.5 size-3.5" />
                Monthly Register (1–31)
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="mr-1.5 size-3.5" />
                Monthly Calendar
              </TabsTrigger>
              <TabsTrigger value="log">Site Log ({siteRecordsForMonth.length})</TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Previous Day"
                onClick={() => onChangeDate(shiftIsoDate(selectedDate, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Input
                aria-label="Attendance Date"
                type="date"
                value={selectedDate}
                onChange={(e) => onChangeDate(e.target.value)}
                className="h-9 w-40 text-xs"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Next Day"
                onClick={() => onChangeDate(shiftIsoDate(selectedDate, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onChangeDate(getLocalTodayIso())}
              >
                Today
              </Button>
            </div>
          </div>

          <TabsContent value="mark" className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search site employees"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Filter employee name, ID, rank..."
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Filter roster status" className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Staff ({rosterWithStatus.length})</SelectItem>
                    <SelectItem value="Relievers">
                      Relievers Only ({dateSummary.relieverCount})
                    </SelectItem>
                    <SelectItem value="Unmarked">Unmarked Only</SelectItem>
                    <SelectItem value="Marked">Marked Only</SelectItem>
                    <SelectItem value="Present">Present (P)</SelectItem>
                    <SelectItem value="Double Duty">Double Duty (P/P)</SelectItem>
                    <SelectItem value="National Holiday">National Holiday (NH)</SelectItem>
                    <SelectItem value="Half Day">Half Day (H)</SelectItem>
                    <SelectItem value="Absent">Absent (A)</SelectItem>
                    <SelectItem value="Leave">Leave (L)</SelectItem>
                    <SelectItem value="Weekly Off">Weekly Off (WO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                {dateSummary.unmarked > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void applyBatchToRoster(
                        rosterWithStatus.filter((r) => !r.rec).map((r) => r.emp),
                        "Present",
                      )
                    }
                  >
                    Mark Unmarked Present ({dateSummary.unmarked})
                  </Button>
                )}
                {selectedEmpKeys.length > 0 && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void applyBatchToRoster(
                          siteEmployees.filter((e) => selectedEmpKeys.includes(e.key)),
                          "Present",
                        )
                      }
                    >
                      Mark {selectedEmpKeys.length} Present
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void applyBatchToRoster(
                          siteEmployees.filter((e) => selectedEmpKeys.includes(e.key)),
                          "Absent",
                        )
                      }
                    >
                      Mark {selectedEmpKeys.length} Absent
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all site employees"
                        checked={
                          filteredRoster.length > 0 &&
                          filteredRoster.every(({ emp }) => selectedEmpKeys.includes(emp.key))
                        }
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedEmpKeys(filteredRoster.map(({ emp }) => emp.key));
                          } else {
                            setSelectedEmpKeys([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Employee &amp; ID</TableHead>
                    <TableHead>Rank / Designation</TableHead>
                    <TableHead>Current ({selectedDate})</TableHead>
                    <TableHead>Quick Mark Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No employees match the current filter for {siteName}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoster.map(({ emp, rec }) => (
                      <TableRow key={emp.key}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${emp.employeeName}`}
                            checked={selectedEmpKeys.includes(emp.key)}
                            onCheckedChange={() => toggleSelectEmp(emp.key)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-foreground">{emp.employeeName}</span>
                            {emp.isReliever && (
                              <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                                Reliever
                              </Badge>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {emp.employeeId || "No Employee ID"}
                            {emp.isReliever && emp.primarySiteName ? ` · Home: ${emp.primarySiteName}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{emp.designation}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <StatusBadge status={rec?.status ?? "Unmarked"} />
                            {rec && (rec.otHours ?? 0) > 0 && (
                              <p className="text-[10px] font-medium text-info tabular-nums">
                                +{rec.otHours}h OT
                              </p>
                            )}
                            {rec?.adjustmentNote && (
                              <p className="text-[10px] text-muted-foreground">{rec.adjustmentNote}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ATTENDANCE_STATUS_META.map((opt) => {
                              const isActive = rec?.status === opt.status;
                              return (
                                <button
                                  key={opt.status}
                                  type="button"
                                  disabled={isLocked}
                                  title={opt.shortLabel}
                                  aria-label={`Mark ${emp.employeeName} ${opt.status}`}
                                  onClick={() => markEmployeeStatus(emp, selectedDate, opt.status)}
                                  className={cn(
                                    "rounded border px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                    isActive
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background text-foreground hover:bg-accent",
                                  )}
                                >
                                  {opt.code}
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isLocked}
                            aria-label={`Edit details for ${emp.employeeName}`}
                            onClick={() => {
                              setEditingRecord(
                                rec ?? {
                                  id: "",
                                  employeeId: emp.employeeId,
                                  employeeName: emp.employeeName,
                                  designation: emp.designation,
                                  location: emp.site || siteName,
                                  date: selectedDate,
                                  checkIn: "08:00",
                                  checkOut: "16:00",
                                  workingHours: "8h 00m",
                                  status: "Present",
                                  normalDuty: 1,
                                  extraDuty: 0,
                                  ...(emp.isReliever ? { isReliever: true } : {}),
                                  ...(emp.primarySiteName ? { primarySiteName: emp.primarySiteName } : {}),
                                },
                              );
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="register">
            <MonthlyRegisterGrid
              siteName={siteName}
              yearMonth={yearMonth}
              employees={siteEmployees}
              records={data.attendance}
              musterApproval={musterApproval}
              isLocked={isLocked}
              onMarkCell={markEmployeeStatus}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <MonthlyCalendar
              records={data.attendance}
              yearMonth={yearMonth}
              selectedDate={selectedDate}
              siteName={siteName}
              onSelectDate={(dateIso) => {
                onChangeDate(dateIso);
                onChangeTab("mark");
              }}
            />
          </TabsContent>

          <TabsContent value="log">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Check-in / Out</TableHead>
                    <TableHead>Duty (N / E / OT)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteRecordsForMonth.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No attendance logs recorded for {siteName} in {formatMonthLabel(yearMonth)}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    siteRecordsForMonth.map((rec) => {
                      const counts = getExtendedDutyCounts(rec);
                      return (
                        <TableRow key={rec.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{rec.date}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-foreground">{rec.employeeName}</span>
                              {rec.isReliever && (
                                <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                                  Reliever
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {rec.employeeId}
                              {rec.adjustmentNote ? ` · ${rec.adjustmentNote}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{rec.designation}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs tabular-nums">
                            {rec.checkIn} – {rec.checkOut} ({rec.workingHours})
                          </TableCell>
                          <TableCell className="tabular-nums text-xs">
                            {counts.normalDuty} + <span className="font-semibold text-info">{counts.extraDuty}</span>
                            {counts.otHours > 0 ? ` · ${counts.otHours}h OT` : ""}
                          </TableCell>
                          <TableCell><StatusBadge status={rec.status} /></TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isLocked}
                              aria-label={`Edit ${rec.employeeName} ${rec.date}`}
                              onClick={() => {
                                setEditingRecord(rec);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <AttendanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingRecord?.id ? editingRecord : null}
        defaultDate={selectedDate}
        defaultSite={siteName}
        availableSites={allSites}
        siteEmployees={siteEmployees}
        onSave={upsertAttendance}
      />

      <AttendanceImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultSite={siteName}
        defaultDate={selectedDate}
        defaultMonth={yearMonth}
        onImport={upsertAttendanceBatch}
      />

      <RelieverAssignDialog
        open={relieverOpen}
        onOpenChange={setRelieverOpen}
        siteName={siteName}
        selectedDate={selectedDate}
        availableSites={allSites}
        onSave={upsertAttendance}
      />

      <MusterApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        siteName={siteName}
        yearMonth={yearMonth}
        totals={{
          normalDuty: dateSummary.monthNormalDuty,
          extraDuty: dateSummary.monthExtraDuty,
          otHours: dateSummary.monthOtHours,
          nhDays: dateSummary.monthNhDays,
          totalDuty: dateSummary.monthDutyTotal,
        }}
        approval={musterApproval}
        onUploadScan={uploadMusterScan}
        onSave={async (payload) => {
          const saved = await saveMusterApproval(payload);
          if (saved) setMusterApproval(saved);
          return saved;
        }}
      />
    </div>
  );
}
