import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANT_MAP: Record<string, BadgeProps["variant"]> = {
  Selected: "success",
  "In Stock": "success",
  Returned: "success",
  Present: "success",
  "Double Duty": "info",
  "National Holiday": "info",
  Active: "success",
  Reliever: "info",
  DRAFT: "neutral",
  SUPERVISOR_SUBMITTED: "warning",
  CLIENT_VERIFIED: "info",
  LOCKED_FOR_BILLING: "success",
  ACTIVE: "info",
  PAUSED: "warning",
  SETTLED: "success",
  CANCELLED: "danger",
  "Bulk Site": "info",
  OPEN: "warning",
  PARTIAL: "info",
  RECOVERED: "success",
  POSTED: "success",
  UNPAID: "neutral",
  HOLD: "warning",
  CHQ_HOLD: "warning",
  PAID: "success",
  PARTIAL_PAID: "info",
  REVIEWED: "info",
  LOCKED: "success",
  LEFT: "danger",
  TRANSFERRED_ADJUST: "info",
  PRE_PAYMENT_SUBMITTED: "info",
  DEDUCTION_DISPUTED: "warning",
  OVERDUE: "danger",
  Filed: "success",
  Processed: "success",
  Generated: "success",
  Paid: "success",
  Shortlisted: "info",
  New: "info",
  Issued: "info",
  "Half Day": "warning",
  "Low Stock": "warning",
  Pending: "warning",
  Leave: "warning",
  "On Hold": "warning",
  Rejected: "danger",
  "Out of Stock": "danger",
  Absent: "danger",
  Overdue: "danger",
  "Weekly Off": "neutral",
  Unmarked: "neutral",
  Exempt: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT_MAP[status] ?? "neutral";
  return (
    <Badge variant={variant} className="rounded-full px-2.5 py-0.5 text-[11px] shadow-none">
      {status}
    </Badge>
  );
}