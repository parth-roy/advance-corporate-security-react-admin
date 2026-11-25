import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AcsLogo } from "@/components/acs/AcsLogo";
import { StatusBadge } from "@/components/acs/StatusBadge";
import type { AcsSettings, InvoiceRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";

export function calcInvoiceTotals(inv: InvoiceRecord) {
  const subtotal = inv.quantity * inv.rate;
  const tax = Math.round((subtotal * inv.taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function buildInvoicePrintHtml(inv: InvoiceRecord, settings: AcsSettings): string {
  const { subtotal, tax, total } = calcInvoiceTotals(inv);
  return `
    <div class="header">
      <div>
        <div class="brand">${settings.companyName}</div>
        <div class="muted">${settings.companyAddress}</div>
        <div class="muted">GSTIN: ${settings.companyGstin} · ${settings.supportEmail} · ${settings.supportPhone}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">TAX INVOICE</div>
        <div class="muted">${inv.invoiceNumber}</div>
        <div class="muted">Status: ${inv.status}</div>
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <strong>Bill To:</strong><br/>
        ${inv.clientName}<br/>
        ${inv.clientAddress}<br/>
        GSTIN: ${inv.clientGstin}
      </div>
      <div class="box">
        <strong>Invoice Date:</strong> ${inv.invoiceDate}<br/>
        <strong>Due Date:</strong> ${inv.dueDate}<br/>
        <strong>Billing Period:</strong> ${inv.billingMonth}<br/>
        <strong>Payment Terms:</strong> ${inv.paymentTerms}
      </div>
    </div>
    <table>
      <thead><tr><th>Service Description</th><th>Qty</th><th>Rate</th><th>Tax (${inv.taxRate}%)</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>${inv.serviceType} — ${inv.serviceDescription}</td><td>${inv.quantity}</td><td>${formatINR(inv.rate)}</td><td>${formatINR(tax)}</td><td>${formatINR(subtotal)}</td></tr>
      </tbody>
    </table>
    <div class="summary"><span>Total Invoice Amount</span><span>${formatINR(total)}</span></div>
  `;
}

export function InvoicePreviewDialog({
  invoice,
  settings,
  onClose,
}: {
  invoice: InvoiceRecord | null;
  settings: AcsSettings;
  onClose: () => void;
}) {
  if (!invoice) return null;
  const { subtotal, tax, total } = calcInvoiceTotals(invoice);

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Invoice Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-start">
            <div className="space-y-1.5">
              <AcsLogo initials={settings.logoInitials} />
              <p className="max-w-sm text-xs text-muted-foreground">{settings.companyAddress}</p>
              <p className="text-xs text-muted-foreground">GSTIN: <span className="font-mono text-foreground">{settings.companyGstin}</span></p>
              <p className="text-xs text-muted-foreground">{settings.supportEmail} · {settings.supportPhone}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">Tax Invoice</p>
              <p className="font-mono text-sm font-bold text-foreground">{invoice.invoiceNumber}</p>
              <StatusBadge status={invoice.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border bg-background p-3.5 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">Client Details</p>
              <p className="text-sm font-semibold text-foreground">{invoice.clientName}</p>
              <p className="text-muted-foreground">{invoice.clientAddress}</p>
              <p className="text-muted-foreground">GSTIN: <span className="font-mono text-foreground">{invoice.clientGstin}</span></p>
            </div>
            <div className="space-y-1 rounded-lg border bg-background p-3.5 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</p>
              <p><span className="text-muted-foreground">Invoice Date:</span> <strong className="text-foreground">{invoice.invoiceDate}</strong></p>
              <p><span className="text-muted-foreground">Due Date:</span> <strong className="text-foreground">{invoice.dueDate}</strong></p>
              <p><span className="text-muted-foreground">Billing Period:</span> <strong className="text-foreground">{invoice.billingMonth}</strong></p>
              <p><span className="text-muted-foreground">Payment Terms:</span> <strong className="text-foreground">{invoice.paymentTerms}</strong></p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-12 border-b bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground">
              <div className="col-span-6">Service Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>
            <div className="grid grid-cols-12 px-3.5 py-3 text-sm">
              <div className="col-span-6">
                <p className="font-medium text-foreground">{invoice.serviceType}</p>
                <p className="text-xs text-muted-foreground">{invoice.serviceDescription} · {invoice.site}</p>
              </div>
              <div className="col-span-2 text-right tabular-nums">{invoice.quantity}</div>
              <div className="col-span-2 text-right tabular-nums">{formatINR(invoice.rate)}</div>
              <div className="col-span-2 text-right font-medium tabular-nums">{formatINR(subtotal)}</div>
            </div>
          </div>

          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST ({invoice.taxRate}%)</span><span className="tabular-nums">{formatINR(tax)}</span></div>
            <Separator />
            <div className="flex justify-between text-base font-bold text-foreground"><span>Total Amount</span><span className="tabular-nums">{formatINR(total)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={() => {
              printDocumentHtml(`Invoice - ${invoice.invoiceNumber}`, buildInvoicePrintHtml(invoice, settings));
              toast.success("Opened print / PDF dialog for invoice.");
            }}
          >
            <Download className="size-4" />Download Invoice PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}