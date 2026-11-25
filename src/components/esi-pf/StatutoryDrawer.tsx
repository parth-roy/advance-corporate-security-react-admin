import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/acs/StatusBadge";
import type { StatutoryRecord } from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";

export function StatutoryDrawer({ record, onClose }: { record: StatutoryRecord | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {record && (
          <div className="space-y-5">
            <SheetHeader className="text-left">
              <SheetTitle>{record.employeeName}</SheetTitle>
              <SheetDescription>{record.employeeId} · {record.designation} · {record.location}</SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PF Details</span>
                  <StatusBadge status={record.pfStatus} />
                </div>
                <p className="text-xs text-muted-foreground">UAN Number</p>
                <p className="font-mono text-sm font-semibold text-foreground">{record.uanNumber}</p>
                <div className="flex justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Employee Share</span>
                  <span className="font-medium tabular-nums">{formatINR(record.pfEmployeeShare)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Employer Share</span>
                  <span className="font-medium tabular-nums">{formatINR(record.pfEmployerShare)}</span>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ESI Details</span>
                  <StatusBadge status={record.esiStatus} />
                </div>
                <p className="text-xs text-muted-foreground">ESI IP Number</p>
                <p className="font-mono text-sm font-semibold text-foreground">{record.esiNumber}</p>
                <div className="flex justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Employee Share</span>
                  <span className="font-medium tabular-nums">{formatINR(record.esiEmployeeShare)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Employer Share</span>
                  <span className="font-medium tabular-nums">{formatINR(record.esiEmployerShare)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly Contribution Summary ({record.month})</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Basic Wage</p>
                  <p className="font-semibold tabular-nums">{formatINR(record.basicSalary)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total PF</p>
                  <p className="font-semibold tabular-nums">{formatINR(record.pfEmployeeShare + record.pfEmployerShare)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total ESI</p>
                  <p className="font-semibold tabular-nums">{formatINR(record.esiEmployeeShare + record.esiEmployerShare)}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contribution History</p>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="acs-table-header hover:bg-transparent">
                      <TableHead>Month</TableHead>
                      <TableHead>PF Total</TableHead>
                      <TableHead>ESI Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {record.history.map((h) => (
                      <TableRow key={h.month}>
                        <TableCell className="text-xs font-medium">{h.month}</TableCell>
                        <TableCell className="text-xs tabular-nums">{formatINR(h.pfEmployee + h.pfEmployer)}</TableCell>
                        <TableCell className="text-xs tabular-nums">{formatINR(h.esiEmployee + h.esiEmployer)}</TableCell>
                        <TableCell><StatusBadge status={h.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[11px] text-muted-foreground">Sample contribution figures displayed for UI demonstration.</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}