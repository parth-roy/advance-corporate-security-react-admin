import * as React from "react";

const KNOWN_BUTTON_DESCRIPTIONS: Record<string, string> = {
  "add candidate": "Open the full application & KYC document form to register a new hiring applicant",
  "add employee": "Add an active guard, supervisor, or office staff member directly to a site and payroll",
  "deploy": "Assign this candidate to a site and move them into the active Employee Directory",
  "directory": "Jump to the Employee Directory tab to view or edit deployed staff",
  "reset filters": "Clear all active search queries, site, status, and date filters",
  "generate salary": "Mark pending rows in this legacy Salary Sheet register as Processed",
  "generate payroll run": "Compute monthly wages, EPF, ESIC, PT, uniform EMIs & advances from site attendance",
  "open payroll runs": "Switch to Payroll Runs to auto-generate salary sheets from monthly attendance",
  "export payroll": "Download the currently filtered salary sheet as a CSV file",
  "export bank advice": "Download NEFT / bank payout sheet for all payable (non-held) staff",
  "review run": "Mark this draft payroll run as reviewed before locking",
  "lock run": "Lock final wages and sync Payslips, Statutory Compliance, and EMI/Advance balances",
  "issue uniform": "Assign uniform items to an employee and update inventory stock",
  "mark returned": "Record returned uniform items and restore available inventory stock",
  "save & add issue": "Record uniform batch issue and optional salary EMI recovery plan",
  "mark present": "Quick-mark selected staff as Present (P) for the active date",
  "assign reliever": "Log a reliever / replacement guard duty at this site from another site",
  "muster approval": "Upload signed muster sheet scan and verify or lock attendance for billing",
  "record advance": "Record a staff salary advance and optionally generate a payment voucher",
  "issue voucher": "Generate an official Cash, Cheque, Bank Transfer, or UPI payment voucher",
  "print": "Open printable voucher / receipt / payslip preview",
  "generate invoice": "Compute client bill with GST / RCM / service charge from rules or site muster",
  "record receipt": "Log client payment received against this invoice and update receivable balance",
  "add deduction": "Record TDS, penalty, or client deduction against this invoice",
  "cancel": "Close without saving changes",
  "close": "Close this panel",
  "done": "Finish and close this panel",
  "save": "Save and apply your changes",
  "prev": "Go to previous page",
  "next": "Go to next page",
};

function extractTextFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromNode(node.props?.children);
  }
  return "";
}

export function resolveButtonTooltip(options: {
  tooltip?: string | undefined;
  title?: string | undefined;
  ariaLabel?: string | undefined;
  children?: React.ReactNode;
}): string | undefined {
  const explicit = (options.tooltip || options.title || "").trim();
  if (explicit) return explicit;

  const aria = (options.ariaLabel || "").trim();
  if (aria) {
    const lowerAria = aria.toLowerCase();
    if (lowerAria.startsWith("view ")) {
      return `${aria} — inspect full profile, uniforms, attendance, payroll & documents`;
    }
    if (lowerAria.startsWith("edit ")) return `${aria} — modify details`;
    if (lowerAria.startsWith("delete ") || lowerAria.startsWith("remove ")) {
      return `${aria} — remove or mark as left`;
    }
    if (lowerAria.startsWith("deploy ")) {
      return `${aria} — assign site & move to active Employee Directory`;
    }
    return aria;
  }

  const label = extractTextFromNode(options.children).replace(/\s+/g, " ").trim();
  if (!label) return undefined;

  const normalized = label.toLowerCase().replace(/[→←•]+/g, "").trim();
  if (KNOWN_BUTTON_DESCRIPTIONS[normalized]) {
    return KNOWN_BUTTON_DESCRIPTIONS[normalized];
  }

  if (/^(add|create|new)\b/i.test(label)) return `${label} — create a new record`;
  if (/^(view|inspect|preview)\b/i.test(label)) return `${label} — inspect full details`;
  if (/^(edit|update)\b/i.test(label)) return `${label} — modify details`;
  if (/^(delete|remove)\b/i.test(label)) return `${label} — remove this record`;
  if (/^(export|download)\b/i.test(label)) return `${label} — download file`;
  if (/^(upload)\b/i.test(label)) return `${label} — upload file to private storage`;
  if (/^(print)\b/i.test(label)) return `${label} — open print preview`;

  return label;
}
