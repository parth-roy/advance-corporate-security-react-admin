import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Building2, CalendarClock, Check, MapPin, Minus, Plus, Search, ShoppingBag, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { ACS_LOCATIONS, DEFAULT_UNIFORM_REGISTRATION_CHARGE, UNIFORM_CATEGORIES, UNIFORM_DEFAULT_PRICES } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { UniformIssueMode, UniformItem, UniformRecoveryMode } from "@/lib/acs-types";
import { deriveUniformStatus, formatINR } from "@/lib/acs-utils";
import { buildEmployeeId, inferDepartmentCode, parseEmployeeId } from "@/lib/employee-id";
import { cn } from "@/lib/utils";

interface EmployeeOption {
  key: string;
  name: string;
  employeeId: string;
  legacyEmpCode?: string;
  mobile?: string;
  originalDocHeld?: string;
  designation: string;
  site: string;
}

interface CartLine {
  item: UniformItem;
  quantity: number;
  unitPrice: number;
}

export function IssueUniformPage({
  initialCandidateId,
  onBack,
  onIssuedSuccess,
}: {
  initialCandidateId?: string | undefined;
  onBack: () => void;
  onIssuedSuccess: () => void;
}) {
  const { data, issueUniformBatch } = useAcsStore();

  const employeeOptions = useMemo<EmployeeOption[]>(() => {
    const map = new Map<string, EmployeeOption>();
    data.employees
      .filter((e) => e.status !== "LEFT")
      .forEach((e) => {
        const empId = (e.empCode ?? "").trim();
        const key = `${e.fullName.trim().toLowerCase()}::${empId.toLowerCase()}`;
        const custody = e.originalIdCustody;
        const origDoc = custody?.inCustody
          ? `${custody.documentType || "Original ID"}${custody.referenceNo ? ` (${custody.referenceNo})` : ""}${custody.depositedDate ? ` · ${custody.depositedDate}` : ""}`
          : "";
        map.set(key, {
          key,
          name: e.fullName,
          employeeId: empId,
          ...(e.legacyEmpCode ? { legacyEmpCode: e.legacyEmpCode } : {}),
          ...(e.mobile ? { mobile: e.mobile } : {}),
          ...(origDoc ? { originalDocHeld: origDoc } : {}),
          designation: e.designation,
          site: e.siteName,
        });
      });
    data.candidates.forEach((c) => {
      const empId = (c.employeeId ?? "").trim();
      const existingById = Array.from(map.values()).find(
        (x) => empId && x.employeeId.toLowerCase() === empId.toLowerCase(),
      );
      if (existingById) return;
      const key = `${c.fullName.trim().toLowerCase()}::${empId.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: c.fullName,
          employeeId: empId,
          designation: c.position,
          site: c.location,
        });
      }
    });
    const mergeRecord = (name: string, empId: string, designation: string, site: string) => {
      const existingById = Array.from(map.values()).find(
        (x) => empId && x.employeeId.toLowerCase() === empId.toLowerCase(),
      );
      if (existingById) return;
      const key = `${name.trim().toLowerCase()}::${empId.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { key, name, employeeId: empId, designation, site });
      }
    };
    data.attendance.forEach((a) => mergeRecord(a.employeeName, a.employeeId, a.designation, a.location));
    data.salaries.forEach((s) => mergeRecord(s.employeeName, s.employeeId, s.designation, s.location));
    data.statutory.forEach((st) => mergeRecord(st.employeeName, st.employeeId, st.designation, st.location));
    return Array.from(map.values());
  }, [data.employees, data.candidates, data.attendance, data.salaries, data.statutory]);

  const allSites = useMemo(() => {
    const set = new Set<string>();
    data.sites.forEach((s) => s.isActive !== false && s.siteName && set.add(s.siteName));
    data.employees.forEach((e) => e.siteName && set.add(e.siteName));
    data.candidates.forEach((c) => c.location && set.add(c.location));
    data.attendance.forEach((a) => a.location && set.add(a.location));
    data.salaries.forEach((s) => s.location && set.add(s.location));
    if (set.size === 0) {
      ACS_LOCATIONS.forEach((loc) => set.add(loc));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.sites, data.employees, data.candidates, data.attendance, data.salaries]);

  const [issueMode, setIssueMode] = useState<UniformIssueMode>("INDIVIDUAL");
  const [serialNo, setSerialNo] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [empDeptCode, setEmpDeptCode] = useState("SEC");
  const [empYear, setEmpYear] = useState(String(new Date().getFullYear()));
  const [empNumber, setEmpNumber] = useState("");
  const [legacyEmpCode, setLegacyEmpCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [site, setSite] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [issuedBy, setIssuedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [originalDocHeld, setOriginalDocHeld] = useState("");
  const [remarks, setRemarks] = useState("");

  const [recoveryMode, setRecoveryMode] = useState<UniformRecoveryMode>("ONE_TIME");
  const [emiCount, setEmiCount] = useState("4");
  const [fixedMonthlyAmt, setFixedMonthlyAmt] = useState("500");
  const [recoveryStartMonth, setRecoveryStartMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [idDropdownOpen, setIdDropdownOpen] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  const nameRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);

  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [includeRegCharge, setIncludeRegCharge] = useState(true);
  const [regChargeAmount, setRegChargeAmount] = useState(
    String(data.settings.uniformRegistrationCharge ?? DEFAULT_UNIFORM_REGISTRATION_CHARGE),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialCandidateId) return;
    const target = data.candidates.find((c) => c.id === initialCandidateId);
    if (!target) return;
    setEmployeeName(target.fullName);
    const parsed = parseEmployeeId(target.employeeId, target.position);
    setEmpDeptCode(parsed.deptCode);
    setEmpYear(parsed.year);
    setEmpNumber(parsed.number);
    setSite(target.location);
  }, [initialCandidateId, data.candidates]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setNameDropdownOpen(false);
      if (idRef.current && !idRef.current.contains(e.target as Node)) setIdDropdownOpen(false);
      if (siteRef.current && !siteRef.current.contains(e.target as Node)) setSiteDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectEmployee = (emp: EmployeeOption) => {
    setEmployeeName(emp.name);
    const parsed = parseEmployeeId(emp.employeeId, emp.designation);
    setEmpDeptCode(parsed.deptCode || inferDepartmentCode(emp.designation));
    setEmpYear(parsed.year);
    setEmpNumber(parsed.number || emp.employeeId);
    if (emp.legacyEmpCode) setLegacyEmpCode(emp.legacyEmpCode);
    if (emp.mobile) setMobile(emp.mobile);
    if (emp.originalDocHeld) setOriginalDocHeld(emp.originalDocHeld);
    if (!receivedBy) setReceivedBy(emp.name);
    if (emp.site) setSite(emp.site);
    setNameDropdownOpen(false);
    setIdDropdownOpen(false);
  };

  const filteredEmployeesByName = useMemo(() => {
    const q = employeeName.trim().toLowerCase();
    return employeeOptions
      .filter(
        (emp) =>
          !q ||
          emp.name.toLowerCase().includes(q) ||
          emp.designation.toLowerCase().includes(q) ||
          emp.employeeId.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [employeeOptions, employeeName]);

  const filteredEmployeesById = useMemo(() => {
    const q = empNumber.trim().toLowerCase();
    const codeQ = empDeptCode.trim().toLowerCase();
    return employeeOptions
      .filter((emp) => {
        if (!emp.employeeId && !q) return true;
        if (!q) return emp.employeeId.toLowerCase().includes(codeQ);
        return (
          emp.employeeId.toLowerCase().includes(q) ||
          emp.name.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [employeeOptions, empNumber, empDeptCode]);

  const filteredSites = useMemo(() => {
    const q = site.trim().toLowerCase();
    return allSites.filter((s) => !q || s.toLowerCase().includes(q));
  }, [allSites, site]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return data.uniforms.filter((item) => {
      const label = (item.subCategory || item.category).toLowerCase();
      const matchesCat = catalogCategory === "All" || item.category === catalogCategory;
      const matchesQ =
        !q ||
        label.includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [data.uniforms, catalogSearch, catalogCategory]);

  const toggleCatalogItem = (item: UniformItem) => {
    if (item.availableQty <= 0) {
      toast.error(`${item.subCategory || item.category} (${item.size}) is out of stock.`);
      return;
    }
    setCart((prev) => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      const defaultPrice = item.unitPrice ?? UNIFORM_DEFAULT_PRICES[item.category] ?? 0;
      return {
        ...prev,
        [item.id]: { item, quantity: 1, unitPrice: defaultPrice },
      };
    });
  };

  const updateCartQuantity = (itemId: string, nextQty: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const clamped = Math.max(1, Math.min(existing.item.availableQty, Math.round(nextQty) || 1));
      return {
        ...prev,
        [itemId]: { ...existing, quantity: clamped },
      };
    });
  };

  const updateCartPrice = (itemId: string, nextPrice: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      return {
        ...prev,
        [itemId]: { ...existing, unitPrice: Math.max(0, Math.round(nextPrice) || 0) },
      };
    });
  };

  const cartLines = Object.values(cart);
  const itemsSubtotal = cartLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const numericRegCharge =
    issueMode === "INDIVIDUAL" && includeRegCharge
      ? Math.max(0, Math.round(Number(regChargeAmount) || 0))
      : 0;
  const grandTotal = itemsSubtotal + numericRegCharge;

  const formattedEmployeeId = buildEmployeeId({
    deptCode: empDeptCode,
    year: empYear,
    number: empNumber,
  });

  const parsedEmiCount = Math.max(1, Math.min(36, Math.round(Number(emiCount) || 1)));
  const parsedFixedMonthly = Math.max(1, Math.round(Number(fixedMonthlyAmt) || 500));
  const emiPreviewAmount =
    recoveryMode === "ONE_TIME"
      ? grandTotal
      : recoveryMode === "FIXED_MONTHLY"
        ? Math.min(grandTotal, parsedFixedMonthly)
        : Number((grandTotal / parsedEmiCount).toFixed(2));

  const handleModeSwitch = (nextMode: UniformIssueMode) => {
    setIssueMode(nextMode);
    setError("");
    if (nextMode === "BULK_SITE") {
      setIncludeRegCharge(false);
    } else {
      setIncludeRegCharge(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (issueMode === "INDIVIDUAL") {
      if (!employeeName.trim()) {
        setError("Please select or enter an Employee Name.");
        return;
      }
      if (!formattedEmployeeId) {
        setError("Please enter the Employee ID number.");
        return;
      }
    } else if (!receivedBy.trim() && !employeeName.trim()) {
      setError("Please enter who received the bulk stock at site.");
      return;
    }

    if (!site.trim()) {
      setError("Please select or enter a Site / Location.");
      return;
    }
    if (cartLines.length === 0) {
      setError("Please select at least one uniform or accessory item to issue.");
      return;
    }

    const effectiveEmpId = issueMode === "BULK_SITE" ? "BULK-SITE" : formattedEmployeeId;
    const effectiveEmpName =
      issueMode === "BULK_SITE"
        ? receivedBy.trim() || employeeName.trim() || `${site.trim()} Unit Stock`
        : employeeName.trim();

    setSubmitting(true);
    try {
      const res = await issueUniformBatch({
        issueMode,
        ...(serialNo.trim() ? { serialNo: serialNo.trim() } : {}),
        employeeId: effectiveEmpId,
        ...(legacyEmpCode.trim() ? { legacyEmpCode: legacyEmpCode.trim() } : {}),
        employeeName: effectiveEmpName,
        ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
        site: site.trim(),
        issueDate,
        registrationCharge: numericRegCharge,
        ...(issuedBy.trim() ? { issuedBy: issuedBy.trim() } : {}),
        ...(receivedBy.trim() ? { receivedBy: receivedBy.trim() } : {}),
        ...(verifiedBy.trim() ? { verifiedBy: verifiedBy.trim() } : {}),
        ...(originalDocHeld.trim() ? { originalDocHeld: originalDocHeld.trim() } : {}),
        billToSite: issueMode === "BULK_SITE",
        remarks: remarks.trim(),
        items: cartLines.map((line) => ({
          itemId: line.item.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        recoveryPlan:
          issueMode === "BULK_SITE"
            ? { createPlan: false, recoveryMode: "NO_RECOVERY" }
            : {
                createPlan: recoveryMode !== "NO_RECOVERY" && grandTotal > 0,
                recoveryMode,
                installmentCount: parsedEmiCount,
                monthlyAmount: emiPreviewAmount,
                startMonth: recoveryStartMonth || issueDate.slice(0, 7),
                remarks: remarks.trim(),
              },
      });

      if (!res.ok) {
        setError(res.message || "Could not issue uniform items.");
        return;
      }

      toast.success(
        issueMode === "BULK_SITE"
          ? `Bulk issued ${cartLines.length} item line(s) to ${site.trim()}.`
          : `Issued ${cartLines.length} item(s) to ${effectiveEmpName} (${effectiveEmpId}).`,
      );
      onIssuedSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to Uniforms &amp; Accessories
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          Multi-Item Uniform &amp; Accessory Issuance
        </span>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <section className="acs-card p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  1. {issueMode === "BULK_SITE" ? "Bulk Site / Unit Stock Issue" : "Employee & Deployment Site"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {issueMode === "BULK_SITE"
                    ? "Issue bulk uniform kits directly to a client site (PHED mode — no employee salary deduction)."
                    : `Search employee by name or ID (ACS/<DEPT>/<YEAR>/<NUMBER>), and select deployment site`}
                </p>
              </div>
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => handleModeSwitch("INDIVIDUAL")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    issueMode === "INDIVIDUAL"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <User className="size-3.5" />
                  Individual Employee
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("BULK_SITE")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    issueMode === "BULK_SITE"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Building2 className="size-3.5" />
                  Bulk Site Issue
                </button>
              </div>
            </div>
            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {issueMode === "INDIVIDUAL" && (
                <>
                  <div ref={nameRef} className="relative space-y-1.5">
                    <Label htmlFor="iss-emp-name">Employee Name *</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="iss-emp-name"
                        aria-label="Search Employee Name"
                        value={employeeName}
                        onFocus={() => setNameDropdownOpen(true)}
                        onChange={(e) => {
                          setEmployeeName(e.target.value);
                          setNameDropdownOpen(true);
                        }}
                        placeholder="Search employee name..."
                        className="pl-9"
                      />
                    </div>
                    {nameDropdownOpen && (
                      <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        {filteredEmployeesByName.length === 0 ? (
                          <p className="px-2.5 py-2 text-xs text-muted-foreground">
                            No matching employees — using typed name directly.
                          </p>
                        ) : (
                          filteredEmployeesByName.map((emp) => (
                            <button
                              key={emp.key}
                              type="button"
                              onClick={() => selectEmployee(emp)}
                              className="flex w-full flex-col rounded px-2.5 py-1.5 text-left text-xs hover:bg-accent"
                            >
                              <span className="font-semibold text-foreground">{emp.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {emp.employeeId || "No ID assigned"} · {emp.designation}
                                {emp.site ? ` · ${emp.site}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div ref={idRef} className="relative space-y-1.5">
                    <Label htmlFor="iss-emp-num">Employee ID (ACS / Dept / Year / Number) *</Label>
                    <div className="flex items-center gap-1">
                      <span className="flex h-9 items-center rounded-md border border-input bg-muted px-2 text-xs font-semibold">
                        ACS
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <Input
                        aria-label="Issue Employee Dept Code"
                        value={empDeptCode}
                        onChange={(e) => setEmpDeptCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8))}
                        placeholder="CLE"
                        className="w-16 text-center text-xs font-semibold uppercase"
                      />
                      <span className="text-muted-foreground">/</span>
                      <Input
                        aria-label="Issue Employee Year"
                        value={empYear}
                        onChange={(e) => setEmpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="2026"
                        className="w-16 text-center text-xs tabular-nums"
                      />
                      <span className="text-muted-foreground">/</span>
                      <Input
                        id="iss-emp-num"
                        aria-label="Search Employee ID Number"
                        value={empNumber}
                        onFocus={() => setIdDropdownOpen(true)}
                        onChange={(e) => {
                          setEmpNumber(e.target.value.toUpperCase());
                          setIdDropdownOpen(true);
                        }}
                        placeholder="Search or enter no."
                        className="min-w-0 flex-1 text-xs uppercase"
                      />
                    </div>
                    {idDropdownOpen && (
                      <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        {filteredEmployeesById.length === 0 ? (
                          <p className="px-2.5 py-2 text-xs text-muted-foreground">
                            Using custom ID: {formattedEmployeeId || "Enter number"}
                          </p>
                        ) : (
                          filteredEmployeesById.map((emp) => (
                            <button
                              key={`id-${emp.key}`}
                              type="button"
                              onClick={() => selectEmployee(emp)}
                              className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs hover:bg-accent"
                            >
                              <span className="font-mono font-semibold text-foreground">
                                {emp.employeeId || "No ID"}
                              </span>
                              <span className="truncate pl-2 text-[11px] text-muted-foreground">
                                {emp.name}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div ref={siteRef} className="relative space-y-1.5">
                <Label htmlFor="iss-site">Site / Location *</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="iss-site"
                    aria-label="Search Site Location"
                    value={site}
                    onFocus={() => setSiteDropdownOpen(true)}
                    onChange={(e) => {
                      setSite(e.target.value);
                      setSiteDropdownOpen(true);
                    }}
                    placeholder="Search or enter deployment site..."
                    className="pl-9"
                  />
                </div>
                {siteDropdownOpen && (
                  <div className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {filteredSites.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                        Using custom site: &ldquo;{site}&rdquo;
                      </p>
                    ) : (
                      filteredSites.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setSite(loc);
                            setSiteDropdownOpen(false);
                          }}
                          className="flex w-full rounded px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                        >
                          {loc}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="iss-date">Issue Date *</Label>
                  <Input
                    id="iss-date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iss-remarks">Remarks (Optional)</Label>
                  <Input
                    id="iss-remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={issueMode === "BULK_SITE" ? "e.g. 10 Nos Shoe & 16 Nos Belt Received" : "e.g. Initial onboarding kit"}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1">
                <Label htmlFor="iss-serial" className="text-[11px]">Serial No</Label>
                <Input
                  id="iss-serial"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="e.g. 454"
                  className="h-8 text-xs"
                />
              </div>
              {issueMode === "INDIVIDUAL" && (
                <div className="space-y-1">
                  <Label htmlFor="iss-legacy" className="text-[11px]">Legacy Code</Label>
                  <Input
                    id="iss-legacy"
                    value={legacyEmpCode}
                    onChange={(e) => setLegacyEmpCode(e.target.value)}
                    placeholder="e.g. 3065"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="iss-mobile" className="text-[11px]">Mobile No</Label>
                <Input
                  id="iss-mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="iss-by" className="text-[11px]">Issued By</Label>
                <Input
                  id="iss-by"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  placeholder="Store / Ops staff"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="iss-rec-by" className="text-[11px]">
                  {issueMode === "BULK_SITE" ? "Received By *" : "Received By"}
                </Label>
                <Input
                  id="iss-rec-by"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder={issueMode === "BULK_SITE" ? "Site Supervisor / Officer" : "Recipient signature"}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="iss-ver-by" className="text-[11px]">Verified By</Label>
                <Input
                  id="iss-ver-by"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="Manager / Admin"
                  className="h-8 text-xs"
                />
              </div>
              {issueMode === "INDIVIDUAL" && (
                <div className="col-span-2 space-y-1 sm:col-span-3 lg:col-span-6">
                  <Label htmlFor="iss-orig-doc" className="text-[11px]">
                    Original ID / Custody Tag (Register Reference)
                  </Label>
                  <Input
                    id="iss-orig-doc"
                    value={originalDocHeld}
                    onChange={(e) => setOriginalDocHeld(e.target.value)}
                    placeholder="e.g. ORIGINAL VOTER ID: 22/08/- or Aadhaar Copy Verified"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="acs-card p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">2. Choose Uniforms &amp; Accessories</h2>
                <p className="text-xs text-muted-foreground">
                  Select one or multiple items to issue together and set quantities
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-52">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Filter uniform catalog"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filter category or variant..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Select value={catalogCategory} onValueChange={setCatalogCategory}>
                  <SelectTrigger className="h-8 w-full text-xs sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {UNIFORM_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredCatalog.map((item) => {
                const selectedLine = cart[item.id];
                const isSelected = Boolean(selectedLine);
                const status = deriveUniformStatus(item.availableQty);
                const label = item.subCategory || item.category;
                const price = item.unitPrice ?? UNIFORM_DEFAULT_PRICES[item.category] ?? 0;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col justify-between gap-3 rounded-lg border p-3.5 transition-colors",
                      isSelected ? "border-primary bg-brand-accent-soft/20" : "bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                          {item.subCategory && (
                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Size: <span className="font-medium text-foreground">{item.size}</span> · Price:{" "}
                          <span className="font-semibold text-foreground">{formatINR(price)}</span>
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.availableQty} left in stock
                      </span>

                      {isSelected && selectedLine ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-7"
                            aria-label={`Decrease quantity for ${label}`}
                            onClick={() => updateCartQuantity(item.id, selectedLine.quantity - 1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-6 text-center text-xs font-semibold tabular-nums">
                            {selectedLine.quantity}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-7"
                            aria-label={`Increase quantity for ${label}`}
                            onClick={() => updateCartQuantity(item.id, selectedLine.quantity + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() => toggleCatalogItem(item)}
                          >
                            <Check className="size-3.5" />
                            Added
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={item.availableQty <= 0}
                          onClick={() => toggleCatalogItem(item)}
                          className="h-7 px-2.5 text-xs"
                        >
                          <Plus className="size-3.5" />
                          Select Item
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="acs-card sticky top-20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShoppingBag className="size-4 text-primary" />
                Issue Summary ({cartLines.length})
              </h2>
              {formattedEmployeeId && (
                <Badge variant="info" className="font-mono text-[10px]">
                  {formattedEmployeeId}
                </Badge>
              )}
            </div>
            <Separator />

            {cartLines.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Select items from the Uniforms &amp; Accessories catalog to add them here.
              </p>
            ) : (
              <div className="max-h-72 divide-y divide-border overflow-y-auto pr-1">
                {cartLines.map((line) => {
                  const label = line.item.subCategory || line.item.category;
                  return (
                    <div key={line.item.id} className="space-y-1.5 py-2.5 text-xs first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {label} ({line.item.size})
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty {line.quantity} × {formatINR(line.unitPrice)} ={" "}
                            <span className="font-semibold text-foreground">
                              {formatINR(line.quantity * line.unitPrice)}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${label} from issue list`}
                          onClick={() => toggleCatalogItem(line.item)}
                          className="rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`price-${line.item.id}`} className="text-[11px] text-muted-foreground">
                          Unit Price (₹)
                        </Label>
                        <Input
                          id={`price-${line.item.id}`}
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(e) => updateCartPrice(line.item.id, Number(e.target.value))}
                          className="h-7 w-24 text-xs tabular-nums"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              {issueMode === "INDIVIDUAL" && (
                <div className="flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                    <Checkbox
                      checked={includeRegCharge}
                      onCheckedChange={(v) => setIncludeRegCharge(v === true)}
                    />
                    Uniform Registration Charge
                  </label>
                  <Input
                    aria-label="Registration Charge Amount"
                    type="number"
                    min={0}
                    disabled={!includeRegCharge}
                    value={regChargeAmount}
                    onChange={(e) => setRegChargeAmount(e.target.value)}
                    className="h-7 w-24 text-right text-xs tabular-nums"
                  />
                </div>
              )}

              <div className="space-y-1.5 rounded-lg border bg-background p-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items Subtotal</span>
                  <span className="tabular-nums text-foreground">{formatINR(itemsSubtotal)}</span>
                </div>
                {issueMode === "INDIVIDUAL" && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Registration Charge</span>
                    <span className="tabular-nums text-foreground">{formatINR(numericRegCharge)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>Total Charge</span>
                  <span className="tabular-nums">{formatINR(grandTotal)}</span>
                </div>
              </div>

              {issueMode === "INDIVIDUAL" ? (
                <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CalendarClock className="size-3.5 text-primary" />
                    <span>Payroll EMI Recovery Schedule</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="iss-rec-mode" className="text-[11px]">Recovery Mode</Label>
                      <Select
                        value={recoveryMode}
                        onValueChange={(v) => setRecoveryMode(v as UniformRecoveryMode)}
                      >
                        <SelectTrigger id="iss-rec-mode" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ONE_TIME">One-Time (Next Salary)</SelectItem>
                          <SelectItem value="EMI_COUNT">Split into EMIs (N Months)</SelectItem>
                          <SelectItem value="FIXED_MONTHLY">Fixed Monthly ₹</SelectItem>
                          <SelectItem value="NO_RECOVERY">Paid Cash / No Deduction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {recoveryMode !== "NO_RECOVERY" && (
                      <div className="space-y-1">
                        <Label htmlFor="iss-rec-month" className="text-[11px]">Start Month</Label>
                        <Input
                          id="iss-rec-month"
                          type="month"
                          value={recoveryStartMonth}
                          onChange={(e) => setRecoveryStartMonth(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {recoveryMode === "EMI_COUNT" && (
                      <div className="col-span-full space-y-1">
                        <Label htmlFor="iss-emi-count" className="text-[11px]">Number of Installments</Label>
                        <Input
                          id="iss-emi-count"
                          type="number"
                          min={1}
                          max={36}
                          value={emiCount}
                          onChange={(e) => setEmiCount(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {recoveryMode === "FIXED_MONTHLY" && (
                      <div className="col-span-full space-y-1">
                        <Label htmlFor="iss-emi-fixed" className="text-[11px]">Monthly Deduction (₹)</Label>
                        <Input
                          id="iss-emi-fixed"
                          type="number"
                          min={1}
                          value={fixedMonthlyAmt}
                          onChange={(e) => setFixedMonthlyAmt(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {recoveryMode === "NO_RECOVERY"
                      ? "No salary recovery plan will be created."
                      : recoveryMode === "ONE_TIME"
                        ? `Full recovery scheduled starting ${recoveryStartMonth}.`
                        : `${parsedEmiCount} EMI(s) @ ${formatINR(emiPreviewAmount)}/month from ${recoveryStartMonth}.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-info-soft/40 p-2.5 text-[11px] text-foreground">
                  Bulk Site Mode deducts inventory from ACS stock for site deployment with zero individual employee salary deduction.
                </div>
              )}
            </div>

            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Issuing..."
                : issueMode === "BULK_SITE"
                  ? "Confirm Bulk Site Issue"
                  : "Confirm & Issue Uniform Kit"}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
