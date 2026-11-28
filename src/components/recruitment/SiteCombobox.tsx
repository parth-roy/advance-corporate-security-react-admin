import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOptionalAcsStore } from "@/lib/acs-store";
import { cn } from "@/lib/utils";

interface SiteComboboxProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  required?: boolean;
}

/**
 * Searchable client-site dropdown that shows all active sites on click/focus
 * while still supporting typing or adding a custom site name.
 */
export function SiteCombobox({
  id = "site-select",
  value,
  onChange,
  placeholder = "Select or type site name...",
  required = false,
}: SiteComboboxProps) {
  const store = useOptionalAcsStore();
  const sites = store?.data.sites ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredSites = useMemo(() => {
    const q = (open ? searchQuery : "").trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(
      (s) =>
        s.siteName.toLowerCase().includes(q) ||
        s.siteCode.toLowerCase().includes(q) ||
        (s.clientName ?? "").toLowerCase().includes(q),
    );
  }, [sites, open, searchQuery]);

  const trimmed = value.trim();
  const hasExact = sites.some((s) => s.siteName.toLowerCase() === trimmed.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={value}
          onFocus={() => {
            setOpen(true);
            setSearchQuery("");
          }}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next);
            setSearchQuery(next);
            if (!open) setOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          className="pr-8"
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle site list"
          onClick={() => {
            setSearchQuery("");
            setOpen((prev) => !prev);
          }}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {filteredSites.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">
              {trimmed
                ? `Press Save to use "${trimmed}" as a site name.`
                : "No sites added yet."}
            </div>
          ) : (
            filteredSites.map((site) => {
              const selected = site.siteName.toLowerCase() === trimmed.toLowerCase();
              return (
                <button
                  key={site.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(site.siteName);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                    selected && "bg-primary/10 font-semibold text-primary",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{site.siteName}</span>
                  </span>
                  {selected && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
          {trimmed && !hasExact && filteredSites.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setSearchQuery("");
              }}
              className="mt-1 flex w-full items-center rounded-md border-t px-2.5 py-1.5 text-left text-xs font-medium text-primary hover:bg-accent"
            >
              Use custom site: &ldquo;{trimmed}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
