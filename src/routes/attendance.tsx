import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, CalendarDays, Clock, Download, MapPin, Plus, Search, Upload, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/acs/StatCard";
import { AttendanceFormDialog, AttendanceImportDialog } from "@/components/attendance/AttendanceDialogs";
import { SiteAttendanceWorkspace } from "@/components/attendance/SiteAttendanceWorkspace";
import { useAcsStore } from "@/lib/acs-store";
import {
  deriveDynamicSites,
  deriveSiteEmployees,
  findRecordForEmployeeDate,
  formatMonthLabel,
  getCurrentYearMonth,
  getLocalTodayIso,
  getRecordDutyCounts,
} from "@/lib/attendance-utils";
import { downloadCsv } from "@/lib/acs-utils";

interface AttendanceSearch {
  site?: string;
  tab?: "mark" | "register" | "calendar" | "log";
  date?: string;
  month?: string;
}

export const Route = createFileRoute("/attendance")({
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => {
    const site = typeof search["site"] === "string" && search["site"].trim() ? search["site"] : undefined;
    const rawTab = search["tab"];
    const tab =
      rawTab === "mark" || rawTab === "register" || rawTab === "calendar" || rawTab === "log"
        ? rawTab
        : undefined;
    const date = typeof search["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search["date"])
      ? search["date"]
      : undefined;
    const month = typeof search["month"] === "string" && /^\d{4}-\d{2}$/.test(search["month"])
      ? search["month"]
      : undefined;
    return {
      ...(site ? { site } : {}),
      ...(tab ? { tab } : {}),
      ...(date ? { date } : {}),
      ...(month ? { month } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Attendance — ACS Admin Panel" },
      { name: "description", content: "Site-wise employee attendance management, monthly muster roll sheets, calendar, and CSV import/export." },
      { property: "og:title", content: "Attendance — ACS Admin Panel" },
      { property: "og:description", content: "Site-wise employee attendance management for Advance Corporate Security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { data, upsertAttendance, upsertAttendanceBatch } = useAcsStore();
  const { site, tab, date, month } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const today = getLocalTodayIso();
  const activeDate = date ?? today;
  const activeMonth = month ?? activeDate.slice(0, 7) ?? getCurrentYearMonth();
  const activeTab = tab ?? "mark";

  const [siteSearch, setSiteSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const sites = useMemo(() => deriveDynamicSites(data), [data]);

  const siteSummaries = useMemo(() => {
    return sites.map((siteName) => {
      const employees = deriveSiteEmployees(data, siteName);
      const dateRecords = data.attendance.filter(
        (a) =>
          a.date === activeDate &&
          a.location.trim().toLowerCase() === siteName.trim().toLowerCase(),
      );
      let present = 0;
      let doubleDuty = 0;
      let absent = 0;
      let halfOrLeave = 0;
      employees.forEach((emp) => {
        const rec = findRecordForEmployeeDate(dateRecords, emp, activeDate);
        if (!rec) return;
        if (rec.status === "Present") present += 1;
        else if (rec.status === "Double Duty") doubleDuty += 1;
        else if (rec.status === "Absent") absent += 1;
        else if (rec.status === "Half Day" || rec.status === "Leave") halfOrLeave += 1;
      });
      const unmarked = Math.max(0, employees.length - (present + doubleDuty + absent + halfOrLeave));
      const monthDuty = data.attendance
        .filter(
          (a) =>
            a.date.startsWith(activeMonth) &&
            a.location.trim().toLowerCase() === siteName.trim().toLowerCase(),
        )
        .reduce((sum, rec) => sum + getRecordDutyCounts(rec).totalDuty, 0);

      return {
        siteName,
        staffCount: employees.length,
        present: present + doubleDuty,
        doubleDuty,
        absent,
        unmarked,
        monthDuty: Number(monthDuty.toFixed(1)),
      };
    });
  }, [sites, data, activeDate, activeMonth]);

  const filteredSiteSummaries = useMemo(() => {
    const q = siteSearch.trim().toLowerCase();
    return siteSummaries.filter((s) => !q || s.siteName.toLowerCase().includes(q));
  }, [siteSummaries, siteSearch]);

  const overallSummary = useMemo(() => {
    const totalStaff = siteSummaries.reduce((sum, s) => sum + s.staffCount, 0);
    const presentToday = siteSummaries.reduce((sum, s) => sum + s.present, 0);
    const monthDuty = siteSummaries.reduce((sum, s) => sum + s.monthDuty, 0);
    return {
      totalSites: sites.length,
      totalStaff,
      presentToday,
      monthDuty: Number(monthDuty.toFixed(1)),
    };
  }, [siteSummaries, sites.length]);

  const updateSearch = (patch: Partial<AttendanceSearch>) => {
    const next: AttendanceSearch = {
      ...(site ? { site } : {}),
      ...(activeTab !== "mark" ? { tab: activeTab } : {}),
      ...(date ? { date } : {}),
      ...(month ? { month } : {}),
      ...patch,
    };
    void navigate({ search: next });
  };

  if (site) {
    return (
      <SiteAttendanceWorkspace
        siteName={site}
        selectedDate={activeDate}
        yearMonth={activeMonth}
        activeTab={activeTab}
        onBack={() =>
          void navigate({
            search: {
              ...(date ? { date } : {}),
              ...(month ? { month } : {}),
            },
          })
        }
        onChangeSite={(nextSite) => updateSearch({ site: nextSite })}
        onChangeDate={(nextDate) =>
          updateSearch({ date: nextDate, month: nextDate.slice(0, 7) })
        }
        onChangeMonth={(nextMonth) =>
          updateSearch({
            month: nextMonth,
            date: activeDate.startsWith(nextMonth) ? activeDate : `${nextMonth}-01`,
          })
        }
        onChangeTab={(nextTab) => updateSearch({ tab: nextTab })}
      />
    );
  }

  const handleExportAllSites = () => {
    const monthRecords = data.attendance.filter((a) => a.date.startsWith(activeMonth));
    downloadCsv(
      `acs-all-sites-attendance-${activeMonth}.csv`,
      ["Site", "Employee ID", "Employee Name", "Designation", "Date", "Status", "Normal Duty", "Extra Duty", "Check-in", "Check-out", "Remarks"],
      monthRecords.map((a) => {
        const counts = getRecordDutyCounts(a);
        return [
          a.location,
          a.employeeId,
          a.employeeName,
          a.designation,
          a.date,
          a.status,
          String(counts.normalDuty),
          String(counts.extraDuty),
          a.checkIn,
          a.checkOut,
          a.remarks ?? "",
        ];
      }),
    );
    toast.success(`Exported ${monthRecords.length} attendance entries for ${formatMonthLabel(activeMonth)}.`);
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Deployment Sites" value={overallSummary.totalSites} hint="Active units from live records" icon={Building2} tone="primary" />
        <StatCard label="Assigned Workforce" value={overallSummary.totalStaff} hint="Across all active sites" icon={Users} tone="info" />
        <StatCard label={`Present (${activeDate})`} value={overallSummary.presentToday} hint="Includes P & P/P duties" icon={UserCheck} tone="success" />
        <StatCard label={`${formatMonthLabel(activeMonth)} Duties`} value={overallSummary.monthDuty} hint="Cumulative normal + extra" icon={Clock} tone="warning" />
      </section>

      <section className="acs-card p-5 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Select a Site to Manage Attendance</h2>
            <p className="text-xs text-muted-foreground">
              Click any unit / site card to open its employee roll call, daily marking controls, and 1–31 monthly register sheet
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Global attendance date"
              type="date"
              value={activeDate}
              onChange={(e) =>
                updateSearch({
                  date: e.target.value,
                  month: e.target.value.slice(0, 7),
                })
              }
              className="h-9 w-40 text-xs"
            />
            <Input
              aria-label="Global attendance month"
              type="month"
              value={activeMonth}
              onChange={(e) => updateSearch({ month: e.target.value })}
              className="h-9 w-40 text-xs"
            />
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAllSites}>
              <Download className="size-4" />
              Export Month
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Add Record
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search sites"
            value={siteSearch}
            onChange={(e) => setSiteSearch(e.target.value)}
            placeholder="Search site / unit name..."
            className="pl-9"
          />
        </div>

        {filteredSiteSummaries.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <MapPin className="mx-auto mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No deployment sites available</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign a site when adding an employee in Recruitment or click &ldquo;Add Record&rdquo; above to start tracking attendance.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSiteSummaries.map((item) => (
              <button
                key={item.siteName}
                type="button"
                onClick={() => updateSearch({ site: item.siteName, tab: "mark" })}
                className="group flex flex-col justify-between gap-4 rounded-xl border bg-background p-4 text-left transition-all hover:border-primary/60 hover:bg-accent/30 hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-primary" />
                      <h3 className="font-semibold text-foreground">{item.siteName}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.staffCount} assigned employee{item.staffCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="info" className="shrink-0 tabular-nums">
                    {item.monthDuty} duties
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <Badge variant="success">{item.present} Present</Badge>
                  {item.doubleDuty > 0 && (
                    <Badge variant="info">{item.doubleDuty} P/P</Badge>
                  )}
                  {item.absent > 0 && (
                    <Badge variant="danger">{item.absent} Absent</Badge>
                  )}
                  <Badge variant="neutral">{item.unmarked} Unmarked</Badge>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-xs font-medium text-primary">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {activeDate} · {formatMonthLabel(activeMonth)}
                  </span>
                  <span className="inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                    Open Site
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <AttendanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={null}
        defaultDate={activeDate}
        availableSites={sites}
        onSave={upsertAttendance}
      />

      <AttendanceImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultSite={sites[0] ?? ""}
        defaultDate={activeDate}
        defaultMonth={activeMonth}
        onImport={upsertAttendanceBatch}
      />
    </div>
  );
}
