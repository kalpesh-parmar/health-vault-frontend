// Sync concurrency, priority queuing, and deduplication manager.
import type { SyncResult, WearableMetricType } from "./types";

export type SyncTriggerSource =
  | "ONBOARDING_SYNC"
  | "MANUAL_SYNC"
  | "DASHBOARD_REFRESH"
  | "BACKGROUND_SYNC"
  | "RETRY_SYNC";

export interface SyncTask {
  id: string;
  source: SyncTriggerSource;
  run: () => Promise<SyncResult>;
  resolve: (res: SyncResult) => void;
  reject: (err: any) => void;
}

const PRIORITY_MAP: Record<SyncTriggerSource, number> = {
  ONBOARDING_SYNC: 4,     // Highest - blocks UI
  MANUAL_SYNC: 3,         // User-initiated - blocks dashboard UI
  DASHBOARD_REFRESH: 2,   // Screen focus refresh
  BACKGROUND_SYNC: 1,     // Periodic worker
  RETRY_SYNC: 0,          // Retry queue
};

class SyncQueueManager {
  private queue: SyncTask[] = [];
  private isProcessing = false;

  /**
   * Enqueues a synchronization task.
   * Dedupes tasks if a similar priority task is already queued.
   */
  enqueue(source: SyncTriggerSource, runFn: () => Promise<SyncResult>): Promise<SyncResult> {
    return new Promise<SyncResult>((resolve, reject) => {
      const task: SyncTask = {
        id: `${source}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        source,
        run: runFn,
        resolve,
        reject,
      };

      // Deduplication: Avoid queuing duplicate background requests if one is active or pending
      const hasDuplicate = this.queue.some(
        (t) => t.source === source && PRIORITY_MAP[source] <= PRIORITY_MAP.BACKGROUND_SYNC
      );

      if (hasDuplicate && source === "BACKGROUND_SYNC") {
        console.log(`[SyncQueueManager] Duplicate background task ignored.`);
        resolve({
          ok: false,
          reason: "duplicate_sync_suppressed",
          metrics: [],
          samplesReceived: 0,
          samplesWritten: 0,
        });
        return;
      }

      this.queue.push(task);
      // Sort the queue based on priority (highest first)
      this.queue.sort((a, b) => PRIORITY_MAP[b.source] - PRIORITY_MAP[a.source]);

      console.log(
        `[SyncQueueManager] Task enqueued: ${task.id} (Source: ${source}). Queue Size: ${this.queue.length}`
      );

      this.processNext();
    });
  }

  /**
   * Clears all pending tasks in the queue.
   */
  clearQueue(): void {
    console.log("[SyncQueueManager] Clearing synchronization queue.");
    this.queue.forEach((t) =>
      t.resolve({
        ok: false,
        reason: "sync_cancelled_by_queue_clear",
        metrics: [],
        samplesReceived: 0,
        samplesWritten: 0,
      })
    );
    this.queue = [];
  }

  /**
   * Cancels a specific task by ID.
   */
  async cancelTask(taskId: string): Promise<void> {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      console.log(`[SyncQueueManager] Cancelling task: ${taskId}`);
      const [task] = this.queue.splice(idx, 1);
      task.resolve({
        ok: false,
        reason: "task_cancelled",
        metrics: [],
        samplesReceived: 0,
        samplesWritten: 0,
      });
    }
  }

  /**
   * Processes the next task in the sorted queue.
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift()!;
    console.log(`[SyncQueueManager] Processing task: ${task.id}`);

    try {
      const result = await task.run();
      task.resolve(result);
    } catch (err) {
      console.error(`[SyncQueueManager] Task failed: ${task.id}`, err);
      task.reject(err);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
}

export const syncQueueManager = new SyncQueueManager();
