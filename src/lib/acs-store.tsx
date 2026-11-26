import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { INITIAL_ACS_DATA } from "./acs-seed";
import { getDefaultDutyForStatus } from "./attendance-utils";
import { useAuth } from "./auth";
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
  UniformStockLog,
} from "./acs-types";

const STORAGE_KEY = "acs_admin_panel_state_v2";

const EMPTY_DATA: AcsStoreData = {
  candidates: [],
  uniforms: [],
  uniformIssues: [],
  stockLogs: [],
  attendance: [],
  statutory: [],
  salaries: [],
  payslips: [],
  invoices: [],
  activities: [],
  settings: INITIAL_ACS_DATA.settings,
};

export interface UniformBatchIssuePayload {
  employeeId: string;
  employeeName: string;
  site: string;
  issueDate: string;
  registrationCharge: number;
  remarks?: string;
  items: { itemId: string; quantity: number; unitPrice: number }[];
}

interface AcsStoreContextValue {
  data: AcsStoreData;
  isSyncing: boolean;
  refreshData: () => Promise<void>;
  addCandidate: (candidate: Omit<Candidate, "id">) => void;
  updateCandidate: (candidate: Candidate) => void;
  deleteCandidate: (id: string) => void;
  addUniformItem: (item: Omit<UniformItem, "id" | "issuedQty" | "lastUpdated">) => void;
  updateUniformItem: (
    id: string,
    updates: Partial<Pick<UniformItem, "category" | "subCategory" | "size" | "unitPrice" | "name">>,
  ) => void;
  deleteUniformItem: (id: string) => void;
  updateUniformStock: (id: string, delta: number, note: string) => void;
  issueUniform: (payload: Omit<UniformIssueRecord, "id" | "status">) => boolean;
  issueUniformBatch: (payload: UniformBatchIssuePayload) => Promise<{ ok: boolean; message?: string }>;
  returnUniform: (issueId: string) => void;
  upsertAttendance: (record: Omit<AttendanceRecord, "id">, editId?: string) => void;
  upsertAttendanceBatch: (records: Array<Omit<AttendanceRecord, "id">>) => Promise<void>;
  bulkUpdateAttendance: (ids: string[], status: AttendanceStatus) => void;
  addEmployeeQuick: (emp: {
    employeeId: string;
    name: string;
    designation: string;
    location: string;
    basicSalary: number;
  }) => void;
  updateSalary: (record: SalaryRecord) => void;
  processSalary: (id: string) => void;
  processAllPendingSalaries: (month: string) => number;
  regeneratePayslip: (id: string) => void;
  addInvoice: (invoice: Omit<InvoiceRecord, "id">) => void;
  updateInvoice: (invoice: InvoiceRecord) => void;
  markInvoicePaid: (id: string) => void;
  updateSettings: (settings: Partial<AcsSettings>) => void;
  recordActivity: (title: string, detail: string, module: string) => void;
}

