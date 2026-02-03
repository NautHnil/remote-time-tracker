import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  systemPreferences,
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
import { TrayIconHelper } from "./utils/TrayIconHelper";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let isUpdating = false; // Flag for auto-update quit
let isForceClose = false; // Flag for keyboard shortcut close (Cmd+Q, Alt+F4)
let pendingDeeplink: string | null = null; // Store deeplink if received before window ready

// Services
let dbService: DatabaseService;
let screenshotService: ScreenshotService;
let syncService: SyncService;
let taskService: TaskService;
let timeTrackerService: TimeTrackerService;

let backendUpdateService: BackendUpdateService | null = null;

// Screen capture permission result interface
interface ScreenCapturePermissionResult {
  granted: boolean;
  status: string;
  platform: string;
  message?: string;
}

/**
 * Check if bitmap data has pixel variance (not a solid color)
 * When screen recording permission is OFF, thumbnails are blank/solid color
 * When ON, thumbnails have actual window content with varying pixels
 */
function checkBitmapHasVariance(bitmap: Buffer): boolean {
  if (!bitmap || bitmap.length < 16) {
    return false;
  }

  // Bitmap format is BGRA (4 bytes per pixel)
  // Sample pixels at different positions and check if they differ
  const bytesPerPixel = 4;
  const totalPixels = Math.floor(bitmap.length / bytesPerPixel);

  if (totalPixels < 4) {
    return false;
  }

  // Get first pixel as reference
  const refB = bitmap[0];
  const refG = bitmap[1];
  const refR = bitmap[2];

  // Sample pixels at 25%, 50%, 75% positions
  const samplePositions = [
    Math.floor(totalPixels * 0.25),
    Math.floor(totalPixels * 0.5),
    Math.floor(totalPixels * 0.75),
  ];

  for (const pos of samplePositions) {
    const offset = pos * bytesPerPixel;
    if (offset + 3 < bitmap.length) {
      const b = bitmap[offset];
      const g = bitmap[offset + 1];
      const r = bitmap[offset + 2];

      // Check if this pixel differs significantly from reference
      // Use threshold to account for minor compression artifacts
      const threshold = 10;
      if (
        Math.abs(b - refB) > threshold ||
        Math.abs(g - refG) > threshold ||
        Math.abs(r - refR) > threshold
      ) {
        return true; // Found variance - real content
      }
    }
  }

  return false; // All sampled pixels are similar - likely blank/solid
}

/**
 * Check and request screen capture permission on app startup
 * - If already granted: return immediately, no dialog
 * - If not granted: show dialog to request permission
 */
