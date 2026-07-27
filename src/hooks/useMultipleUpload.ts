import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import apiClient from "../services/apiClient";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";

export interface UploadingDoc {
  id: string;
  name: string;
  progress: number;
  status: string;
}

export const useMultipleUpload = (onSuccessGlobal?: () => void) => {
  const queryClient = useQueryClient();
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const isPollingRef = useRef(false);

  useEffect(() => {
    return () => {
      isPollingRef.current = false;
    };
  }, []);

  const mapStatusToProgress = (item: any): number => {
    let progress = item.progress;
    if (progress !== undefined && progress !== null) {
      return typeof progress === "number" && progress <= 1
        ? Math.round(progress * 100)
        : Math.round(progress);
    }

    const status = (item.status || item.stage || "").toLowerCase();
    if (status === "done" || status === "completed" || status === "success") {
      return 100;
    } else if (status === "failed") {
      return -1;
    } else if (status === "summarizing") {
      return 90;
    } else if (status === "analyzing") {
      return 70;
    } else if (status === "extracting") {
      return 50;
    } else if (status === "validating") {
      return 30;
    } else if (status === "queued" || status === "ocr_queued") {
      return 15;
    } else if (
      status === "processing" ||
      status === "ocr_started" ||
      status === "started"
    ) {
      if (item.totalPages && item.currentPage) {
        return Math.round((item.currentPage / item.totalPages) * 100);
      }
      return 40;
    }
    return 10; // Default initial progress
  };

  const startPolling = (initialDocs: UploadingDoc[]) => {
    isPollingRef.current = true;

    const runPoll = async () => {
      if (!isPollingRef.current) return;
      const endpoint = DOCUMENT_ENDPOINTS.OCR_STATUS.replace(
        "{documentId}",
        initialDocs[0]?.id,
      );

      try {
        const response = await apiClient.get(endpoint, {
          params: {
            documentId: initialDocs[0]?.id,
          },
        });
        const apiDocs =
          response.data?.data ||
          response.data?.items ||
          response.data ||
          [];

        console.log("API Docs :- ", apiDocs);

        let allFinished = true;

        setUploadingDocs((prev) => {
          if (prev.length === 0) {
            isPollingRef.current = false;
            return [];
          }

          const next = prev.map((doc) => {
            const matched = apiDocs.find((d: any) => d.documentId === doc.id);
            if (matched) {
              const progress = mapStatusToProgress(matched);
              const status = matched.status || matched.stage || doc.status;
              const isDone =
                status === "done" ||
                status === "completed" ||
                status === "success" ||
                status === "failed";
              if (!isDone) {
                allFinished = false;
              }
              return { ...doc, progress, status };
            }

            const isDone =
              doc.status === "done" ||
              doc.status === "completed" ||
              doc.status === "success" ||
              doc.status === "failed";
            if (!isDone) {
              allFinished = false;
            }
            return doc;
          });

          if (allFinished) {
            isPollingRef.current = false;
            setIsUploading(false);

            // Invalidate query client queries to refresh Document components
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
            queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });

            onSuccessGlobal?.();

            const hasFailures = next.some(
              (d) => d.status === "failed" || d.progress < 0,
            );
            if (hasFailures) {
              Toast.show({
                type: "error",
                text1: "Processing Finished with Errors",
                text2: "Some documents failed to process.",
              });
            } else {
              Toast.show({
                type: "success",
                text1: "Processing Complete",
                text2: "All documents processed successfully.",
              });
              // Auto-dismiss list after 4 seconds
              setTimeout(() => {
                setUploadingDocs((current) => {
                  const stillHasFailures = current.some(
                    (d) => d.status === "failed" || d.progress < 0,
                  );
                  if (stillHasFailures) return current;
                  return [];
                });
              }, 2000);
            }
          }

          return next;
        });
      } catch (err) {
        console.warn("[Polling OCR Status Error]", err);
      }

      if (isPollingRef.current) {
        setTimeout(runPoll, 3000);
      }
    };

    setTimeout(runPoll, 3000);
  };

  const uploadMultipleDocs = async (files: any[]) => {
    setIsUploading(true);
    setError(null);
    setUploadingDocs([]);
    setIsProgressExpanded(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        const fileUri = file.uri;
        const uriParts = fileUri.split(".");
        const fileExtension = uriParts[uriParts.length - 1] || "jpg";
        const name = file.name || `document_${Date.now()}.${fileExtension}`;
        const type =
          file.type ||
          (fileExtension === "pdf"
            ? "application/pdf"
            : `image/${fileExtension === "png" ? "png" : "jpeg"}`);

        formData.append("file", {
          uri: fileUri,
          name: name,
          type: type,
        } as any);
      });
      formData.append("uploadType", "PATIENT_DOCUMENT");
      formData.append("category", "medical_document");

      const response = await apiClient.post(
        DOCUMENT_ENDPOINTS.OCR_EXTRACT,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 240000,
        },
      );

      const data = response.data?.data;
      const documentsList =
        data?.documents ||
        data?.items ||
        (data?.document ? [data.document] : []);

      if (!documentsList || documentsList.length === 0) {
        throw new Error("No documents returned from server.");
      }

      const docs = documentsList.map((doc: any, index: number) => ({
        id: doc.id,
        name:
          doc.fileName ||
          doc.originalFileName ||
          files[index]?.name ||
          `Document ${index + 1}`,
        progress: 15,
        status: doc.status || "queued",
      }));

      setUploadingDocs(docs);
      startPolling(docs);
    } catch (err: any) {
      console.error("[Multiple Upload Error]", err);
      setIsUploading(false);
      setError(err.message || "Failed to upload documents.");
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: err.message || "Failed to upload documents.",
      });
    }
  };

  const cancelUpload = () => {
    isPollingRef.current = false;
    setIsUploading(false);
    setUploadingDocs([]);
  };

  return {
    uploadingDocs,
    isUploading,
    error,
    isProgressExpanded,
    setIsProgressExpanded,
    uploadMultipleDocs,
    cancelUpload,
    setUploadingDocs,
  };
};
