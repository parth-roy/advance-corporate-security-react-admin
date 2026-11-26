import type { AcsStoreData, AttendanceRecord, AttendanceStatus } from "./acs-types";

export interface SiteEmployeeSummary {
  key: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  site: string;
}

export interface AttendanceStatusMeta {
  status: AttendanceStatus;
  code: string;
  shortLabel: string;
  normalDuty: number;
  extraDuty: number;
}

export const ATTENDANCE_STATUS_META: readonly AttendanceStatusMeta[] = [
  { status: "Present", code: "P", shortLabel: "Present (1 Duty)", normalDuty: 1, extraDuty: 0 },
  { status: "Double Duty", code: "P/P", shortLabel: "Double / Extra Duty (2 Duties)", normalDuty: 1, extraDuty: 1 },
  { status: "Half Day", code: "H", shortLabel: "Half Day (0.5 Duty)", normalDuty: 0.5, extraDuty: 0 },
  { status: "Absent", code: "A", shortLabel: "Absent (0 Duty)", normalDuty: 0, extraDuty: 0 },
  { status: "Leave", code: "L", shortLabel: "Leave (0 Duty)", normalDuty: 0, extraDuty: 0 },
  { status: "Weekly Off", code: "WO", shortLabel: "Weekly Off", normalDuty: 0, extraDuty: 0 },
];

export function getLocalTodayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentYearMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getDaysInMonth(yearMonth: string): number {
  const [yStr, mStr] = yearMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return 30;
  return new Date(y, m, 0).getDate();
}

export function getMonthStartWeekdayIndex(yearMonth: string): number {
  const [yStr, mStr] = yearMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return 0;
  // Convert Sun=0..Sat=6 -> Mon=0..Sun=6
  const jsDay = new Date(y, m - 1, 1).getDay();
  return (jsDay + 6) % 7;
}

export function formatMonthLabel(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return yearMonth;
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return getLocalTodayIso();
  const dt = new Date(y, m - 1, d + deltaDays);
  return getLocalTodayIso(dt);
}

