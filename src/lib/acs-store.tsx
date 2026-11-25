import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { INITIAL_ACS_DATA } from "./acs-seed";
import type {
  AcsSettings,
  AcsStoreData,
  AttendanceRecord,
  AttendanceStatus,
  Candidate,
  InvoiceRecord,
  PayslipRecord,
  SalaryRecord,
  UniformIssueRecord,
  UniformItem,
} from "./acs-types";

const STORAGE_KEY = "acs_admin_panel_state_v1";

interface AcsStoreContextValue {
  data: AcsStoreData;
  addCandidate: (candidate: Omit<Candidate, "id">) => void;
  updateCandidate: (candidate: Candidate) => void;
  deleteCandidate: (id: string) => void;
  addUniformItem: (item: Omit<UniformItem, "id" | "issuedQty" | "lastUpdated">) => void;
  updateUniformStock: (id: string, delta: number, note: string) => void;
  issueUniform: (payload: Omit<UniformIssueRecord, "id" | "status">) => boolean;
  returnUniform: (issueId: string) => void;
  upsertAttendance: (record: Omit<AttendanceRecord, "id">, editId?: string) => void;
  bulkUpdateAttendance: (ids: string[], status: AttendanceStatus) => void;
  addEmployeeQuick: (emp: { employeeId: string; name: string; designation: string; location: string; basicSalary: number }) => void;
  updateSalary: (record: SalaryRecord) => void;
  processSalary: (id: string) => void;
  processAllPendingSalaries: (month: string) => number;
  regeneratePayslip: (id: string) => void;
  addInvoice: (invoice: Omit<InvoiceRecord, "id">) => void;
  updateInvoice: (invoice: InvoiceRecord) => void;
  markInvoicePaid: (id: string) => void;
  updateSettings: (settings: Partial<AcsSettings>) => void;
}

