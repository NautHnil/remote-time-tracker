import axios, { AxiosInstance } from "axios";
import { formatISO, subDays } from "date-fns";
import { app } from "electron";
// @ts-ignore
import fs from "fs";
import { AppConfig } from "../config";
import {
  DatabaseService,
  Screenshot,
  SystemLog,
  TimeLog,
} from "./DatabaseService";

interface SyncResult {
  success: boolean;
  message: string;
  timeLogsSynced: number;
  screenshotsSynced: number;
  systemLogsSynced: number;
  errors: string[];
}

interface SyncBatchApiResult {
  total?: number;
  success?: number;
  failed?: number;
  errors?: string[];
}

interface PreparedScreenshotPayload {
  screenshot: Screenshot;
  dto: Record<string, any>;
  encodedBytes: number;
}

export class SyncService {
  private static readonly TIME_LOG_BATCH_SIZE = 100;
  private static readonly SCREENSHOT_BATCH_SIZE = 10;
  private static readonly SCREENSHOT_MAX_BATCH_BYTES = 4 * 1024 * 1024;
  private static readonly SYSTEM_LOG_BATCH_SIZE = 200;
  private static readonly SYNC_BATCH_ENDPOINT = "/sync-data/batch-sync";

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

            const {access_token, refresh_token} = response.data.data;

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
        systemLogsSynced: 0,
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
        systemLogsSynced: 0,
        errors: ["Not authenticated"],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let timeLogsSynced = 0;
    let screenshotsSynced = 0;
    let systemLogsSynced = 0;

