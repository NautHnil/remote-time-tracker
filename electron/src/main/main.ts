import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import path from "path";
import { AppConfig } from "./config";
import { BackendUpdateService } from "./services/BackendUpdateService";
import { DatabaseService } from "./services/DatabaseService";
import { ScreenshotService } from "./services/ScreenshotService";
import { SyncService } from "./services/SyncService";
import { TaskService } from "./services/TaskService";
import { TimeTrackerService } from "./services/TimeTrackerService";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let isUpdating = false; // Flag for auto-update quit
let pendingDeeplink: string | null = null; // Store deeplink if received before window ready

// Services
let dbService: DatabaseService;
let screenshotService: ScreenshotService;
let syncService: SyncService;
let taskService: TaskService;
let timeTrackerService: TimeTrackerService;

let backendUpdateService: BackendUpdateService | null = null;

// Deeplink handler
function handleDeeplink(url: string) {
  console.log("🔗 Received deeplink:", url);

  try {
    // Parse the URL: timetracker://join/{inviteCode}
    const parsed = new URL(url);
    const protocol = parsed.protocol; // timetracker:
    const host = parsed.host; // join
    const pathname = parsed.pathname; // /{inviteCode}

    console.log("📎 Parsed deeplink:", { protocol, host, pathname });

    if (protocol !== "timetracker:") {
      console.warn("⚠️ Unknown protocol:", protocol);
      return;
    }

    // Handle different deeplink routes
    if (host === "join") {
      const inviteCode = pathname.replace(/^\//, ""); // Remove leading slash
      if (inviteCode) {
        console.log("📨 Join organization invite code:", inviteCode);

        // If window is ready, send to renderer immediately
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send("deeplink:join-organization", inviteCode);
        } else {
          // Store for later when window is ready
          pendingDeeplink = url;
        }
      }
    } else {
      console.warn("⚠️ Unknown deeplink route:", host);
    }
  } catch (error) {
    console.error("❌ Failed to parse deeplink:", error);
  }
}

