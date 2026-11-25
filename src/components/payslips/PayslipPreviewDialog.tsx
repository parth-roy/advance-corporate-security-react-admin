import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AcsLogo } from "@/components/acs/AcsLogo";
import type { AcsSettings, PayslipRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";

export function buildPayslipPrintHtml(slip: PayslipRecord, settings: AcsSettings): string {
  const gross = slip.basicSalary + slip.allowances + slip.overtime + slip.otherEarnings;
  const totalDed = slip.pfDeduction + slip.esiDeduction + slip.otherDeductions;
  const net = Math.max(0, gross - totalDed);
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
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <strong>Employee Name:</strong> ${slip.employeeName}<br/>
        <strong>Employee ID:</strong> ${slip.employeeId}<br/>
        <strong>Designation:</strong> ${slip.designation}
      </div>
      <div class="box">
        <strong>Department:</strong> ${slip.department}<br/>
        <strong>Working Location:</strong> ${slip.location}<br/>
        <strong>Salary Period:</strong> ${slip.salaryMonth}
      </div>
    </div>
    <table>
      <thead><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td>${formatINR(slip.basicSalary)}</td><td>Provident Fund (PF)</td><td>${formatINR(slip.pfDeduction)}</td></tr>
        <tr><td>Allowances</td><td>${formatINR(slip.allowances)}</td><td>ESI Contribution</td><td>${formatINR(slip.esiDeduction)}</td></tr>
        <tr><td>Overtime</td><td>${formatINR(slip.overtime)}</td><td>Other Deductions</td><td>${formatINR(slip.otherDeductions)}</td></tr>
        <tr><td>Other Earnings</td><td>${formatINR(slip.otherEarnings)}</td><td></td><td></td></tr>
        <tr><th>Gross Earnings</th><th>${formatINR(gross)}</th><th>Total Deductions</th><th>${formatINR(totalDed)}</th></tr>
      </tbody>
    </table>
    <div class="summary"><span>Net Payable Salary</span><span>${formatINR(net)}</span></div>
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 text-xs sm:grid-cols-2">
            <div><span className="text-muted-foreground">Employee Name:</span> <strong className="text-foreground">{payslip.employeeName}</strong></div>
            <div><span className="text-muted-foreground">Employee ID:</span> <strong className="font-mono text-foreground">{payslip.employeeId}</strong></div>
            <div><span className="text-muted-foreground">Designation:</span> <strong className="text-foreground">{payslip.designation}</strong></div>
            <div><span className="text-muted-foreground">Department:</span> <strong className="text-foreground">{payslip.department}</strong></div>
            <div><span className="text-muted-foreground">Working Location:</span> <strong className="text-foreground">{payslip.location}</strong></div>
            <div><span className="text-muted-foreground">Salary Period:</span> <strong className="text-foreground">{payslip.salaryMonth}</strong></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
              <div className="flex justify-between"><span>Basic Salary</span><span className="tabular-nums">{formatINR(payslip.basicSalary)}</span></div>
              <div className="flex justify-between"><span>Allowances</span><span className="tabular-nums">{formatINR(payslip.allowances)}</span></div>
              <div className="flex justify-between"><span>Overtime</span><span className="tabular-nums">{formatINR(payslip.overtime)}</span></div>
              <div className="flex justify-between"><span>Other Earnings</span><span className="tabular-nums">{formatINR(payslip.otherEarnings)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold"><span>Gross Earnings</span><span className="tabular-nums">{formatINR(gross)}</span></div>
            </div>

            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
              <div className="flex justify-between"><span>PF</span><span className="tabular-nums">{formatINR(payslip.pfDeduction)}</span></div>
              <div className="flex justify-between"><span>ESI</span><span className="tabular-nums">{formatINR(payslip.esiDeduction)}</span></div>
              <div className="flex justify-between"><span>Other Deductions</span><span className="tabular-nums">{formatINR(payslip.otherDeductions)}</span></div>
              <div className="h-5" />
              <Separator />
              <div className="flex justify-between font-semibold text-danger"><span>Total Deductions</span><span className="tabular-nums">{formatINR(totalDed)}</span></div>
            </div>
          </div>

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