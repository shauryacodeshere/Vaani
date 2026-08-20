/**
 * VaaniReach Realistic Mock Fixtures.
 *
 * Provides comprehensive, grounded mock data for every stage, verdict, and state.
 * Enables building and testing all L6 UI screens independently without backend dependencies.
 */

import {
  ExtractionResult,
  Fact,
  Job,
  ScrapedNotice,
  SourceDocument,
  VerifiedScript,
} from "./types";

// --------------------------------------------------------------------------
// Scraped Notices Fixtures
// --------------------------------------------------------------------------

export const MOCK_SCRAPED_NOTICES: ScrapedNotice[] = [
  {
    id: "notice_pib_2026_01",
    title: "National Merit Scholarship Scheme (NMSS) 2026-27 Application Window Open",
    url: "https://pib.gov.in/PressReleasePage.aspx?PRID=2098421",
    date: "15 Aug 2026",
    category: "Education & Scholarships",
    department: "Ministry of Education",
    summary:
      "Online applications invited from eligible students with 75%+ score for 12,000 merit scholarships before 30 November 2026.",
    raw_text:
      "The application window for the National Merit Scholarship opens on 1 September 2026. Eligible students must have scored at least 75 percent in their qualifying examination. The total number of scholarships available this year is 12000. Applications must be submitted online through the official portal before the deadline of 30 November 2026. No applications will be accepted after the closing date.",
  },
  {
    id: "notice_ugc_2026_04",
    title: "UGC Guidelines on Direct Academic Credit Transfer via ABC Portal",
    url: "https://ugc.ac.in/notices/abc-credit-transfer-2026",
    date: "12 Aug 2026",
    category: "Higher Education Advisory",
    department: "University Grants Commission",
    summary:
      "All central and state universities mandated to integrate Academic Bank of Credits before the upcoming academic session.",
    raw_text:
      "University Grants Commission directs all recognized higher educational institutions to enable student credit transfers via the DigiLocker Academic Bank of Credits portal starting October 2026.",
  },
  {
    id: "notice_agri_2026_11",
    title: "PM-Kisan 18th Installment DBT Disbursement Date Notification",
    url: "https://pmkisan.gov.in/notices/18th-installment-release",
    date: "08 Aug 2026",
    category: "Agriculture & Welfare",
    department: "Ministry of Agriculture & Farmers Welfare",
    summary:
      "DBT release of Rs 2,000 scheduled for eligible landholding farmer families with completed e-KYC.",
    raw_text:
      "The 18th installment of PM-KISAN will be directly transferred to bank accounts on 5 October 2026. Farmers must ensure biometric e-KYC is completed before 25 September 2026 to avoid disbursement failure.",
  },
];

// --------------------------------------------------------------------------
// Grounded Source Document & Extracted Facts
// --------------------------------------------------------------------------

export const MOCK_SOURCE_DOC: SourceDocument = {
  doc_id: "doc_nmss_2026",
  title: "Public Notice: National Merit Scholarship Application Window 2026",
  origin: "url",
  origin_ref: "https://example.gov.in/notices/scholarship-2026",
  raw_text:
    "The application window for the National Merit Scholarship opens on 1 September 2026. Eligible students must have scored at least 75 percent in their qualifying examination. The total number of scholarships available this year is 12000. Applications must be submitted online through the official portal before the deadline of 30 November 2026. No applications will be accepted after the closing date.",
};

export const MOCK_FACTS: Fact[] = [
  {
    id: "f1",
    claim: "The application window for the National Merit Scholarship opens on 1 September 2026.",
    type: "date",
    source_span: "The application window for the National Merit Scholarship opens on 1 September 2026.",
  },
  {
    id: "f2",
    claim: "Eligible students must have scored at least 75 percent in their qualifying examination.",
    type: "number",
    source_span: "Eligible students must have scored at least 75 percent in their qualifying examination.",
  },
  {
    id: "f3",
    claim: "The total number of scholarships available this year is 12000.",
    type: "number",
    source_span: "The total number of scholarships available this year is 12000.",
  },
  {
    id: "f4",
    claim: "Applications must be submitted online through the official portal before the deadline of 30 November 2026.",
    type: "date",
    source_span:
      "Applications must be submitted online through the official portal before the deadline of 30 November 2026.",
  },
  {
    id: "f5",
    claim: "No applications will be accepted after the closing date.",
    type: "policy",
    source_span: "No applications will be accepted after the closing date.",
  },
];

