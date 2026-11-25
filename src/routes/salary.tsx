import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Download, Eye, Pencil, Play, Search, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { EditSalaryDialog, SalaryDetailsDrawer } from "@/components/salary/SalaryOverlays";
import { ACS_LOCATIONS, PAYROLL_MONTHS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { SalaryRecord } from "@/lib/acs-types";
import { calculateNetSalary, downloadCsv, formatINR } from "@/lib/acs-utils";

export const Route = createFileRoute("/salary")({
  head: () => ({
    meta: [
      { title: "Salary Generation — ACS Admin Panel" },
      { name: "description", content: "Prepare, review, edit, and process monthly payroll for Advance Corporate Security staff." },
      { property: "og:title", content: "Salary Generation — ACS Admin Panel" },
      { property: "og:description", content: "Monthly salary processing interface for ACS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalaryPage,
});

function SalaryPage() {
  const { data, updateSalary, processSalary, processAllPendingSalaries } = useAcsStore();
  const [month, setMonth] = useState<string>(PAYROLL_MONTHS[0]);
  const [year, setYear] = useState("2026");
  const [location, setLocation] = useState("All");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<SalaryRecord | null>(null);
  const [editing, setEditing] = useState<SalaryRecord | null>(null);

  const filtered = useMemo(
    () =>
      data.salaries.filter((s) => {
        const q = search.trim().toLowerCase();
        const matchesQ = !q || s.employeeName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q);
        const matchesM = month === "All" || s.month === month;
        const matchesY = s.year === year;
        const matchesL = location === "All" || s.location === location;
        const matchesC = category === "All" || s.category === category;
        return matchesQ && matchesM && matchesY && matchesL && matchesC;
      }),
    [data.salaries, search, month, year, location, category],
  );

  const getDeductions = (s: SalaryRecord) => s.pfDeduction + s.esiDeduction + s.otherDeductions;
  const getNet = (s: SalaryRecord) =>
    calculateNetSalary({ basicSalary: s.basicSalary, allowances: s.allowances + s.otherEarnings, overtime: s.overtime, deductions: getDeductions(s) });

  const summary = useMemo(() => {
    const pending = filtered.filter((s) => s.status === "Pending").length;
    const processed = filtered.filter((s) => s.status === "Processed").length;
    const totalPayroll = filtered.reduce((sum, s) => sum + getNet(s), 0);
    return { total: filtered.length, pending, processed, totalPayroll };
  }, [filtered]);

  const handleGenerateAll = () => {
    const count = processAllPendingSalaries(month);
    if (count === 0) toast.info("All visible salary records are already processed.");
    else toast.success(`Generated and processed salary for ${count} employees.`);
  };

  const handleExport = () => {
    downloadCsv(
      `acs-payroll-${month.replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["Employee ID", "Employee Name", "Designation", "Basic", "Allowances", "Overtime", "Deductions", "Net Salary", "Status"],
      filtered.map((s) => [s.employeeId, s.employeeName, s.designation, s.basicSalary, s.allowances, s.overtime, getDeductions(s), getNet(s), s.status]),
    );
    toast.success("Payroll CSV exported.");
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={summary.total} icon={Users} tone="primary" />
        <StatCard label="Pending Salary" value={summary.pending} icon={Clock} tone="warning" />
        <StatCard label="Salary Processed" value={summary.processed} icon={CheckCircle2} tone="success" />
        <StatCard label="Total Payroll Amount" value={formatINR(summary.totalPayroll)} icon={Wallet} tone="info" />
      </section>

      <section className="acs-card p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue placeholder="Salary Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Months</SelectItem>
                {PAYROLL_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue placeholder="Location / Site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sites</SelectItem>
                {ACS_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Security Personnel">Security Personnel</SelectItem>
                <SelectItem value="Supervisory Staff">Supervisory Staff</SelectItem>
                <SelectItem value="Operations & Admin">Operations & Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4" />Export Payroll</Button>
            <Button size="sm" onClick={handleGenerateAll}><Play className="size-4" />Generate Salary</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Employee ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{rec.employeeId}</TableCell>
                  <TableCell className="font-medium text-foreground">{rec.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{rec.designation}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(rec.basicSalary)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(rec.allowances)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(rec.overtime)}</TableCell>
                  <TableCell className="tabular-nums text-danger">{formatINR(getDeductions(rec))}</TableCell>
                  <TableCell className="font-semibold tabular-nums text-foreground">{formatINR(getNet(rec))}</TableCell>
                  <TableCell><StatusBadge status={rec.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`View ${rec.employeeName}`} onClick={() => setViewing(rec)}><Eye className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${rec.employeeName}`} onClick={() => setEditing(rec)}><Pencil className="size-4" /></Button>
                      {rec.status === "Pending" && (
                        <Button size="sm" variant="outline" onClick={() => { processSalary(rec.id); toast.success(`Salary processed for ${rec.employeeName}.`); }}>
                          Process
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <SalaryDetailsDrawer record={viewing} onClose={() => setViewing(null)} onEdit={(r) => { setViewing(null); setEditing(r); }} onProcess={processSalary} />
      <EditSalaryDialog record={editing} onClose={() => setEditing(null)} onSave={updateSalary} />
    </div>
  );
}