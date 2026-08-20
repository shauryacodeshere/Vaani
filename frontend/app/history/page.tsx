"use client";

import * as React from "react";
import Link from "next/link";
import {
  History,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Clock,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_HISTORY_JOBS } from "@/lib/mock";
import { Job, Stage } from "@/lib/types";

const DOC_TITLES: Record<string, string> = {
  doc_nmss_2026: "National Merit Scholarship Scheme 2026-27 Application Window Open",
  doc_pmkisan_18: "PM-Kisan 18th Installment Beneficiary eKYC Deadline Extension",
  doc_ugc_net_2026: "UGC NET June 2026 Examination Schedule & Eligibility Guidelines",
  doc_aicte_ai_2026: "AICTE Faculty Development Workshop on Agentic AI Engineering",
};

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStageTab, setSelectedStageTab] = React.useState<string>("all");

  const filteredJobs = React.useMemo(() => {
    return MOCK_HISTORY_JOBS.filter((job) => {
      // Stage filter
      if (selectedStageTab !== "all" && job.stage !== selectedStageTab) {
        return false;
      }

      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (DOC_TITLES[job.doc_id] || job.doc_id).toLowerCase();
        const matchesId = job.job_id.toLowerCase().includes(q);
        const matchesDoc = title.includes(q);
        const matchesLang = job.languages.some((l) => l.toLowerCase().includes(q));
        return matchesId || matchesDoc || matchesLang;
      }

      return true;
    });
  }, [searchQuery, selectedStageTab]);

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Job History & Audit Trail</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {MOCK_HISTORY_JOBS.length} Total Runs
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Complete archive of generated multilingual outreach runs, human reviewer sign-offs, and audit logs.
          </p>
        </div>

        <Link href="/jobs" className={buttonVariants({ size: "sm", className: "flex items-center gap-1.5" })}>
          <Sparkles className="h-4 w-4" />
          <span>New Outreach Job</span>
        </Link>
      </div>

      {/* Main Table Card */}
      <Card className="border-border">
        <CardHeader className="pb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <span>Outreach Pipeline Executions</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Audit log of all jobs processed across L1 (Ingestion) to L6 (Dashboard)
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search job ID, title, language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs value={selectedStageTab} onValueChange={setSelectedStageTab} className="w-full">
            <TabsList className="h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="all" className="text-xs px-3 font-medium">
                All Runs ({MOCK_HISTORY_JOBS.length})
              </TabsTrigger>
              <TabsTrigger value="pending_review" className="text-xs px-3 font-medium">
                Pending Review
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs px-3 font-medium">
                Approved
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs px-3 font-medium">
                Rejected
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-xs px-3 font-medium">
                Failed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm">No Matching Jobs Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No jobs match your current search query or stage filter criteria.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSelectedStageTab("all"); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-mono text-xs w-[130px]">Job ID</TableHead>
                    <TableHead>Source Notice</TableHead>
                    <TableHead>Target Languages</TableHead>
                    <TableHead>Stage / Verdict</TableHead>
                    <TableHead className="font-mono text-xs">Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const title = DOC_TITLES[job.doc_id] || job.doc_id;

                    return (
                      <TableRow key={job.job_id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link href={`/status/${job.job_id}`} className="hover:underline text-primary">
                            {job.job_id}
                          </Link>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5 max-w-[320px]">
                            <span className="font-medium text-xs text-foreground block truncate" title={title}>
                              {title}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground block truncate">
                              doc: {job.doc_id}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {job.languages.map((l) => (
                              <Badge key={l} variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                                {l}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell>
                          {job.stage === "approved" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-[10px] uppercase flex items-center gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              PUBLISHED
                            </Badge>
                          )}
                          {job.stage === "pending_review" && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-mono text-[10px] uppercase flex items-center gap-1 w-fit">
                              <ShieldCheck className="h-3 w-3" />
                              PENDING REVIEW
                            </Badge>
                          )}
                          {job.stage === "rejected" && (
                            <Badge variant="destructive" className="font-mono text-[10px] uppercase flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              REJECTED
                            </Badge>
                          )}
                          {job.stage === "failed" && (
                            <Badge variant="destructive" className="font-mono text-[10px] uppercase flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              FAILED
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {job.created_at ? new Date(job.created_at).toLocaleDateString() : "Today"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link
                            href={`/review?job_id=${job.job_id}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                              className: "h-8 text-xs font-medium inline-flex items-center gap-1 hover:bg-muted",
                            })}
                          >
                            <span>Inspect</span>
                            <ExternalLink className="h-3 w-3 ml-0.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
