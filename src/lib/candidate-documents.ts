import type { AcademicLevel, CandidateDocuments, UploadedDocumentFile } from "./acs-types";

export const ACADEMIC_LEVELS: readonly AcademicLevel[] = ["10th", "12th", "Graduation", "Masters"] as const;

export type SimpleDocumentKey =
  | "aadharCard"
  | "panCard"
  | "bankDetails"
  | "voterId"
  | "colorPhoto"
  | "pcc"
  | "mfc"
  | "characterCertificate"
  | "previousExperienceProof"
  | "otherDocument";

export type DocumentChecklistKey = SimpleDocumentKey | "academicQualification" | "previousEsiPf";

export interface DocumentChecklistItemMeta {
  key: DocumentChecklistKey;
  label: string;
  subtitle: string;
  required: boolean;
  accept: string;
}

export const CANDIDATE_DOCUMENT_CHECKLIST: readonly DocumentChecklistItemMeta[] = [
  {
    key: "aadharCard",
    label: "Aadhar Card",
    subtitle: "Front & back copy (PDF / Image)",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "panCard",
    label: "PAN Card",
    subtitle: "Permanent Account Number card",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "bankDetails",
    label: "Bank Passbook / Cheque",
    subtitle: "Account number & IFSC proof",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "voterId",
    label: "Voter ID Card",
    subtitle: "EPIC card copy",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "academicQualification",
    label: "Academic Qualification",
    subtitle: "10th, 12th, Graduation, Masters",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "colorPhoto",
    label: "Color Photo",
    subtitle: "Recent passport-size photograph",
    required: true,
    accept: "image/*",
  },
  {
    key: "pcc",
    label: "PCC (Police Clearance)",
    subtitle: "Police Clearance Certificate",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "mfc",
    label: "MFC (Medical Fitness)",
    subtitle: "Medical Fitness Certificate",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "characterCertificate",
    label: "Character Certificate",
    subtitle: "Authorized by Local Councillor / MLA",
    required: true,
    accept: "image/*,.pdf",
  },
  {
    key: "previousEsiPf",
    label: "Previous ESI / PF",
    subtitle: "If available: ESI No, PF/UAN No & proof",
    required: false,
    accept: "image/*,.pdf",
  },
  {
    key: "previousExperienceProof",
    label: "Previous Experience Proof",
    subtitle: "If experienced: relieving / service letter",
    required: false,
    accept: "image/*,.pdf",
  },
  {
    key: "otherDocument",
    label: "Other Document",
    subtitle: "Any optional supporting document",
    required: false,
    accept: "image/*,.pdf",
  },
];

export const REQUIRED_DOCUMENT_COUNT = CANDIDATE_DOCUMENT_CHECKLIST.filter((d) => d.required).length;

export function hasUploadedFile(file?: Partial<UploadedDocumentFile> | null): file is UploadedDocumentFile {
  return Boolean(file && file.fileUrl && file.fileName);
}

export function getAcademicDocsCount(docs?: CandidateDocuments): number {
  const acad = docs?.academicQualification;
  if (!acad) return 0;
  return ACADEMIC_LEVELS.filter((lvl) => hasUploadedFile(acad[lvl])).length;
}

export function getMissingRequiredDocuments(docs?: CandidateDocuments): DocumentChecklistItemMeta[] {
  return CANDIDATE_DOCUMENT_CHECKLIST.filter((item) => {
    if (!item.required) return false;
    if (item.key === "academicQualification") {
      return getAcademicDocsCount(docs) === 0;
    }
    if (item.key === "previousEsiPf") {
      return !hasUploadedFile(docs?.previousEsiPf);
    }
    return !hasUploadedFile(docs?.[item.key]);
  });
}
