import { useEffect, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { useAcsStore } from "@/lib/acs-store";
import type {
  PaymentMode,
  SalaryLineItemRecord,
  SalaryRecord,
  VoucherPurposeType,
  VoucherRecord,
} from "@/lib/acs-types";
import { calculateNetSalary, printDocumentHtml } from "@/lib/acs-utils";
import { buildVoucherPrintHtml, numberToIndianCurrencyWords } from "@/lib/finance-utils";

const PURPOSE_OPTIONS: { value: VoucherPurposeType; label: string }[] = [
  { value: "SALARY_PAYOUT", label: "Salary Payout" },
  { value: "HOLD_RELEASE", label: "Hold / Cheque Hold Release" },
  { value: "ADVANCE", label: "Advance to Staff" },
  { value: "ADJUSTMENT", label: "Adjustment / Arrear" },
  { value: "EXPENSE", label: "Site / Office Expense" },
];

const DEBIT_HEADS = [
  "Salary to Staff",
  "Advance to Staff",
  "Uniform Expense",
  "Site Expense",
  "Bonus & Statutory",
  "Office / Conveyance Expense",
];

export function IssueVoucherDialog({
  open,
  onOpenChange,
  initialSalary = null,
  initialLineItem = null,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSalary?: SalaryRecord | null;
  initialLineItem?: SalaryLineItemRecord | null;
  onIssued?: (voucher: VoucherRecord) => void;
}) {
  const { data, previewNextVoucherNo, createVoucher } = useAcsStore();
  const [nextNo, setNextNo] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [debitHead, setDebitHead] = useState("Salary to Staff");
  const [purposeType, setPurposeType] = useState<VoucherPurposeType>("SALARY_PAYOUT");
  const [payeeName, setPayeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [onAccountOf, setOnAccountOf] = useState("");
  const [amount, setAmount] = useState("");
  const [particulars, setParticulars] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankAccount, setBankAccount] = useState("436010200019707");
  const [ifsc, setIfsc] = useState("UTIB0000436");
  const [bankName, setBankName] = useState("AXIS BANK");
  const [utrNumber, setUtrNumber] = useState("");
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void previewNextVoucherNo().then((num) => {
      if (active) setNextNo(String(num));
    });
    const today = new Date().toISOString().slice(0, 10);
    setDate(today);
    setChequeDate(today);

    if (initialSalary) {
      const net = calculateNetSalary({
        basicSalary: initialSalary.basicSalary,
        allowances: initialSalary.allowances + initialSalary.otherEarnings,
        overtime: initialSalary.overtime,
        deductions:
          initialSalary.pfDeduction + initialSalary.esiDeduction + initialSalary.otherDeductions,
      });
      const isHold =
        initialSalary.payoutStatus === "HOLD" ||
        initialSalary.payoutStatus === "CHQ_HOLD" ||
        initialSalary.status === "On Hold";
      setDebitHead("Salary to Staff");
      setPurposeType(isHold ? "HOLD_RELEASE" : "SALARY_PAYOUT");
      setPayeeName(initialSalary.employeeName);
      setEmployeeId(initialSalary.employeeId);
      setOnAccountOf(initialSalary.location);
      setAmount(String(net));
      setParticulars(
        `Being the Amount paid ${initialSalary.employeeName} work at ${initialSalary.location} salary for the month of ${initialSalary.month}${isHold ? " (Hold Release)" : ""}`,
      );
      setReceivedBy(initialSalary.employeeName);
      setPaymentMode(initialSalary.payoutStatus === "CHQ_HOLD" ? "CHEQUE" : "CASH");
    } else if (initialLineItem) {
      const isHold =
        initialLineItem.payoutStatus === "HOLD" ||
        initialLineItem.payoutStatus === "CHQ_HOLD";
      setDebitHead("Salary to Staff");
      setPurposeType(isHold ? "HOLD_RELEASE" : "SALARY_PAYOUT");
      setPayeeName(initialLineItem.employeeName);
      setEmployeeId(initialLineItem.employeeId);
      setOnAccountOf(initialLineItem.siteName);
      const rem = Math.max(0, initialLineItem.netPay - (initialLineItem.actualPaidAmount || 0));
      setAmount(String(rem || initialLineItem.netPay));
      setParticulars(
        `Being the Amount paid ${initialLineItem.employeeName} work at ${initialLineItem.siteName} salary for the month of ${initialLineItem.monthLabel}${isHold ? " (Hold Release)" : ""}`,
      );
      setReceivedBy(initialLineItem.employeeName);
      setPaymentMode(
        initialLineItem.payoutStatus === "CHQ_HOLD"
          ? "CHEQUE"
          : initialLineItem.paymentMode || "CASH",
      );
    } else {
      setDebitHead("Salary to Staff");
      setPurposeType("SALARY_PAYOUT");
      setPayeeName("");
      setEmployeeId("");
      setOnAccountOf("");
      setAmount("");
      setParticulars("");
      setReceivedBy("");
      setPaymentMode("CASH");
      setChequeNo("");
      setUtrNumber("");
      setUpiTransactionId("");
      setUpiId("");
    }
    return () => {
      active = false;
    };
  }, [open, initialSalary, initialLineItem, previewNextVoucherNo]);

  const numericAmount = Math.max(0, Number(amount) || 0);
  const amountInWords = numberToIndianCurrencyWords(numericAmount);

  const handleSubmit = async (e: React.FormEvent, shouldPrint = false) => {
    e.preventDefault();
    if (!payeeName.trim() || !particulars.trim() || numericAmount <= 0) {
      toast.error("Payee Name, Particulars, and positive Amount are required.");
      return;
    }
    if (paymentMode === "CHEQUE" && !chequeNo.trim()) {
      toast.error("Enter Cheque Number for Cheque payments.");
      return;
    }
    if (paymentMode === "BANK_TRANSFER" && !utrNumber.trim()) {
      toast.error("Enter UTR / Transfer Reference for Bank Transfer.");
      return;
    }
    if (paymentMode === "UPI" && !upiTransactionId.trim()) {
      toast.error("Enter UPI Transaction ID for UPI payments.");
      return;
    }

    setSaving(true);
    try {
      const explicitNo = Number(nextNo);
      const res = await createVoucher({
        ...(Number.isInteger(explicitNo) && explicitNo >= 1 ? { voucherNo: explicitNo } : {}),
        date,
        debitHead,
        purposeType,
        payeeName: payeeName.trim(),
        ...(employeeId.trim() ? { employeeId: employeeId.trim().toUpperCase() } : {}),
        ...(onAccountOf.trim() ? { onAccountOf: onAccountOf.trim() } : {}),
        particulars: particulars.trim(),
        amount: numericAmount,
        amountInWords,
        paymentMode,
        ...(paymentMode === "CHEQUE"
          ? {
              chequeDetails: {
                chequeNo: chequeNo.trim(),
                chequeDate,
                bankAccount: bankAccount.trim(),
                ifsc: ifsc.trim().toUpperCase(),
                bankName: bankName.trim(),
                chequeAmount: numericAmount,
              },
            }
          : {}),
        ...(paymentMode === "BANK_TRANSFER"
          ? {
              bankTransferDetails: {
                utrNumber: utrNumber.trim(),
                bankName: bankName.trim(),
                bankAccount: bankAccount.trim(),
                transferDate: date,
              },
            }
          : {}),
        ...(paymentMode === "UPI"
          ? {
              upiDetails: {
                upiTransactionId: upiTransactionId.trim(),
                upiId: upiId.trim(),
                transferDate: date,
              },
            }
          : {}),
        ...(initialSalary?.id ? { salaryId: initialSalary.id } : {}),
        ...(initialLineItem?.id ? { salaryLineItemId: initialLineItem.id } : {}),
        ...(preparedBy.trim() ? { preparedBy: preparedBy.trim() } : {}),
        ...(approvedBy.trim() ? { approvedBy: approvedBy.trim() } : {}),
        ...(receivedBy.trim() ? { receivedBy: receivedBy.trim() } : {}),
      });

      if (res?.voucher) {
        toast.success(`Voucher #${res.voucher.voucherNo} posted.`);
        onIssued?.(res.voucher);
        if (shouldPrint) {
          printDocumentHtml(
            `Voucher #${res.voucher.voucherNo}`,
            buildVoucherPrintHtml(res.voucher, data.settings),
          );
        }
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <span>
              {initialSalary
                ? `Release Payment Voucher — ${initialSalary.employeeName}`
                : initialLineItem
                  ? `Release Payment Voucher — ${initialLineItem.employeeName}`
                  : "Create Multi-Mode Payment Voucher"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Supports Cash, Cheque (Axis Bank/Cheque No), Bank Transfer (UTR/NEFT/RTGS), and UPI with sequential numbering &amp; amount-in-words.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e, false)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="vch-no">Voucher No</Label>
              <Input
                id="vch-no"
                type="number"
                min={1}
                value={nextNo}
                onChange={(e) => setNextNo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-date">Date *</Label>
              <Input id="vch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-purpose">Purpose Type</Label>
              <Select
                value={purposeType}
                onValueChange={(v) => setPurposeType(v as VoucherPurposeType)}
              >
                <SelectTrigger id="vch-purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-head">Debit Head</Label>
              <Select value={debitHead} onValueChange={setDebitHead}>
                <SelectTrigger id="vch-head">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBIT_HEADS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="vch-payee">Payee / Employee Name *</Label>
              <Input
                id="vch-payee"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="e.g. Pratik Chakraborty"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-emp-id">Employee ID (Optional)</Label>
              <Input
                id="vch-emp-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="ACS/SEC/2026/001"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-site">On Account Of (Site)</Label>
              <Input
                id="vch-site"
                value={onAccountOf}
                onChange={(e) => setOnAccountOf(e.target.value)}
                placeholder="e.g. TRSL-Titagarh"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="vch-part">Particulars *</Label>
            <Textarea
              id="vch-part"
              rows={2}
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              placeholder="Being the Amount paid Mr./Ms. ... salary / advance for the month of ..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="vch-amt">Amount (₹) *</Label>
              <Input
                id="vch-amt"
                type="number"
                step="0.01"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-mode">Payment Mode *</Label>
              <Select
                value={paymentMode}
                onValueChange={(v) => setPaymentMode(v as PaymentMode)}
              >
                <SelectTrigger id="vch-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
            <span className="font-medium text-muted-foreground">Amount in Words: </span>
            <span className="font-semibold text-foreground">{amountInWords}</span>
          </div>

          {paymentMode === "CHEQUE" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="vch-chq-no" className="text-xs">Cheque No *</Label>
                <Input
                  id="vch-chq-no"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="e.g. 344936"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-chq-dt" className="text-xs">Cheque Date</Label>
                <Input
                  id="vch-chq-dt"
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-chq-bank" className="text-xs">Bank Name</Label>
                <Input
                  id="vch-chq-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-chq-ac" className="text-xs">Account No</Label>
                <Input
                  id="vch-chq-ac"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-chq-ifsc" className="text-xs">IFSC Code</Label>
                <Input
                  id="vch-chq-ifsc"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {paymentMode === "BANK_TRANSFER" && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="vch-utr" className="text-xs">UTR / NEFT / RTGS No *</Label>
                <Input
                  id="vch-utr"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="Bank reference number"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-bt-bank" className="text-xs">Bank Name</Label>
                <Input
                  id="vch-bt-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-bt-ac" className="text-xs">Beneficiary A/c No</Label>
                <Input
                  id="vch-bt-ac"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {paymentMode === "UPI" && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="vch-upi-id" className="text-xs">UPI Transaction ID *</Label>
                <Input
                  id="vch-upi-id"
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value)}
                  placeholder="e.g. 632189450123"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vch-vpa" className="text-xs">UPI VPA / Phone (Optional)</Label>
                <Input
                  id="vch-vpa"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@bank"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="vch-prep" className="text-xs">Prepared By</Label>
              <Input id="vch-prep" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-app" className="text-xs">Approved By</Label>
              <Input id="vch-app" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vch-rcvd" className="text-xs">Received By</Label>
              <Input id="vch-rcvd" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={(e) => void handleSubmit(e, true)}
            >
              <Printer className="size-4" />
              Save &amp; Print Voucher
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Posting..." : "Post Voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
