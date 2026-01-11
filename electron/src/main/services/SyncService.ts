import axios, { AxiosInstance } from "axios";
import { formatISO, subDays } from "date-fns";
import { app } from "electron";
import fs from "fs";
import { AppConfig } from "../config";
import { DatabaseService, Screenshot, TimeLog } from "./DatabaseService";

interface SyncResult {
  success: boolean;
  message: string;
  timeLogsSynced: number;
  screenshotsSynced: number;
  errors: string[];
}

export class SyncService {
  private dbService: DatabaseService;
  private apiClient: AxiosInstance;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;

    this.apiClient = axios.create({
      baseURL: AppConfig.apiUrl,
      timeout: 30000,
    });

    // Add request interceptor for auth token
    this.apiClient.interceptors.request.use((config) => {
      const credentials = AppConfig.getCredentials();
      if (credentials?.accessToken) {
        config.headers.Authorization = `Bearer ${credentials.accessToken}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const credentials = AppConfig.getCredentials();
            if (!credentials?.refreshToken) {
              throw new Error("No refresh token available");
            }

            const response = await axios.post(
              `${AppConfig.apiUrl}/auth/refresh`,
              {
                refresh_token: credentials.refreshToken,
              }
            );

            const { access_token, refresh_token } = response.data.data;

            AppConfig.setCredentials({
              ...credentials,
              accessToken: access_token,
              refreshToken: refresh_token,
            });

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.apiClient(originalRequest);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            AppConfig.clearCredentials();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  startAutoSync(): void {
    if (this.syncTimer) {
      console.log("Auto-sync already running");
      return;
    }

    const interval = AppConfig.syncInterval;
    console.log(`🔄 Starting auto-sync (interval: ${interval / 1000}s)`);

    // Sync immediately
    this.syncNow();

    // Setup interval
    this.syncTimer = setInterval(async () => {
      await this.syncNow();
    }, interval);
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log("🔄 Auto-sync stopped");
    }
  }

  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log("Sync already in progress");
      return {
        success: false,
        message: "Sync already in progress",
        timeLogsSynced: 0,
        screenshotsSynced: 0,
        errors: [],
      };
    }

    const credentials = AppConfig.getCredentials();
    if (!credentials?.accessToken) {
      console.log("No credentials available, skipping sync");
      return {
        success: false,
        message: "Not authenticated",
        timeLogsSynced: 0,
        screenshotsSynced: 0,
        errors: ["Not authenticated"],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let timeLogsSynced = 0;
    let screenshotsSynced = 0;

    try {
      console.log("🔄 Starting sync...");

      // Get unsynced data
      const unsyncedTimeLogs = await this.dbService.getUnsyncedTimeLogs();
      const unsyncedScreenshots = await this.dbService.getUnsyncedScreenshots();

      console.log(
        `Found ${unsyncedTimeLogs.length} time logs and ${unsyncedScreenshots.length} screenshots to sync`
      );

      if (unsyncedTimeLogs.length === 0 && unsyncedScreenshots.length === 0) {
        this.lastSyncTime = new Date(Date.now());
        return {
          success: true,
          message: "Nothing to sync",
          timeLogsSynced: 0,
          screenshotsSynced: 0,
          errors: [],
        };
      }

      // Prepare batch sync payload
      const batchPayload = {
        device_uuid: this.getDeviceUUID(),
        device_info: this.getDeviceInfo(),
        time_logs: unsyncedTimeLogs.map(this.timeLogToDTO),
        screenshots: await Promise.all(
          unsyncedScreenshots.map(async (screenshot) => {
            try {
              const base64Data = fs
                .readFileSync(screenshot.filePath)
                .toString("base64");
              return await this.screenshotToDTO(screenshot, base64Data);
            } catch (error) {
              console.error(
                `Error reading screenshot ${screenshot.fileName}:`,
                error
              );
              errors.push(`Failed to read ${screenshot.fileName}`);
              return null;
            }
          })
        ).then((results) => results.filter((r) => r !== null)),
      };

      // Send batch sync request
      const response = await this.apiClient.post("/sync/batch", batchPayload);

      if (response.data.success) {
        const syncData = response.data.data;

        // Mark time logs as synced
        for (const timeLog of unsyncedTimeLogs) {
          await this.dbService.markTimeLogAsSynced(timeLog.localId);
          timeLogsSynced++;
        }

        // Delete screenshots immediately after successful sync
        // This prevents duplicate entries and frees disk space
        for (const screenshot of unsyncedScreenshots) {
          try {
            // Delete file from filesystem
            if (fs.existsSync(screenshot.filePath)) {
              fs.unlinkSync(screenshot.filePath);
            }
            // Delete from database
            await this.dbService.deleteScreenshotByFilePath(
              screenshot.filePath
            );
            screenshotsSynced++;
          } catch (error) {
            console.error(
              `Failed to delete screenshot ${screenshot.fileName}:`,
              error
            );
            // Mark as synced even if deletion fails to avoid re-uploading
            await this.dbService.markScreenshotAsSynced(screenshot.localId);
            screenshotsSynced++;
          }
        }

        this.lastSyncTime = new Date(Date.now());
        console.log(
          `✅ Sync completed: ${timeLogsSynced} time logs, ${screenshotsSynced} screenshots synced and deleted`
        );
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      errors.push(error.message || "Unknown sync error");
    } finally {
      this.isSyncing = false;
    }

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? "Sync completed successfully"
          : "Sync completed with errors",
      timeLogsSynced,
      screenshotsSynced,
      errors,
    };
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      autoSyncEnabled: this.syncTimer !== null,
    };
  }

  private timeLogToDTO(timeLog: TimeLog) {
    // Convert milliseconds to seconds for backend
    // Electron stores duration in milliseconds, but backend expects seconds
    const durationSeconds = Math.floor(timeLog.duration / 1000);
    const pausedTotalSeconds = Math.floor(timeLog.pausedTotal / 1000);

    // Debug logging
    console.log(`🔄 Converting TimeLog to DTO:`);
    console.log(`   Local duration: ${timeLog.duration} ms`);
    console.log(`   Converted duration: ${durationSeconds} seconds`);
    console.log(`   Task title: ${timeLog.taskTitle}`);
    console.log(`   Task ID (for manual task): ${timeLog.taskId || "none"}`);
    console.log(`   Task Local ID: ${timeLog.taskLocalId}`);

    return {
      local_id: timeLog.localId,
      task_id: timeLog.taskId, // For manual tasks - links to existing task ID
      task_local_id: timeLog.taskLocalId, // For all tasks - session UUID
      start_time: timeLog.startTime,
      end_time: timeLog.endTime,
      paused_at: timeLog.pausedAt,
      resumed_at: timeLog.resumedAt,
      duration: durationSeconds, // Convert ms to seconds
      paused_total: pausedTotalSeconds, // Convert ms to seconds
      status: timeLog.status,
      task_title: timeLog.taskTitle || "",
      notes: timeLog.notes,
    };
  }

  private async screenshotToDTO(screenshot: Screenshot, base64Data: string) {
    // If screenshot has timeLogId (local DB ID), get the LocalID string for server
    let timeLogLocalId: string | undefined;
    if (screenshot.timeLogId) {
      const timeLog = await this.dbService.getTimeLogById(screenshot.timeLogId);
      if (timeLog) {
        timeLogLocalId = timeLog.localId;
      }
    }

    return {
      local_id: screenshot.localId,
      time_log_local_id: timeLogLocalId, // Send LocalID string, not DB ID
      task_id: screenshot.taskId, // Deprecated, kept for backward compatibility
      task_local_id: screenshot.taskLocalId, // Primary task identifier (UUID)
      file_name: screenshot.fileName,
      file_size: screenshot.fileSize,
      mime_type: screenshot.mimeType || "image/png",
      captured_at: screenshot.capturedAt,
      screen_number: screenshot.screenNumber,
      is_encrypted: screenshot.isEncrypted || false,
      checksum: screenshot.checksum || "",
      base64_data: base64Data,
    };
  }

  private getDeviceUUID(): string {
    const { machineId } = require("node-machine-id");
    try {
      return machineId.machineIdSync();
    } catch {
      // Fallback to stored UUID
      let uuid = AppConfig.get("deviceUUID") as string;
      if (!uuid) {
        const { v4: uuidv4 } = require("uuid");
        uuid = uuidv4();
        AppConfig.set("deviceUUID", uuid);
      }
      return uuid;
    }
  }

  private getDeviceInfo() {
    const os = require("os");
    return {
      device_uuid: this.getDeviceUUID(),
      device_name: os.hostname(),
      os: os.platform(),
      os_version: os.release(),
      app_version: app.getVersion(),
    };
  }

  /**
   * Cleanup old synced screenshots to free disk space
   * Called automatically after successful sync
   */
  private async cleanupOldSyncedFiles(keepDays: number = 7): Promise<void> {
    try {
      const cutoffDate = subDays(Date.now(), keepDays);

      const syncedScreenshots =
        await this.dbService.getSyncedScreenshotsBeforeDate(
          formatISO(cutoffDate)
        );

      let deletedCount = 0;
      let freedBytes = 0;

      for (const screenshot of syncedScreenshots) {
        try {
          if (fs.existsSync(screenshot.filePath)) {
            const stats = fs.statSync(screenshot.filePath);
            freedBytes += stats.size;
            fs.unlinkSync(screenshot.filePath);
          }
          // Delete from database after file deletion
          await this.dbService.deleteScreenshotByFilePath(screenshot.filePath);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to cleanup ${screenshot.fileName}:`, error);
        }
      }

      if (deletedCount > 0) {
        console.log(
          `🧹 Auto-cleanup: Removed ${deletedCount} synced screenshots, freed ${this.formatBytes(
            freedBytes
          )}`
        );
      }
    } catch (error) {
      console.error("Error during auto-cleanup:", error);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  async cleanup(): Promise<void> {
    this.stopAutoSync();
  }
}
