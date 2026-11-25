import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, Save, SlidersHorizontal, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AcsLogo } from "@/components/acs/AcsLogo";
import { cn } from "@/lib/utils";
import { PAYROLL_MONTHS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import { isValidEmail } from "@/lib/acs-utils";

function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-card shadow-xs transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Profile — ACS Admin Panel" },
      { name: "description", content: "Manage administrator profile, Advance Corporate Security company details, logo, contact information, and basic preferences." },
      { property: "og:title", content: "Settings & Profile — ACS Admin Panel" },
      { property: "og:description", content: "Basic settings and administrator profile for ACS Admin Panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, updateSettings } = useAcsStore();
  const [form, setForm] = useState(data.settings);
  const [logoFile, setLogoFile] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(data.settings);
  }, [data.settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adminName.trim() || !form.companyName.trim()) {
      setError("Admin Name and Company Name are required.");
      return;
    }
    if (!isValidEmail(form.adminEmail) || !isValidEmail(form.supportEmail)) {
      setError("Please enter valid administrator and company support emails.");
      return;
    }
    updateSettings(form);
    setError("");
    toast.success("Settings and profile saved.");
  };

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-6">
      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><User className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Admin Profile</h2>
            <p className="text-xs text-muted-foreground">Primary administrator identity shown in the top header</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-admin-name">Full Name</Label>
            <Input id="set-admin-name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-admin-role">Role / Title</Label>
            <Input id="set-admin-role" value={form.adminRole} onChange={(e) => setForm({ ...form, adminRole: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-admin-email">Email Address</Label>
            <Input id="set-admin-email" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-admin-phone">Phone Number</Label>
            <Input id="set-admin-phone" value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><Building2 className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Company Information & Logo</h2>
            <p className="text-xs text-muted-foreground">Displayed on official payslips and client tax invoices</p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <AcsLogo initials={form.logoInitials || "ACS"} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-24 space-y-1">
              <Label htmlFor="set-initials" className="text-xs">Short Code</Label>
              <Input id="set-initials" maxLength={5} value={form.logoInitials} onChange={(e) => setForm({ ...form, logoInitials: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="set-logo-file" className="text-xs">Upload Logo</Label>
              <label htmlFor="set-logo-file" className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-card px-3 text-xs font-medium text-foreground hover:bg-accent">
                <Upload className="size-3.5" />{logoFile || "Choose PNG / SVG"}
              </label>
              <input id="set-logo-file" type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0]?.name ?? "")} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-co-name">Company Name</Label>
            <Input id="set-co-name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-co-gst">GSTIN</Label>
            <Input id="set-co-gst" value={form.companyGstin} onChange={(e) => setForm({ ...form, companyGstin: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="set-co-addr">Registered Office Address</Label>
            <Textarea id="set-co-addr" rows={2} value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><Mail className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Contact Information</h2>
            <p className="text-xs text-muted-foreground">Official website and corporate operations desk details</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="set-web">Company Website</Label>
            <Input id="set-web" value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-sup-email">Operations Email</Label>
            <Input id="set-sup-email" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-sup-phone">Operations Phone</Label>
            <Input id="set-sup-phone" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><SlidersHorizontal className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Basic Application Preferences</h2>
            <p className="text-xs text-muted-foreground">Workspace display and reporting defaults</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Default Reporting Month</p>
              <p className="text-xs text-muted-foreground">Active period shown on payroll and payslip dashboards</p>
            </div>
            <Select value={form.defaultMonth} onValueChange={(v) => setForm({ ...form, defaultMonth: v })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{PAYROLL_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts for low uniform stock and overdue invoices</p>
            </div>
            <ToggleSwitch label="Email Notifications" checked={form.emailAlerts} onCheckedChange={(checked) => setForm({ ...form, emailAlerts: checked })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Compact Data Tables</p>
              <p className="text-xs text-muted-foreground">Prefer higher density rows for large personnel lists</p>
            </div>
            <ToggleSwitch label="Compact Data Tables" checked={form.compactTables} onCheckedChange={(checked) => setForm({ ...form, compactTables: checked })} />
          </div>
        </div>
      </section>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit"><Save className="size-4" />Save Changes</Button>
      </div>
    </form>
  );
}