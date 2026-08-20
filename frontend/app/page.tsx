"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Activity,
  ShieldCheck,
  History,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle,
  AlertCircle,
  Clock,
  Languages,
  Video,
  Database,
  Cpu,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MOCK_JOB_MID_PIPELINE,
  MOCK_JOB_COMPLETED,
  MOCK_VERIFIED_SCRIPTS_CLEAN,
  MOCK_VERIFIED_SCRIPT_CONTRADICTED,
  MOCK_VERIFIED_SCRIPT_ESCALATED,
  MOCK_SOURCE_DOC,
} from "@/lib/mock";
import { SUPPORTED_LANGUAGES, STRICT_FACT_TYPES } from "@/lib/types";

export default function HomePage() {
  const [activeTab, setActiveTab] = React.useState("clean");

  return (
    <div className="flex-1 space-y-10 p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card to-background p-8 md:p-12 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PS-02 Codeissance • Agentic Multilingual Video Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Institutional Notices to{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-amber-500 bg-clip-text text-transparent">
              Verified Outreach Videos
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            VaaniReach transforms complex, English-only government circulars into short, narrated,
            captioned outreach videos in 3+ Indian languages. Every claim is strictly grounded with
            verbatim source citations, verified against hallucinations, and gated by human review.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/jobs/new" className={buttonVariants({ size: "lg", className: "shadow-sm flex items-center gap-2" })}>
              <span>Create New Job</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/status" className={buttonVariants({ variant: "outline", size: "lg", className: "flex items-center gap-2" })}>
              <Activity className="h-4 w-4 text-primary" />
              <span>Live Pipeline Status</span>
            </Link>
            <Link href="/review" className={buttonVariants({ variant: "ghost", size: "lg", className: "flex items-center gap-2" })}>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Human Approval Gate</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Architecture Visualizer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Agentic Pipeline Architecture</h2>
            <p className="text-sm text-muted-foreground">
              Bounded Generate → Verify → Repair → Escalate Loop with Deterministic Media Assembly
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs hidden sm:inline-flex">
            6 System Layers
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              step: "01",
              name: "Source Ingestion",
              desc: "URL scraper & parser",
              icon: FileText,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
              layer: "L1 Data",
            },
            {
              step: "02",
              name: "Extraction Agent",
              desc: "Atomic facts + source_span",
              icon: Database,
              color: "text-purple-500",
              bg: "bg-purple-500/10",
              layer: "L4 Agents",
            },
            {
              step: "03",
              name: "Script Writer",
              desc: "Per-language scene beats",
              icon: Cpu,
              color: "text-indigo-500",
              bg: "bg-indigo-500/10",
              layer: "L4 Agents",
            },
            {
              step: "04",
              name: "Verifier Agent",
              desc: "Regex + pgvector entailment",
              icon: ShieldCheck,
              color: "text-amber-500",
              bg: "bg-amber-500/10",
              layer: "L4 Agents",
            },
            {
              step: "05",
              name: "Media & Assembly",
              desc: "TTS + visuals + deterministic FFmpeg",
              icon: Video,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
              layer: "L2/L3 Media",
            },
            {
              step: "06",
              name: "Human Gate",
              desc: "Fact review & approval",
              icon: CheckCircle,
              color: "text-rose-500",
              bg: "bg-rose-500/10",
              layer: "L6 Dashboard",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="relative overflow-hidden transition-all hover:border-primary/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">{item.step}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                      {item.layer}
                    </Badge>
                  </div>
                  <div className={`w-8 h-8 rounded-md ${item.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Metrics & Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Supported Languages</span>
              <Languages className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{SUPPORTED_LANGUAGES.length} Languages</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Hindi, Marathi, Tamil, Bengali, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia & English.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Fact Grounding</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">100% Cited</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Strict regex gate on {STRICT_FACT_TYPES.join(", ")} ensures zero hallucinated dates or numbers.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Repair Loop</span>
              <RefreshCw className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">Max 3 Retries</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Only failed scenes regenerated with feedback before escalating to NEEDS_HUMAN_REVIEW.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Assembly Engine</span>
              <Video className="h-4 w-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">Deterministic</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Zero AI calls in FFmpeg assembly layer. Reproducible video, burned captions & soft sub exports.
          </CardContent>
        </Card>
      </div>

      {/* Contract & Mock Verification Showcase */}
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span>Frozen Contracts & Verification Test Bench</span>
              </CardTitle>
              <CardDescription>
                Live preview of verified scripts, strict contradiction detection, and retry escalation fixtures
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                schemas.py • locked
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full sm:w-[450px]">
              <TabsTrigger value="clean" className="text-xs">
                Clean (Approved)
              </TabsTrigger>
              <TabsTrigger value="contradicted" className="text-xs">
                Contradicted (Repair)
              </TabsTrigger>
              <TabsTrigger value="escalated" className="text-xs">
                Escalated (Review)
              </TabsTrigger>
            </TabsList>

            {/* Clean Tab */}
            <TabsContent value="clean" className="mt-4 space-y-4">
              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      STATUS: APPROVED
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">Language: Hindi (hi)</span>
                  </div>
                  <span className="text-xs text-muted-foreground">4/4 Claims Grounded</span>
                </div>

                <div className="space-y-2">
                  {MOCK_VERIFIED_SCRIPTS_CLEAN.hi.checks.map((check, idx) => (
                    <div
                      key={check.claim_id}
                      className="p-3 rounded-md bg-background border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            Scene {idx + 1} ({check.claim_id})
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            SUPPORTED ({Math.round((check.confidence || 0) * 100)}%)
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {MOCK_VERIFIED_SCRIPTS_CLEAN.hi.script.scenes[idx]?.text}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Evidence: &ldquo;{check.evidence_span}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Contradicted Tab */}
            <TabsContent value="contradicted" className="mt-4 space-y-4">
              <div className="rounded-lg border border-amber-500/30 p-4 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                      VERDICT: CONTRADICTED
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">Strict Regex Gate Triggered</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    Attempt 1 / 3
                  </Badge>
                </div>

                <div className="p-3 rounded-md bg-background border space-y-2">
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    Generated Claim: &ldquo;{MOCK_VERIFIED_SCRIPT_CONTRADICTED.checks[0].claim_text}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Rejection Reason:</span>{" "}
                    {MOCK_VERIFIED_SCRIPT_CONTRADICTED.checks[0].reason}
                  </p>
                  <div className="p-2 rounded bg-muted/40 text-xs font-mono text-muted-foreground">
                    Grounding Truth: &ldquo;{MOCK_VERIFIED_SCRIPT_CONTRADICTED.checks[0].evidence_span}&rdquo;
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Escalated Tab */}
            <TabsContent value="escalated" className="mt-4 space-y-4">
              <div className="rounded-lg border border-rose-500/30 p-4 bg-rose-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      STATUS: NEEDS_HUMAN_REVIEW
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">Retry Cap Reached (Attempt 3)</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Human Sign-off Mandatory
                  </Badge>
                </div>

                <div className="p-3 rounded-md bg-background border space-y-2">
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Flagged Statement: &ldquo;{MOCK_VERIFIED_SCRIPT_ESCALATED.checks[0].claim_text}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Escalation Diagnostic:</span>{" "}
                    {MOCK_VERIFIED_SCRIPT_ESCALATED.checks[0].reason}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Link href="/review" className={buttonVariants({ size: "sm", variant: "default", className: "text-xs h-7" })}>
                      Open in Reviewer Workspace
                    </Link>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
