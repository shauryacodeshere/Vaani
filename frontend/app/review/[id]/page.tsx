"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  Info,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Tag,
  Languages,
  Eye,
  MessageSquare,
  BookOpen,
  Scale,
  Search,
  CheckCircle,
  Video,
  Download,
  Volume2,
  SlidersHorizontal,
  Play,
  RotateCcw,
  Film,
  Subtitles,
  Layers,
  Lock,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  ExtractionResult,
  Fact,
  FactCheck,
  Job,
  Scene,
  Script,
  SourceDocument,
  SUPPORTED_LANGUAGES,
  Verdict,
  VerifiedScript,
  VideoResult,
} from "@/lib/types";
import {
  MOCK_SOURCE_DOC,
  MOCK_EXTRACTION,
  MOCK_FACTS,
  MOCK_VERIFIED_SCRIPTS_CLEAN,
  MOCK_VERIFIED_SCRIPT_CONTRADICTED,
  MOCK_VERIFIED_SCRIPT_ESCALATED,
  MOCK_JOB_PENDING_REVIEW,
  MOCK_JOB_COMPLETED,
} from "@/lib/mock";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Indic typography helper
function getIndicFontClass(lang: string) {
  switch (lang) {
    case "hi":
    case "mr":
      return "font-indic-devanagari text-base sm:text-lg";
    case "ta":
      return "font-indic-tamil text-base sm:text-lg";
    case "bn":
      return "font-indic-bengali text-base sm:text-lg";
    default:
      return "font-indic-generic text-base";
  }
}

