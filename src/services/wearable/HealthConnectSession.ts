// native session lifecycle manager for Health Connect.
import { initialize } from "react-native-health-connect";

class HealthConnectSession {
  private active = false;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes session duration

  /**
   * Opens the native Health Connect session.
   * Idempotent; safe to call multiple times.
   */
  async openSession(): Promise<boolean> {
    try {
      console.log("[HealthConnectSession] Opening session...");
      const initialized = await initialize();
      if (initialized) {
        this.active = true;
        this.resetTimeoutTimer();
        return true;
      }
      return false;
    } catch (e) {
      console.error("[HealthConnectSession] Failed to open native session:", e);
      this.active = false;
      return false;
    }
  }

  /**
   * Closes/disconnects the Health Connect session.
   */
  async closeSession(): Promise<void> {
    console.log("[HealthConnectSession] Closing active session...");
    this.active = false;
    this.clearTimeoutTimer();
  }

  /**
   * Checks if the session is currently open and active.
   */
  isSessionActive(): boolean {
    return this.active;
  }

  /**
   * Refreshes the session timer or reconnects if inactive.
   */
  async refreshSession(): Promise<boolean> {
    if (this.active) {
      this.resetTimeoutTimer();
      return true;
    }
    return await this.openSession();
  }

  /**
   * Resets the timeout timer. Invalidates session on timeout.
   */
  private resetTimeoutTimer(): void {
    this.clearTimeoutTimer();
    this.timeoutTimer = setTimeout(() => {
      console.log("[HealthConnectSession] Session idle timeout reached.");
      this.closeSession();
    }, this.SESSION_TIMEOUT_MS);
  }

  /**
   * Deep links to Health Connect settings in system settings.
   */
  async openHealthConnectSettings(): Promise<void> {
    try {
      const { openHealthConnectSettings } = require("react-native-health-connect");
      await openHealthConnectSettings();
    } catch (e) {
      console.error("[HealthConnectSession] Failed to open settings:", e);
    }
  }

  /**
   * Opens Google Play Store page for Health Connect app (Android <14).
   */
  async openHealthConnectInPlayStore(): Promise<void> {
    try {
      const { Linking } = require("react-native");
      const url = "market://details?id=com.google.android.apps.healthdata";
      const fallbackUrl = "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata";
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch (e) {
      console.error("[HealthConnectSession] Failed to open Play Store:", e);
    }
  }

  private clearTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}

export const healthConnectSession = new HealthConnectSession();
