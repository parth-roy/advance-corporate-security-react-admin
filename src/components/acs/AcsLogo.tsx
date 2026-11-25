import { cn } from "@/lib/utils";

interface AcsLogoProps {
  compact?: boolean;
  initials?: string;
  className?: string;
}

export function AcsLogo({ compact = false, initials = "ACS", className }: AcsLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <img
          src="/admin-icon.png"
          alt="ACS Admin"
          className="size-full object-cover"
        />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-bold tracking-tight text-foreground">{initials}</div>
          <div className="truncate text-[11px] font-medium text-muted-foreground">Advance Corporate Security</div>
        </div>
      )}
    </div>
  );
}