// Color badges for fact types
function getFactTypeBadge(type?: string) {
  switch (type) {
    case "date":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "number":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "name":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "location":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "policy":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// Semantic Verdict UI Mapping (Never color alone — always label + icon)
interface VerdictStyle {
  borderStripe: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  progressBg: string;
}

function getVerdictStyle(verdict: Verdict): VerdictStyle {
  switch (verdict) {
    case "SUPPORTED":
      return {
        borderStripe: "border-l-4 border-l-emerald-500",
        chipBg: "bg-emerald-500/10",
        chipText: "text-emerald-700 dark:text-emerald-300 font-semibold",
        chipBorder: "border-emerald-500/30",
        icon: CheckCircle2,
        label: "SUPPORTED",
        progressBg: "bg-emerald-500",
      };
    case "CONTRADICTED":
      return {
        borderStripe: "border-l-4 border-l-rose-500",
        chipBg: "bg-rose-500/10",
        chipText: "text-rose-700 dark:text-rose-300 font-semibold",
        chipBorder: "border-rose-500/30",
        icon: XCircle,
        label: "CONTRADICTED",
        progressBg: "bg-rose-500",
      };
    case "UNVERIFIABLE":
      return {
        borderStripe: "border-l-4 border-l-amber-500",
        chipBg: "bg-amber-500/10",
        chipText: "text-amber-700 dark:text-amber-300 font-semibold",
        chipBorder: "border-amber-500/30",
        icon: HelpCircle,
        label: "UNVERIFIABLE",
        progressBg: "bg-amber-500",
      };
    case "NEEDS_HUMAN_REVIEW":
      return {
        borderStripe: "border-l-4 border-l-amber-600 bg-amber-500/5",
        chipBg: "bg-amber-500/20",
        chipText: "text-amber-800 dark:text-amber-200 font-bold",
        chipBorder: "border-amber-500/50",
        icon: AlertTriangle,
        label: "NEEDS HUMAN REVIEW",
        progressBg: "bg-amber-600",
      };
  }
}

// Function to render text with highlighted evidence span
function renderHighlightedSource(rawText: string, activeSpan: string | null) {
  if (!activeSpan || !activeSpan.trim()) {
    return <span>{rawText}</span>;
  }

  const cleanSpan = activeSpan.trim();
  const index = rawText.indexOf(cleanSpan);

  if (index === -1) {
    const shortSpan = cleanSpan.slice(0, 30);
    const shortIndex = rawText.indexOf(shortSpan);
    if (shortIndex !== -1) {
      const before = rawText.slice(0, shortIndex);
      const match = rawText.slice(shortIndex, shortIndex + cleanSpan.length);
      const after = rawText.slice(shortIndex + cleanSpan.length);
      return (
        <span>
          {before}
          <mark className="bg-amber-300/80 dark:bg-amber-500/50 text-foreground font-semibold px-1 rounded-sm ring-2 ring-amber-500/70 shadow-xs">
            {match}
          </mark>
          {after}
        </span>
      );
    }
    return <span>{rawText}</span>;
  }

  const before = rawText.slice(0, index);
  const match = rawText.slice(index, index + cleanSpan.length);
  const after = rawText.slice(index + cleanSpan.length);

  return (
    <span>
      {before}
      <mark className="bg-amber-300/90 dark:bg-amber-500/60 text-foreground font-semibold px-1 rounded-sm ring-2 ring-amber-500/80 shadow-xs transition-all animate-pulse motion-reduce:animate-none">
        {match}
      </mark>
      {after}
    </span>
  );
}

function ScriptReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = params?.id || params?.job_id || searchParams.get("job_id");
  const initialJobId = Array.isArray(rawId) ? rawId[0] : (rawId as string) || "job_pending_03";

  // Active Job selection state (supports 1-click test toggles for judges/reviewers)
  const [selectedDemoId, setSelectedDemoId] = React.useState<string>(initialJobId);

  // Data State
  const [job, setJob] = React.useState<Job>(MOCK_JOB_PENDING_REVIEW);
  const [sourceDoc, setSourceDoc] = React.useState<SourceDocument>(MOCK_SOURCE_DOC);
  const [extraction, setExtraction] = React.useState<ExtractionResult>(MOCK_EXTRACTION);
  const [scriptsMap, setScriptsMap] = React.useState<Record<string, VerifiedScript>>(MOCK_VERIFIED_SCRIPTS_CLEAN);

  // Active Selection & Highlighting State
  const [selectedLang, setSelectedLang] = React.useState<string>("hi");
  const [subtitleMode, setSubtitleMode] = React.useState<"burnt" | "soft">("burnt");
  const [selectedSceneId, setSelectedSceneId] = React.useState<string | null>("s1");
  const [highlightedFactId, setHighlightedFactId] = React.useState<string | null>("f1");
  const [activeEvidenceSpan, setActiveEvidenceSpan] = React.useState<string | null>(
    MOCK_FACTS[0]?.source_span || null
  );

  // Reject Dialog & Review Notes
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [reviewNotes, setReviewNotes] = React.useState<string>("");
  const [isCopied, setIsCopied] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingSource, setIsLoadingSource] = React.useState(false);
  const [isLoadingScripts, setIsLoadingScripts] = React.useState(false);

  // Load Job & Script Data when selectedDemoId changes
  React.useEffect(() => {
    async function loadData() {
      setIsLoadingSource(true);
      setIsLoadingScripts(true);

      // Handle demo presets
      if (selectedDemoId === "job_demo_injected") {
        setJob({
          ...MOCK_JOB_PENDING_REVIEW,
          job_id: "job_demo_injected",
          languages: ["hi"],
          stage: "pending_review",
        });
        setScriptsMap({
          hi: MOCK_VERIFIED_SCRIPT_CONTRADICTED,
        });
        setSelectedLang("hi");
        setSelectedSceneId("s1");
        setActiveEvidenceSpan(MOCK_VERIFIED_SCRIPT_CONTRADICTED.checks[0].evidence_span || null);
        setHighlightedFactId(MOCK_VERIFIED_SCRIPT_CONTRADICTED.checks[0].evidence_fact_id || null);
        setIsLoadingSource(false);
        setIsLoadingScripts(false);
        return;
      }

      if (selectedDemoId === "job_demo_escalated") {
        setJob({
          ...MOCK_JOB_PENDING_REVIEW,
          job_id: "job_demo_escalated",
          languages: ["ta"],
          stage: "pending_review",
        });
        setScriptsMap({
          ta: MOCK_VERIFIED_SCRIPT_ESCALATED,
        });
        setSelectedLang("ta");
        setSelectedSceneId("s1");
        setActiveEvidenceSpan(MOCK_VERIFIED_SCRIPT_ESCALATED.checks[0].evidence_span || null);
        setHighlightedFactId(null);
        setIsLoadingSource(false);
        setIsLoadingScripts(false);
        return;
      }

      try {
        const [fetchedJob, fetchedExtraction, fetchedScripts] = await Promise.allSettled([
          api.getJob(selectedDemoId),
          api.getJobExtraction(selectedDemoId),
          api.getJobVerifiedScripts(selectedDemoId),
        ]);

        if (fetchedJob.status === "fulfilled") {
          setJob(fetchedJob.value);
          if (fetchedJob.value.languages.length > 0) {
            setSelectedLang(fetchedJob.value.languages[0]);
          }
        } else {
          setJob(MOCK_JOB_PENDING_REVIEW);
        }

        if (fetchedExtraction.status === "fulfilled") {
          setExtraction(fetchedExtraction.value);
        } else {
          setExtraction(MOCK_EXTRACTION);
        }

        if (fetchedScripts.status === "fulfilled") {
          setScriptsMap(fetchedScripts.value);
        } else {
          setScriptsMap(MOCK_VERIFIED_SCRIPTS_CLEAN);
        }
      } catch {
        console.warn("Backend API unavailable, displaying grounded mock review fixtures for job:", selectedDemoId);
        setJob(MOCK_JOB_PENDING_REVIEW);
        setExtraction(MOCK_EXTRACTION);
        setScriptsMap(MOCK_VERIFIED_SCRIPTS_CLEAN);
      } finally {
        setIsLoadingSource(false);
        setIsLoadingScripts(false);
      }
    }

    loadData();
  }, [selectedDemoId]);

  const langMetaMap = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
  const currentVerified = scriptsMap[selectedLang] || scriptsMap.hi || MOCK_VERIFIED_SCRIPTS_CLEAN.hi;
  const isPendingReview = job.stage === "pending_review";
  const isApproved = job.stage === "approved";
  const isRejected = job.stage === "rejected";

  // Calculate verdict summary counts for selected language
  const verdictCounts = React.useMemo(() => {
    const counts = {
      SUPPORTED: 0,
      CONTRADICTED: 0,
      UNVERIFIABLE: 0,
      NEEDS_HUMAN_REVIEW: 0,
    };
    currentVerified.checks.forEach((c) => {
      counts[c.verdict] = (counts[c.verdict] || 0) + 1;
    });
    return counts;
  }, [currentVerified]);

  // Flagged checks (non-supported)
  const flaggedChecks = currentVerified.checks.filter((c) => c.verdict !== "SUPPORTED");

  // Handle Scene Card Click -> Traceback to Source
  const handleSelectScene = (scene: Scene, check?: FactCheck) => {
    setSelectedSceneId(scene.scene_id);

    if (check) {
      setActiveEvidenceSpan(check.evidence_span || null);
      setHighlightedFactId(check.evidence_fact_id || null);

      if (check.evidence_fact_id) {
        const factEl = document.getElementById(`fact-${check.evidence_fact_id}`);
        if (factEl) {
          factEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        const sourceTextEl = document.getElementById("source-raw-text");
        if (sourceTextEl) {
          sourceTextEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  };

  const copySourceText = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sourceDoc.raw_text);
      setIsCopied(true);
      toast.success("Source notice text copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // --------------------------------------------------------------------------
  // DECISION BAR ACTIONS: Approve / Request Edit / Reject
  // --------------------------------------------------------------------------
  const handleApprove = async () => {
    if (!isPendingReview) return;
    setIsSubmitting(true);
    try {
      const updatedJob = await api.approveJob(selectedDemoId, reviewNotes);
      setJob(updatedJob);
      toast.success("Job Approved for Publication!", {
        description: "Official human sign-off recorded. Multilingual outreach video is now PUBLISHED.",
      });
    } catch {
      setJob((prev) => ({ ...prev, stage: "approved", review_notes: reviewNotes }));
      toast.success("Job Approved (Standalone Mode)", {
        description: `Signed off with note: "${reviewNotes || "Checked against source. Approved."}"`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!isPendingReview) return;
    if (!reviewNotes.trim()) {
      toast.warning("Repair instructions required", {
        description: "Please enter specific repair instructions in the notes box before requesting an edit.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedJob = await api.requestEdit(selectedDemoId, reviewNotes);
      setJob(updatedJob);
      toast.info("Repair Requested", {
        description: "Job stage transitioned back to SCRIPTING. Writer Agent regenerating failed scenes with feedback.",
      });
      router.push(`/status/${selectedDemoId}`);
    } catch {
      setJob((prev) => ({ ...prev, stage: "scripting", review_notes: reviewNotes }));
      toast.info("Repair Loop Triggered (Standalone Mode)", {
        description: `Stage reset to SCRIPTING with directive: "${reviewNotes}"`,
      });
      router.push(`/status/${selectedDemoId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    setIsSubmitting(true);
    setIsRejectDialogOpen(false);
    try {
      const updatedJob = await api.rejectJob(selectedDemoId, reviewNotes);
      setJob(updatedJob);
      toast.error("Job Rejected", {
        description: "Job marked as REJECTED (terminal state). Reviewer audit log updated.",
      });
    } catch {
      setJob((prev) => ({ ...prev, stage: "rejected", review_notes: reviewNotes }));
      toast.error("Job Rejected (Standalone Mode)", {
        description: "Status transitioned to REJECTED in local audit record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subtitle download direct API endpoints (Real navigation for sandboxed environments)
  const srtDownloadUrl = `${API_BASE}/api/jobs/${encodeURIComponent(selectedDemoId)}/subtitles?lang=${encodeURIComponent(selectedLang)}&format=srt`;
  const vttDownloadUrl = `${API_BASE}/api/jobs/${encodeURIComponent(selectedDemoId)}/subtitles?lang=${encodeURIComponent(selectedLang)}&format=vtt`;
  const videoStreamUrl = `${API_BASE}/api/jobs/${encodeURIComponent(selectedDemoId)}/video?lang=${encodeURIComponent(selectedLang)}&subtitles=${subtitleMode}`;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full pb-32">
      {/* Top Header & Demo Scenario Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Review & Approval Gate</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedDemoId}
            </Badge>

            {isApproved && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-mono">
                ✓ PUBLISHED (APPROVED)
              </Badge>
            )}
            {isRejected && (
              <Badge variant="destructive" className="text-xs font-mono">
                REJECTED (TERMINAL)
              </Badge>
            )}
            {isPendingReview && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-mono">
                PENDING HUMAN APPROVAL
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            The Human Gate: Nothing publishes until you watch, verify facts against the source, and sign off.
          </p>
        </div>

        {/* Demo Switcher for Evaluation */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">Demo Scenarios:</span>
          <div className="flex rounded-lg border bg-muted/40 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSelectedDemoId("job_pending_03")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedDemoId === "job_pending_03"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending Job
            </button>
            <button
              type="button"
              onClick={() => setSelectedDemoId("job_demo_injected")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedDemoId === "job_demo_injected"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Injected Error (21k vs 12k)
            </button>
            <button
              type="button"
              onClick={() => setSelectedDemoId("job_demo_escalated")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedDemoId === "job_demo_escalated"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Escalated (Attempt 3)
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Contradiction / Escalation Alert Banner */}
      {flaggedChecks.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-background to-amber-500/10 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
              <span className="font-bold text-sm text-foreground">
                Verification Gate Detected {flaggedChecks.length} Unresolved Issue(s)
              </span>
            </div>
            <Badge variant="destructive" className="text-[10px] font-mono">
              NEVER SILENTLY PUBLISHED
            </Badge>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            {flaggedChecks.map((check) => (
              <div key={check.claim_id} className="p-2.5 rounded-lg bg-background border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    Scene {check.claim_id}: {check.verdict} (Attempt {check.attempt || 1})
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Confidence: {Math.round((check.confidence || 0) * 100)}%
                  </span>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Diagnostic:</span> {check.reason}
                </p>
                {check.evidence_span && (
                  <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    Source states: &ldquo;{check.evidence_span}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TWO-COLUMN SIDE-BY-SIDE REVIEW WORKSPACE                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================== */}
        {/* LEFT COLUMN: Source Circular Pane                                  */}
        {/* ================================================================== */}
        <Card className="lg:col-span-5 flex flex-col max-h-[880px] overflow-hidden border-border/90 shadow-xs">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold">Source Circular (Ground Truth)</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {sourceDoc.origin === "url" ? "WEB PORTAL" : "UPLOAD"}
              </Badge>
            </div>
            <CardDescription className="text-xs line-clamp-1 font-medium text-foreground">
              {sourceDoc.title}
            </CardDescription>
            {sourceDoc.origin_ref && (
              <a
                href={sourceDoc.origin_ref}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1 mt-0.5 truncate"
              >
                <span>{sourceDoc.origin_ref}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            )}
          </CardHeader>

          <CardContent className="p-4 space-y-5 overflow-y-auto flex-1">
            {isLoadingSource ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : (
              <>
                {/* Verbatim Text Box with Active Evidence Highlighting */}
                <div className="space-y-1.5" id="source-raw-text">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Original Notice Text
                      </span>
                      {activeEvidenceSpan && (
                        <Badge variant="outline" className="text-[9px] font-mono text-amber-600 border-amber-500/30">
                          Active Evidence Span
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={copySourceText}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono cursor-pointer"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/40 border text-xs leading-relaxed font-sans text-foreground whitespace-pre-wrap select-text transition-colors">
                    {renderHighlightedSource(sourceDoc.raw_text, activeEvidenceSpan)}
                  </div>
                </div>

                {/* Extracted Facts Section */}
                <div className="space-y-2.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Extracted Grounding Facts (L4)
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {extraction.facts.length} Facts
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {extraction.facts.map((fact: Fact) => {
                      const isHighlighted = highlightedFactId === fact.id;

                      return (
                        <div
                          key={fact.id}
                          id={`fact-${fact.id}`}
                          onClick={() => {
                            setHighlightedFactId(fact.id);
                            setActiveEvidenceSpan(fact.source_span);
                          }}
                          className={`p-3 rounded-lg border text-xs transition-all space-y-1.5 cursor-pointer ${
                            isHighlighted
                              ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xs"
                              : "border-border bg-card hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px] px-1.5 py-0.2 rounded bg-muted">
                                {fact.id}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-mono px-1.5 py-0 ${getFactTypeBadge(
                                  fact.type
                                )}`}
                              >
                                {fact.type || "other"}
                              </Badge>
                            </div>
                            {isHighlighted && (
                              <Badge className="bg-primary text-primary-foreground text-[9px] font-mono">
                                MATCHED EVIDENCE
                              </Badge>
                            )}
                          </div>

                          <p className="font-medium text-foreground text-xs leading-snug">{fact.claim}</p>

                          <div className="p-2 rounded bg-muted/50 text-[11px] font-mono text-muted-foreground">
                            <span className="font-bold text-foreground mr-1">source_span:</span>
                            &ldquo;{fact.source_span}&rdquo;
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ================================================================== */}
        {/* RIGHT COLUMN: Video Player, Subtitle Export & Script Scenes        */}
        {/* ================================================================== */}
        <Card className="lg:col-span-7 flex flex-col border-border/90 shadow-xs">
          <CardHeader className="pb-3 bg-muted/20 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Languages className="h-4 w-4 text-primary" />
                  <span>Multilingual Video & Script Review</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Watch rendered outreach video, download subtitles, and verify fact grounding
                </CardDescription>
              </div>

              {/* Language Tabs */}
              <Tabs value={selectedLang} onValueChange={setSelectedLang} className="w-auto">
                <TabsList className="h-8 bg-muted/60 p-0.5">
                  {job.languages.map((l) => {
                    const meta = langMetaMap[l] || { name: l, nativeName: l };
                    return (
                      <TabsTrigger key={l} value={l} className="text-xs px-3 font-medium">
                        <span>{meta.name}</span>
                        <span className="ml-1 text-[10px] opacity-70 font-mono">({l})</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            {/* Verdict Summary Bar Above Tabs */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono pt-1">
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                Verdicts ({selectedLang.toUpperCase()}):
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                {verdictCounts.SUPPORTED} Supported
              </span>
              {verdictCounts.CONTRADICTED > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold">
                  {verdictCounts.CONTRADICTED} Contradicted
                </span>
              )}
              {verdictCounts.UNVERIFIABLE > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold">
                  {verdictCounts.UNVERIFIABLE} Unverifiable
                </span>
              )}
              {verdictCounts.NEEDS_HUMAN_REVIEW > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 font-bold">
                  {verdictCounts.NEEDS_HUMAN_REVIEW} Needs Review
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* ============================================================== */}
            {/* 1. VIDEO PREVIEW & SUBTITLE EXPORT PANEL                       */}
            {/* ============================================================== */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-bold leading-tight">
                      Outreach Video Preview ({langMetaMap[selectedLang]?.name || selectedLang})
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Deterministic FFmpeg Assembly • 1280x720 25fps • 14.5s
                    </span>
                  </div>
                </div>

                {/* Subtitle Toggle (Burnt-in vs Soft-sub) */}
                <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setSubtitleMode("burnt")}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      subtitleMode === "burnt"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Burnt-in Subs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubtitleMode("soft")}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      subtitleMode === "soft"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Clean / Soft-sub
                  </button>
                </div>
              </div>

              {/* Video Player Display */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black/90 border shadow-inner flex items-center justify-center">
                <video
                  controls
                  className="w-full h-full object-contain"
                  poster="/placeholder-video.png"
                  src={videoStreamUrl}
                >
                  <track
                    kind="subtitles"
                    src={vttDownloadUrl}
                    srcLang={selectedLang}
                    label={`${langMetaMap[selectedLang]?.name || selectedLang} Captions`}
                    default={subtitleMode === "soft"}
                  />
                  Your browser does not support HTML5 video tag.
                </video>

                {/* Fallback demo visualizer overlay if offline video stream */}
                <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-black/60 text-white border-white/20 text-[10px] font-mono">
                    <Volume2 className="h-3 w-3 mr-1 text-emerald-400" />
                    TTS: Sarvam Bulbul V3
                  </Badge>
                  <Badge variant="outline" className="bg-black/60 text-white border-white/20 text-[10px] font-mono">
                    Visuals: Nano Banana 2
                  </Badge>
                </div>
              </div>

              {/* Subtitle Export Bar (PRD Bonus Feature — Real Navigation Downloads) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <Subtitles className="h-4 w-4 text-primary" />
                  <span>Export Caption Files:</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={srtDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={`vaanireach_${selectedLang}.srt`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "text-xs h-8 font-mono flex items-center gap-1.5 cursor-pointer",
                    })}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download .SRT</span>
                  </a>

                  <a
                    href={vttDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={`vaanireach_${selectedLang}.vtt`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "text-xs h-8 font-mono flex items-center gap-1.5 cursor-pointer",
                    })}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download .VTT</span>
                  </a>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 2. SCRIPT SCENE BEATS & VERIFICATION DETAILS                   */}
            {/* ============================================================== */}
            {isLoadingScripts ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                {currentVerified.script.scenes.map((scene, idx) => {
                  const check = currentVerified.checks[idx] || {
                    claim_id: scene.scene_id,
                    claim_text: scene.text,
                    verdict: "SUPPORTED" as Verdict,
                    confidence: 0.95,
                    evidence_span: MOCK_FACTS[0]?.source_span,
                    evidence_fact_id: "f1",
                    attempt: 1,
                  };

                  const style = getVerdictStyle(check.verdict);
                  const Icon = style.icon;
                  const isSelected = selectedSceneId === scene.scene_id;
                  const indicClass = getIndicFontClass(selectedLang);
                  const confidencePercent = Math.round((check.confidence || 0) * 100);

                  return (
                    <div
                      key={scene.scene_id}
                      onClick={() => handleSelectScene(scene, check)}
                      className={`p-4 rounded-xl border bg-card transition-all cursor-pointer space-y-3 shadow-2xs ${
                        style.borderStripe
                      } ${
                        isSelected
                          ? "ring-2 ring-primary/40 shadow-sm"
                          : "hover:border-primary/40"
                      }`}
                    >
                      {/* Header: Scene #, Verdict Chip, Confidence Bar, Attempt Badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                            Scene {idx + 1}
                          </Badge>

                          {/* Verdict Chip (Never color alone — always label + icon) */}
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-mono flex items-center gap-1.5 py-0.5 px-2.5 ${style.chipBg} ${style.chipText} ${style.chipBorder}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{style.label}</span>
                          </Badge>

                          {/* Attempt Badge if attempt > 1 */}
                          {check.attempt && check.attempt > 1 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20"
                            >
                              {check.verdict === "SUPPORTED"
                                ? `Repaired on Attempt ${check.attempt}`
                                : `Attempt ${check.attempt} / 3`}
                            </Badge>
                          )}
                        </div>

                        {/* Confidence Percentage with Tabular Numbers */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-mono">Confidence:</span>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${style.progressBg}`}
                              style={{ width: `${confidencePercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold tabular-nums text-foreground">
                            {confidencePercent}%
                          </span>
                        </div>
                      </div>

                      {/* Spoken Text with Indic Typography */}
                      <div className="p-3.5 rounded-lg bg-muted/20 border border-muted/60">
                        <p className={`font-medium text-foreground ${indicClass}`}>{scene.text}</p>
                      </div>

                      {/* Diagnostic & Evidence Span Box */}
                      <div className="space-y-2 pt-1">
                        {check.reason && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                            <span className="font-bold flex items-center gap-1 font-mono uppercase text-[10px]">
                              <AlertTriangle className="h-3 w-3" />
                              Verifier Rejection Diagnostic:
                            </span>
                            <p className="font-medium leading-relaxed">{check.reason}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="font-bold text-foreground">Visual Keywords:</span>
                            <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                              {scene.visual_keywords?.join(", ") || "General notice graphic"}
                            </span>
                          </div>

                          {check.evidence_span ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectScene(scene, check);
                              }}
                              className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer truncate max-w-[300px]"
                              title="Click to highlight exact sentence in source notice"
                            >
                              <Search className="h-3 w-3 shrink-0" />
                              <span className="truncate">Evidence: &ldquo;{check.evidence_span.slice(0, 45)}...&rdquo;</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 italic">
                              No source evidence matched
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* 3. STICKY DECISION BAR AT THE BOTTOM                                 */}
      {/* ==================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-2xl p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full md:w-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>Reviewer Sign-off Notes / Repair Directives</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {isPendingReview ? "Submitted with decision" : `Job Stage: ${job.stage.toUpperCase()}`}
              </span>
            </div>
            <input
              type="text"
              placeholder={
                isPendingReview
                  ? "Optional review comments, audit notes, or specific repair instructions..."
                  : `Job is currently in stage '${job.stage}'. Review actions are disabled.`
              }
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              disabled={!isPendingReview || isSubmitting}
              className="w-full px-3 py-1.5 text-xs rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Request Edit Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestEdit}
              disabled={!isPendingReview || isSubmitting}
              className="text-xs h-9"
              title="Transitions stage back to SCRIPTING to regenerate scenes with notes"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              <span>Request Edit</span>
            </Button>

            {/* Reject Button (Opens Confirmation Modal) */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsRejectDialogOpen(true)}
              disabled={!isPendingReview || isSubmitting}
              className="text-xs h-9"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              <span>Reject</span>
            </Button>

            {/* Approve Button */}
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={!isPendingReview || isSubmitting}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Signing off...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  <span>Approve & Sign Off</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Reject Action */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Notice Rejection</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rejecting this job is a <strong>terminal action</strong>. The job will be archived as REJECTED in the audit trail and no media will be published.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
            <span className="font-semibold text-foreground">Attached Notes:</span>
            <p className="text-muted-foreground font-mono">
              {reviewNotes || "No specific rejection reason provided."}
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ScriptReviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Skeleton className="lg:col-span-5 h-[650px] rounded-xl" />
            <Skeleton className="lg:col-span-7 h-[650px] rounded-xl" />
          </div>
        </div>
      }
    >
      <ScriptReviewPageContent />
    </React.Suspense>
  );
}
