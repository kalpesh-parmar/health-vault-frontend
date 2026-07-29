// Diagnostics and sync telemetry logging manager.
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DiagnosticsEntry {
  timestamp: string;
  source: string;
  durationMs: number;
  samplesReceived: number;
  samplesWritten: number;
  duplicatesIgnored: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  errorCode?: string;
  httpStatus?: number;
  errorStack?: string;
  recordTypesRequested?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  perRecordCounts?: Record<string, number>;
}

class SyncDiagnosticsManager {
  private readonly DIAGNOSTICS_KEY = "wearable_sync_diagnostics_logs";
  private readonly MAX_LOG_COUNT = 50;

  /**
   * Log a diagnostic sync transaction.
   */
  async logDiagnostics(entry: Omit<DiagnosticsEntry, "timestamp">): Promise<void> {
    try {
      const fullEntry: DiagnosticsEntry = {
        timestamp: new Date().toISOString(),
        ...entry,
      };

      const existingLogs = await this.getDiagnosticsHistory();
      existingLogs.unshift(fullEntry); // Add newest first

      // Cap at MAX_LOG_COUNT
      const trimmedLogs = existingLogs.slice(0, this.MAX_LOG_COUNT);
      await AsyncStorage.setItem(this.DIAGNOSTICS_KEY, JSON.stringify(trimmedLogs));
      console.log(`[SyncDiagnosticsManager] Saved sync log. Status: ${entry.status}`);
    } catch (e) {
      console.warn("[SyncDiagnosticsManager] Failed to save diagnostics log:", e);
    }
  }

  /**
   * Fetch saved sync diagnostic histories.
   */
  async getDiagnosticsHistory(): Promise<DiagnosticsEntry[]> {
    try {
      const logsStr = await AsyncStorage.getItem(this.DIAGNOSTICS_KEY);
      if (logsStr) {
        const parsed = JSON.parse(logsStr);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Export the diagnostic logs as a formatted JSON string for customer support.
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getDiagnosticsHistory();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        systemInfo: {
          platform: "android",
        },
        logs,
      },
      null,
      2
    );
  }

  /**
   * Clear all diagnostics history logs.
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.DIAGNOSTICS_KEY);
    } catch {
      // ignore
    }
  }
}

export const syncDiagnosticsManager = new SyncDiagnosticsManager();
