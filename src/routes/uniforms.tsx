import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, Package, Plus, RotateCcw, Search, Shirt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { AddUniformDialog, IssueUniformDialog, UpdateStockDialog } from "@/components/uniforms/UniformDialogs";
import { UNIFORM_CATEGORIES } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { UniformItem } from "@/lib/acs-types";
import { deriveUniformStatus } from "@/lib/acs-utils";

export const Route = createFileRoute("/uniforms")({
  head: () => ({
    meta: [
      { title: "Uniform Management — ACS Admin Panel" },
      { name: "description", content: "Track uniform inventory, issue uniforms to security staff, process returns, and monitor stock levels." },
      { property: "og:title", content: "Uniform Management — ACS Admin Panel" },
      { property: "og:description", content: "Security uniform stock and employee issuance management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UniformsPage,
});

function UniformsPage() {
  const { data, addUniformItem, updateUniformStock, issueUniform, returnUniform } = useAcsStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<UniformItem | null>(null);

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
        const matchesQ = !q || u.name.toLowerCase().includes(q) || u.category.toLowerCase().includes(q);
        const matchesCat = categoryFilter === "All" || u.category === categoryFilter;
        return matchesQ && matchesCat;
      }),
    [data.uniforms, search, categoryFilter],
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Uniform Items" value={metrics.items} hint="Active inventory SKUs" icon={Shirt} tone="primary" />
        <StatCard label="Available Stock" value={metrics.available} hint="Ready for site issue" icon={Boxes} tone="success" />
        <StatCard label="Issued Uniforms" value={metrics.issued} hint="Currently with personnel" icon={Package} tone="info" />
        <StatCard label="Low Stock Items" value={metrics.lowStock} hint="15 units or fewer left" icon={AlertTriangle} tone="warning" />
      </section>

      <section className="acs-card p-5">
        <Tabs defaultValue="inventory" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="issues">Employee Issue History</TabsTrigger>
              <TabsTrigger value="history">Stock History</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIssueOpen(true)}>
                <ArrowUpRight className="size-4" />Issue Uniform
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />Add Uniform Item
              </Button>
            </div>
          </div>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search uniform item..." className="pl-9" />
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
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
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
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-foreground">{item.size}</TableCell>
                        <TableCell className="font-semibold tabular-nums">{item.availableQty}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{item.issuedQty}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{item.lastUpdated}</TableCell>
                        <TableCell><StatusBadge status={status} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setStockTarget(item)}>Update Stock</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="issues">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Uniform Item</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.uniformIssues.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{rec.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{rec.employeeId}</div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">{rec.site}</TableCell>
                      <TableCell className="text-foreground">{rec.itemName}</TableCell>
                      <TableCell>{rec.size}</TableCell>
                      <TableCell className="tabular-nums">{rec.quantity}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{rec.issueDate}</TableCell>
                      <TableCell><StatusBadge status={rec.status} /></TableCell>
                      <TableCell className="text-right">
                        {rec.status === "Issued" ? (
                          <Button size="sm" variant="outline" onClick={() => { returnUniform(rec.id); toast.success(`Marked ${rec.itemName} as returned.`); }}>
                            <RotateCcw className="size-3.5" />Return Uniform
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Returned {rec.returnDate}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="acs-table-header hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Movement</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.stockLogs.map((log) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <AddUniformDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addUniformItem} />
      <UpdateStockDialog item={stockTarget} onClose={() => setStockTarget(null)} onUpdate={updateUniformStock} />
      <IssueUniformDialog open={issueOpen} onOpenChange={setIssueOpen} items={data.uniforms} onIssue={issueUniform} />
    </div>
  );
}