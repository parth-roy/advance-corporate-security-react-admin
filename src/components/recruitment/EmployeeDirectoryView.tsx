import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/acs/StatCard";
import { DesignationCombobox } from "@/components/recruitment/DesignationCombobox";
import { EmployeeProfileDrawer } from "@/components/recruitment/EmployeeProfileDrawer";
import { SiteCombobox } from "@/components/recruitment/SiteCombobox";
import { type PaginatedEmployeesResult, useAcsStore } from "@/lib/acs-store";
import type {
  EmployeeRateType,
  EmployeeRecord,
  EmployeeStatus,
  PaymentMode,
} from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";

const STATUS_BADGE_VARIANT: Record<EmployeeStatus, "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  LEFT: "danger",
  TRANSFERRED: "info",
};

interface EmployeeFormState {
  empCode: string;
  legacyEmpCode: string;
  fullName: string;
  siteName: string;
  subUnit: string;
  designation: string;
  mobile: string;
  email: string;
  dateOfJoining: string;
  rateType: EmployeeRateType;
  baseRate: string;
  status: EmployeeStatus;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  preferredPaymentMode: PaymentMode;
  esiHolder: "Yes" | "No" | "";
  esiNumber: string;
  pfUan: string;
  idInCustody: boolean;
  custodyDocType: string;
  custodyRefNo: string;
  remarks: string;
}

const EMPTY_EMP_FORM: EmployeeFormState = {
  empCode: "",
  legacyEmpCode: "",
  fullName: "",
  siteName: "",
  subUnit: "",
  designation: "Security Guard",
  mobile: "",
  email: "",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  rateType: "MONTHLY",
  baseRate: "0",
  status: "ACTIVE",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  preferredPaymentMode: "BANK_TRANSFER",
  esiHolder: "",
  esiNumber: "",
  pfUan: "",
  idInCustody: false,
  custodyDocType: "Original Voter ID",
  custodyRefNo: "",
  remarks: "",
};

function employeeToForm(emp: EmployeeRecord): EmployeeFormState {
  return {
    empCode: emp.empCode ?? "",
    legacyEmpCode: emp.legacyEmpCode ?? "",
    fullName: emp.fullName ?? "",
    siteName: emp.siteName ?? "",
    subUnit: emp.subUnit ?? "",
    designation: emp.designation ?? "Security Guard",
    mobile: emp.mobile ?? "",
    email: emp.email ?? "",
    dateOfJoining: emp.dateOfJoining ?? "",
    rateType: emp.rateType ?? "MONTHLY",
    baseRate: String(emp.baseRate ?? 0),
    status: emp.status ?? "ACTIVE",
    bankName: emp.bankDetails?.bankName ?? "",
    accountNumber: emp.bankDetails?.accountNumber ?? "",
    ifscCode: emp.bankDetails?.ifscCode ?? "",
    upiId: emp.bankDetails?.upiId ?? "",
    preferredPaymentMode: emp.bankDetails?.preferredPaymentMode ?? "BANK_TRANSFER",
    esiHolder: emp.statutory?.esiHolder ?? "",
    esiNumber: emp.statutory?.esiNumber ?? "",
    pfUan: emp.statutory?.pfUan ?? "",
    idInCustody: Boolean(emp.originalIdCustody?.inCustody),
    custodyDocType: emp.originalIdCustody?.documentType ?? "Original Voter ID",
    custodyRefNo: emp.originalIdCustody?.referenceNo ?? "",
    remarks: emp.remarks ?? "",
  };
}

