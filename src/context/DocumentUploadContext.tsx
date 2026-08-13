import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import Toast from "react-native-toast-message";
import { SelectedDocument } from "../types/documentUpload";
import { queryClient } from "../config/queryClient";
import { uploadPatientDocuments, startOcrJob, getOcrJob, cancelOcr, getOcrJobResult } from "../services/documentService";
import { ExtractedMedicine } from "../types/medicationReview";
import { AddOrEditMedication } from "../types";

export interface DuplicateConflict {
  extractedMedicine: ExtractedMedicine;
  existingMedication: AddOrEditMedication;
  resolvedAction?: "keep" | "replace" | "merge" | "remove_new";
}

export interface ChatWizardState {
  step: "idle" | "processing" | "results" | "conflicts" | "summary" | "completed";
  jobIds: string[];
  filesInfo: { jobId: string; fileName: string; fileKey: string }[];
  extractedMedicines: ExtractedMedicine[];
  conflicts: DuplicateConflict[];
  currentConflictIndex: number;
  resolvedMedicines: ExtractedMedicine[];
  replaceList: { existingId: string; extractedMedicine: ExtractedMedicine }[];
  mergeList: { existingId: string; mergedMedication: AddOrEditMedication }[];
  summaries: { docName: string; summary: string }[];
  hasViewedCompletedOcr?: boolean;
}

export interface UploadingDoc {
  id: string;
  name: string;
  progress: number;
  status: string;
  reason?: string | null;
  medicineCount?: number;
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
  startUpload: (userId: string, fromScreen?: string, onSuccess?: (jobIds: string[], filesInfo: any[]) => void) => Promise<void>;
  cancelUpload: () => void;
  isBottomSheetVisible: boolean;
  setIsBottomSheetVisible: (val: boolean) => void;
  setUploadingDocs: React.Dispatch<React.SetStateAction<UploadingDoc[]>>;
  startBackgroundOcr: (jobIds: string[], filesInfo: any[], fromScreen?: string) => void;
  cancelAllProcessing: () => Promise<void>;
  completedBatch: {
    jobIds: string[];
    filesInfo: { jobId: string; fileName: string; fileKey: string }[];
    completedCount: number;
    failedCount: number;
    medicineCount: number;
    fromScreen?: string;
  } | null;
  clearCompletedBatch: () => void;
  isPillHidden: boolean;
  setIsPillHidden: (val: boolean) => void;
  chatWizardState: ChatWizardState;
  setChatWizardState: React.Dispatch<React.SetStateAction<ChatWizardState>>;
  resetChatWizard: () => void;
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
  const [activeUploadFromScreen, setActiveUploadFromScreen] = useState<string>("Home");
  const [completedBatch, setCompletedBatch] = useState<{
    jobIds: string[];
    filesInfo: { jobId: string; fileName: string; fileKey: string }[];
    completedCount: number;
    failedCount: number;
    medicineCount: number;
    fromScreen?: string;
  } | null>(null);
  const [isPillHidden, setIsPillHidden] = useState(false);

  const [chatWizardState, setChatWizardState] = useState<ChatWizardState>({
    step: "idle",
    jobIds: [],
    filesInfo: [],
    extractedMedicines: [],
    conflicts: [],
    currentConflictIndex: 0,
    resolvedMedicines: [],
    replaceList: [],
    mergeList: [],
    summaries: [],
    hasViewedCompletedOcr: false,
  });

  const resetChatWizard = useCallback(() => {
    setChatWizardState({
      step: "idle",
      jobIds: [],
      filesInfo: [],
      extractedMedicines: [],
      conflicts: [],
      currentConflictIndex: 0,
      resolvedMedicines: [],
      replaceList: [],
      mergeList: [],
      summaries: [],
      hasViewedCompletedOcr: false,
    });
    setUploadingDocs([]);
  }, []);

