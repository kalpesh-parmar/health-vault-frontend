// /*
// import * as SecureStore from "expo-secure-store";
// import { BASE_URL } from "../config/api";

// export interface StreamCallbacks {
//   onChunk: (chunkText: string) => void;
//   onFinish: (finalData: any) => void;
//   onError: (error: Error) => void;
// }

// export const streamChatResponse = async (
//   endpoint: string,
//   payload: any,
//   callbacks: StreamCallbacks
// ) => {
//   const { onChunk, onFinish, onError } = callbacks;

//   try {
//     const token = await SecureStore.getItemAsync("authToken");
//     const headers: Record<string, string> = {
//       "Content-Type": "application/json",
//       "Accept": "text/event-stream",
//       "ngrok-skip-browser-warning": "true",
//       "Bypass-Tunnel-Reminder": "true",
//     };

//     if (token) {
//       headers["Authorization"] = `Bearer ${token}`;
//     }

//     const url = `${BASE_URL}${endpoint}`;
    
//     // For React Native we use fetch. In environments where fetch streaming is fully supported, 
//     // response.body is a ReadableStream. In some older RN versions, we may need a polyfill, 
//     // but we will attempt to use standard getReader().
//     const response = await fetch(url, {
//       method: "POST",
//       headers,
//       body: JSON.stringify(payload),
//       // react-native specific flag to enable streaming in some versions
//       reactNative: { textStreaming: true },
//     } as any);

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`API Error ${response.status}: ${errorText}`);
//     }

//     // Support for environments that expose response.body.getReader()
//     if (response.body && typeof (response.body as any).getReader === "function") {
//       const reader = (response.body as any).getReader();
//       // Wait, React Native might not have TextDecoder natively if not polyfilled,
//       // but let's assume it does or we can parse chunks directly.
//       const decoder = new TextDecoder("utf-8");
      
//       let finalData: any = {};
//       let buffer = "";

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         const chunk = decoder.decode(value, { stream: true });
//         buffer += chunk;

//         // Process SSE lines
//         const lines = buffer.split("\n");
//         buffer = lines.pop() || ""; // Keep the incomplete line in the buffer

//         for (let line of lines) {
//           line = line.trim();
//           if (!line) continue;
          
//           if (line.startsWith("data:")) {
//             const dataStr = line.replace(/^data:\s*/, "");
//             if (dataStr === "[DONE]") {
//               // End of stream marker if backend uses it
//               break;
//             }
//             try {
//               const dataObj = JSON.parse(dataStr);
//               // Check if it's a delta/reply chunk
//               if (dataObj.reply !== undefined) {
//                 onChunk(dataObj.reply);
//               } else if (dataObj.text !== undefined) {
//                 onChunk(dataObj.text);
//               }
//               // Merge all other properties into finalData
//               finalData = { ...finalData, ...dataObj };
//             } catch (e) {
//               console.warn("[STREAM] Failed to parse SSE data line:", dataStr);
//             }
//           }
//         }
//       }
      
//       onFinish(finalData);
//     } else {
//       // Fallback: If getReader is not available, try to parse the entire text response 
//       // (This breaks streaming but prevents a hard crash in unsupported RN versions).
//       const text = await response.text();
//       const lines = text.split("\n");
//       let finalData: any = {};
//       let accumulatedReply = "";

//       for (let line of lines) {
//         line = line.trim();
//         if (line.startsWith("data:")) {
//           const dataStr = line.replace(/^data:\s*/, "");
//           if (dataStr === "[DONE]") continue;
//           try {
//             const dataObj = JSON.parse(dataStr);
//             if (dataObj.reply !== undefined) {
//               accumulatedReply += dataObj.reply;
//             } else if (dataObj.text !== undefined) {
//               accumulatedReply += dataObj.text;
//             }
//             finalData = { ...finalData, ...dataObj };
//           } catch (e) {
//              // ignore
//           }
//         }
//       }
      
//       if (accumulatedReply) {
//         onChunk(accumulatedReply);
//       }
//       onFinish(finalData);
//     }
//   } catch (error: any) {
//     console.error("[STREAM] Error:", error);
//     onError(error);
//   }
// };
// */
