# ACS Production Implementation — Work Tracker

**Reference Spec**: [ACS_PRODUCTION_SPECIFICATION.md](./ACS_PRODUCTION_SPECIFICATION.md)
**Scale Target**: 400–1,000+ Employees | 20+ Client Sites | Zero Hardcoded Calculations

---

## Phase 0 — Architecture & Formula Sign-Off (Before Code Edits)
- [x] Inspect and extract formulas, tax modes, voucher schemas, uniform charges, and edge cases from all 14 requirement files + 3 site muster photos
- [x] Publish comprehensive specification (`ACS_PRODUCTION_SPECIFICATION.md`)
- [x] **Routing Strategy Applied**: Kept the 9 approved routes under `src/routes/` per `AGENTS.md`, hosting `Client Sites & Units` in `/settings?tab=sites` and `Employee Directory` + Deployment in `/recruitment?tab=employees`
- [x] **Policy Defaults Applied for Core Models**: Per-site GST/state/rounding structure, optional site charge hooks, and bulk vs individual stock separation baked into core design

---

## Phase 1 — Backend Core Foundation: Sites, Employees & Scalable Queries *(COMPLETED)*
> **Why start here**: Attendance, Payroll, Uniform Recovery, Advances, Vouchers, and Billing all depend on normalized `siteId` and `employeeId` references instead of mixed `AdminCandidates` records and `/overview` 200/2500 hydration caps.

- [x] **P1.1**: Create `Site` Mongoose model (`siteCode`, `siteName`, `clientName`, `billToAddress`, `shipToAddress`, `gstin`, `stateCode`, `vendorCode`, `contractRef`, `subUnits`, `gstMode`, `sacCode`, indexes)
- [x] **P1.2**: Create `Employee` Mongoose model separated from `AdminCandidates` (`empCode` `ACS/<DEPT>/<YY>/<SEQ>`, `legacyEmpCode`, `primarySiteId`, `subUnit`, `designation`, `baseRate`, `rateType`, `bankDetails`, `upiId`, `esiNumber`, `pfUan`, `originalIdCustody`, `status`, text/compound indexes)
- [x] **P1.3**: Add safe one-time migration script/endpoint (`migrateCoreSitesAndEmployees`, `POST /api/admin/migrate-core`) to backfill existing deployed records from `AdminCandidates`, attendance, salary, and statutory records into `Employee` + `Site` without losing document attachments or IDs
- [x] **P1.4**: Build paginated, indexed CRUD & search APIs for `/sites` and `/employees` (supporting `page`, `limit`, `siteId`, `status`, `mobile`, `designation`, `empCode` filters + `/generate-code`)
- [x] **P1.5**: Wire paginated site & employee directory endpoints in `acs-store.tsx` (`fetchSitesPaginated`, `fetchEmployeesPaginated`, `SiteMasterView`, `EmployeeDirectoryView`) + add collection totals `meta.counts` and `sites`/`employees` support in `/overview`
- [x] **P1.6**: Update Recruitment conversion flow (`POST /api/admin/candidates/:id/deploy`, `DeployCandidateDialog`, `Promote Candidate -> Deployed Employee`) with rate/site assignment and `originalIdCustody` tracking

---

## Phase 2 — Attendance, Muster Rolls, OT & Cross-Site Relievers *(COMPLETED)*
- [x] **P2.1**: Upgrade `AttendanceDaily` schema (`workSiteId`, `employeeId`, `date`, `monthKey`, `shiftFraction`, `dutyType` [`P`, `P/P`, `H`, `A`, `WO`, `NH`, `CUSTOM_FRACTION`], `otHours`, `otDayEquivalent`, `isReliever`, `adjustmentNote`)
- [x] **P2.2**: Add Client Muster Roll Sign-off & Scan Attachment (`SiteMusterApproval`: `monthKey`, `siteId`, `verifiedByName`, `verifiedDate`, signed PDF/image upload, `LOCKED_FOR_BILLING` state)
- [x] **P2.3**: Implement server-side monthly matrix aggregation (`1..31`, Normal Days, Extra Days, OT Hours, NH Days, Cross-Site Reliever breakdown by `workSiteId` vs `primarySiteId`)
- [x] **P2.4**: Upgrade Attendance UI (`src/routes/attendance.tsx`) for 1,000+ employee scale (site-level pagination, fractional hour entry for `ICAR`/`TRSL`/`SOHAM`, reliever duty assignment, PDF/Excel muster export)

---

## Phase 3 — Uniforms, Dress Charge Rate Card & Installment Recovery *(COMPLETED)*
- [x] **P3.1**: Update `DRESS CHARGE` master items & unit rates (`Registration ₹250`, `Badge ₹70`, `Lanyard+Whistle ₹90`, `Shoe ₹480`, `T-Shirt ₹285`, `Jacket ₹550`, `Safety Shoe ₹570`, `Safety Helmet ₹200`, `Safety Gloves ₹180`, `I-Card ₹50`, `Shirt ₹450`, `Pant ₹460`, `Belt ₹120`, `Cap ₹120`)
- [x] **P3.2**: Support both Individual Employee Issues and Bulk Site Issues (`PHED` batch mode) with `Serial No`, `Emp Code`, `Mobile`, `Issued By`, `Received By`, `Verified By`, `Original Voter ID/Docs` tag
- [x] **P3.3**: Support Uniform Returns (restock inventory + credit unpaid recovery balance)
- [x] **P3.4**: Build `UniformRecoveryPlan` (total charge, EMI count or fixed monthly installment, `NOV26`/future start month, carried-forward `dueBalance` synced automatically into Payroll)

---

