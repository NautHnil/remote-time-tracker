import { formatISO, subDays } from "date-fns";
import fs from "fs";
import path from "path";
// @ts-ignore - screenshot-desktop doesn't have type definitions
import screenshot from "screenshot-desktop";
import { v4 as uuidv4 } from "uuid";
import { AppConfig } from "../config";
import { DatabaseService } from "./DatabaseService";

export class ScreenshotService {
  private dbService: DatabaseService;
  private screenshotTimer: NodeJS.Timeout | null = null;
  private isCapturing = false;
  private currentTaskId?: number; // For manual tasks

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async startCapturing(
    timeLogId?: number,
    taskLocalId?: string,
    taskId?: number // For manual tasks - link to existing task ID
  ): Promise<void> {
    if (this.isCapturing) {
      console.log("Screenshot capturing already active");
      return;
    }

    this.isCapturing = true;
    this.currentTaskId = taskId;
    console.log(
      `📸 Starting screenshot capture (TaskLocalID: ${taskLocalId}, TaskID: ${taskId})...`
    );

    // Take first screenshot immediately
    await this.captureAllScreens(timeLogId, taskLocalId, taskId);

    // Setup interval
    const interval = AppConfig.screenshotInterval;
    this.screenshotTimer = setInterval(async () => {
      await this.captureAllScreens(timeLogId, taskLocalId, this.currentTaskId);
    }, interval);
  }

