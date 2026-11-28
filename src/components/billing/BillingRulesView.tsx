import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, ReceiptText, Search } from "lucide-react";
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
  BillingArchetype,
  BillingRoundMode,
  BillingRuleProfileRecord,
  PoolStatutoryMode,
  SiteGstMode,
} from "@/lib/acs-types";

export function BillingRulesView() {
  const {
    data,
    fetchBillingRuleProfiles,
    createBillingRuleProfile,
    updateBillingRuleProfile,
  } = useAcsStore();

  const fetchRef = useRef(fetchBillingRuleProfiles);
  fetchRef.current = fetchBillingRuleProfiles;

  const [search, setSearch] = useState("");
  const [rules, setRules] = useState<BillingRuleProfileRecord[]>(data.billingRuleProfiles ?? []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BillingRuleProfileRecord | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileCode, setProfileCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [subUnit, setSubUnit] = useState("");
  const [archetype, setArchetype] = useState<BillingArchetype>("ALL_INCLUSIVE_RATE");
  const [gstMode, setGstMode] = useState<SiteGstMode>("INTRA_CGST_SGST");
  const [sacCode, setSacCode] = useState("998533");
  const [epfEmployerPct, setEpfEmployerPct] = useState("12");
  const [pfFixedPerDay, setPfFixedPerDay] = useState("0");
  const [poolEpfMode, setPoolEpfMode] = useState<PoolStatutoryMode>("UNCAPPED");
  const [esiEmployerPct, setEsiEmployerPct] = useState("3.25");
  const [poolEsiMode, setPoolEsiMode] = useState<PoolStatutoryMode>("UNCAPPED");
  const [bonusPct, setBonusPct] = useState("0");
  const [serviceChargePct, setServiceChargePct] = useState("0");
  const [stripGstFromTenderRate, setStripGstFromTenderRate] = useState(false);
  const [govtDeductionPct, setGovtDeductionPct] = useState("0");
  const [cessPct, setCessPct] = useState("0");
  const [gstRoundMode, setGstRoundMode] = useState<BillingRoundMode>("ROUND");
  const [totalRoundMode, setTotalRoundMode] = useState<BillingRoundMode>("ROUND");
  const [includeFactoryActNote, setIncludeFactoryActNote] = useState(false);
  const [notes, setNotes] = useState("");

  const reload = useCallback(async () => {
    const list = await fetchRef.current({ search });
    setRules(list);
  }, [search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const siteNames = useMemo(
    () =>
      data.sites
        .filter((s) => s.isActive !== false)
        .map((s) => s.siteName)
        .sort((a, b) => a.localeCompare(b)),
    [data.sites],
  );

  const openEditor = (rule: BillingRuleProfileRecord | null) => {
    setEditing(rule);
    if (rule) {
      setProfileName(rule.profileName);
      setProfileCode(rule.profileCode);
      setSiteName(rule.siteName ?? "");
      setSubUnit(rule.subUnit ?? "");
      setArchetype(rule.archetype);
      setGstMode(rule.gstMode);
      setSacCode(rule.sacCode || "998533");
      setEpfEmployerPct(String(rule.epfEmployerPct ?? 12));
      setPfFixedPerDay(String(rule.pfFixedPerDay ?? 0));
      setPoolEpfMode(rule.poolEpfMode ?? "UNCAPPED");
      setEsiEmployerPct(String(rule.esiEmployerPct ?? 3.25));
      setPoolEsiMode(rule.poolEsiMode ?? "UNCAPPED");
      setBonusPct(String(rule.bonusPct ?? 0));
      setServiceChargePct(String(rule.serviceChargePct ?? 0));
      setStripGstFromTenderRate(Boolean(rule.stripGstFromTenderRate));
      setGovtDeductionPct(String(rule.govtDeductionPct ?? 0));
      setCessPct(String(rule.cessPct ?? 0));
      setGstRoundMode(rule.gstRoundMode ?? "ROUND");
      setTotalRoundMode(rule.totalRoundMode ?? "ROUND");
      setIncludeFactoryActNote(Boolean(rule.includeFactoryActNote));
      setNotes(rule.notes ?? "");
    } else {
      setProfileName("");
      setProfileCode("");
      setSiteName("");
      setSubUnit("");
      setArchetype("ALL_INCLUSIVE_RATE");
      setGstMode("INTRA_CGST_SGST");
      setSacCode("998533");
      setEpfEmployerPct("12");
      setPfFixedPerDay("0");
      setPoolEpfMode("UNCAPPED");
      setEsiEmployerPct("3.25");
      setPoolEsiMode("UNCAPPED");
      setBonusPct("0");
      setServiceChargePct("0");
      setStripGstFromTenderRate(false);
      setGovtDeductionPct("0");
      setCessPct("0");
      setGstRoundMode("ROUND");
      setTotalRoundMode("ROUND");
      setIncludeFactoryActNote(false);
      setNotes("");
    }
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Billing rule profile name is required.");
      return;
    }

    const payload: Partial<BillingRuleProfileRecord> = {
      profileName: profileName.trim(),
      ...(profileCode.trim() ? { profileCode: profileCode.trim().toUpperCase() } : {}),
      siteName: siteName.trim(),
      subUnit: subUnit.trim(),
      archetype,
      gstMode,
      sacCode: sacCode.trim() || "998533",
      epfEmployerPct: Math.max(0, Number(epfEmployerPct) || 0),
      pfFixedPerDay: Math.max(0, Number(pfFixedPerDay) || 0),
      poolEpfMode,
      esiEmployerPct: Math.max(0, Number(esiEmployerPct) || 0),
      poolEsiMode,
      bonusPct: Math.max(0, Number(bonusPct) || 0),
      serviceChargePct: Math.max(0, Number(serviceChargePct) || 0),
      stripGstFromTenderRate,
      govtDeductionPct: Math.max(0, Number(govtDeductionPct) || 0),
      cessPct: Math.max(0, Number(cessPct) || 0),
      gstRoundMode,
      totalRoundMode,
      includeFactoryActNote,
      notes: notes.trim(),
    };

    const saved = editing
      ? await updateBillingRuleProfile(editing.id, payload)
      : await createBillingRuleProfile(payload);
    if (saved) {
      toast.success(`Saved billing rule ${saved.profileName}.`);
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
            aria-label="Search site billing rules"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search BHELL, MSME, PHE, FSSAI, SOHAM, NIELIT..."
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={() => openEditor(null)}>
          <Plus className="size-4" />
          New Billing Rule Profile
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="acs-table-header hover:bg-transparent">
              <TableHead>Rule Profile</TableHead>
              <TableHead>Archetype</TableHead>
              <TableHead>GST Regime &amp; SAC</TableHead>
              <TableHead>Statutory / SC / Cess</TableHead>
              <TableHead>Rounding &amp; Clauses</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No billing rule profiles loaded yet. Create one or connect to backend for all 20 ACS billing templates.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{r.profileName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {r.profileCode}
                      {r.subUnit ? ` · Sub-Unit: ${r.subUnit}` : ""}
                      {r.siteName ? ` · Site: ${r.siteName}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="neutral" className="text-[10px]">{r.archetype}</Badge>
                    {r.stripGstFromTenderRate && (
                      <div className="mt-1 text-[11px] text-info">Strips 18% GST (/1.18)</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.gstMode === "RCM" ? "warning" : r.gstMode === "NON_GST" ? "neutral" : "info"} className="text-[10px]">
                      {r.gstMode}
                    </Badge>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">SAC {r.sacCode}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.serviceChargePct > 0 && <div>SC: {r.serviceChargePct}%</div>}
                    {r.pfFixedPerDay > 0 ? (
                      <div>PF: ₹{r.pfFixedPerDay}/day · ESI {r.esiEmployerPct}%</div>
                    ) : r.poolEpfMode === "HEADCOUNT_15000" ? (
                      <div>PF: Head×15000×13%</div>
                    ) : null}
                    {(r.govtDeductionPct > 0 || r.cessPct > 0) && (
                      <div>Deduct {r.govtDeductionPct}% · Cess {r.cessPct}%</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>GST: {r.gstRoundMode} · Total: {r.totalRoundMode}</div>
                    {r.includeFactoryActNote && <div className="text-info">Factory Act Note</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEditor(r)}>
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
              <ReceiptText className="size-4 text-primary" />
              <span>{editing ? `Configure Billing Rule — ${editing.profileName}` : "Create Site Billing Rule"}</span>
            </DialogTitle>
            <DialogDescription>
              Configure invoice calculation archetype, GST regime (`CGST+SGST`, `IGST`, `RCM`, `NON_GST`), RCM GST stripping, 0.02% deduction, 1% Cess, and rounding modes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="br-name">Profile Name *</Label>
                <Input id="br-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-code">Code</Label>
                <Input id="br-code" value={profileCode} onChange={(e) => setProfileCode(e.target.value.toUpperCase())} disabled={Boolean(editing)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-site">Bound Site (Optional)</Label>
                <Input id="br-site" list="br-site-opts" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                <datalist id="br-site-opts">
                  {siteNames.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="br-arch">Invoice Archetype</Label>
                <Select value={archetype} onValueChange={(v) => setArchetype(v as BillingArchetype)}>
                  <SelectTrigger id="br-arch"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_INCLUSIVE_RATE">Type 1: All-Inclusive Rate</SelectItem>
                    <SelectItem value="DAY_RATE_STATUTORY_MARKUP">Type 2: Day Rate + Statutory + SC</SelectItem>
                    <SelectItem value="MONTHLY_POOL_STATUTORY">Type 3: Monthly Pool + Statutory + SC</SelectItem>
                    <SelectItem value="GOVT_WORKS_DEDUCT_CESS">Type 4: Govt Works (-0.02% + GST + 1% Cess)</SelectItem>
                    <SelectItem value="SERVICE_CHARGE_ONLY">Type 5: Service Charge Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-gst">GST Regime</Label>
                <Select value={gstMode} onValueChange={(v) => setGstMode(v as SiteGstMode)}>
                  <SelectTrigger id="br-gst"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTRA_CGST_SGST">INTRA (CGST 9% + SGST 9%)</SelectItem>
                    <SelectItem value="INTER_IGST">INTER (IGST 18%)</SelectItem>
                    <SelectItem value="RCM">RCM (0% Client Pays)</SelectItem>
                    <SelectItem value="NON_GST">NON_GST (0% Exempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-sac">SAC Code</Label>
                <Input id="br-sac" value={sacCode} onChange={(e) => setSacCode(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="br-sc">Service Charge %</Label>
                <Input id="br-sc" type="number" step="0.000001" value={serviceChargePct} onChange={(e) => setServiceChargePct(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-pffix">Fixed PF ₹/Day</Label>
                <Input id="br-pffix" type="number" step="0.01" value={pfFixedPerDay} onChange={(e) => setPfFixedPerDay(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-gov">Govt Deduct %</Label>
                <Input id="br-gov" type="number" step="0.001" value={govtDeductionPct} onChange={(e) => setGovtDeductionPct(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-cess">Cess %</Label>
                <Input id="br-cess" type="number" step="0.01" value={cessPct} onChange={(e) => setCessPct(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="br-gstrnd">GST Rounding</Label>
                <Select value={gstRoundMode} onValueChange={(v) => setGstRoundMode(v as BillingRoundMode)}>
                  <SelectTrigger id="br-gstrnd"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUND">ROUND (Nearest ₹)</SelectItem>
                    <SelectItem value="ROUNDUP">ROUNDUP (FSSAI Ceil)</SelectItem>
                    <SelectItem value="EXACT_PAISE">EXACT_PAISE (RFI Paise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-totrnd">Total Rounding</Label>
                <Select value={totalRoundMode} onValueChange={(v) => setTotalRoundMode(v as BillingRoundMode)}>
                  <SelectTrigger id="br-totrnd"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUND">ROUND</SelectItem>
                    <SelectItem value="ROUNDUP">ROUNDUP</SelectItem>
                    <SelectItem value="EXACT_PAISE">EXACT_PAISE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="br-sub">Split Sub-Unit (Optional)</Label>
                <Input id="br-sub" value={subUnit} onChange={(e) => setSubUnit(e.target.value)} placeholder="e.g. S.G / Chef / HK" />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={stripGstFromTenderRate} onCheckedChange={(c) => setStripGstFromTenderRate(c === true)} />
                <span>Strip 18% GST from RCM all-inclusive tender rate (`/ 1.18`, e.g., MSME S.G `514.29 / 1.18`)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={includeFactoryActNote} onCheckedChange={(c) => setIncludeFactoryActNote(c === true)} />
                <span>Include Factory Act future claim clause (Bonus, CL, PL)</span>
              </label>
            </div>

            <div className="space-y-1">
              <Label htmlFor="br-notes">Billing Formula Notes</Label>
              <Input id="br-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Billing Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
