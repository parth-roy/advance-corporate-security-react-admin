export type SiteGstMode = "INTRA_CGST_SGST" | "INTER_IGST" | "RCM" | "NON_GST";

export interface SiteRecord {
  id: string;
  siteCode: string;
  siteName: string;
  shortName?: string;
  clientName: string;
  billToAddress?: string;
  shipToAddress?: string;
  clientGstin?: string;
  stateCode?: string;
  vendorCode?: string;
  contractRef?: string;
  subUnits?: string[];
  sacCode?: string;
  gstMode: SiteGstMode;
  serviceChargePct?: number;
  isActive: boolean;
  notes?: string;
  employeeCount?: number;
}

export type EmployeeStatus = "ACTIVE" | "ON_HOLD" | "LEFT" | "TRANSFERRED";
export type EmployeeRateType = "DAILY" | "MONTHLY";
export type PaymentMode = "BANK_TRANSFER" | "CHEQUE" | "CASH" | "UPI";

export interface EmployeeBankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  preferredPaymentMode: PaymentMode;
}

export interface EmployeeStatutoryInfo {
  esiHolder: "Yes" | "No" | "";
  esiNumber: string;
  pfUan: string;
}

export interface OriginalIdCustodyInfo {
  documentType: string;
  referenceNo: string;
  depositedDate: string;
  inCustody: boolean;
  notes: string;
}

