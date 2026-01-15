import { app, BrowserWindow, dialog, shell } from "electron";
import log from "electron-log";
import { autoUpdater, UpdateInfo } from "electron-updater";
import fs from "fs";
import path from "path";

// Route autoUpdater logs to electron-log
autoUpdater.logger = log;
log.transports.file.level = "info";

// ============================================================
// LOCAL TESTING MODE - Set to true to test with local server
// Make sure to run: http-server ~/update-server -p 8081 --cors
// IMPORTANT: Set to false before production release!
// ============================================================
const USE_LOCAL_UPDATE_SERVER = false; // ← Change to false for production
const LOCAL_UPDATE_SERVER_URL = "http://localhost:8081";

export type UpdateEvent =
  | { type: "checking-for-update" }
  | { type: "update-available"; info: UpdateInfo }
  | { type: "update-not-available" }
  | { type: "error"; error: string }
  | { type: "download-progress"; progress: any }
  | { type: "update-downloaded"; info: UpdateInfo };

export class UpdateService {
  private mainWindow: BrowserWindow | null = null;
  private downloadedUpdateInfo: UpdateInfo | null = null;
  private downloadedFilePath: string | null = null;

  constructor(mainWindow?: BrowserWindow | null) {
    if (mainWindow) this.setWindow(mainWindow);
    // Ensure logger is initialized for auto-updater
    log.info("UpdateService initialized");
    this.setupAutoUpdater();
  }

  setWindow(win: BrowserWindow | null) {
    this.mainWindow = win;
  }