    try {
      console.log("🔄 Starting sync...");

      // Get unsynced data
      const unsyncedTimeLogs = await this.dbService.getUnsyncedTimeLogs();
      const unsyncedScreenshots = await this.dbService.getUnsyncedScreenshots();
      const unsyncedSystemLogs = await this.dbService.getUnsyncedSystemLogs();

      console.log(
        `Found ${unsyncedTimeLogs.length} time logs, ${unsyncedScreenshots.length} screenshots and ${unsyncedSystemLogs.length} system logs to sync`
      );

      if (
        unsyncedTimeLogs.length === 0 &&
        unsyncedScreenshots.length === 0 &&
        unsyncedSystemLogs.length === 0
      ) {
        this.lastSyncTime = new Date(Date.now());
        return {
          success: true,
          message: "Nothing to sync",
          timeLogsSynced: 0,
          screenshotsSynced: 0,
          systemLogsSynced: 0,
          errors: [],
        };
      }

      const workspaceContext = this.getWorkspaceContext();
      console.log(
        `🏢 Workspace context for sync: org=${workspaceContext.organizationId}, ws=${workspaceContext.workspaceId}`
      );

      const contextPayload = {
        device_uuid: this.getDeviceUUID(),
        device_info: this.getDeviceInfo(),
        organization_id: workspaceContext.organizationId,
        workspace_id: workspaceContext.workspaceId,
      };

      if (unsyncedTimeLogs.length > 0) {
        const timeLogResult = await this.syncTimeLogBatches(
          unsyncedTimeLogs,
          contextPayload,
          errors
        );
        timeLogsSynced += timeLogResult;
      }

      if (unsyncedScreenshots.length > 0) {
        const screenshotResult = await this.syncScreenshotBatches(
          unsyncedScreenshots,
          contextPayload,
          errors
        );
        screenshotsSynced += screenshotResult;
      }

      if (unsyncedSystemLogs.length > 0) {
        const systemLogResult = await this.syncSystemLogBatches(
          unsyncedSystemLogs,
          contextPayload,
          errors
        );
        systemLogsSynced += systemLogResult;
      }

      if (
        timeLogsSynced > 0 ||
        screenshotsSynced > 0 ||
        systemLogsSynced > 0 ||
        errors.length === 0
      ) {
        this.lastSyncTime = new Date(Date.now());
      }

      await this.cleanupSyncedSystemLogs();
      console.log(
        `✅ Sync finished: ${timeLogsSynced} time logs, ${screenshotsSynced} screenshots, ${systemLogsSynced} system logs synced`
      );
    } catch (error: any) {
      console.error("Sync error:", error);
      errors.push(this.getReadableSyncError(error));
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
      systemLogsSynced,
      errors,
    };
  }

  private async syncTimeLogBatches(
    timeLogs: TimeLog[],
    contextPayload: Record<string, any>,
    errors: string[]
  ): Promise<number> {
    let synced = 0;

    for (const batch of this.chunkArray(
      timeLogs,
      SyncService.TIME_LOG_BATCH_SIZE
    )) {
      try {
        const response = await this.postSyncBatch({
          ...contextPayload,
          time_logs: batch.map((timeLog) => this.timeLogToDTO(timeLog)),
          screenshots: [],
          system_logs: [],
        });
        this.ensureBatchAccepted(response.data, "time_logs", "time logs");

        for (const timeLog of batch) {
          await this.dbService.markTimeLogAsSynced(timeLog.localId);
          synced++;
        }
      } catch (error) {
        console.error("Time log sync batch failed:", error);
        errors.push(this.getReadableSyncError(error, "time logs"));
        break;
      }
    }

    return synced;
  }

  private async syncScreenshotBatches(
    screenshots: Screenshot[],
    contextPayload: Record<string, any>,
    errors: string[]
  ): Promise<number> {
    let synced = 0;

    for (const batch of this.chunkArray(
      screenshots,
      SyncService.SCREENSHOT_BATCH_SIZE
    )) {
      const preparedBatch = await this.prepareScreenshotBatch(batch, errors);
      if (preparedBatch.length === 0) {
        continue;
      }

      try {
        synced += await this.syncPreparedScreenshotBatch(
          preparedBatch,
          contextPayload,
          errors
        );
      } catch (error) {
        console.error("Screenshot sync batch failed:", error);
        errors.push(this.getReadableSyncError(error, "screenshots"));
        break;
      }
    }

    return synced;
  }

  private async prepareScreenshotBatch(
    screenshots: Screenshot[],
    errors: string[]
  ): Promise<PreparedScreenshotPayload[]> {
    const preparedBatch: PreparedScreenshotPayload[] = [];

    for (const screenshot of screenshots) {
      try {
        if (!fs.existsSync(screenshot.filePath)) {
          await this.discardMissingScreenshot(screenshot);
          errors.push(`Removed missing local screenshot ${screenshot.fileName}`);
          continue;
        }

        const base64Data = fs.readFileSync(screenshot.filePath).toString("base64");
        preparedBatch.push({
          screenshot,
          dto: await this.screenshotToDTO(screenshot, base64Data),
          encodedBytes: Buffer.byteLength(base64Data, "utf8"),
        });
      } catch (error) {
        console.error(
          `Error preparing screenshot ${screenshot.fileName} for sync:`,
          error
        );
        errors.push(`Failed to prepare screenshot ${screenshot.fileName}`);
      }
    }

    return preparedBatch;
  }

  private async syncPreparedScreenshotBatch(
    batch: PreparedScreenshotPayload[],
    contextPayload: Record<string, any>,
    errors: string[]
  ): Promise<number> {
    let synced = 0;
    let currentBatch: PreparedScreenshotPayload[] = [];
    let currentBytes = 0;

    for (const item of batch) {
      const nextBatchWouldOverflow =
        currentBatch.length > 0 &&
        currentBytes + item.encodedBytes >
          SyncService.SCREENSHOT_MAX_BATCH_BYTES;

      if (nextBatchWouldOverflow) {
        synced += await this.uploadPreparedScreenshotChunk(
          currentBatch,
          contextPayload,
          errors
        );
        currentBatch = [];
        currentBytes = 0;
      }

      currentBatch.push(item);
      currentBytes += item.encodedBytes;
    }

    if (currentBatch.length > 0) {
      synced += await this.uploadPreparedScreenshotChunk(
        currentBatch,
        contextPayload,
        errors
      );
    }

    return synced;
  }

  private async uploadPreparedScreenshotChunk(
    batch: PreparedScreenshotPayload[],
    contextPayload: Record<string, any>,
    errors: string[]
  ): Promise<number> {
    try {
      await this.sendPreparedScreenshotBatch(batch, contextPayload);
      await this.finalizePreparedScreenshots(batch);
      return batch.length;
    } catch (error) {
      if (this.shouldRetryScreenshotBatch(error) && batch.length > 1) {
        const splitIndex = Math.ceil(batch.length / 2);
        console.warn(
          `Screenshot upload batch failed (${this.getReadableSyncError(
            error,
            "screenshots"
          )}). Retrying in smaller chunks: ${splitIndex} + ${
            batch.length - splitIndex
          }`
        );

        const firstHalf = batch.slice(0, splitIndex);
        const secondHalf = batch.slice(splitIndex);
        let synced = 0;
        synced += await this.uploadPreparedScreenshotChunk(
          firstHalf,
          contextPayload,
          errors
        );
        synced += await this.uploadPreparedScreenshotChunk(
          secondHalf,
          contextPayload,
          errors
        );
        return synced;
      }

      throw error;
    }
  }

  private async sendPreparedScreenshotBatch(
    batch: PreparedScreenshotPayload[],
    contextPayload: Record<string, any>
  ): Promise<void> {
    const response = await this.postSyncBatch({
      ...contextPayload,
      time_logs: [],
      screenshots: batch.map((item) => item.dto),
      system_logs: [],
    });
    this.ensureBatchAccepted(response.data, "screenshots", "screenshots");
  }

  private async finalizePreparedScreenshots(
    batch: PreparedScreenshotPayload[]
  ): Promise<void> {
    for (const item of batch) {
      await this.finalizeSyncedScreenshot(item.screenshot);
    }
  }

  private shouldRetryScreenshotBatch(error: any): boolean {
    const errorCode = error?.code;
    return (
      errorCode === "EPIPE" ||
      errorCode === "ECONNRESET" ||
      errorCode === "ECONNABORTED" ||
      error?.message === "socket hang up"
    );
  }

  private async syncSystemLogBatches(
    systemLogs: SystemLog[],
    contextPayload: Record<string, any>,
    errors: string[]
  ): Promise<number> {
    let synced = 0;

    for (const batch of this.chunkArray(
      systemLogs,
      SyncService.SYSTEM_LOG_BATCH_SIZE
    )) {
      try {
        const response = await this.postSyncBatch({
          ...contextPayload,
          time_logs: [],
          screenshots: [],
          system_logs: batch.map((systemLog) => this.systemLogToDTO(systemLog)),
        });
        this.ensureBatchAccepted(response.data, "system_logs", "system logs");

        for (const systemLog of batch) {
          await this.dbService.markSystemLogAsSynced(systemLog.localId);
          synced++;
        }
      } catch (error) {
        if (this.isIgnorableSystemLogSyncError(error)) {
          console.warn(
            "System log sync skipped because backend does not support the sync endpoint yet:",
            error
          );
          break;
        }

        console.error("System log sync batch failed:", error);
        errors.push(this.getReadableSyncError(error, "system logs"));
        break;
      }
    }

    return synced;
  }

  private async discardMissingScreenshot(screenshot: Screenshot): Promise<void> {
    try {
      await this.dbService.deleteScreenshotByFilePath(screenshot.filePath);
    } catch (error) {
      console.error(
        `Failed to remove missing screenshot record ${screenshot.fileName}:`,
        error
      );
    }
  }

  private async finalizeSyncedScreenshot(screenshot: Screenshot): Promise<void> {
    try {
      if (fs.existsSync(screenshot.filePath)) {
        fs.unlinkSync(screenshot.filePath);
      }
      await this.dbService.deleteScreenshotByFilePath(screenshot.filePath);
    } catch (error) {
      console.error(`Failed to delete screenshot ${screenshot.fileName}:`, error);
      await this.dbService.markScreenshotAsSynced(screenshot.localId);
    }
  }

  private ensureBatchAccepted(
    responseBody: any,
    dataKey: "time_logs" | "screenshots" | "system_logs",
    scope: string
  ): void {
    if (!responseBody?.success) {
      throw new Error(responseBody?.message || `${scope}: sync request failed`);
    }

    const resultMap: Record<string, SyncBatchApiResult | undefined> = {
      time_logs: responseBody?.data?.time_logs_sync,
      screenshots: responseBody?.data?.screenshots_sync,
      system_logs: responseBody?.data?.system_logs_sync,
    };

    const batchResult = resultMap[dataKey];
    if (!batchResult) {
      return;
    }

    if ((batchResult.failed || 0) > 0) {
      const detail =
        batchResult.errors && batchResult.errors.length > 0
          ? batchResult.errors.join(", ")
          : `only synced ${batchResult.success || 0}/${batchResult.total || 0}`;
      throw new Error(`${scope}: ${detail}`);
    }
  }

  private chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
      chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
  }

  private buildSyncBatchCurlCommand(
    payload: Record<string, any>,
    accessToken?: string
  ): string {
    const body = JSON.stringify(payload, null, 2).replace(/'/g, `'\\''`);

    return [
      `curl -i -X POST '${this.resolveSyncBatchUrl()}'`,
      `-H 'Content-Type: application/json'`,
      // `-H 'Authorization: Bearer ${this.maskBearerToken(accessToken)}'`,
      `-H 'Authorization: Bearer ${accessToken}'`,
      `--data-raw '${body}'`,
      // `--data-raw {}`,
    ].join(" \\\n  ");
  }

  private resolveSyncBatchUrl(): string {
    return `${AppConfig.apiUrl.replace(/\/+$/, "")}${SyncService.SYNC_BATCH_ENDPOINT}`;
  }

  private maskBearerToken(token?: string): string {
    if (!token) {
      return "<missing-token>";
    }

    if (token.length <= 12) {
      return "<redacted-token>";
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  private async postSyncBatch(payload: Record<string, any>) {
    const credentials = AppConfig.getCredentials();
    const hasAccessToken = Boolean(credentials?.accessToken);
    const curlCommand = this.buildSyncBatchCurlCommand(
      payload,
      credentials?.accessToken
    );

    try {
      return await this.apiClient.post(SyncService.SYNC_BATCH_ENDPOINT, payload);
    } catch (error: any) {
      if (this.isBatchSyncEndpointMissing(error)) {
        const responseServer = error?.response?.headers?.server;
        const responseType = error?.response?.headers?.["content-type"];
        console.warn(
          `Batch sync endpoint ${SyncService.SYNC_BATCH_ENDPOINT} returned 404 on ${AppConfig.apiUrl} (server=${responseServer || "unknown"}, content-type=${responseType || "unknown"}, auth=${hasAccessToken}).`
        );
        console.warn(`Debug curl for ${SyncService.SYNC_BATCH_ENDPOINT}:\n${curlCommand}`);
        throw new Error(
          `Sync endpoint not found: ${AppConfig.apiUrl}${SyncService.SYNC_BATCH_ENDPOINT}`
        );
      }

      throw error;
    }
  }

  private isBatchSyncEndpointMissing(error: any): boolean {
    return (
      error?.response?.status === 404 &&
      error?.config?.url === SyncService.SYNC_BATCH_ENDPOINT
    );
  }

  private isIgnorableSystemLogSyncError(error: any): boolean {
    return (
      error?.response?.status === 404 ||
      error?.message ===
      `Sync endpoint not found: ${AppConfig.apiUrl}${SyncService.SYNC_BATCH_ENDPOINT}`
    );
  }

  private getReadableSyncError(error: any, scope = "sync"): string {
    const errorCode = error?.code;
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || error?.request?.path;
    const serverMessage =
      error?.response?.data?.message || error?.response?.data?.error;

    if (status === 404 && requestUrl) {
      return `${scope}: endpoint not found (${requestUrl}). Admin system log APIs may exist, but the desktop sync route is missing or different.`;
    }

    if (status && serverMessage) {
      return `${scope}: ${serverMessage} (HTTP ${status})`;
    }

    if (errorCode === "EPIPE") {
      return `${scope}: connection closed while uploading data (EPIPE). Local backlog is likely too large; sync now retries in smaller batches.`;
    }

    if (errorCode === "ECONNRESET") {
      return `${scope}: connection was reset while uploading data`;
    }

    if (errorCode === "ECONNABORTED") {
      return `${scope}: request timed out while uploading data`;
    }

    return `${scope}: ${error?.message || "Unknown sync error"}`;
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      autoSyncEnabled: this.syncTimer !== null,
    };
  }

  async updatePresence(status: "working" | "idle"): Promise<void> {
    const credentials = AppConfig.getCredentials();
    if (!credentials?.accessToken) {
      return;
    }

    try {
      await this.apiClient.post("/presence/heartbeat", { status });
    } catch (error) {
      console.error(`Failed to update presence to ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get workspace context from stored credentials/settings
   * This determines which workspace the synced data belongs to
   */
  private getWorkspaceContext(): {
    organizationId?: number;
    workspaceId?: number;
  } {
    try {
      const credentials = AppConfig.getCredentials();
      return {
        organizationId: credentials?.organizationId,
        workspaceId: credentials?.workspaceId,
      };
    } catch (error) {
      console.error("Error getting workspace context:", error);
      return {};
    }
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
    console.log(`   Organization ID: ${timeLog.organizationId || "none"}`);
    console.log(`   Workspace ID: ${timeLog.workspaceId || "none"}`);

    return {
      local_id: timeLog.localId,
      task_id: timeLog.taskId, // For manual tasks - links to existing task ID
      task_local_id: timeLog.taskLocalId, // For all tasks - session UUID
      organization_id: timeLog.organizationId,
      workspace_id: timeLog.workspaceId,
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
      organization_id: screenshot.organizationId,
      workspace_id: screenshot.workspaceId,
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

  private systemLogToDTO(systemLog: SystemLog) {
    const workspaceContext = this.getWorkspaceContext();
    const occurredAt = this.normalizeSyncTimestamp(
      systemLog.occurredAt || systemLog.createdAt
    );

    return {
      local_id: systemLog.localId,
      organization_id:
        systemLog.organizationId ?? workspaceContext.organizationId,
      workspace_id: systemLog.workspaceId ?? workspaceContext.workspaceId,
      source: systemLog.source || "electron-main",
      level: (systemLog.level || "info").toLowerCase(),
      component: systemLog.component || "unknown",
      message: (systemLog.message || "").trim(),
      details: this.serializeValueData(systemLog.details),
      stack_trace: this.serializeValueData(systemLog.stackTrace),
      app_version: systemLog.appVersion || app.getVersion(),
      device_uuid: systemLog.deviceUUID || this.getDeviceUUID(),
      occurred_at: occurredAt,
      request_id: systemLog.requestId,
      session_local_id: systemLog.sessionLocalId,
    };
  }

  private normalizeSyncTimestamp(timestamp?: string): string {
    if (!timestamp) {
      return new Date().toISOString();
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }

    return parsed.toISOString();
  }

  private serializeValueData(value: unknown): string {
    if (value == null) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
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
    await this.cleanupSyncedSystemLogs();
  }

  private async cleanupSyncedSystemLogs(): Promise<void> {
    try {
      const retentionDays = AppConfig.systemLogRetentionDays;
      if (!retentionDays || retentionDays <= 0) return;

      const cutoff = subDays(Date.now(), retentionDays);
      const deleted = await this.dbService.cleanupSyncedSystemLogsBeforeDate(
        formatISO(cutoff),
      );

      if (deleted > 0) {
        console.log(
          `🧹 System log cleanup: removed ${deleted} synced logs older than ${retentionDays} days`,
        );
      }
    } catch (error) {
      console.error("Error during system log cleanup:", error);
    }
  }
}
