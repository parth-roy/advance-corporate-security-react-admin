import type { AcsStoreData } from "./acs-types";

export const ACS_LOCATIONS = [
  "TechPark Phase II, Bengaluru",
  "CyberHub Tower B, Gurugram",
  "BKC Financial Plaza, Mumbai",
  "HITEC Corporate Park, Hyderabad",
  "DLF IT SEZ, Noida",
] as const;

export const UNIFORM_CATEGORIES = [
  "Security Uniform",
  "Security Shoes",
  "Shirts",
  "Trousers",
  "Belts",
  "Caps",
  "Winter Uniform",
  "Accessories",
] as const;

export const PAYROLL_MONTHS = ["November 2026", "October 2026", "September 2026"] as const;

export const INITIAL_ACS_DATA: AcsStoreData = {
  candidates: [
    { id: "c1", fullName: "Vikram Singh Rathore", mobile: "+91 98451 22310", email: "vikram.rathore@mail.in", position: "Senior Security Officer", location: "TechPark Phase II, Bengaluru", experience: "5 Years", applicationDate: "2026-11-23", status: "Shortlisted", resumeName: "Vikram_Rathore_CV.pdf", remarks: "Ex-serviceman with corporate campus access control experience." },
    { id: "c2", fullName: "Arjun Kumar Verma", mobile: "+91 98114 77621", email: "arjun.verma@mail.in", position: "Security Guard", location: "CyberHub Tower B, Gurugram", experience: "3 Years", applicationDate: "2026-11-24", status: "New", resumeName: "Arjun_Verma_Resume.pdf", remarks: "Available for rotational night shifts immediately." },
    { id: "c3", fullName: "Meena Deshmukh", mobile: "+91 97690 45128", email: "meena.deshmukh@mail.in", position: "Lady Security Officer", location: "BKC Financial Plaza, Mumbai", experience: "4 Years", applicationDate: "2026-11-21", status: "Selected", resumeName: "Meena_Deshmukh_Profile.pdf", remarks: "Cleared background check and client briefing." },
    { id: "c4", fullName: "Sandeep Reddy", mobile: "+91 90008 31245", email: "sandeep.reddy@mail.in", position: "CCTV Control Operator", location: "HITEC Corporate Park, Hyderabad", experience: "2 Years", applicationDate: "2026-11-22", status: "Shortlisted", resumeName: "Sandeep_Reddy_CV.pdf", remarks: "Trained in VMS monitoring and incident reporting." },
    { id: "c5", fullName: "Harish Chandra Tiwari", mobile: "+91 98732 60911", email: "harish.tiwari@mail.in", position: "Site Supervisor", location: "DLF IT SEZ, Noida", experience: "7 Years", applicationDate: "2026-11-19", status: "Selected", resumeName: "Harish_Tiwari_Resume.pdf", remarks: "Managed 40+ guards across multi-tower commercial sites." },
    { id: "c6", fullName: "Deepak Yadav", mobile: "+91 99105 88320", email: "deepak.yadav@mail.in", position: "Security Guard", location: "CyberHub Tower B, Gurugram", experience: "1 Year", applicationDate: "2026-11-18", status: "Rejected", resumeName: "Deepak_Yadav.pdf", remarks: "Did not meet site height and shift availability criteria." },
    { id: "c7", fullName: "Kavita Nair", mobile: "+91 98457 90214", email: "kavita.nair@mail.in", position: "Reception Security Executive", location: "TechPark Phase II, Bengaluru", experience: "3 Years", applicationDate: "2026-11-25", status: "New", resumeName: "Kavita_Nair_CV.pdf", remarks: "Fluent in English and Hindi; strong front-desk protocol." },
  ],
  uniforms: [
    { id: "u1", name: "ACS Navy Tactical Set", category: "Security Uniform", size: "L", availableQty: 48, issuedQty: 112, lastUpdated: "2026-11-24" },
    { id: "u2", name: "Steel-Toe Patrol Boots", category: "Security Shoes", size: "9", availableQty: 12, issuedQty: 86, lastUpdated: "2026-11-23" },
    { id: "u3", name: "Sky Blue Epaulette Shirt", category: "Shirts", size: "M", availableQty: 64, issuedQty: 145, lastUpdated: "2026-11-22" },
    { id: "u4", name: "Formal Navy Security Trouser", category: "Trousers", size: "34", availableQty: 52, issuedQty: 138, lastUpdated: "2026-11-22" },
    { id: "u5", name: "Heavy Brass Buckle Belt", category: "Belts", size: "Free", availableQty: 9, issuedQty: 160, lastUpdated: "2026-11-20" },
    { id: "u6", name: "Embroidered Peak Cap", category: "Caps", size: "Free", availableQty: 36, issuedQty: 120, lastUpdated: "2026-11-19" },
    { id: "u7", name: "Insulated Night Patrol Jacket", category: "Winter Uniform", size: "XL", availableQty: 7, issuedQty: 54, lastUpdated: "2026-11-24" },
    { id: "u8", name: "Whistle Lanyard & Badge Kit", category: "Accessories", size: "Std", availableQty: 85, issuedQty: 175, lastUpdated: "2026-11-21" },
  ],
  uniformIssues: [
    { id: "ui1", employeeId: "ACS-1001", employeeName: "Ramesh Kulkarni", site: "TechPark Phase II, Bengaluru", itemId: "u1", itemName: "ACS Navy Tactical Set", size: "L", quantity: 2, issueDate: "2026-11-15", status: "Issued" },
    { id: "ui2", employeeId: "ACS-1002", employeeName: "Suresh Chauhan", site: "CyberHub Tower B, Gurugram", itemId: "u2", itemName: "Steel-Toe Patrol Boots", size: "9", quantity: 1, issueDate: "2026-11-12", status: "Issued" },
    { id: "ui3", employeeId: "ACS-1004", employeeName: "Prakash Nair", site: "HITEC Corporate Park, Hyderabad", itemId: "u7", itemName: "Insulated Night Patrol Jacket", size: "XL", quantity: 1, issueDate: "2026-11-18", status: "Issued" },
    { id: "ui4", employeeId: "ACS-1003", employeeName: "Anita Pawar", site: "BKC Financial Plaza, Mumbai", itemId: "u3", itemName: "Sky Blue Epaulette Shirt", size: "M", quantity: 2, issueDate: "2026-10-05", returnDate: "2026-11-10", status: "Returned" },
  ],
  stockLogs: [
    { id: "sl1", itemName: "ACS Navy Tactical Set", action: "Restocked", quantity: 30, date: "2026-11-24", note: "Quarterly vendor replenishment PO-882" },
    { id: "sl2", itemName: "Insulated Night Patrol Jacket", action: "Issued", quantity: 1, date: "2026-11-18", note: "Issued to Prakash Nair (ACS-1004)" },
    { id: "sl3", itemName: "Sky Blue Epaulette Shirt", action: "Returned", quantity: 2, date: "2026-11-10", note: "Returned by Anita Pawar (ACS-1003)" },
    { id: "sl4", itemName: "Steel-Toe Patrol Boots", action: "Issued", quantity: 1, date: "2026-11-12", note: "Issued to Suresh Chauhan (ACS-1002)" },
  ],
  attendance: [
    { id: "a1", employeeId: "ACS-1001", employeeName: "Ramesh Kulkarni", designation: "Site Supervisor", location: "TechPark Phase II, Bengaluru", date: "2026-11-25", checkIn: "07:55", checkOut: "16:05", workingHours: "8h 10m", status: "Present" },
    { id: "a2", employeeId: "ACS-1002", employeeName: "Suresh Chauhan", designation: "Security Guard", location: "CyberHub Tower B, Gurugram", date: "2026-11-25", checkIn: "08:02", checkOut: "16:00", workingHours: "7h 58m", status: "Present" },
    { id: "a3", employeeId: "ACS-1003", employeeName: "Anita Pawar", designation: "Lady Security Officer", location: "BKC Financial Plaza, Mumbai", date: "2026-11-25", checkIn: "08:00", checkOut: "12:15", workingHours: "4h 15m", status: "Half Day" },
    { id: "a4", employeeId: "ACS-1004", employeeName: "Prakash Nair", designation: "CCTV Operator", location: "HITEC Corporate Park, Hyderabad", date: "2026-11-25", checkIn: "—", checkOut: "—", workingHours: "0h 00m", status: "Leave" },
    { id: "a5", employeeId: "ACS-1005", employeeName: "Manoj Tiwari", designation: "Security Guard", location: "DLF IT SEZ, Noida", date: "2026-11-25", checkIn: "—", checkOut: "—", workingHours: "0h 00m", status: "Absent" },
    { id: "a6", employeeId: "ACS-1006", employeeName: "Kiran Gowda", designation: "Senior Guard", location: "TechPark Phase II, Bengaluru", date: "2026-11-25", checkIn: "07:50", checkOut: "16:10", workingHours: "8h 20m", status: "Present" },
    { id: "a7", employeeId: "ACS-1007", employeeName: "Sunil Sharma", designation: "Patrol Officer", location: "CyberHub Tower B, Gurugram", date: "2026-11-25", checkIn: "—", checkOut: "—", workingHours: "0h 00m", status: "Weekly Off" },
    { id: "a8", employeeId: "ACS-1008", employeeName: "Farhan Shaikh", designation: "Security Guard", location: "BKC Financial Plaza, Mumbai", date: "2026-11-25", checkIn: "08:04", checkOut: "16:02", workingHours: "7h 58m", status: "Present" },
  ],
  statutory: [
    {
      id: "st1", employeeId: "ACS-1001", employeeName: "Ramesh Kulkarni", designation: "Site Supervisor", location: "TechPark Phase II, Bengaluru", month: "November 2026",
      uanNumber: "100948271645", esiNumber: "31-00-118294-000", basicSalary: 22000, pfStatus: "Active", esiStatus: "Exempt",
      pfEmployeeShare: 1800, pfEmployerShare: 1800, esiEmployeeShare: 0, esiEmployerShare: 0,
      history: [
        { month: "November 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 0, esiEmployer: 0, status: "Pending" },
        { month: "October 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 0, esiEmployer: 0, status: "Filed" },
        { month: "September 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 0, esiEmployer: 0, status: "Filed" },
      ],
    },
    {
      id: "st2", employeeId: "ACS-1002", employeeName: "Suresh Chauhan", designation: "Security Guard", location: "CyberHub Tower B, Gurugram", month: "November 2026",
      uanNumber: "100948271892", esiNumber: "31-00-118305-000", basicSalary: 15500, pfStatus: "Active", esiStatus: "Active",
      pfEmployeeShare: 1860, pfEmployerShare: 1860, esiEmployeeShare: 140, esiEmployerShare: 605,
      history: [
        { month: "November 2026", pfEmployee: 1860, pfEmployer: 1860, esiEmployee: 140, esiEmployer: 605, status: "Pending" },
        { month: "October 2026", pfEmployee: 1860, pfEmployer: 1860, esiEmployee: 140, esiEmployer: 605, status: "Filed" },
      ],
    },
    {
      id: "st3", employeeId: "ACS-1003", employeeName: "Anita Pawar", designation: "Lady Security Officer", location: "BKC Financial Plaza, Mumbai", month: "November 2026",
      uanNumber: "100948272104", esiNumber: "31-00-118412-000", basicSalary: 17500, pfStatus: "Active", esiStatus: "Active",
      pfEmployeeShare: 1800, pfEmployerShare: 1800, esiEmployeeShare: 155, esiEmployerShare: 670,
      history: [
        { month: "November 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 155, esiEmployer: 670, status: "Pending" },
        { month: "October 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 155, esiEmployer: 670, status: "Filed" },
      ],
    },
    {
      id: "st4", employeeId: "ACS-1004", employeeName: "Prakash Nair", designation: "CCTV Operator", location: "HITEC Corporate Park, Hyderabad", month: "November 2026",
      uanNumber: "100948272450", esiNumber: "31-00-118508-000", basicSalary: 18500, pfStatus: "Active", esiStatus: "Active",
      pfEmployeeShare: 1800, pfEmployerShare: 1800, esiEmployeeShare: 162, esiEmployerShare: 702,
      history: [
        { month: "November 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 162, esiEmployer: 702, status: "Pending" },
        { month: "October 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 162, esiEmployer: 702, status: "Filed" },
      ],
    },
    {
      id: "st5", employeeId: "ACS-1005", employeeName: "Manoj Tiwari", designation: "Security Guard", location: "DLF IT SEZ, Noida", month: "November 2026",
      uanNumber: "Pending KYC", esiNumber: "31-00-118619-000", basicSalary: 14800, pfStatus: "Pending", esiStatus: "Active",
      pfEmployeeShare: 1776, pfEmployerShare: 1776, esiEmployeeShare: 132, esiEmployerShare: 572,
      history: [
        { month: "November 2026", pfEmployee: 1776, pfEmployer: 1776, esiEmployee: 132, esiEmployer: 572, status: "Pending" },
      ],
    },
    {
      id: "st6", employeeId: "ACS-1006", employeeName: "Kiran Gowda", designation: "Senior Guard", location: "TechPark Phase II, Bengaluru", month: "October 2026",
      uanNumber: "100948272911", esiNumber: "31-00-118744-000", basicSalary: 16800, pfStatus: "Active", esiStatus: "Active",
      pfEmployeeShare: 1800, pfEmployerShare: 1800, esiEmployeeShare: 148, esiEmployerShare: 642,
      history: [
        { month: "October 2026", pfEmployee: 1800, pfEmployer: 1800, esiEmployee: 148, esiEmployer: 642, status: "Filed" },
      ],
    },
  ],
  salaries: [
    { id: "sal1", employeeId: "ACS-1001", employeeName: "Ramesh Kulkarni", designation: "Site Supervisor", department: "Field Operations", category: "Supervisory Staff", location: "TechPark Phase II, Bengaluru", month: "November 2026", year: "2026", basicSalary: 22000, allowances: 5200, overtime: 1800, otherEarnings: 1000, pfDeduction: 1800, esiDeduction: 0, otherDeductions: 400, status: "Processed" },
    { id: "sal2", employeeId: "ACS-1002", employeeName: "Suresh Chauhan", designation: "Security Guard", department: "Site Security", category: "Security Personnel", location: "CyberHub Tower B, Gurugram", month: "November 2026", year: "2026", basicSalary: 15500, allowances: 3100, overtime: 2400, otherEarnings: 500, pfDeduction: 1860, esiDeduction: 140, otherDeductions: 200, status: "Pending" },
    { id: "sal3", employeeId: "ACS-1003", employeeName: "Anita Pawar", designation: "Lady Security Officer", department: "Corporate Access", category: "Security Personnel", location: "BKC Financial Plaza, Mumbai", month: "November 2026", year: "2026", basicSalary: 17500, allowances: 3600, overtime: 1200, otherEarnings: 700, pfDeduction: 1800, esiDeduction: 155, otherDeductions: 250, status: "Processed" },
    { id: "sal4", employeeId: "ACS-1004", employeeName: "Prakash Nair", designation: "CCTV Operator", department: "Command Center", category: "Operations & Admin", location: "HITEC Corporate Park, Hyderabad", month: "November 2026", year: "2026", basicSalary: 18500, allowances: 4000, overtime: 900, otherEarnings: 600, pfDeduction: 1800, esiDeduction: 162, otherDeductions: 300, status: "Pending" },
    { id: "sal5", employeeId: "ACS-1005", employeeName: "Manoj Tiwari", designation: "Security Guard", department: "Site Security", category: "Security Personnel", location: "DLF IT SEZ, Noida", month: "November 2026", year: "2026", basicSalary: 14800, allowances: 2800, overtime: 0, otherEarnings: 400, pfDeduction: 1776, esiDeduction: 132, otherDeductions: 200, status: "Pending" },
    { id: "sal6", employeeId: "ACS-1006", employeeName: "Kiran Gowda", designation: "Senior Guard", department: "Site Security", category: "Security Personnel", location: "TechPark Phase II, Bengaluru", month: "November 2026", year: "2026", basicSalary: 16800, allowances: 3400, overtime: 1500, otherEarnings: 500, pfDeduction: 1800, esiDeduction: 148, otherDeductions: 200, status: "Processed" },
  ],
  payslips: [
    { id: "ps1", payslipId: "PS-2026-11-1001", employeeId: "ACS-1001", employeeName: "Ramesh Kulkarni", designation: "Site Supervisor", department: "Field Operations", location: "TechPark Phase II, Bengaluru", salaryMonth: "November 2026", basicSalary: 22000, allowances: 5200, overtime: 1800, otherEarnings: 1000, pfDeduction: 1800, esiDeduction: 0, otherDeductions: 400, generatedDate: "2026-11-24", status: "Generated" },
    { id: "ps2", payslipId: "PS-2026-11-1003", employeeId: "ACS-1003", employeeName: "Anita Pawar", designation: "Lady Security Officer", department: "Corporate Access", location: "BKC Financial Plaza, Mumbai", salaryMonth: "November 2026", basicSalary: 17500, allowances: 3600, overtime: 1200, otherEarnings: 700, pfDeduction: 1800, esiDeduction: 155, otherDeductions: 250, generatedDate: "2026-11-24", status: "Generated" },
    { id: "ps3", payslipId: "PS-2026-11-1006", employeeId: "ACS-1006", employeeName: "Kiran Gowda", designation: "Senior Guard", department: "Site Security", location: "TechPark Phase II, Bengaluru", salaryMonth: "November 2026", basicSalary: 16800, allowances: 3400, overtime: 1500, otherEarnings: 500, pfDeduction: 1800, esiDeduction: 148, otherDeductions: 200, generatedDate: "2026-11-24", status: "Generated" },
    { id: "ps4", payslipId: "PS-2026-11-1002", employeeId: "ACS-1002", employeeName: "Suresh Chauhan", designation: "Security Guard", department: "Site Security", location: "CyberHub Tower B, Gurugram", salaryMonth: "November 2026", basicSalary: 15500, allowances: 3100, overtime: 2400, otherEarnings: 500, pfDeduction: 1860, esiDeduction: 140, otherDeductions: 200, generatedDate: "—", status: "Pending" },
    { id: "ps5", payslipId: "PS-2026-10-1001", employeeId: "ACS-1001", employeeName: "Ramesh Kulkarni", designation: "Site Supervisor", department: "Field Operations", location: "TechPark Phase II, Bengaluru", salaryMonth: "October 2026", basicSalary: 22000, allowances: 5200, overtime: 1200, otherEarnings: 800, pfDeduction: 1800, esiDeduction: 0, otherDeductions: 400, generatedDate: "2026-10-30", status: "Generated" },
  ],
  invoices: [
    { id: "inv1", invoiceNumber: "ACS-INV-2026-401", clientName: "Vertex Cloud Systems Pvt. Ltd.", clientAddress: "Outer Ring Road, Bellandur, Bengaluru 560103", clientGstin: "29AABCV4821M1Z5", billingMonth: "November 2026", site: "TechPark Phase II, Bengaluru", serviceType: "Manned Guarding & Supervision", serviceDescription: "24x7 Security Guarding (28 Personnel + 2 Supervisors)", quantity: 30, rate: 24500, taxRate: 18, invoiceDate: "2026-11-01", dueDate: "2026-11-20", paymentTerms: "Net 20 Days", status: "Paid" },
    { id: "inv2", invoiceNumber: "ACS-INV-2026-402", clientName: "Meridian FinServe India Ltd.", clientAddress: "G Block, Bandra Kurla Complex, Mumbai 400051", clientGstin: "27AAACM9104K1Z2", billingMonth: "November 2026", site: "BKC Financial Plaza, Mumbai", serviceType: "Corporate Access Control", serviceDescription: "Lobby Access Officers & Lady Security Screening", quantity: 18, rate: 26800, taxRate: 18, invoiceDate: "2026-11-03", dueDate: "2026-11-28", paymentTerms: "Net 25 Days", status: "Pending" },
    { id: "inv3", invoiceNumber: "ACS-INV-2026-403", clientName: "Apex Global Logistics Park", clientAddress: "DLF Cyber City, Sector 24, Gurugram 122002", clientGstin: "06AAACA7742D1Z8", billingMonth: "October 2026", site: "CyberHub Tower B, Gurugram", serviceType: "Perimeter & Gate Security", serviceDescription: "24x7 Gate Control & Night Patrol Unit", quantity: 22, rate: 23000, taxRate: 18, invoiceDate: "2026-10-05", dueDate: "2026-10-30", paymentTerms: "Net 25 Days", status: "Overdue" },
    { id: "inv4", invoiceNumber: "ACS-INV-2026-404", clientName: "Helios BioLabs Campus", clientAddress: "HITEC City, Madhapur, Hyderabad 500081", clientGstin: "36AABCH5518R1Z9", billingMonth: "November 2026", site: "HITEC Corporate Park, Hyderabad", serviceType: "CCTV & Command Monitoring", serviceDescription: "Command Center Operators & Rapid Response Guards", quantity: 14, rate: 25500, taxRate: 18, invoiceDate: "2026-11-04", dueDate: "2026-11-29", paymentTerms: "Net 25 Days", status: "Pending" },
  ],
  activities: [
    { id: "act1", title: "Salary processed for 3 personnel", detail: "November 2026 payroll batch approved for TechPark Phase II & BKC Plaza.", module: "Payroll", timestamp: "18 mins ago" },
    { id: "act2", title: "Candidate shortlisted", detail: "Vikram Singh Rathore shortlisted for Senior Security Officer.", module: "Recruitment", timestamp: "1 hour ago" },
    { id: "act3", title: "Uniform stock replenished", detail: "Added 30 units of ACS Navy Tactical Set (Size L).", module: "Uniforms", timestamp: "3 hours ago" },
    { id: "act4", title: "Invoice marked as paid", detail: "ACS-INV-2026-401 settled by Vertex Cloud Systems Pvt. Ltd.", module: "Billing", timestamp: "Yesterday" },
    { id: "act5", title: "Attendance synced across 5 sites", detail: "Morning shift attendance recorded for 25 Nov 2026.", module: "Attendance", timestamp: "Yesterday" },
  ],
  settings: {
    adminName: "Rajesh Sharma",
    adminRole: "Operations Director",
    adminEmail: "rajesh.sharma@advancecorporatesecurity.com",
    adminPhone: "+91 98201 44500",
    companyName: "Advance Corporate Security",
    companyWebsite: "https://advancecorporatesecurity.com/",
    companyGstin: "27AAACA8492Q1Z4",
    companyAddress: "Suite 402, Corporate Annex, Andheri East, Mumbai 400059, India",
    supportEmail: "operations@advancecorporatesecurity.com",
    supportPhone: "+91 22 4890 2100",
    logoInitials: "ACS",
    emailAlerts: true,
    compactTables: false,
    defaultMonth: "November 2026",
  },
};