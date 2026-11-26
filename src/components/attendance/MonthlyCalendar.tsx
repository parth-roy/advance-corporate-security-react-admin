import { useMemo } from "react";
import { StatusBadge } from "@/components/acs/StatusBadge";
import type { AttendanceRecord } from "@/lib/acs-types";
import {
  formatDayIso,
  formatMonthLabel,
  getDaysInMonth,
  getLocalTodayIso,
  getMonthStartWeekdayIndex,
} from "@/lib/attendance-utils";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyCalendar({
  records,
  yearMonth,
  selectedDate,
  siteName,
  onSelectDate,
}: {
  records: AttendanceRecord[];
  yearMonth: string;
  selectedDate: string;
  siteName?: string;
  onSelectDate?: (dateIso: string) => void;
}) {
  const totalDays = getDaysInMonth(yearMonth);
  const leadingEmptySlots = getMonthStartWeekdayIndex(yearMonth);
  const todayIso = getLocalTodayIso();

  const dayStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { present: number; doubleDuty: number; halfDay: number; absent: number; leave: number; weeklyOff: number }
    >();

    records.forEach((rec) => {
      if (!rec.date.startsWith(yearMonth)) return;
      if (siteName && rec.location.trim().toLowerCase() !== siteName.trim().toLowerCase()) return;
      const cur = map.get(rec.date) ?? {
        present: 0,
        doubleDuty: 0,
        halfDay: 0,
        absent: 0,
        leave: 0,
        weeklyOff: 0,
      };
      if (rec.status === "Present") cur.present += 1;
      else if (rec.status === "Double Duty") cur.doubleDuty += 1;
      else if (rec.status === "Half Day") cur.halfDay += 1;
      else if (rec.status === "Absent") cur.absent += 1;
      else if (rec.status === "Leave") cur.leave += 1;
      else if (rec.status === "Weekly Off") cur.weeklyOff += 1;
      map.set(rec.date, cur);
    });
    return map;
  }, [records, yearMonth, siteName]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {formatMonthLabel(yearMonth)}
            {siteName ? ` — ${siteName}` : " — Site Attendance Calendar"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Click any date to inspect or mark attendance for that day
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status="Present" />
          <StatusBadge status="Double Duty" />
          <StatusBadge status="Half Day" />
          <StatusBadge status="Leave" />
          <StatusBadge status="Absent" />
          <StatusBadge status="Weekly Off" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {Array.from({ length: leadingEmptySlots }, (_, idx) => (
          <div key={`empty-${idx}`} className="hidden rounded-lg border border-dashed border-border/40 bg-muted/20 sm:block" />
        ))}

        {Array.from({ length: totalDays }, (_, idx) => {
          const day = idx + 1;
          const dateIso = formatDayIso(yearMonth, day);
          const stats = dayStatsMap.get(dateIso);
          const isToday = dateIso === todayIso;
          const isSelected = dateIso === selectedDate;
          const totalMarked = stats
            ? stats.present + stats.doubleDuty + stats.halfDay + stats.absent + stats.leave + stats.weeklyOff
            : 0;

          return (
            <button
              key={dateIso}
              type="button"
              onClick={() => onSelectDate?.(dateIso)}
              className={cn(
                "flex min-h-[84px] flex-col justify-between rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-primary/60 hover:bg-accent/30",
                isSelected && "border-primary bg-brand-accent-soft/20 ring-1 ring-primary",
              )}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground">{day}</span>
                {isToday && (
                  <span className="rounded bg-brand-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    Today
                  </span>
                )}
              </div>

              {totalMarked === 0 ? (
                <p className="text-[11px] text-muted-foreground">No records</p>
              ) : (
                <div className="space-y-0.5 text-[11px] tabular-nums">
                  {stats && stats.present > 0 && (
                    <p className="font-medium text-success">{stats.present} P</p>
                  )}
                  {stats && stats.doubleDuty > 0 && (
                    <p className="font-semibold text-info">{stats.doubleDuty} P/P</p>
                  )}
                  {stats && stats.halfDay > 0 && (
                    <p className="text-warning">{stats.halfDay} H</p>
                  )}
                  {stats && stats.leave > 0 && (
                    <p className="text-warning">{stats.leave} L</p>
                  )}
                  {stats && stats.absent > 0 && (
                    <p className="text-danger">{stats.absent} A</p>
                  )}
                  {stats && stats.weeklyOff > 0 && (
                    <p className="text-muted-foreground">{stats.weeklyOff} WO</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
