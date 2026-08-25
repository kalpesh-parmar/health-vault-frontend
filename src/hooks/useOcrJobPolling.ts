import { useMemo } from "react";
import { useDocumentUpload, UploadingDoc } from "../context/DocumentUploadContext";
import { OcrJobStatus } from "../services/documentService";

export interface JobState {
  jobId: string;
  fileKey?: string;
  fileName?: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "UNKNOWN";
  stage: string;
  percentage: number;
  currentStep: string;
  skippedPages: (number | { pageNumber: number; reason?: string })[];
  error: string | null;
  rawData?: OcrJobStatus;
  isLoading: boolean;
  isError: boolean;
}

export interface UseOcrJobPollingResult {
  jobs: Record<string, JobState>;
  jobList: JobState[];
  aggregatePercentage: number;
  isAllTerminal: boolean;
  completedCount: number;
  failedCount: number;
  runningCount: number;
  queuedCount: number;
}

export const useOcrJobPolling = (jobIds: string[]): UseOcrJobPollingResult => {
  const { uploadingDocs } = useDocumentUpload();

  return useMemo(() => {
    const jobsMap: Record<string, JobState> = {};
    const list: JobState[] = [];

    let totalPctSum = 0;
    let completed = 0;
    let failed = 0;
    let running = 0;
    let queued = 0;

    jobIds.forEach((jobId) => {
      const doc = uploadingDocs.find(
        (d: UploadingDoc) => d.jobId === jobId || d.id === jobId || d.fileKey === jobId
      );

      const rawStatus = (doc?.status || "QUEUED").toUpperCase();
      let status: JobState["status"] = "UNKNOWN";

      if (rawStatus === "COMPLETED" || rawStatus === "DONE" || rawStatus === "SUCCESS") {
        status = "COMPLETED";
      } else if (rawStatus === "FAILED" || rawStatus === "ERROR") {
        status = "FAILED";
      } else if (rawStatus === "CANCELLED") {
        status = "CANCELLED";
      } else if (
        rawStatus === "RUNNING" ||
        rawStatus === "OCR_RUNNING" ||
        rawStatus === "PROCESSING" ||
        rawStatus === "PARSING" ||
        rawStatus === "FIELD_EXTRACTION" ||
        rawStatus === "ANALYZING" ||
        rawStatus === "SUMMARIZING" ||
        rawStatus === "VALIDATING" ||
        rawStatus === "UPLOADING"
      ) {
        status = "RUNNING";
      } else if (rawStatus === "QUEUED" || rawStatus === "OCR_QUEUED" || rawStatus === "PENDING") {
        status = "QUEUED";
      } else {
        status = doc ? "RUNNING" : "UNKNOWN";
      }

      const stage = doc?.stage || (status === "QUEUED" ? "QUEUED" : status);
      const percentage =
        typeof doc?.percentage === "number"
          ? doc.percentage
          : typeof doc?.progress === "number"
            ? doc.progress
            : status === "COMPLETED"
              ? 100
              : 0;

      const currentStep = doc?.currentStep || doc?.reason || stage || "Processing...";
      const skippedPages = doc?.skippedPages || [];
      const error = doc?.reason || (status === "FAILED" ? "Document extraction failed" : null);

      const state: JobState = {
        jobId,
        fileKey: doc?.fileKey,
        fileName: doc?.name,
        status,
        stage,
        percentage,
        currentStep,
        skippedPages,
        error,
        isLoading: status === "QUEUED" || !doc,
        isError: status === "FAILED",
      };

      jobsMap[jobId] = state;
      list.push(state);

      totalPctSum += percentage;

      if (status === "COMPLETED") completed++;
      else if (status === "FAILED" || status === "CANCELLED") failed++;
      else if (status === "RUNNING") running++;
      else queued++;
    });

    const totalCount = jobIds.length;
    const aggPct = totalCount > 0 ? Math.round(totalPctSum / totalCount) : 0;
    const allTerminal = totalCount > 0 && completed + failed === totalCount;

    return {
      jobs: jobsMap,
      jobList: list,
      aggregatePercentage: aggPct,
      isAllTerminal: allTerminal,
      completedCount: completed,
      failedCount: failed,
      runningCount: running,
      queuedCount: queued,
    };
  }, [jobIds, uploadingDocs]);
};
