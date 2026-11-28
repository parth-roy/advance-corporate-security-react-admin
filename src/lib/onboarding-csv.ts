import type {
  OnboardingAdvanceImportRow,
  OnboardingEmployeeImportRow,
  OnboardingSiteImportRow,
  OnboardingUniformPlanImportRow,
} from "./acs-types";

export type OnboardingDatasetKind =
  | "sites"
  | "employees"
  | "openingAdvances"
  | "openingUniformPlans";

export interface ParsedSheetResult<T> {
  headers: string[];
  rows: T[];
  skippedBlankLines: number;
}

/**
 * Splits a CSV or Excel tab-separated line preserving quoted delimiters and escaped double quotes.
 */
function parseDelimitedLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i] ?? "";
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parses CSV or pasted Excel TSV text into raw string records keyed by lowercased/collapsed header tokens.
 */
export function parseTabularText(rawText: string): {
  headers: string[];
  records: Array<Record<string, string>>;
  skippedBlankLines: number;
} {
  const clean = rawText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n");
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i] ?? "").trim().length > 0) {
      headerLineIdx = i;
      break;
    }
  }
  if (headerLineIdx < 0) {
    return { headers: [], records: [], skippedBlankLines: 0 };
  }

  const headerRaw = lines[headerLineIdx] ?? "";
  const tabCount = (headerRaw.match(/\t/g) ?? []).length;
  const commaCount = (headerRaw.match(/,/g) ?? []).length;
  const delimiter = tabCount >= commaCount && tabCount > 0 ? "\t" : ",";

  const headers = parseDelimitedLine(headerRaw, delimiter).map((h) => h.trim());
  const normalizedKeys = headers.map((h) => normalizeHeaderKey(h));
  const records: Array<Record<string, string>> = [];
  let skippedBlankLines = 0;

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      skippedBlankLines += 1;
      continue;
    }
    const cols = parseDelimitedLine(line, delimiter);
    if (cols.every((c) => !c)) {
      skippedBlankLines += 1;
      continue;
    }
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < normalizedKeys.length; c++) {
      const k = normalizedKeys[c];
      if (!k) continue;
      rowObj[k] = cols[c] ?? "";
    }
    records.push(rowObj);
  }

  return { headers, records, skippedBlankLines };
}

function normalizeHeaderKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pickField(record: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const val = record[alias];
    if (val !== undefined && val !== "") return val.trim();
  }
  return "";
}

export function parseSitesCsv(rawText: string): ParsedSheetResult<OnboardingSiteImportRow> {
  const { headers, records, skippedBlankLines } = parseTabularText(rawText);
  const rows: OnboardingSiteImportRow[] = records.map((r) => {
    const siteCode = pickField(r, ["sitecode", "site_code", "unit_code", "code"]);
    const siteName = pickField(r, ["sitename", "site_name", "site", "unit", "unit_name"]);
    const shortName = pickField(r, ["shortname", "short_name", "alias"]);
    const clientName = pickField(r, ["clientname", "client_name", "client", "party_name"]);
    const clientGstin = pickField(r, ["clientgstin", "client_gstin", "gstin", "gst_no", "gst"]);
    const stateCode = pickField(r, ["statecode", "state_code", "state"]);
    const gstMode = pickField(r, ["gstmode", "gst_mode", "gst_regime", "tax_mode"]);
    const sacCode = pickField(r, ["saccode", "sac_code", "sac"]);
    const serviceChargePct = pickField(r, [
      "servicechargepct",
      "service_charge_pct",
      "service_charge",
      "sc_pct",
      "sc",
    ]);
    const vendorCode = pickField(r, ["vendorcode", "vendor_code"]);
    const contractRef = pickField(r, ["contractref", "contract_ref", "wo_no", "gem_contract"]);
    const subUnits = pickField(r, ["subunits", "sub_units", "sub_unit", "departments"]);
    const billToAddress = pickField(r, ["billtoaddress", "bill_to_address", "address"]);
    const notes = pickField(r, ["notes", "remarks"]);

    return {
      siteName,
      ...(siteCode ? { siteCode } : {}),
      ...(shortName ? { shortName } : {}),
      ...(clientName ? { clientName } : {}),
      ...(clientGstin ? { clientGstin } : {}),
      ...(stateCode ? { stateCode } : {}),
      ...(gstMode ? { gstMode } : {}),
      ...(sacCode ? { sacCode } : {}),
      ...(serviceChargePct ? { serviceChargePct } : {}),
      ...(vendorCode ? { vendorCode } : {}),
      ...(contractRef ? { contractRef } : {}),
      ...(subUnits ? { subUnits } : {}),
      ...(billToAddress ? { billToAddress } : {}),
      ...(notes ? { notes } : {}),
    };
  });
  return { headers, rows, skippedBlankLines };
}

