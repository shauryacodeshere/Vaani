/**
 * VaaniReach TypeScript Contracts.
 *
 * Generated directly from and mirroring shared/schemas/*.json
 * and backend/app/schemas.py character-for-character.
 *
 * LOCKED CONTRACT — Never rename or alter fields to camelCase.
 */

// --------------------------------------------------------------------------
// L1 — Source document & Scraper types
// --------------------------------------------------------------------------

export type DocumentOrigin = "upload" | "url";

export interface SourceDocument {
  doc_id?: string;
  title: string;
  raw_text: string;
  origin?: DocumentOrigin;
  origin_ref?: string | null;
}

export interface ScrapedNotice {
  id: string;
  title: string;
  url?: string;
  date?: string;
  category?: string;
  department?: string;
  summary?: string;
  raw_text?: string;
}

// --------------------------------------------------------------------------
// L4 — Facts (Extraction Agent output)
// --------------------------------------------------------------------------

export type FactType = "date" | "number" | "name" | "policy" | "location" | "other";

export const STRICT_FACT_TYPES: readonly FactType[] = ["date", "number", "name", "location"] as const;

export interface Fact {
  /** Fact identifier, e.g. "f1" */
  id: string;
  /** One atomic claim. Never a compound sentence. */
  claim: string;
  /** Classification of fact type */
  type?: FactType;
  /** Verbatim text this claim was extracted from. Mandatory evidence span. */
  source_span: string;
}

export interface ExtractionResult {
  doc_id: string;
  title: string;
  summary: string;
  facts: Fact[];
}

// --------------------------------------------------------------------------
// L4 — Script (Script Writer Agent output)
// --------------------------------------------------------------------------

export interface Scene {
  /** Stable identifier across repair cycles (e.g. "s1") */
  scene_id: string;
  /** Narration spoken text for this scene */
  text: string;
  /** Fact IDs this scene draws upon */
  referenced_fact_ids?: string[];
  /** Visual keyword tags for image generation/retrieval */
  visual_keywords?: string[];
}

export interface Script {
  /** Generated server-side (scr_xxxxxxxx) */
  script_id?: string;
  /** Job ID this script belongs to */
  job_id: string;
  /** ISO 639-1 language code: hi, mr, ta, bn, te, kn, ml, gu, pa, or, en */
  language: string;
  /** Narration scenes in chronological order */
  scenes: Scene[];
}

// --------------------------------------------------------------------------
// L4 — Verification (Verifier Agent output)
// --------------------------------------------------------------------------

export type Verdict = "SUPPORTED" | "CONTRADICTED" | "UNVERIFIABLE" | "NEEDS_HUMAN_REVIEW";

export interface FactCheck {
  /** Scene ID the claim originated from */
  claim_id: string;
  /** Exact text of the claim that was verified */
  claim_text: string;
  /** Fact verification verdict */
  verdict: Verdict;
  /** Confidence score between 0.0 and 1.0 */
  confidence?: number;
  /** Source span supporting or contradicting the claim */
  evidence_span?: string;
  /** Fact.id the evidence was mapped from (null if unverifiable) */
  evidence_fact_id?: string | null;
  /** Reason for rejection or escalation */
  reason?: string;
  /** Repair attempt number (1-3) */
  attempt?: number;
}

export interface VerifiedScript {
  script: Script;
  checks: FactCheck[];
  status: "APPROVED" | "NEEDS_HUMAN_REVIEW";
}

// --------------------------------------------------------------------------
// L3 — Media assets & Voice config
// --------------------------------------------------------------------------

export interface VoiceConfig {
  language: string;
  voice?: string;
  style?: string;
  speed?: number;
}

export interface SceneTiming {
  scene_id: string;
  start_sec: number;
  end_sec: number;
}

export interface AudioAsset {
  path: string;
  duration_sec: number;
  timings: SceneTiming[];
  provider: string;
}

export interface ImageAsset {
  scene_id: string;
  path: string;
  provider: string;
  is_fallback?: boolean;
}

// --------------------------------------------------------------------------
// L5 — Job State Machine & Orchestration
// --------------------------------------------------------------------------

export type Stage =
  | "queued"
  | "extracting"
  | "scripting"
  | "verifying"
  | "generating_media"
  | "assembling"
  | "pending_review"
  | "approved"
  | "rejected"
  | "failed";

export const STAGES: readonly Stage[] = [
  "queued",
  "extracting",
  "scripting",
  "verifying",
  "generating_media",
  "assembling",
  "pending_review",
  "approved",
  "rejected",
  "failed",
] as const;

export const TRANSITIONS: Record<Stage, readonly Stage[]> = {
  queued: ["extracting", "failed"],
  extracting: ["scripting", "failed"],
  scripting: ["verifying", "failed"],
  verifying: ["scripting", "generating_media", "failed"],
  generating_media: ["assembling", "failed"],
  assembling: ["pending_review", "failed"],
  pending_review: ["approved", "rejected", "scripting"],
  approved: [],
  rejected: [],
  failed: [],
} as const;

export interface VideoResult {
  language: string;
  video_path: string;
  captions_path: string;
  duration_sec: number;
}

export interface Job {
  job_id: string;
  doc_id: string;
  languages: string[];
  stage: Stage;
  progress: Record<string, string>;
  created_at?: string;
  error?: string | null;
  videos?: VideoResult[];
  review_notes?: string;
}

export interface JobStatus {
  /** L5 -> L6 WebSocket payload */
  job_id: string;
  stage: Stage;
  languages: string[];
  progress: Record<string, string>;
  error?: string | null;
}

// --------------------------------------------------------------------------
// UI & Language Metadata Helpers
// --------------------------------------------------------------------------

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "en", name: "English", nativeName: "English" },
];
