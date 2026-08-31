import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import Toast from "react-native-toast-message";
import { SelectedDocument } from "../types/documentUpload";
import { queryClient } from "../config/queryClient";
import {
  uploadDocumentsBatch,
  retryDocumentProcessing,
  cancelOcr,
  getOcrStatus,
} from "../services/documentService";
import { connectSseStream, SseEventPayload } from "../services/streamService";
import { ExtractedMedicine } from "../types/medicationReview";
import { AddOrEditMedication } from "../types";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";

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
  fileKey?: string;
  jobId?: string;
  name: string;
  progress: number;
  percentage?: number;
  status: string;
  stage?: string;
  stageStatus?: string;
  currentStep?: string;
  reason?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
  medicineCount?: number;
  batchId?: string;
  skippedPages?: (number | { pageNumber: number; reason?: string })[];
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
  retryDocument: (fileKey: string, batchId?: string) => Promise<void>;
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
    documents?: { id: string; name: string; status: string; reason: string | null; fileKey?: string; medicineCount?: number; retryable?: boolean }[];
  } | null;
  clearCompletedBatch: () => void;
  isPillHidden: boolean;
  setIsPillHidden: (val: boolean) => void;
  chatWizardState: ChatWizardState;
  setChatWizardState: React.Dispatch<React.SetStateAction<ChatWizardState>>;
  resetChatWizard: () => void;
  processingError: { type: "failed" | "cancelled" | "interrupted"; message: string } | null;
  clearProcessingError: () => void;
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

const normalizeStatus = (event: any) => {
  const stage = String(event?.stage || event?.stageStatus || event?.status || event?.type || "").toUpperCase();

  if (
    stage.includes("FAILED") ||
    stage.includes("ERROR") ||
    stage.includes("REJECTED") ||
    stage.includes("CANCELLED")
  ) {
    return "FAILED";
  }

  if (
    stage.includes("COMPLETED") ||
    stage.includes("DONE") ||
    stage === "SUCCESS"
  ) {
    return "COMPLETED";
  }

  if (stage.includes("UPLOAD")) {
    return "UPLOADING";
  }

  if (stage.includes("QUEUE") || stage.includes("PENDING")) {
    return "QUEUED";
  }

  return "RUNNING";
};

const extractEventProgress = (event: any) => {
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
  return undefined;
};

