import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACS_LOCATIONS, UNIFORM_CATEGORIES } from "@/lib/acs-seed";
import type { UniformCategory, UniformItem } from "@/lib/acs-types";
import { parseNonNegativeNumber } from "@/lib/acs-utils";

export function AddUniformDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: { name: string; category: UniformCategory; size: string; availableQty: number }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<UniformCategory>("Security Uniform");
  const [size, setSize] = useState("L");
  const [qty, setQty] = useState("25");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseNonNegativeNumber(qty);
    if (!name.trim() || !size.trim()) {
      setError("Item name and size are required.");
      return;
    }
    if (parsed === null) {
      setError("Enter a valid non-negative quantity.");
      return;
    }
    onAdd({ name: name.trim(), category, size: size.trim(), availableQty: Math.round(parsed) });
    toast.success(`${name.trim()} added to uniform inventory.`);
    setName("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Uniform Item</DialogTitle>
          <DialogDescription>Create a new uniform SKU in ACS inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="uni-name">Item Name</Label>
            <Input id="uni-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Reflective Night Vest" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as UniformCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIFORM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-size">Size</Label>
              <Input id="uni-size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M / L / XL / Free" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-qty">Initial Stock Quantity</Label>
            <Input id="uni-qty" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UpdateStockDialog({
  item,
  onClose,
  onUpdate,
}: {
  item: UniformItem | null;
  onClose: () => void;
  onUpdate: (id: string, delta: number, note: string) => void;
}) {
  const [delta, setDelta] = useState("20");
  const [note, setNote] = useState("Vendor stock replenishment");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const num = Number(delta);
    if (!Number.isFinite(num) || num === 0) {
      setError("Enter a non-zero stock adjustment.");
      return;
    }
    if (item.availableQty + num < 0) {
      setError("Stock cannot drop below zero.");
      return;
    }
    onUpdate(item.id, Math.round(num), note.trim());
    toast.success(`Updated stock for ${item.name}.`);
    setError("");
    onClose();
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>{item?.name} (Current: {item?.availableQty} units)</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stock-delta">Quantity Change (+ to add, - to reduce)</Label>
            <Input id="stock-delta" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock-note">Reference Note</Label>
            <Input id="stock-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Stock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IssueUniformDialog({
  open,
  onOpenChange,
  items,
  onIssue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: UniformItem[];
  onIssue: (payload: { employeeId: string; employeeName: string; site: string; itemId: string; itemName: string; size: string; quantity: number; issueDate: string }) => boolean;
}) {
  const [employeeId, setEmployeeId] = useState("ACS-1005");
  const [employeeName, setEmployeeName] = useState("Manoj Tiwari");
  const [site, setSite] = useState<string>(ACS_LOCATIONS[0]);
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = items.find((u) => u.id === (itemId || items[0]?.id));
    const qty = parseNonNegativeNumber(quantity);
    if (!selected || !employeeId.trim() || !employeeName.trim()) {
      setError("Complete all employee and item fields.");
      return;
    }
    if (qty === null || qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    const ok = onIssue({
      employeeId: employeeId.trim(),
      employeeName: employeeName.trim(),
      site,
      itemId: selected.id,
      itemName: selected.name,
      size: selected.size,
      quantity: Math.round(qty),
      issueDate: new Date().toISOString().slice(0, 10),
    });
    if (!ok) {
      setError(`Only ${selected.availableQty} units available in stock.`);
      return;
    }
    toast.success(`Issued ${Math.round(qty)}× ${selected.name} to ${employeeName.trim()}.`);
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Uniform</DialogTitle>
          <DialogDescription>Assign uniform stock to an active security employee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="iss-eid">Employee ID</Label>
              <Input id="iss-eid" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iss-ename">Employee Name</Label>
              <Input id="iss-ename" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Site / Location</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACS_LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Uniform Item</Label>
              <Select value={itemId || items[0]?.id || ""} onValueChange={setItemId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {items.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.size} · {u.availableQty} left)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iss-qty">Qty</Label>
              <Input id="iss-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Issue Uniform</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}