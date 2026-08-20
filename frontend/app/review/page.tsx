"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Volume2,
  Download,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MOCK_SOURCE_DOC,
  MOCK_VERIFIED_SCRIPTS_CLEAN,
  MOCK_JOB_PENDING_REVIEW,
} from "@/lib/mock";

export default function ReviewPage() {
  const [selectedLang, setSelectedLang] = React.useState("hi");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const job = MOCK_JOB_PENDING_REVIEW;
  const currentVerified = MOCK_VERIFIED_SCRIPTS_CLEAN[selectedLang] || MOCK_VERIFIED_SCRIPTS_CLEAN.hi;

  const handleApprove = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Job Approved for Publication!", {
        description: `All ${job.languages.length} language outreach videos signed off.`,
      });
    }, 600);
  };

  const handleReject = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.error("Job Rejected", {
        description: "Job status updated to rejected. Notes stored in audit log.",
      });
    }, 600);
  };

  const handleRequestEdit = () => {
    if (!reviewNotes.trim()) {
      toast.warning("Please provide repair instructions in the review notes before requesting edit.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.info("Repair Requested", {
        description: "Pipeline looping back to Script Writer with targeted feedback.",
      });
    }, 600);
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Review & Approval Gate</h1>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
              PENDING REVIEW
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              feat/dashboard-script-review
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Compare generated narration scenes directly against the verbatim source circular.
          </p>
        </div>
      </div>

      {/* Side-by-side Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Notice (L1 Ingestion) */}
        <Card className="lg:col-span-5 h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Source Circular (Ground Truth)</span>
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                {MOCK_SOURCE_DOC.doc_id}
              </Badge>
            </div>
            <CardDescription className="text-xs">{MOCK_SOURCE_DOC.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border text-sm leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">
              {MOCK_SOURCE_DOC.raw_text}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Extracted Grounding Facts (L4)
              </span>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {[
                  { id: "f1", type: "date", text: "Opens 1 September 2026" },
                  { id: "f2", type: "number", text: "75% qualifying score required" },
                  { id: "f3", type: "number", text: "12,000 scholarships available" },
                  { id: "f4", type: "date", text: "Deadline: 30 November 2026" },
                  { id: "f5", type: "policy", text: "No late submissions accepted" },
                ].map((fact) => (
                  <div
                    key={fact.id}
                    className="p-2 rounded border bg-background text-xs flex items-center justify-between gap-2"
                  >
                    <span className="font-medium truncate">{fact.text}</span>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {fact.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Multilingual Script & Fact Verification (L4/L6) */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Multilingual Script & Verification</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Per-claim confidence scores with verbatim source citations
                </CardDescription>
              </div>
              <Tabs value={selectedLang} onValueChange={setSelectedLang} className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="hi" className="text-xs px-3">
                    Hindi (hi)
                  </TabsTrigger>
                  <TabsTrigger value="mr" className="text-xs px-3">
                    Marathi (mr)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Scenes List */}
            <div className="space-y-3">
              {currentVerified.script.scenes.map((scene, idx) => {
                const check = currentVerified.checks[idx];
                const isSupported = check?.verdict === "SUPPORTED";

                return (
                  <div
                    key={scene.scene_id}
                    className="p-4 rounded-xl border bg-card transition-all hover:border-primary/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          Scene {idx + 1}
                        </Badge>
                        {isSupported ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            SUPPORTED ({Math.round((check?.confidence || 0) * 100)}%)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            {check?.verdict}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <span>Keywords:</span>
                        <span className="text-foreground">{scene.visual_keywords?.join(", ")}</span>
                      </div>
                    </div>

                    <p className="text-sm font-medium leading-relaxed">{scene.text}</p>

                    {check && (
                      <div className="p-2.5 rounded-lg bg-muted/40 border text-xs space-y-1">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider font-mono">
                          Evidence Span:
                        </span>
                        <p className="font-mono text-foreground">{check.evidence_span}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Video & Subtitle Export Bar */}
            <div className="p-4 rounded-xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Volume2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block">Rendered Outreach Assets</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    vaanireach_{selectedLang}.mp4 • 14.5s • 1080p
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => toast.info("Downloading captions.srt...")}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  SRT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => toast.info("Downloading captions.vtt...")}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  VTT
                </Button>
              </div>
            </div>

            {/* Human Gate Sign-off Box */}
            <div className="p-4 rounded-xl border bg-card space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  Human Approver Notes & Directives
                </span>
                <Textarea
                  placeholder="Optional review notes, audit log comments, or targeted repair instructions..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestEdit}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Request Repair
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Approve & Sign Off
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
