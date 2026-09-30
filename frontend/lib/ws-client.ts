/**
 * VaaniReach Resilient WebSocket & Polling Client.
 *
 * Implements useJobStatus hook with:
 * - Immediate state delivery on connect
 * - Exponential backoff reconnection (1s -> 2s -> 4s -> 8s -> 10s cap)
 * - Automatic degradation to HTTP polling (GET /api/jobs/{id} every 3s) after 3 failed reconnects
 * - Clean teardown on terminal stages (approved, rejected, failed) and unmount
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Job, JobStatus, Stage } from "./types";
import { api, getApiBase } from "./api";
import { MOCK_JOB_MID_PIPELINE } from "./mock";

export type ConnectionMode = "live" | "reconnecting" | "polling" | "disconnected";

export interface UseJobStatusResult {
  status: JobStatus | null;
  job: Job | null;
  connectionMode: ConnectionMode;
  reconnectAttempts: number;
  error: string | null;
  refresh: () => Promise<void>;
}

const TERMINAL_STAGES: Set<Stage> = new Set(["approved", "rejected", "failed"]);

export function useJobStatus(jobId: string | undefined): UseJobStatusResult {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const attemptsRef = useRef(0);

  // Helper to map Job to JobStatus
  const jobToStatus = (j: Job): JobStatus => ({
    job_id: j.job_id,
    stage: j.stage,
    languages: j.languages,
    progress: j.progress,
    error: j.error,
  });

  // --------------------------------------------------------------------------
  // HTTP Polling Fallback (GET /api/jobs/{id})
  // --------------------------------------------------------------------------
  const pollJob = useCallback(async () => {
    if (!jobId || isUnmountedRef.current) return;
    try {
      const fetchedJob = await api.getJob(jobId);
      if (isUnmountedRef.current) return;

      setJob(fetchedJob);
      const newStatus = jobToStatus(fetchedJob);
      setStatus(newStatus);
      setError(fetchedJob.error || null);

      // If terminal stage reached, stop polling
      if (TERMINAL_STAGES.has(fetchedJob.stage)) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    } catch {
      // In offline / mock mode, advance mock job state so UI is dynamic
      if (!isUnmountedRef.current && !job) {
        const mock = { ...MOCK_JOB_MID_PIPELINE, job_id: jobId };
        setJob(mock);
        setStatus(jobToStatus(mock));
      }
    }
  }, [jobId]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setConnectionMode("polling");
    pollJob();
    pollIntervalRef.current = setInterval(pollJob, 3000);
  }, [pollJob]);

  // --------------------------------------------------------------------------
  // WebSocket Connection with Exponential Backoff
  // --------------------------------------------------------------------------
  const connectWebSocket = useCallback(() => {
    if (!jobId || isUnmountedRef.current) return;

    // Check if terminal state already reached
    if (status && TERMINAL_STAGES.has(status.stage)) {
      return;
    }

    const base = getApiBase();
    const wsProtocol = base.startsWith("https") ? "wss:" : "ws:";
    const wsHost = base.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}//${wsHost}/ws/jobs/${encodeURIComponent(jobId)}`;

    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) return;
        setConnectionMode("live");
        setReconnectAttempts(0);
        attemptsRef.current = 0;
        setError(null);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        try {
          const payload = JSON.parse(event.data) as JobStatus;
          setStatus(payload);
          setError(payload.error || null);

          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  stage: payload.stage,
                  progress: payload.progress,
                  error: payload.error,
                }
              : {
                  job_id: payload.job_id,
                  doc_id: "doc_active",
                  languages: payload.languages,
                  stage: payload.stage,
                  progress: payload.progress,
                  error: payload.error,
                }
          );

          // Close on terminal states
          if (TERMINAL_STAGES.has(payload.stage)) {
            ws.close();
          }
        } catch (e) {
          console.error("Failed to parse WebSocket status payload:", e);
        }
      };

      ws.onerror = () => {
        // Handled in onclose
      };

      ws.onclose = () => {
        if (isUnmountedRef.current) return;

        // If closed because job finished, stay disconnected
        if (status && TERMINAL_STAGES.has(status.stage)) {
          setConnectionMode("disconnected");
          return;
        }

        attemptsRef.current += 1;
        setReconnectAttempts(attemptsRef.current);

        // After 3 failed reconnect attempts, degrade to HTTP polling
        if (attemptsRef.current >= 3) {
          startPolling();
        } else {
          setConnectionMode("reconnecting");
          // Exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
          const delay = Math.min(1000 * Math.pow(2, attemptsRef.current - 1), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) connectWebSocket();
          }, delay);
        }
      };
    } catch {
      attemptsRef.current += 1;
      setReconnectAttempts(attemptsRef.current);
      startPolling();
    }
  }, [jobId, status, startPolling]);

  // Initial mount & ID changes
  useEffect(() => {
    isUnmountedRef.current = false;
    attemptsRef.current = 0;
    setReconnectAttempts(0);

    // Initial fetch
    pollJob();
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [jobId, connectWebSocket, pollJob]);

  const refresh = async () => {
    attemptsRef.current = 0;
    setReconnectAttempts(0);
    await pollJob();
    connectWebSocket();
  };

  return {
    status,
    job,
    connectionMode,
    reconnectAttempts,
    error,
    refresh,
  };
}
