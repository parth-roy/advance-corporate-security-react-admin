import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock, Download, Eye, FileText, Pencil, Plus, ReceiptText, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { BillFormDialog } from "@/components/billing/BillFormDialog";
import { buildInvoicePrintHtml, calcInvoiceTotals, InvoicePreviewDialog } from "@/components/billing/InvoicePreviewDialog";
import { PAYROLL_MONTHS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { InvoiceRecord } from "@/lib/acs-types";
import { downloadCsv, formatINR, printDocumentHtml } from "@/lib/acs-utils";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — ACS Admin Panel" },
      { name: "description", content: "Create client security invoices, track pending payments, download invoice PDFs, and export billing reports." },
      { property: "og:title", content: "Billing — ACS Admin Panel" },
      { property: "og:description", content: "Client invoicing and payment tracking for Advance Corporate Security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { data, addInvoice, updateInvoice, markInvoicePaid } = useAcsStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRecord | null>(null);
  const [previewInv, setPreviewInv] = useState<InvoiceRecord | null>(null);

  const metrics = useMemo(() => {
    const totalAmount = data.invoices.reduce((sum, inv) => sum + calcInvoiceTotals(inv).total, 0);
    const pending = data.invoices.filter((i) => i.status === "Pending").length;
    const overdue = data.invoices.filter((i) => i.status === "Overdue").length;
    const generated = data.invoices.length;
    return { totalBills: data.invoices.length, generated, pending, overdue, totalAmount };
  }, [data.invoices]);

  const filtered = useMemo(
    () =>
      data.invoices.filter((inv) => {
        const q = search.trim().toLowerCase();
        const matchesQ =
          !q ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          inv.site.toLowerCase().includes(q);
        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Unpaid" ? inv.status === "Pending" || inv.status === "Overdue" : inv.status === statusFilter);
        const matchesMonth = monthFilter === "All" || inv.billingMonth === monthFilter;
        return matchesQ && matchesStatus && matchesMonth;
      }),
    [data.invoices, search, statusFilter, monthFilter],
  );

  const handleSave = (payload: Omit<InvoiceRecord, "id">, editId?: string) => {
    if (editId) updateInvoice({ ...payload, id: editId });
    else addInvoice(payload);
  };

  const handleExport = () => {
    downloadCsv(
      "acs-billing-report.csv",
      ["Invoice Number", "Client", "Billing Month", "Site", "Service Type", "Invoice Date", "Due Date", "Amount", "Status"],
      filtered.map((inv) => [
        inv.invoiceNumber,
        inv.clientName,
        inv.billingMonth,
        inv.site,
        inv.serviceType,
        inv.invoiceDate,
        inv.dueDate,
        calcInvoiceTotals(inv).total,
        inv.status,
      ]),
    );
    toast.success("Billing report CSV exported.");
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Bills" value={metrics.totalBills} icon={ReceiptText} tone="primary" />
        <StatCard label="Generated Bills" value={metrics.generated} icon={FileText} tone="info" />
        <StatCard label="Pending Payments" value={metrics.pending} icon={Clock} tone="warning" />
        <StatCard label="Overdue Bills" value={metrics.overdue} icon={AlertCircle} tone="danger" />
        <StatCard label="Total Billing Amount" value={formatINR(metrics.totalAmount)} icon={Wallet} tone="success" />
      </section>

      <section className="acs-card p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, client, site..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Payments</SelectItem>
                <SelectItem value="Unpaid">Pending & Overdue</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Months</SelectItem>
                {PAYROLL_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4" />Export Report</Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" />Create New Bill</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Invoice Number</TableHead>
                <TableHead>Client / Organisation</TableHead>
                <TableHead>Billing Month</TableHead>
                <TableHead>Site / Location</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Invoice Amount</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-medium text-foreground">{inv.invoiceNumber}</TableCell>
                  <TableCell className="font-medium text-foreground">{inv.clientName}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{inv.billingMonth}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-muted-foreground">{inv.site}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-muted-foreground">{inv.serviceType}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{inv.invoiceDate}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{inv.dueDate}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatINR(calcInvoiceTotals(inv).total)}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label={`View ${inv.invoiceNumber}`} onClick={() => setPreviewInv(inv)}><Eye className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${inv.invoiceNumber}`} onClick={() => { setEditing(inv); setFormOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Download ${inv.invoiceNumber}`}
                        onClick={() => {
                          printDocumentHtml(`Invoice - ${inv.invoiceNumber}`, buildInvoicePrintHtml(inv, data.settings));
                          toast.success(`Prepared PDF for ${inv.invoiceNumber}.`);
                        }}
                      >
                        <Download className="size-4" />
                      </Button>
                      {inv.status !== "Paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            markInvoicePaid(inv.id);
                            toast.success(`${inv.invoiceNumber} marked as Paid.`);
                          }}
                        >
                          <CheckCircle2 className="size-3.5 text-success" />Mark Paid
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

      <BillFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSave={handleSave} />
      <InvoicePreviewDialog invoice={previewInv} settings={data.settings} onClose={() => setPreviewInv(null)} />
    </div>
  );
}