// Send pending deeplink to renderer
function sendPendingDeeplink() {
  if (pendingDeeplink && mainWindow && !mainWindow.isDestroyed()) {
    console.log("📤 Sending pending deeplink:", pendingDeeplink);
    handleDeeplink(pendingDeeplink);
    pendingDeeplink = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files
    },
    icon: path.join(__dirname, "../../assets/icon.png"),
  });

  // Load the app
  if (process.env.NODE_ENV === "development") {
    // Try different ports in case 5173 is occupied
    const tryLoadURL = async () => {
      const ports = [5173, 5174, 5175];
      for (const port of ports) {
        try {
          await mainWindow?.loadURL(`http://localhost:${port}`);
          console.log(`✅ Connected to Vite dev server on port ${port}`);
          break;
        } catch (err) {
          console.log(`⚠️  Port ${port} not available, trying next...`);
        }
      }
    };
    tryLoadURL();
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Handle window close
  mainWindow.on("close", (event) => {
    // Allow close if quitting or updating
    if (!isQuitting && !isUpdating) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  console.log("🎯 Creating tray icon...");

  try {
    let icon: Electron.NativeImage;

    // Thử load icon từ file
    const iconPath = path.join(__dirname, "../../assets/tray-icon.png");
    const fs = require("fs");

    if (fs.existsSync(iconPath)) {
      console.log("📁 Loading icon from:", iconPath);
      icon = nativeImage.createFromPath(iconPath);

      // Resize cho phù hợp với platform
      if (process.platform === "darwin") {
        // macOS: 16x16 template icon
        icon = icon.resize({ width: 16, height: 16 });
        icon.setTemplateImage(true);
      } else {
        // Windows/Linux: 32x32
        icon = icon.resize({ width: 32, height: 32 });
      }
    } else {
      console.warn("⚠️ Icon file not found, using system icon");
      // Fallback: Sử dụng system icon
      if (process.platform === "darwin") {
        icon = nativeImage.createFromNamedImage("NSStatusAvailable");
      } else {
        // Tạo icon đơn giản từ text emoji
        icon = nativeImage.createFromDataURL(
          "data:image/svg+xml;base64," +
            Buffer.from(
              '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#3B82F6"/><text x="16" y="22" font-size="20" font-family="Arial" text-anchor="middle" fill="white" font-weight="bold">T</text></svg>',
            ).toString("base64"),
        );
      }
    }

    if (icon.isEmpty()) {
      console.error("❌ Icon is empty!");
      throw new Error("Failed to create tray icon");
    }

    tray = new Tray(icon);
    console.log("✅ Tray icon created successfully");
  } catch (error) {
    console.error("❌ Failed to create tray icon:", error);
    // Tạo tray với system default icon
    try {
      const defaultIcon = nativeImage.createFromNamedImage("NSStatusAvailable");
      tray = new Tray(defaultIcon);
    } catch (e) {
      console.error("❌ Failed to create tray with fallback:", e);
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: "Start Tracking",
      click: async () => {
        await timeTrackerService.start();
      },
    },
    {
      label: "Stop Tracking",
      click: async () => {
        await timeTrackerService.stop();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        quitApp();
      },
    },
  ]);

  if (tray) {
    tray.setContextMenu(contextMenu);
    tray.setToolTip("Remote Time Tracker");

    tray.on("click", () => {
      mainWindow?.show();
    });
  }
}

async function quitApp() {
  // Prevent multiple quit calls
  if (isQuitting) {
    return;
  }

  console.log("🛑 Quitting application...");
  isQuitting = true;

  // Skip cleanup if updating (auto-updater handles restart)
  if (isUpdating) {
    console.log("🔄 Skipping cleanup - updating app...");
    app.exit(0);
    return;
  }

  try {
    // Force stop any active tracking session before quit
    if (timeTrackerService) {
      const status = await timeTrackerService.getStatus();
      if (status.isTracking) {
        console.log("⏹️ Force stopping active tracking session before quit...");
        await timeTrackerService.forceStop();
      }
      await timeTrackerService.cleanup();
    }
    if (syncService) {
      await syncService.cleanup();
    }
    if (dbService) {
      await dbService.close();
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }

  // Destroy tray
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // Force quit without triggering before-quit again
  app.exit(0);
}

// Emergency stop tracking (for crash scenarios)
async function emergencyStopTracking() {
  try {
    if (timeTrackerService) {
      const status = await timeTrackerService.getStatus();
      if (status.isTracking) {
        console.log("🆘 Emergency stopping tracking session...");
        await timeTrackerService.forceStop();
        console.log("✅ Emergency stop completed");
      }
    }
  } catch (error) {
    console.error("❌ Emergency stop failed:", error);
  }
}

async function initializeServices() {
  console.log("🚀 Initializing services...");

  // Initialize database
  dbService = new DatabaseService();
  await dbService.initialize();
  console.log("✅ Database initialized");

  // Initialize services
  screenshotService = new ScreenshotService(dbService);
  syncService = new SyncService(dbService);
  taskService = new TaskService();
  timeTrackerService = new TimeTrackerService(
    dbService,
    screenshotService,
    syncService,
  );
  console.log("✅ Services created");

  // Initialize time tracker (resume active session)
  await timeTrackerService.initialize();
  console.log("✅ Time tracker initialized");

  // Setup IPC handlers
  setupIpcHandlers();
  console.log("✅ IPC handlers registered");

  // Start background services
  syncService.startAutoSync();
  console.log("✅ Background services started");

  // Initialize backend update service only
  backendUpdateService = new BackendUpdateService(null);
  console.log("✅ Backend update service created");
}

function setupIpcHandlers() {
  // Time tracking
  ipcMain.handle(
    "time-tracker:start",
    async (_event, taskId?: number, notes?: string) => {
      return await timeTrackerService.start(taskId, notes);
    },
  );

  ipcMain.handle("time-tracker:stop", async (_event, taskTitle?: string) => {
    return await timeTrackerService.stop(taskTitle, false);
  });

  // Stop with sync - used when quitting app to ensure data is saved
  ipcMain.handle(
    "time-tracker:stop-and-sync",
    async (_event, taskTitle?: string) => {
      return await timeTrackerService.stop(taskTitle, true);
    },
  );

  ipcMain.handle("time-tracker:pause", async () => {
    return await timeTrackerService.pause();
  });

  ipcMain.handle("time-tracker:resume", async () => {
    return await timeTrackerService.resume();
  });

  ipcMain.handle("time-tracker:get-status", async () => {
    return await timeTrackerService.getStatus();
  });

  ipcMain.handle("time-tracker:force-stop", async () => {
    return await timeTrackerService.forceStop();
  });

  // Time logs
  ipcMain.handle("time-logs:get-all", async () => {
    return await dbService.getAllTimeLogs();
  });

  ipcMain.handle(
    "time-logs:get-by-date-range",
    async (_, startDate, endDate) => {
      return await dbService.getTimeLogsByDateRange(startDate, endDate);
    },
  );

  ipcMain.handle("time-logs:get-today-total-duration", async () => {
    return await dbService.getTodayTotalDuration();
  });

  // Screenshots
  ipcMain.handle("screenshots:get-all", async () => {
    return await dbService.getAllScreenshots();
  });

  ipcMain.handle("screenshots:get-by-timelog", async (_, timeLogId) => {
    return await dbService.getScreenshotsByTimeLog(timeLogId);
  });

  ipcMain.handle("screenshots:get", async (_, options) => {
    return await dbService.getScreenshots(options);
  });

  ipcMain.handle("screenshots:delete", async (_, id) => {
    return await dbService.deleteScreenshot(id);
  });

  ipcMain.handle("screenshots:get-image", async (_, filePath) => {
    try {
      // Validate filePath
      if (!filePath || typeof filePath !== "string") {
        throw new Error(`Invalid file path: ${filePath}`);
      }

      console.log("📸 Loading screenshot from:", filePath);

      const fs = await import("fs");

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const imageBuffer = fs.readFileSync(filePath);
      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    } catch (error) {
      console.error("❌ Error reading screenshot:", error);
      throw error;
    }
  });

  ipcMain.handle("screenshots:get-by-task", async (_, taskId) => {
    return await dbService.getScreenshotsByTaskId(taskId);
  });

  // Force stop screenshot capturing - use this to clean up stuck capture processes
  ipcMain.handle("screenshots:force-stop-capture", async () => {
    return await screenshotService.forceStopCapturing();
  });

  // Get screenshot capture status
  ipcMain.handle("screenshots:get-capture-status", async () => {
    return screenshotService.getCaptureStatus();
  });

  // Image optimization settings
  ipcMain.handle("screenshots:get-optimization-settings", async () => {
    return screenshotService.getOptimizationSettings();
  });

  ipcMain.handle(
    "screenshots:update-optimization-settings",
    async (_, settings) => {
      screenshotService.updateOptimizationSettings(settings);
      return screenshotService.getOptimizationSettings();
    },
  );

  // Tasks
  ipcMain.handle("tasks:get-all", async () => {
    return await taskService.getAllTasks();
  });

  ipcMain.handle("tasks:get-by-id", async (_, id) => {
    return await taskService.getTaskById(id);
  });

  ipcMain.handle("tasks:create", async (_, request) => {
    return await taskService.createTask(request);
  });

  ipcMain.handle("tasks:update", async (_, id, request) => {
    return await taskService.updateTask(id, request);
  });

  ipcMain.handle("tasks:delete", async (_, id) => {
    return await taskService.deleteTask(id);
  });

  ipcMain.handle("tasks:get-active", async () => {
    return await taskService.getActiveTasks();
  });

  // Sync
  ipcMain.handle("sync:trigger", async () => {
    return await syncService.syncNow();
  });

  ipcMain.handle("sync:get-status", async () => {
    return await syncService.getSyncStatus();
  });

  // Cleanup & Storage Management
  ipcMain.handle("storage:cleanup-synced", async (_, keepDays = 7) => {
    try {
      await screenshotService.cleanupSyncedScreenshots(keepDays);
      return { success: true };
    } catch (error: any) {
      console.error("Cleanup failed:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("storage:get-size", async () => {
    try {
      const totalSize = await screenshotService.getTotalScreenshotSize();
      return { success: true, totalSize };
    } catch (error: any) {
      console.error("Failed to get storage size:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("storage:delete-old", async (_, daysOld = 30) => {
    try {
      const result = await screenshotService.deleteOldScreenshots(daysOld);
      return {
        success: true,
        deletedCount: result.deletedCount,
        freedBytes: result.freedBytes,
      };
    } catch (error: any) {
      console.error("Delete old screenshots failed:", error);
      return { success: false, error: error.message };
    }
  });

  // Screenshot path management
  ipcMain.handle("storage:get-screenshot-path", async () => {
    try {
      return {
        success: true,
        path: AppConfig.getScreenshotsPath(),
        isCustom: AppConfig.isUsingCustomScreenshotsPath(),
        defaultPath: AppConfig.getDefaultScreenshotsPath(),
      };
    } catch (error: any) {
      console.error("Failed to get screenshot path:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "storage:set-screenshot-path",
    async (_, customPath: string | null) => {
      try {
        AppConfig.setScreenshotsPath(customPath);
        // Ensure the new directory exists
        const fs = require("fs");
        const newPath = AppConfig.getScreenshotsPath();
        if (!fs.existsSync(newPath)) {
          fs.mkdirSync(newPath, { recursive: true });
        }
        return {
          success: true,
          path: newPath,
          isCustom: AppConfig.isUsingCustomScreenshotsPath(),
        };
      } catch (error: any) {
        console.error("Failed to set screenshot path:", error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("storage:select-screenshot-folder", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
        title: "Select Screenshot Folder",
        buttonLabel: "Select Folder",
        defaultPath: AppConfig.getScreenshotsPath(),
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      return { success: true, path: selectedPath };
    } catch (error: any) {
      console.error("Failed to open folder dialog:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("storage:open-screenshot-folder", async () => {
    try {
      const screenshotPath = AppConfig.getScreenshotsPath();
      const fs = require("fs");

      // Ensure directory exists before opening
      if (!fs.existsSync(screenshotPath)) {
        fs.mkdirSync(screenshotPath, { recursive: true });
      }

      await shell.openPath(screenshotPath);
      return { success: true };
    } catch (error: any) {
      console.error("Failed to open screenshot folder:", error);
      return { success: false, error: error.message };
    }
  });

  // Auth
  ipcMain.handle("auth:set-credentials", async (_, credentials) => {
    AppConfig.setCredentials(credentials);
    return true;
  });

  ipcMain.handle("auth:get-credentials", async () => {
    return AppConfig.getCredentials();
  });

  ipcMain.handle("auth:clear", async () => {
    AppConfig.clearCredentials();
    return true;
  });

  // Config
  ipcMain.handle("config:get", async () => {
    return AppConfig.getAll();
  });

  ipcMain.handle("config:set", async (_, key, value) => {
    AppConfig.set(key, value);
    return true;
  });

  // Updates - Only backend proxy
  ipcMain.handle("update:check", async () => {
    if (!backendUpdateService) {
      return {
        success: false,
        error: "Backend update service not initialized",
      };
    }
    const credentials = AppConfig.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, error: "Please login to check for updates" };
    }
    return await backendUpdateService.checkForUpdates();
  });

  ipcMain.handle("update:download", async () => {
    if (!backendUpdateService) {
      return {
        success: false,
        error: "Backend update service not initialized",
      };
    }
    const credentials = AppConfig.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, error: "Please login to download updates" };
    }
    return await backendUpdateService.downloadUpdate();
  });

  ipcMain.handle("update:install", async () => {
    if (!backendUpdateService) {
      return {
        success: false,
        error: "Backend update service not initialized",
      };
    }
    isUpdating = true;
    isQuitting = true;
    return await backendUpdateService.installAndRestart();
  });

  // Backend update specific handlers
  ipcMain.handle("update:check-backend", async () => {
    if (!backendUpdateService) {
      return {
        success: false,
        error: "Backend update service not initialized",
      };
    }
    const credentials = AppConfig.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, error: "Please login to check for updates" };
    }
    return await backendUpdateService.checkForUpdates();
  });

  ipcMain.handle("update:download-backend", async () => {
    if (!backendUpdateService) {
      return {
        success: false,
        error: "Backend update service not initialized",
      };
    }
    const credentials = AppConfig.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, error: "Please login to download updates" };
    }
    return await backendUpdateService.downloadUpdate();
  });

  ipcMain.handle("update:install-backend", async () => {
    if (!backendUpdateService) {
      return {
        success: false,
        error: "Backend update service not initialized",
      };
    }
    isUpdating = true;
    isQuitting = true;
    return await backendUpdateService.installAndRestart();
  });

  ipcMain.handle("update:open-downloads", async () => {
    if (backendUpdateService) {
      await backendUpdateService.openDownloadsFolder();
    }
    return { success: true };
  });

  // App info
  ipcMain.handle("app:get-version", async () => {
    return app.getVersion();
  });

  // App control
  ipcMain.handle("app:quit", async () => {
    await quitApp();
    return true;
  });

  // Check tracking status (for quit confirmation in renderer)
  ipcMain.handle("app:check-tracking-before-quit", async () => {
    try {
      const status = await timeTrackerService.getStatus();
      return {
        isTracking: status.isTracking,
        taskTitle: status.currentTimeLog?.taskTitle,
        elapsedTime: status.elapsedTime,
      };
    } catch (error) {
      console.error("Error checking tracking status:", error);
      return { isTracking: false };
    }
  });

  // Force stop tracking and quit
  ipcMain.handle("app:force-stop-and-quit", async () => {
    try {
      await timeTrackerService.forceStop();
      await quitApp();
      return true;
    } catch (error) {
      console.error("Error force stopping and quitting:", error);
      return false;
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  // Attach backend update service to window
  if (backendUpdateService && mainWindow) {
    backendUpdateService.setWindow(mainWindow);
    // Backend updates require auth, so we check later after login
  }

  createTray();

  // Handle deeplinks on macOS when app is already running
  app.on("open-url", (event, url) => {
    event.preventDefault();
    console.log("🔗 open-url event received:", url);
    handleDeeplink(url);
  });

  // Send pending deeplink if exists (app was opened via deeplink)
  if (mainWindow) {
    mainWindow.webContents.on("did-finish-load", () => {
      sendPendingDeeplink();
    });
  }

  // Handle before-quit event for auto-updater and tracking cleanup
  app.on("before-quit", async (event) => {
    console.log(
      "before-quit event, isUpdating:",
      isUpdating,
      "isQuitting:",
      isQuitting,
    );

    if (isUpdating) {
      console.log("Allowing quit for update...");
      // Don't prevent quit during update
      return;
    }

    // If not already quitting, prevent default and handle tracking stop
    if (!isQuitting) {
      event.preventDefault();

      // Check if tracking is active
      try {
        const status = await timeTrackerService.getStatus();
        if (status.isTracking) {
          console.log("⏹️ Stopping active tracking before quit...");
          await timeTrackerService.forceStop();
        }
      } catch (error) {
        console.error("Error stopping tracking before quit:", error);
      }

      // Now actually quit
      await quitApp();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Không quit khi tất cả window đóng vì app chạy trong system tray
  // User phải dùng "Quit" từ tray menu để thoát
});

// Register protocol for development (production is handled by electron-builder)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("timetracker", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("timetracker");
}

// Single instance lock for Windows deeplink handling
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Windows: Handle deeplink when app is already running
    // The deeplink URL will be in commandLine
    const deeplinkUrl = commandLine.find((arg) =>
      arg.startsWith("timetracker://"),
    );
    if (deeplinkUrl) {
      console.log("🔗 second-instance deeplink:", deeplinkUrl);
      handleDeeplink(deeplinkUrl);
    }

    // Focus main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Handle deeplink on app start (Windows - cold start)
const startupDeeplinkUrl = process.argv.find((arg) =>
  arg.startsWith("timetracker://"),
);
if (startupDeeplinkUrl) {
  console.log("🔗 Startup deeplink detected:", startupDeeplinkUrl);
  pendingDeeplink = startupDeeplinkUrl;
}

// Handle uncaught exceptions - Emergency stop tracking
process.on("uncaughtException", async (error) => {
  console.error("❌ Uncaught exception:", error);
  // Try to emergency stop tracking before crash
  await emergencyStopTracking();
});

process.on("unhandledRejection", async (error) => {
  console.error("❌ Unhandled rejection:", error);
  // Try to emergency stop tracking
  await emergencyStopTracking();
});

// Handle SIGTERM (graceful shutdown)
process.on("SIGTERM", async () => {
  console.log("📴 SIGTERM received, cleaning up...");
  await emergencyStopTracking();
  await quitApp();
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", async () => {
  console.log("📴 SIGINT received, cleaning up...");
  await emergencyStopTracking();
  await quitApp();
});
