import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye, FileText, HeartHandshake, Landmark, Search, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { StatutoryDrawer } from "@/components/esi-pf/StatutoryDrawer";
import { ACS_LOCATIONS, PAYROLL_MONTHS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { StatutoryRecord } from "@/lib/acs-types";
import { downloadCsv, formatINR } from "@/lib/acs-utils";
import { buildEsicChallanRowsForCsv, downloadTextFile } from "@/lib/finance-utils";

export const Route = createFileRoute("/esi-pf")({
  head: () => ({
    meta: [
      { title: "ESI & PF Management — ACS Admin Panel" },
      { name: "description", content: "Manage employee Provident Fund (PF) and Employee State Insurance (ESI) registrations and monthly summaries." },
      { property: "og:title", content: "ESI & PF Management — ACS Admin Panel" },
      { property: "og:description", content: "Statutory ESI and PF employee compliance records for ACS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EsiPfPage,
});

function EsiPfPage() {
  const { data, fetchComplianceExport } = useAcsStore();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("All");
  const [exportMonthKey, setExportMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [locationFilter, setLocationFilter] = useState("All");
  const [selected, setSelected] = useState<StatutoryRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const siteOptions = useMemo(() => {
    const names = new Set<string>(ACS_LOCATIONS);
    data.sites.forEach((s) => s.siteName && names.add(s.siteName));
    data.statutory.forEach((r) => r.location && names.add(r.location));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data.sites, data.statutory]);

  const filtered = useMemo(
    () =>
      data.statutory.filter((r) => {
        const q = search.trim().toLowerCase();
        const matchesQ =
          !q ||
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          r.uanNumber.toLowerCase().includes(q);
        const matchesM = monthFilter === "All" || r.month === monthFilter;
        const matchesL = locationFilter === "All" || r.location === locationFilter;
        return matchesQ && matchesM && matchesL;
      }),
    [data.statutory, search, monthFilter, locationFilter],
  );

  const metrics = useMemo(() => {
    const pfRegistered = data.statutory.filter((r) => r.pfStatus === "Active").length;
    const esiRegistered = data.statutory.filter((r) => r.esiStatus === "Active").length;
    const pfSummary = filtered.reduce((sum, r) => sum + r.pfEmployeeShare + r.pfEmployerShare, 0);
    const esiSummary = filtered.reduce((sum, r) => sum + r.esiEmployeeShare + r.esiEmployerShare, 0);
    return { pfRegistered, esiRegistered, pfSummary, esiSummary };
  }, [data.statutory, filtered]);

  const handleExport = () => {
    downloadCsv(
      "acs-esi-pf-report.csv",
      ["Employee ID", "Employee Name", "UAN Number", "ESI Number", "Basic Salary", "PF Status", "ESI Status", "PF Total", "ESI Total"],
      filtered.map((r) => [
        r.employeeId,
        r.employeeName,
        r.uanNumber,
        r.esiNumber,
        r.basicSalary,
        r.pfStatus,
        r.esiStatus,
        r.pfEmployeeShare + r.pfEmployerShare,
        r.esiEmployeeShare + r.esiEmployerShare,
      ]),
    );
    toast.success("ESI & PF contribution report exported.");
  };

  const handleExportEpfEcr = async () => {
    setExporting(true);
    try {
      const res = await fetchComplianceExport({
        monthKey: exportMonthKey,
        siteName: locationFilter,
      });
      if (!res) return;
      downloadTextFile(`acs-epf-ecr-${exportMonthKey}.txt`, res.ecrText || "");
      toast.success(
        `Exported EPF ECR (${res.totals.epfMembers} members · ₹${res.totals.epfEmployeeTotal + res.totals.epfEmployerTotal}).`,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportEsicChallan = async () => {
    setExporting(true);
    try {
      const res = await fetchComplianceExport({
        monthKey: exportMonthKey,
        siteName: locationFilter,
      });
      if (!res) return;
      downloadCsv(
        `acs-esic-challan-${exportMonthKey}.csv`,
        [
          "IP Number",
          "IP Name",
          "No of Days",
          "Total Monthly Wages",
          "Employee Contribution (0.75%)",
          "Employer Contribution (3.25%)",
          "Reason Code",
        ],
        buildEsicChallanRowsForCsv(res.rows),
      );
      toast.success(`Exported ESIC Monthly Challan (${res.rows.length} rows).`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="PF Registered Employees" value={metrics.pfRegistered} hint="Verified UAN accounts" icon={ShieldCheck} tone="primary" />
        <StatCard label="ESI Registered Employees" value={metrics.esiRegistered} hint="Active IP coverage" icon={HeartHandshake} tone="info" />
        <StatCard label="Current Month PF Summary" value={formatINR(metrics.pfSummary)} hint="Employee + employer sample" icon={Landmark} tone="success" />
        <StatCard label="Current Month ESI Summary" value={formatINR(metrics.esiSummary)} hint="Employee + employer sample" icon={Wallet} tone="warning" />
      </section>

      <section className="acs-card p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, ID, UAN..." className="pl-9" />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Months</SelectItem>
                {PAYROLL_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Locations</SelectItem>
                {siteOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              aria-label="Compliance return month"
              type="month"
              value={exportMonthKey}
              onChange={(e) => setExportMonthKey(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExportEpfEcr()}>
              <FileText className="size-4" />
              Export EPF ECR (.txt)
            </Button>
            <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExportEsicChallan()}>
              <Download className="size-4" />
              Export ESIC Challan
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />Export Report
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Employee ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>UAN Number</TableHead>
                <TableHead>ESI Number</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>PF Status</TableHead>
                <TableHead>ESI Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-mono text-xs font-medium text-muted-foreground">{rec.employeeId}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{rec.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{rec.location}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{rec.uanNumber}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{rec.esiNumber}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatINR(rec.basicSalary)}</TableCell>
                  <TableCell><StatusBadge status={rec.pfStatus} /></TableCell>
                  <TableCell><StatusBadge status={rec.esiStatus} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelected(rec)}>
                      <Eye className="size-3.5" />Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <StatutoryDrawer record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}