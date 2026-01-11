import { app } from "electron";
import Store from "electron-store";
import path from "path";

interface Credentials {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
}

interface Config {
  apiUrl: string;
  screenshotInterval: number;
  syncInterval: number;
  credentials?: Credentials;
  deviceUUID?: string;
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
}

export const AppConfig = new AppConfigClass();
