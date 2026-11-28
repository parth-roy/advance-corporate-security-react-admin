import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
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
import type { UniformIssueRecord } from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";

export function ReturnUniformDialog({
  issue,
  onClose,
  onConfirmReturn,
}: {
  issue: UniformIssueRecord | null;
  onClose: () => void;
  onConfirmReturn: (issueId: string, returnQty: number, remarks?: string) => void;
}) {
  const remainingQty = issue ? Math.max(0, issue.quantity - (issue.returnedQty ?? 0)) : 0;
  const [qtyStr, setQtyStr] = useState(String(remainingQty || 1));
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!issue) return;
    const rem = Math.max(0, issue.quantity - (issue.returnedQty ?? 0));
    setQtyStr(String(rem));
    setRemarks("");
    setError("");
  }, [issue]);

  if (!issue) return null;

  const parsedQty = Number(qtyStr);
  const validQty = Number.isInteger(parsedQty) && parsedQty >= 1 && parsedQty <= remainingQty;
  const estimatedCredit = validQty ? parsedQty * (issue.unitPrice ?? 0) : 0;
  const label = issue.subCategory || issue.itemName || issue.category || "Uniform Item";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validQty) {
      setError(`Enter a whole number between 1 and ${remainingQty}.`);
      return;
    }
    onConfirmReturn(issue.id, parsedQty, remarks.trim() || undefined);
    toast.success(`Returned ${parsedQty}× ${label} to stock.`);
    onClose();
  };

  return (
    <Dialog open={Boolean(issue)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4 text-primary" />
            <span>Return Issued Uniform / Accessory</span>
          </DialogTitle>
          <DialogDescription>
            {label} ({issue.size}) issued to {issue.employeeName} ({issue.employeeId}) at {issue.site}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
            <div>
              <p className="text-[11px] text-muted-foreground">Issued Qty</p>
              <p className="font-semibold tabular-nums">{issue.quantity}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Already Returned</p>
              <p className="font-semibold tabular-nums">{issue.returnedQty ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Returnable</p>
              <p className="font-bold tabular-nums text-primary">{remainingQty}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ret-qty">Return Quantity *</Label>
              <Input
                id="ret-qty"
                type="number"
                min={1}
                max={remainingQty}
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recovery Balance Credit</Label>
              <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm font-semibold tabular-nums text-success">
                {formatINR(estimatedCredit)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ret-remarks">Return Condition / Note</Label>
            <Input
              id="ret-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Good condition, exited site"
            />
          </div>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Confirm Return</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