export function formatDayIso(yearMonth: string, day: number): string {
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

export function statusToCode(status?: AttendanceStatus): string {
  const hit = ATTENDANCE_STATUS_META.find((m) => m.status === status);
  return hit?.code ?? "—";
}

export function getDefaultDutyForStatus(status: AttendanceStatus): {
  normalDuty: number;
  extraDuty: number;
  checkIn: string;
  checkOut: string;
  workingHours: string;
} {
  switch (status) {
    case "Present":
      return { normalDuty: 1, extraDuty: 0, checkIn: "08:00", checkOut: "16:00", workingHours: "8h 00m" };
    case "Double Duty":
      return { normalDuty: 1, extraDuty: 1, checkIn: "08:00", checkOut: "24:00", workingHours: "16h 00m" };
    case "Half Day":
      return { normalDuty: 0.5, extraDuty: 0, checkIn: "08:00", checkOut: "12:00", workingHours: "4h 00m" };
    default:
      return { normalDuty: 0, extraDuty: 0, checkIn: "—", checkOut: "—", workingHours: "0h 00m" };
  }
}

export function getRecordDutyCounts(record: Pick<AttendanceRecord, "status" | "normalDuty" | "extraDuty">): {
  normalDuty: number;
  extraDuty: number;
  totalDuty: number;
} {
  const defaults = getDefaultDutyForStatus(record.status);
  const normalDuty =
    typeof record.normalDuty === "number" && Number.isFinite(record.normalDuty)
      ? Math.max(0, record.normalDuty)
      : defaults.normalDuty;
  const extraDuty =
    typeof record.extraDuty === "number" && Number.isFinite(record.extraDuty)
      ? Math.max(0, record.extraDuty)
      : defaults.extraDuty;
  return {
    normalDuty,
    extraDuty,
    totalDuty: Number((normalDuty + extraDuty).toFixed(2)),
  };
}

export function parseStatusOrCode(raw: string): AttendanceStatus | null {
  const norm = raw.trim().toLowerCase();
  if (!norm || norm === "-" || norm === "—" || norm === ".") return null;
  if (norm === "p" || norm === "present" || norm === "1") return "Present";
  if (
    norm === "p/p" ||
    norm === "pp" ||
    norm === "double" ||
    norm === "double duty" ||
    norm === "extra" ||
    norm === "extra duty" ||
    norm === "2"
  ) {
    return "Double Duty";
  }
  if (norm === "h" || norm === "hd" || norm === "half" || norm === "half day" || norm === "0.5") {
    return "Half Day";
  }
  if (norm === "a" || norm === "absent" || norm === "0") return "Absent";
  if (norm === "l" || norm === "leave") return "Leave";
  if (norm === "wo" || norm === "w/o" || norm === "weekly off" || norm === "off") return "Weekly Off";
  return null;
}

/**
 * Extracts unique active site names strictly from real records across the store (zero mock lists).
 */
export function deriveDynamicSites(data: AcsStoreData): string[] {
  const sites = new Set<string>();
  data.candidates.forEach((c) => {
    const loc = (c.location ?? "").trim();
    if (loc) sites.add(loc);
  });
  data.attendance.forEach((a) => {
    const loc = (a.location ?? "").trim();
    if (loc) sites.add(loc);
  });
  data.salaries.forEach((s) => {
    const loc = (s.location ?? "").trim();
    if (loc) sites.add(loc);
  });
  data.statutory.forEach((st) => {
    const loc = (st.location ?? "").trim();
    if (loc) sites.add(loc);
  });
  data.invoices.forEach((inv) => {
    const loc = (inv.site ?? "").trim();
    if (loc) sites.add(loc);
  });
  return Array.from(sites).sort((a, b) => a.localeCompare(b));
}

function makeEmpKey(employeeId: string, employeeName: string): string {
  const cleanId = employeeId.trim().toUpperCase();
  const cleanName = employeeName.trim().toLowerCase();
  return cleanId && !isSyntheticAttendanceId(cleanId) ? `id::${cleanId}` : `name::${cleanName}`;
}

export function isSyntheticAttendanceId(id: string): boolean {
  return /^ACS\/(SITE|ATT)\//i.test(id.trim());
}

/**
 * Builds the deduplicated employee roster deployed at a given site from Candidates, Attendance, Salaries, and Statutory records.
 */
export function deriveSiteEmployees(data: AcsStoreData, siteName: string): SiteEmployeeSummary[] {
  const target = siteName.trim().toLowerCase();
  const map = new Map<string, SiteEmployeeSummary>();

  const register = (employeeId: string, employeeName: string, designation: string, site: string) => {
    if (site.trim().toLowerCase() !== target) return;
    const cleanName = employeeName.trim();
    if (!cleanName) return;
    const rawId = employeeId.trim().toUpperCase();
    const realId = rawId && !isSyntheticAttendanceId(rawId) ? rawId : "";
    const normName = cleanName.toLowerCase();
    const key = makeEmpKey(realId, cleanName);

    // If incoming entry has no real ID (empty or temporary ACS/SITE/...), merge with any same-name employee at this site
    if (!realId) {
      const existingByName = Array.from(map.values()).find(
        (x) => x.employeeName.trim().toLowerCase() === normName,
      );
      if (existingByName) {
        if (!existingByName.designation && designation.trim()) {
          existingByName.designation = designation.trim();
        }
        return;
      }
    } else {
      // Incoming entry has a real ID: if an entry for the same name was previously registered without a real ID, upgrade it instead of adding a duplicate row
      const noIdEntry = map.get(`name::${normName}`);
      if (noIdEntry) {
        map.delete(`name::${normName}`);
        noIdEntry.key = key;
        noIdEntry.employeeId = realId;
        if (!noIdEntry.designation && designation.trim()) {
          noIdEntry.designation = designation.trim();
        }
        map.set(key, noIdEntry);
        return;
      }
    }

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        employeeId: realId,
        employeeName: cleanName,
        designation: designation.trim() || "Security Guard",
        site: site.trim(),
      });
    } else {
      if (!existing.designation && designation.trim()) {
        existing.designation = designation.trim();
      }
      if (!existing.employeeId && realId) {
        existing.employeeId = realId;
      }
    }
  };

  data.candidates.forEach((c) => {
    register(c.employeeId ?? "", c.fullName, c.joiningAs || c.position, c.location);
  });
  data.attendance.forEach((a) => {
    register(a.employeeId, a.employeeName, a.designation, a.location);
  });
  data.salaries.forEach((s) => {
    register(s.employeeId, s.employeeName, s.designation, s.location);
  });
  data.statutory.forEach((st) => {
    register(st.employeeId, st.employeeName, st.designation, st.location);
  });

  return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function findRecordForEmployeeDate(
  records: AttendanceRecord[],
  emp: Pick<SiteEmployeeSummary, "employeeId" | "employeeName" | "site">,
  date: string,
): AttendanceRecord | undefined {
  const targetId = emp.employeeId.trim().toUpperCase();
  const targetName = emp.employeeName.trim().toLowerCase();
  const targetSite = emp.site.trim().toLowerCase();

  return records.find((r) => {
    if (r.date !== date) return false;
    const recId = r.employeeId.trim().toUpperCase();
    if (targetId && recId && targetId === recId) return true;
    return (
      r.employeeName.trim().toLowerCase() === targetName &&
      r.location.trim().toLowerCase() === targetSite
    );
  });
}

