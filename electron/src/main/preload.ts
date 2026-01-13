import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Time Tracker APIs
  timeTracker: {
    start: (taskId?: number, notes?: string) =>
      ipcRenderer.invoke("time-tracker:start", taskId, notes),
    stop: (taskTitle?: string) =>
      ipcRenderer.invoke("time-tracker:stop", taskTitle),
    stopAndSync: (taskTitle?: string) =>
      ipcRenderer.invoke("time-tracker:stop-and-sync", taskTitle),
    pause: () => ipcRenderer.invoke("time-tracker:pause"),
    resume: () => ipcRenderer.invoke("time-tracker:resume"),
    getStatus: () => ipcRenderer.invoke("time-tracker:get-status"),
    forceStop: () => ipcRenderer.invoke("time-tracker:force-stop"),
  },

  // Time Logs APIs
  timeLogs: {
    getAll: () => ipcRenderer.invoke("time-logs:get-all"),
    getByDateRange: (startDate: string, endDate: string) =>
      ipcRenderer.invoke("time-logs:get-by-date-range", startDate, endDate),
    getTodayTotalDuration: () =>
      ipcRenderer.invoke("time-logs:get-today-total-duration"),
  },

  // Screenshots APIs
  screenshots: {
    getAll: () => ipcRenderer.invoke("screenshots:get-all"),
    getByTimeLog: (timeLogId: number) =>
      ipcRenderer.invoke("screenshots:get-by-timelog", timeLogId),
    getByTask: (taskId: number) =>
      ipcRenderer.invoke("screenshots:get-by-task", taskId),
    forceStopCapture: () =>
      ipcRenderer.invoke("screenshots:force-stop-capture"),
    getCaptureStatus: () =>
      ipcRenderer.invoke("screenshots:get-capture-status"),
    getOptimizationSettings: () =>
      ipcRenderer.invoke("screenshots:get-optimization-settings"),
    updateOptimizationSettings: (settings: {
      enabled?: boolean;
      format?: "jpeg" | "webp" | "png";
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    }) =>
      ipcRenderer.invoke("screenshots:update-optimization-settings", settings),
  },

  // Screenshot viewer APIs
  getScreenshots: (options?: { date?: string; limit?: number }) =>
    ipcRenderer.invoke("screenshots:get", options),
  deleteScreenshot: (id: number) =>
    ipcRenderer.invoke("screenshots:delete", id),
  getScreenshotImage: (filePath: string) =>
    ipcRenderer.invoke("screenshots:get-image", filePath),

  // Tasks APIs
  tasks: {
    getAll: () => ipcRenderer.invoke("tasks:get-all"),
    getById: (id: number) => ipcRenderer.invoke("tasks:get-by-id", id),
    create: (request: any) => ipcRenderer.invoke("tasks:create", request),
    update: (id: number, request: any) =>
      ipcRenderer.invoke("tasks:update", id, request),
    delete: (id: number) => ipcRenderer.invoke("tasks:delete", id),
    getActive: () => ipcRenderer.invoke("tasks:get-active"),
  },

  // Sync APIs
  sync: {
    trigger: () => ipcRenderer.invoke("sync:trigger"),
    getStatus: () => ipcRenderer.invoke("sync:get-status"),
  },

  // Storage Management APIs
  storage: {
    cleanupSynced: (keepDays?: number) =>
      ipcRenderer.invoke("storage:cleanup-synced", keepDays),
    getSize: () => ipcRenderer.invoke("storage:get-size"),
    deleteOld: (daysOld?: number) =>
      ipcRenderer.invoke("storage:delete-old", daysOld),
  },

  // Auth APIs
  auth: {
    setCredentials: (credentials: any) =>
      ipcRenderer.invoke("auth:set-credentials", credentials),
    getCredentials: () => ipcRenderer.invoke("auth:get-credentials"),
    clear: () => ipcRenderer.invoke("auth:clear"),
  },

  // Config APIs
  config: {
    get: () => ipcRenderer.invoke("config:get"),
    set: (key: string, value: any) =>
      ipcRenderer.invoke("config:set", key, value),
  },

  // App control APIs
  app: {
    quit: () => ipcRenderer.invoke("app:quit"),
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    checkTrackingBeforeQuit: () =>
      ipcRenderer.invoke("app:check-tracking-before-quit"),
    forceStopAndQuit: () => ipcRenderer.invoke("app:force-stop-and-quit"),
  },

  // Updates APIs
  updates: {
    check: () => ipcRenderer.invoke("update:check"),
    download: () => ipcRenderer.invoke("update:download"),
    install: () => ipcRenderer.invoke("update:install"),
    onEvent: (callback: (event: any) => void) => {
      const handler = (_: any, payload: any) => callback(payload);
      ipcRenderer.on("update-event", handler);
      return () => ipcRenderer.removeListener("update-event", handler);
    },
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  timeTracker: {
    start: (taskId?: number, notes?: string) => Promise<any>;
    stop: (taskTitle?: string) => Promise<any>;
    pause: () => Promise<any>;
    resume: () => Promise<any>;
    getStatus: () => Promise<any>;
    forceStop: () => Promise<void>;
  };
  timeLogs: {
    getAll: () => Promise<any[]>;
    getByDateRange: (startDate: string, endDate: string) => Promise<any[]>;
    getTodayTotalDuration: () => Promise<number>;
  };
  screenshots: {
    getAll: () => Promise<any[]>;
    getByTimeLog: (timeLogId: number) => Promise<any[]>;
    getByTask: (taskId: number) => Promise<any>;
  };
  tasks: {
    getAll: () => Promise<any>;
    getById: (id: number) => Promise<any>;
    create: (request: any) => Promise<any>;
    update: (id: number, request: any) => Promise<any>;
    delete: (id: number) => Promise<any>;
    getActive: () => Promise<any>;
  };
  sync: {
    trigger: () => Promise<any>;
    getStatus: () => Promise<any>;
  };
  storage: {
    cleanupSynced: (keepDays?: number) => Promise<any>;
    getSize: () => Promise<any>;
    deleteOld: (daysOld?: number) => Promise<any>;
  };
  auth: {
    setCredentials: (credentials: any) => Promise<boolean>;
    getCredentials: () => Promise<any>;
    clear: () => Promise<boolean>;
  };
  config: {
    get: () => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
  };
  app: {
    quit: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    checkTrackingBeforeQuit: () => Promise<{
      isTracking: boolean;
      taskTitle?: string;
      elapsedTime?: number;
    }>;
    forceStopAndQuit: () => Promise<boolean>;
  };
  updates: {
    check: () => Promise<any>;
    download: () => Promise<any>;
    install: () => Promise<any>;
    onEvent: (cb: (event: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
