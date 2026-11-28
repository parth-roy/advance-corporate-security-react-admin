import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { BillFormDialog } from "@/components/billing/BillFormDialog";
import { BillingRulesView } from "@/components/billing/BillingRulesView";
import { GenerateSiteBillDialog } from "@/components/billing/GenerateSiteBillDialog";
import {
  buildInvoicePrintHtml,
  calcInvoiceTotals,
  InvoicePreviewDialog,
  isInvoiceOverdue30Days,
} from "@/components/billing/InvoicePreviewDialog";
import { ReconcileInvoiceDialog } from "@/components/billing/ReconcileInvoiceDialog";
import { PAYROLL_MONTHS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { InvoiceRecord } from "@/lib/acs-types";
import { downloadCsv, formatINR, printDocumentHtml } from "@/lib/acs-utils";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — ACS Admin Panel" },
      { name: "description", content: "Create client security invoices, generate site bills from attendance, track Pre/Post-Payment reconciliation, and export billing reports." },
      { property: "og:title", content: "Billing — ACS Admin Panel" },
      { property: "og:description", content: "Client invoicing, site billing rules, and payment reconciliation for Advance Corporate Security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { data, addInvoice, updateInvoice, markInvoicePaid } = useAcsStore();
  const [tab, setTab] = useState<"invoices" | "rules">("invoices");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRecord | null>(null);
  const [previewInv, setPreviewInv] = useState<InvoiceRecord | null>(null);
  const [reconcileInv, setReconcileInv] = useState<InvoiceRecord | null>(null);

  const metrics = useMemo(() => {
    const totalAmount = data.invoices.reduce((sum, inv) => sum + calcInvoiceTotals(inv).total, 0);
    const pending = data.invoices.filter((i) => i.status === "Pending").length;
    const overdue = data.invoices.filter((i) => i.status === "Overdue" || isInvoiceOverdue30Days(i)).length;
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
          inv.site.toLowerCase().includes(q) ||
          (inv.subUnit ?? "").toLowerCase().includes(q);
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
      ["Invoice Number", "Client", "Billing Month", "Site", "GST Regime", "Invoice Date", "Due Date", "Amount", "Received", "Balance", "Status"],
      filtered.map((inv) => [
        inv.invoiceNumber,
        inv.clientName,
        inv.billingMonth,
        inv.site,
        inv.gstMode || "STANDARD",
        inv.invoiceDate,
        inv.dueDate,
        calcInvoiceTotals(inv).total,
        inv.totalReceived ?? 0,
        inv.balanceReceivable ?? calcInvoiceTotals(inv).total,
        inv.paymentStage || inv.status,
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
        <StatCard label="Overdue (>30d / Flagged)" value={metrics.overdue} icon={AlertCircle} tone="danger" />
        <StatCard label="Total Billing Amount" value={formatINR(metrics.totalAmount)} icon={Wallet} tone="success" />
      </section>

      <section className="acs-card p-5 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "invoices" | "rules")} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="invoices">Invoices &amp; Reconciliation ({data.invoices.length})</TabsTrigger>
              <TabsTrigger value="rules">Site Billing Rules ({(data.billingRuleProfiles ?? []).length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="invoices" className="space-y-4">
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
                <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}><Calculator className="size-4" />Generate Site Bill</Button>
                <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" />Create New Bill</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Client / Organisation</TableHead>
                    <TableHead>Period &amp; Site</TableHead>
                    <TableHead>GST / Archetype</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Amount / Receivable</TableHead>
                    <TableHead>Payment Stage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => {
                    const tot = calcInvoiceTotals(inv).total;
                    const bal =
                      inv.balanceReceivable !== undefined
                        ? inv.balanceReceivable
                        : inv.status === "Paid"
                          ? 0
                          : tot;
                    const overdue30 = isInvoiceOverdue30Days(inv);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-medium text-foreground">
                          <div>{inv.invoiceNumber}</div>
                          {inv.subUnit && <div className="text-[10px] text-muted-foreground">Unit: {inv.subUnit}</div>}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{inv.clientName}</TableCell>
                        <TableCell className="text-xs">
                          <div className="text-foreground">{inv.billingMonth}</div>
                          <div className="max-w-[160px] truncate text-muted-foreground">{inv.site}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {inv.gstMode ? <Badge variant="neutral" className="text-[10px]">{inv.gstMode}</Badge> : <span>{inv.taxRate}% GST</span>}
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{inv.sacCode || "998533"}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          <div>Inv: {inv.invoiceDate}</div>
                          <div>Due: {inv.dueDate}</div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <div className="font-semibold text-foreground">{formatINR(tot)}</div>
                          {bal > 0 && bal < tot && (
                            <div className="text-[11px] text-primary">Due: {formatINR(bal)}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <StatusBadge status={inv.paymentStage || inv.status} />
                            {overdue30 && (
                              <Badge variant="danger" className="text-[10px]">&gt;30d 24% p.a.</Badge>
                            )}
                          </div>
                        </TableCell>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReconcileInv(inv)}
                            >
                              <Landmark className="size-3.5" />
                              Reconcile
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <BillingRulesView />
          </TabsContent>
        </Tabs>
      </section>

      <BillFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSave={handleSave} />
      <GenerateSiteBillDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <InvoicePreviewDialog invoice={previewInv} settings={data.settings} onClose={() => setPreviewInv(null)} />
      <ReconcileInvoiceDialog
        invoice={reconcileInv}
        onClose={() => setReconcileInv(null)}
        onUpdated={(u) => setReconcileInv(u)}
      />
    </div>
  );
}