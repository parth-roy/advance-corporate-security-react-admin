import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, Plus, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { IssueVoucherDialog } from "@/components/salary/IssueVoucherDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAcsStore } from "@/lib/acs-store";
import type { VoucherRecord } from "@/lib/acs-types";
import { formatINR, printDocumentHtml } from "@/lib/acs-utils";
import { buildVoucherPrintHtml, formatPaymentModeLabel } from "@/lib/finance-utils";

export function VouchersRegisterView() {
  const { data, fetchVouchers, cancelVoucher } = useAcsStore();
  const fetchRef = useRef(fetchVouchers);
  fetchRef.current = fetchVouchers;

  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [purposeFilter, setPurposeFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");
  const [vouchers, setVouchers] = useState<VoucherRecord[]>(data.vouchers ?? []);
  const [summary, setSummary] = useState<{
    totalCount: number;
    totalAmount: number;
    byMode: Record<string, number>;
  }>({
    totalCount: 0,
    totalAmount: 0,
    byMode: { CASH: 0, CHEQUE: 0, BANK_TRANSFER: 0, UPI: 0 },
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetchRef.current({
      search,
      paymentMode: modeFilter,
      purposeType: purposeFilter,
      ...(monthFilter ? { month: monthFilter } : {}),
    });
    setVouchers(res.items);
    setSummary(res.summary);
  }, [search, modeFilter, purposeFilter, monthFilter]);

  useEffect(() => {
    void reload();
  }, [reload, data.vouchers]);

  const handleVoid = async (v: VoucherRecord) => {
    const ok = await cancelVoucher(v.id);
    if (ok) {
      toast.success(`Voucher #${v.voucherNo} cancelled.`);
      void reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-4 sm:grid-cols-5">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total Disbursed</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{formatINR(summary.totalAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Cash</p>
          <p className="text-base font-semibold tabular-nums">{formatINR(summary.byMode["CASH"] ?? 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Cheque</p>
          <p className="text-base font-semibold tabular-nums">{formatINR(summary.byMode["CHEQUE"] ?? 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Bank Transfer</p>
          <p className="text-base font-semibold tabular-nums">{formatINR(summary.byMode["BANK_TRANSFER"] ?? 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">UPI</p>
          <p className="text-base font-semibold tabular-nums">{formatINR(summary.byMode["UPI"] ?? 0)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search vouchers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Vch #, payee, cheque, UTR..."
              className="pl-9"
            />
          </div>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger aria-label="Filter vouchers by payment mode">
              <SelectValue placeholder="All Payment Modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Modes</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
            </SelectContent>
          </Select>
          <Select value={purposeFilter} onValueChange={setPurposeFilter}>
            <SelectTrigger aria-label="Filter vouchers by purpose">
              <SelectValue placeholder="All Purposes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Purposes</SelectItem>
              <SelectItem value="SALARY_PAYOUT">Salary Payout</SelectItem>
              <SelectItem value="HOLD_RELEASE">Hold Release</SelectItem>
              <SelectItem value="ADVANCE">Advance</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label="Filter vouchers by month"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New Payment Voucher
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="acs-table-header hover:bg-transparent">
              <TableHead>Voucher # / Date</TableHead>
              <TableHead>Payee &amp; Head</TableHead>
              <TableHead>Particulars</TableHead>
              <TableHead>Mode &amp; Instrument</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No payment vouchers issued yet. Create one above, from a Salary Hold Release, or from Salary Advances.
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((v) => {
                const modeDetail =
                  v.paymentMode === "CHEQUE" && v.chequeDetails?.chequeNo
                    ? `Chq #${v.chequeDetails.chequeNo} · ${v.chequeDetails.bankName}`
                    : v.paymentMode === "BANK_TRANSFER" && v.bankTransferDetails?.utrNumber
                      ? `UTR: ${v.bankTransferDetails.utrNumber}`
                      : v.paymentMode === "UPI" && v.upiDetails?.upiTransactionId
                        ? `UPI: ${v.upiDetails.upiTransactionId}`
                        : "Cash in hand";
                return (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs">
                      <div className="font-mono font-bold text-foreground">#{v.voucherNo}</div>
                      <div className="text-muted-foreground">{v.date}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{v.payeeName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {v.debitHead}
                        {v.onAccountOf ? ` · ${v.onAccountOf}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      <p className="line-clamp-2 text-foreground">{v.particulars}</p>
                      <p className="mt-0.5 text-[10px]">{v.amountInWords}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="info" className="text-[10px]">
                        {formatPaymentModeLabel(v.paymentMode)}
                      </Badge>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{modeDetail}</div>
                    </TableCell>
                    <TableCell className="font-bold tabular-nums text-foreground">
                      {formatINR(v.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            printDocumentHtml(
                              `Voucher #${v.voucherNo}`,
                              buildVoucherPrintHtml(v, data.settings),
                            );
                            toast.success(`Prepared printable Voucher #${v.voucherNo}.`);
                          }}
                        >
                          <Printer className="size-3.5" />
                          Print
                        </Button>
                        {v.status === "POSTED" && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Cancel Voucher #${v.voucherNo}`}
                            onClick={() => void handleVoid(v)}
                          >
                            <Ban className="size-4 text-danger" />
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

      <IssueVoucherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onIssued={() => void reload()}
      />
    </div>
  );
}
