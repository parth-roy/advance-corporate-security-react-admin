import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Download, Eye, FileText, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { buildPayslipPrintHtml, PayslipPreviewDialog } from "@/components/payslips/PayslipPreviewDialog";
import { PAYROLL_MONTHS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { PayslipRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";

export const Route = createFileRoute("/payslips")({
  head: () => ({
    meta: [
      { title: "Payslips — ACS Admin Panel" },
      { name: "description", content: "Preview, download PDF, and regenerate employee salary payslips for Advance Corporate Security." },
      { property: "og:title", content: "Payslips — ACS Admin Panel" },
      { property: "og:description", content: "Employee salary payslip directory and document preview for ACS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayslipsPage,
});

function PayslipsPage() {
  const { data, regeneratePayslip } = useAcsStore();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("All");
  const [previewSlip, setPreviewSlip] = useState<PayslipRecord | null>(null);

  const summary = useMemo(
    () => ({
      total: data.payslips.length,
      generatedThisMonth: data.payslips.filter((p) => p.status === "Generated" && p.salaryMonth === data.settings.defaultMonth).length,
      pending: data.payslips.filter((p) => p.status === "Pending").length,
    }),
    [data.payslips, data.settings.defaultMonth],
  );

  const filtered = useMemo(
    () =>
      data.payslips.filter((p) => {
        const q = search.trim().toLowerCase();
        const matchesQ =
          !q ||
          p.employeeName.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.payslipId.toLowerCase().includes(q);
        const matchesM = monthFilter === "All" || p.salaryMonth === monthFilter;
        return matchesQ && matchesM;
      }),
    [data.payslips, search, monthFilter],
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Payslips" value={summary.total} icon={FileText} tone="primary" />
        <StatCard label="Generated This Month" value={summary.generatedThisMonth} hint={data.settings.defaultMonth} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending Payslips" value={summary.pending} icon={Clock} tone="warning" />
      </section>

      <section className="acs-card p-5 space-y-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, ID, payslip ID..." className="pl-9" />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Months</SelectItem>
              {PAYROLL_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Payslip ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Salary Month</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((slip) => {
                const gross = slip.basicSalary + slip.allowances + slip.overtime + slip.otherEarnings;
                const net = Math.max(0, gross - (slip.pfDeduction + slip.esiDeduction + slip.otherDeductions));
                return (
                  <TableRow key={slip.id}>
                    <TableCell className="font-mono text-xs font-medium text-foreground">{slip.payslipId}</TableCell>
                    <TableCell className="font-medium text-foreground">{slip.employeeName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{slip.employeeId}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{slip.salaryMonth}</TableCell>
                    <TableCell className="tabular-nums">{formatINR(slip.basicSalary)}</TableCell>
                    <TableCell className="tabular-nums">{formatINR(gross)}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatINR(net)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{slip.generatedDate}</TableCell>
                    <TableCell><StatusBadge status={slip.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Preview ${slip.payslipId}`} onClick={() => setPreviewSlip(slip)}><Eye className="size-4" /></Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Download ${slip.payslipId}`}
                          onClick={() => {
                            printDocumentHtml(`Payslip - ${slip.payslipId}`, buildPayslipPrintHtml(slip, data.settings));
                            toast.success(`Prepared PDF for ${slip.payslipId}.`);
                          }}
                        >
                          <Download className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Regenerate ${slip.payslipId}`}
                          onClick={() => {
                            regeneratePayslip(slip.id);
                            toast.success(`Regenerated ${slip.payslipId}.`);
                          }}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <PayslipPreviewDialog payslip={previewSlip} settings={data.settings} onClose={() => setPreviewSlip(null)} />
    </div>
  );
}