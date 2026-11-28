import { type ChangeEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HandCoins,
  Shirt,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/acs/StatCard";
import {
  downloadOnboardingCsvTemplate,
  ONBOARDING_CSV_TEMPLATES,
  type OnboardingDatasetKind,
  parseEmployeesCsv,
  parseOpeningAdvancesCsv,
  parseOpeningUniformPlansCsv,
  parseSitesCsv,
} from "@/lib/onboarding-csv";
import { useAcsStore } from "@/lib/acs-store";
import type { OnboardingImportSummary } from "@/lib/acs-types";
import { formatINR } from "@/lib/acs-utils";

const DATASET_META: Array<{
  key: OnboardingDatasetKind;
  label: string;
  hint: string;
  icon: typeof Users;
}> = [
  {
    key: "employees",
    label: "Employees Roster (400–1,000+)",
    hint: "Generates ACS/<DEPT>/<YEAR>/<SEQ> codes automatically while keeping legacy numeric IDs.",
    icon: Users,
  },
  {
    key: "sites",
    label: "Client Sites & Units",
    hint: "Onboards GSTIN, State Code (CGST+SGST vs IGST), RCM flags, SAC code & sub-units.",
    icon: Building2,
  },
  {
    key: "openingAdvances",
    label: "Opening Advance Balances",
    hint: "Carries forward open or partial salary advances linked by Emp Code / Legacy Code / Name.",
    icon: HandCoins,
  },
  {
    key: "openingUniformPlans",
    label: "Unpaid Dress / Uniform EMIs",
    hint: "Imports installment dress deductions (e.g. 2,500/4 EMIs or scheduled next-month dues).",
    icon: Shirt,
  },
];

export function OnboardingImportView() {
  const { data, importOnboardingData } = useAcsStore();
  const [activeDataset, setActiveDataset] = useState<OnboardingDatasetKind>("employees");
  const [defaultMonthKey, setDefaultMonthKey] = useState("2026-11");
  const [rawByKind, setRawByKind] = useState<Record<OnboardingDatasetKind, string>>({
    sites: "",
    employees: "",
    openingAdvances: "",
    openingUniformPlans: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastSummary, setLastSummary] = useState<OnboardingImportSummary | null>(null);

  const parsed = useMemo(
    () => ({
      sites: parseSitesCsv(rawByKind.sites),
      employees: parseEmployeesCsv(rawByKind.employees),
      openingAdvances: parseOpeningAdvancesCsv(rawByKind.openingAdvances),
      openingUniformPlans: parseOpeningUniformPlansCsv(rawByKind.openingUniformPlans),
    }),
    [rawByKind],
  );

  const totalParsedRows =
    parsed.sites.rows.length +
    parsed.employees.rows.length +
    parsed.openingAdvances.rows.length +
    parsed.openingUniformPlans.rows.length;

  const activeRows = parsed[activeDataset].rows;
  const previewRows = activeRows.slice(0, 10);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setRawByKind((prev) => ({ ...prev, [activeDataset]: text }));
      setLastSummary(null);
      toast.success(`Loaded ${file.name} into ${ONBOARDING_CSV_TEMPLATES[activeDataset].label}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSample = () => {
    const sample = ONBOARDING_CSV_TEMPLATES[activeDataset].content;
    setRawByKind((prev) => ({ ...prev, [activeDataset]: sample }));
    setLastSummary(null);
  };

  const runBatch = async (dryRun: boolean) => {
    if (totalParsedRows === 0) {
      toast.error("Paste Excel/CSV rows or upload a CSV file before importing.");
      return;
    }
    setSubmitting(true);
    try {
      const summary = await importOnboardingData({
        dryRun,
        defaultMonthKey,
        sites: parsed.sites.rows,
        employees: parsed.employees.rows,
        openingAdvances: parsed.openingAdvances.rows,
        openingUniformPlans: parsed.openingUniformPlans.rows,
      });
      if (!summary) return;
      setLastSummary(summary);
      if (dryRun) {
        toast.info(
          `Dry-run ready: +${summary.applied.employeesCreated} new / ~${summary.applied.employeesUpdated} updated staff (${summary.errors.length} issue(s)).`,
        );
      } else {
        toast.success(
          `Imported ${summary.applied.sitesCreated + summary.applied.sitesUpdated} site(s), ${summary.applied.employeesCreated + summary.applied.employeesUpdated} employee(s), ${summary.applied.advancesCreated} advance(s), ${summary.applied.uniformPlansCreated} uniform EMI(s).`,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live Sites"
          value={data.sites.length}
          hint="Master client units in store"
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Live Employees"
          value={data.employees.length}
          hint="Active + historical personnel"
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Staged in Importer"
          value={totalParsedRows}
          hint="Parsed across all 4 CSV/Excel tabs"
          icon={FileSpreadsheet}
          tone="warning"
        />
        <StatCard
          label="Validation Issues"
          value={lastSummary?.errors.length ?? 0}
          hint={lastSummary ? (lastSummary.dryRun ? "From latest dry-run" : "Skipped invalid rows") : "Run dry-run to check"}
          icon={AlertTriangle}
          tone={lastSummary && lastSummary.errors.length > 0 ? "danger" : "success"}
        />
      </section>

      <section className="acs-card space-y-5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Legacy Excel &amp; CSV Onboarding Importer</h2>
            <p className="text-sm text-muted-foreground">
              Paste copied Excel cells (Ctrl+V / Cmd+V) or upload CSV files to onboard 400–1,000+ personnel, client sites, open advances, and unpaid dress EMIs idempotently.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="import-default-month" className="text-xs text-muted-foreground whitespace-nowrap">
              Opening Month
            </Label>
            <Input
              id="import-default-month"
              type="month"
              value={defaultMonthKey}
              onChange={(e) => setDefaultMonthKey(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {DATASET_META.map((item) => {
            const Icon = item.icon;
            const count = parsed[item.key].rows.length;
            const active = activeDataset === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveDataset(item.key)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="size-4 text-primary" />
                    {item.label}
                  </span>
                  <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadOnboardingCsvTemplate(activeDataset)}
            >
              <Download className="size-3.5" />
              Download Sample CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleLoadSample}>
              <FileSpreadsheet className="size-3.5" />
              Load Sample Rows
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
              <Upload className="size-3.5" />
              Upload CSV / TSV File
              <input
                aria-label="Upload CSV or TSV file"
                type="file"
                accept=".csv,.tsv,.txt"
                className="sr-only"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          {rawByKind[activeDataset] ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRawByKind((prev) => ({ ...prev, [activeDataset]: "" }));
                setLastSummary(null);
              }}
            >
              Clear Current Tab
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-csv-textarea">
            Paste Excel Cells (Tab-separated) or CSV Data for{" "}
            <span className="font-semibold">{ONBOARDING_CSV_TEMPLATES[activeDataset].label}</span>
          </Label>
          <Textarea
            id="onboarding-csv-textarea"
            rows={7}
            className="font-mono text-xs"
            value={rawByKind[activeDataset]}
            onChange={(e) => {
              const value = e.target.value;
              setRawByKind((prev) => ({ ...prev, [activeDataset]: value }));
              setLastSummary(null);
            }}
            placeholder={ONBOARDING_CSV_TEMPLATES[activeDataset].content}
          />
          <p className="text-xs text-muted-foreground">
            Parsed <strong>{activeRows.length}</strong> data row(s)
            {parsed[activeDataset].headers.length > 0
              ? ` · Detected columns: ${parsed[activeDataset].headers.join(", ")}`
              : " · Comma (CSV) and Tab (Excel copy-paste) delimiters detected automatically."}
          </p>
        </div>

        {previewRows.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Showing {previewRows.length} of {activeRows.length} parsed row(s)
              </p>
              <Badge variant="outline">{activeDataset}</Badge>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {activeDataset === "sites" ? (
                      <>
                        <TableHead>Site Code</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Client GSTIN</TableHead>
                        <TableHead>GST Mode</TableHead>
                        <TableHead>Sub-Units</TableHead>
                      </>
                    ) : null}
                    {activeDataset === "employees" ? (
                      <>
                        <TableHead>Emp Code</TableHead>
                        <TableHead>Legacy Code</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Basis / Rate</TableHead>
                      </>
                    ) : null}
                    {activeDataset === "openingAdvances" ? (
                      <>
                        <TableHead>Emp / Legacy ID</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Site / Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Mode</TableHead>
                      </>
                    ) : null}
                    {activeDataset === "openingUniformPlans" ? (
                      <>
                        <TableHead>Emp / Legacy ID</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Total Charge</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>EMIs</TableHead>
                      </>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDataset === "sites"
                    ? parsed.sites.rows.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{row.siteCode || "Auto"}</TableCell>
                          <TableCell className="font-medium">{row.siteName || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{row.clientGstin || "—"}</TableCell>
                          <TableCell className="text-xs">{row.gstMode || "Auto"}</TableCell>
                          <TableCell className="text-xs">{String(row.subUnits || "—")}</TableCell>
                        </TableRow>
                      ))
                    : activeDataset === "employees"
                      ? parsed.employees.rows.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{row.empCode || "Auto"}</TableCell>
                            <TableCell className="font-mono text-xs">{row.legacyEmpCode || "—"}</TableCell>
                            <TableCell className="font-medium">{row.fullName || "—"}</TableCell>
                            <TableCell className="text-xs">{row.siteName || "—"}</TableCell>
                            <TableCell className="text-xs">{row.designation || "Security Guard"}</TableCell>
                            <TableCell className="text-xs">
                              {(row.rateType || "MONTHLY").toUpperCase()} · {formatINR(Number(row.baseRate) || 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      : activeDataset === "openingAdvances"
                        ? parsed.openingAdvances.rows.slice(0, 10).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {row.employeeId || row.legacyEmpCode || "Auto"}
                              </TableCell>
                              <TableCell className="font-medium">{row.employeeName || "—"}</TableCell>
                              <TableCell className="text-xs">{row.onAccountOf || row.siteName || "—"}</TableCell>
                              <TableCell className="text-xs">{formatINR(Number(row.amount) || 0)}</TableCell>
                              <TableCell className="text-xs">
                                {formatINR(
                                  row.remainingBalance !== undefined
                                    ? Number(row.remainingBalance) || 0
                                    : Math.max(
                                        0,
                                        (Number(row.amount) || 0) - (Number(row.recoveredAmount) || 0),
                                      ),
                                )}
                              </TableCell>
                              <TableCell className="text-xs">{row.recoveryMode || "NEXT_MONTH"}</TableCell>
                            </TableRow>
                          ))
                        : parsed.openingUniformPlans.rows.slice(0, 10).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {row.employeeId || row.legacyEmpCode || "Auto"}
                              </TableCell>
                              <TableCell className="font-medium">{row.employeeName || "—"}</TableCell>
                              <TableCell className="text-xs">{row.siteName || "—"}</TableCell>
                              <TableCell className="text-xs">{formatINR(Number(row.totalCharge) || 0)}</TableCell>
                              <TableCell className="text-xs">
                                {formatINR(
                                  row.remainingBalance !== undefined
                                    ? Number(row.remainingBalance) || 0
                                    : Math.max(
                                        0,
                                        (Number(row.totalCharge) || 0) - (Number(row.recoveredAmount) || 0),
                                      ),
                                )}
                              </TableCell>
                              <TableCell className="text-xs">{row.installmentCount || "1"}</TableCell>
                            </TableRow>
                          ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={submitting || totalParsedRows === 0}
            onClick={() => void runBatch(true)}
          >
            <CheckCircle2 className="size-4" />
            Validate &amp; Dry-Run Preview
          </Button>
          <Button
            type="button"
            disabled={submitting || totalParsedRows === 0}
            onClick={() => void runBatch(false)}
          >
            <Upload className="size-4" />
            {submitting ? "Importing Batch..." : `Commit Import (${totalParsedRows} rows)`}
          </Button>
        </div>
      </section>

      {lastSummary ? (
        <section className="acs-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                {lastSummary.dryRun ? "Dry-Run Validation Report" : "Committed Onboarding Summary"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Opening Month: {lastSummary.defaultMonthKey}
              </p>
            </div>
            <Badge variant={lastSummary.dryRun ? "secondary" : "default"}>
              {lastSummary.dryRun ? "Dry Run Only (No Writes)" : "Committed"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3 text-xs">
              <p className="font-medium">Sites</p>
              <p className="mt-1 text-muted-foreground">
                +{lastSummary.applied.sitesCreated} created · {lastSummary.applied.sitesUpdated} updated
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 text-xs">
              <p className="font-medium">Employees</p>
              <p className="mt-1 text-muted-foreground">
                +{lastSummary.applied.employeesCreated} created · {lastSummary.applied.employeesUpdated} updated
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 text-xs">
              <p className="font-medium">Opening Advances</p>
              <p className="mt-1 text-muted-foreground">
                +{lastSummary.applied.advancesCreated} created · {lastSummary.applied.advancesSkippedDuplicate} skipped
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 text-xs">
              <p className="font-medium">Uniform EMIs</p>
              <p className="mt-1 text-muted-foreground">
                +{lastSummary.applied.uniformPlansCreated} created · {lastSummary.applied.uniformPlansSkippedDuplicate} skipped
              </p>
            </div>
          </div>

          {lastSummary.errors.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive">
                Skipped / Invalid Rows ({lastSummary.errors.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Row</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastSummary.errors.slice(0, 20).map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{err.section}</TableCell>
                        <TableCell className="text-xs">{err.rowIndex + 1}</TableCell>
                        <TableCell className="font-medium text-xs">{err.identifier}</TableCell>
                        <TableCell className="text-xs text-destructive">{err.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
