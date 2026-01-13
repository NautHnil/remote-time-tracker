import { app } from "electron";
import Store from "electron-store";
import path from "path";

interface Credentials {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
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
  screenshotInterval: number;
  syncInterval: number;
  credentials?: Credentials;
  deviceUUID?: string;
  imageOptimization: ImageOptimizationConfig;
}

class AppConfigClass {
  private store: Store<Config>;

  constructor() {
    this.store = new Store<Config>({
      defaults: {
        apiUrl: process.env.API_URL || "http://localhost:8080/api/v1",
        screenshotInterval: parseInt(
          process.env.SCREENSHOT_INTERVAL || "300000"
        ), // 5 minutes
        syncInterval: parseInt(process.env.SYNC_INTERVAL || "60000"), // 1 minute
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

  get screenshotInterval(): number {
    return this.store.get("screenshotInterval");
  }

  get syncInterval(): number {
    return this.store.get("syncInterval");
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
    const screenshotsDir = path.join(this.getAppDataPath(), "screenshots");
    return screenshotsDir;
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
}

export const AppConfig = new AppConfigClass();
