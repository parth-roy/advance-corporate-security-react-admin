export type CandidateStatus = "New" | "Shortlisted" | "Selected" | "Rejected";

export interface FamilyMember {
  name: string;
  relation: string;
  dateOfBirth: string;
}

export interface Candidate {
  id: string;
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
  location: string; // Site
  experience: string;
  serviceCategory?: "Civil" | "Defense";
  reference?: string;
  applicationDate: string;
  status: CandidateStatus;
  dateOfJoining?: string;
  joiningAs?: string;
  salary?: string;
  nomineeName?: string;
  esiHolder?: "Yes" | "No";
  esiNumber?: string;
  uanNumber?: string;
  familyMembers?: FamilyMember[];
  declarationAccepted?: boolean;
  declarationDate?: string;
  declarationPlace?: string;
  applicantSignature?: string;
  resumeName: string;
  remarks: string;
}

export type UniformCategory =
  | "Security Uniform"
  | "Security Shoes"
  | "Shirts"
  | "Trousers"
  | "Belts"
  | "Caps"
  | "Winter Uniform"
  | "Accessories";

export interface UniformItem {
  id: string;
  name: string;
  category: UniformCategory;
  size: string;
  availableQty: number;
  issuedQty: number;
  lastUpdated: string;
}

export interface UniformIssueRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  itemId: string;
  itemName: string;
  size: string;
  quantity: number;
  issueDate: string;
  returnDate?: string;
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

export type AttendanceStatus = "Present" | "Absent" | "Half Day" | "Leave" | "Weekly Off";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  location: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: AttendanceStatus;
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
}

export type PayslipStatus = "Generated" | "Pending";

export interface PayslipRecord {
  id: string;
  payslipId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  location: string;
  salaryMonth: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  otherEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  otherDeductions: number;
  generatedDate: string;
  status: PayslipStatus;
}

export type PaymentStatus = "Paid" | "Pending" | "Overdue";

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientGstin: string;
  billingMonth: string;
  site: string;
  serviceType: string;
  serviceDescription: string;
  quantity: number;
  rate: number;
  taxRate: number;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  status: PaymentStatus;
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
}

export interface AcsStoreData {
  candidates: Candidate[];
  uniforms: UniformItem[];
  uniformIssues: UniformIssueRecord[];
  stockLogs: UniformStockLog[];
  attendance: AttendanceRecord[];
  statutory: StatutoryRecord[];
  salaries: SalaryRecord[];
  payslips: PayslipRecord[];
  invoices: InvoiceRecord[];
  activities: ActivityItem[];
  settings: AcsSettings;
}