const extractBatchDocumentEvents = (event: any): any[] => {
  const candidates = [
    event?.documents,
    event?.data?.documents,
    event?.files,
    event?.data?.files,
    event?.items,
    event?.data?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const getBatchCounts = (event: any, docs: UploadingDoc[]) => {
  const completed =
    typeof event?.completed === "number"
      ? event.completed
      : docs.filter((d) => d.status === "COMPLETED").length;
  const failed =
    typeof event?.failed === "number"
      ? event.failed
      : docs.filter((d) => d.status === "FAILED").length;

  return { completed, failed };
};

export const DocumentUploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDoc[]>([]);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const activeUploadFromScreenRef = useRef<string>("Home");
  const [completedBatch, setCompletedBatch] = useState<{
    jobIds: string[];
    filesInfo: { jobId: string; fileName: string; fileKey: string }[];
    completedCount: number;
    failedCount: number;
    medicineCount: number;
    fromScreen?: string;
    documents?: { id: string; name: string; status: string; reason: string | null; fileKey?: string; medicineCount?: number; retryable?: boolean }[];
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

  const [processingError, setProcessingError] = useState<{
    type: "failed" | "cancelled" | "interrupted";
    message: string;
  } | null>(null);

  const clearProcessingError = useCallback(() => {
    setProcessingError(null);
  }, []);

  const isPollingRef = useRef(false);
  const activeSseUnsubRef = useRef<(() => void) | null>(null);
  const hasHandledBatchFinishedRef = useRef(false);
  const activeBatchIdRef = useRef<string | null>(null);
  const lastBatchEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isPollingRef.current = false;
      if (activeSseUnsubRef.current) {
        activeSseUnsubRef.current();
        activeSseUnsubRef.current = null;
      }
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

  const retryDocument = useCallback(
    async (fileKey: string, batchId?: string) => {
      if (!fileKey) return;

      try {
        setUploadingDocs((prev) =>
          prev.map((d) =>
            d.fileKey === fileKey || d.id === fileKey
              ? {
                ...d,
                status: "QUEUED",
                stage: "QUEUED",
                currentStep: "Retrying document extraction...",
                progress: 10,
                percentage: 10,
                reason: null,
              }
              : d,
          ),
        );

        const response = await retryDocumentProcessing({ fileKey, batchId });
        const data = (response as any)?.data || response;
        const streamEndpoint = (data as any)?.streamUrl || `/sse/files/${fileKey}/stream`;

        connectSseStream({
          endpoint: streamEndpoint,
          onEvent: (event: SseEventPayload) => {
            setUploadingDocs((prev) =>
              prev.map((doc) => {
                if (doc.fileKey === fileKey || doc.id === fileKey) {
                  const isCompleted =
                    event.type === "document.completed" ||
                    event.stage === "COMPLETED" ||
                    event.stageStatus === "COMPLETED" ||
                    (event.status === "SUCCESS" && (event.percentage === 100 || event.progress === 100));

                  const isFailed =
                    event.type === "document.failed" ||
                    event.stage === "FAILED" ||
                    event.stageStatus === "FAILED" ||
                    event.status === "FAILED";

                  const status = isCompleted ? "COMPLETED" : isFailed ? "FAILED" : "RUNNING";
                  const pct = isCompleted
                    ? 100
                    : typeof event.percentage === "number"
                      ? event.percentage
                      : typeof event.progress === "number"
                        ? event.progress
                        : mapStatusToProgress(event);

                  const stage = event.stage || doc.stage;
                  const currentStep = event.message || stage || doc.currentStep;
                  const reason = isFailed ? (event.message || event.error || "Processing failed") : null;
                  const errorCode = event.errorCode || doc.errorCode;
                  const retryable = isFailed && errorCode !== "NON_MEDICAL_DOCUMENT";
                  const skippedPages = event.extra?.skippedPages || doc.skippedPages;

                  return {
                    ...doc,
                    progress: pct,
                    percentage: pct,
                    status,
                    stage,
                    currentStep,
                    reason,
                    errorCode,
                    retryable,
                    skippedPages,
                  };
                }
                return doc;
              }),
            );
          },
          onTerminal: (event: SseEventPayload) => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
            queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });

            if (event.stage === "COMPLETED" || event.stageStatus === "COMPLETED" || event.type === "document.completed" || event.status === "SUCCESS") {
              Toast.show({
                type: "success",
                text1: "Document Processed",
                text2: "Extraction completed successfully on retry.",
              });
            } else {
              Toast.show({
                type: "error",
                text1: "Retry Failed",
                text2: event.message || "Document processing failed.",
              });
            }
          },
        });
      } catch (err: any) {
        console.error("[retryDocument Error]", err);
        Toast.show({
          type: "error",
          text1: "Retry Failed",
          text2: err.message || "Failed to retry document processing.",
        });
      }
    },
    [],
  );

  const startUpload = useCallback(
    async (userId: string, fromScreen?: string, onSuccess?: (jobIds: string[], filesInfo: any[]) => void) => {
      if (selectedFiles.length === 0) return;
      setIsUploading(true);
      setProcessingError(null);

      const initialUploading: UploadingDoc[] = selectedFiles.map((file) => ({
        id: file.id,
        name: file.displayName || file.originalName,
        progress: 5,
        percentage: 5,
        status: "UPLOADING",
        stage: "UPLOADING",
        currentStep: "Uploading files...",
        reason: null,
      }));
      setUploadingDocs(initialUploading);

      setIsPillHidden(false);
      setCompletedBatch(null);
      if (fromScreen) {
        activeUploadFromScreenRef.current = fromScreen;
      }
      hasHandledBatchFinishedRef.current = false;
      activeBatchIdRef.current = null;
      lastBatchEventIdRef.current = null;

      try {
        const filesPayload = selectedFiles.map((file) => {
          const name = getFileNameWithExtension(file.displayName, file.originalName);
          return {
            uri: file.uri,
            name: name,
            type: file.mimeType,
          };
        });

        const response = await uploadDocumentsBatch(filesPayload);
        const batchData = (response as any)?.data || response;

        if (!batchData || !batchData.documents || batchData.documents.length === 0) {
          throw new Error("No documents returned from upload API.");
        }

        const batchId = batchData.batchId;
        const batchUrl = DOCUMENT_ENDPOINTS.SSE_BATCH_STREAM(batchId);
        activeBatchIdRef.current = batchId;
        lastBatchEventIdRef.current = null;

        const mappedDocs: UploadingDoc[] = batchData.documents.map((doc: any) => ({
          id: doc.jobId || doc.fileKey,
          fileKey: doc.fileKey,
          jobId: doc.jobId || doc.fileKey,
          name: doc.fileName || "Document",
          progress: 15,
          percentage: 15,
          status: doc.status || "QUEUED",
          stage: doc.status || "QUEUED",
          currentStep: "Queued for processing",
          reason: null,
          batchId,
        }));

        setUploadingDocs(mappedDocs);
        clearSelectedFiles();
        setIsUploading(false);
        setIsBottomSheetVisible(false);

        const jobIds = mappedDocs.map((d) => d.jobId || d.id);
        const filesInfo = mappedDocs.map((d) => ({
          jobId: d.jobId || d.id,
          fileName: d.name,
          fileKey: d.fileKey || d.id,
        }));

        if (onSuccess) {
          onSuccess(jobIds, filesInfo);
        }

        if (activeSseUnsubRef.current) {
          activeSseUnsubRef.current();
        }

        const handleBatchFinished = async (currentDocs: UploadingDoc[], event?: SseEventPayload) => {
          if (hasHandledBatchFinishedRef.current) {
            return;
          }
          hasHandledBatchFinishedRef.current = true;

          queryClient.invalidateQueries({ queryKey: ["documents"] });
          queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
          queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });
          queryClient.invalidateQueries({ queryKey: ["documentsSummary"] });

          const completedDocs = currentDocs.filter(
            (d) => d.status === "COMPLETED" || d.progress === 100 || d.percentage === 100
          );
          const failedDocs = currentDocs.filter(
            (d) => d.status === "FAILED"
          );

          const completedCount = event?.completed ?? completedDocs.length;
          const failedCount = event?.failed ?? failedDocs.length;

          if (completedCount === 0 && failedCount > 0) {
            setProcessingError({
              type: "failed",
              message: "Document processing failed. Please check the document format.",
            });
          }

          let medicineCount = 0;
          await Promise.all(
            currentDocs.map(async (doc) => {
              if (doc.status === "COMPLETED" || doc.progress === 100 || doc.percentage === 100) {
                try {
                  const res = await getOcrStatus(doc.fileKey || doc.jobId || doc.id);
                  const data = res?.data || res;
                  const meds = data?.extractedStructuredData?.medications || data?.extractedStructuredData?.medicines;
                  if (Array.isArray(meds)) {
                    medicineCount += meds.length;
                    doc.medicineCount = meds.length;
                  }
                } catch (e) {
                  console.log("Failed to fetch medicine count for job", doc.jobId || doc.id, e);
                }
              }
            })
          );

          setCompletedBatch({
            jobIds: currentDocs.map((d) => d.jobId || d.id),
            filesInfo: currentDocs.map((d) => ({
              jobId: d.jobId || d.id,
              fileName: d.name.replace(/%20/g, " "),
              fileKey: d.fileKey || d.id,
            })),
            completedCount,
            failedCount,
            medicineCount,
            fromScreen: activeUploadFromScreenRef.current,
            documents: currentDocs.map((d) => ({
              id: d.jobId || d.id,
              name: d.name,
              status: d.status,
              reason: d.reason || null,
              fileKey: d.fileKey || d.id,
              medicineCount: d.medicineCount || 0,
              retryable: d.retryable ?? true,
            })),
          });

          if (activeUploadFromScreenRef.current !== "AIChat") {
            if (failedCount > 0 && completedCount === 0) {
              Toast.show({
                type: "error",
                text1: "Processing Failed",
                text2: "Documents failed to process.",
              });
            } else {
              Toast.show({
                type: "success",
                text1: "Analysis Complete!",
                text2: failedCount > 0
                  ? `Processed with some errors. Found ${medicineCount} medicine(s).`
                  : `We found ${medicineCount} medicine${medicineCount === 1 ? "" : "s"} in your documents.`,
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
                            jobIds: currentDocs.map((d) => d.jobId || d.id),
                            filesInfo: currentDocs.map((d) => ({
                              jobId: d.jobId || d.id,
                              fileName: d.name.replace(/%20/g, " "),
                              fileKey: d.fileKey || d.id,
                            })),
                            fromScreen: activeUploadFromScreenRef.current,
                          },
                        },
                      });
                    }
                  },
                },
              });
            }
          }
        };

        activeSseUnsubRef.current = connectSseStream({
          endpoint: batchUrl,
          method: "POST",
          body: {
            batchId,
            "Last-Event-ID": lastBatchEventIdRef.current,
            lastEventId: lastBatchEventIdRef.current,
          },
          onEvent: (event: SseEventPayload) => {
            if (event.id) {
              lastBatchEventIdRef.current = event.id;
            }

            setUploadingDocs((prev) => {
              let nextDocs = [...prev];
              const docEvents = extractBatchDocumentEvents(event);

              if (docEvents.length > 0) {
                nextDocs = nextDocs.map((doc) => {
                  const matchedEvent = docEvents.find((item) => {
                    const candidateIds = [
                      item?.fileKey,
                      item?.jobId,
                      item?.id,
                      item?.documentId,
                      item?.data?.fileKey,
                      item?.data?.jobId,
                      item?.data?.id,
                    ].filter(Boolean);

                    return candidateIds.some(
                      (candidate) =>
                        candidate === doc.fileKey ||
                        candidate === doc.jobId ||
                        candidate === doc.id,
                    );
                  });

                  if (!matchedEvent) {
                    return doc;
                  }

                  const status = normalizeStatus(matchedEvent);
                  const pct =
                    status === "COMPLETED"
                      ? 100
                      : extractEventProgress(matchedEvent) ?? mapStatusToProgress(matchedEvent);
                  const stage = matchedEvent.stage || matchedEvent.stageStatus || matchedEvent.status || doc.stage;
                  const currentStep = matchedEvent.message || matchedEvent.data?.message || stage || doc.currentStep;
                  const errorCode = matchedEvent.errorCode || matchedEvent.data?.errorCode || doc.errorCode;
                  const reason =
                    status === "FAILED"
                      ? matchedEvent.message ||
                        matchedEvent.error ||
                        matchedEvent.data?.message ||
                        (errorCode === "NON_MEDICAL_DOCUMENT"
                          ? "Non-medical document rejected"
                          : "Processing failed")
                      : null;

                  return {
                    ...doc,
                    progress: pct,
                    percentage: pct,
                    status,
                    stage,
                    currentStep,
                    reason,
                    errorCode,
                    retryable: status === "FAILED" && errorCode !== "NON_MEDICAL_DOCUMENT",
                    skippedPages: matchedEvent.extra?.skippedPages || matchedEvent.data?.extra?.skippedPages || doc.skippedPages,
                  };
                });
              } else if (event.fileKey || event.jobId || event.documentId) {
                const eventKey = event.fileKey || event.jobId || event.documentId;
                nextDocs = nextDocs.map((doc) => {
                  if (doc.fileKey !== eventKey && doc.jobId !== eventKey && doc.id !== eventKey) {
                    return doc;
                  }

                  const status = normalizeStatus(event);
                  const pct =
                    status === "COMPLETED"
                      ? 100
                      : extractEventProgress(event) ?? mapStatusToProgress(event);
                  const stage = event.stage || event.stageStatus || event.status || doc.stage;
                  const currentStep = event.message || stage || doc.currentStep;
                  const errorCode = event.errorCode || doc.errorCode;
                  const reason =
                    status === "FAILED"
                      ? event.message ||
                        event.error ||
                        (errorCode === "NON_MEDICAL_DOCUMENT"
                          ? "Non-medical document rejected"
                          : "Processing failed")
                      : null;

                  return {
                    ...doc,
                    progress: pct,
                    percentage: pct,
                    status,
                    stage,
                    currentStep,
                    reason,
                    errorCode,
                    retryable: status === "FAILED" && errorCode !== "NON_MEDICAL_DOCUMENT",
                    skippedPages: event.extra?.skippedPages || doc.skippedPages,
                  };
                });
              }

              const batchProgress = extractEventProgress(event);
              if (typeof batchProgress === "number" && nextDocs.length > 0) {
                const unfinishedDocs = nextDocs.filter(
                  (doc) => doc.status !== "COMPLETED" && doc.status !== "FAILED" && doc.status !== "CANCELLED",
                );

                if (unfinishedDocs.length > 0) {
                  const currentAverage = Math.round(
                    nextDocs.reduce((acc, doc) => acc + Math.max(0, doc.progress || 0), 0) / nextDocs.length,
                  );

                  if (batchProgress > currentAverage) {
                    const delta = batchProgress - currentAverage;
                    nextDocs = nextDocs.map((doc) => {
                      if (doc.status === "COMPLETED" || doc.status === "FAILED" || doc.status === "CANCELLED") {
                        return doc;
                      }

                      const nextProgress = Math.min(99, Math.max(doc.progress || 0, (doc.progress || 0) + delta));
                      return {
                        ...doc,
                        progress: nextProgress,
                        percentage: nextProgress,
                      };
                    });
                  }
                }
              }

              if (event.type === "batch.completed" || event.stage === "BATCH_COMPLETED") {
                handleBatchFinished(nextDocs, {
                  ...event,
                  ...getBatchCounts(event, nextDocs),
                });
              }

              return nextDocs;
            });
          },
          onTerminal: (event: SseEventPayload) => {
            if (event.id) {
              lastBatchEventIdRef.current = event.id;
            }

            setUploadingDocs((currentDocs) => {
              const finalizedDocs = currentDocs.map((doc) => {
                if (doc.status === "COMPLETED" || doc.status === "FAILED" || doc.status === "CANCELLED") {
                  return doc;
                }
                return {
                  ...doc,
                  progress: doc.progress >= 100 ? 100 : doc.progress,
                  percentage:
                    typeof doc.percentage === "number"
                      ? doc.percentage >= 100
                        ? 100
                        : doc.percentage
                      : doc.progress >= 100
                        ? 100
                        : doc.progress,
                };
              });

              handleBatchFinished(finalizedDocs, {
                ...event,
                ...getBatchCounts(event, finalizedDocs),
              });
              return finalizedDocs;
            });
          },
          onError: (err) => {
            console.warn("[CONTEXT:SSE_ERROR] Batch SSE error:", err.message);
          },
        });
      } catch (err: any) {
        console.error("[Multiple Upload Error]", err);
        setIsUploading(false);
        Toast.show({
          type: "error",
          text1: "Upload Failed",
          text2: err.message || "Failed to upload documents.",
        });
      }
    },
    [selectedFiles, clearSelectedFiles],
  );

  const cancelUpload = useCallback(() => {
    if (uploadingDocs.length > 0) {
      setProcessingError({
        type: "cancelled",
        message: "Document processing was cancelled or interrupted.",
      });
    }
    isPollingRef.current = false;
    if (activeSseUnsubRef.current) {
      activeSseUnsubRef.current();
      activeSseUnsubRef.current = null;
    }
    setIsUploading(false);
    activeBatchIdRef.current = null;
    lastBatchEventIdRef.current = null;
    setUploadingDocs([]);
  }, [uploadingDocs]);

  const startBackgroundOcr = useCallback((jobIds: string[], filesInfo: any[], fromScreen?: string) => {
    setProcessingError(null);
    if (fromScreen) {
      activeUploadFromScreenRef.current = fromScreen;
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
        fileKey: file?.fileKey || jobId,
        jobId,
        name: finalBackgroundName,
        progress: 15,
        status: "QUEUED",
        reason: null,
      };
    });
    setUploadingDocs(docs);
    setIsPillHidden(false);
    setCompletedBatch(null);
    activeBatchIdRef.current = null;
    lastBatchEventIdRef.current = null;
  }, []);

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
            await cancelOcr(job.jobId || job.id);
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
        retryDocument,
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
        processingError,
        clearProcessingError,
      }}
    >
      {children}
    </DocumentUploadContext.Provider>
  );
};

