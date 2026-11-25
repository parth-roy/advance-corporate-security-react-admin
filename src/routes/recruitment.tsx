import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Eye, Pencil, Plus, Search, Trash2, UserCheck, UserPlus, Users, XCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/acs/StatCard";
import { StatusBadge } from "@/components/acs/StatusBadge";
import { CandidateDrawer } from "@/components/recruitment/CandidateDrawer";
import { EmploymentApplicationForm } from "@/components/recruitment/EmploymentApplicationForm";
import { ACS_LOCATIONS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import type { Candidate, CandidateStatus } from "@/lib/acs-types";

interface RecruitmentSearch {
  mode?: "new" | "edit";
  id?: string;
}

export const Route = createFileRoute("/recruitment")({
  validateSearch: (search: Record<string, unknown>): RecruitmentSearch => {
    const mode = search["mode"] === "new" || search["mode"] === "edit" ? search["mode"] : undefined;
    const id = typeof search["id"] === "string" && search["id"].trim() ? search["id"] : undefined;
    return {
      ...(mode ? { mode } : {}),
      ...(id ? { id } : {}),
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
  const { mode, id } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [viewing, setViewing] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);

  const counts = useMemo(
    () => ({
      total: data.candidates.length,
      newApps: data.candidates.filter((c) => c.status === "New").length,
      shortlisted: data.candidates.filter((c) => c.status === "Shortlisted").length,
      selected: data.candidates.filter((c) => c.status === "Selected").length,
      rejected: data.candidates.filter((c) => c.status === "Rejected").length,
    }),
    [data.candidates],
  );

  const filtered = useMemo(
    () =>
      data.candidates.filter((c) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          c.fullName.toLowerCase().includes(q) ||
          c.position.toLowerCase().includes(q) ||
          c.mobile.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "All" || c.status === statusFilter;
        const matchesLoc = locationFilter === "All" || c.location === locationFilter;
        return matchesSearch && matchesStatus && matchesLoc;
      }),
    [data.candidates, search, statusFilter, locationFilter],
  );

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
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Applicants" value={counts.total} icon={Users} tone="primary" />
        <StatCard label="New Applications" value={counts.newApps} icon={UserPlus} tone="info" />
        <StatCard label="Shortlisted" value={counts.shortlisted} icon={UserCheck} tone="warning" />
        <StatCard label="Selected" value={counts.selected} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} tone="danger" />
      </section>

      <section className="acs-card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, mobile, designation..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                <SelectItem value="Selected">Selected</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Locations</SelectItem>
                {ACS_LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openNewFormPage}>
            <Plus className="size-4" />Add Employee
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="acs-table-header hover:bg-transparent">
                <TableHead>Employee / Applicant Name</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Site / Location</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Application Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No matching records found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((cand) => (
                  <TableRow key={cand.id}>
                    <TableCell className="font-medium text-foreground">{cand.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{cand.mobile}</TableCell>
                    <TableCell className="text-foreground">{cand.position}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">{cand.location}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{cand.experience}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{cand.applicationDate}</TableCell>
                    <TableCell><StatusBadge status={cand.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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

      <CandidateDrawer candidate={viewing} onClose={() => setViewing(null)} onEdit={openEditFormPage} onStatusChange={handleStatusChange} />

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
    </div>
  );
}
