import { formatISO, subDays } from "date-fns";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import screenshot from "screenshot-desktop";
import { v4 as uuidv4 } from "uuid";
import { AppConfig } from "../config";
import {
  deleteFileWithRetries,
  moveFileWithRetries,
} from "../utils/FileDeletion";
import { DatabaseService } from "./DatabaseService";
import { dependencyChecker, DependencyCheckResult } from "./DependencyChecker";
import { ImageOptimizer } from "./ImageOptimizer";

export class ScreenshotService {
  private dbService: DatabaseService;
  private screenshotTimer: NodeJS.Timeout | null = null;
  private isCapturing = false;
  private currentTaskId?: number; // For manual tasks
  private currentOrganizationId?: number; // Current organization context
  private currentWorkspaceId?: number; // Current workspace context
  private imageOptimizer!: ImageOptimizer; // Definite assignment assertion - initialized in initializeOptimizer()
  private dependenciesChecked = false;
  private dependenciesAvailable = false;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    // Initialize image optimizer with settings from config
    this.initializeOptimizer();
  }

  /**
   * Initialize the service and check dependencies
   * Should be called once when the app starts
   */
  async initialize(): Promise<DependencyCheckResult> {
    console.log("🔧 Initializing ScreenshotService...");

    // Check dependencies
    const result = await dependencyChecker.checkDependencies();
    this.dependenciesChecked = true;
    this.dependenciesAvailable = result.allDependenciesMet;

    if (!result.allDependenciesMet) {
      console.warn(
        "⚠️ Screenshot dependencies not met:",
        result.missingRequired.map((d) => d.name),
      );

      // Show dialog to user
      const action = await dependencyChecker.showMissingDependenciesDialog();

      switch (action) {
        case "install":
          const installResult =
            await dependencyChecker.installMissingDependencies();
          if (installResult.success) {
            this.dependenciesAvailable = true;
            console.log("✅ Dependencies installed successfully");
          } else {
            console.warn(
              "⚠️ Some dependencies could not be installed:",
              installResult.message,
            );
          }
          break;
        case "help":
          dependencyChecker.openHelpDocumentation();
          break;
        case "ignore":
          console.log("⚠️ User chose to ignore missing dependencies");
          break;
      }
    }

    return result;
  }

  /**
   * Check if screenshot capture is available (dependencies installed)
   */
  isAvailable(): boolean {
    return this.dependenciesAvailable;
  }

  /**
   * Get dependency check status
   */
  getDependencyStatus(): {
    checked: boolean;
    available: boolean;
    message: string;
  } {
    return {
      checked: this.dependenciesChecked,
      available: this.dependenciesAvailable,
      message: dependencyChecker.getStatusMessage(),
    };
  }

  /**
   * Re-check dependencies (useful after manual installation)
   */
  async recheckDependencies(): Promise<DependencyCheckResult> {
    const result = await dependencyChecker.checkDependencies();
    this.dependenciesChecked = true;
    this.dependenciesAvailable = result.allDependenciesMet;
    return result;
  }

  /**
   * Initialize or reinitialize the image optimizer with current config settings
   */
  private initializeOptimizer(): void {
    const config = AppConfig.imageOptimization;
    this.imageOptimizer = new ImageOptimizer({
      format: config.format,
      quality: config.quality,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      stripMetadata: true,
    });
    console.log(
      `🖼️ Image optimizer initialized: ${config.format} @ ${config.quality}% quality, max ${config.maxWidth}x${config.maxHeight}`,
    );
  }

  /**
   * Update image optimization settings and reinitialize optimizer
   */
  updateOptimizationSettings(settings: {
    format?: "jpeg" | "webp" | "png";
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): void {
    AppConfig.setImageOptimization(settings);
    this.initializeOptimizer();
  }

  /**
   * Get current optimization settings
   */
  getOptimizationSettings() {
    return AppConfig.imageOptimization;
  }

  async startCapturing(
    timeLogId?: number,
    taskLocalId?: string,
    taskId?: number, // For manual tasks - link to existing task ID
    organizationId?: number, // Organization context
    workspaceId?: number, // Workspace context
  ): Promise<void> {
    if (this.isCapturing) {
      console.log("Screenshot capturing already active");
      return;
    }

    // Check dependencies if not already checked
    if (!this.dependenciesChecked) {
      await this.initialize();
    }

    // Warn if dependencies are not available but continue anyway
    // (user might have installed them manually or the check might have false negatives)
    if (!this.dependenciesAvailable) {
      console.warn(
        "⚠️ Starting screenshot capture despite missing dependencies. Capture may fail.",
      );
    }

    this.isCapturing = true;
    this.currentTaskId = taskId;
    this.currentOrganizationId = organizationId;
    this.currentWorkspaceId = workspaceId;
    console.log(
      `📸 Starting screenshot capture (TaskLocalID: ${taskLocalId}, TaskID: ${taskId}, WsID: ${workspaceId})...`,
    );

    // Take first screenshot immediately
    await this.captureAllScreens(
      timeLogId,
      taskLocalId,
      taskId,
      organizationId,
      workspaceId,
    );

    // Setup interval
    const interval = AppConfig.screenshotInterval;
    this.screenshotTimer = setInterval(async () => {
      await this.captureAllScreens(
        timeLogId,
        taskLocalId,
        this.currentTaskId,
        this.currentOrganizationId,
        this.currentWorkspaceId,
      );
    }, interval);
  }

  async stopCapturing(): Promise<void> {
    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer);
      this.screenshotTimer = null;
    }
    this.isCapturing = false;
    this.currentTaskId = undefined;
    this.currentOrganizationId = undefined;
    this.currentWorkspaceId = undefined;
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
    currentOrganizationId?: number;
    currentWorkspaceId?: number;
  } {
    return {
      isCapturing: this.isCapturing,
      hasTimer: this.screenshotTimer !== null,
      currentTaskId: this.currentTaskId,
      currentOrganizationId: this.currentOrganizationId,
      currentWorkspaceId: this.currentWorkspaceId,
    };
  }

  private async captureAllScreens(
    timeLogId?: number,
    taskLocalId?: string,
    taskId?: number,
    organizationId?: number,
    workspaceId?: number,
  ): Promise<void> {
    try {
      // Ensure screenshots directory exists
      const screenshotsDir = AppConfig.getScreenshotsPath();
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      // Get all screens with their IDs (required for Windows/Linux)
      const screens = await screenshot.listDisplays();

      console.log(
        `📸 Capturing ${screens.length} screen(s)... Platform: ${process.platform}`,
      );
      console.log(
        `📸 Displays found:`,
        screens.map((s: { id: string | number; name: string }) => ({
          id: s.id,
          name: s.name,
        })),
      );

      // Capture each screen using its proper ID
      for (let i = 0; i < screens.length; i++) {
        const display = screens[i] as { id: string | number; name: string };
        await this.captureScreen(
          display.id,
          i,
          timeLogId,
          taskLocalId,
          taskId,
          organizationId,
          workspaceId,
        );
      }
    } catch (error) {
      console.error("Error capturing screenshots:", error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
    }
  }

  /**
   * Capture a single screen
   * @param screenId - The display ID (string for Windows/Linux, number for macOS)
   * @param screenIndex - The index of the screen (0, 1, 2...) for naming purposes
   */
  private async captureScreen(
    screenId: string | number,
    screenIndex: number,
    timeLogId?: number,
    taskLocalId?: string,
    taskId?: number,
    organizationId?: number,
    workspaceId?: number,
  ): Promise<void> {
    try {
      const localId = uuidv4();
      const nowMs = Date.now();
      const timestamp = formatISO(nowMs).replace(/[:.]/g, "-");

      const config = AppConfig.imageOptimization;
      const isOptimizationEnabled = config.enabled;
      const captureFormat = this.getCaptureFormat(isOptimizationEnabled);
      const rawFileExt = this.getFileExtensionForCaptureFormat(captureFormat);
      const rawMimeType = this.getMimeTypeForCaptureFormat(captureFormat);

      // Determine file extension based on optimization settings
      const fileExt = isOptimizationEnabled
        ? this.imageOptimizer.getOutputExtension()
        : rawFileExt;
      const fileName = `screenshot-${timestamp}-screen${screenIndex}${fileExt}`;
      const filePath = path.join(AppConfig.getScreenshotsPath(), fileName);
      const rawFileName = `raw-screenshot-${timestamp}-screen${screenIndex}${rawFileExt}`;
      const rawFilePath = path.join(AppConfig.getScreenshotsPath(), rawFileName);

      console.log(`📸 Capturing screen ${screenIndex} (ID: ${screenId})...`);

      let originalSize = 0;
      let rawBuffer: Buffer | null = null;

      if (process.platform === "win32") {
        await this.captureWindowsScreenToFile(screenId, rawFilePath, captureFormat);
        originalSize = fs.statSync(rawFilePath).size;
      } else {
        // Capture screenshot using screen ID (required for Windows/Linux)
        // On macOS, screenId is a number (0, 1, 2...)
        // On Windows, screenId is a string like "\\.\DISPLAY1"
        // On Linux, screenId is a string like "HDMI-1", "eDP-1"
        rawBuffer = await screenshot({ screen: screenId, format: captureFormat });
        originalSize = rawBuffer.length;
      }

      console.log(
        `📸 Screen ${screenIndex} captured, buffer size: ${this.formatBytes(originalSize)}`,
      );

      let finalFilePath = filePath;
      let finalFileName = fileName;
      let fileSize = originalSize;
      let mimeType = isOptimizationEnabled
        ? this.imageOptimizer.getMimeType()
        : rawMimeType;

      if (isOptimizationEnabled) {
        const optimizationResult =
          process.platform === "win32"
            ? await this.imageOptimizer.optimizeImage(rawFilePath, filePath)
            : await this.imageOptimizer.optimizeBuffer(rawBuffer!, filePath);

        if (optimizationResult.success) {
          finalFilePath = optimizationResult.optimizedPath;
          finalFileName = path.basename(optimizationResult.optimizedPath);
          fileSize = optimizationResult.optimizedSize;

          console.log(
            `✅ Screenshot captured & optimized: ${finalFileName} ` +
              `(${this.formatBytes(originalSize)} → ${this.formatBytes(
                fileSize,
              )}, ` +
              `${optimizationResult.compressionRatio}% saved)`,
          );
        } else {
          // Fallback: keep the raw capture in the screenshots directory
          console.warn(
            `⚠️ Optimization failed, saving original: ${optimizationResult.error}`,
          );
          if (process.platform === "win32") {
            finalFilePath = await this.moveManagedCaptureFile(rawFilePath, filePath);
          } else {
            fs.writeFileSync(filePath, rawBuffer!);
            finalFilePath = filePath;
          }
          finalFileName = path.basename(finalFilePath);
          fileSize = fs.statSync(finalFilePath).size;
          mimeType = rawMimeType;
          console.log(
            `✅ Screenshot captured (unoptimized): ${finalFileName} (${this.formatBytes(
              fileSize,
            )})`,
          );
        }
      } else {
        if (process.platform === "win32") {
          finalFilePath = await this.moveManagedCaptureFile(rawFilePath, filePath);
        } else {
          fs.writeFileSync(filePath, rawBuffer!);
          finalFilePath = filePath;
        }
        finalFileName = path.basename(finalFilePath);
        fileSize = fs.statSync(finalFilePath).size;
        console.log(
          `✅ Screenshot captured: ${finalFileName} (${this.formatBytes(fileSize)})`,
        );
      }

      // Save to database with taskLocalId and taskId (for manual tasks)
      await this.dbService.createScreenshot({
        localId,
        timeLogId,
        taskId, // For manual tasks - link to existing task ID
        taskLocalId,
        organizationId, // Organization context
        workspaceId, // Workspace context
        filePath: finalFilePath,
        fileName: finalFileName,
        fileSize,
        mimeType,
        capturedAt: formatISO(nowMs),
        screenNumber: screenIndex,
        isEncrypted: false,
        checksum: "",
        isSynced: false,
        createdAt: formatISO(nowMs),
      });
    } catch (error) {
      console.error(
        `Error capturing screen ${screenIndex} (ID: ${screenId}):`,
        error,
      );
      // Log more details for debugging
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
    }
  }

  async captureManual(): Promise<string[]> {
    const capturedFiles: string[] = [];

    try {
      const screens = await screenshot.listDisplays();
      const config = AppConfig.imageOptimization;
      const isOptimizationEnabled = config.enabled;

      console.log(
        `📸 Manual capture: ${screens.length} screen(s)... Platform: ${process.platform}`,
      );

      for (let i = 0; i < screens.length; i++) {
        const display = screens[i] as { id: string | number; name: string };
        const localId = uuidv4();
        const nowMs = Date.now();
        const timestamp = formatISO(nowMs).replace(/[:.]/g, "-");
        const captureFormat = this.getCaptureFormat(isOptimizationEnabled);
        const rawFileExt = this.getFileExtensionForCaptureFormat(captureFormat);
        const rawMimeType = this.getMimeTypeForCaptureFormat(captureFormat);

        // Determine file extension based on optimization settings
        const fileExt = isOptimizationEnabled
          ? this.imageOptimizer.getOutputExtension()
          : rawFileExt;
        const fileName = `manual-${timestamp}-screen${i}${fileExt}`;
        const filePath = path.join(AppConfig.getScreenshotsPath(), fileName);
        const rawFileName = `raw-manual-${timestamp}-screen${i}${rawFileExt}`;
        const rawFilePath = path.join(AppConfig.getScreenshotsPath(), rawFileName);

        console.log(`📸 Manual capture screen ${i} (ID: ${display.id})...`);

        let originalSize = 0;
        let rawBuffer: Buffer | null = null;

        if (process.platform === "win32") {
          await this.captureWindowsScreenToFile(
            display.id,
            rawFilePath,
            captureFormat,
          );
          originalSize = fs.statSync(rawFilePath).size;
        } else {
          rawBuffer = await screenshot({
            screen: display.id,
            format: captureFormat,
          });
          originalSize = rawBuffer.length;
        }

        console.log(
          `📸 Manual capture screen ${i} captured, buffer size: ${this.formatBytes(originalSize)}`,
        );

        let finalFilePath = filePath;
        let finalFileName = fileName;
        let fileSize = originalSize;
        let mimeType = isOptimizationEnabled
          ? this.imageOptimizer.getMimeType()
          : rawMimeType;

        if (isOptimizationEnabled) {
          const optimizationResult =
            process.platform === "win32"
              ? await this.imageOptimizer.optimizeImage(rawFilePath, filePath)
              : await this.imageOptimizer.optimizeBuffer(rawBuffer!, filePath);

          if (optimizationResult.success) {
            finalFilePath = optimizationResult.optimizedPath;
            finalFileName = path.basename(optimizationResult.optimizedPath);
            fileSize = optimizationResult.optimizedSize;

            console.log(
              `✅ Manual screenshot optimized: ${finalFileName} ` +
                `(${this.formatBytes(originalSize)} → ${this.formatBytes(
                  fileSize,
                )}, ` +
                `${optimizationResult.compressionRatio}% saved)`,
            );
          } else {
            console.warn(
              `⚠️ Manual screenshot optimization failed, saving original`,
            );
            if (process.platform === "win32") {
              finalFilePath = await this.moveManagedCaptureFile(rawFilePath, filePath);
            } else {
              fs.writeFileSync(filePath, rawBuffer!);
              finalFilePath = filePath;
            }
            finalFileName = path.basename(finalFilePath);
            fileSize = fs.statSync(finalFilePath).size;
            mimeType = rawMimeType;
          }
        } else {
          if (process.platform === "win32") {
            finalFilePath = await this.moveManagedCaptureFile(rawFilePath, filePath);
          } else {
            fs.writeFileSync(filePath, rawBuffer!);
            finalFilePath = filePath;
          }
          finalFileName = path.basename(finalFilePath);
          fileSize = fs.statSync(finalFilePath).size;
          console.log(
            `✅ Manual screenshot captured: ${finalFileName} (${this.formatBytes(
              fileSize,
            )})`,
          );
        }

        capturedFiles.push(finalFilePath);

        await this.dbService.createScreenshot({
          localId,
          filePath: finalFilePath,
          fileName: finalFileName,
          fileSize,
          mimeType,
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
      // Log more details for debugging
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
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
    daysOld: number = 30,
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
          const screenshot =
            await this.dbService.getScreenshotByFilePath(filePath);

          if (screenshot && screenshot.isSynced) {
            // Delete synced screenshot
            const deleted = await this.deleteFileWithRetries(filePath, file);
            if (deleted) {
              await this.dbService.deleteScreenshotByFilePath(filePath);
              deletedCount++;
              freedBytes += fileSize;
              console.log(`Deleted synced screenshot: ${file}`);
            }
          } else if (!screenshot) {
            // Delete orphaned files (not in database)
            const deleted = await this.deleteFileWithRetries(filePath, file);
            if (deleted) {
              deletedCount++;
              freedBytes += fileSize;
              console.log(`Deleted orphaned file: ${file}`);
            }
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
      ).toFixed(2)} MB`,
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
        formatISO(cutoffDate),
      );

    let deletedCount = 0;
    let freedBytes = 0;

    for (const screenshot of syncedScreenshots) {
      try {
        if (fs.existsSync(screenshot.filePath)) {
          const stats = fs.statSync(screenshot.filePath);
          freedBytes += stats.size;
        }

        const deleted = await this.deleteFileWithRetries(
          screenshot.filePath,
          screenshot.fileName,
        );

        if (deleted) {
          await this.dbService.deleteScreenshotByFilePath(screenshot.filePath);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Failed to delete ${screenshot.fileName}:`, error);
      }
    }

    console.log(
      `🗑️ Cleaned up ${deletedCount} synced screenshots, freed ${this.formatBytes(
        freedBytes,
      )}`,
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

  async getTempArtifactsSize(): Promise<number> {
    const tempArtifacts = this.findTempArtifacts();

    return tempArtifacts.reduce((total, artifact) => total + artifact.size, 0);
  }

  async cleanupTempArtifacts(): Promise<{
    deletedCount: number;
    clearedBytes: number;
    scannedPaths: string[];
    message?: string;
  }> {
    const tempArtifacts = this.findTempArtifacts();
    const scannedPaths = Array.from(
      new Set(tempArtifacts.map((artifact) => artifact.scannedPath)),
    );

    let deletedCount = 0;
    let clearedBytes = 0;

    for (const artifact of tempArtifacts) {
      const deleted = await deleteFileWithRetries(artifact.filePath, {
        fileLabel: path.basename(artifact.filePath),
        logPrefix: "Cleanup",
      });
      if (deleted) {
        deletedCount++;
        clearedBytes += artifact.size;
      }
    }

    if (process.platform === "win32") {
      return {
        deletedCount,
        clearedBytes,
        scannedPaths,
        message:
          "Cleaned legacy Windows screenshot temp files and screenCapture artifacts",
      };
    }

    if (process.platform === "darwin") {
      return {
        deletedCount,
        clearedBytes,
        scannedPaths,
        message:
          "Cleaned orphaned screenshot temp files left behind after interrupted captures",
      };
    }

    return {
      deletedCount: 0,
      clearedBytes: 0,
      scannedPaths,
      message: "No platform-specific screenshot temp artifacts require cleanup",
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  private findTempArtifacts(): Array<{
    filePath: string;
    size: number;
    scannedPath: string;
  }> {
    const minAgeMs = 10 * 60 * 1000;
    const tempRoot = os.tmpdir();
    const screenCaptureTempDir = path.join(tempRoot, "screenCapture");
    const artifacts: Array<{
      filePath: string;
      size: number;
      scannedPath: string;
    }> = [];

    const collectMatchingFiles = (
      targetDir: string,
      shouldCollect: (fileName: string) => boolean,
    ) => {
      if (!fs.existsSync(targetDir)) {
        return;
      }

      for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
        if (!entry.isFile() || !shouldCollect(entry.name)) {
          continue;
        }

        const entryPath = path.join(targetDir, entry.name);
        const stats = fs.statSync(entryPath);
        if (Date.now() - stats.mtimeMs < minAgeMs) {
          continue;
        }

        artifacts.push({
          filePath: entryPath,
          size: stats.size,
          scannedPath: targetDir,
        });
      }
    };

    if (process.platform === "win32") {
      const legacyTempArtifactPattern =
        /^\d{6,}-\d+-[a-z0-9]+\.(jpg|jpeg|png|bmp|tmp)$/i;
      const screenCaptureArtifactPattern = /\.(jpg|jpeg|png|bmp|tmp)$/i;
      const screenCaptureReservedPattern =
        /^(screenCapture_1\.3\.2\.bat|app\.manifest)$/i;

      collectMatchingFiles(tempRoot, (fileName) =>
        legacyTempArtifactPattern.test(fileName),
      );
      collectMatchingFiles(
        screenCaptureTempDir,
        (fileName) =>
          screenCaptureArtifactPattern.test(fileName) &&
          !screenCaptureReservedPattern.test(fileName),
      );
    }

    if (process.platform === "darwin") {
      const orphanMacCapturePattern =
        /^\d{6,}-\d+-[a-z0-9]+\.(jpg|jpeg|png|tiff|bmp|gif|pdf)$/i;

      collectMatchingFiles(tempRoot, (fileName) =>
        orphanMacCapturePattern.test(fileName),
      );
    }

    return artifacts;
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  private getCaptureFormat(isOptimizationEnabled: boolean): "jpg" | "png" {
    if (!isOptimizationEnabled) {
      return "png";
    }

    return AppConfig.imageOptimization.format === "jpeg" ? "jpg" : "png";
  }

  private getFileExtensionForCaptureFormat(format: "jpg" | "png"): ".jpg" | ".png" {
    return format === "jpg" ? ".jpg" : ".png";
  }

  private getMimeTypeForCaptureFormat(format: "jpg" | "png"): string {
    return format === "jpg" ? "image/jpeg" : "image/png";
  }

  private async moveManagedCaptureFile(
    sourcePath: string,
    preferredPath: string,
  ): Promise<string> {
    const targetPath = preferredPath.replace(
      /\.(png|jpg|jpeg|webp)$/i,
      path.extname(sourcePath),
    );
    return moveFileWithRetries(sourcePath, targetPath, {
      fileLabel: path.basename(sourcePath),
      logPrefix: "Move",
    });
  }

  private async deleteFileWithRetries(
    filePath: string,
    fileLabel: string,
  ): Promise<boolean> {
    return deleteFileWithRetries(filePath, {
      fileLabel,
      logPrefix: "Delete",
    });
  }

  private async captureWindowsScreenToFile(
    screenId: string | number,
    outputPath: string,
    format: "jpg" | "png",
  ): Promise<void> {
    const scriptPath = this.ensureWindowsCaptureScript();
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      const args = ["/c", scriptPath, outputPath];
      if (screenId !== undefined && screenId !== null && String(screenId).length > 0) {
        args.push("/d", String(screenId));
      }

      execFile(
        "cmd.exe",
        args,
        {
          cwd: path.dirname(scriptPath),
          windowsHide: true,
        },
        (error) => {
          if (error) {
            return reject(error);
          }

          if (!fs.existsSync(outputPath)) {
            return reject(
              new Error(`Windows screenshot capture did not create ${outputPath}`),
            );
          }

          const actualExt = path.extname(outputPath).toLowerCase();
          const expectedExt = this.getFileExtensionForCaptureFormat(format);
          if (actualExt !== expectedExt) {
            return reject(
              new Error(
                `Windows screenshot capture created unexpected format: ${actualExt} (expected ${expectedExt})`,
              ),
            );
          }

          resolve();
        },
      );
    });
  }

  private ensureWindowsCaptureScript(): string {
    const tempCaptureDir = path.join(os.tmpdir(), "screenCapture");
    const tempBat = path.join(tempCaptureDir, "screenCapture_1.3.2.bat");
    const tempManifest = path.join(tempCaptureDir, "app.manifest");

    if (!fs.existsSync(tempCaptureDir)) {
      fs.mkdirSync(tempCaptureDir, { recursive: true });
    }

    if (!fs.existsSync(tempBat) || !fs.existsSync(tempManifest)) {
      const win32Entry = require.resolve("screenshot-desktop/lib/win32/index.js");
      const win32Dir = path.dirname(win32Entry).replace(
        "app.asar",
        "app.asar.unpacked",
      );
      const sourceBat = path.join(win32Dir, "screenCapture_1.3.2.bat");
      const sourceManifest = path.join(win32Dir, "app.manifest");

      fs.copyFileSync(sourceBat, tempBat);
      fs.copyFileSync(sourceManifest, tempManifest);
    }

    return tempBat;
  }
}