  async stopCapturing(): Promise<void> {
    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer);
      this.screenshotTimer = null;
    }
    this.isCapturing = false;
    this.currentTaskId = undefined;
    console.log("📸 Screenshot capture stopped");
  }

  /**
   * Force stop all screenshot capturing activities
   * Use this to clean up any stuck capture processes from previous errors
   */
  async forceStopCapturing(): Promise<{ success: boolean; message: string }> {
    console.log("🛑 Force stopping all screenshot capture activities...");

    // Clear any existing timer
    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer);
      this.screenshotTimer = null;
      console.log("  ✓ Cleared screenshot timer");
    }

    // Reset all state flags
    const wasCapturing = this.isCapturing;
    this.isCapturing = false;
    this.currentTaskId = undefined;

    const message = wasCapturing
      ? "Force stopped active screenshot capture"
      : "No active capture to stop, state reset anyway";

    console.log(`🛑 ${message}`);

    return {
      success: true,
      message,
    };
  }

  /**
   * Get current capture status
   */
  getCaptureStatus(): {
    isCapturing: boolean;
    hasTimer: boolean;
    currentTaskId?: number;
  } {
    return {
      isCapturing: this.isCapturing,
      hasTimer: this.screenshotTimer !== null,
      currentTaskId: this.currentTaskId,
    };
  }

  private async captureAllScreens(
    timeLogId?: number,
    taskLocalId?: string,
    taskId?: number
  ): Promise<void> {
    try {
      // Ensure screenshots directory exists
      const screenshotsDir = AppConfig.getScreenshotsPath();
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      // Get all screens
      const screens = await screenshot.listDisplays();

      console.log(`📸 Capturing ${screens.length} screen(s)...`);

      // Capture each screen
      for (let i = 0; i < screens.length; i++) {
        await this.captureScreen(i, timeLogId, taskLocalId, taskId);
      }
    } catch (error) {
      console.error("Error capturing screenshots:", error);
    }
  }

  private async captureScreen(
    screenNumber: number,
    timeLogId?: number,
    taskLocalId?: string,
    taskId?: number
  ): Promise<void> {
    try {
      const localId = uuidv4();
      const nowMs = Date.now();
      const timestamp = formatISO(nowMs).replace(/[:.]/g, "-");
      const fileName = `screenshot-${timestamp}-screen${screenNumber}.png`;
      const filePath = path.join(AppConfig.getScreenshotsPath(), fileName);

      // Capture screenshot
      const imgBuffer = await screenshot({ screen: screenNumber });

      // Save to file
      fs.writeFileSync(filePath, imgBuffer);

      const fileSize = fs.statSync(filePath).size;

      // Save to database with taskLocalId and taskId (for manual tasks)
      await this.dbService.createScreenshot({
        localId,
        timeLogId,
        taskId, // For manual tasks - link to existing task ID
        taskLocalId,
        filePath,
        fileName,
        fileSize,
        mimeType: "image/png",
        capturedAt: formatISO(nowMs),
        screenNumber,
        isEncrypted: false,
        checksum: "",
        isSynced: false,
        createdAt: formatISO(nowMs),
      });

      console.log(
        `✅ Screenshot captured: ${fileName} (${this.formatBytes(fileSize)})`
      );
    } catch (error) {
      console.error(`Error capturing screen ${screenNumber}:`, error);
    }
  }

  async captureManual(): Promise<string[]> {
    const capturedFiles: string[] = [];

    try {
      const screens = await screenshot.listDisplays();

      for (let i = 0; i < screens.length; i++) {
        const localId = uuidv4();
        const nowMs = Date.now();
        const timestamp = formatISO(nowMs).replace(/[:.]/g, "-");
        const fileName = `manual-${timestamp}-screen${i}.png`;
        const filePath = path.join(AppConfig.getScreenshotsPath(), fileName);

        const imgBuffer = await screenshot({ screen: i });
        fs.writeFileSync(filePath, imgBuffer);

        capturedFiles.push(filePath);

        const fileSize = fs.statSync(filePath).size;

        await this.dbService.createScreenshot({
          localId,
          filePath,
          fileName,
          fileSize,
          mimeType: "image/png",
          capturedAt: formatISO(nowMs),
          screenNumber: i,
          isEncrypted: false,
          checksum: "",
          isSynced: false,
          createdAt: formatISO(nowMs),
        });
      }
    } catch (error) {
      console.error("Error in manual screenshot capture:", error);
      throw error;
    }

    return capturedFiles;
  }

  getScreenshotBase64(filePath: string): string {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      return imageBuffer.toString("base64");
    } catch (error) {
      console.error("Error reading screenshot:", error);
      throw error;
    }
  }

  /**
   * Delete screenshots older than specified days
   * Only deletes synced screenshots to avoid data loss
   */
  async deleteOldScreenshots(
    daysOld: number = 30
  ): Promise<{ deletedCount: number; freedBytes: number }> {
    const cutoffDate = subDays(Date.now(), daysOld);

    const screenshotsDir = AppConfig.getScreenshotsPath();

    // Check if directory exists
    if (!fs.existsSync(screenshotsDir)) {
      console.log("Screenshots directory does not exist");
      return { deletedCount: 0, freedBytes: 0 };
    }

    const files = fs.readdirSync(screenshotsDir);

    let deletedCount = 0;
    let freedBytes = 0;

    for (const file of files) {
      try {
        const filePath = path.join(screenshotsDir, file);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const stats = fs.statSync(filePath);

        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }

        if (stats.mtime < cutoffDate) {
          const fileSize = stats.size;

          // Check if screenshot is synced before deleting
          const screenshot = await this.dbService.getScreenshotByFilePath(
            filePath
          );

          if (screenshot && screenshot.isSynced) {
            // Delete synced screenshot
            fs.unlinkSync(filePath);
            await this.dbService.deleteScreenshotByFilePath(filePath);
            deletedCount++;
            freedBytes += fileSize;
            console.log(`Deleted synced screenshot: ${file}`);
          } else if (!screenshot) {
            // Delete orphaned files (not in database)
            fs.unlinkSync(filePath);
            deletedCount++;
            freedBytes += fileSize;
            console.log(`Deleted orphaned file: ${file}`);
          } else {
            console.log(`Skipped unsynced screenshot: ${file}`);
          }
        }
      } catch (error) {
        console.error(`Error deleting file ${file}:`, error);
        // Continue with next file
      }
    }

    console.log(
      `🗑️ Deleted ${deletedCount} old screenshots, freed ${(
        freedBytes /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    return { deletedCount, freedBytes };
  }

  /**
   * Delete synced screenshots to free up disk space
   * Keeps only recent screenshots (default: 7 days)
   */
  async cleanupSyncedScreenshots(keepDays: number = 7): Promise<void> {
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
        await this.dbService.deleteScreenshotByFilePath(screenshot.filePath);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete ${screenshot.fileName}:`, error);
      }
    }

    console.log(
      `🗑️ Cleaned up ${deletedCount} synced screenshots, freed ${this.formatBytes(
        freedBytes
      )}`
    );
  }

  /**
   * Get total size of all screenshots on disk
   */
  async getTotalScreenshotSize(): Promise<number> {
    const screenshotsDir = AppConfig.getScreenshotsPath();
    if (!fs.existsSync(screenshotsDir)) return 0;

    const files = fs.readdirSync(screenshotsDir);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(screenshotsDir, file);
      try {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return totalSize;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  isActive(): boolean {
    return this.isCapturing;
  }
}
