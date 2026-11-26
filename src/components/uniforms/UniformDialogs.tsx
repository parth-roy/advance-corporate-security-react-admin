import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UNIFORM_CATEGORIES,
  UNIFORM_DEFAULT_PRICES,
  UNIFORM_SUBCATEGORIES,
} from "@/lib/acs-seed";
import type { UniformCategory, UniformItem } from "@/lib/acs-types";
import { parseNonNegativeNumber } from "@/lib/acs-utils";

const OTHER_SUB_CATEGORY = "__OTHER__";

const DEFAULT_SIZE_BY_CATEGORY: Record<UniformCategory, string> = {
  Shirt: "L",
  "T-Shirt": "L",
  Pant: "32",
  Belt: "Free",
  Shoe: "8",
  Badge: "Std",
  Cap: "Free",
  "Lanyard + Whistle": "Std",
  "Safety Shoe": "8",
  "Safety Gloves": "Free",
  Jacket: "XL",
  "Safety Helmet": "Free",
  "ID Card": "Std",
};

export function AddUniformDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<UniformItem, "id" | "issuedQty" | "lastUpdated">) => void;
}) {
  const [category, setCategory] = useState<UniformCategory>("Shirt");
  const [subChoice, setSubChoice] = useState<string>("Black Shirt");
  const [customSub, setCustomSub] = useState("");
  const [size, setSize] = useState("L");
  const [unitPrice, setUnitPrice] = useState(String(UNIFORM_DEFAULT_PRICES["Shirt"]));
  const [qty, setQty] = useState("25");
  const [error, setError] = useState("");

  const subOptions = UNIFORM_SUBCATEGORIES[category] ?? [];

  const handleCategoryChange = (nextCategory: UniformCategory) => {
    setCategory(nextCategory);
    const nextSubs = UNIFORM_SUBCATEGORIES[nextCategory] ?? [];
    setSubChoice(nextSubs[0] ?? "");
    setCustomSub("");
    setSize(DEFAULT_SIZE_BY_CATEGORY[nextCategory] ?? "Free");
    setUnitPrice(String(UNIFORM_DEFAULT_PRICES[nextCategory] ?? 0));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseNonNegativeNumber(qty);
    const parsedPrice = parseNonNegativeNumber(unitPrice);
    const resolvedSub =
      subOptions.length > 0
        ? subChoice === OTHER_SUB_CATEGORY
          ? customSub.trim()
          : subChoice
        : customSub.trim();

    if (subChoice === OTHER_SUB_CATEGORY && !customSub.trim()) {
      setError("Please specify the sub-category name.");
      return;
    }
    if (!size.trim()) {
      setError("Size is required.");
      return;
    }
    if (parsedPrice === null) {
      setError("Enter a valid non-negative price (₹).");
      return;
    }
    if (parsedQty === null) {
      setError("Enter a valid non-negative stock quantity.");
      return;
    }

    const derivedName = resolvedSub || category;
    onAdd({
      name: derivedName,
      category,
      subCategory: resolvedSub,
      size: size.trim(),
      unitPrice: Math.round(parsedPrice),
      availableQty: Math.round(parsedQty),
    });
    toast.success(`${derivedName} (${size.trim()}) added to Uniforms & Accessories.`);
    setCustomSub("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Uniform / Accessory SKU</DialogTitle>
          <DialogDescription>
            Select category, sub-category (if applicable), size, and price (₹).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="uni-category">Category *</Label>
            <Select value={category} onValueChange={(v) => handleCategoryChange(v as UniformCategory)}>
              <SelectTrigger id="uni-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIFORM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subOptions.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="uni-subcategory">Sub-Category *</Label>
              <Select value={subChoice} onValueChange={setSubChoice}>
                <SelectTrigger id="uni-subcategory"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                <SelectContent>
                  {subOptions.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                  <SelectItem value={OTHER_SUB_CATEGORY}>Other (Custom Variant)</SelectItem>
                </SelectContent>
              </Select>
              {subChoice === OTHER_SUB_CATEGORY && (
                <Input
                  aria-label="Custom Sub-Category"
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                  placeholder="Enter sub-category variant"
                  className="mt-1.5"
                />
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="uni-custom-sub">Sub-Category / Variant (Optional)</Label>
              <Input
                id="uni-custom-sub"
                value={customSub}
                onChange={(e) => setCustomSub(e.target.value)}
                placeholder="Leave blank if standard item"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uni-size">Size *</Label>
              <Input
                id="uni-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="L / 32 / Free / Std"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-price">Price (₹) *</Label>
              <Input
                id="uni-price"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-qty">Initial Qty *</Label>
              <Input
                id="uni-qty"
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add to Inventory</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUniformDialog({
  item,
  onClose,
  onSave,
}: {
  item: UniformItem | null;
  onClose: () => void;
  onSave: (
    id: string,
    updates: Partial<Pick<UniformItem, "category" | "subCategory" | "size" | "unitPrice" | "name">>,
  ) => void;
}) {
  const [category, setCategory] = useState<UniformCategory>("Shirt");
  const [subCategory, setSubCategory] = useState("");
  const [size, setSize] = useState("");
  const [unitPrice, setUnitPrice] = useState("0");
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setCategory(item.category);
      setSubCategory(item.subCategory ?? "");
      setSize(item.size);
      setUnitPrice(String(item.unitPrice ?? UNIFORM_DEFAULT_PRICES[item.category] ?? 0));
      setError("");
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const parsedPrice = parseNonNegativeNumber(unitPrice);
    if (!size.trim()) {
      setError("Size is required.");
      return;
    }
    if (parsedPrice === null) {
      setError("Enter a valid non-negative price (₹).");
      return;
    }
    const cleanSub = subCategory.trim();
    const derivedName = cleanSub || category;
    onSave(item.id, {
      category,
      subCategory: cleanSub,
      name: derivedName,
      size: size.trim(),
      unitPrice: Math.round(parsedPrice),
    });
    toast.success(`Updated ${derivedName} (${size.trim()}) — ₹${Math.round(parsedPrice)}.`);
    onClose();
  };

  const presetSubs = UNIFORM_SUBCATEGORIES[category] ?? [];

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item &amp; Price</DialogTitle>
          <DialogDescription>
            Change uniform category, sub-category, size, or unit charge (₹).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-uni-cat">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as UniformCategory)}>
              <SelectTrigger id="edit-uni-cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIFORM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-uni-sub">Sub-Category</Label>
            {presetSubs.length > 0 ? (
              <Select value={subCategory || "__NONE__"} onValueChange={(v) => setSubCategory(v === "__NONE__" ? "" : v)}>
                <SelectTrigger id="edit-uni-sub"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">None / Standard</SelectItem>
                  {presetSubs.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                  {subCategory && !presetSubs.includes(subCategory) && (
                    <SelectItem value={subCategory}>{subCategory}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="edit-uni-sub"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Optional sub-category"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-uni-size">Size *</Label>
              <Input id="edit-uni-size" value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-uni-price">Unit Price (₹) *</Label>
              <Input
                id="edit-uni-price"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
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

  const label = item ? item.subCategory || item.category : "";

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
    toast.success(`Updated stock for ${label} (${item.size}).`);
    setError("");
    onClose();
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>
            {label} ({item?.size}) — Current: {item?.availableQty} units
          </DialogDescription>
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