export function parseEmployeesCsv(rawText: string): ParsedSheetResult<OnboardingEmployeeImportRow> {
  const { headers, records, skippedBlankLines } = parseTabularText(rawText);
  const rows: OnboardingEmployeeImportRow[] = records.map((r) => {
    const empCode = pickField(r, ["empcode", "emp_code", "acs_code", "employee_id", "employeeid", "id_no"]);
    const legacyEmpCode = pickField(r, ["legacyempcode", "legacy_emp_code", "legacy_code", "legacy_id", "old_code", "staff_no"]);
    const fullName = pickField(r, ["fullname", "full_name", "name", "employee_name", "employeename"]);
    const siteName = pickField(r, ["sitename", "site_name", "site", "unit", "location"]);
    const subUnit = pickField(r, ["subunit", "sub_unit", "department", "unit_part"]);
    const designation = pickField(r, ["designation", "rank", "post", "role"]);
    const mobile = pickField(r, ["mobile", "phone", "contact", "mobile_no"]);
    const rateType = pickField(r, ["ratetype", "rate_type", "wage_basis", "basis"]);
    const baseRate = pickField(r, ["baserate", "base_rate", "rate", "salary", "wages", "daily_rate", "monthly_rate"]);
    const uanNumber = pickField(r, ["uannumber", "uan_number", "uan", "pf_uan", "pf_no"]);
    const esiNumber = pickField(r, ["esinumber", "esi_number", "esic", "esi", "esi_no", "esic_no"]);
    const bankName = pickField(r, ["bankname", "bank_name", "bank"]);
    const accountNumber = pickField(r, ["accountnumber", "account_number", "account_no", "ac_no"]);
    const ifscCode = pickField(r, ["ifsccode", "ifsc_code", "ifsc"]);
    const upiId = pickField(r, ["upiid", "upi_id", "upi"]);
    const preferredPaymentMode = pickField(r, ["preferredpaymentmode", "payment_mode", "mode"]);
    const dateOfJoining = pickField(r, ["dateofjoining", "date_of_joining", "doj", "joining_date"]);
    const status = pickField(r, ["status"]);
    const remarks = pickField(r, ["remarks", "note"]);

    return {
      fullName,
      siteName,
      ...(empCode ? { empCode } : {}),
      ...(legacyEmpCode ? { legacyEmpCode } : {}),
      ...(subUnit ? { subUnit } : {}),
      ...(designation ? { designation } : {}),
      ...(mobile ? { mobile } : {}),
      ...(rateType ? { rateType } : {}),
      ...(baseRate ? { baseRate } : {}),
      ...(uanNumber ? { uanNumber } : {}),
      ...(esiNumber ? { esiNumber } : {}),
      ...(bankName ? { bankName } : {}),
      ...(accountNumber ? { accountNumber } : {}),
      ...(ifscCode ? { ifscCode } : {}),
      ...(upiId ? { upiId } : {}),
      ...(preferredPaymentMode ? { preferredPaymentMode } : {}),
      ...(dateOfJoining ? { dateOfJoining } : {}),
      ...(status ? { status } : {}),
      ...(remarks ? { remarks } : {}),
    };
  });
  return { headers, rows, skippedBlankLines };
}

