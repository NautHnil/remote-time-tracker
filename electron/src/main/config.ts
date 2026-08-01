import { app } from "electron";
import Store from "electron-store";
import path from "path";
import { ENV } from "./env";

export const SCREENSHOT_INTERVAL_MIN = 60 * 1000;
export const SCREENSHOT_INTERVAL_MAX = 15 * 60 * 1000;
export const SCREENSHOT_INTERVAL_DEFAULT = 5 * 60 * 1000;

export const SYNC_INTERVAL_MIN = 5 * 1000;
export const SYNC_INTERVAL_MAX = 30 * 60 * 1000;
export const SYNC_INTERVAL_DEFAULT = 60 * 1000;
const MS_PER_SECOND = 1000;

const SCREENSHOT_INTERVAL_MIN_SECONDS = SCREENSHOT_INTERVAL_MIN / MS_PER_SECOND;
const SCREENSHOT_INTERVAL_MAX_SECONDS = SCREENSHOT_INTERVAL_MAX / MS_PER_SECOND;
const SCREENSHOT_INTERVAL_DEFAULT_SECONDS =
  SCREENSHOT_INTERVAL_DEFAULT / MS_PER_SECOND;

const SYNC_INTERVAL_MIN_SECONDS = SYNC_INTERVAL_MIN / MS_PER_SECOND;
const SYNC_INTERVAL_MAX_SECONDS = SYNC_INTERVAL_MAX / MS_PER_SECOND;
const SYNC_INTERVAL_DEFAULT_SECONDS = SYNC_INTERVAL_DEFAULT / MS_PER_SECOND;

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
  systemLogRetentionDays: number;
  presenceHeartbeatInterval: number;
  launchAtLogin: boolean;
  credentials?: Credentials;
  deviceUUID?: string;
  imageOptimization: ImageOptimizationConfig;
  customScreenshotPath?: string; // Custom path for screenshots, if set
}

interface RendererConfig extends Config {
  screenshotIntervalMs: number;
  syncIntervalMs: number;
}

class AppConfigClass {
  private store: Store<Config>;

  constructor() {
    this.store = new Store<Config>({
      defaults: {
        apiUrl: ENV.VITE_API_URL || "",
        websiteDomain: ENV.VITE_WEBSITE_DOMAIN || "",
        inviteWebsiteDomain: ENV.VITE_INVITE_WEBSITE_DOMAIN || "",
        screenshotInterval: this.normalizeIntervalValue(
          ENV.VITE_SCREENSHOT_INTERVAL,
          SCREENSHOT_INTERVAL_DEFAULT_SECONDS,
          SCREENSHOT_INTERVAL_MIN_SECONDS,
          SCREENSHOT_INTERVAL_MAX_SECONDS,
        ),
        syncInterval: this.normalizeIntervalValue(
          ENV.VITE_SYNC_INTERVAL,
          SYNC_INTERVAL_DEFAULT_SECONDS,
          SYNC_INTERVAL_MIN_SECONDS,
          SYNC_INTERVAL_MAX_SECONDS,
        ),
        systemLogRetentionDays: parseInt(
          ENV.VITE_SYSTEM_LOG_RETENTION_DAYS || "30",
        ),
        presenceHeartbeatInterval: parseInt(
          ENV.VITE_PRESENCE_HEARTBEAT_INTERVAL || "15000",
        ), // 15 seconds
        launchAtLogin: false,
        imageOptimization: {
          enabled: true,
          format: "jpeg",
          quality: 75, // Good balance between quality and size
          maxWidth: 1920, // Full HD
          maxHeight: 1080,
        },
      },
    });

    this.normalizeIntervals();
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
    return this.store.get("screenshotInterval") * MS_PER_SECOND;
  }

  get syncInterval(): number {
    return this.store.get("syncInterval") * MS_PER_SECOND;
  }

  get presenceHeartbeatInterval(): number {
    return this.store.get("presenceHeartbeatInterval");
  }

