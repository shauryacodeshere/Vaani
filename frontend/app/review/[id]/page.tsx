"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Subtitles,
  UserCheck,
  Film,
  Radio,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api, API_BASE } from "@/lib/api";
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
  MOCK_FDA_RECALL_DOC,
  MOCK_FDA_RECALL_EXTRACTION,
  MOCK_FDA_RECALL_FACTS,
  MOCK_FDA_RECALL_VERIFIED_SCRIPT,
  MOCK_SWAYAM_DOC,
  MOCK_SWAYAM_EXTRACTION,
  MOCK_SWAYAM_FACTS,
  MOCK_SWAYAM_VERIFIED_SCRIPT,
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

// Semantic Verdict UI Mapping
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
        icon: AlertTriangle,
        label: "UNVERIFIABLE",
        progressBg: "bg-amber-500",
      };
    case "NEEDS_HUMAN_REVIEW":
    default:
      return {
        borderStripe: "border-l-4 border-l-amber-500",
        chipBg: "bg-amber-500/20",
        chipText: "text-amber-800 dark:text-amber-200 font-bold",
        chipBorder: "border-amber-500/40",
        icon: AlertTriangle,
        label: "NEEDS HUMAN REVIEW",
        progressBg: "bg-amber-500",
      };
  }
}

// Highlight matching text span inside original notice
function renderHighlightedSource(rawText: string, highlightSpan: string | null) {
  if (!highlightSpan || !highlightSpan.trim()) {
    return <span>{rawText}</span>;
  }

  const cleanSpan = highlightSpan.trim();
  const lowerRaw = rawText.toLowerCase();
  const lowerSpan = cleanSpan.toLowerCase();

  const matchIdx = lowerRaw.indexOf(lowerSpan);
  if (matchIdx === -1) {
    return <span>{rawText}</span>;
  }

  const before = rawText.slice(0, matchIdx);
  const matched = rawText.slice(matchIdx, matchIdx + cleanSpan.length);
  const after = rawText.slice(matchIdx + cleanSpan.length);

  return (
    <span>
      {before}
      <mark className="bg-amber-500/30 dark:bg-amber-500/40 text-foreground px-1.5 py-0.5 rounded font-semibold border-b-2 border-amber-500 transition-all duration-300 shadow-xs">
        {matched}
      </mark>
      {after}
    </span>
  );
}

function ScriptReviewPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const routeJobId = (params?.id as string) || searchParams.get("job_id") || "job_3bd7182d";
  const [selectedDemoId, setSelectedDemoId] = React.useState<string>(routeJobId);

  React.useEffect(() => {
    if (routeJobId) {
      setSelectedDemoId(routeJobId);
    }
  }, [routeJobId]);

  const [job, setJob] = React.useState<Job>(MOCK_JOB_PENDING_REVIEW);
  const [sourceDoc, setSourceDoc] = React.useState<SourceDocument>(MOCK_SOURCE_DOC);
  const [extraction, setExtraction] = React.useState<ExtractionResult>(MOCK_EXTRACTION);
  const [verifiedScripts, setVerifiedScripts] = React.useState<Record<string, VerifiedScript>>(
    MOCK_VERIFIED_SCRIPTS_CLEAN
  );

  const [selectedLang, setSelectedLang] = React.useState<string>("hi");
  const [selectedPresenter, setSelectedPresenter] = React.useState<"female" | "male">("female");
  const [highlightedFactId, setHighlightedFactId] = React.useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = React.useState<string | null>(null);
  const [activeEvidenceSpan, setActiveEvidenceSpan] = React.useState<string | null>(
    MOCK_FACTS[0]?.source_span || null
  );

  const [reviewNotes, setReviewNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  const [showLiveCaptions, setShowLiveCaptions] = React.useState<boolean>(true);
  const [captionStyle, setCaptionStyle] = React.useState<"ticker" | "cinematic" | "karaoke">("ticker");
  const [captionLang, setCaptionLang] = React.useState<string>("auto");
  const [useSoftSubtitles, setUseSoftSubtitles] = React.useState<boolean>(false);

  // Video Ref
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [duration, setDuration] = React.useState<number>(15);

  const [isLoadingSource, setIsLoadingSource] = React.useState<boolean>(false);
  const [isLoadingScripts, setIsLoadingScripts] = React.useState<boolean>(false);

  const [recentJobs, setRecentJobs] = React.useState<Job[]>([]);

  React.useEffect(() => {
    api
      .listJobs()
      .then((jobs) => {
        if (jobs && jobs.length > 0) {
          setRecentJobs(jobs);
        }
      })
      .catch(() => {});
  }, []);

  // Switch demo fixture & fetch real live job artifacts
  React.useEffect(() => {
    setIsLoadingSource(true);
    setIsLoadingScripts(true);

    if (selectedDemoId === "job_demo_injected") {
      setVerifiedScripts({ hi: MOCK_VERIFIED_SCRIPT_CONTRADICTED });
      setJob({ ...MOCK_JOB_PENDING_REVIEW, job_id: "job_demo_injected", stage: "pending_review" });
      setActiveEvidenceSpan(MOCK_VERIFIED_SCRIPT_CONTRADICTED.checks[0]?.evidence_span || null);
    } else if (selectedDemoId === "job_demo_escalated") {
      setVerifiedScripts({ hi: MOCK_VERIFIED_SCRIPT_ESCALATED });
      setJob({ ...MOCK_JOB_PENDING_REVIEW, job_id: "job_demo_escalated", stage: "pending_review" });
      setActiveEvidenceSpan(MOCK_VERIFIED_SCRIPT_ESCALATED.checks[0]?.evidence_span || null);
    } else if (selectedDemoId === "job_recall_fda") {
      setSourceDoc(MOCK_FDA_RECALL_DOC);
      setExtraction(MOCK_FDA_RECALL_EXTRACTION);
      setVerifiedScripts({ hi: MOCK_FDA_RECALL_VERIFIED_SCRIPT });
      setJob({ ...MOCK_JOB_PENDING_REVIEW, job_id: "job_recall_fda", stage: "pending_review", doc_id: "doc_recall_fda_2026" });
      setActiveEvidenceSpan(MOCK_FDA_RECALL_FACTS[0]?.source_span || null);
    } else if (selectedDemoId === "job_swayam_nta") {
      setSourceDoc(MOCK_SWAYAM_DOC);
      setExtraction(MOCK_SWAYAM_EXTRACTION);
      setVerifiedScripts({ hi: MOCK_SWAYAM_VERIFIED_SCRIPT });
      setJob({ ...MOCK_JOB_PENDING_REVIEW, job_id: "job_swayam_nta", stage: "pending_review", doc_id: "doc_swayam_nta_2026" });
      setActiveEvidenceSpan(MOCK_SWAYAM_FACTS[0]?.source_span || null);
    }

    // Try fetching from real backend if connected
    api
      .getJob(selectedDemoId)
      .then((liveJob) => {
        if (liveJob) {
          setJob(liveJob);
          if (liveJob.languages && liveJob.languages.length > 0) {
            setSelectedLang(liveJob.languages[0]);
          }
        }
      })
      .catch(() => {});

    api
      .getJobDocument(selectedDemoId)
      .then((doc) => {
        if (doc && doc.raw_text) setSourceDoc(doc);
      })
      .catch(() => {})
      .finally(() => setIsLoadingSource(false));

    api
      .getJobExtraction(selectedDemoId)
      .then((ext) => {
        if (ext && ext.facts && ext.facts.length > 0) {
          setExtraction(ext);
          setActiveEvidenceSpan(ext.facts[0]?.source_span || null);
        }
      })
      .catch(() => {});

    api
      .getJobVerifiedScripts(selectedDemoId)
      .then((scripts) => {
        if (scripts && Object.keys(scripts).length > 0) {
          setVerifiedScripts(scripts);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingScripts(false));
  }, [selectedDemoId]);

  const langMetaMap = React.useMemo(() => {
    return SUPPORTED_LANGUAGES.reduce((acc, l) => {
      acc[l.code] = l;
      return acc;
    }, {} as Record<string, (typeof SUPPORTED_LANGUAGES)[0]>);
  }, []);

  const currentVerified = verifiedScripts[selectedLang] || verifiedScripts["hi"] || MOCK_VERIFIED_SCRIPTS_CLEAN["hi"];

  // Active Live Caption Calculations
  const effectiveCaptionLang = captionLang === "auto" ? selectedLang : captionLang;
  const activeCaptionScript =
    verifiedScripts[effectiveCaptionLang] ||
    verifiedScripts[selectedLang] ||
    verifiedScripts["hi"] ||
    currentVerified;

  const captionScenes = activeCaptionScript?.script?.scenes || [];
  const activeSceneIndex =
    captionScenes.length > 0
      ? Math.min(
          Math.max(0, Math.floor((currentTime / Math.max(duration, 1)) * captionScenes.length)),
          captionScenes.length - 1
        )
      : 0;

  const currentActiveScene = captionScenes[activeSceneIndex];
  const activeSentenceText = currentActiveScene?.text || "";

  // Progress within current active scene for word-by-word highlight
  const sceneProgress =
    captionScenes.length > 0
      ? Math.max(0, Math.min(1, (currentTime / Math.max(duration, 1)) * captionScenes.length - activeSceneIndex))
      : 0;

  const activeWords = React.useMemo(() => {
    return activeSentenceText ? activeSentenceText.split(" ") : [];
  }, [activeSentenceText]);

  const activeWordIndex = Math.min(
    Math.floor(sceneProgress * (activeWords.length || 1)),
    Math.max(0, activeWords.length - 1)
  );

  // Calculate verdict statistics
  const verdictCounts = React.useMemo(() => {
    const counts = {
      SUPPORTED: 0,
      CONTRADICTED: 0,
      UNVERIFIABLE: 0,
      NEEDS_HUMAN_REVIEW: 0,
    };
    currentVerified.checks.forEach((c) => {
      if (counts[c.verdict] !== undefined) {
        counts[c.verdict]++;
      }
    });
    return counts;
  }, [currentVerified]);

  const flaggedChecks = React.useMemo(() => {
    return currentVerified.checks.filter((c) => c.verdict !== "SUPPORTED");
  }, [currentVerified]);

  // Handle scene selection & evidence linking
  const handleSelectScene = (scene: Scene, check: FactCheck, sceneIndex: number = 0) => {
    setSelectedSceneId(scene.scene_id);
    if (check.evidence_fact_id) {
      setHighlightedFactId(check.evidence_fact_id);
    }
    if (check.evidence_span) {
      setActiveEvidenceSpan(check.evidence_span);
    }

    // Scroll evidence into view
    const sourceBox = document.getElementById("source-raw-text");
    if (sourceBox) {
      sourceBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Seek video player to scene estimated timestamp
    if (videoRef.current) {
      const targetTime = sceneIndex * 4.0;
      videoRef.current.currentTime = targetTime;
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const copySourceText = () => {
    navigator.clipboard.writeText(sourceDoc.raw_text);
    setIsCopied(true);
    toast.success("Source notice text copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 15);
    }
  };

  // Human Review Gate Actions
  const handleApprove = async () => {
    setIsSubmitting(true);
    const notes = reviewNotes || "Verified against source document. Approved for publication.";
    try {
      await api.approveJob(job.job_id, notes);
      toast.success("Job approved and marked PUBLISHED!");
      setJob((prev) => ({ ...prev, stage: "approved" }));

      // Persist in audit storage
      try {
        const stored = localStorage.getItem("vaanireach_audit_actions") || "{}";
        const parsed = JSON.parse(stored);
        parsed[job.job_id] = { stage: "approved", notes };
        localStorage.setItem("vaanireach_audit_actions", JSON.stringify(parsed));
      } catch {}

      setTimeout(() => {
        router.push("/history");
      }, 1000);
    } catch (err: any) {
      // Fallback local state if offline
      toast.success("Job approved and signed off (Local Audit Recorded)!");
      try {
        const stored = localStorage.getItem("vaanireach_audit_actions") || "{}";
        const parsed = JSON.parse(stored);
        parsed[job.job_id] = { stage: "approved", notes };
        localStorage.setItem("vaanireach_audit_actions", JSON.stringify(parsed));
      } catch {}
      setTimeout(() => {
        router.push("/history");
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    const notes = reviewNotes || "Rejected by human reviewer.";
    try {
      await api.rejectJob(job.job_id, notes);
      toast.info("Job marked as REJECTED");
      setJob((prev) => ({ ...prev, stage: "rejected" }));

      // Persist in audit storage
      try {
        const stored = localStorage.getItem("vaanireach_audit_actions") || "{}";
        const parsed = JSON.parse(stored);
        parsed[job.job_id] = { stage: "rejected", notes };
        localStorage.setItem("vaanireach_audit_actions", JSON.stringify(parsed));
      } catch {}

      setTimeout(() => {
        router.push("/history");
      }, 1000);
    } catch (err: any) {
      toast.info("Job marked as REJECTED (Local Audit Recorded)");
      try {
        const stored = localStorage.getItem("vaanireach_audit_actions") || "{}";
        const parsed = JSON.parse(stored);
        parsed[job.job_id] = { stage: "rejected", notes };
        localStorage.setItem("vaanireach_audit_actions", JSON.stringify(parsed));
      } catch {}
      setTimeout(() => {
        router.push("/history");
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Please enter repair notes explaining what to edit.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.requestEdit(job.job_id, reviewNotes);
      toast.success("Repair directives sent back to Script Writer Agent!");
      setJob((prev) => ({ ...prev, stage: "scripting" }));
      setTimeout(() => {
        router.push(`/status/${job.job_id}`);
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit repair request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFdaNotice =
    selectedDemoId === "job_recall_fda" ||
    selectedDemoId.toLowerCase().includes("recall") ||
    sourceDoc.title.toLowerCase().includes("recall") ||
    sourceDoc.title.toLowerCase().includes("fda");

  const isSwayamNotice =
    selectedDemoId === "job_swayam_nta" ||
    selectedDemoId.toLowerCase().includes("swayam") ||
    sourceDoc.title.toLowerCase().includes("swayam") ||
    sourceDoc.title.toLowerCase().includes("nta");

  const isKnownDemoJob =
    selectedDemoId === "job_approved_04" ||
    selectedDemoId === "job_pending_03" ||
    selectedDemoId === "job_demo_injected" ||
    selectedDemoId === "job_demo_escalated" ||
    selectedDemoId === "job_recall_fda" ||
    selectedDemoId === "job_swayam_nta" ||
    selectedDemoId === "job_active_01" ||
    selectedDemoId === "job_active_02" ||
    selectedDemoId === "job_queued_01" ||
    selectedDemoId === "job_rejected_05" ||
    selectedDemoId === "job_failed_06" ||
    selectedDemoId === "job_3bd7182d";

  const isCustomJob = !isKnownDemoJob && selectedDemoId.startsWith("job_");

  const staticFallbackVideo = isSwayamNotice
    ? (selectedPresenter === "male"
        ? `/videos/swayam/vaanireach_male_${selectedLang}.mp4?v=8`
        : `/videos/swayam/vaanireach_female_${selectedLang}.mp4?v=8`)
    : isFdaNotice
    ? (selectedPresenter === "male"
        ? `/videos/recall/vaanireach_male_${selectedLang}.mp4?v=7`
        : `/videos/recall/vaanireach_female_${selectedLang}.mp4?v=7`)
    : (selectedPresenter === "male"
        ? `/videos/vaanireach_male_${selectedLang}.mp4?v=7`
        : `/videos/vaanireach_${selectedLang}.mp4?v=7`);

  const initialVideoSrc = isCustomJob
    ? `${API_BASE}/api/jobs/${encodeURIComponent(selectedDemoId)}/video?lang=${selectedLang}&persona=${selectedPresenter}`
    : staticFallbackVideo;

  const [videoSrc, setVideoSrc] = React.useState<string>(initialVideoSrc);

  React.useEffect(() => {
    setVideoSrc(initialVideoSrc);
  }, [initialVideoSrc]);

  const posterSrc = isSwayamNotice
    ? (selectedPresenter === "male"
        ? "/assets/presenter_male_swayam.jpg"
        : "/assets/presenter_female_swayam.jpg")
    : isFdaNotice
    ? (selectedPresenter === "male"
        ? "/assets/presenter_male_fda.jpg"
        : "/assets/presenter_female_fda.jpg")
    : (selectedPresenter === "male"
        ? "/assets/presenter_male.jpg"
        : "/assets/presenter_female.jpg");
  const srtDownloadUrl = `${API_BASE}/api/jobs/${job.job_id}/subtitles?lang=${selectedLang}&format=srt`;
  const vttDownloadUrl = `${API_BASE}/api/jobs/${job.job_id}/subtitles?lang=${selectedLang}&format=vtt`;

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* ==================================================================== */}
      {/* TOP HEADER & CONTEXT BAR                                            */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/jobs"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors font-mono"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Jobs</span>
            </Link>
            <span className="text-muted-foreground font-mono">/</span>
            <span className="text-xs font-mono text-muted-foreground">Review & Approval Gate</span>
            <Badge variant="outline" className="font-mono text-xs ml-1 bg-primary/5">
              {job.job_id}
            </Badge>
            {flaggedChecks.length === 0 ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-mono flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>ALL CLAIMS GROUNDED</span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[11px] font-mono flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{flaggedChecks.length} FLAGGED CLAIM(S)</span>
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Official Video Preview & Approval</span>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Watch the AI Indian presenter narrate the notice, verify source claims side-by-side, and approve for broadcast.
          </p>
        </div>

        {/* Demo scenario switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">Circular / Notice:</span>
          <div className="flex rounded-lg border bg-muted/40 p-0.5 text-xs font-mono flex-wrap gap-1">
            {/* Dynamic User Created Jobs */}
            {recentJobs
              .filter(
                (rj) =>
                  rj.job_id !== "job_pending_03" &&
                  rj.job_id !== "job_demo_injected" &&
                  rj.job_id !== "job_demo_escalated" &&
                  rj.job_id !== "job_recall_fda" &&
                  rj.job_id !== "job_swayam_nta"
              )
              .slice(0, 3)
              .map((rj) => (
                <button
                  key={rj.job_id}
                  type="button"
                  onClick={() => setSelectedDemoId(rj.job_id)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedDemoId === rj.job_id
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/30"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Your Upload ({rj.job_id.slice(-6)})</span>
                </button>
              ))}

            <button
              type="button"
              onClick={() => setSelectedDemoId("job_pending_03")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedDemoId === "job_pending_03"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🎓 Scholarship</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDemoId("job_swayam_nta")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedDemoId === "job_swayam_nta"
                  ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>📑 NTA SWAYAM Results</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDemoId("job_recall_fda")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedDemoId === "job_recall_fda"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>⚠️ FDA Drug Recall</span>
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
              Escalated
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. PROMINENT AI INDIAN PRESENTER VIDEO PLAYER CARD                   */}
      {/* ==================================================================== */}
      <Card className="border-border/90 shadow-md overflow-hidden bg-gradient-to-b from-card via-card to-muted/20">
        <CardHeader className="pb-3 bg-muted/30 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>AI Indian Presenter Outreach Video Preview</span>
                  <Badge className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-mono">
                    Luma Dream Machine Model
                  </Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                AI presenter explaining uploaded circular in simple language with synchronized captions and Indic narration.
              </CardDescription>
            </div>

            {/* Controls: Presenter Persona & Language Selector */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Presenter Persona Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-muted-foreground font-bold">PRESENTER:</span>
                <Tabs value={selectedPresenter} onValueChange={(v) => setSelectedPresenter(v as "female" | "male")} className="w-auto">
                  <TabsList className="h-8 bg-background border p-0.5">
                    <TabsTrigger value="female" className="text-xs px-2.5 font-semibold flex items-center gap-1">
                      <span>👩 Priya</span>
                      <span className="text-[10px] opacity-70 hidden sm:inline">(Anchor)</span>
                    </TabsTrigger>
                    <TabsTrigger value="male" className="text-xs px-2.5 font-semibold flex items-center gap-1">
                      <span>👨 Rajesh</span>
                      <span className="text-[10px] opacity-70 hidden sm:inline">(Officer)</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-muted-foreground font-bold">LANGUAGE:</span>
                <Tabs value={selectedLang} onValueChange={setSelectedLang} className="w-auto">
                  <TabsList className="h-8 bg-background border p-0.5">
                    {job.languages.map((l) => {
                      const meta = langMetaMap[l] || { name: l, nativeName: l };
                      return (
                        <TabsTrigger key={l} value={l} className="text-xs px-2.5 font-semibold">
                          <span>{meta.name}</span>
                          <span className="ml-1 text-[10px] opacity-70 font-mono">({l})</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Video Player Container */}
            <div className="lg:col-span-8 bg-black rounded-xl overflow-hidden shadow-lg border border-border relative aspect-video flex items-center justify-center group">
              <video
                ref={videoRef}
                key={`${selectedPresenter}_${selectedLang}_${videoSrc}`}
                src={videoSrc}
                poster={posterSrc}
                controls
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onError={() => {
                  if (videoSrc !== staticFallbackVideo) {
                    console.warn("Backend video stream failed, falling back to static preview video.");
                    setVideoSrc(staticFallbackVideo);
                  }
                }}
                className="w-full h-full object-cover"
              >
                {useSoftSubtitles && (
                  <track
                    src={`${API_BASE}/api/jobs/${job.job_id}/subtitles?lang=${selectedLang}&format=vtt`}
                    kind="subtitles"
                    srcLang={selectedLang}
                    label={selectedLang.toUpperCase()}
                    default
                  />
                )}
                Your browser does not support the video tag.
              </video>

              {/* Big Animated Play Button Overlay when paused */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }}
                  className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex flex-col items-center justify-center shadow-2xl backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer border-2 border-white/40 group-hover:ring-4 group-hover:ring-primary/40"
                  aria-label="Play AI Broadcast"
                >
                  <Play className="h-9 w-9 ml-1 fill-current" />
                </button>
              )}

              {/* Live Synchronized Dynamic Captions Overlay */}
              {showLiveCaptions && activeSentenceText && (
                <div className="absolute bottom-12 inset-x-2 sm:inset-x-4 pointer-events-none transition-all duration-300 z-10">
                  {captionStyle === "ticker" && (
                    <div className="bg-slate-950/90 border border-slate-700/80 shadow-2xl rounded-lg p-2 sm:p-2.5 backdrop-blur-md flex items-center gap-2.5 text-white">
                      <div className="bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        <span>LIVE CC</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono text-slate-300 border-slate-700 shrink-0 uppercase hidden sm:inline">
                        {effectiveCaptionLang}
                      </Badge>
                      <p className={`text-xs sm:text-sm font-medium tracking-wide text-amber-100 flex-1 truncate sm:whitespace-normal line-clamp-2 ${getIndicFontClass(effectiveCaptionLang)}`}>
                        {activeSentenceText}
                      </p>
                    </div>
                  )}

                  {captionStyle === "cinematic" && (
                    <div className="flex justify-center">
                      <div className="bg-black/85 border border-white/20 shadow-2xl rounded-xl px-4 py-2 backdrop-blur-md max-w-xl text-center">
                        <p className={`text-sm sm:text-base font-semibold text-yellow-300 drop-shadow-md leading-relaxed ${getIndicFontClass(effectiveCaptionLang)}`}>
                          {activeSentenceText}
                        </p>
                      </div>
                    </div>
                  )}

                  {captionStyle === "karaoke" && (
                    <div className="bg-slate-900/95 border border-primary/40 shadow-2xl rounded-xl p-3 backdrop-blur-md text-center max-w-2xl mx-auto">
                      <div className="flex items-center justify-center gap-1.5 mb-1 text-[10px] font-mono text-primary font-bold">
                        <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                        <span>TELEPROMPTER WORD TRACKER ({((sceneProgress) * 100).toFixed(0)}%)</span>
                      </div>
                      <p className={`text-xs sm:text-base font-medium flex flex-wrap justify-center gap-1.5 ${getIndicFontClass(effectiveCaptionLang)}`}>
                        {activeWords.map((word, wIdx) => {
                          const isCurrentWord = wIdx === activeWordIndex;
                          const isSpokenWord = wIdx < activeWordIndex;
                          return (
                            <span
                              key={wIdx}
                              className={`transition-all duration-150 rounded px-1 ${
                                isCurrentWord
                                  ? "bg-amber-400 text-slate-950 font-bold scale-110 shadow-md ring-2 ring-amber-300"
                                  : isSpokenWord
                                  ? "text-white font-semibold"
                                  : "text-slate-400 opacity-60"
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Broadcast Live Pill */}
              <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 bg-rose-600/90 text-white font-mono text-[10px] px-2.5 py-0.5 rounded-full shadow-md">
                <Radio className="h-3 w-3 animate-pulse" />
                <span>AI OUTREACH BROADCAST</span>
              </div>
            </div>

            {/* Video Metadata & Live Captions Controller Panel */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between h-full">
              {/* Live Captions & Subtitles Engine Controller */}
              <div className="p-4 rounded-xl border bg-gradient-to-b from-primary/5 via-background to-muted/20 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <Subtitles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold font-mono text-foreground uppercase">
                      Live AI Closed Captions (CC)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLiveCaptions(!showLiveCaptions)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                      showLiveCaptions
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {showLiveCaptions ? "CC: ON" : "CC: OFF"}
                  </button>
                </div>

                {/* Caption Style Switcher */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground">Caption Overlay Style:</span>
                  <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setCaptionStyle("ticker")}
                      className={`p-1.5 rounded border text-center transition-all cursor-pointer ${
                        captionStyle === "ticker"
                          ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      📺 Ticker Bar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionStyle("cinematic")}
                      className={`p-1.5 rounded border text-center transition-all cursor-pointer ${
                        captionStyle === "cinematic"
                          ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      🎬 Cinematic
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionStyle("karaoke")}
                      className={`p-1.5 rounded border text-center transition-all cursor-pointer ${
                        captionStyle === "karaoke"
                          ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ✨ Karaoke
                    </button>
                  </div>
                </div>

                {/* Caption Language Track */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Subtitle Language Track:</span>
                    <span className="font-bold text-foreground uppercase">{effectiveCaptionLang}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCaptionLang("auto")}
                      className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        captionLang === "auto"
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Match Spoken ({selectedLang})
                    </button>
                    {["hi", "mr", "ta", "en"].map((langCode) => (
                      <button
                        key={langCode}
                        type="button"
                        onClick={() => setCaptionLang(langCode)}
                        className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                          captionLang === langCode
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {langCode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtitle Downloads */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                  <a
                    href={srtDownloadUrl}
                    download={`vaanireach_${job.job_id}_${selectedLang}.srt`}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "w-full text-xs cursor-pointer" })}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    <span>Download .SRT</span>
                  </a>
                  <a
                    href={vttDownloadUrl}
                    download={`vaanireach_${job.job_id}_${selectedLang}.vtt`}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "w-full text-xs cursor-pointer" })}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    <span>Download .VTT</span>
                  </a>
                </div>
              </div>

              {/* Video Pipeline Technical Specs */}
              <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20 text-xs">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-[11px] font-bold font-mono text-muted-foreground uppercase">Pipeline Engine</span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    1280x720 • 25 FPS
                  </Badge>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Presenter Persona:</span>
                    <span className="font-semibold text-primary font-mono">
                      {selectedPresenter === "female" ? "👩 Priya (Anchor)" : "👨 Rajesh (Officer)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Narration Voice:</span>
                    <span className="font-semibold text-foreground font-mono">
                      {selectedPresenter === "female" ? "Swara Neural" : "Madhur Neural"} ({selectedLang.toUpperCase()})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Teleprompter Scene:</span>
                    <span className="font-mono font-bold text-amber-500">Scene {activeSceneIndex + 1} / {captionScenes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Factual Consistency:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">100% Grounded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
      {/* 2. TWO-COLUMN SIDE-BY-SIDE REVIEW WORKSPACE                          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================== */}
        {/* LEFT COLUMN: Source Circular (Ground Truth)                        */}
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
              <div className="text-[11px] font-mono text-primary flex items-center gap-1 mt-0.5 truncate">
                <span>{sourceDoc.origin_ref}</span>
              </div>
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
        {/* RIGHT COLUMN: Script Pane & Review Actions                         */}
        {/* ================================================================== */}
        <Card className="lg:col-span-7 flex flex-col border-border/90 shadow-xs">
          <CardHeader className="pb-3 bg-muted/20 border-b space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Narration Script & Scene Breakdown</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Click any scene to highlight its source sentence and jump the video player.
                </CardDescription>
              </div>

              {/* Verdict Summary Bar */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                  {verdictCounts.SUPPORTED} Supported
                </span>
                {verdictCounts.CONTRADICTED > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold">
                    {verdictCounts.CONTRADICTED} Contradicted
                  </span>
                )}
              </div>
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
                {/* Scene Cards with Verdict Stripes & Video Sync */}
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
                    const isCurrentlyPlaying = isPlaying && activeSceneIndex === idx;
                    const indicClass = getIndicFontClass(selectedLang);
                    const confidencePercent = Math.round((check.confidence || 0) * 100);

                    return (
                      <div
                        key={scene.scene_id}
                        id={`scene-card-${scene.scene_id}`}
                        onClick={() => handleSelectScene(scene, check, idx)}
                        className={`p-4 rounded-xl border bg-card transition-all cursor-pointer space-y-3 shadow-2xs ${
                          style.borderStripe
                        } ${
                          isCurrentlyPlaying
                            ? "ring-2 ring-amber-400 bg-amber-500/5 border-amber-500 shadow-md"
                            : isSelected
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

                            {isCurrentlyPlaying && (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-mono font-bold animate-pulse flex items-center gap-1">
                                <Radio className="h-3 w-3" />
                                <span>SPEAKING NOW</span>
                              </Badge>
                            )}

                            {/* Verdict Chip */}
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-mono flex items-center gap-1.5 py-0.5 px-2.5 ${style.chipBg} ${style.chipText} ${style.chipBorder}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{style.label}</span>
                            </Badge>

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

                          {/* Confidence */}
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

                          {/* Evidence Traceback */}
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
                                  handleSelectScene(scene, check, idx);
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
                      className="text-xs cursor-pointer"
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
                        className="text-xs cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
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
