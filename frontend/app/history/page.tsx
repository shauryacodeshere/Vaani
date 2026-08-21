"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Film,
  Layers,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Job, Stage, SUPPORTED_LANGUAGES } from "@/lib/types";
import { MOCK_HISTORY_JOBS } from "@/lib/mock";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const loadHistory = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch live jobs from backend
      const liveJobs = await api.listJobs();
      
      // 2. Fetch locally persisted review actions from localStorage
      let localActions: Record<string, { stage: string; notes?: string }> = {};
      try {
        const stored = localStorage.getItem("vaanireach_audit_actions");
        if (stored) localActions = JSON.parse(stored);
      } catch {}

      // 3. Merge live jobs with mock fixtures and local audit actions
      const jobMap = new Map<string, Job>();

      // Seed with initial realistic fixtures
      MOCK_HISTORY_JOBS.forEach((j) => jobMap.set(j.job_id, j));

      // Add live jobs from backend
      if (liveJobs && Array.isArray(liveJobs)) {
        liveJobs.forEach((j) => {
          jobMap.set(j.job_id, j);
        });
      }

      // Apply any local approval/rejection overrides
      const mergedList = Array.from(jobMap.values()).map((job) => {
        if (localActions[job.job_id]) {
          return {
            ...job,
            stage: localActions[job.job_id].stage as any,
            review_notes: localActions[job.job_id].notes || job.review_notes,
          };
        }
        return job;
      });

      // Sort newest first
      mergedList.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setJobs(mergedList);
    } catch (err) {
      console.error("Failed to load history:", err);
      setJobs(MOCK_HISTORY_JOBS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = jobs.length;
    const published = jobs.filter((j) => j.stage === "approved" || (j as any).stage === "published").length;
    const pending = jobs.filter((j) => j.stage === "pending_review" || j.stage === "assembling").length;
    const rejected = jobs.filter((j) => j.stage === "rejected" || j.stage === "failed").length;
    return { total, published, pending, rejected };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = React.useMemo(() => {
    return jobs.filter((j) => {
      // Status filter
      if (statusFilter === "approved" && j.stage !== "approved" && (j as any).stage !== "published") return false;
      if (statusFilter === "pending" && j.stage !== "pending_review" && j.stage !== "assembling") return false;
      if (statusFilter === "rejected" && j.stage !== "rejected" && j.stage !== "failed") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = j.job_id.toLowerCase().includes(q);
        const matchesDoc = (j.doc_id || "").toLowerCase().includes(q);
        const matchesNotes = (j.review_notes || "").toLowerCase().includes(q);
        const matchesLangs = (j.languages || []).some((l) => l.toLowerCase().includes(q));
        return matchesId || matchesDoc || matchesNotes || matchesLangs;
      }

      return true;
    });
  }, [jobs, statusFilter, searchQuery]);

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "approved":
      case "published":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>PUBLISHED / APPROVED</span>
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-mono font-bold flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>REJECTED</span>
          </Badge>
        );
      case "pending_review":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1">
            <Clock className="h-3 w-3 animate-pulse" />
            <span>PENDING HUMAN GATE</span>
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-xs font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>FAILED / STOPPED</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs font-mono font-bold flex items-center gap-1">
            <Activity className="h-3 w-3 animate-spin text-primary" />
            <span className="uppercase">{stage}</span>
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Breadcrumb & Actions Bar */}
      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">Audit History & Outreach Video Archive</h1>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  L6 Compliance Ledger
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Chronological ledger of all government notices, fact-check verifications, and human gate sign-offs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadHistory} className="text-xs cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh History</span>
            </Button>
            <Link href="/jobs" className={buttonVariants({ size: "sm", className: "text-xs cursor-pointer" })}>
              <span>+ New Circular Job</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1 space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border bg-card/70 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-mono text-muted-foreground uppercase font-bold">Total Notices</span>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono">{stats.total}</span>
              <Layers className="h-4 w-4 text-muted-foreground opacity-60" />
            </CardContent>
          </Card>

          <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">
                Published & Live
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.published}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardContent>
          </Card>

          <Card className="border border-amber-500/20 bg-amber-500/5 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase font-bold">
                Pending Human Gate
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {stats.pending}
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardContent>
          </Card>

          <Card className="border border-rose-500/20 bg-rose-500/5 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 uppercase font-bold">
                Rejected / Blocked
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {stats.rejected}
              </span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job ID, Circular Title, Language, or Notes..."
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground hidden md:inline">Status:</span>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList className="h-8 bg-background border p-0.5">
                <TabsTrigger value="all" className="text-xs px-2.5">
                  All ({jobs.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs px-2.5">
                  Published ({stats.published})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs px-2.5">
                  Pending ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs px-2.5">
                  Rejected ({stats.rejected})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3 rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">No audit jobs match your filter criteria.</p>
              <p className="text-xs text-muted-foreground">Try clearing your search query or create a new job.</p>
              <Button size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const isApproved = job.stage === "approved" || (job as any).stage === "published";
              const isRejected = job.stage === "rejected";
              const isPending = job.stage === "pending_review";

              return (
                <Card
                  key={job.job_id}
                  className={`border transition-all hover:border-primary/40 ${
                    isApproved
                      ? "border-emerald-500/20 bg-emerald-500/2"
                      : isRejected
                      ? "border-rose-500/20 bg-rose-500/2"
                      : isPending
                      ? "border-amber-500/20 bg-amber-500/2"
                      : "bg-card"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/review?job_id=${encodeURIComponent(job.job_id)}`}
                          className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>{job.job_id}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                        {getStageBadge(job.stage)}
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {job.created_at ? new Date(job.created_at).toLocaleString() : "Recent"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {job.doc_id || "Official Public Notice Circular"}
                        </h3>
                        {job.review_notes && (
                          <p className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded-md font-mono border">
                            <span className="font-bold text-foreground mr-1">Audit Notes:</span>
                            {job.review_notes}
                          </p>
                        )}
                        {job.error && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 bg-rose-500/10 p-2 rounded-md font-mono border border-rose-500/20">
                            <span className="font-bold mr-1">Error Diagnostic:</span>
                            {job.error}
                          </p>
                        )}
                      </div>

                      {/* Languages Badge List */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] font-mono text-muted-foreground">Languages:</span>
                        {job.languages.map((l) => (
                          <span
                            key={l}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted border"
                          >
                            {l.toUpperCase()}
                          </span>
                        ))}
                        {job.videos && job.videos.length > 0 && (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 ml-2">
                            ✔ {job.videos.length} videos rendered
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Link
                        href={`/review?job_id=${encodeURIComponent(job.job_id)}`}
                        className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs cursor-pointer" })}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        <span>Review & Verify</span>
                      </Link>

                      {isApproved && (
                        <Link
                          href={`/review?job_id=${encodeURIComponent(job.job_id)}`}
                          className={buttonVariants({ size: "sm", className: "text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" })}
                        >
                          <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                          <span>Watch Broadcast</span>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