  get systemLogRetentionDays(): number {
    return this.store.get("systemLogRetentionDays");
  }

  get launchAtLogin(): boolean {
    return this.getLaunchAtLogin();
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
    if (key === "launchAtLogin") {
      this.setLaunchAtLogin(Boolean(value));
      return;
    }

    this.store.set(key, this.sanitizeConfigValue(key, value));
  }

  getAll(): Config {
    return this.store.store;
  }

  getRendererConfig(): RendererConfig {
    const config = this.store.store;
    return {
      ...config,
      launchAtLogin: this.getLaunchAtLogin(),
      screenshotIntervalMs: config.screenshotInterval * MS_PER_SECOND,
      syncIntervalMs: config.syncInterval * MS_PER_SECOND,
    };
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
    this.store.set("screenshotInterval", SCREENSHOT_INTERVAL_DEFAULT_SECONDS);
    this.store.set("syncInterval", SYNC_INTERVAL_DEFAULT_SECONDS);
    this.setLaunchAtLogin(false);
    this.store.set("imageOptimization", {
      enabled: true,
      format: "jpeg",
      quality: 75,
      maxWidth: 1920,
      maxHeight: 1080,
    });
  }

  private sanitizeConfigValue(key: keyof Config, value: any): any {
    if (key === "screenshotInterval") {
      return this.normalizeIntervalValue(
        value,
        SCREENSHOT_INTERVAL_DEFAULT_SECONDS,
        SCREENSHOT_INTERVAL_MIN_SECONDS,
        SCREENSHOT_INTERVAL_MAX_SECONDS,
      );
    }

    if (key === "syncInterval") {
      return this.normalizeIntervalValue(
        value,
        SYNC_INTERVAL_DEFAULT_SECONDS,
        SYNC_INTERVAL_MIN_SECONDS,
        SYNC_INTERVAL_MAX_SECONDS,
      );
    }

    return value;
  }

  private getLaunchAtLogin(): boolean {
    if (!app.isReady()) {
      return this.store.get("launchAtLogin");
    }

    const settings = app.getLoginItemSettings();
    const openAtLogin = Boolean(settings.openAtLogin);

    if (openAtLogin !== this.store.get("launchAtLogin")) {
      this.store.set("launchAtLogin", openAtLogin);
    }

    return openAtLogin;
  }

  private setLaunchAtLogin(enabled: boolean): void {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    });
    this.store.set("launchAtLogin", enabled);
  }

  private normalizeIntervals(): void {
    const screenshotInterval = this.normalizeIntervalValue(
      this.store.get("screenshotInterval"),
      SCREENSHOT_INTERVAL_DEFAULT_SECONDS,
      SCREENSHOT_INTERVAL_MIN_SECONDS,
      SCREENSHOT_INTERVAL_MAX_SECONDS,
    );
    const syncInterval = this.normalizeIntervalValue(
      this.store.get("syncInterval"),
      SYNC_INTERVAL_DEFAULT_SECONDS,
      SYNC_INTERVAL_MIN_SECONDS,
      SYNC_INTERVAL_MAX_SECONDS,
    );

    this.store.set("screenshotInterval", screenshotInterval);
    this.store.set("syncInterval", syncInterval);
  }

  private normalizeIntervalValue(
    value: unknown,
    fallbackSeconds: number,
    minSeconds: number,
    maxSeconds: number,
  ): number {
    const parsed =
      typeof value === "number" ? value : parseInt(String(value ?? ""), 10);

    if (!Number.isFinite(parsed)) {
      return fallbackSeconds;
    }

    // Previous versions stored interval in milliseconds.
    // Any value above the allowed seconds range is treated as a legacy ms value.
    const normalizedSeconds =
      parsed > maxSeconds ? Math.round(parsed / MS_PER_SECOND) : parsed;

    return Math.min(Math.max(normalizedSeconds, minSeconds), maxSeconds);
  }
}

export const AppConfig = new AppConfigClass();
