import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import Toast from "react-native-toast-message";
import apiClient from "../services/apiClient";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";
import { SelectedDocument } from "../types/documentUpload";
import { queryClient } from "../config/queryClient";
import { uploadPatientDocuments, startOcrJob, getOcrJob, cancelOcr } from "../services/documentService";

export interface UploadingDoc {
  id: string;
  name: string;
  progress: number;
  status: string;
  reason?: string | null;
}

interface DocumentUploadContextType {
  selectedFiles: SelectedDocument[];
  isUploading: boolean;
  uploadingDocs: UploadingDoc[];
  isProgressExpanded: boolean;
  setIsProgressExpanded: (val: boolean) => void;
  addSelectedFiles: (files: SelectedDocument[]) => void;
  removeSelectedFile: (id: string) => void;
  updateSelectedFile: (id: string, displayName: string, documentType: string) => void;
  clearSelectedFiles: () => void;
  startUpload: (userId: string, onSuccess?: (jobIds: string[], filesInfo: any[]) => void) => Promise<void>;
  cancelUpload: () => void;
  isBottomSheetVisible: boolean;
  setIsBottomSheetVisible: (val: boolean) => void;
  setUploadingDocs: React.Dispatch<React.SetStateAction<UploadingDoc[]>>;
  startBackgroundOcr: (jobIds: string[], filesInfo: any[]) => void;
  cancelAllProcessing: () => Promise<void>;
}

const DocumentUploadContext = createContext<DocumentUploadContextType | undefined>(undefined);

export const useDocumentUpload = () => {
  const context = useContext(DocumentUploadContext);
  if (!context) {
    throw new Error("useDocumentUpload must be used within a DocumentUploadProvider");
  }
  return context;
};

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
  return 10;
};

const getFileNameWithExtension = (displayName: string, originalName: string) => {
  const ext = originalName.split(".").pop();
  if (!ext) return displayName;
  if (displayName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
    return displayName;
  }
  return `${displayName}.${ext}`;
};

