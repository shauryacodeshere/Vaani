"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Clock, CheckCircle2, AlertCircle, RefreshCw, Languages, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MOCK_JOB_MID_PIPELINE } from "@/lib/mock";
import { SUPPORTED_LANGUAGES } from "@/lib/types";

export default function StatusPage() {
  const job = MOCK_JOB_MID_PIPELINE;
  const langMap = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l.name]));

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Live Pipeline Status</h1>
            <Badge variant="outline" className="font-mono text-xs">feat/dashboard-live-status</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time multi-language pipeline execution tracking over WebSocket.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 py-1 px-3">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span className="font-mono text-xs">Job ID: {job.job_id}</span>
          </Badge>
        </div>
      </div>

      {/* Active Pipeline Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>Overall Stage:</span>
                <Badge variant="secondary" className="font-mono uppercase text-xs">
                  {job.stage}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Document: <span className="font-mono font-semibold">{job.doc_id}</span> • Started {new Date(job.created_at || "").toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs font-mono text-muted-foreground">Target Languages: {job.languages.join(", ")}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Overall Progress</span>
              <span>65%</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {job.languages.map((lang) => {
              const subStage = job.progress[lang] || "queued";
              const isVerifying = subStage.includes("verifying");
              const isGenerating = subStage.includes("generating");
              const isDone = subStage.includes("ready") || subStage.includes("approved");

              return (
                <div key={lang} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{langMap[lang] || lang}</span>
                      <span className="text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {lang}
                      </span>
                    </div>
                    {isGenerating && <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />}
                    {isVerifying && <Activity className="h-3.5 w-3.5 text-amber-500 animate-pulse" />}
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider">
                      Sub-Stage
                    </span>
                    <p className="text-xs font-mono font-medium truncate text-foreground" title={subStage}>
                      {subStage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Back to Dashboard
            </Link>
            <Link href="/review" className={buttonVariants({ size: "sm", className: "flex items-center gap-1.5" })}>
              <span>Proceed to Human Review</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
