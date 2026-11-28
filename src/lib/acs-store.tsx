import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { INITIAL_ACS_DATA, UNIFORM_DEFAULT_PRICES } from "./acs-seed";
import { getDefaultDutyForStatus } from "./attendance-utils";
import { useAuth } from "./auth";
import { inferDepartmentCode } from "./employee-id";
import { numberToIndianCurrencyWords } from "./finance-utils";
import type {
  AcsSettings,
  AcsStoreData,
  AdvanceRecoveryMode,
  AdvanceSignatures,
  AdvanceStatus,
  AttendanceRecord,
  AttendanceSiteSummaryItem,
  AttendanceStatus,
  BankAdviceResponse,
  BillingRuleProfileRecord,
  Candidate,
  ComplianceExportResponse,
  EmployeeRateType,
  EmployeeRecord,
  InvoiceDeductionCategory,
  InvoicePaymentStage,
  InvoiceRecord,
  MusterApprovalSavePayload,
  OnboardingImportPayload,
  OnboardingImportSummary,
  OnboardingValidationError,
  PaginationMeta,
  PaymentMode,
  PayrollRunRecord,
  PayrollRunStatus,
  PayslipRecord,
  SalaryAdvanceRecord,
  SalaryLineItemRecord,
  SalaryPayoutStatus,
  SalaryRecord,
  SalaryRuleProfileRecord,
  SiteGstMode,
  SiteMatrixResponse,
  SiteMusterApproval,
  SiteRecord,
  UniformIssueMode,
  UniformIssueRecord,
  UniformItem,
  UniformRecoveryMode,
  UniformRecoveryPlan,
  UniformRecoveryStatus,
  UniformStockLog,
  UploadedDocumentFile,
  VoucherBankTransferDetails,
  VoucherChequeDetails,
  VoucherPurposeType,
  VoucherRecord,
  VoucherUpiDetails,
} from "./acs-types";

const STORAGE_KEY = "acs_admin_panel_state_v2";

const EMPTY_DATA: AcsStoreData = {
  sites: [],
  employees: [],
  candidates: [],
  uniforms: [],
  uniformIssues: [],
  uniformRecoveryPlans: [],
  stockLogs: [],
  attendance: [],
  statutory: [],
  salaries: [],
  salaryAdvances: [],
  vouchers: [],
  salaryRuleProfiles: [],
  payrollRuns: [],
  billingRuleProfiles: [],
  payslips: [],
  invoices: [],
  activities: [],
  settings: INITIAL_ACS_DATA.settings,
};

export interface PaginatedSitesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: "All" | "true" | "false";
  gstMode?: string;
}

export interface PaginatedSitesResult {
  items: SiteRecord[];
  pagination: PaginationMeta;
  summary: {
    totalSites: number;
    activeSites: number;
    inactiveSites: number;
    totalAssignedEmployees: number;
  };
}

export interface PaginatedEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: string;
  siteName?: string;
  status?: string;
  designation?: string;
}

export interface PaginatedEmployeesResult {
  items: EmployeeRecord[];
  pagination: PaginationMeta;
  summary: {
    total: number;
    active: number;
    onHold: number;
    left: number;
    transferred: number;
  };
  designations: string[];
}

export interface DeployCandidatePayload {
  siteId?: string;
  siteName?: string;
  subUnit?: string;
  designation?: string;
  empCode?: string;
  legacyEmpCode?: string;
  rateType?: EmployeeRateType;
  baseRate?: number;
  dateOfJoining?: string;
  originalIdCustody?: EmployeeRecord["originalIdCustody"];
}

export interface CoreMigrationResult {
  sitesCreated: number;
  sitesExisting: number;
  candidatesLinked: number;
  employeesCreated: number;
  employeesExisting: number;
}

export interface UniformBatchIssuePayload {
  issueMode?: UniformIssueMode;
  serialNo?: string;
  employeeId: string;
  legacyEmpCode?: string;
  employeeName: string;
  mobile?: string;
  site: string;
  issueDate: string;
  registrationCharge: number;
  issuedBy?: string;
  receivedBy?: string;
  verifiedBy?: string;
  originalDocHeld?: string;
  billToSite?: boolean;
  remarks?: string;
  items: { itemId: string; quantity: number; unitPrice: number }[];
  recoveryPlan?: {
    createPlan?: boolean;
    recoveryMode: UniformRecoveryMode;
    installmentCount?: number;
    monthlyAmount?: number;
    startMonth?: string;
    remarks?: string;
  };
}

export interface UniformRecoveryPlansParams {
  page?: number;
  limit?: number;
  search?: string;
  site?: string;
  status?: string;
  month?: string;
}

export interface UniformRecoveryPlansResult {
  items: UniformRecoveryPlan[];
  pagination: PaginationMeta;
  summary: {
    activePlans: number;
    totalOutstanding: number;
    totalRecovered: number;
  };
}

interface AcsStoreContextValue {
  data: AcsStoreData;
  isSyncing: boolean;
  refreshData: () => Promise<void>;
  fetchSitesPaginated: (params?: PaginatedSitesParams) => Promise<PaginatedSitesResult>;
  createSite: (payload: Omit<SiteRecord, "id" | "employeeCount">) => Promise<SiteRecord | null>;
  updateSite: (site: SiteRecord) => Promise<SiteRecord | null>;
  deleteSite: (id: string, archive?: boolean) => Promise<boolean>;
  fetchEmployeesPaginated: (params?: PaginatedEmployeesParams) => Promise<PaginatedEmployeesResult>;
  createEmployee: (payload: Omit<EmployeeRecord, "id">) => Promise<EmployeeRecord | null>;
  updateEmployee: (employee: EmployeeRecord) => Promise<EmployeeRecord | null>;
  deleteEmployee: (id: string, mode?: "delete" | "left") => Promise<boolean>;
  previewNextEmployeeCode: (designation?: string, year?: string) => Promise<string>;
  deployCandidateToEmployee: (
    candidateId: string,
    payload: DeployCandidatePayload,
  ) => Promise<{ candidate: Candidate; employee: EmployeeRecord } | null>;
  runCoreMigration: () => Promise<CoreMigrationResult | null>;
  importOnboardingData: (payload: OnboardingImportPayload) => Promise<OnboardingImportSummary | null>;
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
  syncUniformRateCard: (overwriteAll?: boolean) => Promise<{ updatedCount: number; createdCount: number } | null>;
  issueUniform: (payload: Omit<UniformIssueRecord, "id" | "status">) => boolean;
  issueUniformBatch: (payload: UniformBatchIssuePayload) => Promise<{ ok: boolean; message?: string }>;
  returnUniform: (issueId: string, returnQty?: number, remarks?: string) => void;
  fetchUniformRecoveryPlans: (params?: UniformRecoveryPlansParams) => Promise<UniformRecoveryPlansResult>;
  fetchUniformPayrollPreview: (
    month: string,
    site?: string,
  ) => Promise<{
    month: string;
    totalDueThisMonth: number;
    items: Array<UniformRecoveryPlan & { dueThisMonth: number; carriedForwardAfter: number }>;
  }>;
  createUniformRecoveryPlan: (payload: {
    employeeId?: string;
    legacyEmpCode?: string;
    employeeName: string;
    siteName: string;
    totalCharge: number;
    recoveryMode: UniformRecoveryMode;
    installmentCount?: number;
    monthlyAmount?: number;
    startMonth: string;
    recoveredAmount?: number;
    remarks?: string;
  }) => Promise<UniformRecoveryPlan | null>;
  updateUniformRecoveryPlan: (
    id: string,
    updates: {
      recoveryMode?: UniformRecoveryMode;
      installmentCount?: number;
      monthlyAmount?: number;
      startMonth?: string;
      status?: UniformRecoveryStatus;
      remarks?: string;
      recordDeductionAmount?: number;
      deductMonth?: string;
      source?: "PAYROLL" | "MANUAL";
      note?: string;
    },
  ) => Promise<UniformRecoveryPlan | null>;
  upsertAttendance: (record: Omit<AttendanceRecord, "id">, editId?: string) => void;
  upsertAttendanceBatch: (records: Array<Omit<AttendanceRecord, "id">>) => Promise<void>;
  bulkUpdateAttendance: (ids: string[], status: AttendanceStatus) => void;
  fetchAttendanceSiteSummary: (
    month: string,
    date: string,
  ) => Promise<AttendanceSiteSummaryItem[] | null>;
  fetchSiteMusterMatrix: (params: {
    site: string;
    siteId?: string;
    month: string;
    page?: number;
    limit?: number;
    search?: string;
    relieverOnly?: boolean;
  }) => Promise<SiteMatrixResponse | null>;
  fetchMusterApproval: (
    siteName: string,
    monthKey: string,
    subUnit?: string,
  ) => Promise<SiteMusterApproval | null>;
  saveMusterApproval: (payload: MusterApprovalSavePayload) => Promise<SiteMusterApproval | null>;
  uploadMusterScan: (file: File) => Promise<UploadedDocumentFile>;
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
  setSalaryHoldStatus: (
    id: string,
    payoutStatus: SalaryPayoutStatus,
    holdReason?: string,
  ) => Promise<void>;
  fetchSalaryAdvances: (params?: {
    page?: number;
    limit?: number;
    month?: string;
    status?: string;
    site?: string;
    search?: string;
  }) => Promise<{
    items: SalaryAdvanceRecord[];
    pagination: PaginationMeta;
    summary: {
      openCount: number;
      totalIssued: number;
      totalRecovered: number;
      totalOutstanding: number;
    };
  }>;
  fetchAdvancePayrollPreview: (
    month: string,
    site?: string,
  ) => Promise<{
    month: string;
    totalDueThisMonth: number;
    items: Array<SalaryAdvanceRecord & { dueThisMonth: number; carriedForwardAfter: number }>;
  }>;
  createSalaryAdvance: (payload: {
    staffNo?: number;
    date: string;
    employeeId?: string;
    legacyEmpCode?: string;
    employeeName: string;
    onAccountOf: string;
    amount: number;
    recoveryMode: AdvanceRecoveryMode;
    installmentCount?: number;
    targetPayrollMonth?: string;
    signatures?: Partial<AdvanceSignatures>;
    remarks?: string;
    issueVoucher?: boolean;
    paymentMode?: PaymentMode;
    chequeDetails?: Partial<VoucherChequeDetails>;
    bankTransferDetails?: Partial<VoucherBankTransferDetails>;
    upiDetails?: Partial<VoucherUpiDetails>;
    particulars?: string;
    debitHead?: string;
  }) => Promise<{ advance: SalaryAdvanceRecord; voucher?: VoucherRecord } | null>;
  updateSalaryAdvance: (
    id: string,
    updates: {
      status?: AdvanceStatus;
      targetPayrollMonth?: string;
      signatures?: Partial<AdvanceSignatures>;
      remarks?: string;
      recordDeductionAmount?: number;
      deductMonth?: string;
      source?: "PAYROLL" | "MANUAL";
      note?: string;
    },
  ) => Promise<SalaryAdvanceRecord | null>;
  previewNextVoucherNo: () => Promise<number>;
  fetchVouchers: (params?: {
    page?: number;
    limit?: number;
    month?: string;
    paymentMode?: string;
    purposeType?: string;
    status?: string;
    search?: string;
  }) => Promise<{
    items: VoucherRecord[];
    pagination: PaginationMeta;
    summary: {
      totalCount: number;
      totalAmount: number;
      byMode: Record<string, number>;
    };
  }>;
  createVoucher: (payload: {
    voucherNo?: number;
    date: string;
    debitHead: string;
    purposeType: VoucherPurposeType;
    payeeName: string;
    employeeId?: string;
    onAccountOf?: string;
    particulars: string;
    amount: number;
    amountInWords?: string;
    paymentMode: PaymentMode;
    chequeDetails?: Partial<VoucherChequeDetails>;
    bankTransferDetails?: Partial<VoucherBankTransferDetails>;
    upiDetails?: Partial<VoucherUpiDetails>;
    salaryAdvanceId?: string;
    salaryId?: string;
    salaryLineItemId?: string;
    preparedBy?: string;
    approvedBy?: string;
    receivedBy?: string;
    remarks?: string;
  }) => Promise<{ voucher: VoucherRecord; salary?: SalaryRecord; salaryLineItem?: SalaryLineItemRecord } | null>;
  cancelVoucher: (id: string) => Promise<boolean>;
  fetchSalaryRuleProfiles: (params?: { search?: string; siteId?: string }) => Promise<SalaryRuleProfileRecord[]>;
  createSalaryRuleProfile: (payload: Partial<SalaryRuleProfileRecord>) => Promise<SalaryRuleProfileRecord | null>;
  updateSalaryRuleProfile: (
    id: string,
    updates: Partial<SalaryRuleProfileRecord>,
  ) => Promise<SalaryRuleProfileRecord | null>;
  deleteSalaryRuleProfile: (id: string) => Promise<boolean>;
  fetchPayrollRuns: (params?: {
    monthKey?: string;
    siteName?: string;
    status?: string;
  }) => Promise<PayrollRunRecord[]>;
  fetchPayrollRunDetail: (
    id: string,
  ) => Promise<{ run: PayrollRunRecord; lineItems: SalaryLineItemRecord[] } | null>;
  generatePayrollRun: (payload: {
    monthKey: string;
    siteName: string;
    siteId?: string;
    ruleProfileId?: string;
    defaultPresentDays?: number;
    autoPullRecoveries?: boolean;
    manualEntries?: Array<Record<string, unknown>>;
  }) => Promise<{
    run: PayrollRunRecord;
    ruleProfile: SalaryRuleProfileRecord;
    lineItems: SalaryLineItemRecord[];
  } | null>;
  updatePayrollLineItem: (
    lineId: string,
    updates: Partial<SalaryLineItemRecord>,
  ) => Promise<{ lineItem: SalaryLineItemRecord; run: PayrollRunRecord | null } | null>;
  updatePayrollRunStatus: (runId: string, nextStatus: PayrollRunStatus) => Promise<PayrollRunRecord | null>;
  fetchPayrollBankAdvice: (runId: string) => Promise<BankAdviceResponse | null>;
  fetchComplianceExport: (params?: {
    monthKey?: string;
    siteName?: string;
  }) => Promise<ComplianceExportResponse | null>;
  regeneratePayslip: (id: string) => void;
  addInvoice: (invoice: Omit<InvoiceRecord, "id">) => void;
  updateInvoice: (invoice: InvoiceRecord) => void;
  markInvoicePaid: (id: string) => void;
  fetchBillingRuleProfiles: (params?: { search?: string; siteId?: string }) => Promise<BillingRuleProfileRecord[]>;
  createBillingRuleProfile: (payload: Partial<BillingRuleProfileRecord>) => Promise<BillingRuleProfileRecord | null>;
  updateBillingRuleProfile: (
    id: string,
    updates: Partial<BillingRuleProfileRecord>,
  ) => Promise<BillingRuleProfileRecord | null>;
  previewNextInvoiceNumber: (invoiceDate?: string) => Promise<string>;
  generateSiteInvoice: (payload: {
    siteName: string;
    siteId?: string;
    subUnit?: string;
    periodMonths: string[];
    ruleProfileId?: string;
    customRate?: number;
    fallbackDays?: number;
    invoiceDate?: string;
  }) => Promise<{ invoice: InvoiceRecord; ruleProfile: BillingRuleProfileRecord } | null>;
  addInvoiceDeduction: (
    invoiceId: string,
    payload: {
      category: InvoiceDeductionCategory;
      amount: number;
      note?: string;
      recordedAt?: string;
    },
  ) => Promise<InvoiceRecord | null>;
  recordInvoiceReceipt: (
    invoiceId: string,
    payload: {
      receiptDate: string;
      amount: number;
      paymentMode: PaymentMode;
      referenceNo?: string;
      bankName?: string;
      note?: string;
    },
  ) => Promise<InvoiceRecord | null>;
  updateInvoicePaymentStage: (
    invoiceId: string,
    paymentStage: InvoicePaymentStage,
  ) => Promise<InvoiceRecord | null>;
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
    sites: Array.isArray(payload?.sites) ? payload.sites : [],
    employees: Array.isArray(payload?.employees) ? payload.employees : [],
    candidates: Array.isArray(payload?.candidates) ? payload.candidates : [],
    uniforms: Array.isArray(payload?.uniforms) ? payload.uniforms : [],
    uniformIssues: Array.isArray(payload?.uniformIssues) ? payload.uniformIssues : [],
    uniformRecoveryPlans: Array.isArray(payload?.uniformRecoveryPlans) ? payload.uniformRecoveryPlans : [],
    stockLogs: Array.isArray(payload?.stockLogs) ? payload.stockLogs : [],
    attendance: Array.isArray(payload?.attendance) ? payload.attendance : [],
    statutory: Array.isArray(payload?.statutory) ? payload.statutory : [],
    salaries: Array.isArray(payload?.salaries) ? payload.salaries : [],
    salaryAdvances: Array.isArray(payload?.salaryAdvances) ? payload.salaryAdvances : [],
    vouchers: Array.isArray(payload?.vouchers) ? payload.vouchers : [],
    salaryRuleProfiles: Array.isArray(payload?.salaryRuleProfiles) ? payload.salaryRuleProfiles : [],
    payrollRuns: Array.isArray(payload?.payrollRuns) ? payload.payrollRuns : [],
    billingRuleProfiles: Array.isArray(payload?.billingRuleProfiles) ? payload.billingRuleProfiles : [],
    payslips: Array.isArray(payload?.payslips) ? payload.payslips : [],
    invoices: Array.isArray(payload?.invoices) ? payload.invoices : [],
    activities: Array.isArray(payload?.activities) ? payload.activities : [],
    settings: { ...INITIAL_ACS_DATA.settings, ...(payload?.settings ?? {}) },
  };
}

