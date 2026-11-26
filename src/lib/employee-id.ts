import { ACS_DESIGNATION_GROUPS } from "./acs-seed";

const GROUP_DEFAULT_CODES: Record<string, string> = {
  "Security & Guarding Services": "SEC",
  "Facility Management & Housekeeping": "CLE",
  "Technical, MEP & Maintenance": "TEC",
  "Warehouse, Logistics & Blue-Collar Labour": "LOG",
  "Office Support, Fleet & Horticulture": "ADM",
};

const ROLE_CODE_OVERRIDES: Record<string, string> = {
  "Ward Boy / Hospital Attendant": "MED",
  "Driver (LMV / Commercial / Heavy)": "DRV",
  "Delivery / Courier Executive": "DEL",
  "Gardener / Mali (Horticulture)": "HRT",
  "Landscaping Supervisor": "HRT",
  "Reception Security Executive": "SEC",
};

/**
 * Infers a short uppercase category prefix (e.g. SEC, CLE, TEC) from a designation string
 * for employee IDs formatted as `ACS/<CODE>/<YEAR>/<NUMBER>`.
 */
export function inferDepartmentCode(designation: string): string {
  const clean = designation.trim();
  if (!clean) return "SEC";

  const exactOverride = ROLE_CODE_OVERRIDES[clean];
  if (exactOverride) return exactOverride;

  for (const grp of ACS_DESIGNATION_GROUPS) {
    if (grp.roles.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      return GROUP_DEFAULT_CODES[grp.group] ?? "SEC";
    }
  }

  const lower = clean.toLowerCase();
  if (/(clean|housekeep|janitor|sweep|pest|facade|maid|sanit)/.test(lower)) return "CLE";
  if (/(ward\s*boy|nurse|medical|hospital|attendant)/.test(lower)) return "MED";
  if (/(electri|plumb|hvac|chiller|dg|generator|lift|carpenter|paint|weld|fitter|bms|tech|maint|stp|wtp)/.test(lower)) {
    return "TEC";
  }
  if (/(warehouse|loader|picker|packer|forklift|rigg|factory|machine|labour|worker|dispatch)/.test(lower)) {
    return "LOG";
  }
  if (/(driver|delivery|courier|fleet)/.test(lower)) return "DRV";
  if (/(garden|mali|horti|landscap)/.test(lower)) return "HRT";
  if (/(office|peon|pantry|front\s*desk|data\s*entry|clerk|admin)/.test(lower)) return "ADM";
  if (/(security|guard|bouncer|patrol|cctv|pso|fire|gate)/.test(lower)) return "SEC";

  const lettersOnly = clean.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return lettersOnly.slice(0, 3) || "GEN";
}

export interface ParsedEmployeeId {
  org: string;
  deptCode: string;
  year: string;
  number: string;
}

export function parseEmployeeId(
  rawId?: string,
  fallbackDesignation = "",
  defaultYear = String(new Date().getFullYear()),
): ParsedEmployeeId {
  const trimmed = (rawId ?? "").trim().toUpperCase();
  if (trimmed) {
    const parts = trimmed.split("/").map((p) => p.trim());
    if (parts.length >= 4 && parts[0] === "ACS") {
      return {
        org: "ACS",
        deptCode: parts[1] || inferDepartmentCode(fallbackDesignation),
        year: parts[2] || defaultYear,
        number: parts.slice(3).join("/") || "",
      };
    }
  }
  return {
    org: "ACS",
    deptCode: inferDepartmentCode(fallbackDesignation),
    year: defaultYear,
    number: "",
  };
}

export function buildEmployeeId(parts: {
  deptCode: string;
  year: string;
  number: string;
}): string {
  const num = parts.number.trim().toUpperCase();
  if (!num) return "";
  const dept = (parts.deptCode.trim().toUpperCase() || "SEC").replace(/[^A-Z0-9-]/g, "");
  const yr = (parts.year.trim() || String(new Date().getFullYear())).replace(/[^0-9]/g, "");
  return `ACS/${dept || "SEC"}/${yr || String(new Date().getFullYear())}/${num}`;
}
