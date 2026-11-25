import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACS_LOCATIONS } from "@/lib/acs-seed";
import { useAcsStore } from "@/lib/acs-store";
import { parseNonNegativeNumber } from "@/lib/acs-utils";

interface QuickEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEmployeeDialog({ open, onOpenChange }: QuickEmployeeDialogProps) {
  const { addEmployeeQuick } = useAcsStore();
  const [employeeId, setEmployeeId] = useState("ACS-1009");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Security Guard");
  const [location, setLocation] = useState<string>(ACS_LOCATIONS[0]);
  const [basicSalary, setBasicSalary] = useState("16500");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBasic = parseNonNegativeNumber(basicSalary);
    if (!employeeId.trim() || !name.trim() || !designation.trim()) {
      setError("Please fill in Employee ID, Name, and Designation.");
      return;
    }
    if (parsedBasic === null || parsedBasic === 0) {
      setError("Enter a valid positive basic salary.");
      return;
    }
    addEmployeeQuick({ employeeId: employeeId.trim(), name: name.trim(), designation: designation.trim(), location, basicSalary: parsedBasic });
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
          <DialogDescription>Register a new personnel record across attendance and payroll.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-id">Employee ID</Label>
              <Input id="emp-id" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="ACS-1009" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-basic">Basic Salary (INR)</Label>
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
            <Label>Assigned Site / Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACS_LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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