export function parseOpeningAdvancesCsv(
  rawText: string,
): ParsedSheetResult<OnboardingAdvanceImportRow> {
  const { headers, records, skippedBlankLines } = parseTabularText(rawText);
  const rows: OnboardingAdvanceImportRow[] = records.map((r) => {
    const employeeId = pickField(r, ["employeeid", "employee_id", "emp_code", "empcode"]);
    const legacyEmpCode = pickField(r, ["legacyempcode", "legacy_emp_code", "legacy_code", "staff_code"]);
    const employeeName = pickField(r, ["employeename", "employee_name", "name"]);
    const onAccountOf = pickField(r, ["onaccountof", "on_account_of", "site", "site_name", "unit", "location"]);
    const date = pickField(r, ["date", "advance_date"]);
    const monthKey = pickField(r, ["monthkey", "month_key", "month"]);
    const amount = pickField(r, ["amount", "advance_amount", "total_advance"]) || "0";
    const recoveredAmount = pickField(r, ["recoveredamount", "recovered_amount", "recovered", "paid_back"]);
    const remainingBalance = pickField(r, ["remainingbalance", "remaining_balance", "balance", "due"]);
    const recoveryMode = pickField(r, ["recoverymode", "recovery_mode", "mode"]);
    const installmentCount = pickField(r, ["installmentcount", "installment_count", "installments", "emis"]);
    const monthlyAmount = pickField(r, ["monthlyamount", "monthly_amount", "monthly_emi", "emi"]);
    const targetPayrollMonth = pickField(r, ["targetpayrollmonth", "target_payroll_month", "target_month"]);
    const remarks = pickField(r, ["remarks", "note"]);

    return {
      amount,
      ...(employeeId ? { employeeId } : {}),
      ...(legacyEmpCode ? { legacyEmpCode } : {}),
      ...(employeeName ? { employeeName } : {}),
      ...(onAccountOf ? { onAccountOf } : {}),
      ...(date ? { date } : {}),
      ...(monthKey ? { monthKey } : {}),
      ...(recoveredAmount ? { recoveredAmount } : {}),
      ...(remainingBalance ? { remainingBalance } : {}),
      ...(recoveryMode ? { recoveryMode } : {}),
      ...(installmentCount ? { installmentCount } : {}),
      ...(monthlyAmount ? { monthlyAmount } : {}),
      ...(targetPayrollMonth ? { targetPayrollMonth } : {}),
      ...(remarks ? { remarks } : {}),
    };
  });
  return { headers, rows, skippedBlankLines };
}

export function parseOpeningUniformPlansCsv(
  rawText: string,
): ParsedSheetResult<OnboardingUniformPlanImportRow> {
  const { headers, records, skippedBlankLines } = parseTabularText(rawText);
  const rows: OnboardingUniformPlanImportRow[] = records.map((r) => {
    const employeeId = pickField(r, ["employeeid", "employee_id", "emp_code", "empcode"]);
    const legacyEmpCode = pickField(r, ["legacyempcode", "legacy_emp_code", "legacy_code"]);
    const employeeName = pickField(r, ["employeename", "employee_name", "name"]);
    const siteName = pickField(r, ["sitename", "site_name", "site", "unit", "location"]);
    const totalCharge = pickField(r, ["totalcharge", "total_charge", "dress_charge", "total_amount", "amount"]) || "0";
    const recoveredAmount = pickField(r, ["recoveredamount", "recovered_amount", "recovered"]);
    const remainingBalance = pickField(r, ["remainingbalance", "remaining_balance", "balance", "due"]);
    const recoveryMode = pickField(r, ["recoverymode", "recovery_mode", "mode"]);
    const installmentCount = pickField(r, ["installmentcount", "installment_count", "installments", "emis"]);
    const monthlyAmount = pickField(r, ["monthlyamount", "monthly_amount", "monthly_emi", "emi"]);
    const startMonth = pickField(r, ["startmonth", "start_month", "month"]);
    const remarks = pickField(r, ["remarks", "note"]);

    return {
      totalCharge,
      ...(employeeId ? { employeeId } : {}),
      ...(legacyEmpCode ? { legacyEmpCode } : {}),
      ...(employeeName ? { employeeName } : {}),
      ...(siteName ? { siteName } : {}),
      ...(recoveredAmount ? { recoveredAmount } : {}),
      ...(remainingBalance ? { remainingBalance } : {}),
      ...(recoveryMode ? { recoveryMode } : {}),
      ...(installmentCount ? { installmentCount } : {}),
      ...(monthlyAmount ? { monthlyAmount } : {}),
      ...(startMonth ? { startMonth } : {}),
      ...(remarks ? { remarks } : {}),
    };
  });
  return { headers, rows, skippedBlankLines };
}