function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ParsedAttendanceImportResult {
  records: Array<Omit<AttendanceRecord, "id">>;
  errors: string[];
}

/**
 * Parses either a Daily Attendance CSV or a 1..31 Monthly Muster Register CSV into AttendanceRecord payloads.
 */
export function parseAttendanceCsv(
  csvText: string,
  fallbackSite: string,
  fallbackDate: string,
  fallbackMonth: string,
): ParsedAttendanceImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { records: [], errors: ["CSV must include a header row and at least one data row."] };
  }

  const rawHeaders = splitCsvRow(lines[0]!);
  const normHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const dayCols: { index: number; day: number }[] = [];
  rawHeaders.forEach((h, idx) => {
    const trimmed = h.trim();
    if (/^\d{1,2}$/.test(trimmed)) {
      const dayNum = Number(trimmed);
      if (dayNum >= 1 && dayNum <= 31) dayCols.push({ index: idx, day: dayNum });
    }
  });

  const findCol = (...candidates: string[]) =>
    normHeaders.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idIdx = findCol("employeeid", "empid", "id");
  const nameIdx = findCol("employeename", "name", "staffname");
  const desigIdx = findCol("designation", "rank", "role", "post");
  const siteIdx = findCol("site", "location", "unit");
  const dateIdx = findCol("date");
  const statusIdx = findCol("status", "attendance", "code");
  const inIdx = findCol("checkin", "intime");
  const outIdx = findCol("checkout", "outtime");
  const hrsIdx = findCol("workinghours", "hours");
  const remarksIdx = findCol("remarks", "note");

  if (nameIdx < 0) {
    return { records: [], errors: ["CSV header must contain a Name / Employee Name column."] };
  }

  const records: Array<Omit<AttendanceRecord, "id">> = [];
  const errors: string[] = [];
  const daysLimit = getDaysInMonth(fallbackMonth);

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const cols = splitCsvRow(lines[rowIdx]!);
    const empName = cols[nameIdx] ?? "";
    if (!empName || /^(total|grand\s*total)$/i.test(empName)) continue;

    const empId =
      (idIdx >= 0 ? cols[idIdx] : "") ||
      `ACS/IMP/${fallbackMonth.slice(0, 4)}/${String(rowIdx).padStart(3, "0")}`;
    const desig = (desigIdx >= 0 ? cols[desigIdx] : "") || "Security Guard";
    const rowSite = (siteIdx >= 0 ? cols[siteIdx] : "") || fallbackSite;

    if (!rowSite.trim()) {
      errors.push(`Row ${rowIdx + 1}: Missing site / unit.`);
      continue;
    }

    if (dayCols.length >= 2) {
      // Monthly 1..31 register format
      for (const dc of dayCols) {
        if (dc.day > daysLimit) continue;
        const cellVal = cols[dc.index] ?? "";
        const status = parseStatusOrCode(cellVal);
        if (!status) continue;
        const defaults = getDefaultDutyForStatus(status);
        records.push({
          employeeId: empId.trim().toUpperCase(),
          employeeName: empName.trim(),
          designation: desig.trim(),
          location: rowSite.trim(),
          date: formatDayIso(fallbackMonth, dc.day),
          checkIn: defaults.checkIn,
          checkOut: defaults.checkOut,
          workingHours: defaults.workingHours,
          status,
          normalDuty: defaults.normalDuty,
          extraDuty: defaults.extraDuty,
          remarks: remarksIdx >= 0 ? (cols[remarksIdx] ?? "") : "",
        });
      }
    } else {
      // Daily row format
      const rawStatus = statusIdx >= 0 ? (cols[statusIdx] ?? "") : "Present";
      const status = parseStatusOrCode(rawStatus);
      if (!status) {
        errors.push(`Row ${rowIdx + 1} (${empName}): Invalid status "${rawStatus}".`);
        continue;
      }
      const defaults = getDefaultDutyForStatus(status);
      const rowDate = (dateIdx >= 0 ? cols[dateIdx] : "") || fallbackDate;
      records.push({
        employeeId: empId.trim().toUpperCase(),
        employeeName: empName.trim(),
        designation: desig.trim(),
        location: rowSite.trim(),
        date: rowDate,
        checkIn: (inIdx >= 0 ? cols[inIdx] : "") || defaults.checkIn,
        checkOut: (outIdx >= 0 ? cols[outIdx] : "") || defaults.checkOut,
        workingHours: (hrsIdx >= 0 ? cols[hrsIdx] : "") || defaults.workingHours,
        status,
        normalDuty: defaults.normalDuty,
        extraDuty: defaults.extraDuty,
        remarks: remarksIdx >= 0 ? (cols[remarksIdx] ?? "") : "",
      });
    }
  }

  return { records, errors };
}
