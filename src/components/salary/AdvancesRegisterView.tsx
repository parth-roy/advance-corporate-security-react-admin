import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Printer, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAcsStore } from "@/lib/acs-store";
import type { AdvanceRecoveryMode, PaymentMode, SalaryAdvanceRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";
import { buildVoucherPrintHtml } from "@/lib/finance-utils";

export function AdvancesRegisterView() {
  const {
    data,
    fetchSalaryAdvances,
    fetchAdvancePayrollPreview,
    createSalaryAdvance,
    updateSalaryAdvance,
  } = useAcsStore();

  const fetchAdvRef = useRef(fetchSalaryAdvances);
  fetchAdvRef.current = fetchSalaryAdvances;
  const fetchPreviewRef = useRef(fetchAdvancePayrollPreview);
  fetchPreviewRef.current = fetchAdvancePayrollPreview;

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>(data.salaryAdvances ?? []);
  const [summary, setSummary] = useState({
    openCount: 0,
    totalIssued: 0,
    totalRecovered: 0,
    totalOutstanding: 0,
  });
  const [payrollDue, setPayrollDue] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [recoverTarget, setRecoverTarget] = useState<SalaryAdvanceRecord | null>(null);

  // Create Advance form
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [onAccountOf, setOnAccountOf] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [recoveryMode, setRecoveryMode] = useState<AdvanceRecoveryMode>("NEXT_MONTH");
  const [installmentCount, setInstallmentCount] = useState("2");
  const [targetPayrollMonth, setTargetPayrollMonth] = useState("");
  const [sigReceiver, setSigReceiver] = useState("");
  const [sigStaff, setSigStaff] = useState("");
  const [sigManager, setSigManager] = useState("");
  const [sigDirector, setSigDirector] = useState("");
  const [remarks, setRemarks] = useState("");
  const [issueVoucher, setIssueVoucher] = useState(true);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [chequeNo, setChequeNo] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [upiTransactionId, setUpiTransactionId] = useState("");

  // Manual recovery dialog
  const [recAmt, setRecAmt] = useState("");
  const [recMonth, setRecMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [recNote, setRecNote] = useState("");

  const availableSites = useMemo(() => {
    const set = new Set<string>();
    data.sites.forEach((s) => s.isActive !== false && s.siteName && set.add(s.siteName));
    data.employees.forEach((e) => e.siteName && set.add(e.siteName));
    (data.salaryAdvances ?? []).forEach((a) => a.onAccountOf && set.add(a.onAccountOf));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.sites, data.employees, data.salaryAdvances]);

  const reload = useCallback(async () => {
    const [res, preview] = await Promise.all([
      fetchAdvRef.current({
        search,
        site: siteFilter,
        status: statusFilter,
        ...(monthFilter ? { month: monthFilter } : {}),
      }),
      fetchPreviewRef.current(monthFilter || new Date().toISOString().slice(0, 7), siteFilter),
    ]);
    setAdvances(res.items);
    setSummary(res.summary);
    setPayrollDue(preview.totalDueThisMonth);
  }, [search, siteFilter, statusFilter, monthFilter]);

  useEffect(() => {
    void reload();
  }, [reload, data.salaryAdvances]);

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!employeeName.trim() || !onAccountOf.trim() || !Number.isFinite(numAmt) || numAmt <= 0) {
      toast.error("Employee Name, On Account Of (Site), and positive Amount are required.");
      return;
    }
    if (issueVoucher && paymentMode === "CHEQUE" && !chequeNo.trim()) {
      toast.error("Enter Cheque No when issuing a Cheque voucher.");
      return;
    }
    if (issueVoucher && paymentMode === "BANK_TRANSFER" && !utrNumber.trim()) {
      toast.error("Enter UTR Reference when issuing a Bank Transfer voucher.");
      return;
    }
    if (issueVoucher && paymentMode === "UPI" && !upiTransactionId.trim()) {
      toast.error("Enter UPI Transaction ID when issuing a UPI voucher.");
      return;
    }

    const res = await createSalaryAdvance({
      date,
      ...(employeeId.trim() ? { employeeId: employeeId.trim().toUpperCase() } : {}),
      employeeName: employeeName.trim(),
      onAccountOf: onAccountOf.trim(),
      amount: numAmt,
      recoveryMode,
      ...(recoveryMode === "EMI" ? { installmentCount: Number(installmentCount) || 2 } : {}),
      ...(targetPayrollMonth.trim() ? { targetPayrollMonth: targetPayrollMonth.trim() } : {}),
      signatures: {
        receiver: sigReceiver.trim() || employeeName.trim(),
        staff: sigStaff.trim(),
        manager: sigManager.trim(),
        director: sigDirector.trim(),
      },
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      issueVoucher,
      ...(issueVoucher
        ? {
            paymentMode,
            ...(paymentMode === "CHEQUE" ? { chequeDetails: { chequeNo: chequeNo.trim() } } : {}),
            ...(paymentMode === "BANK_TRANSFER"
              ? { bankTransferDetails: { utrNumber: utrNumber.trim() } }
              : {}),
            ...(paymentMode === "UPI" ? { upiDetails: { upiTransactionId: upiTransactionId.trim() } } : {}),
          }
        : {}),
    });

    if (res?.advance) {
      toast.success(
        res.voucher
          ? `Advance #${res.advance.staffNo} & Voucher #${res.voucher.voucherNo} recorded.`
          : `Advance #${res.advance.staffNo} recorded.`,
      );
      setCreateOpen(false);
      setEmployeeName("");
      setEmployeeId("");
      setAmount("");
      setRemarks("");
      setChequeNo("");
      setUtrNumber("");
      setUpiTransactionId("");
      void reload();
    }
  };

  const handleRecordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverTarget) return;
    const amt = Number(recAmt);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a positive recovery amount.");
      return;
    }
    const saved = await updateSalaryAdvance(recoverTarget.id, {
      recordDeductionAmount: amt,
      deductMonth: recMonth,
      source: "MANUAL",
      note: recNote.trim() || `Recovered in ${recMonth}`,
    });
    if (saved) {
      toast.success(`Recovered ${formatINR(amt)} from advance #${recoverTarget.staffNo}.`);
      setRecoverTarget(null);
      void reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 sm:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Open Advances</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{summary.openCount}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total Advances Issued</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{formatINR(summary.totalIssued)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total Outstanding Balance</p>
          <p className="text-lg font-bold tabular-nums text-warning">{formatINR(summary.totalOutstanding)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">
            Scheduled Recovery ({monthFilter})
          </p>
          <p className="text-lg font-bold tabular-nums text-primary">{formatINR(payrollDue)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search advances"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, site, code..."
              className="pl-9"
            />
          </div>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger aria-label="Filter advances by site">
              <SelectValue placeholder="All Accounts / Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sites / Accounts</SelectItem>
              {availableSites.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter advances by status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="PARTIAL">PARTIAL</SelectItem>
              <SelectItem value="RECOVERED">RECOVERED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label="Advance register month"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Issue Salary Advance
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="acs-table-header hover:bg-transparent">
              <TableHead>Staff No / Date</TableHead>
              <TableHead>Employee Name &amp; ID</TableHead>
              <TableHead>On Account Of (Site)</TableHead>
              <TableHead>Recovery Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Balance</TableHead>
              <TableHead>Signatures (R / S / M / D)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  No salary advances recorded for the selected filters. Click &ldquo;Issue Salary Advance&rdquo; to log an entry.
                </TableCell>
              </TableRow>
            ) : (
              advances.map((adv) => {
                const linkedVoucher = adv.voucherId
                  ? (data.vouchers ?? []).find((v) => v.id === adv.voucherId)
                  : undefined;
                return (
                  <TableRow key={adv.id}>
                    <TableCell className="text-xs">
                      <div className="font-mono font-bold text-foreground">#{adv.staffNo}</div>
                      <div className="text-muted-foreground">{adv.date}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{adv.employeeName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {adv.employeeId}
                        {adv.voucherNo ? ` · Vch #${adv.voucherNo}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{adv.onAccountOf}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="neutral" className="text-[10px]">
                        {adv.recoveryMode}
                      </Badge>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        Payroll: {adv.targetPayrollMonth}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatINR(adv.amount)}</TableCell>
                    <TableCell className="font-bold tabular-nums text-foreground">
                      {formatINR(adv.remainingBalance)}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {[adv.signatures.receiver, adv.signatures.staff, adv.signatures.manager, adv.signatures.director]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={adv.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {linkedVoucher && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Print voucher #${linkedVoucher.voucherNo}`}
                            onClick={() =>
                              printDocumentHtml(
                                `Voucher #${linkedVoucher.voucherNo}`,
                                buildVoucherPrintHtml(linkedVoucher, data.settings),
                              )
                            }
                          >
                            <Printer className="size-4" />
                          </Button>
                        )}
                        {adv.remainingBalance > 0 && adv.status !== "CANCELLED" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRecoverTarget(adv);
                              setRecAmt(String(adv.remainingBalance));
                              setRecMonth(adv.targetPayrollMonth);
                              setRecNote("");
                            }}
                          >
                            <Wallet className="size-3.5" />
                            Recover
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Advance Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Salary Advance (Advance Register)</DialogTitle>
            <DialogDescription>
              Assigns monthly sequential Staff No, schedules Same-Month / Next-Month / EMI recovery, captures 4-role register signatures, and optionally generates a sequential Payment Voucher.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreateAdvance(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="adv-emp-name">Employee Name *</Label>
                <Input
                  id="adv-emp-name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-emp-id">Employee ID</Label>
                <Input
                  id="adv-emp-id"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder="ACS/SEC/2026/001"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-site">On Account Of (Site / Unit) *</Label>
                <Input
                  id="adv-site"
                  list="adv-site-list"
                  value={onAccountOf}
                  onChange={(e) => setOnAccountOf(e.target.value)}
                  placeholder="e.g. PHE, MSME, TSL, Office"
                />
                <datalist id="adv-site-list">
                  {availableSites.map((s) => (
                    <option key={s} value={s} />
                  ))}
                  <option value="Office" />
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="adv-date">Advance Date *</Label>
                <Input id="adv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-amt">Amount (₹) *</Label>
                <Input
                  id="adv-amt"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 2500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-mode">Recovery Timing</Label>
                <Select
                  value={recoveryMode}
                  onValueChange={(v) => setRecoveryMode(v as AdvanceRecoveryMode)}
                >
                  <SelectTrigger id="adv-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAME_MONTH">Same Month Salary</SelectItem>
                    <SelectItem value="NEXT_MONTH">Next Month Salary (Carry Forward)</SelectItem>
                    <SelectItem value="EMI">Split into EMIs</SelectItem>
                    <SelectItem value="MANUAL">Manual Settlement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recoveryMode === "EMI" ? (
                <div className="space-y-1">
                  <Label htmlFor="adv-emi">EMIs</Label>
                  <Input
                    id="adv-emi"
                    type="number"
                    min={2}
                    max={24}
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="adv-target">Target Payroll Month</Label>
                  <Input
                    id="adv-target"
                    type="month"
                    value={targetPayrollMonth}
                    onChange={(e) => setTargetPayrollMonth(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 rounded-lg border bg-muted/20 p-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="adv-sig-r" className="text-[11px]">Receiver Sign</Label>
                <Input id="adv-sig-r" value={sigReceiver} onChange={(e) => setSigReceiver(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-sig-s" className="text-[11px]">Staff Sign</Label>
                <Input id="adv-sig-s" value={sigStaff} onChange={(e) => setSigStaff(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-sig-m" className="text-[11px]">Manager Sign</Label>
                <Input id="adv-sig-m" value={sigManager} onChange={(e) => setSigManager(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adv-sig-d" className="text-[11px]">Director Sign</Label>
                <Input id="adv-sig-d" value={sigDirector} onChange={(e) => setSigDirector(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <div className="space-y-2.5 rounded-lg border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                <Checkbox
                  checked={issueVoucher}
                  onCheckedChange={(c) => setIssueVoucher(c === true)}
                />
                <span>Also generate sequential Printed Payment Voucher immediately</span>
              </label>
              {issueVoucher && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="adv-vch-mode" className="text-xs">Disbursement Mode</Label>
                    <Select
                      value={paymentMode}
                      onValueChange={(v) => setPaymentMode(v as PaymentMode)}
                    >
                      <SelectTrigger id="adv-vch-mode" className="h-8 text-xs">
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
                  {paymentMode === "CHEQUE" && (
                    <div className="space-y-1">
                      <Label htmlFor="adv-chq" className="text-xs">Cheque No *</Label>
                      <Input id="adv-chq" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} className="h-8 text-xs" />
                    </div>
                  )}
                  {paymentMode === "BANK_TRANSFER" && (
                    <div className="space-y-1">
                      <Label htmlFor="adv-utr" className="text-xs">UTR / Ref *</Label>
                      <Input id="adv-utr" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="h-8 text-xs" />
                    </div>
                  )}
                  {paymentMode === "UPI" && (
                    <div className="space-y-1">
                      <Label htmlFor="adv-upi" className="text-xs">UPI Transaction ID *</Label>
                      <Input id="adv-upi" value={upiTransactionId} onChange={(e) => setUpiTransactionId(e.target.value)} className="h-8 text-xs" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="adv-rem">Remarks</Label>
              <Input id="adv-rem" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional advance register note" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Advance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recover Advance Dialog */}
      <Dialog open={Boolean(recoverTarget)} onOpenChange={(o) => !o && setRecoverTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Advance Recovery</DialogTitle>
            <DialogDescription>
              Advance #{recoverTarget?.staffNo} · {recoverTarget?.employeeName} · Outstanding:{" "}
              {formatINR(recoverTarget?.remainingBalance ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleRecordRecovery(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rec-adv-amt">Recovered Amount (₹) *</Label>
                <Input
                  id="rec-adv-amt"
                  type="number"
                  min={1}
                  step="0.01"
                  value={recAmt}
                  onChange={(e) => setRecAmt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rec-adv-m">Recovery Month</Label>
                <Input
                  id="rec-adv-m"
                  type="month"
                  value={recMonth}
                  onChange={(e) => setRecMonth(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rec-adv-note">Note</Label>
              <Input
                id="rec-adv-note"
                value={recNote}
                onChange={(e) => setRecNote(e.target.value)}
                placeholder="e.g. Deducted in Oct-26 salary or cash returned"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecoverTarget(null)}>
                Cancel
              </Button>
              <Button type="submit">Confirm Recovery</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
