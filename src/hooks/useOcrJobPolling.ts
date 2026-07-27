import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { getOcrJob, OcrJobStatus } from "../services/documentService";

export interface JobState {
  jobId: string;
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
  const queryResults = useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: ["ocrJobStatus", jobId],
      queryFn: async () => {
        const response = await getOcrJob(jobId);
        return response?.data || response;
      },
      refetchInterval: (query: any) => {
        const data: OcrJobStatus | undefined = query.state.data;
        if (!data) return 2500;
        const status = data.status;
        if (status === "QUEUED" || status === "RUNNING") {
          return 2500;
        }
        return false; // Stop polling on COMPLETED, FAILED, or CANCELLED
      },
      staleTime: 0,
      enabled: Boolean(jobId),
    })),
  });

  const { jobs, jobList, aggregatePercentage, isAllTerminal, completedCount, failedCount, runningCount, queuedCount } =
    useMemo(() => {
      const jobsMap: Record<string, JobState> = {};
      const list: JobState[] = [];

      let totalPctSum = 0;
      let completed = 0;
      let failed = 0;
      let running = 0;
      let queued = 0;

      jobIds.forEach((jobId, index) => {
        const query = queryResults[index];
        const data: OcrJobStatus | undefined = query?.data;
        const status = data?.status || (query?.isLoading ? "QUEUED" : "UNKNOWN");
        const stage = data?.stage || (status === "QUEUED" ? "QUEUED" : status);
        const percentage = typeof data?.percentage === "number" ? data.percentage : status === "COMPLETED" ? 100 : 0;
        const currentStep = data?.currentStep || data?.message || stage;

        const rawSkipped = data?.metadata?.skippedPages || data?.metadata?.skipped_pages || [];
        const skippedPages = Array.isArray(rawSkipped) ? rawSkipped : [];

        const error = data?.error || (query?.isError ? (query.error as Error)?.message || "Failed to fetch status" : null);

        const state: JobState = {
          jobId,
          status,
          stage,
          percentage,
          currentStep,
          skippedPages,
          error,
          rawData: data,
          isLoading: query?.isLoading || false,
          isError: query?.isError || false,
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
    }, [jobIds, queryResults]);

  return {
    jobs,
    jobList,
    aggregatePercentage,
    isAllTerminal,
    completedCount,
    failedCount,
    runningCount,
    queuedCount,
  };
};
