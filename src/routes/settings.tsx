import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Mail, Save, ShieldCheck, SlidersHorizontal, Upload, User, UserPlus } from "lucide-react";
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
import { type AdminAuthUser, type AdminUserRole, useAuth } from "@/lib/auth";
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
  const { user, changePassword, apiRequest } = useAuth();
  const [form, setForm] = useState(data.settings);
  const [logoFile, setLogoFile] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const canManageUsers = user?.role === "super_admin" || user?.role === "admin";
  const [adminUsers, setAdminUsers] = useState<AdminAuthUser[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<AdminUserRole>("admin");
  const [creatingUser, setCreatingUser] = useState(false);

  const loadAdminUsers = useCallback(async () => {
    if (!canManageUsers) return;
    try {
      const list = await apiRequest<AdminAuthUser[]>("/api/admin/auth/users");
      if (Array.isArray(list)) setAdminUsers(list);
    } catch {
      // Ignore if backend is offline during local prototype inspection
    }
  }, [canManageUsers, apiRequest]);

  useEffect(() => {
    void loadAdminUsers();
  }, [loadAdminUsers]);

  const handlePasswordChange = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast.error("Enter your current password and a new password (min 8 characters).");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleCreateAdminUser = async () => {
    if (!newUserName.trim() || !isValidEmail(newUserEmail) || newUserPassword.length < 8) {
      toast.error("Name, valid email, and password (min 8 chars) are required.");
      return;
    }
    setCreatingUser(true);
    try {
      await apiRequest("/api/admin/auth/users", {
        method: "POST",
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      toast.success("Admin user created in database.");
      await loadAdminUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin user.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (target: AdminAuthUser) => {
    try {
      await apiRequest(`/api/admin/auth/users/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !target.isActive }),
      });
      toast.success(`${target.email} ${target.isActive ? "disabled" : "activated"}.`);
      await loadAdminUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user status.");
    }
  };

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

      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><KeyRound className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Account Security & Password</h2>
            <p className="text-xs text-muted-foreground">Signed in as {user?.email ?? form.adminEmail} ({user?.role ?? "admin"})</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Current Password</Label>
            <Input id="pw-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New Password</Label>
            <Input id="pw-new" type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm New Password</Label>
            <Input id="pw-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" disabled={pwSaving} onClick={() => void handlePasswordChange()}>
            {pwSaving ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </section>

      {canManageUsers && (
        <section className="acs-card p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary"><ShieldCheck className="size-4" /></div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Authorized Admin Accounts</h2>
              <p className="text-xs text-muted-foreground">Only active accounts stored in MongoDB can sign in to ACS Admin</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input placeholder="Full name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
            <Input type="email" placeholder="Email address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
            <Input type="password" placeholder="Password (min 8 chars)" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
            <div className="flex gap-2">
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AdminUserRole)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" disabled={creatingUser} onClick={() => void handleCreateAdminUser()}>
                <UserPlus className="size-4" />Add
              </Button>
            </div>
          </div>
          {adminUsers.length > 0 && (
            <div className="divide-y divide-border rounded-lg border">
              {adminUsers.map((acct) => (
                <div key={acct.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{acct.name} <span className="font-normal text-muted-foreground">({acct.email})</span></p>
                    <p className="text-[11px] text-muted-foreground">Role: {acct.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", acct.isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                      {acct.isActive ? "Active" : "Disabled"}
                    </span>
                    {acct.id !== user?.id && (
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleToggleUserStatus(acct)}>
                        {acct.isActive ? "Disable" : "Activate"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </form>
  );
}