export const ONBOARDING_CSV_TEMPLATES: Record<
  OnboardingDatasetKind,
  { fileName: string; label: string; content: string }
> = {
  sites: {
    fileName: "ACS_Sites_Template.csv",
    label: "Sites & Client Units CSV",
    content: [
      "Site Code,Site Name,Client Name,Client GSTIN,State Code,GST Mode,SAC Code,Service Charge %,Sub Units,Contract Ref",
      "MSME-TOOL,MSME TOOL ROOM,MSME Tool Room Kolkata,19AAAAC2480P1ZE,19,RCM,998525,0,S.S | S.G,GEMC-511687788794669",
      "NIELIT-PATNA,NIELIT PATNA,Director NIELIT Patna,10AAATD0315M1ZC,10,INTER_IGST,998533,3.85,PATNA CAMPUS,GEMC-511687798437147",
      "FSSAI-KOL,FSSAI,FSSAI ERO Kolkata,19AAAGF0023K1ZQ,19,INTRA_CGST_SGST,998533,3.2627,Kolkata | BO Guwahati,GEMC-511687783670044",
    ].join("\n"),
  },
  employees: {
    fileName: "ACS_Employees_Bulk_Template.csv",
    label: "Employees Roster CSV (400-1,000+ Staff)",
    content: [
      "Emp Code,Legacy Code,Full Name,Site Name,Sub Unit,Designation,Mobile,Rate Type,Base Rate,UAN,ESIC,Bank Name,Account No,IFSC,DOJ,Status",
      ",1781,ANJAN GOSWAMI,BALARAM,,Security Guard,9830011223,MONTHLY,10556,100912345001,3100123401,State Bank of India,20112233445,SBIN0000123,2024-04-01,ACTIVE",
      ",3065,SANTOH PRASDA,MSME TOOL ROOM,S.G,Security Guard,9830099887,DAILY,338,100912345002,3100123402,Axis Bank,918010022334455,UTIB0000436,2025-01-15,ACTIVE",
      "ACS/MED/2026/001,1072,AMIT BANERJEE,PHE MPDY,,Security Guard,9831211221,DAILY,487,100912345003,3100123403,Bank of India,401100112233,BKID0004011,2024-06-10,ACTIVE",
    ].join("\n"),
  },
  openingAdvances: {
    fileName: "ACS_Opening_Advances_Template.csv",
    label: "Opening Salary Advances CSV",
    content: [
      "Emp Code,Legacy Code,Employee Name,On Account Of,Date,Amount,Recovered Amount,Remaining Balance,Recovery Mode,Installments,Target Month,Remarks",
      ",1072,AMIT BANERJEE,PHE MPDY,2026-10-15,5000,2000,3000,EMI,3,2026-11,Oct closing balance carried forward",
      ",1781,SHIB NATH SAHA,CULTURE BARASAT,2026-11-10,2500,0,2500,NEXT_MONTH,1,2026-11,Voucher #34 cash advance",
    ].join("\n"),
  },
  openingUniformPlans: {
    fileName: "ACS_Opening_Uniform_EMIs_Template.csv",
    label: "Unpaid Dress / Uniform EMIs CSV",
    content: [
      "Emp Code,Legacy Code,Employee Name,Site Name,Total Charge,Recovered Amount,Remaining Balance,Recovery Mode,Installments,Monthly EMI,Start Month,Remarks",
      ",3065,SANTOH PRASDA,MSME TOOL ROOM,2500,625,1875,EMI_COUNT,3,625,2026-11,Balance from MSME sheet 2500/4",
      ",,JIT KUNDU,TRSL TITAGARH,2040,0,2040,ONE_TIME,1,2040,2026-11,Scheduled Nov-26 dress deduction",
    ].join("\n"),
  },
};

export function downloadOnboardingCsvTemplate(kind: OnboardingDatasetKind): void {
  const tpl = ONBOARDING_CSV_TEMPLATES[kind];
  const blob = new Blob([tpl.content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = tpl.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