## Phase 4 — Advances Ledger & Multi-Mode Payment Vouchers *(COMPLETED)*
- [x] **P4.1**: Create `SalaryAdvance` model & Register view (monthly `staffNo`, `siteId/onAccountOf`, `amount`, 4-role signatures, `recoveryMode`: `SAME_MONTH` / `NEXT_MONTH` / `EMI`, `remainingBalance`)
- [x] **P4.2**: Create `Voucher` model with atomic sequential `voucherNo` (`34, 35, 39, 40, 41...`), `debitHead`, `purposeType`, auto-formatted `particulars`, digits + `amountInWords`
- [x] **P4.3**: Support all 4 payment modes on Vouchers & Salary Payouts: `CASH`, `CHEQUE` (Cheque No, Date, A/c, IFSC, Bank), `BANK_TRANSFER` (UTR/NEFT/RTGS), `UPI` (Txn ID/VPA)
- [x] **P4.4**: Connect Vouchers to Advance issuance & `HOLD` / `CHQ_HOLD` salary release (`Pratik Chakraborty` pattern), plus printable A5/A4 Voucher PDF view

---

## Phase 5 — Configurable Site-Wise Payroll Engine, Compliance & Payslips *(COMPLETED)*
- [x] **P5.1**: Create `SalaryRuleProfile` model supporting all observed rules:
  - Wage basis (`DAILY`, `MONTHLY_DIV_26`, `MONTHLY_DIV_30`, `MONTHLY_DIV_CALENDAR`)
  - OT & Allowances (`NONE`, `FLAT_OT`, `DAILY_RATE`, `HOURLY_DOUBLE`, `HOURLY_SINGLE_MERGE`, `SHIFT_RATIO`, `BHEL_ALLOWANCE`, `GRSE_5PCT_CANTEEN`, `SOHAM_COMPONENT_SPLIT`)
  - Bonus `8.33%` (in-gross / outside-gross / exempt, `21000` wage cap, `26`-day cap)
  - EPF `12%` (10 variants: uncapped, `15000`, `25000`, `26`-day, `FullMonth`, `399/day`, `(75/13*12)/day`, `6000/30*days`, `SOHAM Basic*12%`, exempt)
  - ESI `0.75%` (7 variants including `21000`, `30`-day, `SOHAM Fuel+Washing` exclusion, `ROUNDUP`, exempt)
  - WB PT slab + `deductPtFromEmployee` flag (`false` for CMOH units, `true` otherwise)
  - Custom site charges (`Gem Charge`, `Admin Charge`, `Arrear`, `Uniform EMI`, `Advance`)
- [x] **P5.2**: Implement deterministic Payroll Calculation Service & seed pre-configured rule templates matching all 27 Excel sheets
- [x] **P5.3**: Build `PayrollRun` & `SalaryLineItem` workflow (`DRAFT` -> `REVIEWED` -> `LOCKED` -> `PARTIAL_PAID` / `HOLD` / `PAID`) with live breakdown, manual hold/arrear adjustments, and bulk bank/NEFT advice export
- [x] **P5.4**: Update `/esi-pf` compliance return exports (EPF ECR & ESIC monthly challan derived from locked `SalaryLineItem` data)
- [x] **P5.5**: Update `/payslips` to render immutable month/employee payslips showing exact site components (including Factory breakup, Canteen, Outside-gross Bonus, Dress/Advance EMI balances, Payment mode & Voucher ref)

---

## Phase 6 — Site Billing Engine, GST Regimes & Pre/Post-Payment Tracking *(COMPLETED)*
- [x] **P6.1**: Create `BillingRuleProfile` model supporting all 5 invoice archetypes (`ALL_INCLUSIVE_RATE`, `DAY_RATE_STATUTORY_MARKUP`, `MONTHLY_POOL_STATUTORY`, `GOVT_WORKS_DEDUCT_CESS`, `SERVICE_CHARGE_ONLY`) & RCM GST-stripping (`MSME S.G` `514.29 / 1.18`)
- [x] **P6.2**: Support all 4 GST regimes (`INTRA_CGST_SGST 9%+9%`, `INTER_IGST 18%`, `RCM 0%`, `NON_GST 0%`), SAC codes (`998533`, `998525`, `998519`), `0.02%` deductions, `1%` Cess, and per-site rounding (`ROUND`, `ROUNDUP`, exact paise)
- [x] **P6.3**: Build multi-invoice & multi-month billing generation (`BANGDUBI`, `ICAR`, `MSME`, `PHE` multi-month) directly from verified `AttendanceDaily` counts
- [x] **P6.4**: Implement Pre-Payment -> Deduction Slip -> Post-Payment Receipt Reconciliation (`Cheque / NEFT / RTGS / UPI`, TDS/LD deductions, `>30 days` `24% p.a.` overdue tracker) & printable GST Tax Invoice matching ACS letterhead/Axis Bank footer

---

## Phase 7 — Legacy Migration Tools & End-to-End Verification *(COMPLETED)*
- [x] **P7.1**: Build admin Excel/CSV import helpers to onboard all 400–1,000 existing employees, sites, opening advance balances, and unpaid uniform EMIs from ACS workbooks (`onboardingImport.service.ts`, `POST /api/admin/onboarding-import`, `onboarding-csv.ts`, `OnboardingImportView` under `/settings?tab=migration`)
- [x] **P7.2**: Write automated backend calculation test suite verifying exact rupee/paise parity against October 2026 ground-truth sheets (`BALARAM`, `RIFLE`, `MSME TOOL`, `FSSAI`, `SOHAM`, `PHE`, `NIELIT`, `BEGDUBI`, `CULTURE` in `october2026Parity.test.ts`)
- [x] **P7.3**: Run TypeScript build, backend test suite, and UI end-to-end verification across all modules
