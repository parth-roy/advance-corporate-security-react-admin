import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAcsStore } from "@/lib/acs-store";
import type {
  AllowanceMethod,
  BonusCapType,
  BonusMode,
  EpfVariant,
  EpfWageBase,
  EsiVariant,
  OtCalcMethod,
  PayrollRoundMode,
  PtSlabType,
  SalaryRuleProfileRecord,
  WageBasisType,
} from "@/lib/acs-types";

export function SiteRuleProfilesView() {
  const {
    data,
    fetchSalaryRuleProfiles,
    createSalaryRuleProfile,
    updateSalaryRuleProfile,
  } = useAcsStore();

  const fetchRef = useRef(fetchSalaryRuleProfiles);
  fetchRef.current = fetchSalaryRuleProfiles;

  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<SalaryRuleProfileRecord[]>(
    data.salaryRuleProfiles ?? [],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryRuleProfileRecord | null>(null);

  // Rule Editor State
  const [profileName, setProfileName] = useState("");
  const [profileCode, setProfileCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [wageBasis, setWageBasis] = useState<WageBasisType>("DAILY_RATE");
  const [otMethod, setOtMethod] = useState<OtCalcMethod>("DAILY_RATE_OT");
  const [otFixedRate, setOtFixedRate] = useState("0");
  const [allowanceMethod, setAllowanceMethod] = useState<AllowanceMethod>("NONE");
  const [bonusMode, setBonusMode] = useState<BonusMode>("NONE");
  const [bonusCapType, setBonusCapType] = useState<BonusCapType>("NONE");
  const [epfVariant, setEpfVariant] = useState<EpfVariant>("CAP_15000");
  const [epfWageBase, setEpfWageBase] = useState<EpfWageBase>("PRESENT_PLUS_EXTRA");
  const [esiVariant, setEsiVariant] = useState<EsiVariant>("CAP_21000");
  const [ptSlabType, setPtSlabType] = useState<PtSlabType>("WB_STANDARD");
  const [deductPtFromEmployee, setDeductPtFromEmployee] = useState(true);
  const [gemChargeMonthly, setGemChargeMonthly] = useState("0");
  const [adminChargeMonthly, setAdminChargeMonthly] = useState("0");
  const [roundMode, setRoundMode] = useState<PayrollRoundMode>("ROUND");
  const [notes, setNotes] = useState("");

  const reload = useCallback(async () => {
    const list = await fetchRef.current({ search });
    setProfiles(list);
  }, [search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const availableSites = useMemo(
    () =>
      data.sites
        .filter((s) => s.isActive !== false)
        .map((s) => s.siteName)
        .sort((a, b) => a.localeCompare(b)),
    [data.sites],
  );

  const openEditor = (rule: SalaryRuleProfileRecord | null) => {
    setEditing(rule);
    if (rule) {
      setProfileName(rule.profileName);
      setProfileCode(rule.profileCode);
      setSiteName(rule.siteName ?? "");
      setWageBasis(rule.wageBasis);
      setOtMethod(rule.otMethod);
      setOtFixedRate(String(rule.otFixedRate ?? 0));
      setAllowanceMethod(rule.allowanceMethod);
      setBonusMode(rule.bonusMode);
      setBonusCapType(rule.bonusCapType);
      setEpfVariant(rule.epfVariant);
      setEpfWageBase(rule.epfWageBase ?? "PRESENT_PLUS_EXTRA");
      setEsiVariant(rule.esiVariant);
      setPtSlabType(rule.ptSlabType);
      setDeductPtFromEmployee(rule.deductPtFromEmployee);
      setGemChargeMonthly(String(rule.gemChargeMonthly ?? 0));
      setAdminChargeMonthly(String(rule.adminChargeMonthly ?? 0));
      setRoundMode(rule.roundMode ?? "ROUND");
      setNotes(rule.notes ?? "");
    } else {
      setProfileName("");
      setProfileCode("");
      setSiteName("");
      setWageBasis("DAILY_RATE");
      setOtMethod("DAILY_RATE_OT");
      setOtFixedRate("0");
      setAllowanceMethod("NONE");
      setBonusMode("NONE");
      setBonusCapType("NONE");
      setEpfVariant("CAP_15000");
      setEpfWageBase("PRESENT_PLUS_EXTRA");
      setEsiVariant("CAP_21000");
      setPtSlabType("WB_STANDARD");
      setDeductPtFromEmployee(true);
      setGemChargeMonthly("0");
      setAdminChargeMonthly("0");
      setRoundMode("ROUND");
      setNotes("");
    }
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Rule Profile Name is required.");
      return;
    }

    const payload: Partial<SalaryRuleProfileRecord> = {
      profileName: profileName.trim(),
      ...(profileCode.trim() ? { profileCode: profileCode.trim().toUpperCase() } : {}),
      ...(siteName.trim() ? { siteName: siteName.trim() } : { siteName: "" }),
      wageBasis,
      otMethod,
      otFixedRate: Math.max(0, Number(otFixedRate) || 0),
      allowanceMethod,
      bonusMode,
      bonusCapType,
      epfVariant,
      epfWageBase,
      esiVariant,
      ptSlabType,
      deductPtFromEmployee,
      gemChargeMonthly: Math.max(0, Number(gemChargeMonthly) || 0),
      adminChargeMonthly: Math.max(0, Number(adminChargeMonthly) || 0),
      roundMode,
      notes: notes.trim(),
    };

    const saved = editing
      ? await updateSalaryRuleProfile(editing.id, payload)
      : await createSalaryRuleProfile(payload);

    if (saved) {
      toast.success(editing ? `Updated rule ${saved.profileName}.` : `Created rule ${saved.profileName}.`);
      setDialogOpen(false);
      void reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search site salary rules"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RIFLE, CMOH, FSSAI, SOHAM, BHEL..."
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={() => openEditor(null)}>
          <Plus className="size-4" />
          New Site Rule Profile
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="acs-table-header hover:bg-transparent">
              <TableHead>Rule Profile</TableHead>
              <TableHead>Bound Site / Scope</TableHead>
              <TableHead>Wages &amp; OT</TableHead>
              <TableHead>Bonus &amp; Allowances</TableHead>
              <TableHead>EPF &amp; ESI Rules</TableHead>
              <TableHead>PT &amp; Site Charges</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No salary rule profiles loaded yet. Click &ldquo;New Site Rule Profile&rdquo; or connect to backend to view all 27+ pre-configured Excel unit templates.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{rule.profileName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-muted-foreground">{rule.profileCode}</span>
                      {rule.isTemplate && (
                        <Badge variant="neutral" className="text-[10px]">
                          Template
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rule.siteName || (rule.siteMatchKeywords ?? []).slice(0, 3).join(", ") || "Template"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium text-foreground">{rule.wageBasis}</div>
                    <div className="text-muted-foreground">
                      OT: {rule.otMethod}
                      {rule.otFixedRate > 0 ? ` (₹${rule.otFixedRate})` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>
                      Bonus: {rule.bonusMode}
                      {rule.bonusCapType !== "NONE" ? ` (${rule.bonusCapType})` : ""}
                    </div>
                    {rule.allowanceMethod !== "NONE" && (
                      <div className="text-muted-foreground">{rule.allowanceMethod}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>EPF: {rule.epfVariant}</div>
                    <div className="text-muted-foreground">ESI: {rule.esiVariant}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={rule.deductPtFromEmployee ? "info" : "warning"} className="text-[10px]">
                      PT: {rule.deductPtFromEmployee ? rule.ptSlabType : "Not Deducted"}
                    </Badge>
                    {(rule.gemChargeMonthly > 0 || rule.adminChargeMonthly > 0) && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {rule.gemChargeMonthly > 0 ? `GeM ₹${rule.gemChargeMonthly}` : ""}
                        {rule.adminChargeMonthly > 0 ? ` Admin ₹${rule.adminChargeMonthly}` : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEditor(rule)}>
                      <Pencil className="size-3.5" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              <span>{editing ? `Configure Rule — ${editing.profileName}` : "Create Site Salary Rule Profile"}</span>
            </DialogTitle>
            <DialogDescription>
              Declaratively configure wage divisor, overtime, 8.33% bonus, EPF/ESI statutory caps, WB PT deductibility, and site charges.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="rule-name">Rule Profile Name *</Label>
                <Input
                  id="rule-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Rifle Factory Ishapore"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-code">Profile Code</Label>
                <Input
                  id="rule-code"
                  value={profileCode}
                  onChange={(e) => setProfileCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RIFLE_CUSTOM"
                  disabled={Boolean(editing)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-site">Bind to Site (Optional)</Label>
                <Input
                  id="rule-site"
                  list="rule-site-options"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Exact site name"
                />
                <datalist id="rule-site-options">
                  {availableSites.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="rule-wage">Wage Basis</Label>
                <Select value={wageBasis} onValueChange={(v) => setWageBasis(v as WageBasisType)}>
                  <SelectTrigger id="rule-wage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY_RATE">DAILY_RATE (Rate × Days)</SelectItem>
                    <SelectItem value="MONTHLY_DIV_26">MONTHLY_DIV_26 (Monthly / 26 × Days)</SelectItem>
                    <SelectItem value="MONTHLY_DIV_30">MONTHLY_DIV_30 (Monthly / 30 × Days)</SelectItem>
                    <SelectItem value="MONTHLY_DIV_CALENDAR">MONTHLY_DIV_CALENDAR (Monthly / DaysInMonth × Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-ot">Overtime / Extra Duty</Label>
                <Select value={otMethod} onValueChange={(v) => setOtMethod(v as OtCalcMethod)}>
                  <SelectTrigger id="rule-ot"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">NONE</SelectItem>
                    <SelectItem value="FLAT_OT_RATE">FLAT_OT_RATE</SelectItem>
                    <SelectItem value="DAILY_RATE_OT">DAILY_RATE_OT</SelectItem>
                    <SelectItem value="HOURLY_DOUBLE_OT">HOURLY_DOUBLE_OT (ICAR)</SelectItem>
                    <SelectItem value="HOURLY_SINGLE_MERGE">HOURLY_SINGLE_MERGE (TRSL)</SelectItem>
                    <SelectItem value="SHIFT_RATIO_OT">SHIFT_RATIO_OT (3/8 or 3/11)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-ot-rate">Flat OT Rate (₹/duty)</Label>
                <Input
                  id="rule-ot-rate"
                  type="number"
                  step="0.01"
                  value={otFixedRate}
                  onChange={(e) => setOtFixedRate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="rule-allow">Allowance / Factory Split</Label>
                <Select value={allowanceMethod} onValueChange={(v) => setAllowanceMethod(v as AllowanceMethod)}>
                  <SelectTrigger id="rule-allow"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">NONE</SelectItem>
                    <SelectItem value="FIXED_ALLOWANCE">FIXED_ALLOWANCE</SelectItem>
                    <SelectItem value="BHEL_ENHANCED">BHEL_ENHANCED (3908/30*Days)</SelectItem>
                    <SelectItem value="GRSE_5PCT_CANTEEN">GRSE_5PCT_CANTEEN (5% + Canteen)</SelectItem>
                    <SelectItem value="SOHAM_FACTORY_SPLIT">SOHAM_FACTORY_SPLIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-bonus">Bonus Mode (8.33%)</Label>
                <Select value={bonusMode} onValueChange={(v) => setBonusMode(v as BonusMode)}>
                  <SelectTrigger id="rule-bonus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">NONE</SelectItem>
                    <SelectItem value="IN_GROSS">IN_GROSS (Included in Gross)</SelectItem>
                    <SelectItem value="OUTSIDE_GROSS">OUTSIDE_GROSS (Separate Column K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-bcap">Bonus Wage / Day Cap</Label>
                <Select value={bonusCapType} onValueChange={(v) => setBonusCapType(v as BonusCapType)}>
                  <SelectTrigger id="rule-bcap"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">NONE</SelectItem>
                    <SelectItem value="WAGE_21000">WAGE_21000 (MIN(21000, Wage))</SelectItem>
                    <SelectItem value="DAYS_26">DAYS_26 (MIN(26d, Total))</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="rule-epf">EPF (12%) Variant</Label>
                <Select value={epfVariant} onValueChange={(v) => setEpfVariant(v as EpfVariant)}>
                  <SelectTrigger id="rule-epf"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNCAPPED_12">UNCAPPED_12</SelectItem>
                    <SelectItem value="CAP_15000">CAP_15000 (Max ₹1,800)</SelectItem>
                    <SelectItem value="CAP_25000">CAP_25000 (Max ₹3,000)</SelectItem>
                    <SelectItem value="CAP_DAYS_26">CAP_DAYS_26 (TRSL)</SelectItem>
                    <SelectItem value="CAP_FULL_MONTH">CAP_FULL_MONTH (PHE)</SelectItem>
                    <SelectItem value="FIXED_DAILY_399_26">FIXED_DAILY_399_26 (Culture)</SelectItem>
                    <SelectItem value="EMPLOYER_RATIO_DAYS">EMPLOYER_RATIO_DAYS (Begdubi 75/13*12)</SelectItem>
                    <SelectItem value="FIXED_6000_DIV_30">FIXED_6000_DIV_30 (Ramkrishna)</SelectItem>
                    <SelectItem value="SOHAM_BASIC_12">SOHAM_BASIC_12 (ROUND(Basic*12%))</SelectItem>
                    <SelectItem value="EXEMPT">EXEMPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-epf-base">EPF / ESI Base</Label>
                <Select value={epfWageBase} onValueChange={(v) => setEpfWageBase(v as EpfWageBase)}>
                  <SelectTrigger id="rule-epf-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT_WAGES">PRESENT_WAGES</SelectItem>
                    <SelectItem value="PRESENT_PLUS_EXTRA">PRESENT_PLUS_EXTRA</SelectItem>
                    <SelectItem value="GROSS">GROSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-esi">ESI (0.75%) Variant</Label>
                <Select value={esiVariant} onValueChange={(v) => setEsiVariant(v as EsiVariant)}>
                  <SelectTrigger id="rule-esi"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNCAPPED_075">UNCAPPED_075</SelectItem>
                    <SelectItem value="CAP_21000">CAP_21000</SelectItem>
                    <SelectItem value="CAP_DAYS_30">CAP_DAYS_30 (TRSL)</SelectItem>
                    <SelectItem value="CAP_FULL_MONTH">CAP_FULL_MONTH (PHE)</SelectItem>
                    <SelectItem value="FIXED_DAILY_399_26">FIXED_DAILY_399_26 (Culture)</SelectItem>
                    <SelectItem value="FIXED_6000_DIV_30">FIXED_6000_DIV_30 (Ramkrishna)</SelectItem>
                    <SelectItem value="SOHAM_EXCL_FUEL_WASHING">SOHAM_EXCL_FUEL_WASHING</SelectItem>
                    <SelectItem value="EXEMPT">EXEMPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="rule-pt">WB PT Slab</Label>
                <Select value={ptSlabType} onValueChange={(v) => setPtSlabType(v as PtSlabType)}>
                  <SelectTrigger id="rule-pt"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WB_STANDARD">WB_STANDARD</SelectItem>
                    <SelectItem value="WB_SITE_VARIANT">WB_SITE_VARIANT</SelectItem>
                    <SelectItem value="EXEMPT">EXEMPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-gem">GeM Charge (₹/mo)</Label>
                <Input id="rule-gem" type="number" value={gemChargeMonthly} onChange={(e) => setGemChargeMonthly(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-adm">Admin Charge (₹/mo)</Label>
                <Input id="rule-adm" type="number" value={adminChargeMonthly} onChange={(e) => setAdminChargeMonthly(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-rnd">Rounding</Label>
                <Select value={roundMode} onValueChange={(v) => setRoundMode(v as PayrollRoundMode)}>
                  <SelectTrigger id="rule-rnd"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUND">ROUND (Nearest ₹)</SelectItem>
                    <SelectItem value="ROUNDUP">ROUNDUP (Ceil ₹)</SelectItem>
                    <SelectItem value="EXACT_PAISE">EXACT_PAISE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs font-medium text-foreground">
              <Checkbox
                checked={deductPtFromEmployee}
                onCheckedChange={(c) => setDeductPtFromEmployee(c === true)}
              />
              <span>
                Deduct WB Professional Tax from employee Net Pay (uncheck for CMOH units: BALARAM / B N BOSE / PANIHATI / BARASAT CLOSED / NTS)
              </span>
            </label>

            <div className="space-y-1">
              <Label htmlFor="rule-notes">Formula Notes</Label>
              <Input id="rule-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Salary Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
