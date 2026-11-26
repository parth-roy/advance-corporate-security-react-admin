import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound, Mail, Phone, Save, Settings, ShieldCheck, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAcsStore } from "@/lib/acs-store";
import { type AdminUserRole, useAuth } from "@/lib/auth";
import { isValidEmail } from "@/lib/acs-utils";

const ROLE_LABELS: Record<AdminUserRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  operations: "Operations",
  payroll: "Payroll",
};

function formatLastLogin(value?: string | null): string {
  if (!value) return "First active session";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminProfileView() {
  const { user, updateProfile, changePassword } = useAuth();
  const { recordActivity } = useAcsStore();

  const [name, setName] = useState(user?.name ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setJobTitle(user?.jobTitle ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  const initials = (name || user?.name || user?.email || "A")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanJobTitle = jobTitle.trim();

    if (!cleanName) {
      setProfileError("Full name is required.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setProfileError("Please enter a valid email address.");
      return;
    }
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        setProfileError("Phone number must contain 10 to 15 digits (or leave it blank).");
        return;
      }
    }

    setProfileSaving(true);
    try {
      const updated = await updateProfile({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        jobTitle: cleanJobTitle,
      });
      recordActivity(
        "Admin profile updated",
        `${updated.name} (${updated.email}) updated their profile details.`,
        "Auth",
      );
      toast.success("Admin profile saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile.";
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

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
      recordActivity(
        "Password updated",
        `${user?.email ?? email} changed their account password.`,
        "Auth",
      );
      toast.success("Password updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="acs-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-border">
              <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  {user?.name || "Administrator"}
                </h2>
                <Badge variant="info">
                  {user?.role ? ROLE_LABELS[user.role] : "Administrator"}
                </Badge>
                <Badge variant={user?.isActive === false ? "danger" : "success"}>
                  {user?.isActive === false ? "Disabled" : "Active"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {user?.email || "—"}
                </span>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" />
                    {user.phone}
                  </span>
                )}
                {user?.jobTitle && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="size-3.5" />
                    {user.jobTitle}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Last sign-in: {formatLastLogin(user?.lastLoginAt)}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link to="/settings" search={{ tab: "settings" }}>
              <Settings className="size-4" />
              Workspace Settings
            </Link>
          </Button>
        </div>
      </section>

      <form onSubmit={(e) => void handleProfileSave(e)} className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <UserCircle2 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Personal Details</h3>
            <p className="text-xs text-muted-foreground">
              Update your live administrator profile stored in MongoDB
            </p>
          </div>
        </div>
        <Separator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name">Full Name *</Label>
            <Input
              id="prof-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prof-title">Role / Designation</Label>
            <Input
              id="prof-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Operations Director, HR Lead"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prof-email">Email Address *</Label>
            <Input
              id="prof-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your work email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prof-phone">Phone Number</Label>
            <Input
              id="prof-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter 10-digit mobile number"
            />
          </div>
        </div>

        {profileError && <p className="text-sm font-medium text-danger">{profileError}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={profileSaving}>
            <Save className="size-4" />
            {profileSaving ? "Saving Profile..." : "Save Profile"}
          </Button>
        </div>
      </form>

      <section className="acs-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Account Security & Password</h3>
            <p className="text-xs text-muted-foreground">
              Signed in as {user?.email || email || "—"} ({user?.role ?? "admin"})
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Current Password</Label>
            <Input
              id="pw-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New Password</Label>
            <Input
              id="pw-new"
              type="password"
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm New Password</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pwSaving}
            onClick={() => void handlePasswordChange()}
          >
            {pwSaving ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </section>
    </div>
  );
}
