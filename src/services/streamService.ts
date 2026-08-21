import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config/api";

export interface SseEventPayload {
  eventId?: number;
  type?: string;
  stage?: string;
  stageStatus?: string;
  fileKey?: string | null;
  batchId?: string | null;
  fileName?: string | null;
  patientId?: string | null;
  processName?: string | null;
  progress?: number;
  percentage?: number;
  status?: string;
  message?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
  documentId?: string | null;
  completed?: number;
  total?: number;
  failed?: number;
  pending?: string[];
  isComplete?: boolean;
  summary?: any;
  timestamp?: string;
  elapsedMs?: number;
  extra?: {
    page?: number;
    totalPages?: number;
    skippedPages?: (number | { pageNumber: number; reason?: string })[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface StreamCallbacks {
  onEvent: (event: SseEventPayload) => void;
  onTerminal?: (event: SseEventPayload) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
}

export interface SseStreamOptions extends StreamCallbacks {
  endpoint: string;
  lastEventId?: number | string | null;
}

/**
 * Connects to an SSE stream endpoint (individual file or batch) using incremental XMLHttpRequest.
 * Supports React Native streaming with automatic token injection, Last-Event-ID replay, and robust buffering.
 * Returns an unsubscribe / abort function.
 */
export const connectSseStream = (options: SseStreamOptions): (() => void) => {
  const { endpoint, lastEventId, onEvent, onTerminal, onError, onConnected } = options;
  let isClosed = false;
  let xhr: XMLHttpRequest | null = null;

  const runStream = async () => {
    try {
      let token = await SecureStore.getItemAsync("ACCESS_TOKEN");
      if (!token) {
        token = await AsyncStorage.getItem("ACCESS_TOKEN");
      }

      if (isClosed) return;

      let fullUrl = endpoint;
      if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
        const base = (BASE_URL || "").replace(/\/$/, "");
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        fullUrl = `${base}${path}`;
      }

      console.log(`[SSE:CONNECT] Initiating stream connection to: ${fullUrl} | Last-Event-ID: ${lastEventId ?? "none"}`);

      xhr = new XMLHttpRequest();
      xhr.open("GET", fullUrl, true);

      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");
      xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
      xhr.setRequestHeader("Bypass-Tunnel-Reminder", "true");

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      if (lastEventId !== undefined && lastEventId !== null) {
        xhr.setRequestHeader("Last-Event-ID", String(lastEventId));
      }

      let lastProcessedIndex = 0;
      let buffer = "";
      let currentEventName = "message";
      let currentEventId: number | string | undefined;
      let currentDataLines: string[] = [];
      let connectedFired = false;

      const processText = () => {
        if (isClosed || !xhr) return;
        const responseText = xhr.responseText || "";
        if (responseText.length <= lastProcessedIndex) return;

        const newChunk = responseText.substring(lastProcessedIndex);
        lastProcessedIndex = responseText.length;
        buffer += newChunk;

        console.log(`[SSE:CHUNK] Received ${newChunk.length} bytes (total: ${lastProcessedIndex})`);

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trimEnd();

          if (line === "") {
            // Empty line marks completion of an SSE message block
            if (currentDataLines.length > 0) {
              const fullData = currentDataLines.join("\n").trim();
              currentDataLines = [];

              if (fullData === "[DONE]") {
                console.log("[SSE:TERMINAL] Stream completed via [DONE]");
                onTerminal?.({ type: "stream.done", stage: "COMPLETED", progress: 100 });
                return;
              }

              try {
                const parsed: SseEventPayload = JSON.parse(fullData);
                if (currentEventId !== undefined) {
                  parsed.eventId = Number(currentEventId) || parsed.eventId;
                }
                if (!parsed.type || parsed.type === "message") {
                  parsed.type = currentEventName !== "message" ? currentEventName : (parsed.type || "progress");
                }

                console.log(`[SSE:EVENT] Parsed: type=${parsed.type} | fileKey=${parsed.fileKey ?? "none"} | stage=${parsed.stage ?? parsed.stageStatus ?? "none"} | pct=${parsed.percentage ?? parsed.progress ?? 0}%`);

                onEvent(parsed);

                const isTerminal =
                  parsed.type === "batch.completed" ||
                  parsed.type === "document.completed" ||
                  parsed.type === "document.failed" ||
                  parsed.stage === "COMPLETED" ||
                  parsed.stage === "FAILED" ||
                  parsed.stageStatus === "COMPLETED" ||
                  parsed.stageStatus === "FAILED" ||
                  parsed.stage === "BATCH_COMPLETED";

                if (isTerminal) {
                  console.log(`[SSE:TERMINAL] Terminal event reached: type=${parsed.type} | fileKey=${parsed.fileKey}`);
                  onTerminal?.(parsed);
                }
              } catch (err) {
                console.warn("[SSE:PARSE_ERROR] Could not parse event data JSON:", fullData, err);
              }
            }
            currentEventName = "message";
            continue;
          }

          if (line.startsWith(":")) {
            // Heartbeat or comment line
            continue;
          }

          if (line.startsWith("event:")) {
            currentEventName = line.slice(6).trim();
          } else if (line.startsWith("id:")) {
            currentEventId = line.slice(3).trim();
          } else if (line.startsWith("data:")) {
            currentDataLines.push(line.slice(5).trim());
          }
        }
      };

      xhr.onreadystatechange = () => {
        if (isClosed || !xhr) return;

        if (xhr.readyState >= 2 && xhr.status >= 200 && xhr.status < 300) {
          if (!connectedFired) {
            connectedFired = true;
            console.log(`[SSE:OPEN] SSE connection opened successfully (status ${xhr.status})`);
            onConnected?.();
          }
        }

        if (xhr.readyState === 3 || xhr.readyState === 4) {
          processText();
        }

        if (xhr.readyState === 4) {
          processText();
          if (xhr.status >= 400 && !isClosed) {
            console.error(`[SSE:ERROR] Connection closed with HTTP status ${xhr.status}`);
            onError?.(new Error(`SSE connection failed with HTTP status ${xhr.status}`));
          } else {
            console.log(`[SSE:CLOSE] Stream connection closed normally (status ${xhr.status})`);
          }
        }
      };

      xhr.onprogress = () => {
        processText();
      };

      xhr.onerror = () => {
        if (!isClosed) {
          console.error("[SSE:ERROR] XMLHttpRequest network error occurred");
          onError?.(new Error("SSE XMLHttpRequest network error"));
        }
      };

      xhr.send();
    } catch (err: any) {
      if (!isClosed) {
        console.error("[SSE:ERROR] Stream initialization failure:", err.message);
        onError?.(err);
      }
    }
  };

  runStream();

  return () => {
    isClosed = true;
    if (xhr) {
      console.log("[SSE:ABORT] Aborting SSE stream connection");
      try {
        xhr.abort();
      } catch { }
      xhr = null;
    }
  };
};
