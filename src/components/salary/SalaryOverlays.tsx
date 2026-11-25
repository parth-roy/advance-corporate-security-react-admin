import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/acs/StatusBadge";
import type { SalaryRecord } from "@/lib/acs-types";
import { calculateNetSalary, formatINR, parseNonNegativeNumber } from "@/lib/acs-utils";

export function SalaryDetailsDrawer({
  record,
  onClose,
  onEdit,
  onProcess,
}: {
  record: SalaryRecord | null;
  onClose: () => void;
  onEdit: (record: SalaryRecord) => void;
  onProcess: (id: string) => void;
}) {
  const gross = record ? record.basicSalary + record.allowances + record.overtime + record.otherEarnings : 0;
  const deductions = record ? record.pfDeduction + record.esiDeduction + record.otherDeductions : 0;
  const net = Math.max(0, gross - deductions);

  return (
    <Sheet open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {record && (
          <div className="space-y-5">
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between gap-2 pr-6">
                <SheetTitle>{record.employeeName}</SheetTitle>
                <StatusBadge status={record.status} />
              </div>
              <SheetDescription>{record.employeeId} · {record.designation} · {record.month}</SheetDescription>
            </SheetHeader>

            <div className="space-y-2 rounded-lg border bg-background p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
              <div className="flex justify-between"><span>Basic Salary</span><span className="font-medium tabular-nums">{formatINR(record.basicSalary)}</span></div>
              <div className="flex justify-between"><span>Allowances</span><span className="font-medium tabular-nums">{formatINR(record.allowances)}</span></div>
              <div className="flex justify-between"><span>Overtime</span><span className="font-medium tabular-nums">{formatINR(record.overtime)}</span></div>
              <div className="flex justify-between"><span>Other Earnings</span><span className="font-medium tabular-nums">{formatINR(record.otherEarnings)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold"><span>Gross Earnings</span><span className="tabular-nums">{formatINR(gross)}</span></div>
            </div>

            <div className="space-y-2 rounded-lg border bg-background p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
              <div className="flex justify-between"><span>Provident Fund (PF)</span><span className="font-medium tabular-nums">{formatINR(record.pfDeduction)}</span></div>
              <div className="flex justify-between"><span>ESI Contribution</span><span className="font-medium tabular-nums">{formatINR(record.esiDeduction)}</span></div>
              <div className="flex justify-between"><span>Other Deductions</span><span className="font-medium tabular-nums">{formatINR(record.otherDeductions)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-danger"><span>Total Deductions</span><span className="tabular-nums">{formatINR(deductions)}</span></div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground">
              <div>
                <p className="text-xs opacity-80">Net Payable Salary</p>
                <p className="text-xl font-bold tabular-nums">{formatINR(net)}</p>
              </div>
              <span className="text-xs opacity-80">{record.location}</span>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => onEdit(record)}>Edit Components</Button>
              {record.status !== "Processed" && (
                <Button className="flex-1" onClick={() => { onProcess(record.id); toast.success(`Processed salary for ${record.employeeName}.`); onClose(); }}>
                  Process Salary
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function EditSalaryDialog({
  record,
  onClose,
  onSave,
}: {
  record: SalaryRecord | null;
  onClose: () => void;
  onSave: (updated: SalaryRecord) => void;
}) {
  const [basic, setBasic] = useState("0");
  const [allowances, setAllowances] = useState("0");
  const [overtime, setOvertime] = useState("0");
  const [otherEarnings, setOtherEarnings] = useState("0");
  const [pf, setPf] = useState("0");
  const [esi, setEsi] = useState("0");
  const [otherDed, setOtherDed] = useState("0");
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setBasic(String(record.basicSalary));
      setAllowances(String(record.allowances));
      setOvertime(String(record.overtime));
      setOtherEarnings(String(record.otherEarnings));
      setPf(String(record.pfDeduction));
      setEsi(String(record.esiDeduction));
      setOtherDed(String(record.otherDeductions));
      setError("");
    }
  }, [record]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    const b = parseNonNegativeNumber(basic);
    const a = parseNonNegativeNumber(allowances);
    const o = parseNonNegativeNumber(overtime);
    const oe = parseNonNegativeNumber(otherEarnings);
    const p = parseNonNegativeNumber(pf);
    const es = parseNonNegativeNumber(esi);
    const od = parseNonNegativeNumber(otherDed);
    if (b === null || a === null || o === null || oe === null || p === null || es === null || od === null) {
      setError("All salary components must be valid non-negative numbers.");
      return;
    }
    onSave({
      ...record,
      basicSalary: b,
      allowances: a,
      overtime: o,
      otherEarnings: oe,
      pfDeduction: p,
      esiDeduction: es,
      otherDeductions: od,
    });
    toast.success(`Salary components updated for ${record.employeeName}.`);
    onClose();
  };

  const previewNet = calculateNetSalary({
    basicSalary: Number(basic) || 0,
    allowances: (Number(allowances) || 0) + (Number(otherEarnings) || 0),
    overtime: Number(overtime) || 0,
    deductions: (Number(pf) || 0) + (Number(esi) || 0) + (Number(otherDed) || 0),
  });

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Salary Components</DialogTitle>
          <DialogDescription>{record?.employeeName} ({record?.employeeId})</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="sal-basic">Basic Salary</Label><Input id="sal-basic" type="number" min={0} value={basic} onChange={(e) => setBasic(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="sal-allow">Allowances</Label><Input id="sal-allow" type="number" min={0} value={allowances} onChange={(e) => setAllowances(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="sal-ot">Overtime</Label><Input id="sal-ot" type="number" min={0} value={overtime} onChange={(e) => setOvertime(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="sal-oe">Other Earnings</Label><Input id="sal-oe" type="number" min={0} value={otherEarnings} onChange={(e) => setOtherEarnings(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="sal-pf">PF Deduction</Label><Input id="sal-pf" type="number" min={0} value={pf} onChange={(e) => setPf(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="sal-esi">ESI Deduction</Label><Input id="sal-esi" type="number" min={0} value={esi} onChange={(e) => setEsi(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="sal-od">Other Deductions</Label><Input id="sal-od" type="number" min={0} value={otherDed} onChange={(e) => setOtherDed(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
            <span className="text-muted-foreground">Calculated Net Salary</span>
            <span className="font-bold text-foreground tabular-nums">{formatINR(previewNet)}</span>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Components</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}