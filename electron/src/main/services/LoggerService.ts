import { app } from "electron";
import { formatISO } from "date-fns";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { AppConfig } from "../config";
import { DatabaseService, SystemLog } from "./DatabaseService";

type LogLevel = SystemLog["level"];

interface LoggerPayload {
  source: SystemLog["source"];
  level: LogLevel;
  component?: string;
  message: string;
  details?: unknown;
  stackTrace?: string;
  requestId?: string;
  sessionLocalId?: string;
}

export class LoggerService {
  private dbService: DatabaseService | null = null;
  private buffer: Array<Omit<SystemLog, "id">> = [];
  private readonly originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };
  private consolePatched = false;

  setDatabaseService(dbService: DatabaseService): void {
    this.dbService = dbService;
    void this.flushBuffer();
  }

  patchMainConsole(): void {
    if (this.consolePatched) return;
    this.consolePatched = true;

    console.log = (...args: unknown[]) => {
      this.originalConsole.log(...args);
      void this.capture("info", "electron-main", args);
    };
    console.info = (...args: unknown[]) => {
      this.originalConsole.info(...args);
      void this.capture("info", "electron-main", args);
    };
    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn(...args);
      void this.capture("warn", "electron-main", args);
    };
    console.error = (...args: unknown[]) => {
      this.originalConsole.error(...args);
      void this.capture("error", "electron-main", args);
    };
    console.debug = (...args: unknown[]) => {
      this.originalConsole.debug(...args);
      void this.capture("debug", "electron-main", args);
    };
  }

  async logRenderer(payload: LoggerPayload): Promise<void> {
    await this.persist(this.toSystemLog(payload));
  }

  logDirect(payload: LoggerPayload): void {
    void this.persist(this.toSystemLog(payload));
  }

  private async capture(
    level: LogLevel,
    source: SystemLog["source"],
    args: unknown[],
  ): Promise<void> {
    const payload = this.normalizeArguments(level, source, args);
    await this.persist(this.toSystemLog(payload));
  }

  private normalizeArguments(
    level: LogLevel,
    source: SystemLog["source"],
    args: unknown[],
  ): LoggerPayload {
    const [firstError] = args.filter(
      (value): value is Error => value instanceof Error,
    );

    const message = args
      .map((value) => {
        if (value instanceof Error) {
          return value.message;
        }
        if (typeof value === "string") {
          return value;
        }
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(" ")
      .slice(0, 8000);

    return {
      source,
      level,
      message,
      details:
        args.length > 1 || typeof args[0] !== "string"
          ? args.map((value) => this.sanitize(value))
          : undefined,
      stackTrace: firstError?.stack,
      component: "console",
    };
  }

  private toSystemLog(payload: LoggerPayload): Omit<SystemLog, "id"> {
    const credentials = AppConfig.getCredentials();
    return {
      localId: uuidv4(),
      organizationId: credentials?.organizationId,
      workspaceId: credentials?.workspaceId,
      userId: credentials?.userId,
      source: payload.source,
      level: payload.level,
      component: payload.component,
      message: payload.message.slice(0, 8000),
      details: payload.details ? this.stringify(payload.details) : undefined,
      stackTrace: payload.stackTrace?.slice(0, 16000),
      appVersion: app.getVersion(),
      deviceUUID: this.getDeviceUUID(),
      requestId: payload.requestId,
      sessionLocalId: payload.sessionLocalId,
      isSynced: false,
      occurredAt: formatISO(Date.now()),
      createdAt: formatISO(Date.now()),
    };
  }

  private async persist(entry: Omit<SystemLog, "id">): Promise<void> {
    if (!this.dbService) {
      this.buffer.push(entry);
      if (this.buffer.length > 1000) {
        this.buffer.shift();
      }
      return;
    }

    try {
      await this.dbService.createSystemLog(entry);
    } catch (error) {
      this.originalConsole.error("Failed to persist system log", error);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (!this.dbService || this.buffer.length === 0) return;

    const pending = [...this.buffer];
    this.buffer = [];

    for (const entry of pending) {
      try {
        await this.dbService.createSystemLog(entry);
      } catch (error) {
        this.originalConsole.error("Failed to flush buffered system log", error);
      }
    }
  }

  private stringify(value: unknown): string {
    try {
      return JSON.stringify(this.sanitize(value));
    } catch {
      return JSON.stringify({ value: String(value) });
    }
  }

  private sanitize(value: unknown): unknown {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    if (value === undefined) {
      return null;
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }

  private getDeviceUUID(): string {
    let uuid = AppConfig.get("deviceUUID") as string;
    if (!uuid) {
      uuid = `${os.hostname()}-${uuidv4()}`;
      AppConfig.set("deviceUUID", uuid);
    }
    return uuid;
  }
}

export const loggerService = new LoggerService();
