import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { calculateNetSalary, deriveUniformStatus, isValidEmail, isValidPhone, parseNonNegativeNumber } from "@/lib/acs-utils";
import { calcInvoiceTotals } from "@/components/billing/InvoicePreviewDialog";
import { INITIAL_ACS_DATA } from "@/lib/acs-seed";

describe("ACS Admin Panel routes", () => {
  const expectedPaths = [
    "/",
    "/recruitment",
    "/uniforms",
    "/attendance",
    "/esi-pf",
    "/salary",
    "/payslips",
    "/billing",
    "/settings",
  ];

  it("matches all 9 ACS admin module routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of expectedPaths) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    }
  });
});

describe("ACS domain helpers", () => {
  it("calculates net salary without dropping below zero", () => {
    expect(calculateNetSalary({ basicSalary: 20000, allowances: 4000, overtime: 1500, deductions: 2200 })).toBe(23300);
    expect(calculateNetSalary({ basicSalary: 1000, allowances: 0, overtime: 0, deductions: 5000 })).toBe(0);
  });

  it("derives uniform stock status thresholds accurately", () => {
    expect(deriveUniformStatus(0)).toBe("Out of Stock");
    expect(deriveUniformStatus(12)).toBe("Low Stock");
    expect(deriveUniformStatus(16)).toBe("In Stock");
  });

  it("validates contact inputs and non-negative numeric fields", () => {
    expect(parseNonNegativeNumber("1500")).toBe(1500);
    expect(parseNonNegativeNumber("-5")).toBeNull();
    expect(parseNonNegativeNumber("abc")).toBeNull();
    expect(isValidPhone("+91 98451 22310")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidEmail("ops@advancecorporatesecurity.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });

  it("computes invoice subtotal, tax, and total accurately", () => {
    const firstInvoice = INITIAL_ACS_DATA.invoices[0];
    expect(firstInvoice).toBeDefined();
    if (firstInvoice) {
      const totals = calcInvoiceTotals(firstInvoice);
      expect(totals.subtotal).toBe(30 * 24500);
      expect(totals.tax).toBe(Math.round(30 * 24500 * 0.18));
      expect(totals.total).toBe(totals.subtotal + totals.tax);
    }
  });
});