import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, History, Pause, Play, Plus, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAcsStore } from "@/lib/acs-store";
import type { UniformRecoveryMode, UniformRecoveryPlan } from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function UniformRecoveryPlansView() {
  const {
    data,
    fetchUniformRecoveryPlans,
    fetchUniformPayrollPreview,
    createUniformRecoveryPlan,
    updateUniformRecoveryPlan,
  } = useAcsStore();

  const fetchPlansRef = useRef(fetchUniformRecoveryPlans);
  fetchPlansRef.current = fetchUniformRecoveryPlans;
  const fetchPreviewRef = useRef(fetchUniformPayrollPreview);
  fetchPreviewRef.current = fetchUniformPayrollPreview;

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [previewMonth, setPreviewMonth] = useState(currentMonthKey);

  const [plans, setPlans] = useState<UniformRecoveryPlan[]>(data.uniformRecoveryPlans ?? []);
  const [summary, setSummary] = useState({
    activePlans: 0,
    totalOutstanding: 0,
    totalRecovered: 0,
  });
  const [dueThisMonthTotal, setDueThisMonthTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [deductTarget, setDeductTarget] = useState<UniformRecoveryPlan | null>(null);
  const [historyTarget, setHistoryTarget] = useState<UniformRecoveryPlan | null>(null);

  // Create form state
  const [empName, setEmpName] = useState("");
  const [empId, setEmpId] = useState("");
  const [legacyEmpCode, setLegacyEmpCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [totalCharge, setTotalCharge] = useState("1500");
  const [recoveredOpening, setRecoveredOpening] = useState("0");
  const [recoveryMode, setRecoveryMode] = useState<UniformRecoveryMode>("EMI_COUNT");
  const [installmentCount, setInstallmentCount] = useState("4");
  const [monthlyAmount, setMonthlyAmount] = useState("500");
  const [startMonth, setStartMonth] = useState(currentMonthKey);
  const [remarks, setRemarks] = useState("");

  // Deduction modal state
  const [deductAmt, setDeductAmt] = useState("");
  const [deductMonth, setDeductMonth] = useState(currentMonthKey);
  const [deductSource, setDeductSource] = useState<"MANUAL" | "PAYROLL">("PAYROLL");
  const [deductNote, setDeductNote] = useState("");

  const availableSites = useMemo(() => {
    const set = new Set<string>();
    data.sites.forEach((s) => s.isActive !== false && s.siteName && set.add(s.siteName));
    data.employees.forEach((e) => e.siteName && set.add(e.siteName));
    (data.uniformRecoveryPlans ?? []).forEach((p) => p.siteName && set.add(p.siteName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.sites, data.employees, data.uniformRecoveryPlans]);

  const reloadPlans = useCallback(async () => {
    const [plansRes, previewRes] = await Promise.all([
      fetchPlansRef.current({
        search,
        site: siteFilter,
        status: statusFilter,
        limit: 100,
      }),
      fetchPreviewRef.current(previewMonth, siteFilter),
    ]);
    setPlans(plansRes.items);
    setSummary(plansRes.summary);
    setDueThisMonthTotal(previewRes.totalDueThisMonth);
  }, [search, siteFilter, statusFilter, previewMonth]);

  useEffect(() => {
    void reloadPlans();
  }, [reloadPlans, data.uniformRecoveryPlans]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const charge = Number(totalCharge);
    if (!empName.trim() || !siteName.trim() || !Number.isFinite(charge) || charge <= 0) {
      toast.error("Employee Name, Site, and valid Total Charge (> 0) are required.");
      return;
    }
    const created = await createUniformRecoveryPlan({
      ...(empId.trim() ? { employeeId: empId.trim() } : {}),
      ...(legacyEmpCode.trim() ? { legacyEmpCode: legacyEmpCode.trim() } : {}),
      employeeName: empName.trim(),
      siteName: siteName.trim(),
      totalCharge: charge,
      recoveryMode,
      installmentCount: Number(installmentCount) || 1,
      monthlyAmount: Number(monthlyAmount) || charge,
      startMonth,
      recoveredAmount: Number(recoveredOpening) || 0,
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    });
    if (created) {
      toast.success(`Created dress recovery plan for ${created.employeeName}.`);
      setCreateOpen(false);
      setEmpName("");
      setEmpId("");
      setLegacyEmpCode("");
      setRemarks("");
      void reloadPlans();
    }
  };

  const handleRecordDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductTarget) return;
    const amt = Number(deductAmt);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a positive deduction amount.");
      return;
    }
    const updated = await updateUniformRecoveryPlan(deductTarget.id, {
      recordDeductionAmount: amt,
      deductMonth,
      source: deductSource,
      note: deductNote.trim() || `${deductSource} recovery for ${deductMonth}`,
    });
    if (updated) {
      toast.success(`Recorded ${formatINR(amt)} deduction (Balance: ${formatINR(updated.remainingBalance)}).`);
      setDeductTarget(null);
      void reloadPlans();
    }
  };

  const handleTogglePause = async (plan: UniformRecoveryPlan) => {
    const nextStatus = plan.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    const updated = await updateUniformRecoveryPlan(plan.id, { status: nextStatus });
    if (updated) {
      toast.success(`${plan.employeeName} recovery plan marked ${nextStatus}.`);
      void reloadPlans();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 sm:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Active / Paused Plans</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{summary.activePlans}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total Dress Balance Due</p>
          <p className="text-lg font-bold tabular-nums text-warning">{formatINR(summary.totalOutstanding)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total Recovered</p>
          <p className="text-lg font-bold tabular-nums text-success">{formatINR(summary.totalRecovered)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">
            Payroll Recovery Due ({previewMonth})
          </p>
          <p className="text-lg font-bold tabular-nums text-primary">{formatINR(dueThisMonthTotal)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search recovery plans"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, code, site..."
              className="pl-9"
            />
          </div>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger aria-label="Filter recovery by site">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sites</SelectItem>
              {availableSites.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter recovery by status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="PAUSED">PAUSED</SelectItem>
              <SelectItem value="SETTLED">SETTLED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label="Payroll preview month"
            type="month"
            value={previewMonth}
            onChange={(e) => setPreviewMonth(e.target.value)}
          />
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Add Opening / EMI Plan
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="acs-table-header hover:bg-transparent">
              <TableHead>Employee &amp; Code</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Schedule &amp; Start</TableHead>
              <TableHead>Total Charge</TableHead>
              <TableHead>Recovered / Credited</TableHead>
              <TableHead>Due Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No uniform installment recovery plans found. Issuing a uniform kit to an employee creates a plan automatically, or add a legacy due balance above.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{plan.employeeName}</div>
                    <div className="flex flex-wrap gap-1 font-mono text-[11px] text-muted-foreground">
                      <span>{plan.employeeId}</span>
                      {plan.legacyEmpCode && <span>· #{plan.legacyEmpCode}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{plan.siteName}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1 font-medium text-foreground">
                      <CalendarClock className="size-3.5 text-primary" />
                      <span>
                        {plan.recoveryMode === "ONE_TIME"
                          ? `One-Time (${formatINR(plan.monthlyAmount)})`
                          : `${formatINR(plan.monthlyAmount)}/mo (${plan.installmentCount} EMI)`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">From {plan.startMonth}</p>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatINR(plan.totalCharge)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <div className="text-success">Paid: {formatINR(plan.recoveredAmount)}</div>
                    {plan.creditedAmount > 0 && (
                      <div className="text-info">Returned: {formatINR(plan.creditedAmount)}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-bold tabular-nums text-foreground">
                    {formatINR(plan.remainingBalance)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={plan.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {plan.remainingBalance > 0 && plan.status !== "CANCELLED" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDeductTarget(plan);
                              setDeductAmt(
                                String(Math.min(plan.remainingBalance, plan.monthlyAmount || plan.remainingBalance)),
                              );
                              setDeductMonth(previewMonth);
                              setDeductNote("");
                            }}
                          >
                            <Wallet className="size-3.5" />
                            Deduct EMI
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={plan.status === "PAUSED" ? "Resume Plan" : "Pause Plan"}
                            onClick={() => void handleTogglePause(plan)}
                          >
                            {plan.status === "PAUSED" ? (
                              <Play className="size-4 text-success" />
                            ) : (
                              <Pause className="size-4 text-warning" />
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`View history for ${plan.employeeName}`}
                        onClick={() => setHistoryTarget(plan)}
                      >
                        <History className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Opening / Custom EMI Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Uniform Recovery / Carried-Forward Balance</DialogTitle>
            <DialogDescription>
              Record opening dress dues (e.g. &ldquo;₹1,000/- DUE FOR DRESS&rdquo;) or split an employee uniform charge into monthly payroll EMIs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreatePlan(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rec-emp-name">Employee Name *</Label>
                <Input
                  id="rec-emp-name"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Santosh Prasad"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-emp-id">Employee ID (ACS)</Label>
                <Input
                  id="rec-emp-id"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                  placeholder="ACS/SEC/2026/001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-legacy">Legacy Code (Optional)</Label>
                <Input
                  id="rec-legacy"
                  value={legacyEmpCode}
                  onChange={(e) => setLegacyEmpCode(e.target.value)}
                  placeholder="e.g. 3065"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-site">Site / Unit *</Label>
                <Input
                  id="rec-site"
                  list="rec-site-list"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g. MSME Tool & Training Center"
                />
                <datalist id="rec-site-list">
                  {availableSites.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-total">Total Dress Charge (₹) *</Label>
                <Input
                  id="rec-total"
                  type="number"
                  min={1}
                  value={totalCharge}
                  onChange={(e) => setTotalCharge(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-already">Already Deducted (₹)</Label>
                <Input
                  id="rec-already"
                  type="number"
                  min={0}
                  value={recoveredOpening}
                  onChange={(e) => setRecoveredOpening(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-start">Start Payroll Month *</Label>
                <Input
                  id="rec-start"
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rec-mode">Recovery Schedule *</Label>
                <Select
                  value={recoveryMode}
                  onValueChange={(v) => setRecoveryMode(v as UniformRecoveryMode)}
                >
                  <SelectTrigger id="rec-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMI_COUNT">Split into Equal EMIs (N Months)</SelectItem>
                    <SelectItem value="FIXED_MONTHLY">Fixed Monthly Deduction (₹/Mo)</SelectItem>
                    <SelectItem value="ONE_TIME">One-Time Full Recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recoveryMode === "EMI_COUNT" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="rec-emi-count">Installments (Months)</Label>
                  <Input
                    id="rec-emi-count"
                    type="number"
                    min={1}
                    max={36}
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                  />
                </div>
              ) : recoveryMode === "FIXED_MONTHLY" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="rec-emi-amt">Monthly Deduction (₹)</Label>
                  <Input
                    id="rec-emi-amt"
                    type="number"
                    min={1}
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex items-end pb-2 text-xs text-muted-foreground">
                  Full balance scheduled in {startMonth}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-remarks">Remarks</Label>
              <Input
                id="rec-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. 2500 / 4 months installment or 1000/- DUE FOR DRESS"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Recovery Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Deduction Dialog */}
      <Dialog open={Boolean(deductTarget)} onOpenChange={(o) => !o && setDeductTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Installment Deduction</DialogTitle>
            <DialogDescription>
              {deductTarget?.employeeName} · Remaining Balance:{" "}
              {formatINR(deductTarget?.remainingBalance ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleRecordDeduction(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ded-amt">Deduction Amount (₹) *</Label>
                <Input
                  id="ded-amt"
                  type="number"
                  min={1}
                  step="0.01"
                  value={deductAmt}
                  onChange={(e) => setDeductAmt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ded-month">Salary / Collection Month *</Label>
                <Input
                  id="ded-month"
                  type="month"
                  value={deductMonth}
                  onChange={(e) => setDeductMonth(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ded-source">Source</Label>
              <Select
                value={deductSource}
                onValueChange={(v) => setDeductSource(v as "MANUAL" | "PAYROLL")}
              >
                <SelectTrigger id="ded-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYROLL">Salary Payroll Deduction</SelectItem>
                  <SelectItem value="MANUAL">Cash / Direct Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ded-note">Note</Label>
              <Input
                id="ded-note"
                value={deductNote}
                onChange={(e) => setDeductNote(e.target.value)}
                placeholder="e.g. Oct-26 salary recovery ₹500; ₹1000 carried forward"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeductTarget(null)}>
                Cancel
              </Button>
              <Button type="submit">Apply Deduction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Installment History Modal */}
      <Dialog open={Boolean(historyTarget)} onOpenChange={(o) => !o && setHistoryTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Installment &amp; Return Ledger</DialogTitle>
            <DialogDescription>
              {historyTarget?.employeeName} ({historyTarget?.employeeId}) · Total:{" "}
              {formatINR(historyTarget?.totalCharge ?? 0)} · Due:{" "}
              {formatINR(historyTarget?.remainingBalance ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {!historyTarget || historyTarget.installmentHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No installment deductions or return credits posted yet.
              </p>
            ) : (
              historyTarget.installmentHistory.map((item, idx) => (
                <div
                  key={`${item.monthKey}-${idx}`}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CheckCircle2 className="size-3.5 text-success" />
                      <span>{item.monthKey}</span>
                      <Badge variant="neutral" className="text-[10px]">
                        {item.source}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.note}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold text-foreground">-{formatINR(item.deductedAmount)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Bal: {formatINR(item.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHistoryTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
