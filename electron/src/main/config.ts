import dotenv from "dotenv";
import { app } from "electron";
import Store from "electron-store";
import path from "path";

// Load .env file from project root
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, "../../.env");

dotenv.config({ path: envPath });

interface Credentials {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  organizationId?: number; // Current selected organization
  workspaceId?: number; // Current selected workspace
}

// Image optimization settings
export interface ImageOptimizationConfig {
  enabled: boolean;
  format: "jpeg" | "webp" | "png";
  quality: number; // 1-100
  maxWidth: number;
  maxHeight: number;
}

interface Config {
  apiUrl: string;
  websiteDomain: string;
  inviteWebsiteDomain: string;
  screenshotInterval: number;
  syncInterval: number;
  presenceHeartbeatInterval: number;
  credentials?: Credentials;
  deviceUUID?: string;
  imageOptimization: ImageOptimizationConfig;
  customScreenshotPath?: string; // Custom path for screenshots, if set
}

class AppConfigClass {
  private store: Store<Config>;

  constructor() {
    this.store = new Store<Config>({
      defaults: {
        apiUrl: process.env.VITE_API_URL || "",
        websiteDomain: process.env.VITE_WEBSITE_DOMAIN || "",
        inviteWebsiteDomain: process.env.VITE_INVITE_WEBSITE_DOMAIN || "",
        screenshotInterval: parseInt(
          process.env.VITE_SCREENSHOT_INTERVAL || "300000",
        ), // 5 minutes
        syncInterval: parseInt(process.env.VITE_SYNC_INTERVAL || "60000"), // 1 minute
        presenceHeartbeatInterval: parseInt(
          process.env.VITE_PRESENCE_HEARTBEAT_INTERVAL || "15000",
        ), // 15 seconds
        imageOptimization: {
          enabled: true,
          format: "jpeg",
          quality: 75, // Good balance between quality and size
          maxWidth: 1920, // Full HD
          maxHeight: 1080,
        },
      },
    });
  }

  get apiUrl(): string {
    return this.store.get("apiUrl");
  }

  get websiteDomain(): string {
    return this.store.get("websiteDomain");
  }

  get inviteWebsiteDomain(): string {
    return this.store.get("inviteWebsiteDomain");
  }

  get screenshotInterval(): number {
    return this.store.get("screenshotInterval");
  }

  get syncInterval(): number {
    return this.store.get("syncInterval");
  }

  get presenceHeartbeatInterval(): number {
    return this.store.get("presenceHeartbeatInterval");
  }

  getCredentials(): Credentials | undefined {
    return this.store.get("credentials");
  }

  setCredentials(credentials: Credentials): void {
    this.store.set("credentials", credentials);
  }

  clearCredentials(): void {
    this.store.delete("credentials");
  }

  get(key: keyof Config): any {
    return this.store.get(key);
  }

  set(key: keyof Config, value: any): void {
    this.store.set(key, value);
  }

  getAll(): Config {
    return this.store.store;
  }

  getAppDataPath(): string {
    return app.getPath("userData");
  }

  getScreenshotsPath(): string {
    const customPath = this.store.get("customScreenshotPath");
    if (customPath) {
      return customPath;
    }
    return this.getDefaultScreenshotsPath();
  }

  getDefaultScreenshotsPath(): string {
    return path.join(this.getAppDataPath(), "screenshots");
  }

  setScreenshotsPath(customPath: string | null): void {
    if (customPath) {
      this.store.set("customScreenshotPath", customPath);
    } else {
      this.store.delete("customScreenshotPath");
    }
  }

  isUsingCustomScreenshotsPath(): boolean {
    return !!this.store.get("customScreenshotPath");
  }

  getDatabasePath(): string {
    return path.join(this.getAppDataPath(), "database.sqlite");
  }

  // Image optimization configuration
  get imageOptimization(): ImageOptimizationConfig {
    return this.store.get("imageOptimization");
  }

  setImageOptimization(config: Partial<ImageOptimizationConfig>): void {
    const current = this.imageOptimization;
    this.store.set("imageOptimization", { ...current, ...config });
  }

  // Clear all stored data
  clearAll(): void {
    this.store.clear();
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.store.clear();
    this.store.set("imageOptimization", {
      enabled: true,
      format: "jpeg",
      quality: 75,
      maxWidth: 1920,
      maxHeight: 1080,
    });
  }
}

export const AppConfig = new AppConfigClass();
