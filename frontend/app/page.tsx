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
  Radio,
  Play,
  Volume2,
  Lock,
  Tv,
  CheckCircle2,
  Filter,
  Search,
  Building2,
  Calendar,
  Share2,
  Download,
  Eye,
  Sliders,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  MOCK_JOB_MID_PIPELINE,
  MOCK_JOB_COMPLETED,
  MOCK_VERIFIED_SCRIPTS_CLEAN,
  MOCK_VERIFIED_SCRIPT_CONTRADICTED,
  MOCK_VERIFIED_SCRIPT_ESCALATED,
  MOCK_SOURCE_DOC,
} from "@/lib/mock";
import { SUPPORTED_LANGUAGES, STRICT_FACT_TYPES } from "@/lib/types";

// Public Citizen Bulletin Published Video Notices
interface PublicNotice {
  id: string;
  title: string;
  category: string;
  department: string;
  date: string;
  summary: string;
  videoSrc: Record<string, Record<string, string>>; // lang -> persona -> src
  poster: Record<string, string>; // persona -> src
  languages: string[];
  keyFacts: string[];
}

const PUBLIC_BULLETIN_NOTICES: PublicNotice[] = [
  {
    id: "notice_scholarship_2026",
    title: "National Merit Scholarship Application Window 2026",
    category: "Education & Scholarships",
    department: "Ministry of Education • Government of India",
    date: "19 Aug 2026",
    summary:
      "Online application portal open from 1 Sep to 30 Nov 2026. 12,000 merit scholarships available for students scoring at least 75%.",
    videoSrc: {
      hi: { female: "/videos/vaanireach_female_hi.mp4", male: "/videos/vaanireach_male_hi.mp4" },
      mr: { female: "/videos/vaanireach_female_mr.mp4", male: "/videos/vaanireach_male_mr.mp4" },
      ta: { female: "/videos/vaanireach_female_ta.mp4", male: "/videos/vaanireach_male_ta.mp4" },
      en: { female: "/videos/vaanireach_female_en.mp4", male: "/videos/vaanireach_male_en.mp4" },
    },
    poster: {
      female: "/videos/presenter_female.jpg",
      male: "/videos/presenter_male.jpg",
    },
    languages: ["hi", "mr", "ta", "en"],
    keyFacts: [
      "Application window opens on 1 September 2026.",
      "Eligible score cutoff is at least 75 percent.",
      "Total 12,000 scholarships available nationwide.",
      "Direct DBT disbursement to student bank accounts.",
    ],
  },
  {
    id: "notice_swayam_2026",
    title: "NTA SWAYAM January 2026 Semester Exam Results",
    category: "Examination Results",
    department: "National Testing Agency (NTA)",
    date: "19 Aug 2026",
    summary:
      "Results declared for 61 hybrid mode courses. Score cards available for download at swayam.nta.ac.in using Application Number.",
    videoSrc: {
      hi: { female: "/videos/swayam/vaanireach_female_hi.mp4", male: "/videos/swayam/vaanireach_male_hi.mp4" },
      mr: { female: "/videos/swayam/vaanireach_female_mr.mp4", male: "/videos/swayam/vaanireach_male_mr.mp4" },
      ta: { female: "/videos/swayam/vaanireach_female_ta.mp4", male: "/videos/swayam/vaanireach_male_ta.mp4" },
      en: { female: "/videos/swayam/vaanireach_female_en.mp4", male: "/videos/swayam/vaanireach_male_en.mp4" },
    },
    poster: {
      female: "/videos/presenter_female_swayam.jpg",
      male: "/videos/presenter_male_swayam.jpg",
    },
    languages: ["hi", "mr", "ta", "en"],
    keyFacts: [
      "Results declared for 61 Hybrid Mode courses.",
      "Score cards hosted on official portal swayam.nta.ac.in.",
      "Login with Application Number and Date of Birth.",
      "Final certificates issued by IGNOU and National Coordinators.",
    ],
  },
  {
    id: "notice_fda_recall_2026",
    title: "Urgent Safety Recall Order: Contaminated Cough Syrup Batch",
    category: "Urgent Safety Recall",
    department: "Food & Drug Administration (FDA) Maharashtra",
    date: "18 Aug 2026",
    summary:
      "Immediate sales freeze and mandatory 7-day quarantine for substandard pharmaceutical batch CP-4029 across all pharmacies.",
    videoSrc: {
      hi: { female: "/videos/fda/vaanireach_female_hi.mp4", male: "/videos/fda/vaanireach_male_hi.mp4" },
      mr: { female: "/videos/fda/vaanireach_female_mr.mp4", male: "/videos/fda/vaanireach_male_mr.mp4" },
      ta: { female: "/videos/fda/vaanireach_female_ta.mp4", male: "/videos/fda/vaanireach_male_ta.mp4" },
      en: { female: "/videos/fda/vaanireach_female_en.mp4", male: "/videos/fda/vaanireach_male_en.mp4" },
    },
    poster: {
      female: "/videos/presenter_female_fda.jpg",
      male: "/videos/presenter_male_fda.jpg",
    },
    languages: ["hi", "mr", "ta", "en"],
    keyFacts: [
      "Immediate market recall of contaminated batch CP-4029.",
      "High diethylene glycol levels detected in laboratory tests.",
      "Hospitals and retail chemists must quarantine stock within 7 days.",
      "Return inventory to manufacturer for certified destruction.",
    ],
  },
];