export function EmployeeDirectoryView() {
  const {
    data,
    fetchEmployeesPaginated,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    previewNextEmployeeCode,
  } = useAcsStore();

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [desigFilter, setDesigFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<PaginatedEmployeesResult>({
    items: data.employees,
    pagination: {
      page: 1,
      limit: 25,
      total: data.employees.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    summary: {
      total: data.employees.length,
      active: data.employees.filter((e) => e.status === "ACTIVE").length,
      onHold: data.employees.filter((e) => e.status === "ON_HOLD").length,
      left: data.employees.filter((e) => e.status === "LEFT").length,
      transferred: data.employees.filter((e) => e.status === "TRANSFERRED").length,
    },
    designations: [],
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<EmployeeRecord | null>(null);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_EMP_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchEmployeesPaginated({
        page,
        limit,
        search,
        siteName: siteFilter,
        status: statusFilter,
        designation: desigFilter,
      });
      setResult(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch deployed employees.");
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeesPaginated, page, limit, search, siteFilter, statusFilter, desigFilter]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees, data.employees.length]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm(EMPTY_EMP_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (emp: EmployeeRecord) => {
    setEditing(emp);
    setForm(employeeToForm(emp));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.siteName.trim()) {
      toast.error("Full Name and Deployment Site are required.");
      return;
    }
    if (form.mobile.trim() && !/^\d{10}$/.test(form.mobile.trim())) {
      toast.error("Mobile Number must be 10 digits or left blank.");
      return;
    }
    const rate = Number(form.baseRate || 0);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error("Base Rate must be a non-negative number.");
      return;
    }

    const matchedSite = data.sites.find(
      (s) => s.siteName.trim().toLowerCase() === form.siteName.trim().toLowerCase(),
    );

    const payload: Omit<EmployeeRecord, "id"> = {
      empCode: form.empCode.trim().toUpperCase(),
      legacyEmpCode: form.legacyEmpCode.trim().toUpperCase(),
      primarySiteId: matchedSite?.id ?? null,
      siteName: matchedSite?.siteName || form.siteName.trim(),
      subUnit: form.subUnit.trim(),
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      designation: form.designation.trim() || "Security Guard",
      dateOfJoining: form.dateOfJoining.trim(),
      rateType: form.rateType,
      baseRate: rate,
      status: form.status,
      bankDetails: {
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        branchName: "",
        upiId: form.upiId.trim(),
        preferredPaymentMode: form.preferredPaymentMode,
      },
      statutory: {
        esiHolder: form.esiHolder,
        esiNumber: form.esiNumber.trim(),
        pfUan: form.pfUan.trim(),
      },
      originalIdCustody: {
        documentType: form.custodyDocType.trim(),
        referenceNo: form.custodyRefNo.trim(),
        depositedDate: form.idInCustody ? new Date().toISOString().slice(0, 10) : "",
        inCustody: form.idInCustody,
        notes: "",
      },
      remarks: form.remarks.trim(),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateEmployee({ ...editing, ...payload, id: editing.id });
        toast.success(`Updated employee "${payload.fullName}".`);
      } else {
        await createEmployee(payload);
        toast.success(`Added "${payload.fullName}" to Employee Directory.`);
      }
      setDialogOpen(false);
      await loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (mode: "left" | "delete") => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.id, mode);
      toast.success(
        mode === "left"
          ? `Marked ${deleteTarget.fullName} as LEFT.`
          : `Deleted employee ${deleteTarget.fullName}.`,
      );
      setDeleteTarget(null);
      await loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    }
  };

  const hasFilters = Boolean(
    search.trim() || siteFilter !== "All" || statusFilter !== "All" || desigFilter !== "All",
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Deployed Staff"
          value={result.summary.total}
          hint="All active, on-hold & past staff"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Active on Roll"
          value={result.summary.active}
          hint="Eligible for muster & payroll"
          icon={UserCheck}
          tone="success"
        />
        <StatCard
          label="On Hold"
          value={result.summary.onHold}
          hint="Pending compliance or cheque release"
          icon={Landmark}
          tone="warning"
        />
        <StatCard
          label="Left / Transferred"
          value={result.summary.left + result.summary.transferred}
          hint={`${result.summary.left} left · ${result.summary.transferred} transferred`}
          icon={UserMinus}
          tone="danger"
        />
      </section>

      <section className="acs-card space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search employee directory"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, ACS code, legacy code, mobile..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSiteFilter("All");
                  setStatusFilter("All");
                  setDesigFilter("All");
                  setPage(1);
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset Filters
              </Button>
            )}
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Add Employee
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={siteFilter}
            onValueChange={(v) => {
              setSiteFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter directory by Site">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sites ({data.sites.length})</SelectItem>
              {data.sites.map((s) => (
                <SelectItem key={s.id} value={s.siteName}>
                  {s.siteName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter directory by Status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
              <SelectItem value="TRANSFERRED">TRANSFERRED</SelectItem>
              <SelectItem value="LEFT">LEFT</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={desigFilter}
            onValueChange={(v) => {
              setDesigFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter directory by Designation">
              <SelectValue placeholder="All Designations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Designations ({result.designations.length})</SelectItem>
              {result.designations.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v) || 25);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Employee Code</TableHead>
                <TableHead>Name &amp; Mobile</TableHead>
                <TableHead>Primary Site</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Rate &amp; Basis</TableHead>
                <TableHead>ESI / PF / Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {loading
                      ? "Loading deployed personnel..."
                      : "No deployed employees found matching these filters."}
                  </TableCell>
                </TableRow>
              ) : (
                result.items.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-primary">{emp.empCode}</div>
                      {emp.legacyEmpCode && (
                        <div className="font-mono text-[11px] text-muted-foreground">
                          Legacy #{emp.legacyEmpCode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        data-tooltip={`Click to view ${emp.fullName}'s full profile, uniforms, attendance & payslips`}
                        onClick={() => setViewing(emp)}
                        className="text-left font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {emp.fullName}
                      </button>
                      <div className="text-xs text-muted-foreground">{emp.mobile || "No mobile"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 text-sm text-foreground">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {emp.siteName}
                      </div>
                      {emp.subUnit && (
                        <div className="text-[11px] text-muted-foreground">{emp.subUnit}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">{emp.designation}</TableCell>
                    <TableCell>
                      <div className="font-semibold tabular-nums text-foreground">
                        {formatINR(emp.baseRate || 0)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {emp.rateType === "DAILY" ? "Per Day" : "Monthly"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-foreground">
                        {emp.bankDetails?.preferredPaymentMode || "BANK_TRANSFER"}
                        {emp.bankDetails?.accountNumber
                          ? ` · A/c ..${emp.bankDetails.accountNumber.slice(-4)}`
                          : ""}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {emp.statutory?.pfUan ? `UAN ${emp.statutory.pfUan}` : "UAN —"}
                        {emp.originalIdCustody?.inCustody ? " · ID Held" : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[emp.status]}>{emp.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`View employee ${emp.fullName}`}
                          tooltip={`View ${emp.fullName}'s full profile, assigned uniforms, attendance, advances, payslips & KYC docs`}
                          onClick={() => setViewing(emp)}
                        >
                          <Eye className="size-4 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit employee ${emp.fullName}`}
                          onClick={() => openEditDialog(emp)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove employee ${emp.fullName}`}
                          onClick={() => setDeleteTarget(emp)}
                        >
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            Page {result.pagination.page} of {result.pagination.totalPages} · Total matching employees:{" "}
            <strong className="text-foreground">{result.pagination.total}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!result.pagination.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!result.pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              {editing ? `Edit Employee: ${editing.fullName}` : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update site assignment, salary rate, bank details, or statutory numbers."
                : "Add an active guard, supervisor, or office staff member directly to a site and payroll."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="dir-name">Full Name *</Label>
                <Input
                  id="dir-name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-mobile">10-Digit Mobile</Label>
                <Input
                  id="dir-mobile"
                  value={form.mobile}
                  maxLength={10}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="dir-code">Employee Code (Optional)</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="dir-code"
                    value={form.empCode}
                    onChange={(e) => setForm({ ...form, empCode: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated on save"
                    className="font-mono uppercase"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Preview next employee code"
                    onClick={() =>
                      void previewNextEmployeeCode(form.designation, form.dateOfJoining.slice(0, 4)).then(
                        (code) => setForm((prev) => ({ ...prev, empCode: code })),
                      )
                    }
                  >
                    <Wand2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-legacy">Old Register / Bio ID (Optional)</Label>
                <Input
                  id="dir-legacy"
                  value={form.legacyEmpCode}
                  onChange={(e) => setForm({ ...form, legacyEmpCode: e.target.value.toUpperCase() })}
                  placeholder="Only if migrating old ID"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-status">Employment Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as EmployeeStatus })}
                >
                  <SelectTrigger id="dir-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                    <SelectItem value="TRANSFERRED">TRANSFERRED</SelectItem>
                    <SelectItem value="LEFT">LEFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="dir-site">Primary Site *</Label>
                <SiteCombobox
                  id="dir-site"
                  value={form.siteName}
                  onChange={(nextSite) => setForm({ ...form, siteName: nextSite })}
                  placeholder="Select or type site"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-subunit">Sub-Unit</Label>
                <Input
                  id="dir-subunit"
                  value={form.subUnit}
                  onChange={(e) => setForm({ ...form, subUnit: e.target.value })}
                  placeholder="e.g. Main Gate, BO Guwahati"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-desig">Designation / Rank</Label>
                <DesignationCombobox
                  id="dir-desig"
                  value={form.designation}
                  onChange={(nextDesig) => setForm({ ...form, designation: nextDesig })}
                  placeholder="Select or type role"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="dir-rate-type">Rate Type</Label>
                <Select
                  value={form.rateType}
                  onValueChange={(v) => setForm({ ...form, rateType: v as EmployeeRateType })}
                >
                  <SelectTrigger id="dir-rate-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                    <SelectItem value="DAILY">DAILY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-rate">Base Rate (₹)</Label>
                <Input
                  id="dir-rate"
                  type="number"
                  step="any"
                  min={0}
                  value={form.baseRate}
                  onChange={(e) => setForm({ ...form, baseRate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-doj">Date of Joining</Label>
                <Input
                  id="dir-doj"
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="dir-pay-mode">Preferred Payment</Label>
                <Select
                  value={form.preferredPaymentMode}
                  onValueChange={(v) =>
                    setForm({ ...form, preferredPaymentMode: v as PaymentMode })
                  }
                >
                  <SelectTrigger id="dir-pay-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-ac">Bank Account No</Label>
                <Input
                  id="dir-ac"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-ifsc">IFSC Code</Label>
                <Input
                  id="dir-ifsc"
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-upi">UPI ID (Optional)</Label>
                <Input
                  id="dir-upi"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dir-esi">ESI Number</Label>
                <Input
                  id="dir-esi"
                  value={form.esiNumber}
                  onChange={(e) => setForm({ ...form, esiNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir-uan">PF / UAN Number</Label>
                <Input
                  id="dir-uan"
                  value={form.pfUan}
                  onChange={(e) => setForm({ ...form, pfUan: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-background p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                <Checkbox
                  checked={form.idInCustody}
                  onCheckedChange={(checked) => setForm({ ...form, idInCustody: checked === true })}
                />
                <span>Original Voter ID / Identity Doc in office custody</span>
              </label>
              {form.idInCustody && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={form.custodyDocType}
                    onChange={(e) => setForm({ ...form, custodyDocType: e.target.value })}
                    placeholder="Document Type"
                  />
                  <Input
                    value={form.custodyRefNo}
                    onChange={(e) => setForm({ ...form, custodyRefNo: e.target.value })}
                    placeholder="Reference Number"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dir-remarks">Remarks</Label>
              <Textarea
                id="dir-remarks"
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Update Employee" : "Create Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EmployeeProfileDrawer
        employee={viewing}
        onClose={() => setViewing(null)}
        onEdit={(emp) => {
          setViewing(null);
          openEditDialog(emp);
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Employee: {deleteTarget?.fullName}</AlertDialogTitle>
            <AlertDialogDescription>
              Mark the employee as LEFT to retain full payroll, uniform EMI, and statutory history, or permanently remove the directory record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="outline" onClick={() => void handleRemove("left")}>
              Mark as LEFT
            </Button>
            <AlertDialogAction onClick={() => void handleRemove("delete")}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