export interface EmployeeRecord {
  id: string;
  empCode: string;
  legacyEmpCode?: string;
  candidateId?: string | null;
  primarySiteId?: string | null;
  siteName: string;
  subUnit?: string;
  fullName: string;
  fatherOrHusbandName?: string;
  dateOfBirth?: string;
  permanentAddress?: string;
  presentAddress?: string;
  maritalStatus?: string;
  highestQualification?: string;
  mobile: string;
  email?: string;
  designation: string;
  serviceCategory?: string;
  dateOfJoining?: string;
  rateType: EmployeeRateType;
  baseRate: number;
  bankDetails?: EmployeeBankDetails;
  statutory?: EmployeeStatutoryInfo;
  originalIdCustody?: OriginalIdCustodyInfo;
  nomineeName?: string;
  familyMembers?: FamilyMember[];
  documents?: CandidateDocuments;
  remarks?: string;
  status: EmployeeStatus;
  exitDate?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type CandidateStatus = "New" | "Shortlisted" | "Selected" | "Rejected";

export interface FamilyMember {
  name: string;
  relation: string;
  dateOfBirth: string;
}

export interface UploadedDocumentFile {
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  uploadedAt?: string;
}

export type AcademicLevel = "10th" | "12th" | "Graduation" | "Masters";

export interface AcademicQualificationDocs {
  "10th"?: UploadedDocumentFile;
  "12th"?: UploadedDocumentFile;
  Graduation?: UploadedDocumentFile;
  Masters?: UploadedDocumentFile;
}

export interface PreviousEsiPfDocument extends UploadedDocumentFile {
  esiNumber?: string;
  pfNumber?: string;
}

export interface CandidateDocuments {
  aadharCard?: UploadedDocumentFile;
  panCard?: UploadedDocumentFile;
  bankDetails?: UploadedDocumentFile;
  voterId?: UploadedDocumentFile;
  academicQualification?: AcademicQualificationDocs;
  colorPhoto?: UploadedDocumentFile;
  pcc?: UploadedDocumentFile;
  mfc?: UploadedDocumentFile;
  characterCertificate?: UploadedDocumentFile;
  previousEsiPf?: Partial<UploadedDocumentFile> & {
    esiNumber?: string;
    pfNumber?: string;
  };
  previousExperienceProof?: UploadedDocumentFile;
  otherDocument?: UploadedDocumentFile;
}

export interface Candidate {
  id: string;
  employeeId?: string;
  siteId?: string | null;
  convertedEmployeeObjectId?: string | null;
  convertedAt?: string;
  fullName: string;
  fatherOrHusbandName?: string;
  dateOfBirth?: string;
  permanentAddress?: string;
  presentAddress?: string;
  maritalStatus?: string;
  highestQualification?: string;
  mobile: string;
  email: string;
  height?: string;
  weight?: string;
  chest?: string;
  position: string; // Designation
  identificationMark?: string;
  identificationMarks?: string[];
  location: string; // Site
  experience: string;
  serviceCategory?: string;
  reference?: string;
  applicationDate: string;
  status: CandidateStatus;
  dateOfJoining?: string;
  joiningAs?: string;
  salary?: string;
  nomineeName?: string;
  esiHolder?: "Yes" | "No" | "";
  esiNumber?: string;
  uanNumber?: string;
  familyMembers?: FamilyMember[];
  declarationAccepted?: boolean;
  declarationDate?: string;
  declarationPlace?: string;
  applicantSignature?: string;
  documents?: CandidateDocuments;
  resumeName: string;
  remarks: string;
}

export type UniformCategory =
  | "Shirt"
  | "T-Shirt"
  | "Pant"
  | "Belt"
  | "Shoe"
  | "Badge"
  | "Cap"
  | "Lanyard + Whistle"
  | "Safety Shoe"
  | "Safety Gloves"
  | "Jacket"
  | "Safety Helmet"
  | "ID Card";

export interface UniformItem {
  id: string;
  name: string;
  category: UniformCategory;
  subCategory?: string;
  size: string;
  unitPrice: number;
  availableQty: number;
  issuedQty: number;
  lastUpdated: string;
}

export type UniformIssueMode = "INDIVIDUAL" | "BULK_SITE";

export type UniformRecoveryMode = "ONE_TIME" | "EMI_COUNT" | "FIXED_MONTHLY" | "NO_RECOVERY";

export type UniformRecoveryStatus = "ACTIVE" | "PAUSED" | "SETTLED" | "CANCELLED";

export interface UniformInstallmentEntry {
  monthKey: string;
  scheduledAmount: number;
  deductedAmount: number;
  balanceAfter: number;
  source: "PAYROLL" | "MANUAL" | "RETURN_CREDIT";
  note: string;
  recordedAt: string;
}

export interface UniformRecoveryPlan {
  id: string;
  batchId?: string;
  issueIds: string[];
  employeeObjectId?: string | null;
  employeeId: string;
  legacyEmpCode?: string;
  employeeName: string;
  siteId?: string | null;
  siteName: string;
  totalCharge: number;
  recoveryMode: UniformRecoveryMode;
  installmentCount: number;
  monthlyAmount: number;
  startMonth: string;
  recoveredAmount: number;
  creditedAmount: number;
  remainingBalance: number;
  status: UniformRecoveryStatus;
  lastDeductedMonth?: string;
  installmentHistory: UniformInstallmentEntry[];
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UniformIssueRecord {
  id: string;
  batchId?: string;
  issueMode?: UniformIssueMode;
  serialNo?: string;
  siteId?: string | null;
  employeeObjectId?: string | null;
  employeeId: string;
  legacyEmpCode?: string;
  employeeName: string;
  mobile?: string;
  site: string;
  itemId: string;
  itemName: string;
  category?: string;
  subCategory?: string;
  size: string;
  quantity: number;
  returnedQty?: number;
  returnedAmount?: number;
  unitPrice: number;
  registrationCharge?: number;
  totalAmount: number;
  issueDate: string;
  returnDate?: string;
  issuedBy?: string;
  receivedBy?: string;
  verifiedBy?: string;
  originalDocHeld?: string;
  billToSite?: boolean;
  recoveryPlanId?: string | null;
  remarks?: string;
  status: "Issued" | "Returned";
}

export interface UniformStockLog {
  id: string;
  itemName: string;
  action: "Added" | "Restocked" | "Issued" | "Returned";
  quantity: number;
  date: string;
  note: string;
}

export type AttendanceStatus =
  | "Present"
  | "Double Duty"
  | "Absent"
  | "Half Day"
  | "Leave"
  | "Weekly Off"
  | "National Holiday";

export type AttendanceDutyType = "P" | "P/P" | "H" | "A" | "L" | "WO" | "NH" | "CUSTOM";

export type MusterVerificationStatus =
  | "DRAFT"
  | "SUPERVISOR_SUBMITTED"
  | "CLIENT_VERIFIED"
  | "LOCKED_FOR_BILLING";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  location: string;
  workSiteId?: string;
  employeeObjectId?: string;
  monthKey?: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: AttendanceStatus;
  dutyType?: AttendanceDutyType;
  shiftFraction?: number;
  normalDuty?: number;
  extraDuty?: number;
  otHours?: number;
  otDayEquivalent?: number;
  isReliever?: boolean;
  primarySiteName?: string;
  adjustmentNote?: string;
  remarks?: string;
}

export interface SiteMusterApproval {
  id: string;
  siteId?: string;
  siteName: string;
  subUnit?: string;
  monthKey: string;
  verificationStatus: MusterVerificationStatus;
  verifiedByName?: string;
  verifiedByDesignation?: string;
  verifiedDate?: string;
  totalNormalDuty: number;
  totalExtraDuty: number;
  totalOtHours: number;
  totalNhDays: number;
  totalBillableDuties: number;
  attachment?: UploadedDocumentFile;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MusterApprovalSavePayload {
  siteName: string;
  subUnit?: string;
  monthKey: string;
  verificationStatus: MusterVerificationStatus;
  verifiedByName?: string;
  verifiedByDesignation?: string;
  verifiedDate?: string;
  totalNormalDuty: number;
  totalExtraDuty: number;
  totalOtHours: number;
  totalNhDays: number;
  totalBillableDuties: number;
  attachment?: UploadedDocumentFile;
  remarks?: string;
}

export interface AttendanceSiteSummaryItem {
  siteId?: string | null;
  siteCode?: string;
  siteName: string;
  staffCount: number;
  present: number;
  doubleDuty: number;
  absent: number;
  unmarked: number;
  monthNormalDuty: number;
  monthExtraDuty: number;
  monthOtHours: number;
  monthNhDays: number;
  monthDuty: number;
  relieverCount: number;
  verificationStatus: MusterVerificationStatus;
}

export interface SiteMatrixDayCell {
  id: string;
  status: AttendanceStatus;
  code: AttendanceDutyType;
  normalDuty: number;
  extraDuty: number;
  otHours: number;
  otDayEquivalent: number;
  shiftFraction: number;
  isReliever: boolean;
  adjustmentNote: string;
  remarks: string;
}

export interface SiteMatrixRow {
  key: string;
  employeeObjectId?: string | null;
  employeeId: string;
  employeeName: string;
  designation: string;
  subUnit: string;
  isReliever: boolean;
  homeSiteName: string;
  days: Record<number, SiteMatrixDayCell>;
  normalDuty: number;
  extraDuty: number;
  otHours: number;
  otDayEquivalent: number;
  nhDays: number;
  totalDuty: number;
}

export interface SiteMatrixResponse {
  site: SiteRecord | { siteName: string };
  month: string;
  daysInMonth: number;
  rows: SiteMatrixRow[];
  pagination: PaginationMeta;
  totals: {
    totalStaff: number;
    relieverCount: number;
    normalDuty: number;
    extraDuty: number;
    otHours: number;
    nhDays: number;
    totalDuty: number;
  };
  musterApproval: SiteMusterApproval | null;
}

export type StatutoryStatus = "Active" | "Pending" | "Exempt";

export interface ContributionHistoryItem {
  month: string;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  status: "Filed" | "Pending";
}

export interface StatutoryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  location: string;
  month: string;
  uanNumber: string;
  esiNumber: string;
  basicSalary: number;
  pfStatus: StatutoryStatus;
  esiStatus: StatutoryStatus;
  pfEmployeeShare: number;
  pfEmployerShare: number;
  esiEmployeeShare: number;
  esiEmployerShare: number;
  history: ContributionHistoryItem[];
}

export type SalaryStatus = "Pending" | "Processed" | "On Hold";
export type SalaryPayoutStatus = "UNPAID" | "HOLD" | "CHQ_HOLD" | "PAID";

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  category: "Security Personnel" | "Supervisory Staff" | "Operations & Admin";
  location: string;
  month: string;
  year: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  otherEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  otherDeductions: number;
  status: SalaryStatus;
  payoutStatus?: SalaryPayoutStatus;
  paidAmount?: number;
  paymentMode?: PaymentMode;
  voucherId?: string | null;
  voucherNo?: number | null;
  holdReason?: string;
}

