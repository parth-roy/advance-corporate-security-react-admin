import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AcsLogo } from "@/components/acs/AcsLogo";
import type { AcsSettings, PayslipRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";
import { formatPaymentModeLabel } from "@/lib/finance-utils";

export function buildPayslipPrintHtml(slip: PayslipRecord, settings: AcsSettings): string {
  const gross = slip.basicSalary + slip.allowances + slip.overtime + slip.otherEarnings;
  const totalDed = slip.pfDeduction + slip.esiDeduction + slip.otherDeductions;
  const net = Math.max(0, gross - totalDed);
  const hasRichAttendance =
    (slip.presentDays ?? 0) > 0 || (slip.extraDays ?? 0) > 0 || (slip.otHours ?? 0) > 0;
  const factory = slip.factoryComponents;

  const earningsRows = [
    `<tr><td>Basic / Present Wages</td><td>${formatINR(slip.basicSalary)}</td><td>Provident Fund (PF 12%)</td><td>${formatINR(slip.pfDeduction)}</td></tr>`,
    `<tr><td>Allowances</td><td>${formatINR(slip.allowances)}</td><td>ESI Contribution (0.75%)</td><td>${formatINR(slip.esiDeduction)}</td></tr>`,
    `<tr><td>Overtime / Extra Duty</td><td>${formatINR(slip.overtime)}</td><td>${
      slip.deductPtFromEmployee === false
        ? "Professional Tax (Not Deducted)"
        : "Professional Tax (WB PT)"
    }</td><td>${formatINR(slip.ptDeduction ?? 0)}</td></tr>`,
    ...(slip.bonusInGross !== undefined || slip.advanceDeduction !== undefined || slip.uniformDeduction !== undefined
      ? [
          `<tr><td>Bonus (In Gross) / Arrear</td><td>${formatINR((slip.bonusInGross ?? 0) + (slip.arrearAddition ?? 0))}</td><td>Advance / Uniform Recovery</td><td>${formatINR((slip.advanceDeduction ?? 0) + (slip.uniformDeduction ?? 0))}</td></tr>`,
          `<tr><td>Other Earnings</td><td>${formatINR(slip.otherEarnings)}</td><td>Site / Other Deductions</td><td>${formatINR((slip.gemCharge ?? 0) + (slip.adminCharge ?? 0) + (slip.otherDeductions - (slip.ptDeduction ?? 0) - (slip.advanceDeduction ?? 0) - (slip.uniformDeduction ?? 0) - (slip.gemCharge ?? 0) - (slip.adminCharge ?? 0)))}</td></tr>`,
        ]
      : [
          `<tr><td>Other Earnings</td><td>${formatINR(slip.otherEarnings)}</td><td>Other Deductions</td><td>${formatINR(slip.otherDeductions)}</td></tr>`,
        ]),
    ...(factory
      ? [
          `<tr><td colspan="4" class="muted"><strong>Factory Breakup:</strong> Basic ${formatINR(factory.basic)} | HRA ${formatINR(factory.hra)} | Uniform ${formatINR(factory.uniformAllowance)} | Medical ${formatINR(factory.medical)} | Fuel ${formatINR(factory.fuel)} | Washing ${formatINR(factory.washing)} | Bal. ${formatINR(factory.balancingAllowance)}</td></tr>`,
        ]
      : []),
    ...(slip.bonusOutsideGross && slip.bonusOutsideGross > 0
      ? [
          `<tr><td><strong>Bonus (Separate Outside Gross)</strong></td><td><strong>${formatINR(slip.bonusOutsideGross)}</strong></td><td>${
            slip.canteenAllowance && slip.canteenAllowance > 0 ? "Canteen Allowance (Info)" : ""
          }</td><td>${slip.canteenAllowance && slip.canteenAllowance > 0 ? formatINR(slip.canteenAllowance) : ""}</td></tr>`,
        ]
      : []),
  ].join("");

  return `
    <div class="header">
      <div>
        <div class="brand">${settings.companyName}</div>
        <div class="muted">${settings.companyAddress}</div>
        <div class="muted">${settings.supportEmail} · ${settings.supportPhone}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">SALARY PAYSLIP</div>
        <div class="muted">${slip.payslipId}</div>
        <div class="muted">Period: ${slip.salaryMonth}</div>
        ${slip.ruleProfileName ? `<div class="muted">Rule: ${slip.ruleProfileName}</div>` : ""}
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <strong>Employee Name:</strong> ${slip.employeeName}<br/>
        <strong>Employee ID:</strong> ${slip.employeeId}<br/>
        <strong>Designation:</strong> ${slip.designation}
        ${slip.uanNumber ? `<br/><strong>UAN:</strong> ${slip.uanNumber}` : ""}
        ${slip.esiNumber ? ` · <strong>ESIC:</strong> ${slip.esiNumber}` : ""}
      </div>
      <div class="box">
        <strong>Department:</strong> ${slip.department}<br/>
        <strong>Working Location:</strong> ${slip.location}<br/>
        <strong>Salary Period:</strong> ${slip.salaryMonth}
        ${
          hasRichAttendance
            ? `<br/><strong>Attendance:</strong> P: ${slip.presentDays ?? 0} | E: ${slip.extraDays ?? 0}${slip.otHours ? ` | OT: ${slip.otHours}h` : ""}${slip.nhDays ? ` | NH: ${slip.nhDays}` : ""}`
            : ""
        }
      </div>
    </div>
    <table>
      <thead><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr></thead>
      <tbody>
        ${earningsRows}
        <tr><th>Gross Earnings</th><th>${formatINR(gross)}</th><th>Total Deductions</th><th>${formatINR(totalDed)}</th></tr>
      </tbody>
    </table>
    <div class="summary"><span>Net Payable Salary</span><span>${formatINR(net)}</span></div>
    ${
      slip.paymentMode || slip.voucherNo || (slip.uniformBalanceAfter ?? 0) > 0 || (slip.advanceBalanceAfter ?? 0) > 0
        ? `<div class="box" style="margin-top:10px; font-size:12px;">
            ${slip.paymentMode ? `<strong>Settlement Mode:</strong> ${formatPaymentModeLabel(slip.paymentMode)} ` : ""}
            ${slip.voucherNo ? `· <strong>Voucher Ref:</strong> #${slip.voucherNo} ` : ""}
            ${(slip.uniformBalanceAfter ?? 0) > 0 ? `· <strong>Dress Due Bal:</strong> ${formatINR(slip.uniformBalanceAfter ?? 0)} ` : ""}
            ${(slip.advanceBalanceAfter ?? 0) > 0 ? `· <strong>Advance Due Bal:</strong> ${formatINR(slip.advanceBalanceAfter ?? 0)}` : ""}
          </div>`
        : ""
    }
  `;
}

export function PayslipPreviewDialog({
  payslip,
  settings,
  onClose,
}: {
  payslip: PayslipRecord | null;
  settings: AcsSettings;
  onClose: () => void;
}) {
  if (!payslip) return null;
  const gross = payslip.basicSalary + payslip.allowances + payslip.overtime + payslip.otherEarnings;
  const totalDed = payslip.pfDeduction + payslip.esiDeduction + payslip.otherDeductions;
  const net = Math.max(0, gross - totalDed);
  const fc = payslip.factoryComponents;

  return (
    <Dialog open={Boolean(payslip)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Payslip Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-start">
            <div className="space-y-1.5">
              <AcsLogo initials={settings.logoInitials} />
              <p className="max-w-sm text-xs text-muted-foreground">{settings.companyAddress}</p>
              <p className="text-xs text-muted-foreground">{settings.supportEmail} · {settings.supportPhone}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">Official Payslip</p>
              <p className="font-mono text-sm font-bold text-foreground">{payslip.payslipId}</p>
              <p className="text-xs text-muted-foreground">Salary Period: {payslip.salaryMonth}</p>
              {payslip.ruleProfileCode && (
                <Badge variant="neutral" className="mt-1 font-mono text-[10px]">
                  Rule: {payslip.ruleProfileCode}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 text-xs sm:grid-cols-2">
            <div><span className="text-muted-foreground">Employee Name:</span> <strong className="text-foreground">{payslip.employeeName}</strong></div>
            <div><span className="text-muted-foreground">Employee ID:</span> <strong className="font-mono text-foreground">{payslip.employeeId}</strong></div>
            <div><span className="text-muted-foreground">Designation:</span> <strong className="text-foreground">{payslip.designation}</strong></div>
            <div><span className="text-muted-foreground">Department:</span> <strong className="text-foreground">{payslip.department}</strong></div>
            <div><span className="text-muted-foreground">Working Location:</span> <strong className="text-foreground">{payslip.location}</strong></div>
            <div><span className="text-muted-foreground">Salary Period:</span> <strong className="text-foreground">{payslip.salaryMonth}</strong></div>
            {(payslip.uanNumber || payslip.esiNumber) && (
              <div>
                <span className="text-muted-foreground">UAN / ESIC:</span>{" "}
                <strong className="font-mono text-foreground">
                  {payslip.uanNumber || "—"} / {payslip.esiNumber || "—"}
                </strong>
              </div>
            )}
            {(payslip.presentDays ?? 0) > 0 && (
              <div>
                <span className="text-muted-foreground">Attendance:</span>{" "}
                <strong className="text-foreground">
                  P {payslip.presentDays} · E {payslip.extraDays ?? 0}
                  {payslip.otHours ? ` · OT ${payslip.otHours}h` : ""}
                  {payslip.nhDays ? ` · NH ${payslip.nhDays}` : ""}
                </strong>
              </div>
            )}
          </div>

          {fc && (
            <div className="rounded-lg border bg-muted/20 p-3 text-xs">
              <p className="mb-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
                Factory Component Breakup
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <div>Basic: <strong className="tabular-nums">{formatINR(fc.basic)}</strong></div>
                <div>HRA: <strong className="tabular-nums">{formatINR(fc.hra)}</strong></div>
                <div>Uniform: <strong className="tabular-nums">{formatINR(fc.uniformAllowance)}</strong></div>
                <div>Medical: <strong className="tabular-nums">{formatINR(fc.medical)}</strong></div>
                <div>Fuel: <strong className="tabular-nums">{formatINR(fc.fuel)}</strong></div>
                <div>Washing: <strong className="tabular-nums">{formatINR(fc.washing)}</strong></div>
                <div>Balancing: <strong className="tabular-nums">{formatINR(fc.balancingAllowance)}</strong></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
              <div className="flex justify-between"><span>Basic Salary</span><span className="tabular-nums">{formatINR(payslip.basicSalary)}</span></div>
              <div className="flex justify-between"><span>Allowances</span><span className="tabular-nums">{formatINR(payslip.allowances)}</span></div>
              <div className="flex justify-between"><span>Overtime</span><span className="tabular-nums">{formatINR(payslip.overtime)}</span></div>
              <div className="flex justify-between"><span>Other Earnings</span><span className="tabular-nums">{formatINR(payslip.otherEarnings)}</span></div>
              {(payslip.bonusOutsideGross ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-info">
                  <span>Bonus (Outside Gross)</span>
                  <span className="tabular-nums">{formatINR(payslip.bonusOutsideGross ?? 0)}</span>
                </div>
              )}
              {(payslip.canteenAllowance ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Canteen Allowance (Info)</span>
                  <span className="tabular-nums">{formatINR(payslip.canteenAllowance ?? 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold"><span>Gross Earnings</span><span className="tabular-nums">{formatINR(gross)}</span></div>
            </div>

            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
              <div className="flex justify-between"><span>PF</span><span className="tabular-nums">{formatINR(payslip.pfDeduction)}</span></div>
              <div className="flex justify-between"><span>ESI</span><span className="tabular-nums">{formatINR(payslip.esiDeduction)}</span></div>
              {payslip.deductPtFromEmployee === false && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>WB Professional Tax</span>
                  <span>Not Deducted</span>
                </div>
              )}
              {(payslip.ptDeduction ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Professional Tax</span>
                  <span className="tabular-nums">{formatINR(payslip.ptDeduction ?? 0)}</span>
                </div>
              )}
              {(payslip.uniformDeduction ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Dress / Uniform EMI</span>
                  <span className="tabular-nums">{formatINR(payslip.uniformDeduction ?? 0)}</span>
                </div>
              )}
              {(payslip.advanceDeduction ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Advance Recovery</span>
                  <span className="tabular-nums">{formatINR(payslip.advanceDeduction ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between"><span>Other Deductions</span><span className="tabular-nums">{formatINR(payslip.otherDeductions)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold text-danger"><span>Total Deductions</span><span className="tabular-nums">{formatINR(totalDed)}</span></div>
            </div>
          </div>

          {(payslip.paymentMode || payslip.voucherNo || (payslip.uniformBalanceAfter ?? 0) > 0 || (payslip.advanceBalanceAfter ?? 0) > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-4 py-2.5 text-xs">
              <div>
                {payslip.paymentMode && (
                  <span>Mode: <strong>{formatPaymentModeLabel(payslip.paymentMode)}</strong></span>
                )}
                {payslip.voucherNo && (
                  <span className="ml-3 font-mono">Voucher #{payslip.voucherNo}</span>
                )}
              </div>
              <div className="text-muted-foreground">
                {(payslip.uniformBalanceAfter ?? 0) > 0 && (
                  <span>Dress Balance: {formatINR(payslip.uniformBalanceAfter ?? 0)}</span>
                )}
                {(payslip.advanceBalanceAfter ?? 0) > 0 && (
                  <span className="ml-3">Advance Balance: {formatINR(payslip.advanceBalanceAfter ?? 0)}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col justify-between gap-2 rounded-xl bg-primary p-4 text-primary-foreground sm:flex-row sm:items-center">
            <div>
              <p className="text-xs opacity-80">Net Payable Salary</p>
              <p className="text-2xl font-bold tabular-nums">{formatINR(net)}</p>
            </div>
            <div className="text-xs opacity-80 sm:text-right">
              <p>Gross Earnings: {formatINR(gross)}</p>
              <p>Total Deductions: {formatINR(totalDed)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={() => {
              printDocumentHtml(`Payslip - ${payslip.payslipId}`, buildPayslipPrintHtml(payslip, settings));
              toast.success("Opened print / PDF dialog for payslip.");
            }}
          >
            <Download className="size-4" />Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}