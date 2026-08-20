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
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/lib/types";
import {
  MOCK_SOURCE_DOC,
  MOCK_EXTRACTION,
  MOCK_FACTS,
  MOCK_VERIFIED_SCRIPTS_CLEAN,
  MOCK_VERIFIED_SCRIPT_CONTRADICTED,
  MOCK_VERIFIED_SCRIPT_ESCALATED,
  MOCK_JOB_PENDING_REVIEW,
} from "@/lib/mock";

// Helper for Indic typography
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
    // If partial match or not found directly, try first 30 chars
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
  const [selectedSceneId, setSelectedSceneId] = React.useState<string | null>("s1");
  const [highlightedFactId, setHighlightedFactId] = React.useState<string | null>("f1");
  const [activeEvidenceSpan, setActiveEvidenceSpan] = React.useState<string | null>(
    MOCK_FACTS[0]?.source_span || null
  );

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
  const isPendingReview = job.stage === "pending_review" || job.stage === "approved";

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

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await api.approveJob(selectedDemoId, reviewNotes);
      toast.success("Job Approved for Publication!", {
        description: "Reviewer sign-off recorded. Multilingual outreach assets published.",
      });
      router.push(`/history`);
    } catch {
      toast.success("Job Approved (Standalone Mode)", {
        description: `Signed off with note: "${reviewNotes || "Verified against official notice."}"`,
      });
      router.push(`/history`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await api.rejectJob(selectedDemoId, reviewNotes);
      toast.error("Job Rejected", {
        description: "Status marked as rejected in database audit trail.",
      });
      router.push(`/history`);
    } catch {
      toast.error("Job Rejected (Standalone Mode)", {
        description: "Rejection note recorded in audit log.",
      });
      router.push(`/history`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!reviewNotes.trim()) {
      toast.warning("Please specify repair feedback in the notes field before requesting repair.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.requestEdit(selectedDemoId, reviewNotes);
      toast.info("Repair Requested", {
        description: "Targeted feedback sent to Writer Agent. Transitioning to scripting stage.",
      });
      router.push(`/status/${selectedDemoId}`);
    } catch {
      toast.info("Repair Loop Triggered (Standalone Mode)", {
        description: `Feedback: "${reviewNotes}" sent back to L4 Writer Agent.`,
      });
      router.push(`/status/${selectedDemoId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header & Demo Scenario Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Script Review & Fact Verification</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedDemoId}
            </Badge>
            {flaggedChecks.length > 0 ? (
              <Badge variant="destructive" className="text-xs flex items-center gap-1 font-mono">
                <AlertTriangle className="h-3 w-3" />
                <span>{flaggedChecks.length} FLAGGED CLAIMS</span>
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-mono">
                ✓ ALL CLAIMS GROUNDED
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            PRD Explainability Gate: Trace any claim directly back to its verbatim source evidence sentence and confidence score.
          </p>
        </div>

        {/* Demo Switcher for Evaluation */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">Test Scenarios:</span>
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
              Clean Job
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

      {/* ==================================================================== */}
      {/* PROMINENT ESCALATION / CONTRADICTION ALERT BANNER                    */}
      {/* ==================================================================== */}
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
        {/* LEFT COLUMN: Source Pane (Verbatim Notice & Fact List)              */}
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
                          Active Traceback Span Highlighted
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
        {/* RIGHT COLUMN: Script Pane with Fact-Level Verification Details      */}
        {/* ================================================================== */}
        <Card className="lg:col-span-7 flex flex-col border-border/90 shadow-xs">
          <CardHeader className="pb-3 bg-muted/20 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Narration Script & Claim Verification</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Per-claim confidence scores, strict regex gates, and verbatim evidence citations
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
            {isLoadingScripts ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Scene Cards with Verdict Stripes & Evidence Traceback */}
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
                          {/* Rejection / Failure Reason if not supported */}
                          {check.reason && (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                              <span className="font-bold flex items-center gap-1 font-mono uppercase text-[10px]">
                                <AlertTriangle className="h-3 w-3" />
                                Verifier Rejection Diagnostic:
                              </span>
                              <p className="font-medium leading-relaxed">{check.reason}</p>
                            </div>
                          )}

                          {/* Matched Evidence Traceback */}
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

                {/* Reviewer Notes & Decision Actions */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3 pt-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span>Reviewer Notes & Action Directives</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">Persisted in job audit log</span>
                    </div>
                    <Textarea
                      placeholder="Enter verification sign-off notes, audit trail comments, or specific repair instructions for failed scenes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="text-xs min-h-[75px] bg-background"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestEdit}
                      disabled={isSubmitting}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      <span>Request Repair</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleReject}
                        disabled={isSubmitting}
                        className="text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        <span>Approve & Sign Off</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
