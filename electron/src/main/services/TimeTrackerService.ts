import { formatISO, getTime, parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { AppConfig } from "../config";
import { DatabaseService, TimeLog } from "./DatabaseService";
import { ScreenshotService } from "./ScreenshotService";
import { SyncService } from "./SyncService";

type TimeLogStatus = "running" | "paused" | "stopped";

interface TimeTrackerStatus {
  isTracking: boolean;
  status: TimeLogStatus;
  currentTimeLog?: TimeLog & { isManualTask?: boolean };
  elapsedTime: number;
  pausedTime: number;
}

export class TimeTrackerService {
  private dbService: DatabaseService;
  private screenshotService: ScreenshotService;
  private syncService: SyncService;

  private currentTimeLog: TimeLog | null = null;
  private startTimestamp: number | null = null;
  private pauseTimestamp: number | null = null;
  private totalPausedTime = 0;
  private frozenDuration = 0; // Duration at pause moment
  private isManualTask = false; // Track if current task is a manual task
  private manualTaskTitle = ""; // Store manual task title
  private lastPersistAt = 0;

  private trackingTimer: NodeJS.Timeout | null = null;

  constructor(
    dbService: DatabaseService,
    screenshotService: ScreenshotService,
    syncService: SyncService,
  ) {
    this.dbService = dbService;
    this.screenshotService = screenshotService;
    this.syncService = syncService;
  }

  async initialize(): Promise<void> {
    // Resume active session if exists
    await this.resumeActiveSession();
  }

  private async resumeActiveSession(): Promise<void> {
    try {
      const activeTimeLog = await this.dbService.getActiveTimeLog();

      if (!activeTimeLog) {
        console.log("📭 No active session to resume");
        return;
      }

      console.log(
        `🔍 Found active session: ${activeTimeLog.status} (ID: ${activeTimeLog.id})`,
      );

      this.currentTimeLog = activeTimeLog;
      this.startTimestamp = getTime(parseISO(activeTimeLog.startTime));
      this.totalPausedTime = activeTimeLog.pausedTotal;

      // Restore manual task state from activeTimeLog
      // If taskId is set, this is a manual task
      this.isManualTask =
        activeTimeLog.taskId !== undefined && activeTimeLog.taskId !== null;
      this.manualTaskTitle = activeTimeLog.taskTitle || "";

      if (activeTimeLog.status === "running") {
        // Session was running - resume it
        this.pauseTimestamp = null;
        this.frozenDuration = 0;

        console.log(
          "⏰ Resuming running session (duration: " +
            this.formatDuration(activeTimeLog.duration) +
            ", manual: " +
            this.isManualTask +
            ")",
        );

        // Get workspace context from timeLog or credentials
        const organizationId = activeTimeLog.organizationId;
        const workspaceId = activeTimeLog.workspaceId;

        // Resume screenshot capturing with taskLocalId and taskId for manual tasks
        await this.screenshotService.startCapturing(
          activeTimeLog.id,
          activeTimeLog.taskLocalId || undefined,
          this.isManualTask ? activeTimeLog.taskId : undefined,
          organizationId, // Pass organization context
          workspaceId, // Pass workspace context
        );

        // Start timer
        this.startTimer();
      } else if (activeTimeLog.status === "paused") {
        // Session was paused - load state but don't resume
        this.pauseTimestamp = getTime(parseISO(activeTimeLog.pausedAt!));
        this.frozenDuration = activeTimeLog.duration;

        console.log(
          `⏸️  Loaded paused session (duration: ${this.formatDuration(
            activeTimeLog.duration,
          )}, paused: ${this.formatDuration(this.totalPausedTime)}, manual: ${
            this.isManualTask
          })`,
        );

        // Don't start timer or screenshots when paused
      } else {
        // Invalid state - should not happen
        console.warn(
          `⚠️  Invalid session state: ${activeTimeLog.status}, clearing...`,
        );
        this.currentTimeLog = null;
        this.startTimestamp = null;
        this.pauseTimestamp = null;
        this.totalPausedTime = 0;
        this.frozenDuration = 0;
        this.isManualTask = false;
        this.manualTaskTitle = "";
      }
    } catch (error) {
      console.error("❌ Error resuming active session:", error);
      // Clear state on error to prevent inconsistencies
      this.currentTimeLog = null;
      this.startTimestamp = null;
      this.pauseTimestamp = null;
      this.totalPausedTime = 0;
      this.frozenDuration = 0;
      this.isManualTask = false;
      this.manualTaskTitle = "";
    }
  }

  async start(taskId?: number, notes?: string): Promise<TimeTrackerStatus> {
    if (this.currentTimeLog && this.currentTimeLog.status !== "stopped") {
      throw new Error(
        "Time tracking already active. Stop current session first.",
      );
    }

    const nowMs = Date.now();
    const localId = uuidv4();

    // Check if this is a manual task (taskId is provided = manual task)
    // notes parameter is used to pass the task title for manual tasks
    this.isManualTask = taskId !== undefined;
    this.manualTaskTitle = notes || "";

    // Generate taskLocalId (UUID) for BOTH manual and auto-track tasks
    // This ensures consistent logic for screenshots and syncing
    // For manual tasks: taskId links to existing task, taskLocalId is for this session
    // For auto-track tasks: taskLocalId is used to create/find task on server
    const taskLocalId = uuidv4();

    // Get current workspace context from credentials
    const credentials = AppConfig.getCredentials();
    const organizationId = credentials?.organizationId;
    const workspaceId = credentials?.workspaceId;
    const userId = credentials?.userId;

    const timeLog: Omit<TimeLog, "id"> = {
      localId,
      taskId, // Store task ID for manual tasks - links to existing task
      taskLocalId, // Generated for BOTH manual and auto-track tasks
      organizationId, // Store organization context
      workspaceId, // Store workspace context
      userId, // Store user context
      startTime: formatISO(nowMs),
      duration: 0,
      pausedTotal: 0,
      status: "running",
      taskTitle: this.isManualTask ? this.manualTaskTitle : undefined, // Pre-set title for manual tasks
      notes: this.isManualTask ? `Manual task ID: ${taskId}` : notes,
      isSynced: false,
      createdAt: formatISO(nowMs),
    };

    this.currentTimeLog = await this.dbService.createTimeLog(timeLog);
    this.startTimestamp = nowMs;
    this.pauseTimestamp = null;
    this.totalPausedTime = 0;
    this.frozenDuration = 0;
    this.lastPersistAt = nowMs;

    // Start screenshot capturing with taskLocalId and taskId (for manual tasks)
    await this.screenshotService.startCapturing(
      this.currentTimeLog.id,
      taskLocalId,
      this.isManualTask ? taskId : undefined, // Pass taskId for manual tasks
      organizationId, // Pass organization context
      workspaceId, // Pass workspace context
    );

    // Start tracking timer
    this.startTimer();

    console.log(
      `▶️  Time tracking started (Manual: ${this.isManualTask}, TaskID: ${taskId}, TaskLocalID: ${taskLocalId}, WsID: ${workspaceId})`,
    );

    return this.getStatus();
  }

  async stop(
    taskTitle?: string,
    waitForSync: boolean = false,
  ): Promise<TimeTrackerStatus> {
    if (!this.currentTimeLog || this.currentTimeLog.status === "stopped") {
      throw new Error("No active time tracking session");
    }

    // Calculate the correct duration and end time based on current status
    let duration: number;
    let endTimeMs: number;

    if (this.currentTimeLog.status === "paused") {
      // If currently paused, include the current paused duration in pausedTotal
      const nowMs = Date.now();
      const currentPauseDuration = this.pauseTimestamp
        ? nowMs - this.pauseTimestamp
        : 0;
      this.totalPausedTime += currentPauseDuration;

      // Use frozen duration for work time and set end time to now
      duration = this.frozenDuration;
      endTimeMs = nowMs;
    } else {
      // If currently running, calculate from now
      const nowMs = Date.now();
      duration = nowMs - this.startTimestamp! - this.totalPausedTime;
      endTimeMs = nowMs;
    }

    if (duration < 0) {
      duration = 0;
    }

    const endTime = formatISO(endTimeMs);

    await this.dbService.updateTimeLog(this.currentTimeLog.id!, {
      endTime,
      duration, // Store in milliseconds locally
      pausedTotal: this.totalPausedTime, // Store in milliseconds locally
      status: "stopped",
      taskTitle: taskTitle || "", // Save task title
      isSynced: false, // Mark as unsynced to trigger sync
    });

    // Stop screenshot capturing
    await this.screenshotService.stopCapturing();

    // Stop timer
    this.stopTimer();

    console.log(
      `⏹️  Time tracking stopped (Duration: ${this.formatDuration(duration)})`,
    );

    // Trigger sync - wait for it if requested (e.g., before quit)
    if (waitForSync) {
      console.log("🔄 Waiting for sync to complete before quit...");
      try {
        await this.syncService.syncNow();
        console.log("✅ Sync completed successfully");
      } catch (error) {
        console.error("❌ Sync failed:", error);
        // Don't throw - we still want to quit even if sync fails
      }
    } else {
      // Background sync after 1 second delay
      setTimeout(() => {
        this.syncService.syncNow();
      }, 1000);
    }

    const status = this.getStatus();

    // Clear current session
    this.currentTimeLog = null;
    this.startTimestamp = null;
    this.pauseTimestamp = null;
    this.totalPausedTime = 0;
    this.frozenDuration = 0;
    this.isManualTask = false;
    this.manualTaskTitle = "";

    return status;
  }

  async pause(): Promise<TimeTrackerStatus> {
    if (!this.currentTimeLog || this.currentTimeLog.status !== "running") {
      throw new Error("No running time tracking session to pause");
    }

    const nowMs = Date.now();
    this.pauseTimestamp = nowMs;

    // Freeze duration at pause moment
    this.frozenDuration =
      this.pauseTimestamp - this.startTimestamp! - this.totalPausedTime;

    await this.dbService.updateTimeLog(this.currentTimeLog.id!, {
      pausedAt: formatISO(nowMs),
      duration: this.frozenDuration,
      status: "paused",
      isSynced: false, // Mark as unsynced to trigger sync
    });

    // Update in-memory status
    this.currentTimeLog.status = "paused";
    this.currentTimeLog.pausedAt = formatISO(nowMs);
    this.currentTimeLog.duration = this.frozenDuration;

    // Stop screenshot capturing
    await this.screenshotService.stopCapturing();

    console.log("⏸️  Time tracking paused");

    return this.getStatus();
  }

  async resume(): Promise<TimeTrackerStatus> {
    if (!this.currentTimeLog || this.currentTimeLog.status !== "paused") {
      throw new Error("No paused time tracking session to resume");
    }

    const nowMs = Date.now();
    const pauseDuration = nowMs - this.pauseTimestamp!;
    this.totalPausedTime += pauseDuration;
    this.pauseTimestamp = null;
    this.frozenDuration = 0; // Clear frozen duration
    this.lastPersistAt = nowMs;

    await this.dbService.updateTimeLog(this.currentTimeLog.id!, {
      resumedAt: formatISO(nowMs),
      pausedTotal: this.totalPausedTime,
      status: "running",
      isSynced: false, // Mark as unsynced to trigger sync
    });

    // Update in-memory status
    this.currentTimeLog.status = "running";
    this.currentTimeLog.resumedAt = formatISO(nowMs);
    this.currentTimeLog.pausedTotal = this.totalPausedTime;

    // Get workspace context from currentTimeLog
    const organizationId = this.currentTimeLog.organizationId;
    const workspaceId = this.currentTimeLog.workspaceId;

    // Resume screenshot capturing with taskLocalId and taskId for manual tasks
    await this.screenshotService.startCapturing(
      this.currentTimeLog.id,
      this.currentTimeLog.taskLocalId || undefined,
      this.isManualTask ? this.currentTimeLog.taskId : undefined,
      organizationId, // Pass organization context
      workspaceId, // Pass workspace context
    );

    // Restart timer
    this.startTimer();

    console.log("▶️  Time tracking resumed");

    return this.getStatus();
  }

  getStatus(): TimeTrackerStatus {
    if (!this.currentTimeLog) {
      return {
        isTracking: false,
        status: "stopped",
        elapsedTime: 0,
        pausedTime: 0,
      };
    }

    const duration = this.calculateDuration();

    // Calculate current paused time
    let currentPausedTime = this.totalPausedTime;
    if (this.pauseTimestamp && this.currentTimeLog.status === "paused") {
      // Add current pause duration
      currentPausedTime += Date.now() - this.pauseTimestamp;
    }

    return {
      isTracking: this.currentTimeLog.status !== "stopped",
      status: this.currentTimeLog.status as TimeLogStatus,
      currentTimeLog: {
        ...this.currentTimeLog,
        isManualTask: this.isManualTask,
      },
      elapsedTime: duration,
      pausedTime: currentPausedTime,
    };
  }

  private calculateDuration(): number {
    if (!this.startTimestamp) return 0;

    // If paused, return frozen duration
    if (this.pauseTimestamp && this.frozenDuration > 0) {
      return this.frozenDuration;
    }

    const now = Date.now();

    // Currently running
    const duration = now - this.startTimestamp - this.totalPausedTime;
    return duration < 0 ? 0 : duration;
  }

  private startTimer(): void {
    if (this.trackingTimer) return;

    this.lastPersistAt = Date.now();

    // Update duration every second
    this.trackingTimer = setInterval(async () => {
      if (this.currentTimeLog && this.currentTimeLog.status === "running") {
        const duration = this.calculateDuration();

        // Update database every minute
        const now = Date.now();
        if (now - this.lastPersistAt >= 60000) {
          await this.dbService.updateTimeLog(this.currentTimeLog.id!, {
            duration, // Store in milliseconds locally
            pausedTotal: this.totalPausedTime, // Store in milliseconds locally
          });
          this.lastPersistAt = now;
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.trackingTimer) {
      clearInterval(this.trackingTimer);
      this.trackingTimer = null;
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours}h ${minutes}m ${secs}s`;
  }

  async forceStop(): Promise<void> {
    console.log("🛑 Force stopping all tracking activities...");

    // Stop all timers and services
    this.stopTimer();
    await this.screenshotService.stopCapturing();

    // Stop any active timelog in database
    if (this.currentTimeLog && this.currentTimeLog.id) {
      try {
        const nowMs = Date.now();
        if (this.currentTimeLog.status === "paused" && this.pauseTimestamp) {
          this.totalPausedTime += nowMs - this.pauseTimestamp;
        }
        const duration = this.calculateDuration();

        await this.dbService.updateTimeLog(this.currentTimeLog.id, {
          endTime: formatISO(nowMs),
          duration,
          pausedTotal: this.totalPausedTime,
          status: "stopped",
          isSynced: false, // Mark as unsynced to trigger sync
        });
        console.log("✅ Active session stopped in database");
      } catch (error) {
        console.error("Error stopping active session:", error);
      }
    }

    // Clear in-memory state
    this.currentTimeLog = null;
    this.startTimestamp = null;
    this.pauseTimestamp = null;
    this.totalPausedTime = 0;
    this.frozenDuration = 0;
    this.isManualTask = false;
    this.manualTaskTitle = "";

    console.log("✅ Force stop completed");
  }

  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up TimeTrackerService...");
    this.stopTimer();
    await this.screenshotService.stopCapturing();
  }
}
