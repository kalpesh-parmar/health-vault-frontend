import * as SecureStore from "expo-secure-store";

import { BASE_URL } from "../config/api";

export type SseEventPayload = {
  event?: string;
  type?: string;
  id?: string;
  data?: any;
  rawData?: string;
  message?: string;
  stage?: string;
  stageStatus?: string;
  status?: string;
  percentage?: number;
  progress?: number;
  fileKey?: string;
  jobId?: string;
  sessionId?: string;
  completed?: number;
  failed?: number;
  total?: number;
  extra?: any;
  [key: string]: any;
};

export interface StreamCallbacks {
  onChunk: (chunkText: string) => void;
  onFinish: (finalData: any) => void;
  onError: (error: Error) => void;
}

type StreamOptions = {
  signal?: AbortSignal;
};

type ConnectSseOptions = {
  endpoint: string;
  method?: "GET" | "POST";
  body?: any;
  headers?: Record<string, string>;
  onEvent: (event: SseEventPayload) => void;
  onTerminal?: (event: SseEventPayload) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

const resolveUrl = (endpoint: string) => {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
};

const extractTextChunk = (data: any): string => {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";

  return (
    data.reply ??
    data.delta ??
    data.text ??
    data.content ??
    data.message ??
    data.chunk ??
    ""
  );
};

const processChunkBuffer = (
  buffer: string,
  onChunk: (chunkText: string) => void,
  onFinalData: (data: any) => void,
  finalData: any,
) => {
  const lines = buffer.split(/\r?\n/);
  const remainder = lines.pop() || "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (
      line === "[DONE]" ||
      line === "data: [DONE]" ||
      line === "data:[DONE]"
    ) {
      continue;
    }

    if (line.startsWith("data:")) {
      const dataStr = line.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(dataStr);
        const chunkText = extractTextChunk(parsed);
        if (chunkText) onChunk(chunkText);
        if (parsed && typeof parsed === "object") {
          Object.assign(finalData, parsed);
        }
      } catch {
        if (dataStr) onChunk(dataStr);
      }
      continue;
    }

    if (line.startsWith("event:") || line.startsWith("id:")) {
      continue;
    }

    try {
      const parsed = JSON.parse(line);
      const chunkText = extractTextChunk(parsed);
      if (chunkText) onChunk(chunkText);
      if (parsed && typeof parsed === "object") {
        Object.assign(finalData, parsed);
      }
    } catch {
      onChunk(line);
    }
  }

  return remainder;
};

const toHeaderEntries = (headers: Record<string, string>) =>
  Object.entries(headers).filter(([, value]) => value !== undefined && value !== null);

const parseMaybeJson = (value: string) => {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const isTerminalEvent = (event: SseEventPayload) => {
  const type = String(event.type || event.event || "").toUpperCase();
  const stage = String(event.stage || "").toUpperCase();
  const stageStatus = String(event.stageStatus || "").toUpperCase();
  const status = String(event.status || "").toUpperCase();

  const stateIndicators = [type, stageStatus, stage, status].filter(Boolean);

  for (const indicator of stateIndicators) {
    if (
      indicator.includes("FAILED") ||
      indicator.includes("ERROR") ||
      indicator.includes("REJECTED") ||
      indicator.includes("CANCELLED")
    ) {
      return true;
    }
  }

  for (const indicator of [type, stageStatus, stage]) {
    if (
      indicator.includes("COMPLETED") ||
      indicator.includes("DONE") ||
      indicator.includes("TERMINAL") ||
      indicator.includes("FINISHED")
    ) {
      return true;
    }
  }

  if (!stage && !stageStatus && !type && status === "SUCCESS") {
    return true;
  }

  return false;
};

const parseSseBlock = (block: string) => {
  const event: SseEventPayload = {};
  const dataLines: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line.startsWith(":")) continue;

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : line.trim();
    const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1).replace(/^\s/, "") : "";

    if (field === "event") {
      event.event = value;
      continue;
    }

    if (field === "id") {
      event.id = value;
      continue;
    }

    if (field === "data") {
      dataLines.push(value);
      continue;
    }

    if (field === "retry") {
      event.retry = Number(value);
      continue;
    }

    if (!event.rawData) {
      event.rawData = block;
    }
  }

  const rawData = dataLines.join("\n").trim();
  event.rawData = event.rawData || block;

  if (rawData) {
    const parsed = parseMaybeJson(rawData);
    event.data = parsed;

    if (parsed && typeof parsed === "object") {
      Object.assign(event, parsed);
    } else {
      event.message = String(parsed);
    }
  }

  if (!event.type) {
    event.type = event.event || (typeof event.data === "object" && event.data?.type) || undefined;
  }

  return event;
};

