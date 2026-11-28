import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
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
import { type PaginatedSitesResult, useAcsStore } from "@/lib/acs-store";
import type { SiteGstMode, SiteRecord } from "@/lib/acs-types";

const GST_MODE_LABELS: Record<SiteGstMode, string> = {
  INTRA_CGST_SGST: "CGST + SGST (18%)",
  INTER_IGST: "IGST Inter-State (18%)",
  RCM: "RCM (0% on Invoice)",
  NON_GST: "Exempt / Non-GST",
};

interface SiteFormState {
  siteCode: string;
  siteName: string;
  shortName: string;
  clientName: string;
  clientGstin: string;
  stateCode: string;
  gstMode: SiteGstMode;
  sacCode: string;
  serviceChargePct: string;
  vendorCode: string;
  contractRef: string;
  subUnitsText: string;
  billToAddress: string;
  shipToAddress: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: SiteFormState = {
  siteCode: "",
  siteName: "",
  shortName: "",
  clientName: "",
  clientGstin: "",
  stateCode: "19",
  gstMode: "INTRA_CGST_SGST",
  sacCode: "998533",
  serviceChargePct: "0",
  vendorCode: "",
  contractRef: "",
  subUnitsText: "",
  billToAddress: "",
  shipToAddress: "",
  notes: "",
  isActive: true,
};

function siteToForm(site: SiteRecord): SiteFormState {
  return {
    siteCode: site.siteCode ?? "",
    siteName: site.siteName ?? "",
    shortName: site.shortName ?? "",
    clientName: site.clientName ?? "",
    clientGstin: site.clientGstin ?? "",
    stateCode: site.stateCode ?? "19",
    gstMode: site.gstMode ?? "INTRA_CGST_SGST",
    sacCode: site.sacCode ?? "998533",
    serviceChargePct: String(site.serviceChargePct ?? 0),
    vendorCode: site.vendorCode ?? "",
    contractRef: site.contractRef ?? "",
    subUnitsText: (site.subUnits ?? []).join(", "),
    billToAddress: site.billToAddress ?? "",
    shipToAddress: site.shipToAddress ?? "",
    notes: site.notes ?? "",
    isActive: site.isActive !== false,
  };
}

export function SiteMasterView() {
  const {
    data,
    fetchSitesPaginated,
    createSite,
    updateSite,
    deleteSite,
    runCoreMigration,
  } = useAcsStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "true" | "false">("All");
  const [gstFilter, setGstFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<PaginatedSitesResult>({
    items: data.sites,
    pagination: {
      page: 1,
      limit: 15,
      total: data.sites.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    summary: {
      totalSites: data.sites.length,
      activeSites: data.sites.filter((s) => s.isActive).length,
      inactiveSites: data.sites.filter((s) => !s.isActive).length,
      totalAssignedEmployees: data.employees.filter((e) => e.status !== "LEFT").length,
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteRecord | null>(null);
  const [form, setForm] = useState<SiteFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SiteRecord | null>(null);

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchSitesPaginated({
        page,
        limit: 15,
        search,
        isActive: statusFilter,
        gstMode: gstFilter,
      });
      setResult(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load client sites.");
    } finally {
      setLoading(false);
    }
  }, [fetchSitesPaginated, page, search, statusFilter, gstFilter]);

  useEffect(() => {
    void loadSites();
  }, [loadSites, data.sites.length, data.employees.length]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (site: SiteRecord) => {
    setEditing(site);
    setForm(siteToForm(site));
    setDialogOpen(true);
  };

  const handleGstinChange = (rawValue: string) => {
    const clean = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    const detectedState = /^\d{2}/.test(clean) ? clean.slice(0, 2) : form.stateCode;
    const nextGstMode: SiteGstMode =
      form.gstMode === "RCM" || form.gstMode === "NON_GST"
        ? form.gstMode
        : detectedState && detectedState !== "19"
          ? "INTER_IGST"
          : "INTRA_CGST_SGST";
    setForm((prev) => ({
      ...prev,
      clientGstin: clean,
      stateCode: detectedState || "19",
      gstMode: nextGstMode,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.siteName.trim()) {
      toast.error("Site Name is required.");
      return;
    }

    const sc = Number(form.serviceChargePct || 0);
    if (!Number.isFinite(sc) || sc < 0 || sc > 100) {
      toast.error("Service Charge % must be between 0 and 100.");
      return;
    }

    const subUnits = form.subUnitsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      siteCode: form.siteCode.trim().toUpperCase(),
      siteName: form.siteName.trim(),
      shortName: form.shortName.trim(),
      clientName: (form.clientName || form.siteName).trim(),
      clientGstin: form.clientGstin.trim().toUpperCase(),
      stateCode: form.stateCode.trim() || "19",
      gstMode: form.gstMode,
      sacCode: form.sacCode.trim() || "998533",
      serviceChargePct: sc,
      vendorCode: form.vendorCode.trim(),
      contractRef: form.contractRef.trim(),
      subUnits,
      billToAddress: form.billToAddress.trim(),
      shipToAddress: form.shipToAddress.trim(),
      notes: form.notes.trim(),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateSite({ ...payload, id: editing.id });
        toast.success(`Updated site "${payload.siteName}".`);
      } else {
        await createSite(payload);
        toast.success(`Created site "${payload.siteName}".`);
      }
      setDialogOpen(false);
      await loadSites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save site.");
    } finally {
      setSaving(false);
    }
  };

  const handleMigration = async () => {
    setMigrating(true);
    try {
      const summary = await runCoreMigration();
      if (summary) {
        toast.success(
          `Synced ${summary.sitesCreated} new site(s) and ${summary.employeesCreated} deployed employee(s).`,
        );
      }
      await loadSites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run site & employee migration.");
    } finally {
      setMigrating(false);
    }
  };

  const handleDeleteOrArchive = async (archive: boolean) => {
    if (!deleteTarget) return;
    try {
      await deleteSite(deleteTarget.id, archive);
      toast.success(
        archive
          ? `Archived site "${deleteTarget.siteName}".`
          : `Deleted site "${deleteTarget.siteName}".`,
      );
      setDeleteTarget(null);
      await loadSites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update site.");
    }
  };

  const specialTaxCount = result.items.filter(
    (s) => s.gstMode === "RCM" || s.gstMode === "INTER_IGST",
  ).length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Client Sites"
          value={result.summary.totalSites}
          hint="Independent site master entities"
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Active Sites"
          value={result.summary.activeSites}
          hint={`${result.summary.inactiveSites} archived`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Assigned Workforce"
          value={result.summary.totalAssignedEmployees}
          hint="Active deployed staff across sites"
          icon={Users}
          tone="info"
        />
        <StatCard
          label="RCM / IGST Sites"
          value={specialTaxCount}
          hint="Visible on current page"
          icon={Landmark}
          tone="warning"
        />
      </section>

      <section className="acs-card space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search client sites"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search site name, code, GSTIN, client..."
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "All" | "true" | "false");
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter sites by active status" className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Archived Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={gstFilter}
              onValueChange={(v) => {
                setGstFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter sites by GST regime" className="w-48">
                <SelectValue placeholder="GST Regime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All GST Regimes</SelectItem>
                <SelectItem value="INTRA_CGST_SGST">CGST + SGST (18%)</SelectItem>
                <SelectItem value="INTER_IGST">IGST Inter-State (18%)</SelectItem>
                <SelectItem value="RCM">Reverse Charge (RCM)</SelectItem>
                <SelectItem value="NON_GST">Exempt / Non-GST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={migrating}
              onClick={() => void handleMigration()}
            >
              <RefreshCw className={`size-3.5 ${migrating ? "animate-spin" : ""}`} />
              Sync Legacy Sites &amp; Staff
            </Button>
            <Button type="button" size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Add Client Site
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Site Code</TableHead>
                <TableHead>Site / Client Name</TableHead>
                <TableHead>Sub-Units</TableHead>
                <TableHead>GSTIN / State</TableHead>
                <TableHead>GST Mode &amp; SAC</TableHead>
                <TableHead>Workforce</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {loading
                      ? "Loading client sites..."
                      : "No client sites registered yet. Click Add Client Site or Sync Legacy Sites & Staff."}
                  </TableCell>
                </TableRow>
              ) : (
                result.items.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">
                      {site.siteCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{site.siteName}</div>
                      <div className="text-xs text-muted-foreground">
                        {site.clientName}
                        {site.contractRef ? ` · Ref: ${site.contractRef}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {site.subUnits && site.subUnits.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {site.subUnits.map((su) => (
                            <Badge key={su} variant="neutral" className="text-[10px]">
                              {su}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs text-foreground">
                        {site.clientGstin || "No GSTIN"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        State Code: {site.stateCode || "19"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          site.gstMode === "RCM"
                            ? "warning"
                            : site.gstMode === "INTER_IGST"
                              ? "info"
                              : site.gstMode === "NON_GST"
                                ? "neutral"
                                : "success"
                        }
                      >
                        {GST_MODE_LABELS[site.gstMode]}
                      </Badge>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        SAC {site.sacCode || "998533"}
                        {site.serviceChargePct ? ` · SC ${site.serviceChargePct}%` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums font-semibold text-foreground">
                      {site.employeeCount ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={site.isActive ? "success" : "neutral"}>
                        {site.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit site ${site.siteName}`}
                          onClick={() => openEditDialog(site)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete site ${site.siteName}`}
                          onClick={() => setDeleteTarget(site)}
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
            Showing page {result.pagination.page} of {result.pagination.totalPages} ({result.pagination.total} site
            {result.pagination.total === 1 ? "" : "s"})
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
              <MapPin className="size-4 text-primary" />
              {editing ? `Edit Site: ${editing.siteName}` : "Register Client Deployment Site"}
            </DialogTitle>
            <DialogDescription>
              Configure site billing identity, GST regime, SAC code, and operational sub-units.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="site-name">Site Name *</Label>
                <Input
                  id="site-name"
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  placeholder="e.g. MSME Tool & Training Center"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-code">Site Code (Auto if blank)</Label>
                <Input
                  id="site-code"
                  value={form.siteCode}
                  onChange={(e) =>
                    setForm({ ...form, siteCode: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })
                  }
                  placeholder="e.g. MSME-TOOL"
                  className="font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="site-client">Legal Client / Billing Entity Name</Label>
                <Input
                  id="site-client"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Defaults to Site Name if left blank"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-short">Short Unit Tag (Registers)</Label>
                <Input
                  id="site-short"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  placeholder="e.g. MSME / TSL"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="site-gstin">Client GSTIN</Label>
                <Input
                  id="site-gstin"
                  value={form.clientGstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="e.g. 19AAAT... or 10AAAT..."
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-state">State Code</Label>
                <Input
                  id="site-state"
                  value={form.stateCode}
                  onChange={(e) => setForm({ ...form, stateCode: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                  placeholder="19"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-sac">SAC Code</Label>
                <Input
                  id="site-sac"
                  value={form.sacCode}
                  onChange={(e) => setForm({ ...form, sacCode: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  placeholder="998533"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="site-gst-mode">GST Billing Mode</Label>
                <Select
                  value={form.gstMode}
                  onValueChange={(v) => setForm({ ...form, gstMode: v as SiteGstMode })}
                >
                  <SelectTrigger id="site-gst-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTRA_CGST_SGST">Intra-State Forward Charge (CGST 9% + SGST 9%)</SelectItem>
                    <SelectItem value="INTER_IGST">Inter-State Forward Charge (IGST 18%)</SelectItem>
                    <SelectItem value="RCM">Reverse Charge Mechanism (GST @ RCM 0%)</SelectItem>
                    <SelectItem value="NON_GST">Exempt / Non-GST (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-sc">Service Charge %</Label>
                <Input
                  id="site-sc"
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  value={form.serviceChargePct}
                  onChange={(e) => setForm({ ...form, serviceChargePct: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="site-vendor">Vendor Code</Label>
                <Input
                  id="site-vendor"
                  value={form.vendorCode}
                  onChange={(e) => setForm({ ...form, vendorCode: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="site-contract">Work Order / GeM Contract Ref</Label>
                <Input
                  id="site-contract"
                  value={form.contractRef}
                  onChange={(e) => setForm({ ...form, contractRef: e.target.value })}
                  placeholder="e.g. GEMC-5116..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-subunits">Sub-Units / Locations (comma-separated)</Label>
              <Input
                id="site-subunits"
                value={form.subUnitsText}
                onChange={(e) => setForm({ ...form, subUnitsText: e.target.value })}
                placeholder="e.g. Kolkata, BO Guwahati  or  MVCC, WIRE MILL, TROLL ROD"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="site-bill-addr">Bill-To Address</Label>
                <Textarea
                  id="site-bill-addr"
                  rows={2}
                  value={form.billToAddress}
                  onChange={(e) => setForm({ ...form, billToAddress: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-ship-addr">Ship-To / Deployment Address</Label>
                <Textarea
                  id="site-ship-addr"
                  rows={2}
                  value={form.shipToAddress}
                  onChange={(e) => setForm({ ...form, shipToAddress: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-notes">Billing / Compliance Notes</Label>
              <Input
                id="site-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Factory Act Bonus claimed separately; S.G rate GST-inclusive"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked === true })}
              />
              <span>Site is Active for Attendance, Payroll, and Billing</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Update Site" : "Create Site"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Site Removal: {deleteTarget?.siteName}</AlertDialogTitle>
            <AlertDialogDescription>
              Sites with deployed employees, attendance logs, or invoices cannot be hard-deleted to protect historical compliance records. You can archive the site instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="outline" onClick={() => void handleDeleteOrArchive(true)}>
              Archive Site
            </Button>
            <AlertDialogAction onClick={() => void handleDeleteOrArchive(false)}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