export const DocumentUploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDoc[]>([]);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const isPollingRef = useRef(false);

  useEffect(() => {
    return () => {
      isPollingRef.current = false;
    };
  }, []);

  const addSelectedFiles = useCallback((files: SelectedDocument[]) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...files];
      if (combined.length > 5) {
        Toast.show({
          type: "error",
          text1: "Limit Exceeded",
          text2: "You can upload a maximum of 5 files at a time.",
        });
        return prev;
      }
      return combined;
    });
  }, []);

  const removeSelectedFile = useCallback((id: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const updateSelectedFile = useCallback((id: string, displayName: string, documentType: string) => {
    setSelectedFiles((prev) =>
      prev.map((file) =>
        file.id === id ? { ...file, displayName, documentType } : file
      )
    );
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const startPolling = useCallback((initialDocs: UploadingDoc[]) => {
    isPollingRef.current = true;
    const runPoll = async () => {
      if (!isPollingRef.current) return;

      try {
        // Poll each document status using the jobs API in parallel
        const results = await Promise.all(
          initialDocs.map(async (doc) => {
            try {
              const response = await getOcrJob(doc.id);
              const data = response?.data || response;
              return { id: doc.id, success: true, data };
            } catch (err) {
              console.warn(`[Background Polling] Failed to fetch status for ${doc.id}:`, err);
              return { id: doc.id, success: false, error: err };
            }
          })
        );

        let allFinished = true;

        setUploadingDocs((prev) => {
          if (prev.length === 0) {
            isPollingRef.current = false;
            return [];
          }

          const next = prev.map((doc) => {
            const result = results.find((r) => r.id === doc.id);
            if (result && result.success && result.data) {
              const matched = result.data;
              const status = matched.status || doc.status;
              const progress = typeof matched.percentage === "number"
                ? matched.percentage
                : status === "COMPLETED"
                  ? 100
                  : doc.progress;

              const isDone =
                status === "COMPLETED" ||
                status === "FAILED" ||
                status === "CANCELLED";

              if (!isDone) {
                allFinished = false;
              }
              const reason = matched.error || matched.message || null;
              return { ...doc, progress, status, reason };
            }

            const isDone =
              doc.status === "COMPLETED" ||
              doc.status === "FAILED" ||
              doc.status === "CANCELLED" ||
              doc.status === "done" ||
              doc.status === "completed" ||
              doc.status === "success" ||
              doc.progress < 0;

            if (!isDone) {
              allFinished = false;
            }
            return doc;
          });

          if (allFinished) {
            isPollingRef.current = false;
            setIsUploading(false);
            setIsProgressExpanded(false); // collapse animately on finish

            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
            queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });

            const hasFailures = next.some(
              (d) => d.status === "FAILED" || d.status === "failed" || d.progress < 0
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
              // Auto-dismiss list after 2 seconds
              setTimeout(() => {
                setUploadingDocs((current) => {
                  const stillHasFailures = current.some(
                    (d) => d.status === "FAILED" || d.status === "failed" || d.progress < 0
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
  }, []);

  const startUpload = useCallback(async (userId: string, onSuccess?: (jobIds: string[], filesInfo: any[]) => void) => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadingDocs([]);

    try {
      // 1. Upload patient documents
      const filesPayload = selectedFiles.map((file) => {
        const name = getFileNameWithExtension(file.displayName, file.originalName);
        return {
          uri: file.uri,
          name: name,
          type: file.mimeType,
        };
      });

      const response = await uploadPatientDocuments(userId, filesPayload);
      const uploadedList = response?.data || response || [];

      if (!uploadedList || uploadedList.length === 0) {
        throw new Error("No documents returned from server.");
      }

      // 2. Start OCR Jobs
      const jobIds: string[] = [];
      const filesInfo: any[] = [];

      await Promise.all(
        uploadedList.map(async (doc: any) => {
          if (doc.jobId) {
            try {
              await startOcrJob(doc.jobId);
              jobIds.push(doc.jobId);
              filesInfo.push({
                jobId: doc.jobId,
                fileName: doc.fileName || doc.originalFileName || "Document",
                fileKey: doc.fileKey || doc.s3Key || "",
              });
            } catch (jobErr) {
              console.error(`Failed to start job ${doc.jobId}:`, jobErr);
            }
          }
        })
      );

      clearSelectedFiles();
      setIsUploading(false);
      setIsBottomSheetVisible(false);

      if (onSuccess) {
        onSuccess(jobIds, filesInfo);
      }
    } catch (err: any) {
      console.error("[Multiple Upload Error]", err);
      setIsUploading(false);
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: err.message || "Failed to upload documents.",
      });
    }
  }, [selectedFiles, clearSelectedFiles]);

  const cancelUpload = useCallback(() => {
    isPollingRef.current = false;
    setIsUploading(false);
    setUploadingDocs([]);
  }, []);

  const startBackgroundOcr = useCallback((jobIds: string[], filesInfo: any[]) => {
    const docs = jobIds.map((jobId) => {
      const file = filesInfo?.find((f) => f.jobId === jobId);
      return {
        id: jobId,
        name: file?.fileName || `Document ${jobId.slice(0, 8)}`,
        progress: 15,
        status: "QUEUED",
        reason: null,
      };
    });
    setUploadingDocs(docs);
    setIsProgressExpanded(false); // starts collapsed
    startPolling(docs);
  }, [startPolling]);

  const cancelAllProcessing = useCallback(async () => {
    isPollingRef.current = false;
    setIsUploading(false);
    
    const docsToCancel = [...uploadingDocs];
    setUploadingDocs([]); // dismiss overlay immediately

    // Execute cancel API calls in parallel
    await Promise.all(
      docsToCancel.map(async (doc) => {
        try {
          await cancelOcr(doc.id);
        } catch (err) {
          console.warn(`[Cancel OCR Error] Failed for job ${doc.id}:`, err);
        }
      })
    );
  }, [uploadingDocs]);

  return (
    <DocumentUploadContext.Provider
      value={{
        selectedFiles,
        isUploading,
        uploadingDocs,
        isProgressExpanded,
        setIsProgressExpanded,
        addSelectedFiles,
        removeSelectedFile,
        updateSelectedFile,
        clearSelectedFiles,
        startUpload,
        cancelUpload,
        isBottomSheetVisible,
        setIsBottomSheetVisible,
        setUploadingDocs,
        startBackgroundOcr,
        cancelAllProcessing,
      }}
    >
      {children}
    </DocumentUploadContext.Provider>
  );
};
