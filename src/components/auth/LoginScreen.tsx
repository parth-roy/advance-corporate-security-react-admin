import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter both your registered email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(cleanEmail, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <picture>
            <source srcSet="/images/acs-official-logo.avif" type="image/avif" />
            <img
              src="/images/acs-official-logo.webp"
              alt="Advance Corporate Security Logo"
              width={1313}
              height={536}
              className="block h-24 w-auto max-w-full object-contain sm:h-28"
            />
          </picture>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">Admin Portal Sign In</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with your authorized Advance Corporate Security credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="acs-card space-y-5 p-6 sm:p-8" noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-email">Work Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="admin@advancecorporatesecurity.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="pr-10 pl-9"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              "Sign In to Dashboard"
            )}
          </Button>

          <div className="flex items-start gap-2 rounded-lg bg-secondary/70 px-3 py-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Restricted access. Only active administrator accounts verified in the ACS database may access operations, payroll, and billing records.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
