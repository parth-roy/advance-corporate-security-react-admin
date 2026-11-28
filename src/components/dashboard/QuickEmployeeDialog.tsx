import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAcsStore } from "@/lib/acs-store";
import { deriveDynamicSites } from "@/lib/attendance-utils";
import { parseNonNegativeNumber } from "@/lib/acs-utils";

interface QuickEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEmployeeDialog({ open, onOpenChange }: QuickEmployeeDialogProps) {
  const { data, addEmployeeQuick } = useAcsStore();
  const realSites = useMemo(() => deriveDynamicSites(data), [data]);
  const [employeeId, setEmployeeId] = useState("ACS/SEC/2026/001");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Security Guard");
  const [location, setLocation] = useState<string>(realSites[0] ?? "");
  const [basicSalary, setBasicSalary] = useState("16500");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBasic = parseNonNegativeNumber(basicSalary);
    if (!employeeId.trim() || !name.trim() || !designation.trim() || !location.trim()) {
      setError("Please fill in Employee ID, Name, Designation, and Site.");
      return;
    }
    if (parsedBasic === null || parsedBasic === 0) {
      setError("Enter a valid positive basic salary.");
      return;
    }
    addEmployeeQuick({ employeeId: employeeId.trim(), name: name.trim(), designation: designation.trim(), location: location.trim(), basicSalary: parsedBasic });
    toast.success(`${name.trim()} added to ACS operations roster.`);
    setName("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>Register a deployed employee into Directory, Attendance, and Payroll.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-id">Employee ID</Label>
              <Input id="emp-id" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="ACS/SEC/2026/001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-basic">Basic / Rate (INR)</Label>
              <Input id="emp-basic" type="number" min={1} value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Full Name</Label>
            <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rajeshwar Patil" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-desig">Designation</Label>
            <Input id="emp-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Security Guard" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-emp-site">Assigned Client Site</Label>
            <Input
              id="quick-emp-site"
              list="quick-emp-sites-list"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Select or enter client site"
            />
            <datalist id="quick-emp-sites-list">
              {realSites.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add Employee</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}