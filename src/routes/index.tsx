import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck2, Clock, FileSpreadsheet, ReceiptText, UserCheck, UserPlus, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { QuickEmployeeDialog } from "@/components/dashboard/QuickEmployeeDialog";
import { useAcsStore } from "@/lib/acs-store";
import { deriveDynamicSites } from "@/lib/attendance-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ACS Admin Panel" },
      { name: "description", content: "Executive overview for Advance Corporate Security operations, attendance, recruitment, payroll, and billing." },
      { property: "og:title", content: "Dashboard — ACS Admin Panel" },
      { property: "og:description", content: "Executive overview for Advance Corporate Security operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useAcsStore();
  const [empDialogOpen, setEmpDialogOpen] = useState(false);

  const activeSitesCount = deriveDynamicSites(data).length;
  const activeDirectoryEmployees = data.employees.filter((e) => e.status === "ACTIVE").length;
  const totalEmployees = data.employees.length > 0 ? activeDirectoryEmployees : data.attendance.length;
  const activeEmployees =
    data.employees.length > 0
      ? data.employees.filter((e) => e.status === "ACTIVE" || e.status === "ON_HOLD").length
      : data.attendance.filter((a) => a.status !== "Absent").length;
  const presentCount = data.attendance.filter((a) => a.status === "Present").length;
  const absentCount = data.attendance.filter((a) => a.status === "Absent").length;
  const onLeaveCount = data.attendance.filter((a) => a.status === "Leave").length;
  const halfDayCount = data.attendance.filter((a) => a.status === "Half Day").length;
  const attendanceDenominator = data.attendance.length;
  const attendanceRate =
    attendanceDenominator > 0 ? Math.round(((presentCount + halfDayCount) / attendanceDenominator) * 100) : 0;

  const activeRecruitment = data.candidates.filter((c) => c.status === "New" || c.status === "Shortlisted").length;
  const pendingSalaries = data.salaries.filter((s) => s.status === "Pending").length;
  const pendingBills = data.invoices.filter((i) => i.status === "Pending" || i.status === "Overdue").length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Employees"
          value={totalEmployees}
          hint={`Across ${activeSitesCount} active client site${activeSitesCount === 1 ? "" : "s"}`}
          icon={Users}
          tone="primary"
        />
        <StatCard label="Active Employees" value={activeEmployees} hint="On duty or scheduled shifts" icon={UserCheck} tone="success" />
        <StatCard label="Today's Attendance" value={`${attendanceRate}%`} hint={`${presentCount} present · ${halfDayCount} half day`} icon={CalendarCheck2} tone="info" />
        <StatCard label="Active Recruitment" value={activeRecruitment} hint={`${data.candidates.length} total applicants`} icon={UserPlus} tone="info" />
        <StatCard label="Pending Salary Processing" value={pendingSalaries} hint={data.settings.defaultMonth} icon={Wallet} tone="warning" />
        <StatCard label="Pending Bills" value={pendingBills} hint="Awaiting client settlement" icon={ReceiptText} tone="danger" />
      </section>

      <section className="acs-card p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          <span className="text-xs text-muted-foreground">Core operational workflows</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild size="sm">
            <Link to="/recruitment" search={{ mode: "new" }}><UserPlus className="size-4" />Add Employee</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEmpDialogOpen(true)}>
            <Users className="size-4" />Quick Assign
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/attendance"><CalendarCheck2 className="size-4" />Mark Attendance</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/salary"><FileSpreadsheet className="size-4" />Generate Salary</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/billing"><ReceiptText className="size-4" />Create Bill</Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="acs-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Attendance Overview</h2>
              <p className="text-xs text-muted-foreground">Present, absent, and on-leave breakdown</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-accent">
              <Link to="/attendance">View All</Link>
            </Button>
          </div>
          <AttendanceChart present={presentCount} absent={absentCount} onLeave={onLeaveCount} halfDay={halfDayCount} />
        </section>

        <section className="acs-card flex flex-col p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Recruitment</h2>
              <p className="text-xs text-muted-foreground">Latest security personnel applications</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-brand-accent">
              <Link to="/recruitment">Manage</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="acs-table-header hover:bg-transparent">
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.candidates.slice(0, 5).map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium text-foreground">{candidate.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{candidate.position}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">{candidate.location}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{candidate.applicationDate}</TableCell>
                    <TableCell><StatusBadge status={candidate.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <section className="acs-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Activities</h2>
            <p className="text-xs text-muted-foreground">Latest administrative actions across departments</p>
          </div>
        </div>
        <ol className="divide-y divide-border">
          {data.activities.slice(0, 6).map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">{item.module}</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" />{item.timestamp}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <QuickEmployeeDialog open={empDialogOpen} onOpenChange={setEmpDialogOpen} />
    </div>
  );
}
