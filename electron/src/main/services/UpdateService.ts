import { BrowserWindow, dialog } from "electron";
import log from "electron-log";
import { autoUpdater, UpdateInfo } from "electron-updater";

// Route autoUpdater logs to electron-log
autoUpdater.logger = log;
log.transports.file.level = "info";

export type UpdateEvent =
  | { type: "checking-for-update" }
  | { type: "update-available"; info: UpdateInfo }
  | { type: "update-not-available" }
  | { type: "error"; error: string }
  | { type: "download-progress"; progress: any }
  | { type: "update-downloaded"; info: UpdateInfo };

export class UpdateService {
  private mainWindow: BrowserWindow | null = null;

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
      this.sendEvent({
        type: "error",
        error: (err && err.stack) || String(err),
      });
    });

    autoUpdater.on("download-progress", (progressObj) => {
      this.sendEvent({ type: "download-progress", progress: progressObj });
    });

    autoUpdater.on("update-downloaded", (info) => {
      this.sendEvent({ type: "update-downloaded", info });

      // Prompt user to install now
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        dialog
          .showMessageBox(this.mainWindow, {
            type: "info",
            buttons: ["Install and Restart", "Later"],
            defaultId: 0,
            cancelId: 1,
            title: "Update ready",
            message: `A new version ${info.version} has been downloaded. Install now?`,
          })
          .then((result) => {
            if (result.response === 0) {
              // Install now
              autoUpdater.quitAndInstall();
            }
          })
          .catch((e) => {
            console.error("Failed to show install dialog:", e);
          });
      }
    });
  }

  async checkForUpdates() {
    try {
      if (process.env.NODE_ENV === "development") {
        // Avoid calling remote update servers in dev
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
      // This will start download and emit progress events
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: any) {
      console.error("Download update failed:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  async installAndRestart() {
    try {
      // quitAndInstall will restart the app
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (err: any) {
      console.error("Install update failed:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Convenience: check and notify in background (but won't auto-download)
  async checkForUpdatesAndNotify() {
    return await this.checkForUpdates();
  }
}
