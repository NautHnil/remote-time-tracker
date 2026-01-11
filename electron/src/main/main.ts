import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import path from "path";
import { AppConfig } from "./config";
import { DatabaseService } from "./services/DatabaseService";
import { ScreenshotService } from "./services/ScreenshotService";
import { SyncService } from "./services/SyncService";
import { TaskService } from "./services/TaskService";
import { TimeTrackerService } from "./services/TimeTrackerService";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Services
let dbService: DatabaseService;
let screenshotService: ScreenshotService;
let syncService: SyncService;
let taskService: TaskService;
let timeTrackerService: TimeTrackerService;

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
    if (!isQuitting) {
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
              '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#3B82F6"/><text x="16" y="22" font-size="20" font-family="Arial" text-anchor="middle" fill="white" font-weight="bold">T</text></svg>'
            ).toString("base64")
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

  try {
    // Cleanup services
    if (timeTrackerService) {
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
    syncService
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
}

function setupIpcHandlers() {
  // Time tracking
  ipcMain.handle(
    "time-tracker:start",
    async (_event, taskId?: number, notes?: string) => {
      return await timeTrackerService.start(taskId, notes);
    }
  );

  ipcMain.handle("time-tracker:stop", async (_event, taskTitle?: string) => {
    return await timeTrackerService.stop(taskTitle);
  });

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
    }
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

  // App control
  ipcMain.handle("app:quit", async () => {
    await quitApp();
    return true;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initializeServices();
  createWindow();
  createTray();

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

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});
