/**
 * VaaniReach Typed API Client.
 *
 * Provides typed methods for interacting with L1 Ingestion and L5 Orchestration
 * backend endpoints over REST and WebSocket.
 */

import {
  ExtractionResult,
  Job,
  JobStatus,
  ScrapedNotice,
  SourceDocument,
  VerifiedScript,
} from "./types";

export class ApiError extends Error {
  public statusCode: number;
  public data?: unknown;

  constructor(statusCode: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options?.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorData: unknown;
      let errorMessage = `HTTP error ${res.status}: ${res.statusText}`;

      try {
        errorData = await res.json();
        if (typeof errorData === "object" && errorData !== null) {
          const detail = (errorData as { detail?: string; message?: string }).detail ||
            (errorData as { message?: string }).message;
          if (detail) errorMessage = detail;
        }
      } catch {
        // Body was not JSON
      }

      throw new ApiError(res.status, errorMessage, errorData);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(0, `Unable to reach backend at ${API_BASE} (${message})`, err);
  }
}

// --------------------------------------------------------------------------
// API Endpoints
// --------------------------------------------------------------------------

export const api = {
  /** Health check endpoint */
  async health(): Promise<{ status: string; service?: string }> {
    return request<{ status: string; service?: string }>("/health");
  },

  /** Scrape a public notice website to detect all published announcements */
  async scrapeUrl(url: string): Promise<ScrapedNotice[]> {
    return request<ScrapedNotice[]>("/api/ingestion/scrape", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  /** Fetch raw content / details for a specific notice */
  async fetchNotice(url: string, noticeId?: string): Promise<SourceDocument> {
    return request<SourceDocument>("/api/ingestion/fetch", {
      method: "POST",
      body: JSON.stringify({ url, notice_id: noticeId }),
    });
  },

  /** Upload and parse official circular file (.pdf, .docx, .txt) */
  async uploadFile(
    file: File,
    category = "Other"
  ): Promise<{
    doc_id: string;
    title: string;
    origin: string;
    origin_ref: string;
    raw_text: string;
    category: string;
    length: number;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const url = `${API_BASE}/api/upload`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new ApiError(res.status, `Upload failed: ${res.statusText}`);
    }
    return (await res.json()) as {
      doc_id: string;
      title: string;
      origin: string;
      origin_ref: string;
      raw_text: string;
      category: string;
      length: number;
    };
  },

  /** Submit a new job to the pipeline */
  async createJob(doc: SourceDocument, languages: string[]): Promise<Job> {
    return request<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ doc, languages }),
    });
  },

  /** Get current job details */
  async getJob(jobId: string): Promise<Job> {
    return request<Job>(`/api/jobs/${encodeURIComponent(jobId)}`);
  },

  /** Get source document ground truth for a job */
  async getJobDocument(jobId: string): Promise<SourceDocument> {
    return request<SourceDocument>(`/api/jobs/${encodeURIComponent(jobId)}/document`);
  },

  /** List recent jobs for history/analytics */
  async listJobs(): Promise<Job[]> {
    return request<Job[]>("/api/jobs");
  },

  /** Retrieve the extracted facts for a job */
  async getJobExtraction(jobId: string): Promise<ExtractionResult> {
    return request<ExtractionResult>(`/api/jobs/${encodeURIComponent(jobId)}/extraction`);
  },

  /** Retrieve verified scripts per language */
  async getJobVerifiedScripts(jobId: string): Promise<Record<string, VerifiedScript>> {
    return request<Record<string, VerifiedScript>>(`/api/jobs/${encodeURIComponent(jobId)}/verified`);
  },

  /** Human Review: Approve job for publication */
  async approveJob(jobId: string, notes = ""): Promise<Job> {
    return request<Job>(`/api/jobs/${encodeURIComponent(jobId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  /** Human Review: Reject job */
  async rejectJob(jobId: string, notes = ""): Promise<Job> {
    return request<Job>(`/api/jobs/${encodeURIComponent(jobId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  /** Human Review: Request edit / targeted repair back to scripting stage */
  async requestEdit(jobId: string, notes: string): Promise<Job> {
    return request<Job>(`/api/jobs/${encodeURIComponent(jobId)}/edit`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },
};

/**
 * Connect to live WebSocket feed for job status updates (L5 -> L6)
 */
export function connectJobStatusSocket(
  jobId: string,
  onStatus: (status: JobStatus) => void,
  onError?: (event: Event) => void,
  onClose?: (event: CloseEvent) => void
): () => void {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsHost = API_BASE.replace(/^https?:\/\//, "");
  const socketUrl = `${wsProtocol}//${wsHost}/ws/jobs/${encodeURIComponent(jobId)}`;

  let ws: WebSocket | null = null;
  let isClosedManually = false;

  try {
    ws = new WebSocket(socketUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobStatus;
        onStatus(data);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onerror = (err) => {
      if (onError) onError(err);
    };

    ws.onclose = (event) => {
      if (onClose && !isClosedManually) onClose(event);
    };
  } catch (err) {
    console.error("WebSocket connection initiation failed:", err);
  }

  return () => {
    isClosedManually = true;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  };
}
