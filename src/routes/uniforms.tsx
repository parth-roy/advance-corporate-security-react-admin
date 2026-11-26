import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, Package, Pencil, Plus, RotateCcw, Search, Shirt, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { IssueUniformPage } from "@/components/uniforms/IssueUniformPage";
import { AddUniformDialog, EditUniformDialog, UpdateStockDialog } from "@/components/uniforms/UniformDialogs";
import { DEFAULT_UNIFORM_REGISTRATION_CHARGE, UNIFORM_CATEGORIES, UNIFORM_DEFAULT_PRICES } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { UniformItem } from "@/lib/acs-types";
import { deriveUniformStatus, formatINR } from "@/lib/acs-utils";

interface UniformsSearch {
  view?: "inventory" | "issue";
  tab?: "inventory" | "issues" | "history";
  candidateId?: string;
}

export const Route = createFileRoute("/uniforms")({
  validateSearch: (search: Record<string, unknown>): UniformsSearch => {
    const view = search["view"] === "issue" ? "issue" : undefined;
    const tab =
      search["tab"] === "issues" || search["tab"] === "history" || search["tab"] === "inventory"
        ? search["tab"]
        : undefined;
    const candidateId =
      typeof search["candidateId"] === "string" && search["candidateId"].trim()
        ? search["candidateId"]
        : undefined;
    return {
      ...(view ? { view } : {}),
      ...(tab ? { tab } : {}),
      ...(candidateId ? { candidateId } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Uniforms & Accessories — ACS Admin Panel" },
      { name: "description", content: "Track uniforms & accessories inventory, manage category prices, issue kits to staff, and monitor stock." },
      { property: "og:title", content: "Uniforms & Accessories — ACS Admin Panel" },
      { property: "og:description", content: "Security uniforms, accessories, pricing, and issuance management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UniformsPage,
});

function UniformsPage() {
  const {
    data,
    addUniformItem,
    updateUniformItem,
    updateUniformStock,
    returnUniform,
    updateSettings,
  } = useAcsStore();
  const { view, tab, candidateId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [issueSearch, setIssueSearch] = useState("");
  const [issueSiteFilter, setIssueSiteFilter] = useState("All");
  const [issueStatusFilter, setIssueStatusFilter] = useState("All");
  const [issueDateFilter, setIssueDateFilter] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [stockActionFilter, setStockActionFilter] = useState("All");
  const [stockDateFilter, setStockDateFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UniformItem | null>(null);
  const [stockTarget, setStockTarget] = useState<UniformItem | null>(null);
  const [editingRegFee, setEditingRegFee] = useState(false);
  const [regFeeDraft, setRegFeeDraft] = useState(
    String(data.settings.uniformRegistrationCharge ?? DEFAULT_UNIFORM_REGISTRATION_CHARGE),
  );

  const issueSites = useMemo(() => {
    const set = new Set<string>();
    data.uniformIssues.forEach((rec) => {
      if (rec.site.trim()) set.add(rec.site.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.uniformIssues]);

  const filteredIssues = useMemo(() => {
    const q = issueSearch.trim().toLowerCase();
    return data.uniformIssues.filter((rec) => {
      const label = (rec.subCategory || rec.itemName || rec.category || "").toLowerCase();
      const matchesQ =
        !q ||
        rec.employeeName.toLowerCase().includes(q) ||
        rec.employeeId.toLowerCase().includes(q) ||
        rec.site.toLowerCase().includes(q) ||
        label.includes(q);
      const matchesSite = issueSiteFilter === "All" || rec.site.trim() === issueSiteFilter;
      const matchesStatus = issueStatusFilter === "All" || rec.status === issueStatusFilter;
      const matchesDate = !issueDateFilter || rec.issueDate === issueDateFilter;
      return matchesQ && matchesSite && matchesStatus && matchesDate;
    });
  }, [data.uniformIssues, issueSearch, issueSiteFilter, issueStatusFilter, issueDateFilter]);

  const filteredStockLogs = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return data.stockLogs.filter((log) => {
      const matchesQ =
        !q || log.itemName.toLowerCase().includes(q) || log.note.toLowerCase().includes(q);
      const matchesAction = stockActionFilter === "All" || log.action === stockActionFilter;
      const matchesDate = !stockDateFilter || log.date === stockDateFilter;
      return matchesQ && matchesAction && matchesDate;
    });
  }, [data.stockLogs, stockSearch, stockActionFilter, stockDateFilter]);

  const metrics = useMemo(() => {
    const available = data.uniforms.reduce((sum, u) => sum + u.availableQty, 0);
    const issued = data.uniforms.reduce((sum, u) => sum + u.issuedQty, 0);
    const lowStock = data.uniforms.filter((u) => deriveUniformStatus(u.availableQty) !== "In Stock").length;
    return { items: data.uniforms.length, available, issued, lowStock };
  }, [data.uniforms]);

  const filteredItems = useMemo(
    () =>
      data.uniforms.filter((u) => {
        const q = search.trim().toLowerCase();
        const sub = (u.subCategory ?? "").toLowerCase();
        const matchesQ =
          !q ||
          u.category.toLowerCase().includes(q) ||
          sub.includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.size.toLowerCase().includes(q);
        const matchesCat = categoryFilter === "All" || u.category === categoryFilter;
        return matchesQ && matchesCat;
      }),
    [data.uniforms, search, categoryFilter],
  );

  if (view === "issue") {
    return (
      <IssueUniformPage
        initialCandidateId={candidateId}
        onBack={() => void navigate({ search: {} })}
        onIssuedSuccess={() => void navigate({ search: { tab: "issues" } })}
      />
    );
  }

  const activeRegFee = data.settings.uniformRegistrationCharge ?? DEFAULT_UNIFORM_REGISTRATION_CHARGE;

  const saveRegFee = () => {
    const parsed = Math.max(0, Math.round(Number(regFeeDraft) || 0));
    updateSettings({ uniformRegistrationCharge: parsed });
    setEditingRegFee(false);
    toast.success(`Uniform registration charge set to ${formatINR(parsed)}.`);
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Categories / SKUs" value={metrics.items} hint="Active inventory variants" icon={Shirt} tone="primary" />
        <StatCard label="Available Stock" value={metrics.available} hint="Ready for site issue" icon={Boxes} tone="success" />
        <StatCard label="Issued Units" value={metrics.issued} hint="Currently with personnel" icon={Package} tone="info" />
        <StatCard label="Low Stock Alerts" value={metrics.lowStock} hint="15 units or fewer left" icon={AlertTriangle} tone="warning" />
      </section>

      <div className="acs-card flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Tag className="size-4 text-primary" />
          <span>Standard Dressing / Uniform Registration Charge:</span>
          <span className="font-bold text-foreground">{formatINR(activeRegFee)}</span>
        </div>
        {editingRegFee ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Edit Registration Charge"
              type="number"
              min={0}
              value={regFeeDraft}
              onChange={(e) => setRegFeeDraft(e.target.value)}
              className="h-8 w-28 text-xs tabular-nums"
            />
            <Button size="sm" className="h-8" onClick={saveRegFee}>Save</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingRegFee(false)}>Cancel</Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setRegFeeDraft(String(activeRegFee));
              setEditingRegFee(true);
            }}
          >
            <Pencil className="size-3.5" />
            Change Registration Charge
          </Button>
        )}
      </div>

      <section className="acs-card p-5">
        <Tabs
          value={tab ?? "inventory"}
          onValueChange={(nextTab) => void navigate({ search: { tab: nextTab as "inventory" | "issues" | "history" } })}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="issues">Employee Issue History</TabsTrigger>
              <TabsTrigger value="history">Stock History</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void navigate({ search: { view: "issue" } })}>
                <ArrowUpRight className="size-4" />Issue Uniforms &amp; Accessories
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />Add Category / SKU
              </Button>
            </div>
          </div>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search category, sub-category, size..." className="pl-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {UNIFORM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Price (₹)</TableHead>
                    <TableHead>Available Qty</TableHead>
                    <TableHead>Issued Qty</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const status = deriveUniformStatus(item.availableQty);
                    const price = item.unitPrice ?? UNIFORM_DEFAULT_PRICES[item.category] ?? 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-foreground">{item.category}</TableCell>
                        <TableCell className="text-muted-foreground">{item.subCategory || "—"}</TableCell>
                        <TableCell className="text-foreground">{item.size}</TableCell>
                        <TableCell className="font-semibold tabular-nums text-foreground">{formatINR(price)}</TableCell>
                        <TableCell className="font-semibold tabular-nums">{item.availableQty}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{item.issuedQty}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{item.lastUpdated}</TableCell>
                        <TableCell><StatusBadge status={status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setEditTarget(item)}>
                              Edit / Price
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setStockTarget(item)}>
                              Update Stock
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search issue history"
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  placeholder="Search employee, ID, item, site..."
                  className="pl-9"
                />
              </div>
              <Select value={issueSiteFilter} onValueChange={setIssueSiteFilter}>
                <SelectTrigger aria-label="Filter issues by site"><SelectValue placeholder="All Sites" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Sites ({issueSites.length})</SelectItem>
                  {issueSites.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={issueStatusFilter} onValueChange={setIssueStatusFilter}>
                <SelectTrigger aria-label="Filter issues by status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                </SelectContent>
              </Select>
              <Input
                aria-label="Filter issues by date"
                type="date"
                value={issueDateFilter}
                onChange={(e) => setIssueDateFilter(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Item / Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Charges (₹)</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                        No matching uniform issue records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIssues.map((rec) => {
                      const label = rec.subCategory || rec.itemName || rec.category || "Uniform Item";
                      const totalCharge =
                        rec.totalAmount ??
                        rec.quantity * (rec.unitPrice ?? 0) + (rec.registrationCharge ?? 0);
                      return (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{rec.employeeName}</div>
                            <div className="font-mono text-xs text-muted-foreground">{rec.employeeId}</div>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-muted-foreground">{rec.site}</TableCell>
                          <TableCell className="text-foreground">
                            <div>{label}</div>
                            {rec.category && rec.category !== label && (
                              <div className="text-[11px] text-muted-foreground">{rec.category}</div>
                            )}
                          </TableCell>
                          <TableCell>{rec.size}</TableCell>
                          <TableCell className="tabular-nums">{rec.quantity}</TableCell>
                          <TableCell>
                            <div className="font-semibold tabular-nums text-foreground">{formatINR(totalCharge)}</div>
                            {rec.registrationCharge ? (
                              <Badge variant="info" className="mt-0.5 px-1.5 py-0 text-[10px]">
                                incl. {formatINR(rec.registrationCharge)} reg
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{rec.issueDate}</TableCell>
                          <TableCell><StatusBadge status={rec.status} /></TableCell>
                          <TableCell className="text-right">
                            {rec.status === "Issued" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  returnUniform(rec.id);
                                  toast.success(`Marked ${label} as returned.`);
                                }}
                              >
                                <RotateCcw className="size-3.5" />Return
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Returned {rec.returnDate}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search stock history"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Search category, variant, note..."
                  className="pl-9"
                />
              </div>
              <Select value={stockActionFilter} onValueChange={setStockActionFilter}>
                <SelectTrigger aria-label="Filter stock movement"><SelectValue placeholder="All Movements" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Movements</SelectItem>
                  <SelectItem value="Added">Added</SelectItem>
                  <SelectItem value="Restocked">Restocked</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                </SelectContent>
              </Select>
              <Input
                aria-label="Filter stock history by date"
                type="date"
                value={stockDateFilter}
                onChange={(e) => setStockDateFilter(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Category / Variant</TableHead>
                    <TableHead>Movement</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No matching stock history entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStockLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{log.date}</TableCell>
                        <TableCell className="font-medium text-foreground">{log.itemName}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                            {log.action === "Issued" ? <ArrowUpRight className="size-3.5 text-info" /> : <ArrowDownLeft className="size-3.5 text-success" />}
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">{log.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">{log.note}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <AddUniformDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addUniformItem} />
      <EditUniformDialog item={editTarget} onClose={() => setEditTarget(null)} onSave={updateUniformItem} />
      <UpdateStockDialog item={stockTarget} onClose={() => setStockTarget(null)} onUpdate={updateUniformStock} />
    </div>
  );
}
