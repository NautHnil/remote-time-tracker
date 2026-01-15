/**
 * BackendUpdateService - Auto-update service that proxies through backend
 *
 * Flow:
 * 1. App authenticates with backend → receives JWT
 * 2. App calls backend /api/v1/updates/check with JWT
 * 3. Backend authenticates with GitHub API (private repo)
 * 4. Backend returns update metadata + proxied download URLs
 * 5. App downloads through backend (which adds GitHub auth)
 */

import { app, BrowserWindow, dialog, shell } from "electron";
import log from "electron-log";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import { AppConfig } from "../config";

// Configure logging
log.transports.file.level = "info";

export interface UpdateCheckResponse {
  update_available: boolean;
  latest_version?: string;
  release_date?: string;
  release_notes?: string;
  is_mandatory?: boolean;
  files?: ReleaseAsset[];
}

export interface ReleaseAsset {
  name: string;
  url: string; // Backend proxy URL
  size: number;
  content_type: string;
  sha512?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export type BackendUpdateEvent =
  | { type: "checking-for-update" }
  | { type: "update-available"; info: UpdateCheckResponse }
  | { type: "update-not-available" }
  | { type: "error"; error: string }
  | { type: "download-progress"; progress: DownloadProgress }
  | { type: "update-downloaded"; info: UpdateCheckResponse; filePath: string };

export class BackendUpdateService {
  private mainWindow: BrowserWindow | null = null;
  private downloadedUpdateInfo: UpdateCheckResponse | null = null;
  private downloadedFilePath: string | null = null;
  private isDownloading = false;

  constructor(mainWindow?: BrowserWindow | null) {
    if (mainWindow) this.setWindow(mainWindow);
    log.info("BackendUpdateService initialized");
  }

  setWindow(win: BrowserWindow | null) {
    this.mainWindow = win;
  }

