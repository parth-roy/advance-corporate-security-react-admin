import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, Clock, Download, Pencil, Plus, Search, UserCheck, UserMinus, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { AttendanceFormDialog, BulkAttendanceDialog } from "@/components/attendance/AttendanceDialogs";
import { MonthlyCalendar } from "@/components/attendance/MonthlyCalendar";
import { ACS_LOCATIONS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { AttendanceRecord } from "@/lib/acs-types";
import { downloadCsv } from "@/lib/acs-utils";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — ACS Admin Panel" },
      { name: "description", content: "Daily shift attendance, bulk attendance marking, CSV export, and monthly attendance calendar for ACS." },
      { property: "og:title", content: "Attendance — ACS Admin Panel" },
      { property: "og:description", content: "Employee attendance management for Advance Corporate Security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { data, upsertAttendance, bulkUpdateAttendance } = useAcsStore();
  const [selectedDate, setSelectedDate] = useState("2026-11-25");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  const summary = useMemo(
    () => ({
      total: data.attendance.length,
      present: data.attendance.filter((a) => a.status === "Present").length,
      absent: data.attendance.filter((a) => a.status === "Absent").length,
      leave: data.attendance.filter((a) => a.status === "Leave").length,
      halfDay: data.attendance.filter((a) => a.status === "Half Day").length,
    }),
    [data.attendance],
  );

  const filtered = useMemo(
    () =>
      data.attendance.filter((a) => {
        const q = search.trim().toLowerCase();
        const matchesQ = !q || a.employeeName.toLowerCase().includes(q) || a.employeeId.toLowerCase().includes(q);
        const matchesLoc = locationFilter === "All" || a.location === locationFilter;
        const matchesSt = statusFilter === "All" || a.status === statusFilter;
        return matchesQ && matchesLoc && matchesSt;
      }),
    [data.attendance, search, locationFilter, statusFilter],
  );

  const handleExport = () => {
    downloadCsv(
      `acs-attendance-${selectedDate}.csv`,
      ["Employee ID", "Employee Name", "Designation", "Location", "Date", "Check-in", "Check-out", "Working Hours", "Status"],
      filtered.map((a) => [a.employeeId, a.employeeName, a.designation, a.location, selectedDate, a.checkIn, a.checkOut, a.workingHours, a.status]),
    );
    toast.success("Attendance CSV exported.");
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Employees" value={summary.total} icon={Users} tone="primary" />
        <StatCard label="Present" value={summary.present} icon={UserCheck} tone="success" />
        <StatCard label="Absent" value={summary.absent} icon={UserX} tone="danger" />
        <StatCard label="On Leave" value={summary.leave} icon={UserMinus} tone="warning" />
        <StatCard label="Half Day" value={summary.halfDay} icon={Clock} tone="info" />
      </section>

      <section className="acs-card p-5">
        <Tabs defaultValue="daily" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="mr-1.5 size-3.5" />Monthly Calendar</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4" />Export CSV</Button>
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><CheckSquare className="size-4" />Bulk Attendance</Button>
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" />Mark Attendance</Button>
            </div>
          </div>

          <TabsContent value="daily" className="space-y-4">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full md:w-44" />
              <div className="relative flex-1 md:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or ID..." className="pl-9" />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Sites</SelectItem>
                  {ACS_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="Leave">Leave</SelectItem>
                  <SelectItem value="Weekly Off">Weekly Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Location / Site</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs font-medium text-muted-foreground">{rec.employeeId}</TableCell>
                      <TableCell className="font-medium text-foreground">{rec.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground">{rec.designation}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">{rec.location}</TableCell>
                      <TableCell className="tabular-nums">{rec.checkIn}</TableCell>
                      <TableCell className="tabular-nums">{rec.checkOut}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{rec.workingHours}</TableCell>
                      <TableCell><StatusBadge status={rec.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" aria-label={`Edit ${rec.employeeName}`} onClick={() => { setEditing(rec); setFormOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <MonthlyCalendar records={data.attendance} />
          </TabsContent>
        </Tabs>
      </section>

      <AttendanceFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} defaultDate={selectedDate} onSave={upsertAttendance} />
      <BulkAttendanceDialog open={bulkOpen} onOpenChange={setBulkOpen} records={data.attendance} onApply={bulkUpdateAttendance} />
    </div>
  );
}