import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACS_IDENTIFICATION_MARK_GROUPS } from "@/lib/acs-seed";
import { cn } from "@/lib/utils";

const NO_MARK_OPTION = "No visible identification mark (None)";

interface IdentificationMarkMultiSelectProps {
  id?: string;
  selectedMarks: string[];
  onSelectedMarksChange: (next: string[]) => void;
  otherSelected: boolean;
  onOtherSelectedChange: (next: boolean) => void;
  otherValue: string;
  onOtherValueChange: (next: string) => void;
}

export function IdentificationMarkMultiSelect({
  id = "emp-imark",
  selectedMarks,
  onSelectedMarksChange,
  otherSelected,
  onOtherSelectedChange,
  otherValue,
  onOtherValueChange,
}: IdentificationMarkMultiSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFilterQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredGroups = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return ACS_IDENTIFICATION_MARK_GROUPS;
    return ACS_IDENTIFICATION_MARK_GROUPS.map((group) => ({
      group: group.group,
      marks: group.marks.filter((mark) => mark.toLowerCase().includes(q)),
    })).filter((group) => group.marks.length > 0);
  }, [filterQuery]);

  const togglePresetMark = (mark: string) => {
    if (mark === NO_MARK_OPTION) {
      if (selectedMarks.includes(NO_MARK_OPTION)) {
        onSelectedMarksChange([]);
      } else {
        onSelectedMarksChange([NO_MARK_OPTION]);
        onOtherSelectedChange(false);
        onOtherValueChange("");
      }
      return;
    }

    const withoutNone = selectedMarks.filter((m) => m !== NO_MARK_OPTION);
    if (withoutNone.includes(mark)) {
      onSelectedMarksChange(withoutNone.filter((m) => m !== mark));
    } else {
      onSelectedMarksChange([...withoutNone, mark]);
    }
  };

  const toggleOther = () => {
    if (otherSelected) {
      onOtherSelectedChange(false);
      onOtherValueChange("");
    } else {
      if (selectedMarks.includes(NO_MARK_OPTION)) {
        onSelectedMarksChange(selectedMarks.filter((m) => m !== NO_MARK_OPTION));
      }
      onOtherSelectedChange(true);
    }
  };

  const clearAll = () => {
    onSelectedMarksChange([]);
    onOtherSelectedChange(false);
    onOtherValueChange("");
  };

  const totalCount = selectedMarks.length + (otherSelected ? 1 : 0);

  const triggerLabel = useMemo(() => {
    const parts = [...selectedMarks];
    if (otherSelected) {
      parts.push(otherValue.trim() || "Other (Manual)");
    }
    return parts.join(", ");
  }, [selectedMarks, otherSelected, otherValue]);

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setFilterQuery("");
          }
        }}
        className={cn(
          "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          !triggerLabel && "text-muted-foreground",
        )}
      >
        <span className="line-clamp-1 flex-1">
          {triggerLabel || "Select identification mark(s)"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {totalCount > 0 && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {totalCount}
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
      </button>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter marks (e.g. mole, scar, cheek)..."
                aria-label="Filter identification marks"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filteredGroups.map((group) => (
              <div key={group.group} className="mb-1 last:mb-0">
                <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.group}
                </div>
                {group.marks.map((mark) => {
                  const isSelected = selectedMarks.includes(mark);
                  return (
                    <button
                      key={mark}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => togglePresetMark(mark)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent/60 font-medium",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </span>
                      <span className="flex-1">{mark}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No preset marks match &ldquo;{filterQuery}&rdquo;. Use Other below to enter manually.
              </div>
            )}

            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                role="option"
                aria-selected={otherSelected}
                onClick={toggleOther}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  otherSelected && "bg-accent/60 font-medium",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    otherSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                >
                  {otherSelected && <Check className="size-3" />}
                </span>
                <span className="flex-1">Other (Enter Manually)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-2.5 py-2">
            <span className="text-xs text-muted-foreground">
              {totalCount === 0
                ? "Click options to select multiple"
                : `${totalCount} mark${totalCount === 1 ? "" : "s"} selected`}
            </span>
            <div className="flex items-center gap-1.5">
              {totalCount > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
                  Clear
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  setOpen(false);
                  setFilterQuery("");
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedMarks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {selectedMarks.map((mark) => (
            <Badge key={mark} variant="secondary" className="gap-1 pr-1 font-normal">
              <span>{mark}</span>
              <button
                type="button"
                aria-label={`Remove ${mark}`}
                onClick={() => onSelectedMarksChange(selectedMarks.filter((m) => m !== mark))}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {otherSelected && (
        <Input
          id={`${id}-other`}
          aria-label="Other Identification Mark"
          value={otherValue}
          onChange={(e) => onOtherValueChange(e.target.value)}
          placeholder="Describe visible identification mark"
          className="mt-1.5"
          required
        />
      )}
    </div>
  );
}
