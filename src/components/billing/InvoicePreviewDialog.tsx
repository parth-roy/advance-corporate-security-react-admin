import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AcsLogo } from "@/components/acs/AcsLogo";
import { StatusBadge } from "@/components/acs/StatusBadge";
import type { AcsSettings, InvoiceRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";
import { numberToIndianCurrencyWords } from "@/lib/finance-utils";

export function calcInvoiceTotals(inv: InvoiceRecord) {
  if (typeof inv.totalInvoiceAmount === "number" && inv.totalInvoiceAmount > 0) {
    const subtotal = inv.taxableSubtotal ?? inv.wagesSubtotal ?? inv.quantity * inv.rate;
    const tax =
      (inv.cgstAmount ?? 0) + (inv.sgstAmount ?? 0) + (inv.igstAmount ?? 0);
    return { subtotal, tax, total: inv.totalInvoiceAmount };
  }
  const subtotal = inv.quantity * inv.rate;
  const tax = Math.round((subtotal * inv.taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function isInvoiceOverdue30Days(inv: InvoiceRecord, todayStr = new Date().toISOString().slice(0, 10)): boolean {
  if (inv.status === "Paid" || inv.paymentStage === "SETTLED") return false;
  if (!inv.invoiceDate || !/^\d{4}-\d{2}-\d{2}$/.test(inv.invoiceDate)) return false;
  const invTime = Date.parse(`${inv.invoiceDate}T00:00:00Z`);
  const nowTime = Date.parse(`${todayStr}T00:00:00Z`);
  if (!Number.isFinite(invTime) || !Number.isFinite(nowTime)) return false;
  return (nowTime - invTime) / (1000 * 60 * 60 * 24) > 30;
}

export function buildInvoicePrintHtml(inv: InvoiceRecord, settings: AcsSettings): string {
  const { subtotal, tax, total } = calcInvoiceTotals(inv);
  const words = inv.amountInWords || numberToIndianCurrencyWords(total);
  const lineRows =
    inv.lineItems && inv.lineItems.length > 0
      ? inv.lineItems
          .map(
            (l, idx) => `
          <tr>
            <td>${idx + 1}. ${l.label}${l.otHours ? ` (+${l.otHours}h OT)` : ""}</td>
            <td>${inv.sacCode || "998533"}</td>
            <td>${l.totalDays}</td>
            <td>${formatINR(l.inclusiveRate || l.effectiveBaseRate || l.baseRate)}</td>
            <td style="text-align:right">${formatINR(l.lineAmount)}</td>
          </tr>`,
          )
          .join("")
      : `<tr>
          <td>${inv.serviceType} — ${inv.serviceDescription}</td>
          <td>${inv.sacCode || "998533"}</td>
          <td>${inv.quantity}</td>
          <td>${formatINR(inv.rate)}</td>
          <td style="text-align:right">${formatINR(inv.quantity * inv.rate)}</td>
        </tr>`;

  const taxRows: string[] = [];
  if ((inv.statutoryTotal ?? 0) > 0 && inv.archetype === "MONTHLY_POOL_STATUTORY") {
    taxRows.push(`<tr><td colspan="4">Statutory Contributions (EPF/EDLI/Admin ${formatINR(inv.epfTotal ?? 0)} + ESI ${formatINR(inv.esiTotal ?? 0)}${(inv.bonusTotal ?? 0) > 0 ? ` + Bonus ${formatINR(inv.bonusTotal ?? 0)}` : ""})</td><td style="text-align:right">${formatINR(inv.statutoryTotal ?? 0)}</td></tr>`);
  }
  if ((inv.govtDeductionAmount ?? 0) > 0) {
    taxRows.push(`<tr><td colspan="4">Less Govt. Deduction (${inv.govtDeductionPct ?? 0.02}%)</td><td style="text-align:right">-${formatINR(inv.govtDeductionAmount ?? 0)}</td></tr>`);
  }
  if ((inv.serviceChargeAmount ?? 0) > 0) {
    taxRows.push(`<tr><td colspan="4">Service Charge (${inv.serviceChargePct ?? 0}%)</td><td style="text-align:right">${formatINR(inv.serviceChargeAmount ?? 0)}</td></tr>`);
  }
  if (inv.gstMode === "RCM") {
    taxRows.push(`<tr><td colspan="4">GST under Reverse Charge Mechanism (Payable by Recipient @ 18%)</td><td style="text-align:right">₹0</td></tr>`);
  } else if (inv.gstMode === "NON_GST") {
    taxRows.push(`<tr><td colspan="4">Exempt / Non-GST Supply</td><td style="text-align:right">₹0</td></tr>`);
  } else if ((inv.igstAmount ?? 0) > 0) {
    taxRows.push(`<tr><td colspan="4">IGST (${inv.igstRate ?? 18}%)</td><td style="text-align:right">${formatINR(inv.igstAmount ?? 0)}</td></tr>`);
  } else if ((inv.cgstAmount ?? 0) > 0 || (inv.sgstAmount ?? 0) > 0) {
    taxRows.push(`<tr><td colspan="4">CGST (${inv.cgstRate ?? 9}%)</td><td style="text-align:right">${formatINR(inv.cgstAmount ?? 0)}</td></tr>`);
    taxRows.push(`<tr><td colspan="4">SGST (${inv.sgstRate ?? 9}%)</td><td style="text-align:right">${formatINR(inv.sgstAmount ?? 0)}</td></tr>`);
  } else {
    taxRows.push(`<tr><td colspan="4">GST (${inv.taxRate}%)</td><td style="text-align:right">${formatINR(tax)}</td></tr>`);
  }
  if ((inv.cessAmount ?? 0) > 0) {
    taxRows.push(`<tr><td colspan="4">Labour Welfare / Govt Cess (${inv.cessPct ?? 1}% on Gross + GST)</td><td style="text-align:right">${formatINR(inv.cessAmount ?? 0)}</td></tr>`);
  }

  return `
    <div class="header">
      <div>
        <div class="brand">${settings.companyName || "ADVANCE CORPORATE SECURITY"}</div>
        <div class="muted">${settings.companyAddress || "29/23/A GHOSHPARA ROAD, BARRACKPORE, KOLKATA 700120."}</div>
        <div class="muted">GSTIN: ${settings.companyGstin || "19AJKPR7582B1ZR"} · MSME Udyam: UDYAM-WB-14-0002254</div>
        <div class="muted">${settings.supportEmail} · ${settings.supportPhone}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">TAX INVOICE</div>
        <div class="muted">${inv.invoiceNumber}</div>
        <div class="muted">Stage: ${inv.paymentStage || inv.status}</div>
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <strong>Bill To (${inv.site}):</strong><br/>
        ${inv.clientName}<br/>
        ${inv.clientAddress}<br/>
        GSTIN: ${inv.clientGstin || "—"} ${inv.stateCode ? `· State Code: ${inv.stateCode}` : ""}
        ${inv.vendorCode ? `<br/>Vendor Code: ${inv.vendorCode}` : ""}
      </div>
      <div class="box">
        <strong>Invoice Date:</strong> ${inv.invoiceDate}<br/>
        <strong>Due Date:</strong> ${inv.dueDate}<br/>
        <strong>Billing Period:</strong> ${inv.periodLabel || inv.billingMonth}<br/>
        <strong>Payment Terms:</strong> ${inv.paymentTerms}
        ${inv.contractRef ? `<br/><strong>Ref / WO:</strong> ${inv.contractRef}` : ""}
      </div>
    </div>
    <table>
      <thead><tr><th>Service Description</th><th>SAC</th><th>Qty / Days</th><th>Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${lineRows}
        ${taxRows.join("")}
        <tr><th colspan="4">Taxable / Net Subtotal</th><th style="text-align:right">${formatINR(subtotal)}</th></tr>
      </tbody>
    </table>
    <div class="summary"><span>Total Invoice Amount</span><span>${formatINR(total)}</span></div>
    <div class="box" style="margin-top:8px; font-size:12px;">
      <strong>Amount in Words:</strong> ${words}<br/>
      <strong>Bank Details:</strong> ADVANCE CORPORATE SECURITY · Axis Bank, Barrackpore · A/c: 436010200019707 · IFSC: UTIB0000436 · MICR: 700211030<br/>
      <strong>Terms:</strong> Any deduction to be intimated via slip. Delay beyond 30 days attracts ${inv.interestRatePct ?? 24}% p.a. interest.
      ${inv.includeFactoryActNote ? "<br/><em>Note: Statutory Compliance will claim in future as per Factory Act (Bonus, CL, PL and etc.).</em>" : ""}
    </div>
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
  const words = invoice.amountInWords || numberToIndianCurrencyWords(total);
  const overdue30 = isInvoiceOverdue30Days(invoice);

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Invoice Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-start">
            <div className="space-y-1">
              <AcsLogo initials={settings.logoInitials} />
              <p className="max-w-md text-xs text-muted-foreground">{settings.companyAddress}</p>
              <p className="text-xs text-muted-foreground">
                GSTIN: <span className="font-mono text-foreground">{settings.companyGstin}</span> · MSME:{" "}
                <span className="font-mono text-foreground">UDYAM-WB-14-0002254</span>
              </p>
              <p className="text-xs text-muted-foreground">{settings.supportEmail} · {settings.supportPhone}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">Tax Invoice</p>
              <p className="font-mono text-sm font-bold text-foreground">{invoice.invoiceNumber}</p>
              <div className="flex flex-wrap gap-1 sm:justify-end">
                <StatusBadge status={invoice.paymentStage || invoice.status} />
                {invoice.gstMode && <Badge variant="neutral" className="text-[10px]">{invoice.gstMode}</Badge>}
                {overdue30 && <Badge variant="danger" className="text-[10px]">&gt;30d ({invoice.interestRatePct ?? 24}% p.a.)</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border bg-background p-3.5 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">Client Details ({invoice.site})</p>
              <p className="text-sm font-semibold text-foreground">{invoice.clientName}</p>
              <p className="text-muted-foreground">{invoice.clientAddress}</p>
              <p className="text-muted-foreground">
                GSTIN: <span className="font-mono text-foreground">{invoice.clientGstin || "—"}</span>
                {invoice.stateCode ? ` · State ${invoice.stateCode}` : ""}
              </p>
            </div>
            <div className="space-y-1 rounded-lg border bg-background p-3.5 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</p>
              <p><span className="text-muted-foreground">Invoice Date:</span> <strong className="text-foreground">{invoice.invoiceDate}</strong></p>
              <p><span className="text-muted-foreground">Due Date:</span> <strong className="text-foreground">{invoice.dueDate}</strong></p>
              <p><span className="text-muted-foreground">Billing Period:</span> <strong className="text-foreground">{invoice.periodLabel || invoice.billingMonth}</strong></p>
              <p><span className="text-muted-foreground">SAC / Terms:</span> <strong className="text-foreground">{invoice.sacCode || "998533"} · {invoice.paymentTerms}</strong></p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-12 border-b bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground">
              <div className="col-span-6">Service Description</div>
              <div className="col-span-2 text-right">Qty / Days</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            {invoice.lineItems && invoice.lineItems.length > 0 ? (
              invoice.lineItems.map((line, i) => (
                <div key={`${line.label}-${i}`} className="grid grid-cols-12 border-b px-3.5 py-2.5 text-sm last:border-b-0">
                  <div className="col-span-6">
                    <p className="font-medium text-foreground">{line.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Base {formatINR(line.effectiveBaseRate || line.baseRate)}
                      {line.inclusiveRate > line.effectiveBaseRate ? ` → Incl. ${formatINR(line.inclusiveRate)}` : ""}
                      {line.otHours > 0 ? ` · OT ${line.otHours}h` : ""}
                    </p>
                  </div>
                  <div className="col-span-2 text-right tabular-nums">{line.totalDays}</div>
                  <div className="col-span-2 text-right tabular-nums">{formatINR(line.inclusiveRate || line.baseRate)}</div>
                  <div className="col-span-2 text-right font-medium tabular-nums">{formatINR(line.lineAmount)}</div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-12 px-3.5 py-3 text-sm">
                <div className="col-span-6">
                  <p className="font-medium text-foreground">{invoice.serviceType}</p>
                  <p className="text-xs text-muted-foreground">{invoice.serviceDescription} · {invoice.site}</p>
                </div>
                <div className="col-span-2 text-right tabular-nums">{invoice.quantity}</div>
                <div className="col-span-2 text-right tabular-nums">{formatINR(invoice.rate)}</div>
                <div className="col-span-2 text-right font-medium tabular-nums">{formatINR(subtotal)}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Bank &amp; Statutory Compliance</p>
              <p className="text-muted-foreground">Axis Bank, Barrackpore · A/c 436010200019707 · IFSC UTIB0000436</p>
              <p className="text-muted-foreground">Words: <strong className="text-foreground">{words}</strong></p>
              {invoice.includeFactoryActNote && (
                <p className="text-info">Statutory Compliance will claim in future as per Factory Act (Bonus, CL, PL and etc.).</p>
              )}
            </div>

            <div className="space-y-1.5 text-sm">
              {(invoice.statutoryTotal ?? 0) > 0 && invoice.archetype === "MONTHLY_POOL_STATUTORY" && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">EPF / ESI Statutory Pool</span><span className="tabular-nums">{formatINR(invoice.statutoryTotal ?? 0)}</span></div>
              )}
              {(invoice.govtDeductionAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-danger"><span>Govt Deduction ({invoice.govtDeductionPct ?? 0.02}%)</span><span className="tabular-nums">-{formatINR(invoice.govtDeductionAmount ?? 0)}</span></div>
              )}
              {(invoice.serviceChargeAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Service Charge ({invoice.serviceChargePct}%)</span><span className="tabular-nums">{formatINR(invoice.serviceChargeAmount ?? 0)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Subtotal</span><span className="tabular-nums">{formatINR(subtotal)}</span></div>
              {(invoice.cgstAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">CGST ({invoice.cgstRate}%) + SGST ({invoice.sgstRate}%)</span><span className="tabular-nums">{formatINR((invoice.cgstAmount ?? 0) + (invoice.sgstAmount ?? 0))}</span></div>
              )}
              {(invoice.igstAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">IGST ({invoice.igstRate}%)</span><span className="tabular-nums">{formatINR(invoice.igstAmount ?? 0)}</span></div>
              )}
              {invoice.gstMode === "RCM" && (
                <div className="flex justify-between text-xs text-muted-foreground"><span>GST (Reverse Charge)</span><span>₹0 (Client RCM)</span></div>
              )}
              {!invoice.gstMode && (
                <div className="flex justify-between"><span className="text-muted-foreground">GST ({invoice.taxRate}%)</span><span className="tabular-nums">{formatINR(tax)}</span></div>
              )}
              {(invoice.cessAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Govt Cess ({invoice.cessPct}%)</span><span className="tabular-nums">{formatINR(invoice.cessAmount ?? 0)}</span></div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold text-foreground"><span>Total Amount</span><span className="tabular-nums">{formatINR(total)}</span></div>
              {((invoice.totalDeductions ?? 0) > 0 || (invoice.totalReceived ?? 0) > 0) && (
                <div className="flex justify-between text-xs text-primary">
                  <span>Balance Receivable (Received {formatINR(invoice.totalReceived ?? 0)} · Slip {formatINR(invoice.totalDeductions ?? 0)})</span>
                  <span className="font-semibold tabular-nums">{formatINR(invoice.balanceReceivable ?? 0)}</span>
                </div>
              )}
            </div>
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