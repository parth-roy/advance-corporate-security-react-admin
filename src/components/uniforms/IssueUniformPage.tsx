import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, MapPin, Minus, Plus, Search, ShoppingBag, Trash2, User } from "lucide-react";
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
import type { UniformItem } from "@/lib/acs-types";
import { deriveUniformStatus, formatINR } from "@/lib/acs-utils";
import { buildEmployeeId, inferDepartmentCode, parseEmployeeId } from "@/lib/employee-id";
import { cn } from "@/lib/utils";

interface EmployeeOption {
  key: string;
  name: string;
  employeeId: string;
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
    data.candidates.forEach((c) => {
      const empId = (c.employeeId ?? "").trim();
      const key = `${c.fullName.trim().toLowerCase()}::${empId.toLowerCase()}`;
      map.set(key, {
        key,
        name: c.fullName,
        employeeId: empId,
        designation: c.position,
        site: c.location,
      });
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
  }, [data.candidates, data.attendance, data.salaries, data.statutory]);

  const allSites = useMemo(() => {
    const set = new Set<string>(ACS_LOCATIONS);
    data.candidates.forEach((c) => c.location && set.add(c.location));
    data.attendance.forEach((a) => a.location && set.add(a.location));
    data.salaries.forEach((s) => s.location && set.add(s.location));
    return Array.from(set);
  }, [data.candidates, data.attendance, data.salaries]);

  const [employeeName, setEmployeeName] = useState("");
  const [empDeptCode, setEmpDeptCode] = useState("SEC");
  const [empYear, setEmpYear] = useState(String(new Date().getFullYear()));
  const [empNumber, setEmpNumber] = useState("");
  const [site, setSite] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

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
  const numericRegCharge = includeRegCharge ? Math.max(0, Math.round(Number(regChargeAmount) || 0)) : 0;
  const grandTotal = itemsSubtotal + numericRegCharge;

  const formattedEmployeeId = buildEmployeeId({
    deptCode: empDeptCode,
    year: empYear,
    number: empNumber,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!employeeName.trim()) {
      setError("Please select or enter an Employee Name.");
      return;
    }
    if (!formattedEmployeeId) {
      setError("Please enter the Employee ID number.");
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

    setSubmitting(true);
    try {
      const res = await issueUniformBatch({
        employeeId: formattedEmployeeId,
        employeeName: employeeName.trim(),
        site: site.trim(),
        issueDate,
        registrationCharge: numericRegCharge,
        remarks: remarks.trim(),
        items: cartLines.map((line) => ({
          itemId: line.item.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });

      if (!res.ok) {
        setError(res.message || "Could not issue uniform items.");
        return;
      }

      toast.success(
        `Issued ${cartLines.length} item(s) to ${employeeName.trim()} (${formattedEmployeeId}).`,
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
            <div>
              <h2 className="text-sm font-semibold text-foreground">1. Employee &amp; Deployment Site</h2>
              <p className="text-xs text-muted-foreground">
                Search employee by name or ID ({`ACS/<DEPT>/<YEAR>/<NUMBER>`}), and select deployment site
              </p>
            </div>
            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    placeholder="e.g. Initial onboarding kit"
                  />
                </div>
              </div>
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

              <div className="space-y-1.5 rounded-lg border bg-background p-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items Subtotal</span>
                  <span className="tabular-nums text-foreground">{formatINR(itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Registration Charge</span>
                  <span className="tabular-nums text-foreground">{formatINR(numericRegCharge)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>Total Charge</span>
                  <span className="tabular-nums">{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Issuing Uniform Kit..." : "Confirm & Issue Uniform Kit"}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
