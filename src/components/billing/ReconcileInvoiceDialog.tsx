import { useState } from "react";
import { AlertTriangle, Landmark, Scissors } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { isInvoiceOverdue30Days } from "@/components/billing/InvoicePreviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcsStore } from "@/lib/acs-store";
import type {
  InvoiceDeductionCategory,
  InvoiceRecord,
  PaymentMode,
} from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";

export function ReconcileInvoiceDialog({
  invoice,
  onClose,
  onUpdated,
}: {
  invoice: InvoiceRecord | null;
  onClose: () => void;
  onUpdated?: (updated: InvoiceRecord) => void;
}) {
  const { addInvoiceDeduction, recordInvoiceReceipt } = useAcsStore();

  const [dedCat, setDedCat] = useState<InvoiceDeductionCategory>("TDS");
  const [dedAmt, setDedAmt] = useState("");
  const [dedNote, setDedNote] = useState("");

  const [recDate, setRecDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recAmt, setRecAmt] = useState("");
  const [recMode, setRecMode] = useState<PaymentMode>("BANK_TRANSFER");
  const [recRef, setRecRef] = useState("");
  const [recBank, setRecBank] = useState("AXIS BANK");
  const [recNote, setRecNote] = useState("");

  if (!invoice) return null;

  const totalAmount =
    invoice.totalInvoiceAmount && invoice.totalInvoiceAmount > 0
      ? invoice.totalInvoiceAmount
      : invoice.quantity * invoice.rate +
        Math.round((invoice.quantity * invoice.rate * invoice.taxRate) / 100);
  const totalDed = invoice.totalDeductions ?? 0;
  const totalRec = invoice.totalReceived ?? 0;
  const balance =
    invoice.balanceReceivable !== undefined
      ? invoice.balanceReceivable
      : Math.max(0, totalAmount - totalDed - totalRec);
  const overdue30 = isInvoiceOverdue30Days(invoice);

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(dedAmt);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid positive deduction amount.");
      return;
    }
    const updated = await addInvoiceDeduction(invoice.id, {
      category: dedCat,
      amount: amt,
      note: dedNote.trim(),
    });
    if (updated) {
      toast.success(`Recorded ${dedCat} deduction slip of ${formatINR(amt)}.`);
      setDedAmt("");
      setDedNote("");
      onUpdated?.(updated);
    }
  };

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(recAmt);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid positive payment receipt amount.");
      return;
    }
    const updated = await recordInvoiceReceipt(invoice.id, {
      receiptDate: recDate,
      amount: amt,
      paymentMode: recMode,
      referenceNo: recRef.trim(),
      bankName: recBank.trim(),
      note: recNote.trim(),
    });
    if (updated) {
      toast.success(`Recorded payment receipt of ${formatINR(amt)} (${recMode}).`);
      setRecAmt("");
      setRecRef("");
      setRecNote("");
      onUpdated?.(updated);
    }
  };

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Pre/Post-Payment Reconciliation — {invoice.invoiceNumber}</span>
            <StatusBadge status={invoice.paymentStage || invoice.status} />
          </DialogTitle>
          <DialogDescription>
            {invoice.clientName} · {invoice.site} · Billed {formatINR(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {overdue30 && (
            <div className="flex items-center gap-2 rounded-lg border border-warning bg-warning-soft p-3 text-xs text-foreground">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <span>
                Invoice exceeds 30 days overdue. Standard ACS terms attract{" "}
                <strong>{invoice.interestRatePct ?? 24}% p.a.</strong> delayed payment interest.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-3.5 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Total Billed</p>
              <p className="font-bold tabular-nums">{formatINR(totalAmount)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Deductions Slip</p>
              <p className="font-semibold tabular-nums text-danger">{formatINR(totalDed)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Received</p>
              <p className="font-semibold tabular-nums text-success">{formatINR(totalRec)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Balance Due</p>
              <p className="font-bold tabular-nums text-primary">{formatINR(balance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form onSubmit={(e) => void handleAddDeduction(e)} className="space-y-3 rounded-lg border p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Scissors className="size-3.5 text-danger" />
                <span>Add Client Deduction Slip</span>
              </p>
              <div className="space-y-1">
                <Label htmlFor="rec-ded-cat" className="text-xs">Deduction Category</Label>
                <Select value={dedCat} onValueChange={(v) => setDedCat(v as InvoiceDeductionCategory)}>
                  <SelectTrigger id="rec-ded-cat" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TDS">Income Tax TDS (2%)</SelectItem>
                    <SelectItem value="GST_TDS">GST-TDS (2%)</SelectItem>
                    <SelectItem value="LD_PENALTY">LD / Penalty</SelectItem>
                    <SelectItem value="SHORT_DUTY">Short Duty Adjustment</SelectItem>
                    <SelectItem value="OTHER">Other Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rec-ded-amt" className="text-xs">Deduction Amount (₹) *</Label>
                <Input id="rec-ded-amt" type="number" step="0.01" min={1} value={dedAmt} onChange={(e) => setDedAmt(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rec-ded-note" className="text-xs">Slip Note / Remark</Label>
                <Input id="rec-ded-note" value={dedNote} onChange={(e) => setDedNote(e.target.value)} className="h-8 text-xs" placeholder="e.g. 2% TDS u/s 194C" />
              </div>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                Record Deduction Slip
              </Button>
            </form>

            <form onSubmit={(e) => void handleAddReceipt(e)} className="space-y-3 rounded-lg border p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Landmark className="size-3.5 text-success" />
                <span>Record Post-Payment Receipt</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="rec-pay-dt" className="text-xs">Receipt Date</Label>
                  <Input id="rec-pay-dt" type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rec-pay-amt" className="text-xs">Received (₹) *</Label>
                  <Input id="rec-pay-amt" type="number" step="0.01" min={1} value={recAmt} onChange={(e) => setRecAmt(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="rec-pay-mode" className="text-xs">Payment Mode</Label>
                  <Select value={recMode} onValueChange={(v) => setRecMode(v as PaymentMode)}>
                    <SelectTrigger id="rec-pay-mode" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">NEFT / RTGS / IMPS</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rec-pay-ref" className="text-xs">UTR / Cheque No</Label>
                  <Input id="rec-pay-ref" value={recRef} onChange={(e) => setRecRef(e.target.value)} className="h-8 text-xs" placeholder="Reference ID" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="rec-pay-bank" className="text-xs">Bank Name</Label>
                  <Input id="rec-pay-bank" value={recBank} onChange={(e) => setRecBank(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rec-pay-note" className="text-xs">Note</Label>
                  <Input id="rec-pay-note" value={recNote} onChange={(e) => setRecNote(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Post Payment Receipt
              </Button>
            </form>
          </div>

          {((invoice.deductionsSlip?.length ?? 0) > 0 || (invoice.paymentReceipts?.length ?? 0) > 0) && (
            <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3 text-xs">
              <p className="font-semibold text-foreground">Reconciliation Trail</p>
              {(invoice.deductionsSlip ?? []).map((d, i) => (
                <div key={`ded-${i}`} className="flex items-center justify-between text-danger">
                  <span>
                    <Badge variant="danger" className="mr-1.5 text-[10px]">{d.category}</Badge>
                    {d.note || d.recordedAt}
                  </span>
                  <span className="font-mono">-{formatINR(d.amount)}</span>
                </div>
              ))}
              {(invoice.paymentReceipts ?? []).map((r, i) => (
                <div key={`rec-${i}`} className="flex items-center justify-between text-success">
                  <span>
                    <Badge variant="success" className="mr-1.5 text-[10px]">{r.paymentMode}</Badge>
                    {r.referenceNo ? `Ref ${r.referenceNo} · ` : ""}
                    {r.receiptDate}
                  </span>
                  <span className="font-mono">+{formatINR(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
