import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/acs-types";
import {
  ATTENDANCE_STATUS_META,
  findRecordForEmployeeDate,
  formatDayIso,
  formatMonthLabel,
  getDaysInMonth,
  getDefaultDutyForStatus,
  getLocalTodayIso,
  getRecordDutyCounts,
  type SiteEmployeeSummary,
  statusToCode,
} from "@/lib/attendance-utils";
import { downloadCsv } from "@/lib/acs-utils";
import { cn } from "@/lib/utils";

function codeBadgeStyle(code: string): string {
  if (code === "P") return "text-success font-semibold bg-success-soft/60";
  if (code === "P/P") return "text-info font-bold bg-info-soft";
  if (code === "H" || code === "L") return "text-warning font-semibold bg-warning-soft/60";
  if (code === "A") return "text-danger font-semibold bg-danger-soft/70";
  if (code === "WO") return "text-muted-foreground font-medium bg-muted";
  return "text-muted-foreground/50";
}

export function MonthlyRegisterGrid({
  siteName,
  yearMonth,
  employees,
  records,
  onMarkCell,
}: {
  siteName: string;
  yearMonth: string;
  employees: SiteEmployeeSummary[];
  records: AttendanceRecord[];
  onMarkCell: (emp: SiteEmployeeSummary, dateIso: string, status: AttendanceStatus) => void;
}) {
  const totalDays = getDaysInMonth(yearMonth);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const todayIso = getLocalTodayIso();
  const [openCellKey, setOpenCellKey] = useState<string | null>(null);

  const monthRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          r.date.startsWith(yearMonth) &&
          r.location.trim().toLowerCase() === siteName.trim().toLowerCase(),
      ),
    [records, yearMonth, siteName],
  );

  const employeeRows = useMemo(() => {
    return employees.map((emp) => {
      let normalSum = 0;
      let extraSum = 0;
      const dayRecords = days.map((day) => {
        const dateIso = formatDayIso(yearMonth, day);
        const rec = findRecordForEmployeeDate(monthRecords, emp, dateIso);
        if (rec) {
          const counts = getRecordDutyCounts(rec);
          normalSum += counts.normalDuty;
          extraSum += counts.extraDuty;
        }
        return { day, dateIso, rec };
      });
      return {
        emp,
        dayRecords,
        normalDuty: Number(normalSum.toFixed(2)),
        extraDuty: Number(extraSum.toFixed(2)),
        totalDuty: Number((normalSum + extraSum).toFixed(2)),
      };
    });
  }, [employees, monthRecords, days, yearMonth]);

  const grandTotals = useMemo(
    () =>
      employeeRows.reduce(
        (acc, row) => ({
          normal: Number((acc.normal + row.normalDuty).toFixed(2)),
          extra: Number((acc.extra + row.extraDuty).toFixed(2)),
          total: Number((acc.total + row.totalDuty).toFixed(2)),
        }),
        { normal: 0, extra: 0, total: 0 },
      ),
    [employeeRows],
  );

  const handleExportRegister = () => {
    const dayCols = days.map((d) => String(d));
    const headers = [
      "Sl No",
      "Rank / Designation",
      "Employee ID",
      "Employee Name",
      ...dayCols,
      "Normal Duty",
      "Extra Duty",
      "Total Duty",
    ];
    const rows = employeeRows.map((row, idx) => [
      String(idx + 1),
      row.emp.designation,
      row.emp.employeeId || "—",
      row.emp.employeeName,
      ...row.dayRecords.map((d) => (d.rec ? statusToCode(d.rec.status) : "")),
      String(row.normalDuty),
      String(row.extraDuty),
      String(row.totalDuty),
    ]);
    rows.push([
      "",
      "",
      "",
      `TOTAL ATTENDANCE (${siteName})`,
      ...days.map(() => ""),
      String(grandTotals.normal),
      String(grandTotals.extra),
      String(grandTotals.total),
    ]);

    downloadCsv(`acs-register-${siteName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${yearMonth}.csv`, headers, rows);
    toast.success("Monthly register CSV exported.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider text-primary uppercase">
            Advance Corporate Security — Monthly Muster Roll Sheet
          </p>
          <p className="text-sm font-semibold text-foreground">
            UNIT: {siteName} · {formatMonthLabel(yearMonth)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Click any date cell to mark/change: P = Normal (1), P/P = Double Duty (1+1), H = Half (0.5), A = Absent, L = Leave, WO = Off
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleExportRegister}>
          <Download className="size-4" />
          Export Muster CSV
        </Button>
      </div>

      {employeeRows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No employees assigned to this site yet. Add an employee or attendance record to populate the monthly register.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60 text-left font-semibold text-foreground">
                <th className="sticky left-0 z-10 border-r border-b bg-muted px-2.5 py-2 text-center">Sl</th>
                <th className="sticky left-8 z-10 min-w-[110px] border-r border-b bg-muted px-2.5 py-2">Rank</th>
                <th className="sticky left-[142px] z-10 min-w-[160px] border-r border-b bg-muted px-2.5 py-2">Employee Name</th>
                {days.map((day) => {
                  const iso = formatDayIso(yearMonth, day);
                  const isToday = iso === todayIso;
                  return (
                    <th
                      key={day}
                      className={cn(
                        "min-w-[34px] border-r border-b px-1 py-2 text-center tabular-nums",
                        isToday && "bg-brand-accent-soft text-primary",
                      )}
                    >
                      {day}
                    </th>
                  );
                })}
                <th className="min-w-[64px] border-r border-b bg-muted/60 px-2 py-2 text-center">Normal</th>
                <th className="min-w-[64px] border-r border-b bg-muted/60 px-2 py-2 text-center">Extra</th>
                <th className="min-w-[68px] border-b bg-muted/80 px-2 py-2 text-center font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {employeeRows.map((row, idx) => (
                <tr key={row.emp.key} className="border-b hover:bg-muted/20">
                  <td className="sticky left-0 z-10 border-r bg-card px-2.5 py-1.5 text-center tabular-nums text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="sticky left-8 z-10 border-r bg-card px-2.5 py-1.5 text-muted-foreground">
                    <span className="line-clamp-1">{row.emp.designation}</span>
                  </td>
                  <td className="sticky left-[142px] z-10 border-r bg-card px-2.5 py-1.5">
                    <div className="font-semibold text-foreground">{row.emp.employeeName}</div>
                    {row.emp.employeeId && (
                      <div className="font-mono text-[10px] text-muted-foreground">{row.emp.employeeId}</div>
                    )}
                  </td>
                  {row.dayRecords.map(({ day, dateIso, rec }) => {
                    const code = rec ? statusToCode(rec.status) : "";
                    const cellKey = `${row.emp.key}::${dateIso}`;
                    return (
                      <td key={day} className="border-r p-0 text-center">
                        <Popover
                          open={openCellKey === cellKey}
                          onOpenChange={(isOpen) => setOpenCellKey(isOpen ? cellKey : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label={`${row.emp.employeeName} Day ${day}`}
                              className={cn(
                                "flex h-9 w-full items-center justify-center text-[11px] transition-colors hover:bg-accent",
                                codeBadgeStyle(code),
                              )}
                            >
                              {code || "·"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="center" className="w-48 p-1.5">
                            <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                              {row.emp.employeeName} ({dateIso})
                            </p>
                            <div className="grid grid-cols-1 gap-0.5">
                              {ATTENDANCE_STATUS_META.map((opt) => (
                                <button
                                  key={opt.status}
                                  type="button"
                                  onClick={() => {
                                    onMarkCell(row.emp, dateIso, opt.status);
                                    setOpenCellKey(null);
                                  }}
                                  className="flex items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                                >
                                  <span className="font-medium text-foreground">{opt.shortLabel}</span>
                                  <span className="font-mono font-bold text-primary">{opt.code}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                    );
                  })}
                  <td className="border-r px-2 py-1.5 text-center font-medium tabular-nums text-foreground">
                    {row.normalDuty}
                  </td>
                  <td className="border-r px-2 py-1.5 text-center font-medium tabular-nums text-info">
                    {row.extraDuty}
                  </td>
                  <td className="px-2 py-1.5 text-center font-bold tabular-nums text-foreground">
                    {row.totalDuty}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/70 font-bold text-foreground">
                <td colSpan={3} className="sticky left-0 z-10 border-r bg-muted/90 px-3 py-2 text-right">
                  Total Attendance ({employeeRows.length} Personnel)
                </td>
                <td colSpan={days.length} className="border-r px-3 py-2 text-center text-[11px] font-normal text-muted-foreground">
                  {formatMonthLabel(yearMonth)} · Grand Duty Summary
                </td>
                <td className="border-r px-2 py-2 text-center tabular-nums">{grandTotals.normal}</td>
                <td className="border-r px-2 py-2 text-center tabular-nums text-info">{grandTotals.extra}</td>
                <td className="px-2 py-2 text-center tabular-nums">{grandTotals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