export function AcsStoreProvider({ children }: { children: ReactNode }) {
  const { status, apiRequest, apiRequestRaw } = useAuth();
  const [data, setData] = useState<AcsStoreData>(EMPTY_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [musterApprovals, setMusterApprovals] = useState<Record<string, SiteMusterApproval>>({});

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

  const buildLocalPagination = (total: number, page: number, limit: number): PaginationMeta => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  };

  const value: AcsStoreContextValue = {
    data,
    isSyncing,
    refreshData,
    fetchSitesPaginated: async (params = {}) => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 25;
      if (status === "authenticated") {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        if (params.search?.trim()) qs.set("search", params.search.trim());
        if (params.isActive && params.isActive !== "All") qs.set("isActive", params.isActive);
        if (params.gstMode && params.gstMode !== "All") qs.set("gstMode", params.gstMode);
        const res = await apiRequestRaw<{
          data?: SiteRecord[];
          pagination?: PaginationMeta;
          summary?: PaginatedSitesResult["summary"];
        }>(`/api/admin/sites?${qs.toString()}`);
        const items = Array.isArray(res.data) ? res.data : [];
        return {
          items,
          pagination: res.pagination ?? buildLocalPagination(items.length, page, limit),
          summary: res.summary ?? {
            totalSites: items.length,
            activeSites: items.filter((s) => s.isActive).length,
            inactiveSites: items.filter((s) => !s.isActive).length,
            totalAssignedEmployees: items.reduce((s, x) => s + (x.employeeCount ?? 0), 0),
          },
        };
      }

      const q = (params.search ?? "").trim().toLowerCase();
      const filtered = data.sites.filter((s) => {
        const matchQ =
          !q ||
          s.siteName.toLowerCase().includes(q) ||
          s.siteCode.toLowerCase().includes(q) ||
          s.clientName.toLowerCase().includes(q) ||
          (s.clientGstin ?? "").toLowerCase().includes(q);
        const matchActive =
          !params.isActive ||
          params.isActive === "All" ||
          (params.isActive === "true" ? s.isActive : !s.isActive);
        const matchGst = !params.gstMode || params.gstMode === "All" || s.gstMode === params.gstMode;
        return matchQ && matchActive && matchGst;
      });
      const skip = (page - 1) * limit;
      return {
        items: filtered.slice(skip, skip + limit),
        pagination: buildLocalPagination(filtered.length, page, limit),
        summary: {
          totalSites: data.sites.length,
          activeSites: data.sites.filter((s) => s.isActive).length,
          inactiveSites: data.sites.filter((s) => !s.isActive).length,
          totalAssignedEmployees: data.employees.filter((e) => e.status !== "LEFT").length,
        },
      };
    },
    createSite: async (payload) => {
      if (status === "authenticated") {
        const saved = await apiRequest<SiteRecord>("/api/admin/sites", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (saved?.id) {
          setData((prev) => ({
            ...prev,
            sites: [saved, ...prev.sites],
            activities: pushActivity(
              prev,
              "Client site created",
              `${saved.siteName} (${saved.siteCode}) registered.`,
              "Settings",
            ),
          }));
        }
        return saved ?? null;
      }
      const local: SiteRecord = { ...payload, id: uid("site"), employeeCount: 0 };
      setData((prev) => ({
        ...prev,
        sites: [local, ...prev.sites],
        activities: pushActivity(prev, "Client site created", `${local.siteName} registered.`, "Settings"),
      }));
      return local;
    },
    updateSite: async (site) => {
      if (status === "authenticated" && !isTempId(site.id)) {
        const saved = await apiRequest<SiteRecord>(`/api/admin/sites/${site.id}`, {
          method: "PATCH",
          body: JSON.stringify(site),
        });
        if (saved?.id) {
          setData((prev) => ({
            ...prev,
            sites: prev.sites.map((s) => (s.id === saved.id ? saved : s)),
            employees: prev.employees.map((e) =>
              e.primarySiteId === saved.id ? { ...e, siteName: saved.siteName } : e,
            ),
            activities: pushActivity(
              prev,
              "Client site updated",
              `Updated profile for ${saved.siteName}.`,
              "Settings",
            ),
          }));
        }
        return saved ?? null;
      }
      setData((prev) => ({
        ...prev,
        sites: prev.sites.map((s) => (s.id === site.id ? site : s)),
      }));
      return site;
    },
    deleteSite: async (id, archive = false) => {
      if (status === "authenticated" && !isTempId(id)) {
        await apiRequest(`/api/admin/sites/${id}${archive ? "?archive=true" : ""}`, {
          method: "DELETE",
        });
      }
      setData((prev) => ({
        ...prev,
        sites: archive
          ? prev.sites.map((s) => (s.id === id ? { ...s, isActive: false } : s))
          : prev.sites.filter((s) => s.id !== id),
      }));
      return true;
    },
    fetchEmployeesPaginated: async (params = {}) => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 25;
      if (status === "authenticated") {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        if (params.search?.trim()) qs.set("search", params.search.trim());
        if (params.siteId && params.siteId !== "All") qs.set("siteId", params.siteId);
        if (params.siteName && params.siteName !== "All") qs.set("siteName", params.siteName);
        if (params.status && params.status !== "All") qs.set("status", params.status);
        if (params.designation && params.designation !== "All") {
          qs.set("designation", params.designation);
        }
        const res = await apiRequestRaw<{
          data?: EmployeeRecord[];
          pagination?: PaginationMeta;
          summary?: PaginatedEmployeesResult["summary"];
          filterOptions?: { designations?: string[] };
        }>(`/api/admin/employees?${qs.toString()}`);
        const items = Array.isArray(res.data) ? res.data : [];
        return {
          items,
          pagination: res.pagination ?? buildLocalPagination(items.length, page, limit),
          summary: res.summary ?? {
            total: items.length,
            active: items.filter((e) => e.status === "ACTIVE").length,
            onHold: items.filter((e) => e.status === "ON_HOLD").length,
            left: items.filter((e) => e.status === "LEFT").length,
            transferred: items.filter((e) => e.status === "TRANSFERRED").length,
          },
          designations: res.filterOptions?.designations ?? [],
        };
      }

      const q = (params.search ?? "").trim().toLowerCase();
      const filtered = data.employees.filter((e) => {
        const matchQ =
          !q ||
          e.fullName.toLowerCase().includes(q) ||
          e.empCode.toLowerCase().includes(q) ||
          (e.legacyEmpCode ?? "").toLowerCase().includes(q) ||
          e.mobile.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q);
        const matchSiteId = !params.siteId || params.siteId === "All" || e.primarySiteId === params.siteId;
        const matchSiteName =
          !params.siteName || params.siteName === "All" || e.siteName === params.siteName;
        const matchStatus = !params.status || params.status === "All" || e.status === params.status;
        const matchDesig =
          !params.designation || params.designation === "All" || e.designation === params.designation;
        return matchQ && matchSiteId && matchSiteName && matchStatus && matchDesig;
      });
      const skip = (page - 1) * limit;
      return {
        items: filtered.slice(skip, skip + limit),
        pagination: buildLocalPagination(filtered.length, page, limit),
        summary: {
          total: data.employees.length,
          active: data.employees.filter((e) => e.status === "ACTIVE").length,
          onHold: data.employees.filter((e) => e.status === "ON_HOLD").length,
          left: data.employees.filter((e) => e.status === "LEFT").length,
          transferred: data.employees.filter((e) => e.status === "TRANSFERRED").length,
        },
        designations: Array.from(new Set(data.employees.map((e) => e.designation).filter(Boolean))).sort(),
      };
    },
    createEmployee: async (payload) => {
      if (status === "authenticated") {
        const res = await apiRequestRaw<{ data?: EmployeeRecord; site?: SiteRecord }>(
          "/api/admin/employees",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        const saved = res.data;
        if (saved?.id) {
          setData((prev) => ({
            ...prev,
            sites: res.site
              ? prev.sites.some((s) => s.id === res.site!.id)
                ? prev.sites
                : [res.site, ...prev.sites]
              : prev.sites,
            employees: [saved, ...prev.employees],
            activities: pushActivity(
              prev,
              "Deployed employee added",
              `${saved.fullName} (${saved.empCode}) assigned to ${saved.siteName}.`,
              "Recruitment",
            ),
          }));
        }
        return saved ?? null;
      }
      const local: EmployeeRecord = { ...payload, id: uid("emp") };
      setData((prev) => ({
        ...prev,
        employees: [local, ...prev.employees],
      }));
      return local;
    },
    updateEmployee: async (employee) => {
      if (status === "authenticated" && !isTempId(employee.id)) {
        const saved = await apiRequest<EmployeeRecord>(`/api/admin/employees/${employee.id}`, {
          method: "PATCH",
          body: JSON.stringify(employee),
        });
        if (saved?.id) {
          setData((prev) => ({
            ...prev,
            employees: prev.employees.map((e) => (e.id === saved.id ? saved : e)),
            activities: pushActivity(
              prev,
              "Employee profile updated",
              `${saved.fullName} (${saved.empCode}) updated.`,
              "Recruitment",
            ),
          }));
        }
        return saved ?? null;
      }
      setData((prev) => ({
        ...prev,
        employees: prev.employees.map((e) => (e.id === employee.id ? employee : e)),
      }));
      return employee;
    },
    deleteEmployee: async (id, mode = "delete") => {
      if (status === "authenticated" && !isTempId(id)) {
        await apiRequest(`/api/admin/employees/${id}${mode === "left" ? "?mode=left" : ""}`, {
          method: "DELETE",
        });
      }
      setData((prev) => ({
        ...prev,
        employees:
          mode === "left"
            ? prev.employees.map((e) => (e.id === id ? { ...e, status: "LEFT", exitDate: todayIso() } : e))
            : prev.employees.filter((e) => e.id !== id),
      }));
      return true;
    },
    previewNextEmployeeCode: async (designation = "", year = String(new Date().getFullYear())) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          if (designation.trim()) qs.set("designation", designation.trim());
          if (year.trim()) qs.set("year", year.trim());
          const res = await apiRequest<{ empCode?: string }>(
            `/api/admin/employees/generate-code?${qs.toString()}`,
          );
          if (res?.empCode) return res.empCode;
        } catch {
          // Fall back cleanly
        }
      }
      const prefix = inferDepartmentCode(designation || "Security Guard");
      const seq = String(data.employees.length + data.candidates.length + 1).padStart(3, "0");
      return `ACS/${prefix}/${year || new Date().getFullYear()}/${seq}`;
    },
    deployCandidateToEmployee: async (candidateId, payload) => {
      if (status === "authenticated" && !isTempId(candidateId)) {
        const res = await apiRequest<{
          candidate: Candidate;
          employee: EmployeeRecord;
          site?: SiteRecord;
        }>(`/api/admin/candidates/${candidateId}/deploy`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res?.candidate && res?.employee) {
          setData((prev) => ({
            ...prev,
            sites: res.site
              ? prev.sites.some((s) => s.id === res.site!.id)
                ? prev.sites
                : [res.site, ...prev.sites]
              : prev.sites,
            candidates: prev.candidates.map((c) => (c.id === res.candidate.id ? res.candidate : c)),
            employees: prev.employees.some((e) => e.id === res.employee.id)
              ? prev.employees.map((e) => (e.id === res.employee.id ? res.employee : e))
              : [res.employee, ...prev.employees],
            activities: pushActivity(
              prev,
              "Candidate deployed to site",
              `${res.employee.fullName} (${res.employee.empCode}) deployed to ${res.employee.siteName}.`,
              "Recruitment",
            ),
          }));
          return { candidate: res.candidate, employee: res.employee };
        }
      }
      return null;
    },
    runCoreMigration: async () => {
      if (status !== "authenticated") return null;
      const summary = await apiRequest<CoreMigrationResult>("/api/admin/migrate-core", {
        method: "POST",
      });
      await refreshData();
      return summary ?? null;
    },
    importOnboardingData: async (payload) => {
      if (status === "authenticated") {
        try {
          const summary = await apiRequest<OnboardingImportSummary>(
            "/api/admin/onboarding-import",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );
          if (summary && !payload.dryRun) {
            await refreshData();
          }
          return summary ?? null;
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Failed to import onboarding batch.",
          );
          return null;
        }
      }

      // Offline / localStorage prototype fallback (keeps Vitest & unauthenticated previews accurate)
      const dryRun = Boolean(payload.dryRun);
      const defaultMonthKey = payload.defaultMonthKey || new Date().toISOString().slice(0, 7);
      const errors: OnboardingValidationError[] = [];

      const rawSites = payload.sites ?? [];
      const rawEmployees = payload.employees ?? [];
      const rawAdvances = payload.openingAdvances ?? [];
      const rawUniforms = payload.openingUniformPlans ?? [];

      const validSites = rawSites.filter((row, idx) => {
        if (!String(row.siteName ?? "").trim()) {
          errors.push({
            section: "sites",
            rowIndex: idx,
            identifier: row.siteCode || `Row ${idx + 1}`,
            reason: "siteName is required",
          });
          return false;
        }
        return true;
      });

      const validEmployees = rawEmployees.filter((row, idx) => {
        const name = String(row.fullName ?? "").trim();
        const site = String(row.siteName ?? "").trim();
        if (!name || !site) {
          errors.push({
            section: "employees",
            rowIndex: idx,
            identifier: row.empCode || row.legacyEmpCode || name || `Row ${idx + 1}`,
            reason: !name ? "fullName is required" : "siteName is required",
          });
          return false;
        }
        return true;
      });

      const validAdvances = rawAdvances.filter((row, idx) => {
        const amt = Number(row.amount);
        const hasPerson = Boolean(row.employeeId || row.legacyEmpCode || row.employeeName);
        const hasSite = Boolean(row.onAccountOf || row.siteName);
        if (!hasPerson || !hasSite || !Number.isFinite(amt) || amt <= 0) {
          errors.push({
            section: "openingAdvances",
            rowIndex: idx,
            identifier: row.employeeId || row.legacyEmpCode || row.employeeName || `Row ${idx + 1}`,
            reason: !Number.isFinite(amt) || amt <= 0 ? "Advance amount must be greater than 0" : "Employee and site/onAccountOf are required",
          });
          return false;
        }
        return true;
      });

      const validUniforms = rawUniforms.filter((row, idx) => {
        const charge = Number(row.totalCharge);
        const hasPerson = Boolean(row.employeeId || row.legacyEmpCode || row.employeeName);
        const hasSite = Boolean(row.siteName);
        if (!hasPerson || !hasSite || !Number.isFinite(charge) || charge <= 0) {
          errors.push({
            section: "openingUniformPlans",
            rowIndex: idx,
            identifier: row.employeeId || row.legacyEmpCode || row.employeeName || `Row ${idx + 1}`,
            reason: !Number.isFinite(charge) || charge <= 0 ? "totalCharge must be greater than 0" : "Employee and siteName are required",
          });
          return false;
        }
        return true;
      });

      const existingSiteNames = new Set(data.sites.map((s) => s.siteName.trim().toLowerCase()));
      const existingEmpKeys = new Set(
        data.employees.flatMap((e) =>
          [
            e.empCode.trim().toUpperCase(),
            e.legacyEmpCode ? e.legacyEmpCode.trim().toUpperCase() : "",
          ].filter(Boolean),
        ),
      );

      let sitesCreated = 0;
      let sitesUpdated = 0;
      for (const s of validSites) {
        if (existingSiteNames.has(s.siteName.trim().toLowerCase())) sitesUpdated += 1;
        else {
          sitesCreated += 1;
          existingSiteNames.add(s.siteName.trim().toLowerCase());
        }
      }

      let employeesCreated = 0;
      let employeesUpdated = 0;
      for (const e of validEmployees) {
        const key = (e.empCode || e.legacyEmpCode || "").trim().toUpperCase();
        if (key && existingEmpKeys.has(key)) employeesUpdated += 1;
        else {
          employeesCreated += 1;
          if (key) existingEmpKeys.add(key);
        }
      }

      if (!dryRun) {
        setData((prev) => {
          const nextSites = [...prev.sites];
          const siteMap = new Map(nextSites.map((s) => [s.siteName.trim().toLowerCase(), s]));
          const toGstMode = (raw?: string, state?: string): SiteGstMode => {
            const up = (raw ?? "").trim().toUpperCase();
            if (up === "RCM" || up.includes("REVERSE")) return "RCM";
            if (up === "NON_GST" || up.includes("EXEMPT")) return "NON_GST";
            if (up === "INTER_IGST" || up.includes("IGST")) return "INTER_IGST";
            if (up === "INTRA_CGST_SGST" || up.includes("CGST")) return "INTRA_CGST_SGST";
            return state && state !== "19" ? "INTER_IGST" : "INTRA_CGST_SGST";
          };

          for (const s of validSites) {
            const key = s.siteName.trim().toLowerCase();
            const existing = siteMap.get(key);
            const stateCode = (s.stateCode || s.clientGstin?.slice(0, 2) || "19").trim();
            const parsedSubUnits = Array.isArray(s.subUnits)
              ? s.subUnits
              : String(s.subUnits ?? "")
                  .split(/[|;,]/)
                  .map((x) => x.trim())
                  .filter(Boolean);
            if (existing) {
              Object.assign(existing, {
                clientName: s.clientName || existing.clientName,
                clientGstin: s.clientGstin ?? existing.clientGstin ?? "",
                stateCode,
                gstMode: toGstMode(s.gstMode, stateCode),
                sacCode: s.sacCode || existing.sacCode || "998533",
                ...(parsedSubUnits.length > 0 ? { subUnits: parsedSubUnits } : {}),
              });
            } else {
              const rec: SiteRecord = {
                id: uid("site"),
                siteCode:
                  (s.siteCode || s.siteName)
                    .toUpperCase()
                    .replace(/[^A-Z0-9]+/g, "-")
                    .slice(0, 18) || "SITE",
                siteName: s.siteName.trim(),
                clientName: (s.clientName || s.siteName).trim(),
                clientGstin: s.clientGstin ?? "",
                stateCode,
                gstMode: toGstMode(s.gstMode, stateCode),
                sacCode: s.sacCode || "998533",
                subUnits: parsedSubUnits,
                serviceChargePct: Number(s.serviceChargePct) || 0,
                isActive: true,
              };
              nextSites.push(rec);
              siteMap.set(key, rec);
            }
          }

          const nextEmployees = [...prev.employees];
          const year = defaultMonthKey.slice(0, 4) || "2026";
          let seq = nextEmployees.length + 1;

          for (const e of validEmployees) {
            const codeUpper = (e.empCode || "").trim().toUpperCase();
            const legacyUpper = (e.legacyEmpCode || "").trim().toUpperCase();
            const existingIdx = nextEmployees.findIndex(
              (item) =>
                (codeUpper && item.empCode.toUpperCase() === codeUpper) ||
                (legacyUpper && item.legacyEmpCode?.toUpperCase() === legacyUpper),
            );
            const deptPrefix = inferDepartmentCode(e.designation || "Security Guard");
            const empCode =
              codeUpper || `ACS/${deptPrefix}/${year}/${String(seq++).padStart(3, "0")}`;
            const rateType: EmployeeRateType = String(e.rateType ?? "").toUpperCase().includes("DAY")
              ? "DAILY"
              : "MONTHLY";
            const matchedSite = siteMap.get(e.siteName.trim().toLowerCase());
            if (existingIdx >= 0 && nextEmployees[existingIdx]) {
              nextEmployees[existingIdx] = {
                ...nextEmployees[existingIdx],
                fullName: e.fullName.trim(),
                siteName: matchedSite?.siteName ?? e.siteName.trim(),
                designation: e.designation || nextEmployees[existingIdx].designation,
                rateType,
                baseRate: Number(e.baseRate) || nextEmployees[existingIdx].baseRate,
                ...(legacyUpper ? { legacyEmpCode: legacyUpper } : {}),
              };
            } else {
              nextEmployees.push({
                id: uid("emp"),
                empCode,
                ...(legacyUpper ? { legacyEmpCode: legacyUpper } : {}),
                ...(matchedSite?.id ? { primarySiteId: matchedSite.id } : {}),
                siteName: matchedSite?.siteName ?? e.siteName.trim(),
                fullName: e.fullName.trim(),
                mobile: e.mobile || "",
                designation: e.designation || "Security Guard",
                rateType,
                baseRate: Number(e.baseRate) || 0,
                status: "ACTIVE",
                statutory: {
                  esiHolder: e.esiNumber ? "Yes" : "",
                  esiNumber: e.esiNumber || "",
                  pfUan: e.uanNumber || "",
                },
                bankDetails: {
                  bankName: e.bankName || "",
                  accountNumber: e.accountNumber || "",
                  ifscCode: (e.ifscCode || "").toUpperCase(),
                  branchName: e.branchName || "",
                  upiId: e.upiId || "",
                  preferredPaymentMode: "BANK_TRANSFER",
                },
              });
            }
          }

          const nextAdvances: SalaryAdvanceRecord[] = [...(prev.salaryAdvances ?? [])];
          let nextStaffNo = nextAdvances.length + 1;
          for (const a of validAdvances) {
            const amount = Number(a.amount);
            const recovered = Math.min(amount, Math.max(0, Number(a.recoveredAmount) || 0));
            const remaining =
              a.remainingBalance !== undefined
                ? Math.max(0, Number(a.remainingBalance))
                : Math.max(0, amount - recovered);
            const installments = Math.max(1, Number(a.installmentCount) || 1);
            nextAdvances.unshift({
              id: uid("adv"),
              staffNo: nextStaffNo++,
              monthKey: a.monthKey || defaultMonthKey,
              date: a.date || `${defaultMonthKey}-01`,
              employeeId: a.employeeId || a.legacyEmpCode || "",
              ...(a.legacyEmpCode ? { legacyEmpCode: a.legacyEmpCode } : {}),
              employeeName: a.employeeName || a.legacyEmpCode || "Staff",
              onAccountOf: a.onAccountOf || a.siteName || "Office",
              amount,
              recoveryMode:
                (a.recoveryMode as AdvanceRecoveryMode) ||
                (installments > 1 ? "EMI" : "NEXT_MONTH"),
              installmentCount: installments,
              monthlyAmount: Number(a.monthlyAmount) || Math.ceil(remaining / installments),
              targetPayrollMonth: a.targetPayrollMonth || defaultMonthKey,
              recoveredAmount: amount - remaining,
              remainingBalance: remaining,
              status: remaining <= 0 ? "RECOVERED" : remaining < amount ? "PARTIAL" : "OPEN",
              signatures: { receiver: "", staff: "", manager: "", director: "" },
              recoveryHistory: [],
              ...(a.remarks ? { remarks: a.remarks } : {}),
            });
          }

          const nextPlans: UniformRecoveryPlan[] = [...(prev.uniformRecoveryPlans ?? [])];
          for (const u of validUniforms) {
            const totalCharge = Number(u.totalCharge);
            const recovered = Math.min(totalCharge, Math.max(0, Number(u.recoveredAmount) || 0));
            const remaining =
              u.remainingBalance !== undefined
                ? Math.max(0, Number(u.remainingBalance))
                : Math.max(0, totalCharge - recovered);
            const installments = Math.max(1, Number(u.installmentCount) || 1);
            nextPlans.unshift({
              id: uid("urp"),
              batchId: "LEGACY_IMPORT",
              issueIds: [],
              employeeId: u.employeeId || u.legacyEmpCode || u.employeeName || "LEGACY",
              ...(u.legacyEmpCode ? { legacyEmpCode: u.legacyEmpCode } : {}),
              employeeName: u.employeeName || u.legacyEmpCode || "Staff",
              siteName: u.siteName || "Unassigned",
              totalCharge,
              recoveryMode:
                (u.recoveryMode as UniformRecoveryMode) ||
                (installments === 1 ? "ONE_TIME" : "EMI_COUNT"),
              installmentCount: installments,
              monthlyAmount: Number(u.monthlyAmount) || Math.ceil(remaining / installments),
              startMonth: u.startMonth || defaultMonthKey,
              recoveredAmount: totalCharge - remaining,
              creditedAmount: 0,
              remainingBalance: remaining,
              status: remaining <= 0 ? "SETTLED" : "ACTIVE",
              installmentHistory: [],
              ...(u.remarks ? { remarks: u.remarks } : {}),
            });
          }

          return {
            ...prev,
            sites: nextSites,
            employees: nextEmployees,
            salaryAdvances: nextAdvances,
            uniformRecoveryPlans: nextPlans,
            activities: pushActivity(
              prev,
              "Legacy onboarding workbook imported",
              `Imported ${validSites.length} site(s), ${validEmployees.length} employee(s), ${validAdvances.length} advance(s), ${validUniforms.length} uniform EMI(s).`,
              "Settings",
            ),
          };
        });
      }

      return {
        dryRun,
        defaultMonthKey,
        received: {
          sites: rawSites.length,
          employees: rawEmployees.length,
          openingAdvances: rawAdvances.length,
          openingUniformPlans: rawUniforms.length,
        },
        valid: {
          sites: validSites.length,
          employees: validEmployees.length,
          openingAdvances: validAdvances.length,
          openingUniformPlans: validUniforms.length,
        },
        applied: {
          sitesCreated,
          sitesUpdated,
          employeesCreated,
          employeesUpdated,
          advancesCreated: validAdvances.length,
          advancesSkippedDuplicate: 0,
          uniformPlansCreated: validUniforms.length,
          uniformPlansSkippedDuplicate: 0,
        },
        errors,
      };
    },
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
    syncUniformRateCard: async (overwriteAll = false) => {
      setData((prev) => ({
        ...prev,
        uniforms: prev.uniforms.map((u) => {
          const master = UNIFORM_DEFAULT_PRICES[u.category];
          if (master === undefined) return u;
          if (overwriteAll || u.unitPrice === 0) {
            return { ...u, unitPrice: master, lastUpdated: todayIso() };
          }
          return u;
        }),
        activities: pushActivity(
          prev,
          "Dress rate card synced",
          "Applied Master Dress Charge prices (including Badge ₹70).",
          "Uniforms",
        ),
      }));
      if (status === "authenticated") {
        try {
          const res = await apiRequest<{
            updatedCount?: number;
            createdCount?: number;
            uniforms?: UniformItem[];
          }>("/api/admin/uniforms/sync-rate-card", {
            method: "POST",
            body: JSON.stringify({ overwriteAll }),
          });
          if (Array.isArray(res?.uniforms) && res.uniforms.length > 0) {
            setData((prev) => ({ ...prev, uniforms: res.uniforms! }));
          }
          return {
            updatedCount: res?.updatedCount ?? 0,
            createdCount: res?.createdCount ?? 0,
          };
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to sync uniform rate card.");
          return null;
        }
      }
      return { updatedCount: 1, createdCount: 0 };
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

      const issueMode: UniformIssueMode = payload.issueMode === "BULK_SITE" ? "BULK_SITE" : "INDIVIDUAL";
      const batchId = uid("batch");
      const tempPlanId = uid("urp");
      const tempIssues: UniformIssueRecord[] = payload.items.map((line, index) => {
        const sku = data.uniforms.find((u) => u.id === line.itemId)!;
        const regFee = index === 0 ? Math.max(0, Number(payload.registrationCharge) || 0) : 0;
        const lineSubtotal = line.quantity * line.unitPrice;
        return {
          id: uid(`ui-${index}`),
          batchId,
          issueMode,
          ...(payload.serialNo ? { serialNo: payload.serialNo } : {}),
          employeeId: payload.employeeId,
          ...(payload.legacyEmpCode ? { legacyEmpCode: payload.legacyEmpCode } : {}),
          employeeName: payload.employeeName,
          ...(payload.mobile ? { mobile: payload.mobile } : {}),
          site: payload.site,
          itemId: sku.id,
          itemName: sku.subCategory || sku.category,
          category: sku.category,
          subCategory: sku.subCategory ?? "",
          size: sku.size,
          quantity: line.quantity,
          returnedQty: 0,
          returnedAmount: 0,
          unitPrice: line.unitPrice,
          registrationCharge: regFee,
          totalAmount: lineSubtotal + regFee,
          issueDate: payload.issueDate,
          ...(payload.issuedBy ? { issuedBy: payload.issuedBy } : {}),
          ...(payload.receivedBy ? { receivedBy: payload.receivedBy } : {}),
          ...(payload.verifiedBy ? { verifiedBy: payload.verifiedBy } : {}),
          ...(payload.originalDocHeld ? { originalDocHeld: payload.originalDocHeld } : {}),
          billToSite: Boolean(payload.billToSite ?? issueMode === "BULK_SITE"),
          remarks: payload.remarks ?? "",
          status: "Issued",
        };
      });

      const batchTotalCharge = Number(
        tempIssues.reduce((sum, i) => sum + i.totalAmount, 0).toFixed(2),
      );
      const reqPlan = payload.recoveryPlan;
      const planMode = reqPlan?.recoveryMode ?? "ONE_TIME";
      const shouldCreateLocalPlan =
        issueMode === "INDIVIDUAL" &&
        !payload.billToSite &&
        batchTotalCharge > 0 &&
        planMode !== "NO_RECOVERY" &&
        reqPlan?.createPlan !== false;

      let tempRecoveryPlan: UniformRecoveryPlan | null = null;
      if (shouldCreateLocalPlan) {
        const emiCount =
          planMode === "ONE_TIME"
            ? 1
            : planMode === "FIXED_MONTHLY"
              ? Math.max(1, Math.ceil(batchTotalCharge / Math.max(1, Number(reqPlan?.monthlyAmount) || batchTotalCharge)))
              : Math.max(1, Math.round(Number(reqPlan?.installmentCount) || 1));
        const monthlyAmt =
          planMode === "ONE_TIME"
            ? batchTotalCharge
            : planMode === "FIXED_MONTHLY"
              ? Math.min(batchTotalCharge, Number(reqPlan?.monthlyAmount) || batchTotalCharge)
              : Number((batchTotalCharge / emiCount).toFixed(2));
        tempRecoveryPlan = {
          id: tempPlanId,
          batchId,
          issueIds: tempIssues.map((i) => i.id),
          employeeId: payload.employeeId,
          ...(payload.legacyEmpCode ? { legacyEmpCode: payload.legacyEmpCode } : {}),
          employeeName: payload.employeeName,
          siteName: payload.site,
          totalCharge: batchTotalCharge,
          recoveryMode: planMode,
          installmentCount: emiCount,
          monthlyAmount: monthlyAmt,
          startMonth: reqPlan?.startMonth || payload.issueDate.slice(0, 7),
          recoveredAmount: 0,
          creditedAmount: 0,
          remainingBalance: batchTotalCharge,
          status: "ACTIVE",
          installmentHistory: [],
          remarks: reqPlan?.remarks ?? payload.remarks ?? "",
        };
        tempIssues.forEach((iss) => {
          iss.recoveryPlanId = tempPlanId;
        });
      }

      const newLogs = tempIssues.map((iss, idx) => ({
        id: uid(`sl-${idx}`),
        itemName: iss.itemName,
        action: "Issued" as const,
        quantity: iss.quantity,
        date: iss.issueDate,
        note:
          issueMode === "BULK_SITE"
            ? `Bulk site issue to ${iss.site}`
            : `Issued to ${iss.employeeName} (${iss.employeeId})`,
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
        uniformRecoveryPlans: tempRecoveryPlan
          ? [tempRecoveryPlan, ...(prev.uniformRecoveryPlans ?? [])]
          : (prev.uniformRecoveryPlans ?? []),
        stockLogs: [...newLogs, ...prev.stockLogs],
        activities: pushActivity(
          prev,
          issueMode === "BULK_SITE" ? "Bulk site uniform issued" : "Uniform kit issued",
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
            recoveryPlan?: UniformRecoveryPlan;
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
            const savedPlan = savedResult?.recoveryPlan;
            return {
              ...prev,
              uniforms: prev.uniforms.map((u) => remoteUniformMap.get(u.id) ?? u),
              uniformIssues: [
                ...remoteIssues,
                ...prev.uniformIssues.filter((i) => !tempIdSet.has(i.id)),
              ],
              uniformRecoveryPlans: savedPlan
                ? [
                    savedPlan,
                    ...(prev.uniformRecoveryPlans ?? []).filter((p) => p.id !== tempPlanId),
                  ]
                : (prev.uniformRecoveryPlans ?? []),
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
    returnUniform: (issueId, returnQty, remarks) => {
      const tempLogId = uid("sl-ret");
      setData((prev) => {
        const issue = prev.uniformIssues.find((i) => i.id === issueId);
        const alreadyReturned = issue?.returnedQty ?? 0;
        const outstandingQty = issue ? Math.max(0, issue.quantity - alreadyReturned) : 0;
        if (!issue || issue.status === "Returned" || outstandingQty <= 0) return prev;

        const qtyToReturn =
          typeof returnQty === "number" && Number.isInteger(returnQty) && returnQty >= 1
            ? Math.min(outstandingQty, returnQty)
            : outstandingQty;
        const nextReturnedQty = alreadyReturned + qtyToReturn;
        const creditAmt = Number((qtyToReturn * (issue.unitPrice ?? 0)).toFixed(2));
        const nextReturnedAmt = Number(((issue.returnedAmount ?? 0) + creditAmt).toFixed(2));
        const isFull = nextReturnedQty >= issue.quantity;
        const today = todayIso();

        const updatedPlans = (prev.uniformRecoveryPlans ?? []).map((plan) => {
          const linked =
            plan.id === issue.recoveryPlanId ||
            (issue.batchId && plan.batchId === issue.batchId);
          if (!linked || plan.remainingBalance <= 0 || creditAmt <= 0) return plan;
          const appliedCredit = Math.min(plan.remainingBalance, creditAmt);
          const nextCredited = Number((plan.creditedAmount + appliedCredit).toFixed(2));
          const nextRemaining = Math.max(
            0,
            Number((plan.totalCharge - plan.recoveredAmount - nextCredited).toFixed(2)),
          );
          return {
            ...plan,
            creditedAmount: nextCredited,
            remainingBalance: nextRemaining,
            status: nextRemaining <= 0 ? ("SETTLED" as const) : plan.status,
            installmentHistory: [
              ...plan.installmentHistory,
              {
                monthKey: today.slice(0, 7),
                scheduledAmount: 0,
                deductedAmount: appliedCredit,
                balanceAfter: nextRemaining,
                source: "RETURN_CREDIT" as const,
                note: `Returned ${qtyToReturn}× ${issue.itemName}`,
                recordedAt: today,
              },
            ],
          };
        });

        return {
          ...prev,
          uniforms: prev.uniforms.map((u) =>
            u.id === issue.itemId
              ? {
                  ...u,
                  availableQty: u.availableQty + qtyToReturn,
                  issuedQty: Math.max(0, u.issuedQty - qtyToReturn),
                  lastUpdated: today,
                }
              : u,
          ),
          uniformIssues: prev.uniformIssues.map((i) =>
            i.id === issueId
              ? {
                  ...i,
                  returnedQty: nextReturnedQty,
                  returnedAmount: nextReturnedAmt,
                  returnDate: today,
                  ...(remarks?.trim()
                    ? { remarks: [i.remarks, remarks.trim()].filter(Boolean).join(" | ") }
                    : {}),
                  ...(isFull ? { status: "Returned" as const } : {}),
                }
              : i,
          ),
          uniformRecoveryPlans: updatedPlans,
          stockLogs: [
            {
              id: tempLogId,
              itemName: issue.itemName,
              action: "Returned",
              quantity: qtyToReturn,
              date: today,
              note: `Returned ${qtyToReturn}/${issue.quantity} by ${issue.employeeName} (${issue.employeeId})`,
            },
            ...prev.stockLogs,
          ],
          activities: pushActivity(
            prev,
            "Uniform returned",
            `${qtyToReturn}× ${issue.itemName} returned by ${issue.employeeName}.`,
            "Uniforms",
          ),
        };
      });
      if (!isTempId(issueId)) {
        void syncRemote<{
          issue?: UniformIssueRecord;
          uniform?: UniformItem | null;
          stockLog?: UniformStockLog;
          recoveryPlan?: UniformRecoveryPlan;
        }>(
          `/api/admin/uniform-issues/${issueId}/return`,
          "PATCH",
          returnQty !== undefined || remarks ? { ...(returnQty !== undefined ? { returnQty } : {}), ...(remarks ? { remarks } : {}) } : undefined,
          (result) => {
            if (!result) return;
            setData((prev) => ({
              ...prev,
              uniformIssues: result.issue
                ? prev.uniformIssues.map((i) => (i.id === result.issue!.id ? result.issue! : i))
                : prev.uniformIssues,
              uniforms: result.uniform
                ? prev.uniforms.map((u) => (u.id === result.uniform!.id ? result.uniform! : u))
                : prev.uniforms,
              uniformRecoveryPlans: result.recoveryPlan
                ? (prev.uniformRecoveryPlans ?? []).map((p) =>
                    p.id === result.recoveryPlan!.id ? result.recoveryPlan! : p,
                  )
                : (prev.uniformRecoveryPlans ?? []),
              stockLogs: result.stockLog
                ? prev.stockLogs.map((l) => (l.id === tempLogId ? result.stockLog! : l))
                : prev.stockLogs,
            }));
          },
        );
      }
    },
    fetchUniformRecoveryPlans: async (params = {}) => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 50;
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          qs.set("page", String(page));
          qs.set("limit", String(limit));
          if (params.search?.trim()) qs.set("search", params.search.trim());
          if (params.site && params.site !== "All") qs.set("site", params.site);
          if (params.status && params.status !== "All") qs.set("status", params.status);
          if (params.month) qs.set("month", params.month);
          const res = await apiRequestRaw<{
            data?: UniformRecoveryPlan[];
            pagination?: PaginationMeta;
            summary?: UniformRecoveryPlansResult["summary"];
          }>(`/api/admin/uniform-recovery-plans?${qs.toString()}`);
          if (Array.isArray(res?.data) && res?.pagination) {
            return {
              items: res.data,
              pagination: res.pagination,
              summary: res.summary ?? {
                activePlans: res.data.filter((p) => p.status === "ACTIVE").length,
                totalOutstanding: res.data.reduce((s, p) => s + p.remainingBalance, 0),
                totalRecovered: res.data.reduce((s, p) => s + p.recoveredAmount, 0),
              },
            };
          }
        } catch {
          // Fallback to local state in offline/mocked mode
        }
      }

      const localList = data.uniformRecoveryPlans ?? [];
      const q = (params.search ?? "").trim().toLowerCase();
      const filtered = localList.filter((p) => {
        const matchQ =
          !q ||
          p.employeeName.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          (p.legacyEmpCode ?? "").toLowerCase().includes(q) ||
          p.siteName.toLowerCase().includes(q);
        const matchSite = !params.site || params.site === "All" || p.siteName === params.site;
        const matchStatus = !params.status || params.status === "All" || p.status === params.status;
        const matchMonth = !params.month || p.startMonth <= params.month;
        return matchQ && matchSite && matchStatus && matchMonth;
      });
      const skip = (page - 1) * limit;
      return {
        items: filtered.slice(skip, skip + limit),
        pagination: buildLocalPagination(filtered.length, page, limit),
        summary: {
          activePlans: localList.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED").length,
          totalOutstanding: Number(
            localList.reduce((s, p) => s + (p.status !== "CANCELLED" ? p.remainingBalance : 0), 0).toFixed(2),
          ),
          totalRecovered: Number(localList.reduce((s, p) => s + p.recoveredAmount, 0).toFixed(2)),
        },
      };
    },
    fetchUniformPayrollPreview: async (month, site) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          qs.set("month", month);
          if (site && site !== "All") qs.set("site", site);
          const res = await apiRequest<{
            month?: string;
            totalDueThisMonth?: number;
            items?: Array<UniformRecoveryPlan & { dueThisMonth: number; carriedForwardAfter: number }>;
          }>(`/api/admin/uniform-recovery-plans/payroll-preview?${qs.toString()}`);
          if (Array.isArray(res?.items)) {
            return {
              month: res.month || month,
              totalDueThisMonth: res.totalDueThisMonth ?? 0,
              items: res.items,
            };
          }
        } catch {
          // Local computation fallback
        }
      }
      const items = (data.uniformRecoveryPlans ?? [])
        .filter(
          (p) =>
            p.status === "ACTIVE" &&
            p.remainingBalance > 0 &&
            p.startMonth <= month &&
            (!site || site === "All" || p.siteName.toLowerCase() === site.toLowerCase()),
        )
        .map((p) => {
          const due =
            p.recoveryMode === "ONE_TIME"
              ? p.remainingBalance
              : Math.min(p.remainingBalance, p.monthlyAmount || p.remainingBalance);
          return {
            ...p,
            dueThisMonth: Number(due.toFixed(2)),
            carriedForwardAfter: Number(Math.max(0, p.remainingBalance - due).toFixed(2)),
          };
        });
      return {
        month,
        totalDueThisMonth: Number(items.reduce((s, i) => s + i.dueThisMonth, 0).toFixed(2)),
        items,
      };
    },
    createUniformRecoveryPlan: async (payload) => {
      const total = Math.max(0, Number(payload.totalCharge) || 0);
      if (total <= 0) return null;
      const already = Math.min(total, Math.max(0, Number(payload.recoveredAmount) || 0));
      const emiCount =
        payload.recoveryMode === "ONE_TIME"
          ? 1
          : payload.recoveryMode === "FIXED_MONTHLY"
            ? Math.max(1, Math.ceil(total / Math.max(1, Number(payload.monthlyAmount) || total)))
            : Math.max(1, Math.round(Number(payload.installmentCount) || 1));
      const monthly =
        payload.recoveryMode === "ONE_TIME"
          ? total
          : payload.recoveryMode === "FIXED_MONTHLY"
            ? Math.min(total, Number(payload.monthlyAmount) || total)
            : Number((total / emiCount).toFixed(2));
      const tempId = uid("urp");
      const remaining = Number((total - already).toFixed(2));
      const optimistic: UniformRecoveryPlan = {
        id: tempId,
        issueIds: [],
        employeeId: payload.employeeId?.trim().toUpperCase() || `ACS/DRS/${payload.startMonth.slice(0, 4)}/001`,
        ...(payload.legacyEmpCode ? { legacyEmpCode: payload.legacyEmpCode } : {}),
        employeeName: payload.employeeName.trim(),
        siteName: payload.siteName.trim(),
        totalCharge: total,
        recoveryMode: payload.recoveryMode,
        installmentCount: emiCount,
        monthlyAmount: monthly,
        startMonth: payload.startMonth,
        recoveredAmount: already,
        creditedAmount: 0,
        remainingBalance: remaining,
        status: remaining <= 0 ? "SETTLED" : "ACTIVE",
        installmentHistory: [],
        ...(payload.remarks ? { remarks: payload.remarks } : {}),
      };
      setData((prev) => ({
        ...prev,
        uniformRecoveryPlans: [optimistic, ...(prev.uniformRecoveryPlans ?? [])],
        activities: pushActivity(
          prev,
          "Uniform recovery plan created",
          `₹${total} dress recovery scheduled from ${payload.startMonth} for ${payload.employeeName}.`,
          "Uniforms",
        ),
      }));
      if (status === "authenticated") {
        try {
          const saved = await apiRequest<UniformRecoveryPlan>("/api/admin/uniform-recovery-plans", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              uniformRecoveryPlans: (prev.uniformRecoveryPlans ?? []).map((p) =>
                p.id === tempId ? saved : p,
              ),
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save uniform recovery plan.");
          return null;
        }
      }
      return optimistic;
    },
    updateUniformRecoveryPlan: async (id, updates) => {
      let updatedLocal: UniformRecoveryPlan | null = null;
      setData((prev) => {
        const nextPlans = (prev.uniformRecoveryPlans ?? []).map((p) => {
          if (p.id !== id) return p;
          const nextMode = updates.recoveryMode ?? p.recoveryMode;
          const nextCount = updates.installmentCount ?? p.installmentCount;
          const nextMonthly =
            updates.monthlyAmount ??
            (updates.recoveryMode === "ONE_TIME"
              ? p.totalCharge
              : updates.installmentCount !== undefined
                ? Number((p.totalCharge / Math.max(1, nextCount)).toFixed(2))
                : p.monthlyAmount);
          let nextRecovered = p.recoveredAmount;
          let nextRemaining = p.remainingBalance;
          let nextStatus = updates.status ?? p.status;
          let nextLastMonth = p.lastDeductedMonth;
          let nextHistory = p.installmentHistory;

          if (updates.recordDeductionAmount && updates.recordDeductionAmount > 0) {
            const applied = Math.min(p.remainingBalance, updates.recordDeductionAmount);
            const mKey = updates.deductMonth || todayIso().slice(0, 7);
            nextRecovered = Number((p.recoveredAmount + applied).toFixed(2));
            nextRemaining = Math.max(
              0,
              Number((p.totalCharge - nextRecovered - p.creditedAmount).toFixed(2)),
            );
            nextLastMonth = mKey;
            nextHistory = [
              ...p.installmentHistory,
              {
                monthKey: mKey,
                scheduledAmount: nextMonthly,
                deductedAmount: applied,
                balanceAfter: nextRemaining,
                source: updates.source ?? "MANUAL",
                note: updates.note || `Recovered ₹${applied} in ${mKey}`,
                recordedAt: todayIso(),
              },
            ];
            if (nextRemaining <= 0) nextStatus = "SETTLED";
          }

          updatedLocal = {
            ...p,
            recoveryMode: nextMode,
            installmentCount: nextCount,
            monthlyAmount: nextMonthly,
            startMonth: updates.startMonth ?? p.startMonth,
            recoveredAmount: nextRecovered,
            remainingBalance: nextRemaining,
            status: nextStatus,
            ...(nextLastMonth ? { lastDeductedMonth: nextLastMonth } : {}),
            ...(updates.remarks !== undefined ? { remarks: updates.remarks } : {}),
            installmentHistory: nextHistory,
          };
          return updatedLocal;
        });
        return { ...prev, uniformRecoveryPlans: nextPlans };
      });
      if (status === "authenticated" && !isTempId(id)) {
        try {
          const saved = await apiRequest<UniformRecoveryPlan>(
            `/api/admin/uniform-recovery-plans/${id}`,
            {
              method: "PATCH",
              body: JSON.stringify(updates),
            },
          );
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              uniformRecoveryPlans: (prev.uniformRecoveryPlans ?? []).map((p) =>
                p.id === id ? saved : p,
              ),
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update recovery plan.");
          return null;
        }
      }
      return updatedLocal;
    },
    upsertAttendance: (record, editId) => {
      const defaults = getDefaultDutyForStatus(record.status);
      const otHours =
        typeof record.otHours === "number" && Number.isFinite(record.otHours)
          ? Math.max(0, record.otHours)
          : 0;
      const otDayEquivalent =
        typeof record.otDayEquivalent === "number" && Number.isFinite(record.otDayEquivalent)
          ? Math.max(0, record.otDayEquivalent)
          : otHours > 0
            ? Number((otHours / 8).toFixed(3))
            : (record.extraDuty ?? defaults.extraDuty);
      const shiftFraction =
        typeof record.shiftFraction === "number" && Number.isFinite(record.shiftFraction)
          ? Math.max(0, record.shiftFraction)
          : (record.normalDuty ?? defaults.normalDuty);
      const matchingHomeEmp = data.employees.find((e) => {
        if (e.status === "LEFT") return false;
        const recId = record.employeeId.trim().toUpperCase();
        return (
          (recId && e.empCode.trim().toUpperCase() === recId) ||
          e.fullName.trim().toLowerCase() === record.employeeName.trim().toLowerCase()
        );
      });
      const autoHomeSite = record.primarySiteName || (matchingHomeEmp?.siteName ?? "");
      const autoIsReliever =
        record.isReliever ??
        Boolean(
          matchingHomeEmp &&
            matchingHomeEmp.siteName.trim() &&
            matchingHomeEmp.siteName.trim().toLowerCase() !== record.location.trim().toLowerCase(),
        );

      const normalizedRecord: Omit<AttendanceRecord, "id"> = {
        ...record,
        monthKey: record.monthKey || record.date.slice(0, 7),
        shiftFraction,
        normalDuty: record.normalDuty ?? defaults.normalDuty,
        extraDuty: record.extraDuty ?? defaults.extraDuty,
        otHours,
        otDayEquivalent,
        isReliever: autoIsReliever,
        ...(autoHomeSite ? { primarySiteName: autoHomeSite } : {}),
      };
      const existingMatch = !editId
        ? data.attendance.find((a) => {
            if (a.date !== normalizedRecord.date) return false;
            if (a.location.trim().toLowerCase() !== normalizedRecord.location.trim().toLowerCase()) {
              return false;
            }
            const recId = a.employeeId.trim().toUpperCase();
            const nextId = normalizedRecord.employeeId.trim().toUpperCase();
            if (nextId && recId && recId === nextId) return true;
            return (
              a.employeeName.trim().toLowerCase() === normalizedRecord.employeeName.trim().toLowerCase()
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
        const otHours =
          typeof rec.otHours === "number" && Number.isFinite(rec.otHours)
            ? Math.max(0, rec.otHours)
            : 0;
        const otDayEquivalent =
          typeof rec.otDayEquivalent === "number" && Number.isFinite(rec.otDayEquivalent)
            ? Math.max(0, rec.otDayEquivalent)
            : otHours > 0
              ? Number((otHours / 8).toFixed(3))
              : (rec.extraDuty ?? defaults.extraDuty);
        return {
          ...rec,
          monthKey: rec.monthKey || rec.date.slice(0, 7),
          shiftFraction: rec.shiftFraction ?? rec.normalDuty ?? defaults.normalDuty,
          normalDuty: rec.normalDuty ?? defaults.normalDuty,
          extraDuty: rec.extraDuty ?? defaults.extraDuty,
          otHours,
          otDayEquivalent,
        };
      });

      const matchesSameEntry = (a: AttendanceRecord, b: Omit<AttendanceRecord, "id">) => {
        if (a.date !== b.date) return false;
        if (a.location.trim().toLowerCase() !== b.location.trim().toLowerCase()) return false;
        const aId = a.employeeId.trim().toUpperCase();
        const bId = b.employeeId.trim().toUpperCase();
        if (aId && bId && aId === bId) return true;
        return a.employeeName.trim().toLowerCase() === b.employeeName.trim().toLowerCase();
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
                  statusValue === "Present" ||
                  statusValue === "Half Day" ||
                  statusValue === "Double Duty" ||
                  statusValue === "National Holiday"
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
    fetchAttendanceSiteSummary: async (month, date) => {
      if (status !== "authenticated") return null;
      try {
        const res = await apiRequest<{
          month?: string;
          date?: string;
          sites?: AttendanceSiteSummaryItem[];
        }>(
          `/api/admin/attendance/site-summary?month=${encodeURIComponent(month)}&date=${encodeURIComponent(date)}`,
        );
        return Array.isArray(res?.sites) ? res.sites : null;
      } catch {
        return null;
      }
    },
    fetchSiteMusterMatrix: async (params) => {
      if (status !== "authenticated") return null;
      try {
        const qs = new URLSearchParams();
        qs.set("site", params.site);
        if (params.siteId) qs.set("siteId", params.siteId);
        qs.set("month", params.month);
        if (params.page) qs.set("page", String(params.page));
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.search?.trim()) qs.set("search", params.search.trim());
        if (params.relieverOnly) qs.set("relieverOnly", "true");
        const res = await apiRequest<SiteMatrixResponse>(
          `/api/admin/attendance/site-matrix?${qs.toString()}`,
        );
        if (!Array.isArray(res?.rows) || !res?.pagination) return null;
        return res;
      } catch {
        return null;
      }
    },
    fetchMusterApproval: async (siteName, monthKey, subUnit = "") => {
      const localKey = `${siteName.trim().toLowerCase()}::${monthKey}::${subUnit.trim().toLowerCase()}`;
      if (status === "authenticated") {
        try {
          const list = await apiRequest<SiteMusterApproval[]>(
            `/api/admin/attendance/muster-approvals?site=${encodeURIComponent(siteName)}&month=${encodeURIComponent(monthKey)}`,
          );
          if (Array.isArray(list) && list.length > 0) {
            const matched =
              list.find(
                (item) => (item.subUnit ?? "").trim().toLowerCase() === subUnit.trim().toLowerCase(),
              ) ?? list[0]!;
            setMusterApprovals((prev) => ({ ...prev, [localKey]: matched }));
            return matched;
          }
        } catch {
          // Fall back to local cache in offline/test mode
        }
      }
      return musterApprovals[localKey] ?? null;
    },
    saveMusterApproval: async (payload) => {
      const localKey = `${payload.siteName.trim().toLowerCase()}::${payload.monthKey}::${(payload.subUnit ?? "").trim().toLowerCase()}`;
      const optimistic: SiteMusterApproval = {
        id: musterApprovals[localKey]?.id ?? uid("ma"),
        siteName: payload.siteName,
        monthKey: payload.monthKey,
        verificationStatus: payload.verificationStatus,
        totalNormalDuty: payload.totalNormalDuty,
        totalExtraDuty: payload.totalExtraDuty,
        totalOtHours: payload.totalOtHours,
        totalNhDays: payload.totalNhDays,
        totalBillableDuties: payload.totalBillableDuties,
        ...(payload.subUnit ? { subUnit: payload.subUnit } : {}),
        ...(payload.verifiedByName ? { verifiedByName: payload.verifiedByName } : {}),
        ...(payload.verifiedByDesignation ? { verifiedByDesignation: payload.verifiedByDesignation } : {}),
        ...(payload.verifiedDate ? { verifiedDate: payload.verifiedDate } : {}),
        ...(payload.attachment ? { attachment: payload.attachment } : {}),
        ...(payload.remarks ? { remarks: payload.remarks } : {}),
      };
      setMusterApprovals((prev) => ({ ...prev, [localKey]: optimistic }));
      setData((prev) => ({
        ...prev,
        activities: pushActivity(
          prev,
          "Muster sign-off updated",
          `${payload.siteName} (${payload.monthKey}) marked ${payload.verificationStatus}.`,
          "Attendance",
        ),
      }));

      if (status === "authenticated") {
        try {
          const saved = await apiRequest<SiteMusterApproval>(
            "/api/admin/attendance/muster-approvals",
            {
              method: "PUT",
              body: JSON.stringify(payload),
            },
          );
          if (saved && saved.verificationStatus) {
            setMusterApprovals((prev) => ({ ...prev, [localKey]: saved }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save muster sign-off.");
          return null;
        }
      }
      return optimistic;
    },
    uploadMusterScan: async (file) => {
      if (status === "authenticated") {
        try {
          const formData = new FormData();
          formData.append("file", file);
          const uploaded = await apiRequest<{
            fileName?: string;
            fileUrl?: string;
            mimeType?: string;
            uploadedAt?: string;
          }>("/api/admin/attendance/muster-approvals/upload", {
            method: "POST",
            body: formData,
          });
          if (uploaded?.fileUrl) {
            return {
              fileName: uploaded.fileName || file.name,
              fileUrl: uploaded.fileUrl,
              mimeType: uploaded.mimeType || file.type,
              uploadedAt: uploaded.uploadedAt || new Date().toISOString(),
            };
          }
        } catch {
          // Fallback to base64 data URL preview when offline or mocked
        }
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Could not read selected file."));
        reader.readAsDataURL(file);
      });
      return {
        fileName: file.name,
        fileUrl: dataUrl,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };
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
      void syncRemote<{
        employee?: EmployeeRecord;
        site?: SiteRecord | null;
        attendance?: AttendanceRecord;
        salary?: SalaryRecord;
      }>(
        "/api/admin/employees/quick",
        "POST",
        emp,
        (saved) => {
          setData((prev) => ({
            ...prev,
            sites: saved?.site
              ? prev.sites.some((s) => s.id === saved.site!.id)
                ? prev.sites.map((s) => (s.id === saved.site!.id ? saved.site! : s))
                : [saved.site, ...prev.sites]
              : prev.sites,
            employees: saved?.employee
              ? prev.employees.some((e) => e.id === saved.employee!.id)
                ? prev.employees.map((e) => (e.id === saved.employee!.id ? saved.employee! : e))
                : [saved.employee, ...prev.employees]
              : prev.employees,
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
    setSalaryHoldStatus: async (id, payoutStatus, holdReason) => {
      setData((prev) => ({
        ...prev,
        salaries: prev.salaries.map((s) =>
          s.id === id
            ? {
                ...s,
                payoutStatus,
                status:
                  payoutStatus === "HOLD" || payoutStatus === "CHQ_HOLD"
                    ? "On Hold"
                    : payoutStatus === "PAID"
                      ? "Processed"
                      : s.status === "On Hold"
                        ? "Pending"
                        : s.status,
                ...(holdReason !== undefined ? { holdReason } : {}),
              }
            : s,
        ),
      }));
      if (status === "authenticated" && !isTempId(id)) {
        try {
          const saved = await apiRequest<SalaryRecord>(`/api/admin/salaries/${id}/hold-status`, {
            method: "PATCH",
            body: JSON.stringify({ payoutStatus, ...(holdReason !== undefined ? { holdReason } : {}) }),
          });
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              salaries: prev.salaries.map((s) => (s.id === id ? saved : s)),
            }));
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update salary hold status.");
        }
      }
    },
    fetchSalaryAdvances: async (params = {}) => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 50;
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          qs.set("page", String(page));
          qs.set("limit", String(limit));
          if (params.month) qs.set("month", params.month);
          if (params.status && params.status !== "All") qs.set("status", params.status);
          if (params.site && params.site !== "All") qs.set("site", params.site);
          if (params.search?.trim()) qs.set("search", params.search.trim());
          const res = await apiRequestRaw<{
            data?: SalaryAdvanceRecord[];
            pagination?: PaginationMeta;
            summary?: {
              openCount: number;
              totalIssued: number;
              totalRecovered: number;
              totalOutstanding: number;
            };
          }>(`/api/admin/advances?${qs.toString()}`);
          if (Array.isArray(res?.data) && res?.pagination) {
            return {
              items: res.data,
              pagination: res.pagination,
              summary: res.summary ?? {
                openCount: res.data.filter((a) => a.status === "OPEN" || a.status === "PARTIAL").length,
                totalIssued: res.data.reduce((s, a) => s + a.amount, 0),
                totalRecovered: res.data.reduce((s, a) => s + a.recoveredAmount, 0),
                totalOutstanding: res.data.reduce((s, a) => s + a.remainingBalance, 0),
              },
            };
          }
        } catch {
          // Local fallback
        }
      }
      const list = data.salaryAdvances ?? [];
      const q = (params.search ?? "").trim().toLowerCase();
      const filtered = list.filter((a) => {
        const matchQ =
          !q ||
          a.employeeName.toLowerCase().includes(q) ||
          a.employeeId.toLowerCase().includes(q) ||
          a.onAccountOf.toLowerCase().includes(q) ||
          (a.legacyEmpCode ?? "").toLowerCase().includes(q);
        const matchM =
          !params.month || a.monthKey === params.month || a.targetPayrollMonth === params.month;
        const matchS = !params.status || params.status === "All" || a.status === params.status;
        const matchSite = !params.site || params.site === "All" || a.onAccountOf === params.site;
        return matchQ && matchM && matchS && matchSite;
      });
      const skip = (page - 1) * limit;
      return {
        items: filtered.slice(skip, skip + limit),
        pagination: buildLocalPagination(filtered.length, page, limit),
        summary: {
          openCount: list.filter((a) => a.status === "OPEN" || a.status === "PARTIAL").length,
          totalIssued: list.reduce((s, a) => s + (a.status !== "CANCELLED" ? a.amount : 0), 0),
          totalRecovered: list.reduce((s, a) => s + a.recoveredAmount, 0),
          totalOutstanding: list.reduce((s, a) => s + (a.status !== "CANCELLED" ? a.remainingBalance : 0), 0),
        },
      };
    },
    fetchAdvancePayrollPreview: async (month, site) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          qs.set("month", month);
          if (site && site !== "All") qs.set("site", site);
          const res = await apiRequest<{
            month?: string;
            totalDueThisMonth?: number;
            items?: Array<SalaryAdvanceRecord & { dueThisMonth: number; carriedForwardAfter: number }>;
          }>(`/api/admin/advances/payroll-preview?${qs.toString()}`);
          if (Array.isArray(res?.items)) {
            return {
              month: res.month || month,
              totalDueThisMonth: res.totalDueThisMonth ?? 0,
              items: res.items,
            };
          }
        } catch {
          // Local fallback
        }
      }
      const items = (data.salaryAdvances ?? [])
        .filter(
          (a) =>
            (a.status === "OPEN" || a.status === "PARTIAL") &&
            a.remainingBalance > 0 &&
            a.targetPayrollMonth <= month &&
            (!site || site === "All" || a.onAccountOf.toLowerCase() === site.toLowerCase()),
        )
        .map((a) => {
          const due =
            a.recoveryMode === "EMI"
              ? Math.min(a.remainingBalance, a.monthlyAmount || a.remainingBalance)
              : a.remainingBalance;
          return {
            ...a,
            dueThisMonth: Number(due.toFixed(2)),
            carriedForwardAfter: Number(Math.max(0, a.remainingBalance - due).toFixed(2)),
          };
        });
      return {
        month,
        totalDueThisMonth: Number(items.reduce((s, i) => s + i.dueThisMonth, 0).toFixed(2)),
        items,
      };
    },
    createSalaryAdvance: async (payload) => {
      const mKey = payload.date.slice(0, 7);
      const nextMonth = (() => {
        const [y, m] = mKey.split("-").map(Number);
        if (!y || !m) return mKey;
        return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      })();
      const targetPayrollMonth =
        payload.targetPayrollMonth || (payload.recoveryMode === "NEXT_MONTH" ? nextMonth : mKey);
      const staffNo =
        payload.staffNo ||
        Math.max(0, ...(data.salaryAdvances ?? []).filter((a) => a.monthKey === mKey).map((a) => a.staffNo)) + 1;
      const count = payload.recoveryMode === "EMI" ? Math.max(1, payload.installmentCount ?? 2) : 1;
      const monthly = payload.recoveryMode === "EMI" ? Number((payload.amount / count).toFixed(2)) : payload.amount;
      const tempAdvId = uid("adv");
      const tempVchId = uid("vch");
      const nextVchNo =
        Math.max(0, ...(data.vouchers ?? []).map((v) => v.voucherNo)) + 1;

      const optimisticAdv: SalaryAdvanceRecord = {
        id: tempAdvId,
        staffNo,
        monthKey: mKey,
        date: payload.date,
        employeeId: payload.employeeId?.trim().toUpperCase() || `ACS/ADV/${payload.date.slice(0, 4)}/${String(staffNo).padStart(3, "0")}`,
        ...(payload.legacyEmpCode ? { legacyEmpCode: payload.legacyEmpCode } : {}),
        employeeName: payload.employeeName.trim(),
        onAccountOf: payload.onAccountOf.trim(),
        amount: payload.amount,
        recoveryMode: payload.recoveryMode,
        installmentCount: count,
        monthlyAmount: monthly,
        targetPayrollMonth,
        recoveredAmount: 0,
        remainingBalance: payload.amount,
        status: "OPEN",
        signatures: {
          receiver: payload.signatures?.receiver || payload.employeeName,
          staff: payload.signatures?.staff || "",
          manager: payload.signatures?.manager || "",
          director: payload.signatures?.director || "",
        },
        ...(payload.issueVoucher ? { voucherId: tempVchId, voucherNo: nextVchNo } : {}),
        recoveryHistory: [],
        ...(payload.remarks ? { remarks: payload.remarks } : {}),
      };

      let optimisticVoucher: VoucherRecord | undefined;
      if (payload.issueVoucher) {
        const mode = payload.paymentMode ?? "CASH";
        optimisticVoucher = {
          id: tempVchId,
          voucherNo: nextVchNo,
          date: payload.date,
          monthKey: mKey,
          debitHead: payload.debitHead || "Advance to Staff",
          purposeType: "ADVANCE",
          payeeName: payload.employeeName.trim(),
          employeeId: optimisticAdv.employeeId,
          onAccountOf: payload.onAccountOf.trim(),
          particulars:
            payload.particulars ||
            `Being the Advance paid to ${payload.employeeName.trim()} (${payload.onAccountOf.trim()}) for ${mKey}`,
          amount: payload.amount,
          amountInWords: numberToIndianCurrencyWords(payload.amount),
          paymentMode: mode,
          salaryAdvanceId: tempAdvId,
          status: "POSTED",
        };
      }

      setData((prev) => ({
        ...prev,
        salaryAdvances: [optimisticAdv, ...(prev.salaryAdvances ?? [])],
        vouchers: optimisticVoucher
          ? [optimisticVoucher, ...(prev.vouchers ?? [])]
          : (prev.vouchers ?? []),
        activities: pushActivity(
          prev,
          "Salary advance issued",
          `Advance #${staffNo} of ₹${payload.amount} for ${payload.employeeName}.`,
          "Payroll",
        ),
      }));

      if (status === "authenticated") {
        try {
          const saved = await apiRequest<{ advance?: SalaryAdvanceRecord; voucher?: VoucherRecord }>(
            "/api/admin/advances",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );
          if (saved?.advance?.id) {
            setData((prev) => ({
              ...prev,
              salaryAdvances: (prev.salaryAdvances ?? []).map((a) =>
                a.id === tempAdvId ? saved.advance! : a,
              ),
              vouchers: saved.voucher
                ? [saved.voucher, ...(prev.vouchers ?? []).filter((v) => v.id !== tempVchId)]
                : (prev.vouchers ?? []),
            }));
            return {
              advance: saved.advance,
              ...(saved.voucher ? { voucher: saved.voucher } : {}),
            };
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save salary advance.");
          return null;
        }
      }
      return {
        advance: optimisticAdv,
        ...(optimisticVoucher ? { voucher: optimisticVoucher } : {}),
      };
    },
    updateSalaryAdvance: async (id, updates) => {
      let localUpdated: SalaryAdvanceRecord | null = null;
      setData((prev) => ({
        ...prev,
        salaryAdvances: (prev.salaryAdvances ?? []).map((a) => {
          if (a.id !== id) return a;
          let rec = a.recoveredAmount;
          let rem = a.remainingBalance;
          let nextStatus = updates.status ?? a.status;
          let history = a.recoveryHistory;
          if (updates.recordDeductionAmount && updates.recordDeductionAmount > 0) {
            const applied = Math.min(a.remainingBalance, updates.recordDeductionAmount);
            rec = Number((a.recoveredAmount + applied).toFixed(2));
            rem = Math.max(0, Number((a.amount - rec).toFixed(2)));
            nextStatus = rem <= 0 ? "RECOVERED" : "PARTIAL";
            history = [
              ...a.recoveryHistory,
              {
                monthKey: updates.deductMonth || todayIso().slice(0, 7),
                deductedAmount: applied,
                balanceAfter: rem,
                source: updates.source ?? "MANUAL",
                note: updates.note || `Recovered ₹${applied}`,
                recordedAt: todayIso(),
              },
            ];
          }
          localUpdated = {
            ...a,
            targetPayrollMonth: updates.targetPayrollMonth ?? a.targetPayrollMonth,
            signatures: updates.signatures ? { ...a.signatures, ...updates.signatures } : a.signatures,
            recoveredAmount: rec,
            remainingBalance: rem,
            status: nextStatus,
            recoveryHistory: history,
            ...(updates.remarks !== undefined ? { remarks: updates.remarks } : {}),
          };
          return localUpdated;
        }),
      }));
      if (status === "authenticated" && !isTempId(id)) {
        try {
          const saved = await apiRequest<SalaryAdvanceRecord>(`/api/admin/advances/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          });
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              salaryAdvances: (prev.salaryAdvances ?? []).map((a) => (a.id === id ? saved : a)),
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update advance.");
          return null;
        }
      }
      return localUpdated;
    },
    previewNextVoucherNo: async () => {
      if (status === "authenticated") {
        try {
          const res = await apiRequest<{ nextVoucherNo?: number }>("/api/admin/vouchers/next-number");
          if (typeof res?.nextVoucherNo === "number" && res.nextVoucherNo >= 1) {
            return res.nextVoucherNo;
          }
        } catch {
          // Local fallback
        }
      }
      return Math.max(0, ...(data.vouchers ?? []).map((v) => v.voucherNo)) + 1;
    },
    fetchVouchers: async (params = {}) => {
      const page = params.page ?? 1;
      const limit = params.limit ?? 50;
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          qs.set("page", String(page));
          qs.set("limit", String(limit));
          if (params.month) qs.set("month", params.month);
          if (params.paymentMode && params.paymentMode !== "All") qs.set("paymentMode", params.paymentMode);
          if (params.purposeType && params.purposeType !== "All") qs.set("purposeType", params.purposeType);
          if (params.status && params.status !== "All") qs.set("status", params.status);
          if (params.search?.trim()) qs.set("search", params.search.trim());
          const res = await apiRequestRaw<{
            data?: VoucherRecord[];
            pagination?: PaginationMeta;
            summary?: { totalCount: number; totalAmount: number; byMode: Record<string, number> };
          }>(`/api/admin/vouchers?${qs.toString()}`);
          if (Array.isArray(res?.data) && res?.pagination) {
            return {
              items: res.data,
              pagination: res.pagination,
              summary: res.summary ?? {
                totalCount: res.data.length,
                totalAmount: res.data.reduce((s, v) => s + v.amount, 0),
                byMode: { CASH: 0, CHEQUE: 0, BANK_TRANSFER: 0, UPI: 0 },
              },
            };
          }
        } catch {
          // Local fallback
        }
      }
      const list = data.vouchers ?? [];
      const q = (params.search ?? "").trim().toLowerCase();
      const filtered = list.filter((v) => {
        const matchQ =
          !q ||
          String(v.voucherNo).includes(q) ||
          v.payeeName.toLowerCase().includes(q) ||
          (v.employeeId ?? "").toLowerCase().includes(q) ||
          (v.onAccountOf ?? "").toLowerCase().includes(q) ||
          v.particulars.toLowerCase().includes(q);
        const matchM = !params.month || v.monthKey === params.month;
        const matchMode = !params.paymentMode || params.paymentMode === "All" || v.paymentMode === params.paymentMode;
        const matchPurp = !params.purposeType || params.purposeType === "All" || v.purposeType === params.purposeType;
        const matchS = !params.status || params.status === "All" || v.status === params.status;
        return matchQ && matchM && matchMode && matchPurp && matchS;
      });
      const skip = (page - 1) * limit;
      const byMode = { CASH: 0, CHEQUE: 0, BANK_TRANSFER: 0, UPI: 0 };
      list.forEach((v) => {
        if (v.status === "POSTED") byMode[v.paymentMode] += v.amount;
      });
      return {
        items: filtered.slice(skip, skip + limit),
        pagination: buildLocalPagination(filtered.length, page, limit),
        summary: {
          totalCount: filtered.length,
          totalAmount: Number(list.filter((v) => v.status === "POSTED").reduce((s, v) => s + v.amount, 0).toFixed(2)),
          byMode,
        },
      };
    },
    createVoucher: async (payload) => {
      const nextNo =
        payload.voucherNo && payload.voucherNo >= 1
          ? payload.voucherNo
          : Math.max(0, ...(data.vouchers ?? []).map((v) => v.voucherNo)) + 1;
      const tempId = uid("vch");
      const words = payload.amountInWords?.trim() || numberToIndianCurrencyWords(payload.amount);
      const optimistic: VoucherRecord = {
        id: tempId,
        voucherNo: nextNo,
        date: payload.date,
        monthKey: payload.date.slice(0, 7),
        debitHead: payload.debitHead,
        purposeType: payload.purposeType,
        payeeName: payload.payeeName.trim(),
        ...(payload.employeeId ? { employeeId: payload.employeeId.trim().toUpperCase() } : {}),
        ...(payload.onAccountOf ? { onAccountOf: payload.onAccountOf.trim() } : {}),
        particulars: payload.particulars.trim(),
        amount: payload.amount,
        amountInWords: words,
        paymentMode: payload.paymentMode,
        ...(payload.paymentMode === "CHEQUE" && payload.chequeDetails
          ? {
              chequeDetails: {
                chequeNo: payload.chequeDetails.chequeNo ?? "",
                chequeDate: payload.chequeDetails.chequeDate ?? payload.date,
                bankAccount: payload.chequeDetails.bankAccount ?? "436010200019707",
                ifsc: payload.chequeDetails.ifsc ?? "UTIB0000436",
                bankName: payload.chequeDetails.bankName ?? "AXIS BANK",
                chequeAmount: payload.chequeDetails.chequeAmount ?? payload.amount,
              },
            }
          : {}),
        ...(payload.paymentMode === "BANK_TRANSFER" && payload.bankTransferDetails
          ? {
              bankTransferDetails: {
                utrNumber: payload.bankTransferDetails.utrNumber ?? "",
                bankName: payload.bankTransferDetails.bankName ?? "AXIS BANK",
                bankAccount: payload.bankTransferDetails.bankAccount ?? "",
                transferDate: payload.bankTransferDetails.transferDate ?? payload.date,
              },
            }
          : {}),
        ...(payload.paymentMode === "UPI" && payload.upiDetails
          ? {
              upiDetails: {
                upiTransactionId: payload.upiDetails.upiTransactionId ?? "",
                upiId: payload.upiDetails.upiId ?? "",
                transferDate: payload.upiDetails.transferDate ?? payload.date,
              },
            }
          : {}),
        ...(payload.salaryAdvanceId ? { salaryAdvanceId: payload.salaryAdvanceId } : {}),
        ...(payload.salaryId ? { salaryId: payload.salaryId } : {}),
        ...(payload.salaryLineItemId ? { salaryLineItemId: payload.salaryLineItemId } : {}),
        ...(payload.preparedBy ? { preparedBy: payload.preparedBy } : {}),
        ...(payload.approvedBy ? { approvedBy: payload.approvedBy } : {}),
        ...(payload.receivedBy ? { receivedBy: payload.receivedBy } : {}),
        ...(payload.remarks ? { remarks: payload.remarks } : {}),
        status: "POSTED",
      };

      setData((prev) => ({
        ...prev,
        vouchers: [optimistic, ...(prev.vouchers ?? [])],
        salaries: payload.salaryId
          ? prev.salaries.map((s) =>
              s.id === payload.salaryId
                ? {
                    ...s,
                    status: "Processed",
                    payoutStatus: "PAID",
                    paidAmount: (s.paidAmount ?? 0) + payload.amount,
                    paymentMode: payload.paymentMode,
                    voucherId: tempId,
                    voucherNo: nextNo,
                  }
                : s,
            )
          : prev.salaries,
        salaryAdvances: payload.salaryAdvanceId
          ? (prev.salaryAdvances ?? []).map((a) =>
              a.id === payload.salaryAdvanceId
                ? { ...a, voucherId: tempId, voucherNo: nextNo }
                : a,
            )
          : (prev.salaryAdvances ?? []),
        activities: pushActivity(
          prev,
          "Payment voucher issued",
          `Voucher #${nextNo} (${payload.paymentMode}) ₹${payload.amount} to ${payload.payeeName}.`,
          "Payroll",
        ),
      }));

      if (status === "authenticated") {
        try {
          const saved = await apiRequest<{
            voucher?: VoucherRecord;
            salary?: SalaryRecord;
            salaryLineItem?: SalaryLineItemRecord;
          }>("/api/admin/vouchers", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (saved?.voucher?.id) {
            setData((prev) => ({
              ...prev,
              vouchers: (prev.vouchers ?? []).map((v) => (v.id === tempId ? saved.voucher! : v)),
              salaries: saved.salary
                ? prev.salaries.map((s) => (s.id === saved.salary!.id ? saved.salary! : s))
                : prev.salaries,
            }));
            return {
              voucher: saved.voucher,
              ...(saved.salary ? { salary: saved.salary } : {}),
              ...(saved.salaryLineItem ? { salaryLineItem: saved.salaryLineItem } : {}),
            };
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to issue voucher.");
          return null;
        }
      }
      return { voucher: optimistic };
    },
    cancelVoucher: async (id) => {
      setData((prev) => ({
        ...prev,
        vouchers: (prev.vouchers ?? []).map((v) =>
          v.id === id ? { ...v, status: "CANCELLED" as const } : v,
        ),
      }));
      if (status === "authenticated" && !isTempId(id)) {
        try {
          await apiRequest(`/api/admin/vouchers/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "CANCELLED" }),
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to cancel voucher.");
          return false;
        }
      }
      return true;
    },
    fetchSalaryRuleProfiles: async (params = {}) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          if (params.search?.trim()) qs.set("search", params.search.trim());
          if (params.siteId) qs.set("siteId", params.siteId);
          const list = await apiRequest<SalaryRuleProfileRecord[]>(
            `/api/admin/salary-rules${qs.toString() ? `?${qs.toString()}` : ""}`,
          );
          if (Array.isArray(list)) {
            setData((prev) => ({ ...prev, salaryRuleProfiles: list }));
            return list;
          }
        } catch {
          // Local fallback
        }
      }
      const list = data.salaryRuleProfiles ?? [];
      const q = (params.search ?? "").trim().toLowerCase();
      return list.filter(
        (r) =>
          (!q ||
            r.profileCode.toLowerCase().includes(q) ||
            r.profileName.toLowerCase().includes(q) ||
            (r.siteName ?? "").toLowerCase().includes(q)) &&
          (!params.siteId || r.siteId === params.siteId),
      );
    },
    createSalaryRuleProfile: async (payload) => {
      if (status === "authenticated") {
        try {
          const saved = await apiRequest<SalaryRuleProfileRecord>("/api/admin/salary-rules", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              salaryRuleProfiles: [saved, ...(prev.salaryRuleProfiles ?? [])],
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save salary rule profile.");
          return null;
        }
      }
      return null;
    },
    updateSalaryRuleProfile: async (id, updates) => {
      setData((prev) => ({
        ...prev,
        salaryRuleProfiles: (prev.salaryRuleProfiles ?? []).map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
      }));
      if (status === "authenticated" && !isTempId(id)) {
        try {
          const saved = await apiRequest<SalaryRuleProfileRecord>(`/api/admin/salary-rules/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          });
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              salaryRuleProfiles: (prev.salaryRuleProfiles ?? []).map((r) =>
                r.id === id ? saved : r,
              ),
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update salary rule profile.");
          return null;
        }
      }
      return null;
    },
    deleteSalaryRuleProfile: async (id) => {
      if (status === "authenticated" && !isTempId(id)) {
        try {
          await apiRequest(`/api/admin/salary-rules/${id}`, { method: "DELETE" });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete rule profile.");
          return false;
        }
      }
      setData((prev) => ({
        ...prev,
        salaryRuleProfiles: (prev.salaryRuleProfiles ?? []).filter((r) => r.id !== id),
      }));
      return true;
    },
    fetchPayrollRuns: async (params = {}) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          if (params.monthKey) qs.set("monthKey", params.monthKey);
          if (params.siteName && params.siteName !== "All") qs.set("siteName", params.siteName);
          if (params.status && params.status !== "All") qs.set("status", params.status);
          const runs = await apiRequest<PayrollRunRecord[]>(
            `/api/admin/payroll-runs${qs.toString() ? `?${qs.toString()}` : ""}`,
          );
          if (Array.isArray(runs)) {
            setData((prev) => ({ ...prev, payrollRuns: runs }));
            return runs;
          }
        } catch {
          // Local fallback
        }
      }
      return (data.payrollRuns ?? []).filter(
        (r) =>
          (!params.monthKey || r.monthKey === params.monthKey) &&
          (!params.siteName || params.siteName === "All" || r.siteName === params.siteName) &&
          (!params.status || params.status === "All" || r.status === params.status),
      );
    },
    fetchPayrollRunDetail: async (id) => {
      if (status === "authenticated") {
        try {
          const detail = await apiRequest<{
            run: PayrollRunRecord;
            lineItems: SalaryLineItemRecord[];
          }>(`/api/admin/payroll-runs/${id}`);
          if (detail?.run?.id) return detail;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to load payroll run detail.");
        }
      }
      return null;
    },
    generatePayrollRun: async (payload) => {
      if (status === "authenticated") {
        try {
          const res = await apiRequest<{
            run: PayrollRunRecord;
            ruleProfile: SalaryRuleProfileRecord;
            lineItems: SalaryLineItemRecord[];
          }>("/api/admin/payroll-runs/generate", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (res?.run?.id) {
            setData((prev) => ({
              ...prev,
              payrollRuns: [
                res.run,
                ...(prev.payrollRuns ?? []).filter((r) => r.id !== res.run.id),
              ],
            }));
            return res;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to generate payroll run.");
          return null;
        }
      }
      return null;
    },
    updatePayrollLineItem: async (lineId, updates) => {
      if (status === "authenticated") {
        try {
          const res = await apiRequest<{
            lineItem: SalaryLineItemRecord;
            run: PayrollRunRecord | null;
          }>(`/api/admin/payroll-runs/line-items/${lineId}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          });
          if (res?.lineItem?.id) {
            if (res.run) {
              setData((prev) => ({
                ...prev,
                payrollRuns: (prev.payrollRuns ?? []).map((r) =>
                  r.id === res.run!.id ? res.run! : r,
                ),
              }));
            }
            return res;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update salary line item.");
          return null;
        }
      }
      return null;
    },
    updatePayrollRunStatus: async (runId, nextStatus) => {
      if (status === "authenticated") {
        try {
          const saved = await apiRequest<PayrollRunRecord>(
            `/api/admin/payroll-runs/${runId}/status`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: nextStatus }),
            },
          );
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              payrollRuns: (prev.payrollRuns ?? []).map((r) => (r.id === runId ? saved : r)),
            }));
            if (nextStatus === "LOCKED") {
              void refreshData();
            }
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update payroll run status.");
          return null;
        }
      }
      return null;
    },
    fetchPayrollBankAdvice: async (runId) => {
      if (status === "authenticated") {
        try {
          return await apiRequest<BankAdviceResponse>(`/api/admin/payroll-runs/${runId}/bank-advice`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to load bank advice.");
          return null;
        }
      }
      return null;
    },
    fetchComplianceExport: async (params = {}) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          if (params.monthKey) qs.set("monthKey", params.monthKey);
          if (params.siteName && params.siteName !== "All") qs.set("siteName", params.siteName);
          return await apiRequest<ComplianceExportResponse>(
            `/api/admin/statutory/compliance-export${qs.toString() ? `?${qs.toString()}` : ""}`,
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to export statutory compliance data.");
          return null;
        }
      }
      return null;
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
    fetchBillingRuleProfiles: async (params = {}) => {
      if (status === "authenticated") {
        try {
          const qs = new URLSearchParams();
          if (params.search?.trim()) qs.set("search", params.search.trim());
          if (params.siteId) qs.set("siteId", params.siteId);
          const list = await apiRequest<BillingRuleProfileRecord[]>(
            `/api/admin/billing-rules${qs.toString() ? `?${qs.toString()}` : ""}`,
          );
          if (Array.isArray(list)) {
            setData((prev) => ({ ...prev, billingRuleProfiles: list }));
            return list;
          }
        } catch {
          // Local fallback
        }
      }
      const list = data.billingRuleProfiles ?? [];
      const q = (params.search ?? "").trim().toLowerCase();
      return list.filter(
        (r) =>
          (!q ||
            r.profileCode.toLowerCase().includes(q) ||
            r.profileName.toLowerCase().includes(q) ||
            (r.siteName ?? "").toLowerCase().includes(q)) &&
          (!params.siteId || r.siteId === params.siteId),
      );
    },
    createBillingRuleProfile: async (payload) => {
      if (status === "authenticated") {
        try {
          const saved = await apiRequest<BillingRuleProfileRecord>("/api/admin/billing-rules", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              billingRuleProfiles: [saved, ...(prev.billingRuleProfiles ?? [])],
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save billing rule.");
          return null;
        }
      }
      return null;
    },
    updateBillingRuleProfile: async (id, updates) => {
      setData((prev) => ({
        ...prev,
        billingRuleProfiles: (prev.billingRuleProfiles ?? []).map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
      }));
      if (status === "authenticated" && !isTempId(id)) {
        try {
          const saved = await apiRequest<BillingRuleProfileRecord>(
            `/api/admin/billing-rules/${id}`,
            {
              method: "PATCH",
              body: JSON.stringify(updates),
            },
          );
          if (saved?.id) {
            setData((prev) => ({
              ...prev,
              billingRuleProfiles: (prev.billingRuleProfiles ?? []).map((r) =>
                r.id === id ? saved : r,
              ),
            }));
            return saved;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update billing rule.");
          return null;
        }
      }
      return null;
    },
    previewNextInvoiceNumber: async (invoiceDate) => {
      if (status === "authenticated") {
        try {
          const qs = invoiceDate ? `?invoiceDate=${encodeURIComponent(invoiceDate)}` : "";
          const res = await apiRequest<{ nextInvoiceNumber?: string }>(
            `/api/admin/invoices/next-number${qs}`,
          );
          if (res?.nextInvoiceNumber) return res.nextInvoiceNumber;
        } catch {
          // Local fallback
        }
      }
      return `ADV/NOV26/${String(data.invoices.length + 1).padStart(2, "0")}`;
    },
    generateSiteInvoice: async (payload) => {
      if (status === "authenticated") {
        try {
          const res = await apiRequest<{
            invoice: InvoiceRecord;
            ruleProfile: BillingRuleProfileRecord;
          }>("/api/admin/invoices/generate", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (res?.invoice?.id) {
            setData((prev) => ({
              ...prev,
              invoices: [res.invoice, ...prev.invoices],
            }));
            return res;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to generate site invoice.");
          return null;
        }
      }
      return null;
    },
    addInvoiceDeduction: async (invoiceId, payload) => {
      if (status === "authenticated" && !isTempId(invoiceId)) {
        try {
          const updated = await apiRequest<InvoiceRecord>(
            `/api/admin/invoices/${invoiceId}/deductions`,
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );
          if (updated?.id) {
            setData((prev) => ({
              ...prev,
              invoices: prev.invoices.map((i) => (i.id === invoiceId ? updated : i)),
            }));
            return updated;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to record deduction slip.");
          return null;
        }
      }
      return null;
    },
    recordInvoiceReceipt: async (invoiceId, payload) => {
      if (status === "authenticated" && !isTempId(invoiceId)) {
        try {
          const updated = await apiRequest<InvoiceRecord>(
            `/api/admin/invoices/${invoiceId}/receipts`,
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );
          if (updated?.id) {
            setData((prev) => ({
              ...prev,
              invoices: prev.invoices.map((i) => (i.id === invoiceId ? updated : i)),
            }));
            return updated;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to record payment receipt.");
          return null;
        }
      }
      return null;
    },
    updateInvoicePaymentStage: async (invoiceId, paymentStage) => {
      if (status === "authenticated" && !isTempId(invoiceId)) {
        try {
          const updated = await apiRequest<InvoiceRecord>(
            `/api/admin/invoices/${invoiceId}/stage`,
            {
              method: "PATCH",
              body: JSON.stringify({ paymentStage }),
            },
          );
          if (updated?.id) {
            setData((prev) => ({
              ...prev,
              invoices: prev.invoices.map((i) => (i.id === invoiceId ? updated : i)),
            }));
            return updated;
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update payment stage.");
          return null;
        }
      }
      return null;
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

export function useOptionalAcsStore(): AcsStoreContextValue | null {
  return useContext(AcsStoreContext);
}
