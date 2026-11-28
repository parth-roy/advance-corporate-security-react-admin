import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Lock, Pencil, Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { IssueVoucherDialog } from "@/components/salary/IssueVoucherDialog";
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
import type {
  LineItemPayoutStatus,
  PayrollRunRecord,
  SalaryLineItemRecord,
} from "@/lib/acs-types";
import { downloadCsv, formatINR } from "@/lib/acs-utils";
import { buildBankAdviceRowsForCsv } from "@/lib/finance-utils";

export function PayrollRunsView() {
  const {
    data,
    fetchPayrollRuns,
    fetchPayrollRunDetail,
    fetchSalaryRuleProfiles,
    generatePayrollRun,
    updatePayrollLineItem,
    updatePayrollRunStatus,
    fetchPayrollBankAdvice,
  } = useAcsStore();

  const fetchRunsRef = useRef(fetchPayrollRuns);
  fetchRunsRef.current = fetchPayrollRuns;
  const fetchDetailRef = useRef(fetchPayrollRunDetail);
  fetchDetailRef.current = fetchPayrollRunDetail;
  const fetchRulesRef = useRef(fetchSalaryRuleProfiles);
  fetchRulesRef.current = fetchSalaryRuleProfiles;

  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState("AUTO");
  const [defaultDays, setDefaultDays] = useState("26");
  const [runs, setRuns] = useState<PayrollRunRecord[]>(data.payrollRuns ?? []);
  const [activeRunId, setActiveRunId] = useState<string>("");
  const [activeRun, setActiveRun] = useState<PayrollRunRecord | null>(null);
  const [lineItems, setLineItems] = useState<SalaryLineItemRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  const [editingLine, setEditingLine] = useState<SalaryLineItemRecord | null>(null);
  const [editArrear, setEditArrear] = useState("0");
  const [editUniform, setEditUniform] = useState("0");
  const [editAdvance, setEditAdvance] = useState("0");
  const [editOtherDed, setEditOtherDed] = useState("0");
  const [editStatus, setEditStatus] = useState<LineItemPayoutStatus>("UNPAID");
  const [editHoldReason, setEditHoldReason] = useState("");

  const [voucherTarget, setVoucherTarget] = useState<SalaryLineItemRecord | null>(null);

  const siteOptions = useMemo(() => {
    const names = new Set<string>();
    data.sites.forEach((s) => s.isActive !== false && s.siteName && names.add(s.siteName));
    data.employees.forEach((e) => e.siteName && names.add(e.siteName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data.sites, data.employees]);

  useEffect(() => {
    if (!selectedSite && siteOptions.length > 0) {
      setSelectedSite(siteOptions[0] ?? "");
    }
  }, [siteOptions, selectedSite]);

  const reloadRuns = useCallback(async () => {
    const [rList] = await Promise.all([fetchRunsRef.current(), fetchRulesRef.current()]);
    setRuns(rList);
    if (!activeRunId && rList[0]?.id) {
      setActiveRunId(rList[0].id);
    }
  }, [activeRunId]);

  useEffect(() => {
    void reloadRuns();
  }, [reloadRuns]);

  useEffect(() => {
    if (!activeRunId) {
      setActiveRun(null);
      setLineItems([]);
      return;
    }
    let active = true;
    void fetchDetailRef.current(activeRunId).then((detail) => {
      if (active && detail) {
        setActiveRun(detail.run);
        setLineItems(detail.lineItems);
      }
    });
    return () => {
      active = false;
    };
  }, [activeRunId]);

  const handleGenerate = async () => {
    if (!selectedSite.trim()) {
      toast.error("Select a Client Site to generate its payroll run.");
      return;
    }
    setGenerating(true);
    try {
      const siteObj = data.sites.find((s) => s.siteName === selectedSite);
      const res = await generatePayrollRun({
        monthKey,
        siteName: selectedSite,
        ...(siteObj?.id ? { siteId: siteObj.id } : {}),
        ...(selectedRuleId !== "AUTO" ? { ruleProfileId: selectedRuleId } : {}),
        defaultPresentDays: Number(defaultDays) || 26,
        autoPullRecoveries: true,
      });
      if (res?.run) {
        toast.success(`Generated ${res.run.runCode} (${res.lineItems.length} staff).`);
        setRuns((prev) => [res.run, ...prev.filter((r) => r.id !== res.run.id)]);
        setActiveRunId(res.run.id);
        setActiveRun(res.run);
        setLineItems(res.lineItems);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusTransition = async (nextStatus: "REVIEWED" | "LOCKED") => {
    if (!activeRun) return;
    const saved = await updatePayrollRunStatus(activeRun.id, nextStatus);
    if (saved) {
      setActiveRun(saved);
      setRuns((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(
        nextStatus === "LOCKED"
          ? `${saved.runCode} LOCKED — Statutory, Uniform/Advance recoveries & Payslips synced.`
          : `${saved.runCode} marked as REVIEWED.`,
      );
    }
  };

  const handleExportBankAdvice = async () => {
    if (!activeRun) return;
    const advice = await fetchPayrollBankAdvice(activeRun.id);
    if (!advice) return;
    downloadCsv(
      `bank-advice-${advice.runCode.toLowerCase()}.csv`,
      [
        "Sl No",
        "Emp Code",
        "Employee Name",
        "Site",
        "Bank Name",
        "Account No",
        "IFSC Code",
        "Mode",
        "Net Payable",
        "Voucher No",
        "Status",
      ],
      buildBankAdviceRowsForCsv(advice.rows),
    );
    toast.success(`Exported NEFT / Bank Advice (${advice.rows.length} entries).`);
  };

  const openEditLine = (line: SalaryLineItemRecord) => {
    setEditingLine(line);
    setEditArrear(String(line.arrearAddition));
    setEditUniform(String(line.uniformDeduction));
    setEditAdvance(String(line.advanceDeduction));
    setEditOtherDed(String(line.otherDeduction));
    setEditStatus(line.payoutStatus);
    setEditHoldReason(line.holdReason ?? "");
  };

  const handleSaveLineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine) return;
    const isLocked = activeRun?.status === "LOCKED";
    const updates: Partial<SalaryLineItemRecord> = isLocked
      ? { payoutStatus: editStatus, holdReason: editHoldReason.trim() }
      : {
          arrearAddition: Math.max(0, Number(editArrear) || 0),
          uniformDeduction: Math.max(0, Number(editUniform) || 0),
          advanceDeduction: Math.max(0, Number(editAdvance) || 0),
          otherDeduction: Math.max(0, Number(editOtherDed) || 0),
          payoutStatus: editStatus,
          holdReason: editHoldReason.trim(),
        };

    const res = await updatePayrollLineItem(editingLine.id, updates);
    if (res?.lineItem) {
      setLineItems((prev) => prev.map((l) => (l.id === res.lineItem.id ? res.lineItem : l)));
      if (res.run) {
        setActiveRun(res.run);
        setRuns((prev) => prev.map((r) => (r.id === res.run!.id ? res.run! : r)));
      }
      toast.success(`Updated line item for ${res.lineItem.employeeName}.`);
      setEditingLine(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 rounded-lg border bg-background p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="pr-site" className="text-xs">Client Site *</Label>
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger id="pr-site"><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>
              {siteOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-month" className="text-xs">Payroll Month *</Label>
          <Input id="pr-month" type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-rule" className="text-xs">Rule Profile</Label>
          <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
            <SelectTrigger id="pr-rule"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">Auto-match Site Rule</SelectItem>
              {(data.salaryRuleProfiles ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.profileName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-days" className="text-xs">Fallback Days (if no logs)</Label>
          <Input id="pr-days" type="number" min={1} max={31} value={defaultDays} onChange={(e) => setDefaultDays(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button className="w-full" disabled={generating} onClick={() => void handleGenerate()}>
            <Play className="size-4" />
            {generating ? "Computing..." : "Generate Payroll Run"}
          </Button>
        </div>
      </div>

      {runs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="pr-select-run" className="text-xs font-medium text-muted-foreground">Active Run:</Label>
            <Select value={activeRunId} onValueChange={setActiveRunId}>
              <SelectTrigger id="pr-select-run" className="w-64 bg-background">
                <SelectValue placeholder="Choose payroll run" />
              </SelectTrigger>
              <SelectContent>
                {runs.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.runCode} · {r.monthLabel} ({r.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeRun && <StatusBadge status={activeRun.status} />}
            {activeRun && (
              <Badge variant="neutral" className="text-[11px]">
                Rule: {activeRun.ruleProfileCode}
              </Badge>
            )}
          </div>

          {activeRun && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleExportBankAdvice()}>
                <Download className="size-3.5" />
                Export Bank / NEFT Advice
              </Button>
              {activeRun.status === "DRAFT" && (
                <Button size="sm" variant="outline" onClick={() => void handleStatusTransition("REVIEWED")}>
                  <CheckCircle2 className="size-3.5" />
                  Mark Reviewed
                </Button>
              )}
              {activeRun.status !== "LOCKED" && (
                <Button size="sm" onClick={() => void handleStatusTransition("LOCKED")}>
                  <Lock className="size-3.5" />
                  Lock &amp; Sync Payslips / ECR
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeRun && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-4 sm:grid-cols-6">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Headcount</p>
            <p className="text-lg font-bold tabular-nums">{activeRun.headcount}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Total Gross</p>
            <p className="text-base font-semibold tabular-nums">{formatINR(activeRun.totalGross)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Outside Bonus</p>
            <p className="text-base font-semibold tabular-nums">{formatINR(activeRun.totalBonusOutsideGross)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">EPF (Emp + Empr)</p>
            <p className="text-base font-semibold tabular-nums">
              {formatINR(activeRun.totalEpfEmployee + activeRun.totalEpfEmployer)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Uniform + Advance</p>
            <p className="text-base font-semibold tabular-nums text-warning">
              {formatINR(activeRun.totalUniformDeduction + activeRun.totalAdvanceDeduction)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Total Net Payable</p>
            <p className="text-lg font-bold tabular-nums text-primary">{formatINR(activeRun.totalNetPay)}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="acs-table-header hover:bg-transparent">
              <TableHead>Employee</TableHead>
              <TableHead>Duties (P/E/OT)</TableHead>
              <TableHead>Wages + Allow + Bonus</TableHead>
              <TableHead>EPF / ESI / PT</TableHead>
              <TableHead>Recoveries &amp; Charges</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Payout Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Generate a site payroll run above or select an existing run to review itemized calculations, holds, and bank advice.
                </TableCell>
              </TableRow>
            ) : (
              lineItems.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{line.employeeName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {line.employeeId} · {line.designation}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <div>P: {line.presentDays} · E: {line.extraDays}</div>
                    {line.otHours > 0 && <div className="text-muted-foreground">OT Hrs: {line.otHours}</div>}
                    {line.nhDays > 0 && <div className="text-muted-foreground">NH: {line.nhDays}</div>}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <div className="font-medium">{formatINR(line.grossSalary)} gross</div>
                    <div className="text-[11px] text-muted-foreground">
                      Base {formatINR(line.presentWages)}
                      {line.extraDutyAmount > 0 ? ` + OT ${formatINR(line.extraDutyAmount)}` : ""}
                      {line.bonusInGross > 0 ? ` + Bonus ${formatINR(line.bonusInGross)}` : ""}
                    </div>
                    {line.bonusOutsideGross > 0 && (
                      <div className="text-[11px] text-info">
                        + Outside Bonus {formatINR(line.bonusOutsideGross)}
                      </div>
                    )}
                    {line.canteenAllowance > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        Canteen {formatINR(line.canteenAllowance)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <div>PF: {formatINR(line.epfEmployee)} · ESI: {formatINR(line.esiEmployee)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      PT: {line.deductPtFromEmployee ? formatINR(line.ptDeducted) : `₹0 (Computed ${formatINR(line.ptComputed)}, not deducted)`}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-danger">
                    <div>
                      Uni: {formatINR(line.uniformDeduction)} · Adv: {formatINR(line.advanceDeduction)}
                    </div>
                    {(line.gemCharge > 0 || line.adminCharge > 0 || line.otherDeduction > 0) && (
                      <div className="text-[11px]">
                        Charges: {formatINR(line.gemCharge + line.adminCharge + line.otherDeduction)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-bold tabular-nums text-foreground">
                    {formatINR(line.netPay)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusBadge status={line.payoutStatus} />
                      {line.voucherNo && (
                        <Badge variant="neutral" className="font-mono text-[10px]">
                          Vch #{line.voucherNo}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Adjust ${line.employeeName}`}
                        onClick={() => openEditLine(line)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {line.payoutStatus !== "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVoucherTarget(line)}
                        >
                          <ShieldCheck className="size-3.5" />
                          {line.payoutStatus === "HOLD" || line.payoutStatus === "CHQ_HOLD"
                            ? "Release Voucher"
                            : "Pay Voucher"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editingLine)} onOpenChange={(o) => !o && setEditingLine(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Payroll Line Item</DialogTitle>
            <DialogDescription>
              {editingLine?.employeeName} ({editingLine?.employeeId}) · {editingLine?.siteName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSaveLineEdit(e)} className="space-y-3">
            {activeRun?.status !== "LOCKED" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="line-arr">Arrear Addition (₹)</Label>
                  <Input id="line-arr" type="number" step="0.01" value={editArrear} onChange={(e) => setEditArrear(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="line-uni">Uniform EMI (₹)</Label>
                  <Input id="line-uni" type="number" step="0.01" value={editUniform} onChange={(e) => setEditUniform(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="line-adv">Advance Recovery (₹)</Label>
                  <Input id="line-adv" type="number" step="0.01" value={editAdvance} onChange={(e) => setEditAdvance(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="line-oth">Other Deduction (₹)</Label>
                  <Input id="line-oth" type="number" step="0.01" value={editOtherDed} onChange={(e) => setEditOtherDed(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="line-status">Payout Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as LineItemPayoutStatus)}>
                  <SelectTrigger id="line-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">UNPAID</SelectItem>
                    <SelectItem value="HOLD">HOLD</SelectItem>
                    <SelectItem value="CHQ_HOLD">CHQ_HOLD</SelectItem>
                    <SelectItem value="LEFT">LEFT</SelectItem>
                    <SelectItem value="TRANSFERRED_ADJUST">TRANSFERRED_ADJUST</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="line-reason">Hold / Adjust Reason</Label>
                <Input id="line-reason" value={editHoldReason} onChange={(e) => setEditHoldReason(e.target.value)} placeholder="Optional note" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingLine(null)}>Cancel</Button>
              <Button type="submit">Save Adjustment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <IssueVoucherDialog
        open={Boolean(voucherTarget)}
        onOpenChange={(o) => !o && setVoucherTarget(null)}
        initialLineItem={voucherTarget}
        onIssued={() => {
          if (activeRunId) {
            void fetchDetailRef.current(activeRunId).then((detail) => {
              if (detail) {
                setActiveRun(detail.run);
                setLineItems(detail.lineItems);
              }
            });
          }
        }}
      />
    </div>
  );
}
