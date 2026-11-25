import { StatusBadge } from "@/components/acs/StatusBadge";
import type { AttendanceRecord } from "@/lib/acs-types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyCalendar({ records }: { records: AttendanceRecord[] }) {
  const days = Array.from({ length: 30 }, (_, idx) => {
    const day = idx + 1;
    const isSunday = day % 7 === 1;
    const present = isSunday ? 0 : Math.max(1, records.length - ((day % 3) + 1));
    const absent = isSunday ? 0 : day % 4 === 0 ? 1 : 0;
    const leave = isSunday ? 0 : day % 5 === 0 ? 1 : 0;
    return { day, isSunday, present, absent, leave };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">November 2026 — Site Attendance Calendar</h3>
          <p className="text-xs text-muted-foreground">Daily personnel presence summary across active sites</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="Present" />
          <StatusBadge status="Leave" />
          <StatusBadge status="Absent" />
          <StatusBadge status="Weekly Off" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {days.map((d) => (
          <div key={d.day} className="rounded-lg border bg-card p-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{d.day} Nov</span>
              {d.day === 25 && <span className="rounded bg-brand-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-accent">Today</span>}
            </div>
            {d.isSunday ? (
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">Weekly Off Rotation</p>
            ) : (
              <div className="mt-2 space-y-0.5 text-[11px] tabular-nums">
                <p className="font-medium text-success">{d.present} Present</p>
                {d.leave > 0 && <p className="text-warning">{d.leave} Leave</p>}
                {d.absent > 0 && <p className="text-danger">{d.absent} Absent</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}