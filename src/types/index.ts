// ══════════════════════════════════════════════
// VGuide — Illinois State Board of Elections
// Voters' Guide Application
// ══════════════════════════════════════════════

// Shared TypeScript types for the application

// ──────────────────────────────────
// Enum types (mirroring Prisma enums)
// ──────────────────────────────────

export type ElectionType = "general" | "primary" | "special" | "runoff";
export type ElectionStatus = "draft" | "open" | "closed" | "archived";
export type SubmissionStatus =
  | "pending_review"
  | "approved"
  | "denied"
  | "changes_requested"
  | "superseded";
export type LanguageCode =
  | "en"
  | "es"
  | "pl"
  | "zh"
  | "ar"
  | "hi"
  | "ur"
  | "ko"
  | "vi"
  | "tl";
export type AdminAction =
  | "submission_approved"
  | "submission_denied"
  | "changes_requested"
  | "note_added"
  | "profile_picture_updated"
  | "submission_resubmitted"
  | "system_config_updated"
  | "election_window_changed"
  | "candidate_account_suspended"
  | "candidate_account_reactivated"
  | "placeholder_updated";

// ──────────────────────────────────
// API Response types
// ──────────────────────────────────

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ──────────────────────────────────
// Frontend-specific types
// ──────────────────────────────────

export type CandidateSearchParams = {
  electionId?: string;
  officeId?: string;
  party?: string;
  languageCode?: LanguageCode;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type SubmissionAction = "approve" | "deny" | "request_changes" | "note";

export type SystemAvailability = {
  isOpen: boolean;
  message: string;
  overrideEnabled: boolean;
};

// ──────────────────────────────────
// Status badge config
// ──────────────────────────────────

export const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; color: "green" | "red" | "yellow" | "gray" | "blue" }
> = {
  pending_review: { label: "Pending Review", color: "yellow" },
  approved: { label: "Approved", color: "green" },
  denied: { label: "Denied", color: "red" },
  changes_requested: { label: "Changes Requested", color: "yellow" },
  superseded: { label: "Superseded", color: "gray" },
};

// ──────────────────────────────────
// Language display names
// ──────────────────────────────────

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  es: "Español",
  pl: "Polski",
  zh: "中文",
  ar: "العربية",
  hi: "हिन्दी",
  ur: "اردو",
  ko: "한국어",
  vi: "Tiếng Việt",
  tl: "Tagalog",
};