const AcsStoreContext = createContext<AcsStoreContextValue | null>(null);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string): string {
  return `temp-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function isTempId(id: string): boolean {
  return id.startsWith("temp-");
}

function normalizeOverview(payload: Partial<AcsStoreData> | null | undefined): AcsStoreData {
  return {
    candidates: Array.isArray(payload?.candidates) ? payload.candidates : [],
    uniforms: Array.isArray(payload?.uniforms) ? payload.uniforms : [],
    uniformIssues: Array.isArray(payload?.uniformIssues) ? payload.uniformIssues : [],
    stockLogs: Array.isArray(payload?.stockLogs) ? payload.stockLogs : [],
    attendance: Array.isArray(payload?.attendance) ? payload.attendance : [],
    statutory: Array.isArray(payload?.statutory) ? payload.statutory : [],
    salaries: Array.isArray(payload?.salaries) ? payload.salaries : [],
    payslips: Array.isArray(payload?.payslips) ? payload.payslips : [],
    invoices: Array.isArray(payload?.invoices) ? payload.invoices : [],
    activities: Array.isArray(payload?.activities) ? payload.activities : [],
    settings: { ...INITIAL_ACS_DATA.settings, ...(payload?.settings ?? {}) },
  };
}

export function AcsStoreProvider({ children }: { children: ReactNode }) {
  const { status, apiRequest } = useAuth();
  const [data, setData] = useState<AcsStoreData>(EMPTY_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshData = useCallback(async () => {
    if (status !== "authenticated") return;
    setIsSyncing(true);
    try {
      const overview = await apiRequest<Partial<AcsStoreData>>("/api/admin/overview");
      setData(normalizeOverview(overview));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data from server.");
    } finally {
      setIsSyncing(false);
    }
  }, [status, apiRequest]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AcsStoreData>;
        setData(normalizeOverview(parsed));
      }
    } catch {
      // Ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void refreshData();
    }
  }, [status, refreshData]);

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
    ...prev.activities.slice(0, 19),
  ];

  const syncRemote = useCallback(
    async <T,>(
      path: string,
      method: "POST" | "PATCH" | "PUT" | "DELETE",
      body?: unknown,
      onSuccess?: (result: T) => void,
    ) => {
      if (status !== "authenticated") return;
      try {
        const result = await apiRequest<T>(path, {
          method,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        onSuccess?.(result);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to sync changes with server.");
        void refreshData();
      }
    },
    [status, apiRequest, refreshData],
  );

  const value: AcsStoreContextValue = {
    data,
    isSyncing,
    refreshData,
    addCandidate: (candidate) => {
      const tempId = uid("c");
      setData((prev) => ({
        ...prev,
        candidates: [{ ...candidate, id: tempId }, ...prev.candidates],
        activities: pushActivity(
          prev,
          "New employee application added",
          `${candidate.fullName} registered for ${candidate.position}.`,
          "Recruitment",
        ),
      }));
      void syncRemote<Candidate>("/api/admin/candidates", "POST", candidate, (saved) => {
        if (!saved?.id) return;
        setData((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) => (c.id === tempId ? saved : c)),
        }));
      });
    },
    updateCandidate: (candidate) => {
      setData((prev) => ({
        ...prev,
        candidates: prev.candidates.map((c) => (c.id === candidate.id ? candidate : c)),
        activities: pushActivity(
          prev,
          "Employee application updated",
          `${candidate.fullName} status set to ${candidate.status}.`,
          "Recruitment",
        ),
      }));
      if (!isTempId(candidate.id)) {
        void syncRemote<Candidate>(
          `/api/admin/candidates/${candidate.id}`,
          "PATCH",
          candidate,
          (saved) => {
            if (!saved?.id) return;
            setData((prev) => ({
              ...prev,
              candidates: prev.candidates.map((c) => (c.id === saved.id ? saved : c)),
            }));
          },
        );
      }
    },
    deleteCandidate: (id) => {
      setData((prev) => {
        const target = prev.candidates.find((c) => c.id === id);
        return {
          ...prev,
          candidates: prev.candidates.filter((c) => c.id !== id),
          activities: pushActivity(
            prev,
            "Employee application removed",
            `${target?.fullName ?? "Candidate"} removed from recruitment pipeline.`,
            "Recruitment",
          ),
        };
      });
      if (!isTempId(id)) {
        void syncRemote(`/api/admin/candidates/${id}`, "DELETE");
      }
    },
    addUniformItem: (item) => {
      const tempId = uid("u");
      setData((prev) => ({
        ...prev,
        uniforms: [{ ...item, id: tempId, issuedQty: 0, lastUpdated: todayIso() }, ...prev.uniforms],
        stockLogs: [
          {
            id: uid("sl"),
            itemName: item.name,
            action: "Added",
            quantity: item.availableQty,
            date: todayIso(),
            note: `Initial stock (${item.size})`,
          },
          ...prev.stockLogs,
        ],
        activities: pushActivity(
          prev,
          "Uniform item added",
          `${item.name} (${item.availableQty} units) added to stock.`,
          "Uniforms",
        ),
      }));
      void syncRemote<UniformItem>("/api/admin/uniforms", "POST", item, (saved) => {
        if (!saved?.id) return;
        setData((prev) => ({
          ...prev,
          uniforms: prev.uniforms.map((u) => (u.id === tempId ? saved : u)),
        }));
      });
    },
    updateUniformItem: (id, updates) => {
      setData((prev) => ({
        ...prev,
        uniforms: prev.uniforms.map((u) => {
          if (u.id !== id) return u;
          const nextCategory = updates.category ?? u.category;
          const nextSub = updates.subCategory !== undefined ? updates.subCategory : (u.subCategory ?? "");
          const nextName = updates.name ?? (nextSub.trim() || nextCategory);
          return {
            ...u,
            ...updates,
            category: nextCategory,
            subCategory: nextSub,
            name: nextName,
            lastUpdated: todayIso(),
          };
        }),
        activities: pushActivity(
          prev,
          "Uniform item updated",
          `Updated ${updates.subCategory || updates.category || "item"} details/price.`,
          "Uniforms",
        ),
      }));
      if (!isTempId(id)) {
        void syncRemote<UniformItem>(`/api/admin/uniforms/${id}`, "PATCH", updates, (saved) => {
          if (!saved?.id) return;
          setData((prev) => ({
            ...prev,
            uniforms: prev.uniforms.map((u) => (u.id === saved.id ? saved : u)),
          }));
        });
      }
    },
    deleteUniformItem: (id) => {
      setData((prev) => {
        const target = prev.uniforms.find((u) => u.id === id);
        return {
          ...prev,
          uniforms: prev.uniforms.filter((u) => u.id !== id),
          activities: pushActivity(
            prev,
            "Uniform item removed",
            `${target?.subCategory || target?.category || "Uniform SKU"} deleted from inventory.`,
            "Uniforms",
          ),
        };
      });
      if (!isTempId(id)) {
        void syncRemote(`/api/admin/uniforms/${id}`, "DELETE");
      }
    },
    updateUniformStock: (id, delta, note) => {
      setData((prev) => {
        const item = prev.uniforms.find((u) => u.id === id);
        if (!item) return prev;
        const nextQty = Math.max(0, item.availableQty + delta);
        return {
          ...prev,
          uniforms: prev.uniforms.map((u) =>
            u.id === id ? { ...u, availableQty: nextQty, lastUpdated: todayIso() } : u,
          ),
          stockLogs: [
            {
              id: uid("sl"),
              itemName: item.name,
              action: "Restocked",
              quantity: delta,
              date: todayIso(),
              note: note || "Manual stock update",
            },
            ...prev.stockLogs,
          ],
          activities: pushActivity(
            prev,
            "Uniform stock updated",
            `${item.name} adjusted by ${delta >= 0 ? `+${delta}` : delta} units.`,
            "Uniforms",
          ),
        };
      });
      if (!isTempId(id)) {
        void syncRemote<UniformItem>(`/api/admin/uniforms/${id}/stock`, "PATCH", { delta, note });
      }
    },
    issueUniform: (payload) => {
      const target = data.uniforms.find((u) => u.id === payload.itemId);
      if (!target || target.availableQty < payload.quantity) return false;
      const tempId = uid("ui");
      setData((prev) => ({
        ...prev,
        uniforms: prev.uniforms.map((u) =>
          u.id === payload.itemId
            ? {
                ...u,
                availableQty: u.availableQty - payload.quantity,
                issuedQty: u.issuedQty + payload.quantity,
                lastUpdated: todayIso(),
              }
            : u,
        ),
        uniformIssues: [{ ...payload, id: tempId, status: "Issued" }, ...prev.uniformIssues],
        stockLogs: [
          {
            id: uid("sl"),
            itemName: payload.itemName,
            action: "Issued",
            quantity: payload.quantity,
            date: payload.issueDate,
            note: `Issued to ${payload.employeeName} (${payload.employeeId})`,
          },
          ...prev.stockLogs,
        ],
        activities: pushActivity(
          prev,
          "Uniform issued",
          `${payload.quantity}× ${payload.itemName} issued to ${payload.employeeName}.`,
          "Uniforms",
        ),
      }));
      if (!isTempId(payload.itemId)) {
        void syncRemote<UniformIssueRecord>("/api/admin/uniform-issues", "POST", payload, (saved) => {
          if (!saved?.id) return;
          setData((prev) => ({
            ...prev,
            uniformIssues: prev.uniformIssues.map((i) => (i.id === tempId ? saved : i)),
          }));
        });
      }
      return true;
    },
    issueUniformBatch: async (payload) => {
      const requestedMap = new Map<string, number>();
      for (const line of payload.items) {
        if (line.quantity < 1) {
          return { ok: false, message: "Each selected item must have quantity >= 1." };
        }
        requestedMap.set(line.itemId, (requestedMap.get(line.itemId) ?? 0) + line.quantity);
      }
      if (requestedMap.size === 0) {
        return { ok: false, message: "Select at least one uniform or accessory item to issue." };
      }

      for (const [itemId, totalQty] of requestedMap.entries()) {
        const sku = data.uniforms.find((u) => u.id === itemId);
        if (!sku) return { ok: false, message: "Selected uniform SKU no longer exists." };
        if (sku.availableQty < totalQty) {
          const label = sku.subCategory || sku.category;
          return {
            ok: false,
            message: `Insufficient stock for ${label} (${sku.size}): only ${sku.availableQty} available.`,
          };
        }
      }

      const batchId = uid("batch");
      const tempIssues: UniformIssueRecord[] = payload.items.map((line, index) => {
        const sku = data.uniforms.find((u) => u.id === line.itemId)!;
        const regFee = index === 0 ? Math.max(0, Number(payload.registrationCharge) || 0) : 0;
        const lineSubtotal = line.quantity * line.unitPrice;
        return {
          id: uid(`ui-${index}`),
          batchId,
          employeeId: payload.employeeId,
          employeeName: payload.employeeName,
          site: payload.site,
          itemId: sku.id,
          itemName: sku.subCategory || sku.category,
          category: sku.category,
          subCategory: sku.subCategory ?? "",
          size: sku.size,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          registrationCharge: regFee,
          totalAmount: lineSubtotal + regFee,
          issueDate: payload.issueDate,
          remarks: payload.remarks ?? "",
          status: "Issued",
        };
      });

      const newLogs = tempIssues.map((iss, idx) => ({
        id: uid(`sl-${idx}`),
        itemName: iss.itemName,
        action: "Issued" as const,
        quantity: iss.quantity,
        date: iss.issueDate,
        note: `Issued to ${iss.employeeName} (${iss.employeeId})`,
      }));

      setData((prev) => ({
        ...prev,
        uniforms: prev.uniforms.map((u) => {
          const usedQty = requestedMap.get(u.id);
          if (!usedQty) return u;
          return {
            ...u,
            availableQty: Math.max(0, u.availableQty - usedQty),
            issuedQty: u.issuedQty + usedQty,
            lastUpdated: todayIso(),
          };
        }),
        uniformIssues: [...tempIssues, ...prev.uniformIssues],
        stockLogs: [...newLogs, ...prev.stockLogs],
        activities: pushActivity(
          prev,
          "Uniform kit issued",
          `Issued ${payload.items.length} item line(s) to ${payload.employeeName} (${payload.employeeId}).`,
          "Uniforms",
        ),
      }));

      const hasRemoteItems = payload.items.every((line) => !isTempId(line.itemId));
      if (status === "authenticated" && hasRemoteItems) {
        try {
          const savedResult = await apiRequest<{
            issues?: UniformIssueRecord[];
            uniforms?: UniformItem[];
            stockLogs?: UniformStockLog[];
          }>("/api/admin/uniform-issues/batch", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          setData((prev) => {
            const tempIdSet = new Set(tempIssues.map((t) => t.id));
            const tempLogIdSet = new Set(newLogs.map((t) => t.id));
            const remoteIssues = Array.isArray(savedResult?.issues) ? savedResult.issues : [];
            const remoteLogs = Array.isArray(savedResult?.stockLogs) ? savedResult.stockLogs : [];
            const remoteUniformMap = new Map(
              (Array.isArray(savedResult?.uniforms) ? savedResult.uniforms : []).map((u) => [u.id, u]),
            );
            return {
              ...prev,
              uniforms: prev.uniforms.map((u) => remoteUniformMap.get(u.id) ?? u),
              uniformIssues: [
                ...remoteIssues,
                ...prev.uniformIssues.filter((i) => !tempIdSet.has(i.id)),
              ],
              stockLogs:
                remoteLogs.length > 0
                  ? [...remoteLogs, ...prev.stockLogs.filter((l) => !tempLogIdSet.has(l.id))]
                  : prev.stockLogs,
            };
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to issue uniform kit on server.";
          toast.error(msg);
          void refreshData();
          return { ok: false, message: msg };
        }
      }

      return { ok: true };
    },
    returnUniform: (issueId) => {
      const tempLogId = uid("sl-ret");
      setData((prev) => {
        const issue = prev.uniformIssues.find((i) => i.id === issueId);
        if (!issue || issue.status === "Returned") return prev;
        return {
          ...prev,
          uniforms: prev.uniforms.map((u) =>
            u.id === issue.itemId
              ? {
                  ...u,
                  availableQty: u.availableQty + issue.quantity,
                  issuedQty: Math.max(0, u.issuedQty - issue.quantity),
                  lastUpdated: todayIso(),
                }
              : u,
          ),
          uniformIssues: prev.uniformIssues.map((i) =>
            i.id === issueId ? { ...i, status: "Returned", returnDate: todayIso() } : i,
          ),
          stockLogs: [
            {
              id: tempLogId,
              itemName: issue.itemName,
              action: "Returned",
              quantity: issue.quantity,
              date: todayIso(),
              note: `Returned by ${issue.employeeName} (${issue.employeeId})`,
            },
            ...prev.stockLogs,
          ],
          activities: pushActivity(
            prev,
            "Uniform returned",
            `${issue.quantity}× ${issue.itemName} returned by ${issue.employeeName}.`,
            "Uniforms",
          ),
        };
      });
      if (!isTempId(issueId)) {
        void syncRemote<{
          issue?: UniformIssueRecord;
          uniform?: UniformItem | null;
          stockLog?: UniformStockLog;
        }>(`/api/admin/uniform-issues/${issueId}/return`, "PATCH", undefined, (result) => {
          if (!result) return;
          setData((prev) => ({
            ...prev,
            uniformIssues: result.issue
              ? prev.uniformIssues.map((i) => (i.id === result.issue!.id ? result.issue! : i))
              : prev.uniformIssues,
            uniforms: result.uniform
              ? prev.uniforms.map((u) => (u.id === result.uniform!.id ? result.uniform! : u))
              : prev.uniforms,
            stockLogs: result.stockLog
              ? prev.stockLogs.map((l) => (l.id === tempLogId ? result.stockLog! : l))
              : prev.stockLogs,
          }));
        });
      }
    },
    upsertAttendance: (record, editId) => {
      const defaults = getDefaultDutyForStatus(record.status);
      const normalizedRecord: Omit<AttendanceRecord, "id"> = {
        ...record,
        normalDuty: record.normalDuty ?? defaults.normalDuty,
        extraDuty: record.extraDuty ?? defaults.extraDuty,
      };
      const existingMatch = !editId
        ? data.attendance.find((a) => {
            if (a.date !== normalizedRecord.date) return false;
            const recId = a.employeeId.trim().toUpperCase();
            const nextId = normalizedRecord.employeeId.trim().toUpperCase();
            if (nextId && recId && recId === nextId) return true;
            return (
              a.employeeName.trim().toLowerCase() === normalizedRecord.employeeName.trim().toLowerCase() &&
              a.location.trim().toLowerCase() === normalizedRecord.location.trim().toLowerCase()
            );
          })
        : undefined;
      const resolvedEditId = editId ?? existingMatch?.id;
      const tempId = resolvedEditId ?? uid("a");

      setData((prev) => ({
        ...prev,
        attendance: resolvedEditId
          ? prev.attendance.map((a) =>
              a.id === resolvedEditId ? { ...normalizedRecord, id: resolvedEditId } : a,
            )
          : [{ ...normalizedRecord, id: tempId }, ...prev.attendance],
        activities: pushActivity(
          prev,
          resolvedEditId ? "Attendance updated" : "Attendance marked",
          `${normalizedRecord.employeeName} marked ${normalizedRecord.status} for ${normalizedRecord.date}.`,
          "Attendance",
        ),
      }));

      if (resolvedEditId && !isTempId(resolvedEditId)) {
        void syncRemote<AttendanceRecord>(
          `/api/admin/attendance/${resolvedEditId}`,
          "PATCH",
          normalizedRecord,
          (saved) => {
            if (!saved?.id) return;
            setData((prev) => ({
              ...prev,
              attendance: prev.attendance.map((a) => (a.id === saved.id ? saved : a)),
            }));
          },
        );
      } else {
        void syncRemote<AttendanceRecord>("/api/admin/attendance", "POST", normalizedRecord, (saved) => {
          if (!saved?.id) return;
          setData((prev) => ({
            ...prev,
            attendance: prev.attendance.map((a) => (a.id === tempId ? saved : a)),
          }));
        });
      }
    },
    upsertAttendanceBatch: async (records) => {
      if (records.length === 0) return;
      const enriched = records.map((rec) => {
        const defaults = getDefaultDutyForStatus(rec.status);
        return {
          ...rec,
          normalDuty: rec.normalDuty ?? defaults.normalDuty,
          extraDuty: rec.extraDuty ?? defaults.extraDuty,
        };
      });

      const matchesSameEntry = (a: AttendanceRecord, b: Omit<AttendanceRecord, "id">) => {
        if (a.date !== b.date) return false;
        const aId = a.employeeId.trim().toUpperCase();
        const bId = b.employeeId.trim().toUpperCase();
        if (aId && bId && aId === bId) return true;
        return (
          a.employeeName.trim().toLowerCase() === b.employeeName.trim().toLowerCase() &&
          a.location.trim().toLowerCase() === b.location.trim().toLowerCase()
        );
      };

      const tempEntries: AttendanceRecord[] = [];
      setData((prev) => {
        const updatedList = [...prev.attendance];
        for (const rec of enriched) {
          const idx = updatedList.findIndex((existing) => matchesSameEntry(existing, rec));
          if (idx >= 0) {
            updatedList[idx] = { ...rec, id: updatedList[idx]!.id };
          } else {
            const newEntry = { ...rec, id: uid("ab") };
            tempEntries.push(newEntry);
            updatedList.unshift(newEntry);
          }
        }
        return {
          ...prev,
          attendance: updatedList,
          activities: pushActivity(
            prev,
            "Attendance updated",
            `Updated ${enriched.length} attendance record(s).`,
            "Attendance",
          ),
        };
      });

      if (status === "authenticated") {
        try {
          const savedResult = await apiRequest<{ records?: AttendanceRecord[] }>(
            "/api/admin/attendance/batch",
            {
              method: "POST",
              body: JSON.stringify({ records: enriched }),
            },
          );
          const serverRecords = Array.isArray(savedResult?.records) ? savedResult.records : [];
          if (serverRecords.length > 0) {
            setData((prev) => {
              const merged = prev.attendance.filter(
                (existing) => !serverRecords.some((srv) => matchesSameEntry(existing, srv)),
              );
              return {
                ...prev,
                attendance: [...serverRecords, ...merged],
              };
            });
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save batch attendance.");
          void refreshData();
        }
      }
    },
    bulkUpdateAttendance: (ids, statusValue) => {
      const defaults = getDefaultDutyForStatus(statusValue);
      setData((prev) => ({
        ...prev,
        attendance: prev.attendance.map((a) =>
          ids.includes(a.id)
            ? {
                ...a,
                status: statusValue,
                normalDuty: defaults.normalDuty,
                extraDuty: defaults.extraDuty,
                checkIn:
                  statusValue === "Present" || statusValue === "Half Day" || statusValue === "Double Duty"
                    ? a.checkIn === "—"
                      ? defaults.checkIn
                      : a.checkIn
                    : "—",
                checkOut: defaults.checkOut,
                workingHours: defaults.workingHours,
              }
            : a,
        ),
        activities: pushActivity(
          prev,
          "Bulk attendance updated",
          `${ids.length} employees marked as ${statusValue}.`,
          "Attendance",
        ),
      }));
      const persistedIds = ids.filter((id) => !isTempId(id));
      if (persistedIds.length > 0) {
        void syncRemote("/api/admin/attendance/bulk", "PATCH", {
          ids: persistedIds,
          status: statusValue,
        });
      }
    },
    addEmployeeQuick: (emp) => {
      const tempAttId = uid("a");
      const tempSalId = uid("sal");
      setData((prev) => {
        const month = prev.settings.defaultMonth;
        const newAttendance: AttendanceRecord = {
          id: tempAttId,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          designation: emp.designation,
          location: emp.location,
          date: todayIso(),
          checkIn: "08:00",
          checkOut: "16:00",
          workingHours: "8h 00m",
          status: "Present",
        };
        const newSalary: SalaryRecord = {
          id: tempSalId,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          designation: emp.designation,
          department: "Field Operations",
          category: "Security Personnel",
          location: emp.location,
          month,
          year: "2026",
          basicSalary: emp.basicSalary,
          allowances: Math.round(emp.basicSalary * 0.2),
          overtime: 0,
          otherEarnings: 0,
          pfDeduction: 1800,
          esiDeduction: 140,
          otherDeductions: 0,
          status: "Pending",
        };
        return {
          ...prev,
          attendance: [newAttendance, ...prev.attendance],
          salaries: [newSalary, ...prev.salaries],
          activities: pushActivity(
            prev,
            "Employee added",
            `${emp.name} (${emp.employeeId}) assigned to ${emp.location}.`,
            "Operations",
          ),
        };
      });
      void syncRemote<{ attendance?: AttendanceRecord; salary?: SalaryRecord }>(
        "/api/admin/employees/quick",
        "POST",
        emp,
        (saved) => {
          setData((prev) => ({
            ...prev,
            attendance: saved?.attendance
              ? prev.attendance.map((a) => (a.id === tempAttId ? saved.attendance! : a))
              : prev.attendance,
            salaries: saved?.salary
              ? prev.salaries.map((s) => (s.id === tempSalId ? saved.salary! : s))
              : prev.salaries,
          }));
        },
      );
    },
    updateSalary: (record) => {
      setData((prev) => ({
        ...prev,
        salaries: prev.salaries.map((s) => (s.id === record.id ? record : s)),
        activities: pushActivity(
          prev,
          "Salary components edited",
          `Updated salary structure for ${record.employeeName}.`,
          "Payroll",
        ),
      }));
      if (!isTempId(record.id)) {
        void syncRemote(`/api/admin/salaries/${record.id}`, "PATCH", record);
      }
    },
    processSalary: (id) => {
      setData((prev) => {
        const target = prev.salaries.find((s) => s.id === id);
        if (!target) return prev;
        const existingSlip = prev.payslips.find(
          (p) => p.employeeId === target.employeeId && p.salaryMonth === target.month,
        );
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
          payslips: existingSlip
            ? prev.payslips.map((p) => (p.id === existingSlip.id ? generatedSlip : p))
            : [generatedSlip, ...prev.payslips],
          activities: pushActivity(
            prev,
            "Salary processed",
            `Processed ${target.month} salary for ${target.employeeName}.`,
            "Payroll",
          ),
        };
      });
      if (!isTempId(id)) {
        void syncRemote(`/api/admin/salaries/${id}/process`, "PATCH", undefined, () => {
          void refreshData();
        });
      }
    },
    processAllPendingSalaries: (month) => {
      const pending = data.salaries.filter(
        (s) => s.status === "Pending" && (month === "All" || s.month === month),
      );
      if (pending.length === 0) return 0;
      setData((prev) => ({
        ...prev,
        salaries: prev.salaries.map((s) =>
          s.status === "Pending" && (month === "All" || s.month === month)
            ? { ...s, status: "Processed" }
            : s,
        ),
        payslips: prev.payslips.map((p) =>
          p.status === "Pending" ? { ...p, status: "Generated", generatedDate: todayIso() } : p,
        ),
        activities: pushActivity(
          prev,
          "Batch salary generated",
          `Processed ${pending.length} pending payroll records.`,
          "Payroll",
        ),
      }));
      void syncRemote("/api/admin/salaries/process-all", "PATCH", { month }, () => {
        void refreshData();
      });
      return pending.length;
    },
    regeneratePayslip: (id) => {
      setData((prev) => {
        const slip = prev.payslips.find((p) => p.id === id);
        return {
          ...prev,
          payslips: prev.payslips.map((p) =>
            p.id === id ? { ...p, status: "Generated", generatedDate: todayIso() } : p,
          ),
          activities: pushActivity(
            prev,
            "Payslip regenerated",
            `Regenerated ${slip?.payslipId ?? "payslip"} for ${slip?.employeeName ?? "employee"}.`,
            "Payslips",
          ),
        };
      });
      if (!isTempId(id)) {
        void syncRemote(`/api/admin/payslips/${id}/regenerate`, "PATCH");
      }
    },
    addInvoice: (invoice) => {
      const tempId = uid("inv");
      setData((prev) => ({
        ...prev,
        invoices: [{ ...invoice, id: tempId }, ...prev.invoices],
        activities: pushActivity(
          prev,
          "New invoice created",
          `${invoice.invoiceNumber} generated for ${invoice.clientName}.`,
          "Billing",
        ),
      }));
      void syncRemote<InvoiceRecord>("/api/admin/invoices", "POST", invoice, (saved) => {
        if (!saved?.id) return;
        setData((prev) => ({
          ...prev,
          invoices: prev.invoices.map((i) => (i.id === tempId ? saved : i)),
        }));
      });
    },
    updateInvoice: (invoice) => {
      setData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoice.id ? invoice : i)),
        activities: pushActivity(
          prev,
          "Invoice updated",
          `Updated billing details for ${invoice.invoiceNumber}.`,
          "Billing",
        ),
      }));
      if (!isTempId(invoice.id)) {
        void syncRemote(`/api/admin/invoices/${invoice.id}`, "PATCH", invoice);
      }
    },
    markInvoicePaid: (id) => {
      setData((prev) => {
        const inv = prev.invoices.find((i) => i.id === id);
        return {
          ...prev,
          invoices: prev.invoices.map((i) => (i.id === id ? { ...i, status: "Paid" } : i)),
          activities: pushActivity(
            prev,
            "Invoice marked paid",
            `${inv?.invoiceNumber ?? "Invoice"} marked as Paid.`,
            "Billing",
          ),
        };
      });
      if (!isTempId(id)) {
        void syncRemote(`/api/admin/invoices/${id}/mark-paid`, "PATCH");
      }
    },
    updateSettings: (partial) => {
      setData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...partial },
        activities: pushActivity(
          prev,
          "Settings saved",
          "Updated company and administrator preferences.",
          "Settings",
        ),
      }));
      void syncRemote<AcsSettings>("/api/admin/settings", "PUT", partial, (saved) => {
        if (!saved) return;
        setData((prev) => ({
          ...prev,
          settings: { ...prev.settings, ...saved },
        }));
      });
    },
    recordActivity: (title, detail, module) => {
      setData((prev) => ({
        ...prev,
        activities: pushActivity(prev, title, detail, module),
      }));
    },
  };

  return <AcsStoreContext.Provider value={value}>{children}</AcsStoreContext.Provider>;
}

export function useAcsStore(): AcsStoreContextValue {
  const ctx = useContext(AcsStoreContext);
  if (!ctx) throw new Error("useAcsStore must be used inside AcsStoreProvider");
  return ctx;
}