  private sendEvent(event: UpdateEvent) {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("update-event", event);
      }
    } catch (e) {
      console.error("Failed to send update event to renderer:", e);
    }
  }

  private setupAutoUpdater() {
    // Configure logging and options as needed
    autoUpdater.autoDownload = false; // No automatic download; user decides
    autoUpdater.autoInstallOnAppQuit = true; // Install on quit

    // Override update server for local testing
    console.log(USE_LOCAL_UPDATE_SERVER);
    if (USE_LOCAL_UPDATE_SERVER) {
      log.info(`Using local update server: ${LOCAL_UPDATE_SERVER_URL}`);
      autoUpdater.setFeedURL({
        provider: "generic",
        url: LOCAL_UPDATE_SERVER_URL,
      });
    }

    autoUpdater.on("checking-for-update", () => {
      this.sendEvent({ type: "checking-for-update" });
    });

    autoUpdater.on("update-available", (info) => {
      this.sendEvent({ type: "update-available", info });
    });

    autoUpdater.on("update-not-available", () => {
      this.sendEvent({ type: "update-not-available" });
    });

    autoUpdater.on("error", (err: any) => {
      log.error("AutoUpdater error:", err);
      console.error("AutoUpdater error:", err);
      this.sendEvent({
        type: "error",
        error: (err && err.stack) || String(err),
      });
    });

    autoUpdater.on("download-progress", (progressObj) => {
      log.info(`Download progress: ${progressObj.percent?.toFixed(1)}%`);
      console.log(`Download progress: ${progressObj.percent?.toFixed(1)}%`);
      this.sendEvent({ type: "download-progress", progress: progressObj });
    });

    autoUpdater.on("update-downloaded", (info) => {
      this.downloadedUpdateInfo = info;
      this.sendEvent({ type: "update-downloaded", info });
      log.info(`Update downloaded: v${info.version}`);

      // Copy downloaded file to Downloads folder for manual install
      this.copyUpdateToDownloads(info);
    });
  }

  /**
   * Copy the downloaded update file to the Downloads folder
   * This makes it easier for users to find and install manually
   */
  private async copyUpdateToDownloads(info: UpdateInfo) {
    try {
      const downloadsPath = app.getPath("downloads");
      const appName = app.getName().replace(/\s+/g, "-");
      const version = info.version;

      // Determine the file extension based on platform
      let fileName: string;
      switch (process.platform) {
        case "darwin":
          fileName = `${appName}-${version}.dmg`;
          break;
        case "win32":
          fileName = `${appName}-Setup-${version}.exe`;
          break;
        default: // linux
          fileName = `${appName}-${version}.AppImage`;
      }

      const destPath = path.join(downloadsPath, fileName);

      // Get the cached update file path from electron-updater
      // The file is stored in app.getPath('userData')/pending or similar
      const cachePath = path.join(app.getPath("userData"), "pending");

      log.info(`Looking for update files in: ${cachePath}`);
      log.info(`Will copy to: ${destPath}`);

      // Check if cache directory exists
      if (fs.existsSync(cachePath)) {
        const files = fs.readdirSync(cachePath);
        log.info(`Found files in pending: ${files.join(", ")}`);

        // Find the update file
        const updateFile = files.find(
          (f) =>
            f.endsWith(".dmg") ||
            f.endsWith(".zip") ||
            f.endsWith(".exe") ||
            f.endsWith(".AppImage")
        );

        if (updateFile) {
          const srcPath = path.join(cachePath, updateFile);
          const actualDestPath = path.join(downloadsPath, updateFile);

          // Copy file to Downloads
          fs.copyFileSync(srcPath, actualDestPath);
          this.downloadedFilePath = actualDestPath;
          log.info(`Update file copied to: ${actualDestPath}`);
        }
      } else {
        log.info("Pending folder not found, checking alternative paths...");

        // Alternative: check app-update.yml location
        const altCachePath = path.dirname(
          (autoUpdater as any).downloadedUpdateHelper?.cacheDir || ""
        );
        log.info(`Alternative cache path: ${altCachePath}`);
      }

      // Store the expected path even if copy failed
      if (!this.downloadedFilePath) {
        this.downloadedFilePath = destPath;
      }
    } catch (err) {
      log.error("Failed to copy update to Downloads:", err);
    }
  }

  async checkForUpdates() {
    try {
      // Skip in development mode unless using local server
      if (process.env.NODE_ENV === "development" && !USE_LOCAL_UPDATE_SERVER) {
        this.sendEvent({ type: "update-not-available" });
        return { success: false, error: "Development mode" };
      }

      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err: any) {
      console.error("Check for updates failed:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  async downloadUpdate() {
    try {
      log.info("Starting download update...");
      console.log("Starting download update...");

      // This will start download and emit progress events
      await autoUpdater.downloadUpdate();

      log.info("Download completed");
      return { success: true };
    } catch (err: any) {
      console.error("Download update failed:", err);
      log.error("Download update failed:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  async installAndRestart() {
    log.info("=== installAndRestart called ===");
    console.log("=== installAndRestart called ===");

    const isMac = process.platform === "darwin";
    const version = this.downloadedUpdateInfo?.version || "new version";

    try {
      if (isMac) {
        // On macOS, try quitAndInstall first
        try {
          log.info("Attempting quitAndInstall on macOS...");
          autoUpdater.quitAndInstall(false, true);
          return { success: true };
        } catch (e: any) {
          // If quitAndInstall fails (app not code-signed), show manual install dialog
          log.warn("quitAndInstall failed on macOS:", e.message);

          return await this.showMacManualInstallDialog(version);
        }
      } else {
        // On Windows/Linux, quitAndInstall should work
        setTimeout(() => {
          autoUpdater.quitAndInstall(false, true);
        }, 500);
        return { success: true };
      }
    } catch (err: any) {
      log.error("Install update failed:", err);
      console.error("Install update failed:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  private async showMacManualInstallDialog(
    version: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return { success: false, error: "Main window not available" };
    }

    const downloadPath = app.getPath("downloads");
    const filePath = this.downloadedFilePath || downloadPath;
    const fileName = this.downloadedFilePath
      ? path.basename(this.downloadedFilePath)
      : `${app.getName()}-${version}.dmg`;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Manual Installation Required",
      message: `Version ${version} has been downloaded`,
      detail:
        "Auto-install is not available because the app is not code-signed.\n\n" +
        `Downloaded file: ${fileName}\n` +
        `Location: ${downloadPath}\n\n` +
        "To install the update:\n" +
        "1. Click 'Show File' to reveal the installer\n" +
        "2. Double-click the file to open it\n" +
        "3. Drag the app to Applications folder\n" +
        "4. Replace the existing app when prompted",
      buttons: ["Show File", "Open Downloads Folder", "Later"],
      defaultId: 0,
      cancelId: 2,
    });

    if (result.response === 0 && this.downloadedFilePath) {
      // Show the specific file in Finder/Explorer
      shell.showItemInFolder(this.downloadedFilePath);
    } else if (result.response === 1) {
      // Open the Downloads folder
      shell.openPath(downloadPath);
    }

    return {
      success: false,
      error: "Manual installation required on macOS (app not code-signed)",
    };
  }

  // Convenience: check and notify in background (but won't auto-download)
  async checkForUpdatesAndNotify() {
    return await this.checkForUpdates();
  }
}
