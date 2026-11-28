import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useAcsStore } from "@/lib/acs-store";
import type { InvoiceRecord } from "@/lib/acs-types";

export function GenerateSiteBillDialog({
  open,
  onOpenChange,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: (invoice: InvoiceRecord) => void;
}) {
  const {
    data,
    previewNextInvoiceNumber,
    fetchBillingRuleProfiles,
    generateSiteInvoice,
  } = useAcsStore();

  const [siteName, setSiteName] = useState("");
  const [subUnit, setSubUnit] = useState("");
  const [periodsInput, setPeriodsInput] = useState(() => new Date().toISOString().slice(0, 7));
  const [ruleProfileId, setRuleProfileId] = useState("AUTO");
  const [customRate, setCustomRate] = useState("");
  const [fallbackDays, setFallbackDays] = useState("26");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextNumber, setNextNumber] = useState("");
  const [generating, setGenerating] = useState(false);

  const siteOptions = useMemo(() => {
    const set = new Set<string>();
    data.sites.forEach((s) => s.isActive !== false && s.siteName && set.add(s.siteName));
    data.attendance.forEach((a) => a.location && set.add(a.location));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.sites, data.attendance]);

  useEffect(() => {
    if (!open) return;
    if (!siteName && siteOptions[0]) setSiteName(siteOptions[0]);
    void fetchBillingRuleProfiles();
    void previewNextInvoiceNumber(invoiceDate).then(setNextNumber);
  }, [open, siteName, siteOptions, invoiceDate, fetchBillingRuleProfiles, previewNextInvoiceNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const periodMonths = periodsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}$/.test(s));

    if (!siteName.trim() || periodMonths.length === 0) {
      toast.error("Select a site and enter valid billing period month(s) e.g. 2026-10 or 2026-09, 2026-10.");
      return;
    }

    setGenerating(true);
    try {
      const siteObj = data.sites.find((s) => s.siteName === siteName.trim());
      const res = await generateSiteInvoice({
        siteName: siteName.trim(),
        ...(siteObj?.id ? { siteId: siteObj.id } : {}),
        ...(subUnit.trim() ? { subUnit: subUnit.trim() } : {}),
        periodMonths,
        ...(ruleProfileId !== "AUTO" ? { ruleProfileId } : {}),
        ...(customRate.trim() && Number(customRate) > 0 ? { customRate: Number(customRate) } : {}),
        fallbackDays: Number(fallbackDays) || 26,
        invoiceDate,
      });
      if (res?.invoice) {
        toast.success(
          `Generated ${res.invoice.invoiceNumber} (${res.invoice.gstMode}) — ₹${res.invoice.totalInvoiceAmount ?? res.invoice.rate}.`,
        );
        onGenerated?.(res.invoice);
        onOpenChange(false);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            <span>Generate Site Bill from Verified Attendance</span>
          </DialogTitle>
          <DialogDescription>
            Supports multi-month periods (e.g. `2026-09, 2026-10` for PHE), split sub-units (`S.G`, `Chef`, `HK`), all 5 billing archetypes, and 4 GST regimes (`ADV/&lt;MMMYY&gt;/&lt;SEQ&gt;`).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gsb-site">Client Site *</Label>
              <Select value={siteName} onValueChange={setSiteName}>
                <SelectTrigger id="gsb-site"><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  {siteOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gsb-sub">Sub-Unit / Split (Optional)</Label>
              <Input
                id="gsb-sub"
                value={subUnit}
                onChange={(e) => setSubUnit(e.target.value)}
                placeholder="e.g. Chef, HK, S.S, S.G"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gsb-months">Billing Period Month(s) (YYYY-MM) *</Label>
              <Input
                id="gsb-months"
                value={periodsInput}
                onChange={(e) => setPeriodsInput(e.target.value)}
                placeholder="2026-10 or 2026-09, 2026-10"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gsb-rule">Billing Rule Profile</Label>
              <Select value={ruleProfileId} onValueChange={setRuleProfileId}>
                <SelectTrigger id="gsb-rule"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Auto-match Site / Sub-Unit Rule</SelectItem>
                  {(data.billingRuleProfiles ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.profileName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="gsb-date">Invoice Date *</Label>
              <Input id="gsb-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gsb-rate">Rate Override (₹)</Label>
              <Input id="gsb-rate" type="number" step="0.01" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="Auto" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gsb-days">Fallback Days</Label>
              <Input id="gsb-days" type="number" min={1} value={fallbackDays} onChange={(e) => setFallbackDays(e.target.value)} />
            </div>
          </div>

          {nextNumber && (
            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Next Sequential Invoice No: <strong className="font-mono text-foreground">{nextNumber}</strong> (Stage: <strong className="text-foreground">PRE_PAYMENT_SUBMITTED</strong>)
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={generating}>
              {generating ? "Generating..." : "Generate Official Tax Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