export const MOCK_EXTRACTION: ExtractionResult = {
  doc_id: "doc_nmss_2026",
  title: "Public Notice: National Merit Scholarship Application Window 2026",
  summary: "National Merit Scholarship applications open on 1 Sept 2026 for 12,000 slots with 75% cutoff.",
  facts: MOCK_FACTS,
};

// --------------------------------------------------------------------------
// Verified Scripts (Clean / Contradicted / Needs Review)
// --------------------------------------------------------------------------

export const MOCK_VERIFIED_SCRIPTS_CLEAN: Record<string, VerifiedScript> = {
  hi: {
    script: {
      script_id: "scr_hi_01",
      job_id: "job_active_01",
      language: "hi",
      scenes: [
        {
          scene_id: "s1",
          text: "राष्ट्रीय मेरिट छात्रवृत्ति के लिए ऑनलाइन आवेदन 1 सितंबर 2026 से शुरू हो रहे हैं।",
          referenced_fact_ids: ["f1"],
          visual_keywords: ["Scholarship Portal", "Calendar", "Application Form"],
        },
        {
          scene_id: "s2",
          text: "पात्र होने के लिए छात्रों के पिछली परीक्षा में कम से कम 75 प्रतिशत अंक होने अनिवार्य हैं।",
          referenced_fact_ids: ["f2"],
          visual_keywords: ["Student", "Report Card", "Percentage"],
        },
        {
          scene_id: "s3",
          text: "इस वर्ष कुल 12000 मेधावी छात्रवृत्तियां प्रदान की जा रही हैं।",
          referenced_fact_ids: ["f3"],
          visual_keywords: ["Students Cohort", "Success", "Scholarship Badge"],
        },
        {
          scene_id: "s4",
          text: "अंतिम तिथि 30 नवंबर 2026 से पहले आधिकारिक पोर्टल पर आवेदन अवश्य करें।",
          referenced_fact_ids: ["f4", "f5"],
          visual_keywords: ["Official Portal", "Deadline Clock", "Submit Button"],
        },
      ],
    },
    checks: [
      {
        claim_id: "s1",
        claim_text: "The application window for the National Merit Scholarship opens on 1 September 2026.",
        verdict: "SUPPORTED",
        confidence: 0.98,
        evidence_span: "The application window for the National Merit Scholarship opens on 1 September 2026.",
        evidence_fact_id: "f1",
        attempt: 1,
      },
      {
        claim_id: "s2",
        claim_text: "Eligible students must have scored at least 75 percent in their qualifying examination.",
        verdict: "SUPPORTED",
        confidence: 0.96,
        evidence_span: "Eligible students must have scored at least 75 percent in their qualifying examination.",
        evidence_fact_id: "f2",
        attempt: 1,
      },
      {
        claim_id: "s3",
        claim_text: "The total number of scholarships available this year is 12000.",
        verdict: "SUPPORTED",
        confidence: 0.99,
        evidence_span: "The total number of scholarships available this year is 12000.",
        evidence_fact_id: "f3",
        attempt: 1,
      },
      {
        claim_id: "s4",
        claim_text:
          "Applications must be submitted online through the official portal before the deadline of 30 November 2026.",
        verdict: "SUPPORTED",
        confidence: 0.95,
        evidence_span:
          "Applications must be submitted online through the official portal before the deadline of 30 November 2026.",
        evidence_fact_id: "f4",
        attempt: 1,
      },
    ],
    status: "APPROVED",
  },
  mr: {
    script: {
      script_id: "scr_mr_01",
      job_id: "job_active_01",
      language: "mr",
      scenes: [
        {
          scene_id: "s1",
          text: "राष्ट्रीय गुणवत्ता शिष्यवृत्तीचे अर्ज 1 सप्टेंबर 2026 पासून सुरू होत आहेत.",
          referenced_fact_ids: ["f1"],
          visual_keywords: ["Scholarship Portal", "Calendar"],
        },
        {
          scene_id: "s2",
          text: "पात्रतेसाठी विद्यार्थ्याला पात्रता परीक्षेत किमान 75 टक्के गुण असणे आवश्यक आहे.",
          referenced_fact_ids: ["f2"],
          visual_keywords: ["Student Examination", "75 Percent"],
        },
        {
          scene_id: "s3",
          text: "यंदा एकूण 12000 शिष्यवृत्ती उपलब्ध करून देण्यात आल्या आहेत.",
          referenced_fact_ids: ["f3"],
          visual_keywords: ["Scholarship Batch", "Merit List"],
        },
        {
          scene_id: "s4",
          text: "शेवटची तारीख 30 नोव्हेंबर 2026 पूर्वी अधिकृत संकेतस्थळावर अर्ज सादर करा.",
          referenced_fact_ids: ["f4", "f5"],
          visual_keywords: ["Deadline Reminder", "Government Portal"],
        },
      ],
    },
    checks: [
      {
        claim_id: "s1",
        claim_text: "Application window opens 1 September 2026.",
        verdict: "SUPPORTED",
        confidence: 0.97,
        evidence_span: "The application window for the National Merit Scholarship opens on 1 September 2026.",
        evidence_fact_id: "f1",
        attempt: 1,
      },
      {
        claim_id: "s2",
        claim_text: "Qualifying score requirement is 75%.",
        verdict: "SUPPORTED",
        confidence: 0.94,
        evidence_span: "Eligible students must have scored at least 75 percent in their qualifying examination.",
        evidence_fact_id: "f2",
        attempt: 1,
      },
      {
        claim_id: "s3",
        claim_text: "Total scholarships count is 12,000.",
        verdict: "SUPPORTED",
        confidence: 0.99,
        evidence_span: "The total number of scholarships available this year is 12000.",
        evidence_fact_id: "f3",
        attempt: 1,
      },
      {
        claim_id: "s4",
        claim_text: "Deadline is 30 November 2026 with no late submissions accepted.",
        verdict: "SUPPORTED",
        confidence: 0.96,
        evidence_span: "Applications must be submitted online through the official portal before the deadline of 30 November 2026.",
        evidence_fact_id: "f4",
        attempt: 1,
      },
    ],
    status: "APPROVED",
  },
};