async function ensureScreenCapturePermission(): Promise<ScreenCapturePermissionResult> {
  const platform = process.platform;
  console.log(`🔐 Checking screen capture permission on ${platform}...`);

  // Windows doesn't require explicit permission
  if (platform === "win32") {
    console.log("✅ Windows: No explicit screen capture permission required");
    return { granted: true, status: "not_required", platform };
  }

  // Linux - try to verify screen capture works
  if (platform === "linux") {
    console.log("🐧 Linux: Testing screen capture availability...");
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 },
      });

      if (sources && sources.length > 0) {
        console.log(
          `✅ Linux: Screen capture available (${sources.length} screen(s))`,
        );
        return { granted: true, status: "granted", platform };
      }

      // No screens detected - show warning
      console.warn("⚠️ Linux: No screens detected");
      await dialog.showMessageBox({
        type: "warning",
        title: "Screen Capture May Not Work",
        message: "No screens detected for capture",
        detail:
          "Remote Time Tracker could not detect any screens.\n\n" +
          "If you're using Wayland, screen capture may require additional permissions:\n" +
          "• GNOME: Allow screen sharing in Settings > Privacy\n" +
          "• KDE Plasma: Grant portal permissions when prompted\n\n" +
          "If you're using X11, please ensure xrandr and ImageMagick are installed.",
        buttons: ["OK"],
      });
      return {
        granted: false,
        status: "no_screens",
        platform,
        message: "No screens detected",
      };
    } catch (error) {
      console.error("❌ Linux: Screen capture error:", error);
      await dialog.showMessageBox({
        type: "warning",
        title: "Screen Capture Permission Issue",
        message: "Could not access screen capture",
        detail:
          "Remote Time Tracker encountered an error accessing screen capture.\n\n" +
          "This may happen on Wayland-based desktops. Please ensure:\n" +
          "• Screen sharing permissions are granted\n" +
          "• XDG Desktop Portal is running\n" +
          "• Required packages are installed (xdg-desktop-portal, pipewire)",
        buttons: ["OK"],
      });
      return {
        granted: false,
        status: "error",
        platform,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // macOS - verify by actually trying to capture windows (most reliable method)
  // Note: getMediaAccessStatus("screen") returns "granted" even when app is in the list but toggle is OFF
  // When toggle is OFF, screen capture returns desktop background only (no app windows)
  // So we check by capturing WINDOWS instead - this only works when toggle is ON
  if (platform === "darwin") {
    const status = systemPreferences.getMediaAccessStatus("screen");
    console.log("📋 macOS: getMediaAccessStatus reports:", status);

    // The ONLY reliable way to check is to capture WINDOWS (not screens)
    // When permission toggle is OFF:
    //   - Screen capture returns desktop background (appears valid but useless)
    //   - Window capture returns empty thumbnails or no content
    // When permission toggle is ON:
    //   - Window capture returns actual window content
    try {
      console.log(
        "🔍 macOS: Testing window capture (more reliable than screen)...",
      );
      const sources = await desktopCapturer.getSources({
        types: ["window"], // Use window instead of screen!
        thumbnailSize: { width: 100, height: 100 },
        fetchWindowIcons: false,
      });

      console.log(`📊 macOS: Got ${sources.length} window sources`);

      if (sources && sources.length > 0) {
        // Check if ANY window thumbnail has actual content (not blank)
        // When toggle is OFF, thumbnails will be empty or all same color
        let validWindowCount = 0;

        for (const source of sources) {
          if (source.thumbnail && !source.thumbnail.isEmpty()) {
            const size = source.thumbnail.getSize();
            if (size.width > 0 && size.height > 0) {
              // Additional check: verify thumbnail has actual pixel variance
              // Get bitmap data and check if it's not just a solid color
              const bitmap = source.thumbnail.toBitmap();
              if (bitmap && bitmap.length > 0) {
                // Check first few pixels - if all same, likely blank/placeholder
                const hasVariance = checkBitmapHasVariance(bitmap);
                if (hasVariance) {
                  validWindowCount++;
                  console.log(`✓ Window "${source.name}" has valid content`);
                }
              }
            }
          }
        }

        if (validWindowCount > 0) {
          console.log(
            `✅ macOS: Screen capture WORKING (${validWindowCount} windows with valid content)`,
          );
          return { granted: true, status: "granted", platform };
        } else {
          console.warn(
            "⚠️ macOS: Windows captured but all thumbnails are blank - permission toggle is OFF",
          );
        }
      } else {
        console.warn(
          "⚠️ macOS: No window sources returned - permission may be OFF",
        );
      }
    } catch (error) {
      console.error("❌ macOS: Error testing window capture:", error);
    }

    // If we reach here, capture didn't work properly - show guidance dialog
    console.warn(
      `❌ macOS: Screen capture NOT working (API status: ${status}), showing guidance dialog`,
    );
    await showMacOSPermissionDialog();
    return { granted: false, status: "not_enabled", platform };
  }

  // Unknown platform - assume granted
  console.warn(`⚠️ Unknown platform: ${platform}`);
  return { granted: true, status: "unknown_platform", platform };
}

/**
 * Show dialog guiding user to enable screen recording permission on macOS
 */
async function showMacOSPermissionDialog(): Promise<void> {
  const result = await dialog.showMessageBox({
    type: "warning",
    title: "Screen Recording Permission Required",
    message: "Remote Time Tracker needs screen recording permission",
    detail:
      "To capture screenshots of your work, please enable screen recording permission:\n\n" +
      "1. Open System Settings > Privacy & Security > Screen Recording\n" +
      "2. Enable Remote Time Tracker in the list\n" +
      "3. Restart the app after granting permission\n\n" +
      "Without this permission, screenshot capture will not work.",
    buttons: ["Open System Settings", "Later"],
    defaultId: 0,
  });

  if (result.response === 0) {
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
    );
  }
}

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
  // Get the correct icon path using TrayIconHelper
  const assetsPath = TrayIconHelper.getAssetsPath();
  const windowIconPath = path.join(assetsPath, "icon.png");

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
    icon: windowIconPath,
  });

  console.log("🪟 Window icon path:", windowIconPath);

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

  // Handle window close (X button)
  mainWindow.on("close", async (event) => {
    // Allow close if already quitting, updating, or force close (keyboard shortcut)
    if (isQuitting || isUpdating || isForceClose) {
      return;
    }

    // Prevent default close behavior
    event.preventDefault();

    // Show dialog asking what user wants to do
    const result = await dialog.showMessageBox(mainWindow!, {
      type: "question",
      title: "Close Application",
      message: "What would you like to do?",
      detail:
        "The app can continue running in the system tray, or you can quit completely.",
      buttons: ["Minimize to Tray", "Quit Application", "Cancel"],
      defaultId: 0,
      cancelId: 2,
      icon: getAppIcon(),
    });

    switch (result.response) {
      case 0: // Minimize to Tray
        mainWindow?.hide();
        break;
      case 1: // Quit Application
        await quitApp();
        break;
      case 2: // Cancel - do nothing
      default:
        break;
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Get app icon for dialogs
 */
function getAppIcon(): Electron.NativeImage | undefined {
  try {
    const assetsPath = TrayIconHelper.getAssetsPath();
    const iconPath = path.join(assetsPath, "icon.png");
    const fs = require("fs");
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }
  } catch (error) {
    console.warn("⚠️ Could not load app icon for dialog:", error);
  }
  return undefined;
}

function createTray() {
  console.log("🎯 Creating tray icon...");

  // Debug: List assets to help troubleshoot icon issues
  TrayIconHelper.debugListAssets();

  try {
    // Use TrayIconHelper to create platform-appropriate icon
    const iconResult = TrayIconHelper.createTrayIcon();

    if (iconResult.icon.isEmpty()) {
      console.error("❌ Icon is empty!");
      throw new Error("Failed to create tray icon");
    }

    tray = new Tray(iconResult.icon);
    console.log(
      `✅ Tray icon created successfully (source: ${iconResult.source}${iconResult.path ? `, path: ${iconResult.path}` : ""})`,
    );
  } catch (error) {
    console.error("❌ Failed to create tray icon:", error);

    // Last resort fallback using embedded icon
    try {
      const fallbackResult = TrayIconHelper.createStateIcon("idle");
      tray = new Tray(fallbackResult.icon);
      console.log("✅ Tray created with fallback state icon");
    } catch (e) {
      console.error("❌ Failed to create tray with fallback:", e);
      // Platform-specific final fallback
      if (process.platform === "darwin") {
        try {
          const defaultIcon =
            nativeImage.createFromNamedImage("NSStatusAvailable");
          tray = new Tray(defaultIcon);
          console.log("✅ Tray created with macOS system icon");
        } catch (macError) {
          console.error("❌ All tray icon attempts failed:", macError);
        }
      }
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Start Tracking",
      click: async () => {
        await timeTrackerService.start();
      },
    },
    {
      label: "Pause Tracking",
      click: async () => {
        await timeTrackerService.pause();
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

    // Handle tray click based on platform
    if (process.platform === "darwin") {
      // On macOS, left-click typically shows the menu, but we can also show window
      tray.on("double-click", () => {
        mainWindow?.show();
        mainWindow?.focus();
      });
    } else {
      // On Windows/Linux, single click shows the window
      tray.on("click", () => {
        mainWindow?.show();
        mainWindow?.focus();
      });
    }
  }
}

/**
 * Update tray icon based on tracking state
 */
function updateTrayIcon(state: "idle" | "tracking" | "paused") {
  if (!tray) return;

  try {
    const iconResult = TrayIconHelper.createStateIcon(state);
    tray.setImage(iconResult.icon);

    // Update tooltip based on state
    const tooltips: Record<string, string> = {
      idle: "Remote Time Tracker",
      tracking: "Remote Time Tracker - Tracking",
      paused: "Remote Time Tracker - Paused",
    };
    tray.setToolTip(tooltips[state] || "Remote Time Tracker");
  } catch (error) {
    console.warn("⚠️ Failed to update tray icon:", error);
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

  // Initialize screenshot service (check dependencies)
  console.log("🔍 Checking screenshot dependencies...");
  const depResult = await screenshotService.initialize();
  if (depResult.allDependenciesMet) {
    console.log("✅ Screenshot dependencies OK");
  } else {
    console.warn(
      "⚠️ Some screenshot dependencies missing:",
      depResult.missingRequired.map((d) => d.name),
    );
  }

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

  ipcMain.handle("time-logs:get-today-total-duration", async (_, userId) => {
    return await dbService.getTodayTotalDuration(userId);
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

  // Screenshot dependency management
  ipcMain.handle("screenshots:get-dependency-status", async () => {
    return screenshotService.getDependencyStatus();
  });

  // Screen capture permission (macOS/Linux)
  ipcMain.handle("screenshots:get-permission-status", async () => {
    const platform = process.platform;

    if (platform === "win32") {
      return { granted: true, status: "not_required", platform };
    }

    if (platform === "darwin") {
      const status = systemPreferences.getMediaAccessStatus("screen");
      return {
        granted: status === "granted",
        status,
        platform,
      };
    }

    // For Linux, we can't really check permission status
    // We just return that we need to test capture
    return {
      granted: true, // Assume granted, actual check happens during capture
      status: "unknown",
      platform,
      message: "Linux permissions are checked during capture",
    };
  });

  ipcMain.handle("screenshots:request-permission", async () => {
    return await ensureScreenCapturePermission();
  });

  ipcMain.handle("screenshots:check-dependencies", async () => {
    return await screenshotService.recheckDependencies();
  });

  ipcMain.handle("screenshots:is-available", async () => {
    return screenshotService.isAvailable();
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

  // Check screen capture permission on app start
  // - If granted: app runs normally, no dialog
  // - If not granted: show dialog to request permission
  const permissionResult = await ensureScreenCapturePermission();
  console.log("🔐 Screen capture permission result:", permissionResult);

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

  // Handle before-quit event for auto-updater and keyboard shortcuts (Cmd+Q, Alt+F4)
  // This is triggered by keyboard shortcuts and system quit commands
  app.on("before-quit", async (event) => {
    console.log(
      "📴 before-quit event, isUpdating:",
      isUpdating,
      "isQuitting:",
      isQuitting,
      "isForceClose:",
      isForceClose,
    );

    // Set force close flag - this indicates the quit was triggered by keyboard shortcut
    // or system command (not by clicking X button)
    isForceClose = true;

    if (isUpdating) {
      console.log("🔄 Allowing quit for update...");
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
        console.error("❌ Error stopping tracking before quit:", error);
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