  const clearCompletedBatch = useCallback(() => {
    setCompletedBatch(null);
  }, []);

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
              let medicineCount: number | undefined;
              if (data.status === "COMPLETED") {
                try {
                  const res = await getOcrJobResult(doc.id);
                  const resData = res?.data || res;
                  const meds = resData?.extractedStructuredData?.medications || resData?.extractedStructuredData?.medicines;
                  if (Array.isArray(meds)) {
                    medicineCount = meds.length;
                  }
                } catch (e) {
                  console.log("Failed to fetch medicine count during polling for", doc.id, e);
                }
              }
              return { id: doc.id, success: true, data, medicineCount };
            } catch (err) {
              console.warn(`[Background Polling] Failed to fetch status for ${doc.id}:`, err);
              return { id: doc.id, success: false, error: err };
            }
          })
        );

        let allFinished = true;
        let computedNext: UploadingDoc[] = [];

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
              return {
                ...doc,
                progress,
                status,
                reason,
                medicineCount: result.medicineCount !== undefined ? result.medicineCount : doc.medicineCount
              };
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

          computedNext = next;
          return next;
        });

        if (computedNext.length > 0 && allFinished) {
          isPollingRef.current = false;
          setIsUploading(false);
          setIsProgressExpanded(false); // collapse animately on finish

          queryClient.invalidateQueries({ queryKey: ["documents"] });
          queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
          queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });

          const hasFailures = computedNext.some(
            (d) => d.status === "FAILED" || d.status === "failed" || d.progress < 0
          );
          if (hasFailures) {
            Toast.show({
              type: "error",
              text1: "Processing Finished with Errors",
              text2: "Some documents failed to process.",
            });
            setUploadingDocs([]);
          } else {
            (async () => {
              let medicineCount = 0;
              const completedCount = computedNext.filter(
                (d) => d.status === "COMPLETED" || d.status === "completed" || d.status === "success"
              ).length;
              const failedCount = computedNext.filter(
                (d) => d.status === "FAILED" || d.status === "failed" || d.progress < 0
              ).length;

              await Promise.all(
                computedNext.map(async (doc) => {
                  if (doc.status === "COMPLETED" || doc.status === "completed" || doc.status === "success") {
                    try {
                      const res = await getOcrJobResult(doc.id);
                      const data = res?.data || res;
                      const meds = data?.extractedStructuredData?.medications || data?.extractedStructuredData?.medicines;
                      if (Array.isArray(meds)) {
                        medicineCount += meds.length;
                      }
                    } catch (e) {
                      console.log("Failed to fetch medicine count for job", doc.id, e);
                    }
                  }
                })
              );

              setCompletedBatch({
                jobIds: computedNext.map((d) => d.id),
                filesInfo: computedNext.map((d) => ({ jobId: d.id, fileName: d.name.replace(/%20/g, " "), fileKey: "" })),
                completedCount,
                failedCount,
                medicineCount,
                fromScreen: activeUploadFromScreen,
              });

              setUploadingDocs([]);

              Toast.show({
                type: "success",
                text1: "Analysis Complete!",
                text2: `We found ${medicineCount} medicine${medicineCount === 1 ? "" : "s"} in your documents.`,
                props: {
                  buttonText: "Review Now",
                  onPressButton: () => {
                    const { navigationRef } = require("../navigation/RootNavigator");
                    if (navigationRef.isReady()) {
                      navigationRef.navigate("HOME", {
                        screen: "Home",
                        params: {
                          screen: "ReviewMedicines",
                          params: {
                            jobIds: computedNext.map((d) => d.id),
                            filesInfo: computedNext.map((d) => ({ jobId: d.id, fileName: d.name.replace(/%20/g, " "), fileKey: "" })),
                            fromScreen: activeUploadFromScreen,
                          }
                        }
                      });
                    }
                  },
                },
              });
            })();
          }
        }
      } catch (err) {
        console.warn("[Polling OCR Status Error]", err);
      }

      if (isPollingRef.current) {
        setTimeout(runPoll, 3000);
      }
    };

    setTimeout(runPoll, 3000);
  }, [activeUploadFromScreen]);

  const startUpload = useCallback(async (userId: string, fromScreen?: string, onSuccess?: (jobIds: string[], filesInfo: any[]) => void) => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    
    // Populate uploadingDocs immediately for upload progress tracking
    const initialUploading = selectedFiles.map((file) => ({
      id: file.id,
      name: file.displayName || file.originalName,
      progress: 5,
      status: "UPLOADING" as any,
      reason: null,
    }));
    setUploadingDocs(initialUploading);
    
    setIsPillHidden(false);
    setCompletedBatch(null);
    if (fromScreen) {
      setActiveUploadFromScreen(fromScreen);
    }

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

      // 2. Start OCR Jobs sequentially with a 3-second delay
      const jobIds: string[] = [];
      const filesInfo: any[] = [];

      for (let i = 0; i < uploadedList.length; i++) {
        const doc: any = uploadedList[i];
        if (doc.jobId) {
          try {
            await startOcrJob(doc.jobId);
            jobIds.push(doc.jobId);
            let finalFileName = doc.fileName || doc.originalFileName || "Document";
            try {
              finalFileName = decodeURIComponent(finalFileName).replace(/%20/g, " ");
            } catch (e) {
              finalFileName = finalFileName.replace(/%20/g, " ");
            }
            filesInfo.push({
              jobId: doc.jobId,
              fileName: finalFileName,
              fileKey: doc.fileKey || doc.s3Key || "",
              documentId: doc.id,
              fileUrl: doc.fileUrl || doc.signedUrl || "",
            });
          } catch (jobErr) {
            console.error(`Failed to start job ${doc.jobId}:`, jobErr);
          }

          // Introduce a 3-second delay between jobs to prevent exceeding API rate limits
          if (i < uploadedList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      }

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

  const startBackgroundOcr = useCallback((jobIds: string[], filesInfo: any[], fromScreen?: string) => {
    if (fromScreen) {
      setActiveUploadFromScreen(fromScreen);
    }
    const docs = jobIds.map((jobId) => {
      const file = filesInfo?.find((f) => f.jobId === jobId);
      let finalBackgroundName = file?.fileName || `Document ${jobId.slice(0, 8)}`;
      try {
        finalBackgroundName = decodeURIComponent(finalBackgroundName).replace(/%20/g, " ");
      } catch (e) {
        finalBackgroundName = finalBackgroundName.replace(/%20/g, " ");
      }
      return {
        id: jobId,
        name: finalBackgroundName,
        progress: 15,
        status: "QUEUED",
        reason: null,
      };
    });
    setUploadingDocs(docs);
    setIsPillHidden(false);
    setCompletedBatch(null);

    startPolling(docs);
  }, [startPolling]);

  const cancelAllProcessing = useCallback(async () => {
    const runningJobs = uploadingDocs.filter(
      (d) =>
        d.status !== "COMPLETED" &&
        d.status !== "FAILED" &&
        d.status !== "CANCELLED"
    );

    if (runningJobs.length === 0) {
      cancelUpload();
      return;
    }

    try {
      await Promise.all(
        runningJobs.map(async (job) => {
          try {
            await cancelOcr(job.id);
          } catch (e) {
            console.warn(`Failed to cancel job ${job.id}:`, e);
          }
        })
      );
      Toast.show({
        type: "info",
        text1: "Upload Cancelled",
        text2: "Document processing has been stopped.",
      });
    } catch (err) {
      console.error("[Cancel OCR Error]", err);
    } finally {
      cancelUpload();
    }
  }, [uploadingDocs, cancelUpload]);

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
        completedBatch,
        clearCompletedBatch,
        isPillHidden,
        setIsPillHidden,
        chatWizardState,
        setChatWizardState,
        resetChatWizard,
      }}
    >
      {children}
    </DocumentUploadContext.Provider>
  );
};