// Contradicted / Repair Demo fixture
export const MOCK_VERIFIED_SCRIPT_CONTRADICTED: VerifiedScript = {
  script: {
    script_id: "scr_demo_contra",
    job_id: "job_demo_injected",
    language: "hi",
    scenes: [
      {
        scene_id: "s1",
        text: "इस वर्ष कुल 21000 मेधावी छात्रवृत्तियां उपलब्ध कराई गई हैं।",
        referenced_fact_ids: ["f3"],
        visual_keywords: ["Scholarship Badge"],
      },
    ],
  },
  checks: [
    {
      claim_id: "s1",
      claim_text: "The total number of scholarships available this year is 21000.",
      verdict: "CONTRADICTED",
      confidence: 0.95,
      evidence_span: "The total number of scholarships available this year is 12000.",
      evidence_fact_id: "f3",
      reason: "Value(s) ['21000'] do not appear in the source. Source states: 'The total number of scholarships available this year is 12000.'",
      attempt: 1,
    },
  ],
  status: "NEEDS_HUMAN_REVIEW",
};

// Needs Human Review fixture (after attempt 3 exhausted)
export const MOCK_VERIFIED_SCRIPT_ESCALATED: VerifiedScript = {
  script: {
    script_id: "scr_demo_escalated",
    job_id: "job_demo_escalated",
    language: "ta",
    scenes: [
      {
        scene_id: "s1",
        text: "விண்ணப்பதாரர்களுக்கு இலவச மடிக்கணினியும் விடுதி வசதியும் வழங்கப்படும்.",
        referenced_fact_ids: [],
        visual_keywords: ["Laptop", "Hostel"],
      },
      {
        scene_id: "s2",
        text: "விண்ணப்பிக்க கடைசி நாள் 30 நவம்பர் 2026 ஆகும்.",
        referenced_fact_ids: ["f4"],
        visual_keywords: ["Calendar"],
      },
    ],
  },
  checks: [
    {
      claim_id: "s1",
      claim_text: "Applicants will also receive a free laptop and hostel accommodation.",
      verdict: "NEEDS_HUMAN_REVIEW",
      confidence: 0.0,
      evidence_span: "",
      evidence_fact_id: null,
      reason: "No source fact supports this statement after 3 repair attempts. Ungrounded perk claim.",
      attempt: 3,
    },
    {
      claim_id: "s2",
      claim_text: "Application deadline is 30 November 2026.",
      verdict: "SUPPORTED",
      confidence: 0.96,
      evidence_span: "Applications must be submitted online through the official portal before the deadline of 30 November 2026.",
      evidence_fact_id: "f4",
      attempt: 1,
    },
  ],
  status: "NEEDS_HUMAN_REVIEW",
};

