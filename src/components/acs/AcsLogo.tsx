import { cn } from "@/lib/utils";

interface AcsLogoProps {
  compact?: boolean;
  initials?: string;
  className?: string;
}

export function AcsLogo({ compact = false, initials = "ACS", className }: AcsLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2.5L4.5 5.8V11.6C4.5 16.5 7.7 20.8 12 22C16.3 20.8 19.5 16.5 19.5 11.6V5.8L12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9 12.2L11.1 14.3L15.4 9.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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