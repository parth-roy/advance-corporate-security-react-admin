export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseNonNegativeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-+()]/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^\d+$/.test(digits);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function calculateNetSalary(parts: {
  basicSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
}): number {
  const net = parts.basicSalary + parts.allowances + parts.overtime - parts.deductions;
  return Math.max(0, Math.round(net));
}

export function deriveUniformStatus(availableQty: number): "In Stock" | "Low Stock" | "Out of Stock" {
  if (availableQty <= 0) return "Out of Stock";
  if (availableQty <= 15) return "Low Stock";
  return "In Stock";
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (cell: string | number) => {
    const str = String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printDocumentHtml(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=880,height=740");
  if (!win) return;
  win.document.write(`<!doctype html>
<html><head><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202124; margin: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 13px; text-align: left; }
  th { background: #f7f8fa; color: #4b5563; font-weight: 600; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #172B4D; padding-bottom: 14px; margin-bottom: 20px; }
  .brand { color: #172B4D; font-weight: 700; font-size: 18px; }
  .muted { color: #6b7280; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 13px; }
  .summary { margin-top: 18px; background: #f7f8fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; font-weight: 700; }
  @media print { body { margin: 16px; } }
</style></head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}