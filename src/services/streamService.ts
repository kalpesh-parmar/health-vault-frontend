import * as SecureStore from "expo-secure-store";

import { BASE_URL } from "../config/api";

export interface StreamCallbacks {
  onChunk: (chunkText: string) => void;
  onFinish: (finalData: any) => void;
  onError: (error: Error) => void;
}

type StreamOptions = {
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
