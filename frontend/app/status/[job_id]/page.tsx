"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Languages,
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  Radio,
  FileText,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useJobStatus } from "@/lib/ws-client";
import { Stage, SUPPORTED_LANGUAGES } from "@/lib/types";
import { MOCK_JOB_MID_PIPELINE } from "@/lib/mock";

const STAGES_ORDER: { stage: Stage; label: string; desc: string }[] = [
  { stage: "queued", label: "Queued", desc: "Ingested & verified" },
  { stage: "extracting", label: "Extracting", desc: "Facts + verbatim spans" },
  { stage: "scripting", label: "Scripting", desc: "Per-language scenes" },
  { stage: "verifying", label: "Verifying", desc: "Strict regex + pgvector" },
  { stage: "generating_media", label: "Generating media", desc: "TTS & visual assets" },
  { stage: "assembling", label: "Assembling", desc: "Deterministic FFmpeg" },
  { stage: "pending_review", label: "Pending review", desc: "Human approval gate" },
];

const STAGE_PROGRESS_MAP: Record<Stage, number> = {
  queued: 5,
  extracting: 20,
  scripting: 35,
  verifying: 55,
  generating_media: 75,
  assembling: 90,
  pending_review: 100,
  approved: 100,
  rejected: 100,
  failed: 0,
};

