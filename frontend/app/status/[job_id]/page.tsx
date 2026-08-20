"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api, connectJobStatusSocket } from "@/lib/api";
import { Job, JobStatus, Stage, SUPPORTED_LANGUAGES } from "@/lib/types";
import { MOCK_JOB_MID_PIPELINE } from "@/lib/mock";

const STAGES_ORDER: { stage: Stage; label: string; desc: string }[] = [
  { stage: "queued", label: "Queued", desc: "Ingestion verified" },
  { stage: "extracting", label: "Extraction", desc: "Atomic facts + source_span" },
  { stage: "scripting", label: "Script Writer", desc: "Per-language scenes" },
  { stage: "verifying", label: "Verifier Agent", desc: "Regex + pgvector check" },
  { stage: "generating_media", label: "Media Engine", desc: "TTS + visuals generation" },
  { stage: "assembling", label: "Assembly", desc: "Deterministic FFmpeg" },
  { stage: "pending_review", label: "Review Gate", desc: "Human approval pending" },
];

export default function JobStatusPage() {
  const params = useParams();
  const jobId = (params?.job_id as string) || "job_live_01";

  const [job, setJob] = React.useState<Job>({
    ...MOCK_JOB_MID_PIPELINE,
    job_id: jobId,
  });
  const [isConnected, setIsConnected] = React.useState(false);
  const [progressPercent, setProgressPercent] = React.useState(50);

  const langMap = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l.name]));

  // Live WebSocket Connection
  React.useEffect(() => {
    const cleanup = connectJobStatusSocket(
      jobId,
      (status: JobStatus) => {
        setIsConnected(true);
        setJob((prev) => ({
          ...prev,
          stage: status.stage,
          progress: status.progress,
          error: status.error,
        }));
      },
      () => setIsConnected(false)
    );

    // Simulated progress tick if backend WebSocket is not running
    const timer = setInterval(() => {
      setProgressPercent((p) => (p < 95 ? p + 5 : 95));
    }, 4000);

    return () => {
      cleanup();
      clearInterval(timer);
    };
  }, [jobId]);

  const currentStageIndex = STAGES_ORDER.findIndex((s) => s.stage === job.stage);

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Live Pipeline Status</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
              {job.job_id}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time multi-agent execution feed with parallel per-language progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>WebSocket Connected</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 flex items-center gap-1.5 py-1">
              <Activity className="h-3.5 w-3.5 animate-pulse text-primary" />
              <span>Live Pipeline Stream</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Pipeline Stage Tracker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Job Lifecycle: {job.stage.toUpperCase().replace("_", " ")}</span>
            </CardTitle>
            <span className="text-xs font-mono text-muted-foreground">
              Document: {job.doc_id}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Overall Pipeline Completion</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
            {STAGES_ORDER.map((item, idx) => {
              const isPast = idx < (currentStageIndex === -1 ? 3 : currentStageIndex);
              const isCurrent = idx === (currentStageIndex === -1 ? 3 : currentStageIndex);

              return (
                <div
                  key={item.stage}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/10 shadow-xs"
                      : isPast
                      ? "border-emerald-500/40 bg-emerald-500/5 text-muted-foreground"
                      : "border-muted bg-muted/20 opacity-50 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold">0{idx + 1}</span>
                    {isPast && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {isCurrent && <RefreshCw className="h-3 w-3 text-primary animate-spin" />}
                  </div>
                  <span className={`font-semibold block truncate ${isCurrent ? "text-foreground" : ""}`}>
                    {item.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {item.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Parallel Language Sub-Stages */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">Parallel Language Generation Tracks</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {job.languages.map((lang) => {
            const subStage = job.progress[lang] || "generating_media";
            const isVerifying = subStage.includes("verifying");
            const isGenerating = subStage.includes("generating");
            const isDone = subStage.includes("ready") || subStage.includes("approved");

            return (
              <Card key={lang} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{langMap[lang] || lang}</span>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {lang}
                      </Badge>
                    </div>
                    {isGenerating && (
                      <Badge variant="secondary" className="text-[10px] flex items-center gap-1 font-mono">
                        <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                        MEDIA GEN
                      </Badge>
                    )}
                    {isVerifying && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-mono">
                        VERIFYING
                      </Badge>
                    )}
                    {isDone && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-mono">
                        READY
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 bg-muted/30 p-2.5 rounded-lg border text-xs">
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

      {/* Action footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Link href="/jobs" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Submit Another Notice
        </Link>
        <Link href="/review" className={buttonVariants({ size: "sm", className: "flex items-center gap-1.5" })}>
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Open Review & Approval Gate</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