export const connectSseStream = ({
  endpoint,
  method = "GET",
  body,
  headers = {},
  onEvent,
  onTerminal,
  onError,
  signal,
}: ConnectSseOptions) => {
  const url = resolveUrl(endpoint);
  const xhr = new XMLHttpRequest();
  let lastLength = 0;
  let buffer = "";
  let settled = false;
  let manuallyClosed = false;

  const safeError = (error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    if (onError) onError(normalized);
  };

  const unsubscribe = () => {
    manuallyClosed = true;
    try {
      xhr.abort();
    } catch {
      // no-op
    }
  };

  const headersToSend: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "Bypass-Tunnel-Reminder": "true",
    ...headers,
  };

  const start = async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (token && !headersToSend.Authorization) {
      headersToSend.Authorization = `Bearer ${token}`;
    }

    console.log(
      `[API LOG] OUTGOING REQUEST:\n${JSON.stringify(
        {
          type: "OUTGOING_REQUEST",
          timestamp: new Date().toISOString(),
          method,
          url,
          queryParams: {},
          headers: {
            ...headersToSend,
            Authorization: token ? "Bearer ***" : headersToSend.Authorization,
          },
          body,
        },
        null,
        2,
      )}`,
    );

    xhr.open(method, url, true);
    xhr.responseType = "text";

    Object.entries(headersToSend).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        xhr.setRequestHeader(key, value);
      }
    });

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        safeError(new Error("Stream cancelled"));
        return;
      }

      const abortListener = () => xhr.abort();
      signal.addEventListener("abort", abortListener, { once: true });
      xhr.onloadend = () => signal.removeEventListener("abort", abortListener);
    }

    xhr.onprogress = () => {
      const text = xhr.responseText || "";
      const nextChunk = text.slice(lastLength);
      lastLength = text.length;
      if (!nextChunk) return;

      buffer += nextChunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;
        const event = parseSseBlock(trimmed);
        onEvent(event);
        if (isTerminalEvent(event) && onTerminal) {
          onTerminal(event);
        }
      }
    };

    xhr.onerror = () => safeError(new Error("Network error while streaming response"));
    xhr.onabort = () => {
      if (manuallyClosed) return;
      safeError(new Error("Stream cancelled"));
    };

    xhr.onload = () => {
      if (settled) return;
      settled = true;

      const text = xhr.responseText || "";
      const tail = text.slice(lastLength);
      if (tail) {
        buffer += tail;
      }

      if (buffer.trim()) {
        const blocks = buffer.split(/\r?\n\r?\n/);
        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed) continue;
          const event = parseSseBlock(trimmed);
          onEvent(event);
          if (isTerminalEvent(event) && onTerminal) {
            onTerminal(event);
          }
        }
      }
    };

    if (method === "GET") {
      xhr.send();
    } else {
      xhr.send(body ? JSON.stringify(body) : null);
    }
  };

  start().catch((error) => safeError(error));
  return unsubscribe;
};

