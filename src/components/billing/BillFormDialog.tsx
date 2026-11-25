import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACS_LOCATIONS, PAYROLL_MONTHS } from "@/lib/acs-seed";
import type { InvoiceRecord, PaymentStatus } from "@/lib/acs-types";
import { parseNonNegativeNumber } from "@/lib/acs-utils";

export function BillFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: InvoiceRecord | null;
  onSave: (payload: Omit<InvoiceRecord, "id">, editId?: string) => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [billingMonth, setBillingMonth] = useState<string>(PAYROLL_MONTHS[0]);
  const [site, setSite] = useState<string>(ACS_LOCATIONS[0]);
  const [serviceType, setServiceType] = useState("Manned Guarding & Supervision");
  const [serviceDescription, setServiceDescription] = useState("24x7 Corporate Security Deployment");
  const [quantity, setQuantity] = useState("15");
  const [rate, setRate] = useState("24000");
  const [taxRate, setTaxRate] = useState("18");
  const [invoiceDate, setInvoiceDate] = useState("2026-11-25");
  const [dueDate, setDueDate] = useState("2026-12-20");
  const [paymentTerms, setPaymentTerms] = useState("Net 25 Days");
  const [status, setStatus] = useState<PaymentStatus>("Pending");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setInvoiceNumber(editing.invoiceNumber);
      setClientName(editing.clientName);
      setClientAddress(editing.clientAddress);
      setClientGstin(editing.clientGstin);
      setBillingMonth(editing.billingMonth);
      setSite(editing.site);
      setServiceType(editing.serviceType);
      setServiceDescription(editing.serviceDescription);
      setQuantity(String(editing.quantity));
      setRate(String(editing.rate));
      setTaxRate(String(editing.taxRate));
      setInvoiceDate(editing.invoiceDate);
      setDueDate(editing.dueDate);
      setPaymentTerms(editing.paymentTerms);
      setStatus(editing.status);
    } else {
      setInvoiceNumber(`ACS-INV-2026-${Math.floor(405 + Math.random() * 90)}`);
      setClientName("");
      setClientAddress("");
      setClientGstin("");
      setBillingMonth(PAYROLL_MONTHS[0]);
      setSite(ACS_LOCATIONS[0]);
      setServiceType("Manned Guarding & Supervision");
      setServiceDescription("24x7 Corporate Security Deployment");
      setQuantity("15");
      setRate("24000");
      setTaxRate("18");
      setInvoiceDate("2026-11-25");
      setDueDate("2026-12-20");
      setPaymentTerms("Net 25 Days");
      setStatus("Pending");
    }
    setError("");
  }, [editing, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseNonNegativeNumber(quantity);
    const r = parseNonNegativeNumber(rate);
    const t = parseNonNegativeNumber(taxRate);
    if (!invoiceNumber.trim() || !clientName.trim() || !serviceType.trim()) {
      setError("Invoice Number, Client Name, and Service Type are required.");
      return;
    }
    if (q === null || q <= 0 || r === null || r <= 0 || t === null || t > 100) {
      setError("Enter valid positive quantity, rate, and tax percentage (0–100).");
      return;
    }
    onSave(
      {
        invoiceNumber: invoiceNumber.trim(),
        clientName: clientName.trim(),
        clientAddress: clientAddress.trim() || "Corporate Office Address, India",
        clientGstin: clientGstin.trim() || "27AAACC0000A1Z5",
        billingMonth,
        site,
        serviceType: serviceType.trim(),
        serviceDescription: serviceDescription.trim() || serviceType.trim(),
        quantity: Math.round(q),
        rate: Math.round(r),
        taxRate: t,
        invoiceDate,
        dueDate,
        paymentTerms: paymentTerms.trim() || "Net 25 Days",
        status,
      },
      editing?.id,
    );
    toast.success(editing ? "Invoice updated." : "New client bill created.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Bill" : "Create New Bill"}</DialogTitle>
          <DialogDescription>Prepare a corporate security service invoice for a client site.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="inv-num">Invoice Number</Label><Input id="inv-num" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-client">Client / Organisation</Label><Input id="inv-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Horizon Tech Park Ltd." /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-addr">Billing Address</Label><Input id="inv-addr" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="City, State, PIN" /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-gst">Client GSTIN</Label><Input id="inv-gst" value={clientGstin} onChange={(e) => setClientGstin(e.target.value)} placeholder="27AAACM9104K1Z2" /></div>
            <div className="space-y-1.5">
              <Label>Billing Month</Label>
              <Select value={billingMonth} onValueChange={setBillingMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYROLL_MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Site / Location</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACS_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="inv-svc">Service Type</Label><Input id="inv-svc" value={serviceType} onChange={(e) => setServiceType(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-desc">Service Description</Label><Input id="inv-desc" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label htmlFor="inv-qty">Quantity</Label><Input id="inv-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-rate">Rate (INR)</Label><Input id="inv-rate" type="number" min={1} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-tax">Tax (%)</Label><Input id="inv-tax" type="number" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="inv-date">Invoice Date</Label><Input id="inv-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="inv-due">Due Date</Label><Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PaymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="inv-terms">Payment Terms</Label><Input id="inv-terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} /></div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save Invoice" : "Create Bill"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}