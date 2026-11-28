import type {
  AcsSettings,
  BankAdviceRow,
  ComplianceExportRow,
  PaymentMode,
  VoucherRecord,
} from "./acs-types";
import { formatINR } from "./acs-utils";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

function convertBelowThousand(n: number): string {
  const num = Math.floor(n);
  if (num === 0) return "";
  if (num < 20) return ONES[num] ?? "";
  if (num < 100) {
    const t = Math.floor(num / 10);
    const o = num % 10;
    return [TENS[t] ?? "", o > 0 ? ONES[o] ?? "" : ""].filter(Boolean).join(" ");
  }
  const h = Math.floor(num / 100);
  const rem = num % 100;
  return [`${ONES[h] ?? ""} Hundred`, rem > 0 ? convertBelowThousand(rem) : ""]
    .filter(Boolean)
    .join(" ");
}

function convertIntegerIndian(n: number): string {
  const clean = Math.floor(Math.max(0, n));
  if (clean === 0) return "Zero";

  const crore = Math.floor(clean / 10000000);
  const remAfterCrore = clean % 10000000;
  const lakh = Math.floor(remAfterCrore / 100000);
  const remAfterLakh = remAfterCrore % 100000;
  const thousand = Math.floor(remAfterLakh / 1000);
  const rest = remAfterLakh % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${convertIntegerIndian(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertBelowThousand(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertBelowThousand(thousand)} Thousand`);
  if (rest > 0) parts.push(convertBelowThousand(rest));
  return parts.join(" ");
}

export function numberToIndianCurrencyWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "Rupees Zero Only";
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const rupeeWords = `Rupees ${convertIntegerIndian(rupees)}`;
  if (paise > 0) {
    return `${rupeeWords} and ${convertBelowThousand(paise)} Paise Only`;
  }
  return `${rupeeWords} Only`;
}

export function formatPaymentModeLabel(mode: PaymentMode): string {
  switch (mode) {
    case "CASH":
      return "Cash";
    case "CHEQUE":
      return "Cheque";
    case "BANK_TRANSFER":
      return "Bank Transfer (NEFT / RTGS)";
    case "UPI":
      return "UPI";
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildVoucherPrintHtml(voucher: VoucherRecord, settings: AcsSettings): string {
  const modeSummary = (() => {
    if (voucher.paymentMode === "CHEQUE" && voucher.chequeDetails) {
      return `Cheque No: ${escapeHtml(voucher.chequeDetails.chequeNo)} | Date: ${escapeHtml(voucher.chequeDetails.chequeDate)} | Bank: ${escapeHtml(voucher.chequeDetails.bankName)} (A/c: ${escapeHtml(voucher.chequeDetails.bankAccount)}, IFSC: ${escapeHtml(voucher.chequeDetails.ifsc)})`;
    }
    if (voucher.paymentMode === "BANK_TRANSFER" && voucher.bankTransferDetails) {
      return `UTR / Ref: ${escapeHtml(voucher.bankTransferDetails.utrNumber)} | Bank: ${escapeHtml(voucher.bankTransferDetails.bankName)} | Date: ${escapeHtml(voucher.bankTransferDetails.transferDate)}`;
    }
    if (voucher.paymentMode === "UPI" && voucher.upiDetails) {
      return `UPI Txn ID: ${escapeHtml(voucher.upiDetails.upiTransactionId)}${voucher.upiDetails.upiId ? ` | VPA: ${escapeHtml(voucher.upiDetails.upiId)}` : ""}`;
    }
    return "Cash in Hand Disbursement";
  })();

  return `
    <div style="border:1.5px solid #172B4D; border-radius:8px; padding:24px; max-width:760px; margin:0 auto;">
      <div class="header" style="margin-bottom:14px;">
        <div>
          <div class="brand">${escapeHtml(settings.companyName || "ADVANCE CORPORATE SECURITY")}</div>
          <div class="muted">${escapeHtml(settings.companyAddress || "29/23/A Ghoshpara Road, Barrackpore, Kolkata 700120")}</div>
          <div class="muted">GSTIN: ${escapeHtml(settings.companyGstin)} | Tel: ${escapeHtml(settings.supportPhone)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px; font-weight:700; color:#172B4D; letter-spacing:0.5px;">PAYMENT VOUCHER</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px;">No.: #${voucher.voucherNo}</div>
          <div class="muted">Date: ${escapeHtml(voucher.date)}</div>
        </div>
      </div>

      <div class="grid" style="margin-bottom:14px;">
        <div class="box">
          <div class="muted">Debit Head / Classification</div>
          <div style="font-weight:600; margin-top:2px;">${escapeHtml(voucher.debitHead)} (${escapeHtml(voucher.purposeType)})</div>
        </div>
        <div class="box">
          <div class="muted">Paid To / On Account Of</div>
          <div style="font-weight:600; margin-top:2px;">${escapeHtml(voucher.payeeName)}${voucher.employeeId ? ` (${escapeHtml(voucher.employeeId)})` : ""}${voucher.onAccountOf ? ` · ${escapeHtml(voucher.onAccountOf)}` : ""}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Particulars</th>
            <th style="width:150px; text-align:right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:14px 10px; line-height:1.5;">
              ${escapeHtml(voucher.particulars)}
              <div class="muted" style="margin-top:8px;"><strong>Mode:</strong> ${escapeHtml(formatPaymentModeLabel(voucher.paymentMode))} — ${modeSummary}</div>
            </td>
            <td style="text-align:right; font-weight:700; font-size:15px; vertical-align:top;">${escapeHtml(formatINR(voucher.amount))}/-</td>
          </tr>
        </tbody>
      </table>

      <div class="summary" style="margin-top:14px; font-size:13px;">
        <span>Amount in Words: ${escapeHtml(voucher.amountInWords)}</span>
        <span>${escapeHtml(formatINR(voucher.amount))}/-</span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:36px; text-align:center; font-size:12px;">
        <div>
          <div style="border-top:1px solid #9ca3af; padding-top:6px;">Prepared By (${escapeHtml(voucher.preparedBy || "Staff")})</div>
        </div>
        <div>
          <div style="border-top:1px solid #9ca3af; padding-top:6px;">Approved By (${escapeHtml(voucher.approvedBy || "Director")})</div>
        </div>
        <div>
          <div style="border-top:1px solid #9ca3af; padding-top:6px;">Receiver&apos;s Signature (${escapeHtml(voucher.receivedBy || voucher.payeeName)})</div>
        </div>
      </div>
    </div>
  `;
}


export function downloadTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8;"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildBankAdviceRowsForCsv(rows: BankAdviceRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.slNo,
    r.employeeId,
    r.employeeName,
    r.siteName,
    r.bankName,
    r.accountNumber || "-",
    r.ifscCode || "-",
    r.paymentMode,
    r.netPay,
    r.voucherNo ? `#${r.voucherNo}` : "-",
    r.payoutStatus,
  ]);
}

export function buildEsicChallanRowsForCsv(rows: ComplianceExportRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.esiNumber || "UNREGISTERED",
    r.employeeName,
    r.daysPaid,
    r.esiWages,
    r.esiEmployeeShare,
    r.esiEmployerShare,
    r.esiEmployeeShare === 0 ? "11" : "0",
  ]);
}