  private sendEvent(event: BackendUpdateEvent) {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("update-event", event);
      }
    } catch (e) {
      log.error("Failed to send update event to renderer:", e);
    }
  }

  /**
   * Get the current platform identifier
   */
  private getPlatform(): string {
    return process.platform; // darwin, win32, linux
  }

  /**
   * Get the current architecture
   */
  private getArch(): string {
    return process.arch; // x64, arm64, ia32
  }

  /**
   * Get JWT token from stored credentials
   */
  private getAuthToken(): string | null {
    const credentials = AppConfig.getCredentials();
    return credentials?.accessToken || null;
  }

  /**
   * Make authenticated request to backend
   */
  private async makeBackendRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST";
      body?: any;
    } = {}
  ): Promise<T> {
    const { method = "GET", body } = options;
    const token = this.getAuthToken();

    if (!token) {
      throw new Error("Not authenticated. Please login first.");
    }

    const apiUrl = AppConfig.apiUrl;
    const url = `${apiUrl}${endpoint}`;

    log.info(`Making backend request: ${method} ${url}`);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === "https:";
      const httpModule = isHttps ? https : http;

      const reqOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };

      const req = httpModule.request(reqOptions, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          log.info(`Backend response: ${res.statusCode}`);

          if (res.statusCode === 401) {
            reject(new Error("Authentication expired. Please login again."));
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Backend error: ${res.statusCode} - ${data}`));
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.success === false) {
              reject(new Error(json.message || "Backend request failed"));
              return;
            }
            resolve(json.data as T);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on("error", (e) => {
        log.error("Backend request error:", e);
        reject(e);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Check for updates via backend proxy
   */
  async checkForUpdates(): Promise<{
    success: boolean;
    updateAvailable?: boolean;
    info?: UpdateCheckResponse;
    error?: string;
  }> {
    try {
      // Skip in development unless testing
      if (
        process.env.NODE_ENV === "development" &&
        process.env.TEST_UPDATES !== "true"
      ) {
        log.info("Skipping update check in development mode");
        this.sendEvent({ type: "update-not-available" });
        return { success: true, updateAvailable: false };
      }

      this.sendEvent({ type: "checking-for-update" });

      const currentVersion = app.getVersion();
      const platform = this.getPlatform();
      const arch = this.getArch();

      log.info(
        `Checking for updates: v${currentVersion} on ${platform}/${arch}`
      );

      const response = await this.makeBackendRequest<UpdateCheckResponse>(
        "/updates/check",
        {
          method: "POST",
          body: {
            current_version: currentVersion,
            platform,
            arch,
          },
        }
      );

      log.info("Update check response:", JSON.stringify(response, null, 2));

      if (response.update_available) {
        this.sendEvent({ type: "update-available", info: response });
        return { success: true, updateAvailable: true, info: response };
      } else {
        this.sendEvent({ type: "update-not-available" });
        return { success: true, updateAvailable: false, info: response };
      }
    } catch (error: any) {
      log.error("Update check failed:", error);
      const errorMsg = error?.message || String(error);
      this.sendEvent({ type: "error", error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Download update file through backend proxy
   */
  async downloadUpdate(
    updateInfo?: UpdateCheckResponse
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (this.isDownloading) {
        return { success: false, error: "Download already in progress" };
      }

      this.isDownloading = true;

      // Get update info if not provided
      const info = updateInfo || this.downloadedUpdateInfo;
      if (!info || !info.files || info.files.length === 0) {
        // Fetch latest update info
        const checkResult = await this.checkForUpdates();
        if (!checkResult.updateAvailable || !checkResult.info?.files?.length) {
          this.isDownloading = false;
          return { success: false, error: "No update available to download" };
        }
        this.downloadedUpdateInfo = checkResult.info;
      }

      const updateData = this.downloadedUpdateInfo!;
      const files = updateData.files!;

      // Find the appropriate installer for this platform
      const platform = this.getPlatform();
      const arch = this.getArch();

      let targetFile: ReleaseAsset | undefined;

      if (platform === "darwin") {
        // Prefer DMG for Mac
        targetFile = files.find(
          (f) =>
            f.name.endsWith(".dmg") &&
            (arch === "arm64"
              ? f.name.includes("arm64")
              : !f.name.includes("arm64"))
        );
        // Fallback to zip
        if (!targetFile) {
          targetFile = files.find(
            (f) =>
              f.name.endsWith(".zip") &&
              (arch === "arm64"
                ? f.name.includes("arm64")
                : !f.name.includes("arm64"))
          );
        }
      } else if (platform === "win32") {
        targetFile = files.find(
          (f) => f.name.endsWith(".exe") && !f.name.endsWith(".blockmap")
        );
      } else {
        // Linux
        targetFile = files.find((f) => f.name.endsWith(".AppImage"));
      }

      if (!targetFile) {
        this.isDownloading = false;
        return {
          success: false,
          error: "No installer found for your platform",
        };
      }

      log.info(`Downloading update file: ${targetFile.name}`);

      // Download to temp directory
      const downloadPath = app.getPath("downloads");
      const filePath = path.join(downloadPath, targetFile.name);

      await this.downloadFile(targetFile, filePath);

      this.downloadedFilePath = filePath;
      this.isDownloading = false;

      this.sendEvent({
        type: "update-downloaded",
        info: updateData,
        filePath,
      });

      log.info(`Update downloaded to: ${filePath}`);
      return { success: true, filePath };
    } catch (error: any) {
      this.isDownloading = false;
      log.error("Download failed:", error);
      const errorMsg = error?.message || String(error);
      this.sendEvent({ type: "error", error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Download a file from backend proxy with progress reporting
   */
  private downloadFile(asset: ReleaseAsset, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = this.getAuthToken();
      if (!token) {
        reject(new Error("Not authenticated"));
        return;
      }

      const apiUrl = AppConfig.apiUrl;
      // The asset.url is relative like /api/v1/updates/download/1.0.1/file.dmg
      // We need to build the full URL
      const fullUrl = asset.url.startsWith("http")
        ? asset.url
        : `${apiUrl.replace("/api/v1", "")}${asset.url}`;

      log.info(`Downloading from: ${fullUrl}`);

      const urlObj = new URL(fullUrl);
      const isHttps = urlObj.protocol === "https:";
      const httpModule = isHttps ? https : http;

      const reqOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const file = fs.createWriteStream(destPath);
      let downloadedBytes = 0;
      const totalBytes = asset.size;
      let lastReportTime = Date.now();
      let lastReportBytes = 0;

      const req = httpModule.request(reqOptions, (res) => {
        // Handle redirects
        if (res.statusCode === 302 || res.statusCode === 301) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            log.info(`Following redirect to: ${redirectUrl}`);
            // Download from redirect URL (GitHub's actual file server)
            this.downloadFromUrl(redirectUrl, destPath, totalBytes)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;

          const now = Date.now();
          const timeDiff = (now - lastReportTime) / 1000;

          if (timeDiff >= 0.5) {
            // Report every 500ms
            const bytesPerSecond =
              (downloadedBytes - lastReportBytes) / timeDiff;
            const percent =
              totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

            this.sendEvent({
              type: "download-progress",
              progress: {
                percent,
                transferred: downloadedBytes,
                total: totalBytes,
                bytesPerSecond,
              },
            });

            lastReportTime = now;
            lastReportBytes = downloadedBytes;
          }
        });

        res.pipe(file);

        file.on("finish", () => {
          file.close();
          log.info(`Download complete: ${destPath}`);
          resolve();
        });
      });

      req.on("error", (e) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(e);
      });

      req.end();
    });
  }

  /**
   * Download from a direct URL (e.g., after redirect)
   */
  private downloadFromUrl(
    url: string,
    destPath: string,
    totalBytes: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === "https:";
      const httpModule = isHttps ? https : http;

      const file = fs.createWriteStream(destPath);
      let downloadedBytes = 0;
      let lastReportTime = Date.now();
      let lastReportBytes = 0;

      const req = httpModule.get(url, (res) => {
        // Update total bytes from response if available
        const contentLength = res.headers["content-length"];
        if (contentLength) {
          totalBytes = parseInt(contentLength, 10);
        }

        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;

          const now = Date.now();
          const timeDiff = (now - lastReportTime) / 1000;

          if (timeDiff >= 0.5) {
            const bytesPerSecond =
              (downloadedBytes - lastReportBytes) / timeDiff;
            const percent =
              totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

            this.sendEvent({
              type: "download-progress",
              progress: {
                percent,
                transferred: downloadedBytes,
                total: totalBytes,
                bytesPerSecond,
              },
            });

            lastReportTime = now;
            lastReportBytes = downloadedBytes;
          }
        });

        res.pipe(file);

        file.on("finish", () => {
          file.close();
          log.info(`Download complete: ${destPath}`);
          resolve();
        });
      });

      req.on("error", (e) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(e);
      });
    });
  }

  /**
   * Install the downloaded update
   */
  async installAndRestart(): Promise<{ success: boolean; error?: string }> {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      return { success: false, error: "No downloaded update found" };
    }

    const platform = this.getPlatform();
    const filePath = this.downloadedFilePath;

    log.info(`Installing update from: ${filePath}`);

    try {
      if (platform === "darwin") {
        // On macOS, open the DMG and show instructions
        await shell.openPath(filePath);

        await dialog.showMessageBox({
          type: "info",
          title: "Install Update",
          message: "Update Downloaded Successfully",
          detail:
            "The update installer has been opened.\n\n" +
            "Please follow these steps:\n" +
            "1. Drag the app to your Applications folder\n" +
            "2. Replace the existing app when prompted\n" +
            "3. Restart the application",
          buttons: ["OK"],
        });

        return { success: true };
      } else if (platform === "win32") {
        // On Windows, run the installer
        shell.openPath(filePath);
        // Quit the app to allow installation
        setTimeout(() => app.quit(), 1000);
        return { success: true };
      } else {
        // On Linux, make AppImage executable and run
        fs.chmodSync(filePath, "755");
        shell.openPath(filePath);
        setTimeout(() => app.quit(), 1000);
        return { success: true };
      }
    } catch (error: any) {
      log.error("Install failed:", error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Open the downloads folder
   */
  async openDownloadsFolder(): Promise<void> {
    const downloadsPath = app.getPath("downloads");
    await shell.openPath(downloadsPath);
  }

  /**
   * Get information about downloaded update
   */
  getDownloadedUpdateInfo(): {
    info: UpdateCheckResponse | null;
    filePath: string | null;
  } {
    return {
      info: this.downloadedUpdateInfo,
      filePath: this.downloadedFilePath,
    };
  }
}
