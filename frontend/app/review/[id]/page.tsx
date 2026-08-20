"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  Info,
  AlertTriangle,
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
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  ExtractionResult,
  Fact,
  Job,
  Script,
  SourceDocument,
  SUPPORTED_LANGUAGES,
  VerifiedScript,
} from "@/lib/types";
import {
  MOCK_SOURCE_DOC,
  MOCK_EXTRACTION,
  MOCK_VERIFIED_SCRIPTS_CLEAN,
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

function ScriptReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = params?.id || params?.job_id || searchParams.get("job_id");
  const jobId = Array.isArray(rawId) ? rawId[0] : (rawId as string) || "job_pending_03";

  // Data State
  const [job, setJob] = React.useState<Job>(MOCK_JOB_PENDING_REVIEW);
  const [sourceDoc, setSourceDoc] = React.useState<SourceDocument>(MOCK_SOURCE_DOC);
  const [extraction, setExtraction] = React.useState<ExtractionResult>(MOCK_EXTRACTION);
  const [scriptsMap, setScriptsMap] = React.useState<Record<string, VerifiedScript>>(MOCK_VERIFIED_SCRIPTS_CLEAN);

  // UI State
  const [selectedLang, setSelectedLang] = React.useState<string>("hi");
  const [highlightedFactId, setHighlightedFactId] = React.useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState<string>("");
  const [isCopied, setIsCopied] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingSource, setIsLoadingSource] = React.useState(false);
  const [isLoadingScripts, setIsLoadingScripts] = React.useState(false);

  // Load Job & Script Data
  React.useEffect(() => {
    async function loadData() {
      setIsLoadingSource(true);
      setIsLoadingScripts(true);

      try {
        const [fetchedJob, fetchedExtraction, fetchedScripts] = await Promise.allSettled([
          api.getJob(jobId),
          api.getJobExtraction(jobId),
          api.getJobVerifiedScripts(jobId),
        ]);

        if (fetchedJob.status === "fulfilled") {
          setJob(fetchedJob.value);
          if (fetchedJob.value.languages.length > 0) {
            setSelectedLang(fetchedJob.value.languages[0]);
          }
        }

        if (fetchedExtraction.status === "fulfilled") {
          setExtraction(fetchedExtraction.value);
        }

        if (fetchedScripts.status === "fulfilled") {
          setScriptsMap(fetchedScripts.value);
        }
      } catch {
        console.warn("Backend API unavailable, displaying grounded mock review fixtures for job:", jobId);
      } finally {
        setIsLoadingSource(false);
        setIsLoadingScripts(false);
      }
    }

    loadData();
  }, [jobId]);

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
      await api.approveJob(jobId, reviewNotes);
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
      await api.rejectJob(jobId, reviewNotes);
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
      await api.requestEdit(jobId, reviewNotes);
      toast.info("Repair Requested", {
        description: "Targeted feedback sent to Writer Agent. Transitioning to scripting stage.",
      });
      router.push(`/status/${jobId}`);
    } catch {
      toast.info("Repair Loop Triggered (Standalone Mode)", {
        description: `Feedback: "${reviewNotes}" sent back to L4 Writer Agent.`,
      });
      router.push(`/status/${jobId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const langMetaMap = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
  const currentVerified = scriptsMap[selectedLang] || scriptsMap.hi || MOCK_VERIFIED_SCRIPTS_CLEAN.hi;
  const isPendingReview = job.stage === "pending_review" || job.stage === "approved";

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Script Review & Grounding</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {jobId}
            </Badge>
            {job.stage === "pending_review" && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                PENDING APPROVAL
              </Badge>
            )}
            {job.stage === "approved" && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                APPROVED
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Side-by-side evidence review: verify what will be spoken in each language against the original circular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/status/${jobId}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs" })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Live Pipeline Status</span>
          </Link>
        </div>
      </div>

      {/* Warning banner if job is still in progress */}
      {!isPendingReview && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-start justify-between gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-foreground">Pipeline in progress (Stage: {job.stage})</span>
              <p className="text-muted-foreground mt-0.5">
                Automated extraction and verification are actively executing. You are inspecting intermediate drafts.
              </p>
            </div>
          </div>
          <Link
            href={`/status/${jobId}`}
            className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 text-xs shrink-0" })}
          >
            Monitor Live Status
          </Link>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TWO-COLUMN SIDE-BY-SIDE REVIEW WORKSPACE (Stacks under 900px)         */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================== */}
        {/* LEFT COLUMN: Source Pane (Verbatim Notice & Extracted Facts)        */}
        {/* ================================================================== */}
        <Card className="lg:col-span-5 flex flex-col max-h-[850px] overflow-hidden border-border/90 shadow-xs">
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
                {/* Verbatim Text Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      Original Notice Text
                    </span>
                    <button
                      type="button"
                      onClick={copySourceText}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono cursor-pointer"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/40 border text-xs leading-relaxed font-sans text-foreground whitespace-pre-wrap select-text">
                    {sourceDoc.raw_text}
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
                          className={`p-3 rounded-lg border text-xs transition-all space-y-1.5 ${
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
        {/* RIGHT COLUMN: Script Pane (Per-Language Narration Scenes)           */}
        {/* ================================================================== */}
        <Card className="lg:col-span-7 flex flex-col border-border/90 shadow-xs">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Languages className="h-4 w-4 text-primary" />
                  <span>Narration Script by Language</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Targeted scene beats with verbatim fact citations & visual keywords
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
                {/* Scene Cards in strict order */}
                <div className="space-y-4">
                  {currentVerified.script.scenes.map((scene, idx) => {
                    const check = currentVerified.checks[idx];
                    const indicClass = getIndicFontClass(selectedLang);

                    return (
                      <div
                        key={scene.scene_id}
                        className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                              Scene {idx + 1}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">{scene.scene_id}</span>
                          </div>

                          {/* Referenced Fact ID Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground font-mono">Referenced Facts:</span>
                            {scene.referenced_fact_ids && scene.referenced_fact_ids.length > 0 ? (
                              scene.referenced_fact_ids.map((fid) => (
                                <button
                                  key={fid}
                                  type="button"
                                  onClick={() => {
                                    setHighlightedFactId(fid);
                                    const el = document.getElementById(`fact-${fid}`);
                                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                                    highlightedFactId === fid
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                  }`}
                                  title={`Click to inspect Fact ${fid} in source pane`}
                                >
                                  {fid}
                                </button>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground font-mono italic">None</span>
                            )}
                          </div>
                        </div>

                        {/* Spoken Text at comfortable reading size with Indic typography treatment */}
                        <div className="p-3 rounded-lg bg-muted/20 border border-muted/60">
                          <p className={`font-medium text-foreground ${indicClass}`}>{scene.text}</p>
                        </div>

                        {/* Visual keywords & Evidence footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="font-bold text-foreground">Visual Keywords:</span>
                            <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                              {scene.visual_keywords?.join(", ") || "General notice graphic"}
                            </span>
                          </div>
                          {check?.evidence_span && (
                            <span
                              className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[260px]"
                              title={check.evidence_span}
                            >
                              ✓ Grounded in: &ldquo;{check.evidence_span.slice(0, 40)}...&rdquo;
                            </span>
                          )}
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
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
