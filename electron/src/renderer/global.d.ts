// Global type definitions for Electron IPC APIs

interface Credentials {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  organizationId?: number;
  workspaceId?: number;
}

interface TimeTrackerStatus {
  isTracking: boolean;
  status: "running" | "paused" | "stopped";
  elapsedTime: number;
  pausedTime: number;
  currentTimeLog?: {
    id?: number;
    taskTitle?: string;
    isManualTask?: boolean;
    taskId?: number;
    taskLocalId?: string;
  };
}

interface Screenshot {
  id: number;
  file_path: string;
  file_name: string;
  captured_at: string;
  screen_number: number;
  task_id?: number;
  file_size: number;
}

interface ImageOptimizationSettings {
  enabled: boolean;
  format: "jpeg" | "webp" | "png";
  quality: number;
  maxWidth: number;
  maxHeight: number;
}

interface ElectronAPI {
  auth: {
    getCredentials: () => Promise<Credentials | null>;
    setCredentials: (credentials: Credentials) => Promise<void>;
    clear: () => Promise<void>;
  };
  timeTracker: {
    start: (taskId?: number, notes?: string) => Promise<any>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: (taskTitle?: string) => Promise<any>;
    stopAndSync: (taskTitle?: string) => Promise<any>;
    getStatus: () => Promise<TimeTrackerStatus>;
    forceStop: () => Promise<void>;
  };
  timeLogs: {
    getAll: () => Promise<any[]>;
    getByDateRange: (startDate: string, endDate: string) => Promise<any[]>;
    getTodayTotalDuration: (userId: number) => Promise<number>;
  };
  screenshots: {
    getAll: () => Promise<any[]>;
    getByTimeLog: (timeLogId: number) => Promise<any[]>;
    getByTask: (taskId: number) => Promise<any>;
    forceStopCapture: () => Promise<{ success: boolean; message: string }>;
    getCaptureStatus: () => Promise<{
      isCapturing: boolean;
      hasTimer: boolean;
      currentTaskId?: number;
    }>;
    getOptimizationSettings: () => Promise<ImageOptimizationSettings>;
    updateOptimizationSettings: (
      settings: Partial<ImageOptimizationSettings>,
    ) => Promise<ImageOptimizationSettings>;
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
    getScreenshotPath: () => Promise<{
      success: boolean;
      path?: string;
      isCustom?: boolean;
      defaultPath?: string;
      error?: string;
    }>;
    setScreenshotPath: (customPath: string | null) => Promise<{
      success: boolean;
      path?: string;
      isCustom?: boolean;
      error?: string;
    }>;
    selectScreenshotFolder: () => Promise<{
      success: boolean;
      path?: string;
      canceled?: boolean;
      error?: string;
    }>;
    openScreenshotFolder: () => Promise<{ success: boolean; error?: string }>;
  };
  config: {
    get: () => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
  };
  settings: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    getAll: () => Promise<any>;
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
  getScreenshots: (options?: {
    date?: string;
    limit?: number;
  }) => Promise<Screenshot[]>;
  deleteScreenshot: (id: number) => Promise<void>;
  getScreenshotImage: (filePath: string) => Promise<string>;
}

interface Window {
  electronAPI: ElectronAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Extend ImportMeta for Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SCREENSHOT_INTERVAL: string;
  readonly VITE_SYNC_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
