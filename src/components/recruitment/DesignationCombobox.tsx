import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ACS_DESIGNATION_GROUPS } from "@/lib/acs-seed";
import { cn } from "@/lib/utils";

interface DesignationComboboxProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function fuzzyScoreDesignation(query: string, candidate: string): number | null {
  const q = query.trim().toLowerCase();
  const t = candidate.toLowerCase();
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 850;

  const words = t.split(/[\s/()-]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(q))) return 750;
  if (t.includes(q)) return 650;

  const queryTokens = q.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1 && queryTokens.every((tok) => t.includes(tok))) {
    return 550;
  }

  // Ordered subsequence fuzzy match (e.g. "sup" or "secgrd")
  let qi = 0;
  let consecutive = 0;
  let lastMatchIdx = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti === lastMatchIdx + 1) consecutive += 1;
      lastMatchIdx = ti;
      qi += 1;
    }
  }
  if (qi === q.length) {
    return 200 + consecutive * 10 - (t.length - q.length);
  }
  return null;
}

export function DesignationCombobox({
  id = "emp-designation",
  value,
  onChange,
  placeholder = "Search or enter designation (e.g. sup, guard, electrician)...",
}: DesignationComboboxProps) {
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

  const filteredGroups = useMemo(() => {
    const activeQuery = open ? searchQuery : "";
    return ACS_DESIGNATION_GROUPS.map((group) => {
      const scored = group.roles
        .map((role) => ({ role, score: fuzzyScoreDesignation(activeQuery, role) }))
        .filter((item): item is { role: string; score: number } => item.score !== null)
        .sort((a, b) => b.score - a.score);
      return {
        group: group.group,
        roles: scored.map((item) => item.role),
      };
    }).filter((group) => group.roles.length > 0);
  }, [open, searchQuery]);

  const trimmedValue = value.trim();
  const hasExactMatch = useMemo(
    () =>
      ACS_DESIGNATION_GROUPS.some((g) =>
        g.roles.some((r) => r.toLowerCase() === trimmedValue.toLowerCase()),
      ),
    [trimmedValue],
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          value={value}
          onFocus={() => {
            setOpen(true);
            setSearchQuery(value);
          }}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next);
            setSearchQuery(next);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setSearchQuery("");
            } else if (e.key === "ArrowDown") {
              setOpen(true);
            } else if (e.key === "Enter" && open) {
              const firstMatch = filteredGroups[0]?.roles[0];
              if (firstMatch && searchQuery.trim() && !hasExactMatch) {
                e.preventDefault();
                onChange(firstMatch);
                setOpen(false);
                setSearchQuery("");
              } else {
                setOpen(false);
              }
            }
          }}
          placeholder={placeholder}
          className="pr-8 pl-8"
          required
        />
        <button
          type="button"
          aria-label="Toggle designation options"
          tabIndex={-1}
          onClick={() => {
            setOpen((prev) => {
              const next = !prev;
              if (next) setSearchQuery("");
              return next;
            });
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          {filteredGroups.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">
              No preset match found. Keep typing to use custom designation.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.group} className="mb-1.5 last:mb-0">
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  {group.group}
                </div>
                {group.roles.map((role) => {
                  const selected = value.trim().toLowerCase() === role.toLowerCase();
                  return (
                    <button
                      key={role}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(role);
                        setOpen(false);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent font-semibold text-accent-foreground",
                      )}
                    >
                      <span className="truncate">{role}</span>
                      {selected && <Check className="ml-2 size-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}

          {trimmedValue.length > 0 && !hasExactMatch && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(trimmedValue);
                setOpen(false);
                setSearchQuery("");
              }}
              className="mt-1 flex w-full items-center justify-between rounded-md border-t border-border px-2.5 pt-2 pb-1.5 text-left text-xs font-medium text-primary hover:bg-accent"
            >
              <span>Use custom: &ldquo;{trimmedValue}&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