// --------------------------------------------------------------------------
// Jobs Fixtures (Different States)
// --------------------------------------------------------------------------

export const MOCK_JOB_QUEUED: Job = {
  job_id: "job_queued_01",
  doc_id: "doc_nmss_2026",
  languages: ["hi", "mr", "ta"],
  stage: "queued",
  progress: {
    hi: "queued",
    mr: "queued",
    ta: "queued",
  },
  created_at: new Date(Date.now() - 30000).toISOString(),
};

export const MOCK_JOB_MID_PIPELINE: Job = {
  job_id: "job_active_02",
  doc_id: "doc_nmss_2026",
  languages: ["hi", "mr", "ta", "bn"],
  stage: "generating_media",
  progress: {
    hi: "generating_media",
    mr: "verifying (attempt 2, 1 failed)",
    ta: "scripting",
    bn: "queued",
  },
  created_at: new Date(Date.now() - 90000).toISOString(),
};

export const MOCK_JOB_PENDING_REVIEW: Job = {
  job_id: "job_pending_03",
  doc_id: "doc_nmss_2026",
  languages: ["hi", "mr", "ta"],
  stage: "pending_review",
  progress: {
    hi: "ready_for_review",
    mr: "ready_for_review",
    ta: "ready_for_review",
  },
  created_at: new Date(Date.now() - 240000).toISOString(),
  videos: [
    {
      language: "hi",
      video_path: "output/job_pending_03/hi/vaanireach_hi.mp4",
      captions_path: "output/job_pending_03/hi/captions.srt",
      duration_sec: 14.5,
    },
    {
      language: "mr",
      video_path: "output/job_pending_03/mr/vaanireach_mr.mp4",
      captions_path: "output/job_pending_03/mr/captions.srt",
      duration_sec: 13.8,
    },
    {
      language: "ta",
      video_path: "output/job_pending_03/ta/vaanireach_ta.mp4",
      captions_path: "output/job_pending_03/ta/captions.srt",
      duration_sec: 15.2,
    },
  ],
};

export const MOCK_JOB_COMPLETED: Job = {
  job_id: "job_approved_04",
  doc_id: "doc_nmss_2026",
  languages: ["hi", "mr", "ta"],
  stage: "approved",
  progress: {
    hi: "approved",
    mr: "approved",
    ta: "approved",
  },
  created_at: new Date(Date.now() - 3600000).toISOString(),
  review_notes: "Checked verbatim against official NMSS Gazette notice. All numerical dates and figures verified.",
  videos: [
    {
      language: "hi",
      video_path: "output/job_approved_04/hi/vaanireach_hi.mp4",
      captions_path: "output/job_approved_04/hi/captions.srt",
      duration_sec: 14.5,
    },
    {
      language: "mr",
      video_path: "output/job_approved_04/mr/vaanireach_mr.mp4",
      captions_path: "output/job_approved_04/mr/captions.srt",
      duration_sec: 13.8,
    },
    {
      language: "ta",
      video_path: "output/job_approved_04/ta/vaanireach_ta.mp4",
      captions_path: "output/job_approved_04/ta/captions.srt",
      duration_sec: 15.2,
    },
  ],
};

export const MOCK_HISTORY_JOBS: Job[] = [
  MOCK_JOB_COMPLETED,
  MOCK_JOB_PENDING_REVIEW,
  MOCK_JOB_MID_PIPELINE,
  {
    job_id: "job_rejected_05",
    doc_id: "doc_ugc_2026",
    languages: ["hi", "bn"],
    stage: "rejected",
    progress: { hi: "rejected", bn: "rejected" },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    review_notes: "Notice superseded by newer advisory dated 15 Aug 2026.",
  },
  {
    job_id: "job_failed_06",
    doc_id: "doc_corrupt_01",
    languages: ["hi", "te"],
    stage: "failed",
    progress: { hi: "failed", te: "failed" },
    created_at: new Date(Date.now() - 172800000).toISOString(),
    error: "ExtractionError: Unparseable PDF layout in table section.",
  },
];