export default function DynamicJobStatusPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.job_id || params?.id;
  const jobId = Array.isArray(rawId) ? rawId[0] : (rawId as string) || "job_live_01";

  // Use the resilient WebSocket / polling hook
  const { status, job, connectionMode, reconnectAttempts, error, refresh } = useJobStatus(jobId);

  // Fallback to active mock data if initial status is loading
  const currentStage = status?.stage || job?.stage || "verifying";
  const currentLanguages = status?.languages || job?.languages || ["hi", "mr", "ta"];
  const currentProgress = status?.progress || job?.progress || {
    hi: "verifying (attempt 1)",
    mr: "scripting",
    ta: "queued",
  };
  const docId = job?.doc_id || "doc_nmss_2026";

  // Elapsed Timer state
  const [elapsedSeconds, setElapsedSeconds] = React.useState(18);

  React.useEffect(() => {
    if (currentStage === "pending_review" || currentStage === "approved" || currentStage === "failed") {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStage]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  const langMap = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
  const currentStageIndex = STAGES_ORDER.findIndex((s) => s.stage === currentStage);
  const overallProgress = STAGE_PROGRESS_MAP[currentStage] || 50;

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-6xl mx-auto w-full">
      {/* Top Header & Connection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Live Pipeline Status</h1>
            <Badge variant="outline" className="font-mono text-xs py-1 px-2.5">
              {jobId}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time pipeline monitoring with independent per-language sub-stage execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Elapsed Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-mono text-muted-foreground border">
            <Clock className="h-3.5 w-3.5" />
            <span>Elapsed: {formatElapsed(elapsedSeconds)}</span>
          </div>

          {/* Connection Mode Indicator */}
          {connectionMode === "live" && (
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 py-1 px-2.5 font-mono"
              title="Connected to L5 WebSocket Feed"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping motion-reduce:animate-none" />
              <span>Live (WS)</span>
            </Badge>
          )}

          {connectionMode === "reconnecting" && (
            <Badge
              variant="outline"
              className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1.5 py-1 px-2.5 font-mono"
              title={`Reconnecting to WebSocket (attempt ${reconnectAttempts}/3)...`}
            >
              <RefreshCw className="h-3 w-3 animate-spin text-amber-500 motion-reduce:animate-none" />
              <span>Reconnecting ({reconnectAttempts}/3)</span>
            </Badge>
          )}

          {connectionMode === "polling" && (
            <Badge
              variant="outline"
              className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1.5 py-1 px-2.5 font-mono"
              title="Operating in HTTP Polling degradation mode (fetching every 3s)"
            >
              <Radio className="h-3 w-3 text-blue-500 animate-pulse motion-reduce:animate-none" />
              <span>Polling (HTTP)</span>
            </Badge>
          )}

          {connectionMode === "disconnected" && (
            <Badge
              variant="outline"
              className="text-xs bg-muted text-muted-foreground border-border flex items-center gap-1.5 py-1 px-2.5 font-mono"
            >
              <WifiOff className="h-3 w-3" />
              <span>Closed</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. HORIZONTAL STAGE RAIL                                             */}
      {/* ==================================================================== */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Overall Pipeline Stage:</span>
                <Badge
                  className={`font-mono text-xs uppercase ${
                    currentStage === "pending_review"
                      ? "bg-amber-500 text-white"
                      : currentStage === "failed"
                      ? "bg-rose-500 text-white"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {currentStage.replace("_", " ")}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs font-mono mt-1">
                Grounded on source circular: <span className="font-semibold text-foreground">{docId}</span>
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{overallProgress}% Complete</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={overallProgress} className="h-2" />

          {/* Stepper Grid (Filled completed, Animated current, Muted upcoming) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
            {STAGES_ORDER.map((item, idx) => {
              const isPast = currentStageIndex > idx || currentStage === "approved" || currentStage === "pending_review";
              const isCurrent = currentStageIndex === idx && currentStage !== "pending_review";
              const isPendingReview = item.stage === "pending_review" && currentStage === "pending_review";

              return (
                <div
                  key={item.stage}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                      : isPendingReview
                      ? "border-amber-500 bg-amber-500/10 shadow-xs"
                      : isPast
                      ? "border-emerald-500/40 bg-emerald-500/5 text-muted-foreground"
                      : "border-muted bg-muted/20 opacity-50 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold">0{idx + 1}</span>
                    {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {isCurrent && (
                      <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin motion-reduce:animate-none" />
                    )}
                    {isPendingReview && <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <span
                    className={`font-semibold block text-xs truncate ${
                      isCurrent ? "text-foreground font-bold" : isPendingReview ? "text-amber-700 dark:text-amber-400 font-bold" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground block line-clamp-1">
                    {item.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* 2. PARALLEL PER-LANGUAGE SUB-STAGE TRACKER                           */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <span>Parallel Language Generation Tracks</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Languages execute independently — Hindi can be verifying while Tamil is still scripting.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {currentLanguages.length} Active Tracks
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentLanguages.map((lang) => {
            const subStage = currentProgress[lang] || "queued";
            const langMeta = langMap[lang] || { name: lang, nativeName: lang };

            const isVerifying = subStage.includes("verifying");
            const isScripting = subStage.includes("scripting");
            const isGenerating = subStage.includes("generating");
            const isAssembling = subStage.includes("assembling");
            const isDone = subStage.includes("ready") || subStage.includes("approved") || subStage.includes("verified:APPROVED");
            const isFailed = subStage.includes("failed") || subStage.includes("rejected");

            return (
              <Card
                key={lang}
                className={`overflow-hidden transition-all ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : isFailed
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{langMeta.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {lang}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground block font-sans">
                        {langMeta.nativeName}
                      </span>
                    </div>

                    {isDone && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        READY
                      </Badge>
                    )}

                    {isVerifying && (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-mono flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                        VERIFYING
                      </Badge>
                    )}

                    {isGenerating && (
                      <Badge variant="secondary" className="text-[10px] font-mono flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin motion-reduce:animate-none text-primary" />
                        TTS & MEDIA
                      </Badge>
                    )}

                    {isScripting && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        SCRIPTING
                      </Badge>
                    )}

                    {subStage === "queued" && (
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        QUEUED
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 bg-muted/40 p-2.5 rounded-lg border text-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block">
                      Active Sub-Stage
                    </span>
                    <span className="font-mono font-medium text-foreground block truncate" title={subStage}>
                      {subStage}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. STAGE = FAILED ERROR CARD                                         */}
      {/* ==================================================================== */}
      {currentStage === "failed" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-base">Pipeline Execution Failed</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              A critical provider or validation error interrupted the pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-background border font-mono text-xs text-destructive whitespace-pre-wrap">
              {error || status?.error || "AllProvidersFailed: Unable to synthesize audio or assemble video."}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
                Start New Job
              </Button>
              <Button size="sm" onClick={refresh} className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry Pipeline</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 4. STAGE = PENDING_REVIEW PROMINENT CALL TO ACTION                   */}
      {/* ==================================================================== */}
      {currentStage === "pending_review" && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-background to-primary/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-base text-foreground">Human Approval Gate Pending</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              All {currentLanguages.length} language outreach videos are synthesized and verified. Official sign-off required before publication.
            </p>
          </div>
          <Link
            href={`/review?job_id=${jobId}`}
            className={buttonVariants({
              size: "lg",
              className: "bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md flex items-center gap-2 shrink-0",
            })}
          >
            <span>Review Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Link href="/jobs" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Submit Another Notice
        </Link>
        <Link
          href={`/review?job_id=${jobId}`}
          className={buttonVariants({ size: "sm", className: "flex items-center gap-1.5" })}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Open Review Workspace</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
