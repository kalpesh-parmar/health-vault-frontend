import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { documentUpload, runOcr, addDocument } from "../services/documentService";
import { connectSseStream, SseEventPayload } from "../services/streamService";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";

export interface UploadedFile {
  fileName: string;
  fileSize: number;
  fileType: string;
}

const extractEventProgress = (event: any): number | undefined => {
  if (typeof event?.percentage === "number") return Math.round(event.percentage);
  if (typeof event?.progress === "number") {
    return event.progress <= 1 ? Math.round(event.progress * 100) : Math.round(event.progress);
  }
  if (typeof event?.data?.percentage === "number") return Math.round(event.data.percentage);
  if (typeof event?.data?.progress === "number") {
    return event.data.progress <= 1
      ? Math.round(event.data.progress * 100)
      : Math.round(event.data.progress);
  }
  if (typeof event?.extra?.percentage === "number") return Math.round(event.extra.percentage);
  if (typeof event?.extra?.progress === "number") {
    return event.extra.progress <= 1
      ? Math.round(event.extra.progress * 100)
      : Math.round(event.extra.progress);
  }
  if (event?.extra?.totalPages && event?.extra?.page) {
    return Math.round((event.extra.page / event.extra.totalPages) * 100);
  }
  return undefined;
};

export const useSaveDocument = (onSuccessGlobal?: (file: UploadedFile) => void) => {
  const queryClient = useQueryClient();
  const [progressStage, setProgressStage] = useState<string>("IDLE");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async ({
      fileName,
      documentType,
      images,
    }: {
      fileName: string;
      documentType: string;
      images: string;
    }) => {
      // Step 1: Upload
      setProgressStage("UPLOADING_FILE");
      setProgressPercentage(0);
      setProgressMessage("Uploading report to secure storage...");

      const formData = new FormData();
      const uriParts = images.split(".");
      const fileExtension = uriParts[uriParts.length - 1] || "jpg";
      const name = `${fileName}.${fileExtension}`;
      const type =
        fileExtension === "pdf"
          ? "application/pdf"
          : `image/${fileExtension === "png" ? "png" : "jpeg"}`;

      formData.append("file", {
        uri: images,
        name: name,
        type: type,
      } as any);
      formData.append("uploadType", "PATIENT_DOCUMENT");
      formData.append("category", documentType || "medical_document");

      const uploadRes = await documentUpload(formData);
      const fileKey = uploadRes?.data?.fileKey;
      const mimeType = uploadRes?.data?.mimeType;

      if (!fileKey) {
        throw new Error("Upload response missing file key");
      }

      // Step 2: Trigger run-ocr
      setProgressStage("VALIDATING");
      setProgressMessage("Checking whether the document is medical.");

      await runOcr({ fileKey, documentType });

      // Step 3: Stream progress via SSE (Zero polling)
      const job: any = await new Promise((resolve, reject) => {
        let terminalReceived = false;
        const unsubscribe = connectSseStream({
          endpoint: DOCUMENT_ENDPOINTS.SSE_FILE_STREAM(fileKey),
          onEvent: (event: SseEventPayload) => {
            const streamPct = extractEventProgress(event);
            if (typeof streamPct === "number") {
              setProgressPercentage(streamPct);
            }
            if (event.message) {
              setProgressMessage(event.message);
            }
            if (event.stage) {
              setProgressStage(event.stage);
            }

            const isCompleted =
              event.stage === "COMPLETED" ||
              event.stageStatus === "COMPLETED" ||
              event.type === "document.completed" ||
              (event.status === "SUCCESS" && (streamPct === 100 || event.percentage === 100));

            const isFailed =
              event.stage === "FAILED" ||
              event.stageStatus === "FAILED" ||
              event.type === "document.failed" ||
              event.status === "FAILED";

            if (isCompleted && !terminalReceived) {
              terminalReceived = true;
              setProgressPercentage(100);
              unsubscribe();
              resolve(event);
            } else if (isFailed && !terminalReceived) {
              terminalReceived = true;
              unsubscribe();
              reject(new Error(event.message || "Document analysis failed"));
            }
          },
          onTerminal: (event: SseEventPayload) => {
            if (!terminalReceived) {
              terminalReceived = true;
              unsubscribe();
              if (event.stage === "COMPLETED" || event.stageStatus === "COMPLETED" || event.type === "document.completed") {
                resolve(event);
              } else {
                reject(new Error(event.message || "Document analysis failed"));
              }
            }
          },
          onError: (err) => {
            if (!terminalReceived) {
              terminalReceived = true;
              unsubscribe();
              reject(err);
            }
          },
        });
      });

      console.log("filekey :- ", fileKey);

      // Step 4: Add document
      const addRes = await addDocument({
        documentType,
        s3Key: fileKey,
        fileName,
        fileType: mimeType,
        s3bucket: uploadRes?.data?.s3Bucket,
        rawOcrData: job.rawOcrData || job.extra || {},
        extractedStructuredData: job.extractedStructuredData || job.summary || {},
        graphs: job.graphs || [],
        embeddingsGenerated: true
      });

      return {
        data: addRes.data,
        file: {
          fileName,
          fileSize: uploadRes?.data?.fileSize || 0,
          fileType: mimeType
        }
      };
    },
    mutationKey: ["documents"],
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });

      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: "Document Added",
          text2: "Your document has been uploaded successfully.",
        });
        onSuccessGlobal?.(result.file);
      }, 1000);
    },
    onError: (error: any) => {
      const isInvalidDoc =
        error.message &&
        (error.message.includes("not a medical document") ||
          error.message.includes("valid medical report"));

      if (isInvalidDoc) {
        Toast.show({
          type: "error",
          text1: "Invalid Document",
          text2: "Please upload a valid medical report such as a lab report, prescription, X-ray, MRI, or discharge summary.",
          visibilityTime: 6000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Upload Failed",
          text2: error.message || "An error occurred during upload/processing",
        });
      }
      console.log("Error :- ", error);
    },
  });

  const handleSave = async (params: {
    fileName: string;
    documentType: string;
    images: string;
  }) => {
    if (!params.images) return;
    try {
      setProgressStage("IDLE");
      setProgressPercentage(0);
      setProgressMessage("");
      await mutation.mutateAsync(params);
    } catch {
      // errors handled by mutation
    }
  };

  return {
    handleSave,
    isSaving: mutation.isPending,
    progressStage,
    progressPercentage,
    progressMessage,
  };
};