export type AdvanceRecoveryMode = "SAME_MONTH" | "NEXT_MONTH" | "EMI" | "MANUAL";
export type AdvanceStatus = "OPEN" | "PARTIAL" | "RECOVERED" | "CANCELLED";

export interface AdvanceRecoveryEntry {
  monthKey: string;
  deductedAmount: number;
  balanceAfter: number;
  source: "PAYROLL" | "MANUAL";
  note: string;
  recordedAt: string;
}

export interface AdvanceSignatures {
  receiver: string;
  staff: string;
  manager: string;
  director: string;
}

export interface SalaryAdvanceRecord {
  id: string;
  staffNo: number;
  monthKey: string;
  date: string;
  employeeObjectId?: string | null;
  employeeId: string;
  legacyEmpCode?: string;
  employeeName: string;
  siteId?: string | null;
  onAccountOf: string;
  amount: number;
  recoveryMode: AdvanceRecoveryMode;
  installmentCount: number;
  monthlyAmount: number;
  targetPayrollMonth: string;
  recoveredAmount: number;
  remainingBalance: number;
  status: AdvanceStatus;
  signatures: AdvanceSignatures;
  voucherId?: string | null;
  voucherNo?: number | null;
  recoveryHistory: AdvanceRecoveryEntry[];
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VoucherPurposeType =
  | "SALARY_PAYOUT"
  | "HOLD_RELEASE"
  | "ADVANCE"
  | "ADJUSTMENT"
  | "EXPENSE";

export interface VoucherChequeDetails {
  chequeNo: string;
  chequeDate: string;
  bankAccount: string;
  ifsc: string;
  bankName: string;
  chequeAmount: number;
}

export interface VoucherBankTransferDetails {
  utrNumber: string;
  bankName: string;
  bankAccount: string;
  transferDate: string;
}

export interface VoucherUpiDetails {
  upiTransactionId: string;
  upiId: string;
  transferDate: string;
}

export interface VoucherRecord {
  id: string;
  voucherNo: number;
  date: string;
  monthKey: string;
  debitHead: string;
  purposeType: VoucherPurposeType;
  payeeName: string;
  employeeObjectId?: string | null;
  employeeId?: string;
  siteId?: string | null;
  onAccountOf?: string;
  particulars: string;
  amount: number;
  amountInWords: string;
  paymentMode: PaymentMode;
  chequeDetails?: VoucherChequeDetails;
  bankTransferDetails?: VoucherBankTransferDetails;
  upiDetails?: VoucherUpiDetails;
  salaryAdvanceId?: string | null;
  salaryId?: string | null;
  salaryLineItemId?: string | null;
  preparedBy?: string;
  approvedBy?: string;
  receivedBy?: string;
  status: "POSTED" | "CANCELLED";
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PayslipStatus = "Generated" | "Pending";

export type WageBasisType =
  | "DAILY_RATE"
  | "MONTHLY_DIV_26"
  | "MONTHLY_DIV_30"
  | "MONTHLY_DIV_CALENDAR";

export type OtCalcMethod =
  | "NONE"
  | "FLAT_OT_RATE"
  | "DAILY_RATE_OT"
  | "HOURLY_DOUBLE_OT"
  | "HOURLY_SINGLE_MERGE"
  | "SHIFT_RATIO_OT";

export type AllowanceMethod =
  | "NONE"
  | "FIXED_ALLOWANCE"
  | "BHEL_ENHANCED"
  | "GRSE_5PCT_CANTEEN"
  | "SOHAM_FACTORY_SPLIT";

export type BonusMode = "NONE" | "IN_GROSS" | "OUTSIDE_GROSS";
export type BonusWageBase = "PRESENT_WAGES" | "PRESENT_PLUS_EXTRA";
export type BonusCapType = "NONE" | "WAGE_21000" | "DAYS_26";

export type EpfVariant =
  | "UNCAPPED_12"
  | "CAP_15000"
  | "CAP_25000"
  | "CAP_DAYS_26"
  | "CAP_FULL_MONTH"
  | "FIXED_DAILY_399_26"
  | "EMPLOYER_RATIO_DAYS"
  | "FIXED_6000_DIV_30"
  | "SOHAM_BASIC_12"
  | "EXEMPT";

export type EpfWageBase = "PRESENT_WAGES" | "PRESENT_PLUS_EXTRA" | "GROSS";

export type EsiVariant =
  | "UNCAPPED_075"
  | "CAP_21000"
  | "CAP_DAYS_30"
  | "CAP_FULL_MONTH"
  | "FIXED_DAILY_399_26"
  | "FIXED_6000_DIV_30"
  | "SOHAM_EXCL_FUEL_WASHING"
  | "EXEMPT";

export type PtSlabType = "WB_STANDARD" | "WB_SITE_VARIANT" | "EXEMPT";
export type PayrollRoundMode = "ROUND" | "ROUNDUP" | "EXACT_PAISE";

export interface FactoryComponentsBreakdown {
  basic: number;
  hra: number;
  uniformAllowance: number;
  medical: number;
  fuel: number;
  washing: number;
  balancingAllowance: number;
}

export interface SalaryRuleProfileRecord {
  id: string;
  profileCode: string;
  profileName: string;
  siteId?: string | null;
  siteName?: string;
  siteMatchKeywords?: string[];
  designationFilter?: string;
  effectiveFrom: string;
  isTemplate: boolean;
  isActive: boolean;
  wageBasis: WageBasisType;
  otMethod: OtCalcMethod;
  otFixedRate: number;
  shiftRatioNumerator: number;
  shiftRatioDenominator: number;
  allowanceMethod: AllowanceMethod;
  fixedAllowanceMonthly: number;
  bhelEnhancedMonthly: number;
  grseAllowancePct: number;
  canteenRatePerDay: number;
  bonusMode: BonusMode;
  bonusRatePct: number;
  bonusCapType: BonusCapType;
  epfVariant: EpfVariant;
  epfWageBase: EpfWageBase;
  employerEpfRatePct: number;
  esiVariant: EsiVariant;
  employerEsiRatePct: number;
  ptSlabType: PtSlabType;
  deductPtFromEmployee: boolean;
  gemChargeMonthly: number;
  adminChargeMonthly: number;
  roundMode: PayrollRoundMode;
  notes?: string;
}

export type PayrollRunStatus = "DRAFT" | "REVIEWED" | "LOCKED";
export type LineItemPayoutStatus =
  | "UNPAID"
  | "HOLD"
  | "CHQ_HOLD"
  | "PAID"
  | "PARTIAL_PAID"
  | "LEFT"
  | "TRANSFERRED_ADJUST";

export interface PayrollRunRecord {
  id: string;
  runCode: string;
  monthKey: string;
  monthLabel: string;
  daysInMonth: number;
  siteId?: string | null;
  siteName: string;
  ruleProfileId?: string | null;
  ruleProfileCode: string;
  ruleProfileName: string;
  status: PayrollRunStatus;
  headcount: number;
  totalGross: number;
  totalBonusOutsideGross: number;
  totalEpfEmployee: number;
  totalEpfEmployer: number;
  totalEsiEmployee: number;
  totalEsiEmployer: number;
  totalPt: number;
  totalUniformDeduction: number;
  totalAdvanceDeduction: number;
  totalNetPay: number;
  lockedAt?: string;
  remarks?: string;
}

export interface SalaryLineItemRecord {
  id: string;
  payrollRunId: string;
  monthKey: string;
  monthLabel: string;
  siteId?: string | null;
  siteName: string;
  ruleProfileId?: string | null;
  ruleProfileCode: string;
  ruleProfileName: string;
  employeeObjectId?: string | null;
  employeeId: string;
  legacyEmpCode?: string;
  employeeName: string;
  designation: string;
  department: string;
  uanNumber?: string;
  esiNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  wageRate: number;
  rateType: EmployeeRateType;
  daysInMonth: number;
  presentDays: number;
  extraDays: number;
  otHours: number;
  nhDays: number;
  relieverDays: number;
  relieverNote?: string;
  presentWages: number;
  extraDutyAmount: number;
  allowanceAmount: number;
  canteenAllowance: number;
  bonusInGross: number;
  bonusOutsideGross: number;
  arrearAddition: number;
  grossSalary: number;
  epfWage: number;
  epfEmployee: number;
  epfEmployer: number;
  esiWage: number;
  esiEmployee: number;
  esiEmployer: number;
  ptComputed: number;
  ptDeducted: number;
  deductPtFromEmployee: boolean;
  gemCharge: number;
  adminCharge: number;
  advanceDeduction: number;
  uniformDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netPay: number;
  actualPaidAmount: number;
  factoryComponents?: FactoryComponentsBreakdown;
  uniformBalanceAfter: number;
  advanceBalanceAfter: number;
  payoutStatus: LineItemPayoutStatus;
  paymentMode: PaymentMode;
  voucherId?: string | null;
  voucherNo?: number | null;
  holdReason?: string;
  remarks?: string;
}

export interface BankAdviceRow {
  slNo: number;
  employeeId: string;
  employeeName: string;
  siteName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  paymentMode: PaymentMode;
  netPay: number;
  voucherNo?: number | null;
  payoutStatus: LineItemPayoutStatus;
}

export interface BankAdviceResponse {
  runCode: string;
  monthKey: string;
  monthLabel: string;
  siteName: string;
  count: number;
  totalPayable: number;
  rows: BankAdviceRow[];
}

export interface ComplianceExportRow {
  employeeId: string;
  employeeName: string;
  siteName: string;
  uanNumber: string;
  esiNumber: string;
  daysPaid: number;
  grossWages: number;
  epfWages: number;
  epsWages: number;
  edliWages: number;
  epfEmployeeShare: number;
  epsEmployerShare: number;
  epfEpsDiffShare: number;
  epfEmployerShare: number;
  esiWages: number;
  esiEmployeeShare: number;
  esiEmployerShare: number;
  ncpDays: number;
}

export interface ComplianceExportResponse {
  monthKey: string;
  siteName: string;
  source: "SALARY_LINE_ITEMS" | "STATUTORY_FALLBACK";
  totals: {
    epfMembers: number;
    epfEmployeeTotal: number;
    epfEmployerTotal: number;
    esicMembers: number;
    esiEmployeeTotal: number;
    esiEmployerTotal: number;
  };
  ecrText: string;
  rows: ComplianceExportRow[];
}

export interface PayslipRecord {
  id: string;
  payslipId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  location: string;
  salaryMonth: string;
  monthKey?: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  otherEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  otherDeductions: number;
  generatedDate: string;
  status: PayslipStatus;
  ruleProfileCode?: string;
  ruleProfileName?: string;
  wageRate?: number;
  presentDays?: number;
  extraDays?: number;
  otHours?: number;
  nhDays?: number;
  bonusInGross?: number;
  bonusOutsideGross?: number;
  canteenAllowance?: number;
  ptDeduction?: number;
  advanceDeduction?: number;
  uniformDeduction?: number;
  gemCharge?: number;
  adminCharge?: number;
  arrearAddition?: number;
  deductPtFromEmployee?: boolean;
  factoryComponents?: FactoryComponentsBreakdown;
  uniformBalanceAfter?: number;
  advanceBalanceAfter?: number;
  paymentMode?: PaymentMode;
  voucherNo?: number | null;
  payoutStatus?: string;
  uanNumber?: string;
  esiNumber?: string;
}

export type PaymentStatus = "Paid" | "Pending" | "Overdue";

export type BillingArchetype =
  | "ALL_INCLUSIVE_RATE"
  | "DAY_RATE_STATUTORY_MARKUP"
  | "MONTHLY_POOL_STATUTORY"
  | "GOVT_WORKS_DEDUCT_CESS"
  | "SERVICE_CHARGE_ONLY";

export type PoolStatutoryMode =
  | "UNCAPPED"
  | "CAPPED_25000_PER_WORKER"
  | "HEADCOUNT_15000"
  | "CAPPED_21000_PER_WORKER"
  | "EXEMPT";

export type BillingRoundMode = "ROUND" | "ROUNDUP" | "EXACT_PAISE";

export interface BillingRuleProfileRecord {
  id: string;
  profileCode: string;
  profileName: string;
  siteId?: string | null;
  siteName?: string;
  subUnit?: string;
  siteMatchKeywords?: string[];
  isTemplate: boolean;
  isActive: boolean;
  archetype: BillingArchetype;
  gstMode: SiteGstMode;
  sacCode: string;
  epfEmployerPct: number;
  edliPct: number;
  pfAdminPct: number;
  pfFixedPerDay: number;
  poolEpfMode: PoolStatutoryMode;
  esiEmployerPct: number;
  poolEsiMode: PoolStatutoryMode;
  bonusPct: number;
  serviceChargePct: number;
  stripGstFromTenderRate: boolean;
  tenderTaxPct: number;
  govtDeductionPct: number;
  cessPct: number;
  subtotalRoundMode: BillingRoundMode;
  gstRoundMode: BillingRoundMode;
  totalRoundMode: BillingRoundMode;
  includeFactoryActNote: boolean;
  interestRatePct: number;
  notes?: string;
}

export type InvoicePaymentStage =
  | "DRAFT"
  | "PRE_PAYMENT_SUBMITTED"
  | "PARTIAL_PAID"
  | "DEDUCTION_DISPUTED"
  | "SETTLED"
  | "OVERDUE";

export type InvoiceDeductionCategory =
  | "TDS"
  | "GST_TDS"
  | "LD_PENALTY"
  | "SHORT_DUTY"
  | "OTHER";

export interface InvoiceLineItem {
  label: string;
  designation: string;
  normalDays: number;
  extraDays: number;
  otHours: number;
  totalDays: number;
  baseRate: number;
  effectiveBaseRate: number;
  inclusiveRate: number;
  epfAmount: number;
  esiAmount: number;
  bonusAmount: number;
  lineAmount: number;
}

export interface InvoiceDeductionEntry {
  category: InvoiceDeductionCategory;
  amount: number;
  note: string;
  recordedAt: string;
}

export interface InvoicePaymentReceipt {
  receiptDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNo: string;
  bankName: string;
  note: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  siteId?: string | null;
  billingRuleProfileId?: string | null;
  ruleProfileCode?: string;
  clientName: string;
  clientAddress: string;
  clientGstin: string;
  stateCode?: string;
  vendorCode?: string;
  contractRef?: string;
  billingMonth: string;
  periodMonths?: string[];
  periodLabel?: string;
  site: string;
  subUnit?: string;
  serviceType: string;
  serviceDescription: string;
  sacCode?: string;
  archetype?: BillingArchetype;
  gstMode?: SiteGstMode;
  attendanceSource?: "VERIFIED_MUSTER" | "ATTENDANCE_LOGS" | "MANUAL";
  quantity: number;
  rate: number;
  taxRate: number;
  lineItems?: InvoiceLineItem[];
  wagesSubtotal?: number;
  epfTotal?: number;
  esiTotal?: number;
  bonusTotal?: number;
  statutoryTotal?: number;
  govtDeductionPct?: number;
  govtDeductionAmount?: number;
  serviceChargePct?: number;
  serviceChargeAmount?: number;
  taxableSubtotal?: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  cessPct?: number;
  cessAmount?: number;
  roundOff?: number;
  totalInvoiceAmount?: number;
  amountInWords?: string;
  includeFactoryActNote?: boolean;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  status: PaymentStatus;
  paymentStage?: InvoicePaymentStage;
  deductionsSlip?: InvoiceDeductionEntry[];
  totalDeductions?: number;
  paymentReceipts?: InvoicePaymentReceipt[];
  totalReceived?: number;
  balanceReceivable?: number;
  interestRatePct?: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  module: string;
  timestamp: string;
}

export interface AcsSettings {
  adminName: string;
  adminRole: string;
  adminEmail: string;
  adminPhone: string;
  companyName: string;
  companyWebsite: string;
  companyGstin: string;
  companyAddress: string;
  supportEmail: string;
  supportPhone: string;
  logoInitials: string;
  emailAlerts: boolean;
  compactTables: boolean;
  defaultMonth: string;
  uniformRegistrationCharge?: number;
}

export interface AcsStoreData {
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  candidates: Candidate[];
  uniforms: UniformItem[];
  uniformIssues: UniformIssueRecord[];
  uniformRecoveryPlans?: UniformRecoveryPlan[];
  stockLogs: UniformStockLog[];
  attendance: AttendanceRecord[];
  statutory: StatutoryRecord[];
  salaries: SalaryRecord[];
  salaryAdvances?: SalaryAdvanceRecord[];
  vouchers?: VoucherRecord[];
  salaryRuleProfiles?: SalaryRuleProfileRecord[];
  payrollRuns?: PayrollRunRecord[];
  billingRuleProfiles?: BillingRuleProfileRecord[];
  payslips: PayslipRecord[];
  invoices: InvoiceRecord[];
  activities: ActivityItem[];
  settings: AcsSettings;
}

export interface OnboardingSiteImportRow {
  siteCode?: string;
  siteName: string;
  shortName?: string;
  clientName?: string;
  billToAddress?: string;
  shipToAddress?: string;
  clientGstin?: string;
  stateCode?: string;
  vendorCode?: string;
  contractRef?: string;
  subUnits?: string[] | string;
  sacCode?: string;
  gstMode?: string;
  serviceChargePct?: number | string;
  notes?: string;
}

export interface OnboardingEmployeeImportRow {
  empCode?: string;
  legacyEmpCode?: string;
  fullName: string;
  siteName: string;
  subUnit?: string;
  designation?: string;
  serviceCategory?: string;
  mobile?: string;
  email?: string;
  rateType?: string;
  baseRate?: number | string;
  uanNumber?: string;
  esiNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  preferredPaymentMode?: string;
  dateOfJoining?: string;
  fatherOrHusbandName?: string;
  nomineeName?: string;
  status?: string;
  remarks?: string;
}

export interface OnboardingAdvanceImportRow {
  employeeId?: string;
  legacyEmpCode?: string;
  employeeName?: string;
  siteName?: string;
  onAccountOf?: string;
  date?: string;
  monthKey?: string;
  amount: number | string;
  recoveredAmount?: number | string;
  remainingBalance?: number | string;
  recoveryMode?: string;
  installmentCount?: number | string;
  monthlyAmount?: number | string;
  targetPayrollMonth?: string;
  remarks?: string;
}

export interface OnboardingUniformPlanImportRow {
  employeeId?: string;
  legacyEmpCode?: string;
  employeeName?: string;
  siteName?: string;
  totalCharge: number | string;
  recoveredAmount?: number | string;
  remainingBalance?: number | string;
  recoveryMode?: string;
  installmentCount?: number | string;
  monthlyAmount?: number | string;
  startMonth?: string;
  remarks?: string;
}

export interface OnboardingImportPayload {
  dryRun?: boolean;
  defaultMonthKey?: string;
  sites?: OnboardingSiteImportRow[];
  employees?: OnboardingEmployeeImportRow[];
  openingAdvances?: OnboardingAdvanceImportRow[];
  openingUniformPlans?: OnboardingUniformPlanImportRow[];
}

export interface OnboardingValidationError {
  section: "sites" | "employees" | "openingAdvances" | "openingUniformPlans";
  rowIndex: number;
  identifier: string;
  reason: string;
}

export interface OnboardingImportSummary {
  dryRun: boolean;
  defaultMonthKey: string;
  received: {
    sites: number;
    employees: number;
    openingAdvances: number;
    openingUniformPlans: number;
  };
  valid: {
    sites: number;
    employees: number;
    openingAdvances: number;
    openingUniformPlans: number;
  };
  applied: {
    sitesCreated: number;
    sitesUpdated: number;
    employeesCreated: number;
    employeesUpdated: number;
    advancesCreated: number;
    advancesSkippedDuplicate: number;
    uniformPlansCreated: number;
    uniformPlansSkippedDuplicate: number;
  };
  errors: OnboardingValidationError[];
}