const AcsStoreContext = createContext<AcsStoreContextValue | null>(null);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function AcsStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AcsStoreData>(INITIAL_ACS_DATA);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AcsStoreData>;
        setData({ ...INITIAL_ACS_DATA, ...parsed, settings: { ...INITIAL_ACS_DATA.settings, ...parsed.settings } });
      }
    } catch {
      // Ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  }, [data, hydrated]);

  const pushActivity = (prev: AcsStoreData, title: string, detail: string, module: string) => [
    { id: uid("act"), title, detail, module, timestamp: "Just now" },
    ...prev.activities.slice(0, 11),
  ];

  const value: AcsStoreContextValue = {
    data,
    addCandidate: (candidate) =>
      setData((prev) => ({
        ...prev,
        candidates: [{ ...candidate, id: uid("c") }, ...prev.candidates],
        activities: pushActivity(prev, "New candidate added", `${candidate.fullName} applied for ${candidate.position}.`, "Recruitment"),
      })),
    updateCandidate: (candidate) =>
      setData((prev) => ({
        ...prev,
        candidates: prev.candidates.map((c) => (c.id === candidate.id ? candidate : c)),
        activities: pushActivity(prev, "Candidate updated", `${candidate.fullName} status set to ${candidate.status}.`, "Recruitment"),
      })),
    deleteCandidate: (id) =>
      setData((prev) => {
        const target = prev.candidates.find((c) => c.id === id);
        return {
          ...prev,
          candidates: prev.candidates.filter((c) => c.id !== id),
          activities: pushActivity(prev, "Candidate removed", `${target?.fullName ?? "Candidate"} removed from recruitment pipeline.`, "Recruitment"),
        };
      }),
    addUniformItem: (item) =>
      setData((prev) => ({
        ...prev,
        uniforms: [{ ...item, id: uid("u"), issuedQty: 0, lastUpdated: todayIso() }, ...prev.uniforms],
        stockLogs: [{ id: uid("sl"), itemName: item.name, action: "Added", quantity: item.availableQty, date: todayIso(), note: `Initial stock (${item.size})` }, ...prev.stockLogs],
        activities: pushActivity(prev, "Uniform item added", `${item.name} (${item.availableQty} units) added to stock.`, "Uniforms"),
      })),
    updateUniformStock: (id, delta, note) =>
      setData((prev) => {
        const item = prev.uniforms.find((u) => u.id === id);
        if (!item) return prev;
        const nextQty = Math.max(0, item.availableQty + delta);
        return {
          ...prev,
          uniforms: prev.uniforms.map((u) => (u.id === id ? { ...u, availableQty: nextQty, lastUpdated: todayIso() } : u)),
          stockLogs: [{ id: uid("sl"), itemName: item.name, action: "Restocked", quantity: delta, date: todayIso(), note: note || "Manual stock update" }, ...prev.stockLogs],
          activities: pushActivity(prev, "Uniform stock updated", `${item.name} adjusted by ${delta >= 0 ? `+${delta}` : delta} units.`, "Uniforms"),
        };
      }),
    issueUniform: (payload) => {
      const target = data.uniforms.find((u) => u.id === payload.itemId);
      if (!target || target.availableQty < payload.quantity) return false;
      setData((prev) => ({
        ...prev,
        uniforms: prev.uniforms.map((u) =>
          u.id === payload.itemId ? { ...u, availableQty: u.availableQty - payload.quantity, issuedQty: u.issuedQty + payload.quantity, lastUpdated: todayIso() } : u,
        ),
        uniformIssues: [{ ...payload, id: uid("ui"), status: "Issued" }, ...prev.uniformIssues],
        stockLogs: [{ id: uid("sl"), itemName: payload.itemName, action: "Issued", quantity: payload.quantity, date: payload.issueDate, note: `Issued to ${payload.employeeName} (${payload.employeeId})` }, ...prev.stockLogs],
        activities: pushActivity(prev, "Uniform issued", `${payload.quantity}× ${payload.itemName} issued to ${payload.employeeName}.`, "Uniforms"),
      }));
      return true;
    },
    returnUniform: (issueId) =>
      setData((prev) => {
        const issue = prev.uniformIssues.find((i) => i.id === issueId);
        if (!issue || issue.status === "Returned") return prev;
        return {
          ...prev,
          uniforms: prev.uniforms.map((u) =>
            u.id === issue.itemId ? { ...u, availableQty: u.availableQty + issue.quantity, issuedQty: Math.max(0, u.issuedQty - issue.quantity), lastUpdated: todayIso() } : u,
          ),
          uniformIssues: prev.uniformIssues.map((i) => (i.id === issueId ? { ...i, status: "Returned", returnDate: todayIso() } : i)),
          stockLogs: [{ id: uid("sl"), itemName: issue.itemName, action: "Returned", quantity: issue.quantity, date: todayIso(), note: `Returned by ${issue.employeeName} (${issue.employeeId})` }, ...prev.stockLogs],
          activities: pushActivity(prev, "Uniform returned", `${issue.quantity}× ${issue.itemName} returned by ${issue.employeeName}.`, "Uniforms"),
        };
      }),
    upsertAttendance: (record, editId) =>
      setData((prev) => ({
        ...prev,
        attendance: editId
          ? prev.attendance.map((a) => (a.id === editId ? { ...record, id: editId } : a))
          : [{ ...record, id: uid("a") }, ...prev.attendance],
        activities: pushActivity(prev, editId ? "Attendance updated" : "Attendance marked", `${record.employeeName} marked ${record.status} for ${record.date}.`, "Attendance"),
      })),
    bulkUpdateAttendance: (ids, status) =>
      setData((prev) => ({
        ...prev,
        attendance: prev.attendance.map((a) =>
          ids.includes(a.id)
            ? {
                ...a,
                status,
                checkIn: status === "Present" || status === "Half Day" ? (a.checkIn === "—" ? "08:00" : a.checkIn) : "—",
                checkOut: status === "Present" ? "16:00" : status === "Half Day" ? "12:15" : "—",
                workingHours: status === "Present" ? "8h 00m" : status === "Half Day" ? "4h 15m" : "0h 00m",
              }
            : a,
        ),
        activities: pushActivity(prev, "Bulk attendance updated", `${ids.length} employees marked as ${status}.`, "Attendance"),
      })),
    addEmployeeQuick: (emp) =>
      setData((prev) => {
        const month = prev.settings.defaultMonth;
        const newAttendance: AttendanceRecord = { id: uid("a"), employeeId: emp.employeeId, employeeName: emp.name, designation: emp.designation, location: emp.location, date: todayIso(), checkIn: "08:00", checkOut: "16:00", workingHours: "8h 00m", status: "Present" };
        const newSalary: SalaryRecord = { id: uid("sal"), employeeId: emp.employeeId, employeeName: emp.name, designation: emp.designation, department: "Field Operations", category: "Security Personnel", location: emp.location, month, year: "2026", basicSalary: emp.basicSalary, allowances: Math.round(emp.basicSalary * 0.2), overtime: 0, otherEarnings: 0, pfDeduction: 1800, esiDeduction: 140, otherDeductions: 0, status: "Pending" };
        return {
          ...prev,
          attendance: [newAttendance, ...prev.attendance],
          salaries: [newSalary, ...prev.salaries],
          activities: pushActivity(prev, "Employee added", `${emp.name} (${emp.employeeId}) assigned to ${emp.location}.`, "Operations"),
        };
      }),
    updateSalary: (record) =>
      setData((prev) => ({
        ...prev,
        salaries: prev.salaries.map((s) => (s.id === record.id ? record : s)),
        activities: pushActivity(prev, "Salary components edited", `Updated salary structure for ${record.employeeName}.`, "Payroll"),
      })),
    processSalary: (id) =>
      setData((prev) => {
        const target = prev.salaries.find((s) => s.id === id);
        if (!target) return prev;
        const existingSlip = prev.payslips.find((p) => p.employeeId === target.employeeId && p.salaryMonth === target.month);
        const generatedSlip: PayslipRecord = {
          id: existingSlip?.id ?? uid("ps"),
          payslipId: existingSlip?.payslipId ?? `PS-2026-${target.employeeId.replace("ACS-", "")}`,
          employeeId: target.employeeId,
          employeeName: target.employeeName,
          designation: target.designation,
          department: target.department,
          location: target.location,
          salaryMonth: target.month,
          basicSalary: target.basicSalary,
          allowances: target.allowances,
          overtime: target.overtime,
          otherEarnings: target.otherEarnings,
          pfDeduction: target.pfDeduction,
          esiDeduction: target.esiDeduction,
          otherDeductions: target.otherDeductions,
          generatedDate: todayIso(),
          status: "Generated",
        };
        return {
          ...prev,
          salaries: prev.salaries.map((s) => (s.id === id ? { ...s, status: "Processed" } : s)),
          payslips: existingSlip ? prev.payslips.map((p) => (p.id === existingSlip.id ? generatedSlip : p)) : [generatedSlip, ...prev.payslips],
          activities: pushActivity(prev, "Salary processed", `Processed ${target.month} salary for ${target.employeeName}.`, "Payroll"),
        };
      }),
    processAllPendingSalaries: (month) => {
      const pending = data.salaries.filter((s) => s.status === "Pending" && (month === "All" || s.month === month));
      if (pending.length === 0) return 0;
      setData((prev) => ({
        ...prev,
        salaries: prev.salaries.map((s) => (s.status === "Pending" && (month === "All" || s.month === month) ? { ...s, status: "Processed" } : s)),
        payslips: prev.payslips.map((p) => (p.status === "Pending" ? { ...p, status: "Generated", generatedDate: todayIso() } : p)),
        activities: pushActivity(prev, "Batch salary generated", `Processed ${pending.length} pending payroll records.`, "Payroll"),
      }));
      return pending.length;
    },
    regeneratePayslip: (id) =>
      setData((prev) => {
        const slip = prev.payslips.find((p) => p.id === id);
        return {
          ...prev,
          payslips: prev.payslips.map((p) => (p.id === id ? { ...p, status: "Generated", generatedDate: todayIso() } : p)),
          activities: pushActivity(prev, "Payslip regenerated", `Regenerated ${slip?.payslipId ?? "payslip"} for ${slip?.employeeName ?? "employee"}.`, "Payslips"),
        };
      }),
    addInvoice: (invoice) =>
      setData((prev) => ({
        ...prev,
        invoices: [{ ...invoice, id: uid("inv") }, ...prev.invoices],
        activities: pushActivity(prev, "New invoice created", `${invoice.invoiceNumber} generated for ${invoice.clientName}.`, "Billing"),
      })),
    updateInvoice: (invoice) =>
      setData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoice.id ? invoice : i)),
        activities: pushActivity(prev, "Invoice updated", `Updated billing details for ${invoice.invoiceNumber}.`, "Billing"),
      })),
    markInvoicePaid: (id) =>
      setData((prev) => {
        const inv = prev.invoices.find((i) => i.id === id);
        return {
          ...prev,
          invoices: prev.invoices.map((i) => (i.id === id ? { ...i, status: "Paid" } : i)),
          activities: pushActivity(prev, "Invoice marked paid", `${inv?.invoiceNumber ?? "Invoice"} marked as Paid.`, "Billing"),
        };
      }),
    updateSettings: (partial) =>
      setData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...partial },
        activities: pushActivity(prev, "Settings saved", "Updated company and administrator preferences.", "Settings"),
      })),
  };

  return <AcsStoreContext.Provider value={value}>{children}</AcsStoreContext.Provider>;
}

export function useAcsStore(): AcsStoreContextValue {
  const ctx = useContext(AcsStoreContext);
  if (!ctx) throw new Error("useAcsStore must be used inside AcsStoreProvider");
  return ctx;
}