export default function HomePage() {
  const { isAdmin, openLoginModal } = useAuth();
  const [activeTab, setActiveTab] = React.useState("clean");

  // Cinematic Splash / Intro State
  const [introPhase, setIntroPhase] = React.useState<"intro" | "revealing" | "dashboard">("intro");
  const [introProgress, setIntroProgress] = React.useState<number>(0);

  // Citizen Bulletin State
  const [selectedNotice, setSelectedNotice] = React.useState<PublicNotice>(PUBLIC_BULLETIN_NOTICES[0]);
  const [selectedLang, setSelectedLang] = React.useState<string>("hi");
  const [selectedPersona, setSelectedPersona] = React.useState<"female" | "male">("female");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // Auto-progress from Intro to Dashboard after 1.8 seconds
  React.useEffect(() => {
    const start = Date.now();
    const duration = 1600;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setIntroProgress(progress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIntroPhase("revealing");
        setTimeout(() => {
          setIntroPhase("dashboard");
        }, 600);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const skipIntro = () => {
    setIntroPhase("revealing");
    setTimeout(() => {
      setIntroPhase("dashboard");
    }, 300);
  };

  const replayIntro = () => {
    setIntroProgress(0);
    setIntroPhase("intro");
    const start = Date.now();
    const duration = 1600;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setIntroProgress(progress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIntroPhase("revealing");
        setTimeout(() => {
          setIntroPhase("dashboard");
        }, 600);
      }
    }, 30);
  };

  // Filter notices in citizen bulletin
  const filteredNotices = React.useMemo(() => {
    return PUBLIC_BULLETIN_NOTICES.filter((n) => {
      if (categoryFilter !== "all" && !n.category.toLowerCase().includes(categoryFilter.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.department.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  const currentVideoSrc =
    selectedNotice.videoSrc[selectedLang]?.[selectedPersona] ||
    selectedNotice.videoSrc["hi"]?.["female"] ||
    "/videos/vaanireach_female_hi.mp4";

  const currentPoster = selectedNotice.poster[selectedPersona] || "/videos/presenter_female.jpg";

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* ==================================================================== */}
      {/* 1. CINEMATIC INTRO SPLASH OVERLAY (0s - 1.8s)                        */}
      {/* ==================================================================== */}
      {introPhase !== "dashboard" && (
        <div
          onClick={skipIntro}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer transition-all duration-700 select-none ${
            introPhase === "revealing"
              ? "opacity-0 scale-105 pointer-events-none backdrop-blur-2xl bg-background/80"
              : "opacity-100 scale-100 bg-slate-950/98 backdrop-blur-3xl"
          }`}
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Central Logo & Brand Reveal */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl space-y-6">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-primary via-indigo-500 to-amber-500 p-0.5 shadow-2xl shadow-primary/30 flex items-center justify-center animate-bounce-slow">
                <div className="w-full h-full bg-slate-950/90 rounded-[22px] flex items-center justify-center backdrop-blur-md">
                  <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-pulse" />
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-amber-400 to-emerald-400 rounded-3xl blur-md opacity-40 -z-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300 backdrop-blur-md shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>PS-02 CODEISSANCE 2026</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
                Vaani<span className="bg-gradient-to-r from-primary via-indigo-400 to-amber-400 bg-clip-text text-transparent">Reach</span>
              </h1>

              <p className="text-xl sm:text-2xl font-bold tracking-wide text-amber-300/90 font-indic-devanagari">
                वाणीरीच • बहुभाषी नागरिक आउटरीच
              </p>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto pt-1 font-mono">
                Official Notices to Grounded Multilingual Outreach Videos
              </p>
            </div>

            {/* Indic Voice Soundwave Equalizer */}
            <div className="flex items-center justify-center gap-1.5 h-8">
              {[40, 75, 100, 60, 90, 45, 80, 55, 95, 35].map((height, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-primary via-indigo-400 to-amber-400 rounded-full animate-wave"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: "900ms",
                  }}
                />
              ))}
            </div>

            <div className="w-48 sm:w-64 space-y-1 pt-2">
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-amber-400 to-emerald-400 transition-all duration-75 ease-out rounded-full"
                  style={{ width: `${introProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>INITIALIZING ENGINE...</span>
                <span>{introProgress}%</span>
              </div>
            </div>

            <p className="text-[11px] font-mono text-slate-500 hover:text-slate-400 transition-colors pt-2">
              Click anywhere to skip directly to dashboard →
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. BODY CONTENT: CITIZEN BULLETIN (Default) vs ADMIN STUDIO          */}
      {/* ==================================================================== */}
      <div
        className={`flex-1 transition-all duration-700 ease-out ${
          introPhase === "dashboard"
            ? "opacity-100 translate-y-0"
            : introPhase === "revealing"
            ? "opacity-70 translate-y-2"
            : "opacity-0 translate-y-4"
        }`}
      >
        {/* Top Control Toolbar */}
        <div className="border-b bg-card/60 backdrop-blur-md sticky top-16 z-30">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`h-2 w-2 rounded-full ${isAdmin ? "bg-emerald-500 animate-pulse" : "bg-primary"}`} />
              <span className="font-bold text-foreground">
                {isAdmin ? "OFFICER VERIFICATION STUDIO • ADMIN MODE" : "CITIZEN PUBLIC OUTREACH BULLETIN • PUBLIC MODE"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isAdmin && (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="text-xs font-mono text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20"
                >
                  <Lock className="h-3 w-3" />
                  <span>Officer Sign-In →</span>
                </button>
              )}

              <button
                type="button"
                onClick={replayIntro}
                className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md border bg-muted/30 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="hidden sm:inline">Replay Intro</span>
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* A. CITIZEN PUBLIC MODE (When site opens by default)                */}
        {/* ------------------------------------------------------------------ */}
        {!isAdmin ? (
          <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            {/* Citizen Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-background to-primary/5 p-6 sm:p-8 shadow-sm">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <Tv className="h-3.5 w-3.5" />
                  <span>Verified Citizen Broadcast Portal • India Digital Outreach</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Official Public Notices in{" "}
                  <span className="bg-gradient-to-r from-primary via-indigo-500 to-amber-500 bg-clip-text text-transparent">
                    Your Language
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Watch narrated, verified government circulars and scheme announcements in Indian languages.
                  Every broadcast is fact-checked with verbatim citations directly from the gazette source.
                </p>
              </div>
            </div>

            {/* Main Video Broadcast Player & Notice Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Video Player Card */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="border overflow-hidden bg-card/90 shadow-md">
                  {/* Video Player Box */}
                  <div className="relative aspect-video bg-black rounded-t-xl overflow-hidden group">
                    <video
                      key={`${selectedNotice.id}_${selectedLang}_${selectedPersona}`}
                      src={currentVideoSrc}
                      poster={currentPoster}
                      controls
                      autoPlay={false}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Player Controls & Language Tabs */}
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                            {selectedNotice.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">{selectedNotice.date}</span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-foreground mt-1">
                          {selectedNotice.title}
                        </h2>
                        <p className="text-xs text-muted-foreground font-mono">{selectedNotice.department}</p>
                      </div>

                      {/* Presenter Persona Switcher */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-muted/60 p-1 rounded-lg border">
                        <Button
                          variant={selectedPersona === "female" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedPersona("female")}
                          className="text-xs h-7 px-2.5 cursor-pointer"
                        >
                          👩 Priya (Anchor)
                        </Button>
                        <Button
                          variant={selectedPersona === "male" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedPersona("male")}
                          className="text-xs h-7 px-2.5 cursor-pointer"
                        >
                          👨 Rajesh (Anchor)
                        </Button>
                      </div>
                    </div>

                    {/* Language Selector Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground mr-1 flex items-center gap-1">
                          <Languages className="h-3.5 w-3.5" /> Language:
                        </span>
                        {[
                          { code: "hi", label: "हिन्दी (HI)" },
                          { code: "mr", label: "मराठी (MR)" },
                          { code: "ta", label: "தமிழ் (TA)" },
                          { code: "en", label: "English (EN)" },
                        ].map((lang) => (
                          <Button
                            key={lang.code}
                            variant={selectedLang === lang.code ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedLang(lang.code)}
                            className="text-xs h-7 px-2.5 font-bold cursor-pointer"
                          >
                            {lang.label}
                          </Button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-mono">
                          ✔ 100% Fact Verified
                        </Badge>
                      </div>
                    </div>

                    {/* Key Verified Findings */}
                    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                      <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Key Verified Facts from Official Gazette:</span>
                      </span>
                      <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                        {selectedNotice.keyFacts.map((fact, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="text-foreground">{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Published Notices Library */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Recent Published Notices</span>
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {filteredNotices.length} Available
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {filteredNotices.map((notice) => {
                    const isSelected = selectedNotice.id === notice.id;
                    return (
                      <Card
                        key={notice.id}
                        onClick={() => setSelectedNotice(notice)}
                        className={`cursor-pointer transition-all hover:border-primary/50 ${
                          isSelected ? "border-primary bg-primary/5 shadow-xs" : "bg-card"
                        }`}
                      >
                        <CardContent className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {notice.category}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">{notice.date}</span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                            {notice.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{notice.summary}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                              4 Languages Available
                            </span>
                            <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                              Watch Video <ArrowRight className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Officer Sign-In Promo Box */}
                <Card className="border border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-2.5 text-center">
                    <div className="mx-auto w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Are you a Government Nodal Officer?</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Log in to upload new circulars, run the multi-agent verifier, and sign off on broadcasts.
                      </p>
                    </div>
                    <Button size="sm" onClick={openLoginModal} className="w-full text-xs h-8 cursor-pointer">
                      <span>Officer / Admin Login</span>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        ) : (
          /* ------------------------------------------------------------------ */
          /* B. OFFICER / ADMIN STUDIO (When logged in as Officer/Admin)         */
          /* ------------------------------------------------------------------ */
          <main className="container mx-auto px-4 py-8 max-w-7xl space-y-10">
            {/* Officer Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card to-background p-8 md:p-10 shadow-sm">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Officer Verification Workspace • PS-02 Codeissance</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                  Institutional Notices to{" "}
                  <span className="bg-gradient-to-r from-primary via-indigo-500 to-amber-500 bg-clip-text text-transparent">
                    Verified Outreach Videos
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Transform complex English-only government circulars into short, narrated, captioned
                  outreach videos in 3+ Indian languages with Sarvam AI translation, verbatim claim citations, and
                  strict human approval gating.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/jobs" className={buttonVariants({ size: "lg", className: "shadow-sm flex items-center gap-2 cursor-pointer" })}>
                    <span>+ Create New Circular Job</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/status" className={buttonVariants({ variant: "outline", size: "lg", className: "flex items-center gap-2 cursor-pointer" })}>
                    <Activity className="h-4 w-4 text-primary" />
                    <span>Live Pipeline Status</span>
                  </Link>
                  <Link href="/review" className={buttonVariants({ variant: "ghost", size: "lg", className: "flex items-center gap-2 cursor-pointer" })}>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Human Approval Gate</span>
                  </Link>
                  <Link href="/history" className={buttonVariants({ variant: "outline", size: "lg", className: "flex items-center gap-2 cursor-pointer" })}>
                    <History className="h-4 w-4 text-indigo-500" />
                    <span>Audit History</span>
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
                  { step: "01", name: "Source Ingestion", desc: "URL scraper & parser", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", layer: "L1 Data" },
                  { step: "02", name: "Extraction Agent", desc: "Atomic facts + source_span", icon: Database, color: "text-purple-500", bg: "bg-purple-500/10", layer: "L4 Agents" },
                  { step: "03", name: "Script Writer", desc: "Per-language scene beats", icon: Cpu, color: "text-indigo-500", bg: "bg-indigo-500/10", layer: "L4 Agents" },
                  { step: "04", name: "Verifier Agent", desc: "Regex + pgvector entailment", icon: ShieldCheck, color: "text-amber-500", bg: "bg-amber-500/10", layer: "L4 Agents" },
                  { step: "05", name: "Media & Assembly", desc: "Sarvam TTS + studio TV wall", icon: Video, color: "text-emerald-500", bg: "bg-emerald-500/10", layer: "L2/L3 Media" },
                  { step: "06", name: "Human Gate", desc: "Fact review & approval", icon: CheckCircle, color: "text-rose-500", bg: "bg-rose-500/10", layer: "L6 Dashboard" },
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
                  Powered by Sarvam Mayura & Bulbul models for Hindi, Marathi, Tamil, Bengali, Telugu, etc.
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

            {/* Test Bench */}
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
          </main>
        )}
      </div>
    </div>
  );
}