export const streamChatResponse = async (
  endpoint: string,
  payload: any,
  callbacks: StreamCallbacks,
  options: StreamOptions = {},
) => {
  const { onChunk, onFinish, onError } = callbacks;
  const url = resolveUrl(endpoint);
  const startedAt = Date.now();

  try {
    const token = await SecureStore.getItemAsync("accessToken");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "ngrok-skip-browser-warning": "true",
      "Bypass-Tunnel-Reminder": "true",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `[API LOG] OUTGOING REQUEST:\n${JSON.stringify(
        {
          type: "OUTGOING_REQUEST",
          timestamp: new Date().toISOString(),
          method: "POST",
          url,
          queryParams: {},
          headers: {
            ...headers,
            Authorization: token ? "Bearer ***" : undefined,
          },
          body: payload,
        },
        null,
        2,
      )}`,
    );
    console.log("[STREAM] Request started:", url);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLength = 0;
      let buffer = "";
      let finalData: any = {};
      let accumulatedText = "";
      let sawFirstChunk = false;
      let settled = false;

      const finishOnce = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const failOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const pushChunk = (chunkText: string) => {
        if (!chunkText) return;
        if (!sawFirstChunk) {
          sawFirstChunk = true;
          console.log("[STREAM] First chunk received from backend.");
        }
        accumulatedText += chunkText;
        onChunk(chunkText);
      };

      const collectFinalData = (data: any) => {
        if (data && typeof data === "object") {
          finalData = { ...finalData, ...data };
        }
      };

      xhr.open("POST", url, true);
      xhr.responseType = "text";

      for (const [key, value] of toHeaderEntries(headers)) {
        xhr.setRequestHeader(key, value);
      }

      if (options.signal) {
        if (options.signal.aborted) {
          xhr.abort();
          failOnce(new Error("Stream cancelled"));
          return;
        }

        const abortListener = () => {
          xhr.abort();
          failOnce(new Error("Stream cancelled"));
        };

        options.signal.addEventListener("abort", abortListener, { once: true });

        xhr.onloadend = () => {
          options.signal?.removeEventListener("abort", abortListener);
        };
      }

      xhr.onprogress = () => {
        const text = xhr.responseText || "";
        const nextChunk = text.slice(lastLength);
        lastLength = text.length;

        if (!nextChunk) return;

        buffer += nextChunk;
        buffer = processChunkBuffer(buffer, pushChunk, collectFinalData, finalData);
      };

      xhr.onerror = () => {
        failOnce(new Error("Network error while streaming response"));
      };

      xhr.onabort = () => {
        failOnce(new Error("Stream cancelled"));
      };

      xhr.onload = () => {
        try {
          const text = xhr.responseText || "";
          const tail = text.slice(lastLength);
          if (tail) {
            buffer += tail;
            buffer = processChunkBuffer(buffer, pushChunk, collectFinalData, finalData);
          }

          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer.trim());
              const chunkText = extractTextChunk(parsed);
              if (chunkText) pushChunk(chunkText);
              collectFinalData(parsed);
            } catch {
              pushChunk(buffer.trim());
            }
          }

          if (!finalData.reply && accumulatedText) {
            finalData.reply = accumulatedText;
          }

          console.log(
            `[API LOG] OUTGOING RESPONSE:\n${JSON.stringify(
              {
                type: "OUTGOING_RESPONSE",
                timestamp: new Date().toISOString(),
                method: "POST",
                url,
                statusCode: xhr.status,
                responseTimeMs: `${Date.now() - startedAt}ms`,
                responseBody: finalData,
              },
              null,
              2,
            )}`,
          );
          console.log("[STREAM] Request finished.", {
            receivedChunks: sawFirstChunk,
            responseTimeMs: `${Date.now() - startedAt}ms`,
          });

          onFinish(finalData);
          finishOnce();
        } catch (error: any) {
          failOnce(error instanceof Error ? error : new Error(String(error)));
        }
      };

      xhr.send(JSON.stringify(payload));
    });
  } catch (error: any) {
    if (error?.message === "Stream cancelled") {
      onError(new Error("Stream cancelled"));
      throw error;
    }

    console.error("[STREAM] Error:", error);
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    onError(normalizedError);
    throw normalizedError;
  }
};
