import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Eye, Pencil, Plus, RotateCcw, Search, Trash2, UserCheck, UserPlus, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { CandidateDrawer } from "@/components/recruitment/CandidateDrawer";
import { CandidateFullProfileView } from "@/components/recruitment/CandidateFullProfileView";
import { DeployCandidateDialog } from "@/components/recruitment/DeployCandidateDialog";
import { EmployeeDirectoryView } from "@/components/recruitment/EmployeeDirectoryView";
import { EmploymentApplicationForm } from "@/components/recruitment/EmploymentApplicationForm";
import { useAcsStore } from "@/lib/acs-store";
import type { Candidate, CandidateStatus } from "@/lib/acs-types";

interface RecruitmentSearch {
  mode?: "new" | "edit" | "view";
  id?: string;
  tab?: "pipeline" | "employees";
}

export const Route = createFileRoute("/recruitment")({
  validateSearch: (search: Record<string, unknown>): RecruitmentSearch => {
    const mode =
      search["mode"] === "new" || search["mode"] === "edit" || search["mode"] === "view"
        ? search["mode"]
        : undefined;
    const id = typeof search["id"] === "string" && search["id"].trim() ? search["id"] : undefined;
    const tab =
      search["tab"] === "employees" || search["tab"] === "pipeline"
        ? search["tab"]
        : undefined;
    return {
      ...(mode ? { mode } : {}),
      ...(id ? { id } : {}),
      ...(tab ? { tab } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Recruitment — ACS Admin Panel" },
      { name: "description", content: "Manage security personnel applications, shortlisting, and hiring stages for Advance Corporate Security." },
      { property: "og:title", content: "Recruitment — ACS Admin Panel" },
      { property: "og:description", content: "Candidate pipeline and recruitment management for ACS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecruitmentPage,
});

function RecruitmentPage() {
  const { data, addCandidate, updateCandidate, deleteCandidate } = useAcsStore();
  const { mode, id, tab } = Route.useSearch();
  const activeTab = tab ?? "pipeline";
  const navigate = useNavigate({ from: Route.fullPath });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showDeployed, setShowDeployed] = useState(false);
  const [siteFilter, setSiteFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewing, setViewing] = useState<Candidate | null>(null);
  const [deployTarget, setDeployTarget] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);

  const availableSites = useMemo(() => {
    const set = new Set<string>();
    data.candidates.forEach((c) => {
      const site = (c.location ?? "").trim();
      if (site) set.add(site);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.candidates]);

  const availableDesignations = useMemo(() => {
    const set = new Set<string>();
    data.candidates.forEach((c) => {
      const pos = (c.position ?? "").trim();
      if (pos) set.add(pos);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.candidates]);

  const counts = useMemo(() => {
    const pending = data.candidates.filter((c) => !c.convertedEmployeeObjectId);
    const deployed = data.candidates.length - pending.length;
    return {
      pending: pending.length,
      deployed,
      newApps: pending.filter((c) => c.status === "New").length,
      shortlisted: pending.filter((c) => c.status === "Shortlisted").length,
      selected: pending.filter((c) => c.status === "Selected").length,
      rejected: pending.filter((c) => c.status === "Rejected").length,
    };
  }, [data.candidates]);

  const filtered = useMemo(
    () =>
      data.candidates.filter((c) => {
        const isDeployed = Boolean(c.convertedEmployeeObjectId);
        if (statusFilter === "Deployed") {
          if (!isDeployed) return false;
        } else if (!showDeployed && isDeployed) {
          return false;
        }
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          c.fullName.toLowerCase().includes(q) ||
          (c.employeeId ?? "").toLowerCase().includes(q) ||
          c.position.toLowerCase().includes(q) ||
          (c.joiningAs ?? "").toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.mobile.toLowerCase().includes(q);
        const matchesStatus =
          statusFilter === "All" || statusFilter === "Deployed" || c.status === statusFilter;
        const matchesSite = siteFilter === "All" || (c.location ?? "").trim() === siteFilter;
        const matchesDesig =
          designationFilter === "All" || (c.position ?? "").trim() === designationFilter;
        const appDate = (c.applicationDate ?? "").trim();
        const matchesFrom = !fromDate || (appDate && appDate >= fromDate);
        const matchesTo = !toDate || (appDate && appDate <= toDate);
        return matchesSearch && matchesStatus && matchesSite && matchesDesig && matchesFrom && matchesTo;
      }),
    [data.candidates, showDeployed, search, statusFilter, siteFilter, designationFilter, fromDate, toDate],
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      statusFilter !== "All" ||
      showDeployed ||
      siteFilter !== "All" ||
      designationFilter !== "All" ||
      fromDate ||
      toDate,
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setShowDeployed(false);
    setSiteFilter("All");
    setDesignationFilter("All");
    setFromDate("");
    setToDate("");
  };

  const handleSave = (payload: Omit<Candidate, "id">, editId?: string) => {
    if (editId) {
      const updated = { ...payload, id: editId };
      updateCandidate(updated);
      if (viewing?.id === editId) setViewing(updated);
    } else {
      addCandidate(payload);
    }
  };

  const handleStatusChange = (candidate: Candidate, status: CandidateStatus) => {
    const updated = { ...candidate, status };
    updateCandidate(updated);
    setViewing(updated);
    toast.success(`${candidate.fullName} moved to ${status}.`);
  };

  const openNewFormPage = () => {
    void navigate({ search: { mode: "new" } });
  };

  const openEditFormPage = (candidate: Candidate) => {
    setViewing(null);
    void navigate({ search: { mode: "edit", id: candidate.id } });
  };

  const closeFormPage = () => {
    void navigate({ search: {} });
  };

  if (mode === "view" && id) {
    const viewingCandidate = data.candidates.find((c) => c.id === id) ?? null;
    if (viewingCandidate) {
      return (
        <>
          <CandidateFullProfileView
            candidate={viewingCandidate}
            onBack={closeFormPage}
            onEdit={openEditFormPage}
            onStatusChange={handleStatusChange}
            onDeploy={(cand) => setDeployTarget(cand)}
          />
          <DeployCandidateDialog
            candidate={deployTarget}
            onClose={() => setDeployTarget(null)}
          />
        </>
      );
    }
  }

  if (mode === "new" || mode === "edit") {
    const editingCandidate =
      mode === "edit" && id ? data.candidates.find((c) => c.id === id) ?? null : null;

    return (
      <EmploymentApplicationForm
        editing={editingCandidate}
        onCancel={closeFormPage}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "pipeline" ? "default" : "outline"}
            onClick={() => void navigate({ to: "/recruitment", search: { tab: "pipeline" } })}
          >
            <UserPlus className="size-3.5" />
            Recruitment Pipeline ({counts.pending})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "employees" ? "default" : "outline"}
            onClick={() => void navigate({ to: "/recruitment", search: { tab: "employees" } })}
          >
            <Users className="size-3.5" />
            Employee Directory ({data.employees.length})
          </Button>
        </div>
      </div>

      {activeTab === "employees" ? (
        <EmployeeDirectoryView />
      ) : (
        <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pending Applicants" value={counts.pending} icon={Users} tone="primary" />
        <StatCard label="New Applications" value={counts.newApps} icon={UserPlus} tone="info" />
        <StatCard label="Shortlisted" value={counts.shortlisted} icon={UserCheck} tone="warning" />
        <StatCard label="Ready to Deploy" value={counts.selected} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} tone="danger" />
      </section>

      <section className="acs-card p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search recruitment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, mobile, designation, site..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {counts.deployed > 0 && (
              <Button
                type="button"
                variant={showDeployed ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowDeployed((v) => !v)}
              >
                {showDeployed
                  ? `Hide Deployed (${counts.deployed})`
                  : `Show Deployed (${counts.deployed})`}
              </Button>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-3.5" />
                Reset Filters
              </Button>
            )}
            <Button onClick={openNewFormPage}>
              <Plus className="size-4" />Add Candidate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by Status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Pending Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Shortlisted">Shortlisted</SelectItem>
              <SelectItem value="Selected">Selected</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Deployed">Deployed ({counts.deployed})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger aria-label="Filter by Site"><SelectValue placeholder="All Sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sites ({availableSites.length})</SelectItem>
              {availableSites.map((siteName) => (
                <SelectItem key={siteName} value={siteName}>{siteName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={designationFilter} onValueChange={setDesignationFilter}>
            <SelectTrigger aria-label="Filter by Designation"><SelectValue placeholder="All Designations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Designations ({availableDesignations.length})</SelectItem>
              {availableDesignations.map((desig) => (
                <SelectItem key={desig} value={desig}>{desig}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            aria-label="Application From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="From Application Date"
          />
          <Input
            aria-label="Application To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="To Application Date"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Employee / Applicant Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Application Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No matching records found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((cand) => (
                  <TableRow key={cand.id}>
                    <TableCell className="font-medium text-foreground">{cand.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-foreground">
                      {cand.employeeId || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{cand.mobile}</TableCell>
                    <TableCell className="text-foreground">{cand.position}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">{cand.location}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{cand.experience}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{cand.applicationDate}</TableCell>
                    <TableCell>
                      {cand.convertedEmployeeObjectId ? (
                        <Badge variant="success">Deployed</Badge>
                      ) : (
                        <StatusBadge status={cand.status} />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {cand.convertedEmployeeObjectId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-xs"
                            title="View in Employee Directory"
                            onClick={() =>
                              void navigate({ to: "/recruitment", search: { tab: "employees" } })
                            }
                          >
                            <ArrowUpRight className="size-3.5" />
                            Directory
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2.5 text-xs text-primary"
                            title="Deploy candidate to site & move to Employee Directory"
                            aria-label={`Deploy ${cand.fullName} as employee`}
                            onClick={() => setDeployTarget(cand)}
                          >
                            <UserCheck className="size-3.5" />
                            Deploy
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" aria-label={`View ${cand.fullName}`} onClick={() => setViewing(cand)}><Eye className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Edit ${cand.fullName}`} onClick={() => openEditFormPage(cand)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${cand.fullName}`} onClick={() => setDeleteTarget(cand)}><Trash2 className="size-4 text-danger" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <CandidateDrawer
        candidate={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEditFormPage}
        onStatusChange={handleStatusChange}
        onDeploy={(cand) => {
          setViewing(null);
          setDeployTarget(cand);
        }}
        onViewFullScreen={(cand) => {
          setViewing(null);
          void navigate({ search: { mode: "view", id: cand.id } });
        }}
      />

      <DeployCandidateDialog
        candidate={deployTarget}
        onClose={() => setDeployTarget(null)}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>Remove {deleteTarget?.fullName} from the recruitment pipeline. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteCandidate(deleteTarget.id); toast.success("Record removed."); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  );
}
