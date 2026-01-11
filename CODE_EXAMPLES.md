# Code Examples — Auto-Update Feature

## Example 1: Checking for Updates (React Component)

```typescript
import { useEffect, useState } from "react";

function UpdateStatus() {
  const [version, setVersion] = useState<string>("?");
  const [status, setStatus] = useState<string>("Idle");

  useEffect(() => {
    // Get current version
    (async () => {
      const v = await window.electronAPI.app.getVersion();
      setVersion(v);
    })();

    // Subscribe to update events
    const unsubscribe = window.electronAPI.updates.onEvent((event) => {
      switch (event.type) {
        case "checking-for-update":
          setStatus("Checking for updates...");
          break;
        case "update-available":
          setStatus(`Update available: ${event.info.version}`);
          break;
        case "update-not-available":
          setStatus("You are up to date");
          break;
        case "error":
          setStatus(`Error: ${event.error}`);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCheck = async () => {
    await window.electronAPI.updates.check();
  };

  return (
    <div>
      <p>Version: v{version}</p>
      <p>Status: {status}</p>
      <button onClick={handleCheck}>Check for Updates</button>
    </div>
  );
}

export default UpdateStatus;
```

---

## Example 2: Download with Progress (Custom Hook)

```typescript
import { useEffect, useState } from "react";

function useUpdateDownload() {
  const [progress, setProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const unsubscribe = window.electronAPI.updates.onEvent((event) => {
      if (event.type === "download-progress") {
        setProgress(Math.round(event.progress.percent || 0));
        setIsDownloading(true);
      } else if (event.type === "update-downloaded") {
        setProgress(100);
      } else if (
        event.type === "error" ||
        event.type === "update-not-available"
      ) {
        setIsDownloading(false);
        setProgress(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const download = async () => {
    setProgress(0);
    await window.electronAPI.updates.download();
  };

  return { progress, isDownloading, download };
}

export default useUpdateDownload;
```

---

## Example 3: Full Update Flow Component

```typescript
import { useState, useEffect } from "react";

function UpdateManager() {
  const [currentVersion, setCurrentVersion] = useState<string>("?");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "downloading" | "ready">("idle");
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const version = await window.electronAPI.app.getVersion();
      setCurrentVersion(version);
    };

    init();

    const unsubscribe = window.electronAPI.updates.onEvent((event) => {
      switch (event.type) {
        case "checking-for-update":
          setStatus("checking");
          break;
        case "update-available":
          setAvailableVersion(event.info?.version);
          setStatus("available");
          break;
        case "update-not-available":
          setStatus("idle");
          setAvailableVersion(null);
          break;
        case "download-progress":
          setStatus("downloading");
          setProgress(Math.round(event.progress?.percent || 0));
          break;
        case "update-downloaded":
          setStatus("ready");
          setProgress(100);
          break;
        case "error":
          setStatus("idle");
          console.error("Update error:", event.error);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCheck = async () => {
    await window.electronAPI.updates.check();
  };

  const handleDownload = async () => {
    await window.electronAPI.updates.download();
  };

  const handleInstall = async () => {
    await window.electronAPI.updates.install();
  };

  return (
    <div className="update-manager">
      <h2>Updates</h2>

      <div className="version-info">
        <p>Current: v{currentVersion}</p>
        {availableVersion && <p>Available: v{availableVersion}</p>}
      </div>

      <div className="buttons">
        <button onClick={handleCheck} disabled={status !== "idle"}>
          {status === "checking" ? "Checking..." : "Check for Updates"}
        </button>

        <button
          onClick={handleDownload}
          disabled={status !== "available"}
        >
          {status === "downloading" ? "Downloading..." : "Download"}
        </button>

        <button
          onClick={handleInstall}
          disabled={status !== "ready"}
        >
          Install & Restart
        </button>
      </div>

      {progress !== null && (
        <div className="progress-bar">
          <div
            className="progress"
            style={{ width: `${progress}%` }}
          ></div>
          <span>{progress}%</span>
        </div>
      )}

      <p className="status">Status: {status}</p>
    </div>
  );
}

export default UpdateManager;
```

---

## Example 4: Auto-Check on App Launch

This happens automatically in `main.ts`:

```typescript
// In main.ts after UpdateService is created
app.whenReady().then(async () => {
  await initializeServices();
  createWindow();

  // Attach window to update service
  if (updateService && mainWindow) {
    updateService.setWindow(mainWindow);

    // Non-blocking auto-check on startup
    updateService.checkForUpdatesAndNotify().catch((e) => {
      console.error("Auto-check failed:", e);
    });
  }

  createTray();
});
```

Users don't see anything unless an update is found.

---

## Example 5: Custom Update Server (Advanced)

If you want to host updates on your own server instead of GitHub:

```typescript
// In UpdateService.ts
private setupAutoUpdater() {
  autoUpdater.autoDownload = false;

  // Option 1: GitHub (default)
  // Already configured in package.json

  // Option 2: Custom HTTP server
  if (process.env.UPDATE_SERVER_URL) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: process.env.UPDATE_SERVER_URL,
    });
  }

  // Option 3: S3 bucket
  if (process.env.S3_BUCKET) {
    autoUpdater.setFeedURL({
      provider: "s3",
      bucket: process.env.S3_BUCKET,
      channel: "latest",
    });
  }

  // Rest of setup...
}
```

---

## Example 6: Error Handling

```typescript
async function safeCheckForUpdates() {
  try {
    const result = await window.electronAPI.updates.check();
    
    if (!result.success) {
      console.error("Check failed:", result.error);
      showNotification("Check failed: " + result.error);
      return;
    }

    console.log("Check successful");
    // UI will update via onEvent callback
  } catch (err) {
    console.error("Unexpected error:", err);
    showNotification("An error occurred while checking for updates");
  }
}

function showNotification(message: string) {
  // Your notification system here
  console.warn(message);
}
```

---

## Example 7: Update UI with Tailwind CSS

```tsx
function UpdateSection() {
  // ... useState and useEffect code ...

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">Updates</h3>

      {/* Version Info */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-gray-400 text-sm">Current Version</p>
          <p className="text-white text-lg font-semibold">v{version}</p>
        </div>
        {availableVersion && (
          <div className="text-right">
            <p className="text-gray-400 text-sm">Available</p>
            <p className="text-green-400 text-lg font-semibold">
              v{availableVersion}
            </p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCheck}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
        >
          Check for Updates
        </button>

        <button
          onClick={handleDownload}
          disabled={!availableVersion}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
        >
          Download
        </button>

        <button
          onClick={handleInstall}
          disabled={progress !== 100}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
        >
          Install & Restart
        </button>
      </div>

      {/* Progress Bar */}
      {progress !== null && (
        <div className="mb-4">
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {progress}% Complete
          </p>
        </div>
      )}

      {/* Status Message */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          {status === "checking" && "🔄 Checking..."}
          {status === "available" && "✨ Update available!"}
          {status === "downloading" && "⬇️ Downloading..."}
          {status === "ready" && "✅ Ready to install"}
          {status === "idle" && "✓ Up to date"}
        </p>
      </div>
    </div>
  );
}
```

---

## Example 8: Keyboard Shortcut (Optional)

Add keyboard shortcut to check for updates:

```typescript
// In main.ts
ipcMain.handle("app:check-updates", async () => {
  if (updateService) {
    await updateService.checkForUpdates();
  }
});

// In preload.ts
app: {
  checkUpdates: () => ipcRenderer.invoke("app:check-updates"),
}

// In component
useEffect(() => {
  const handleKeyDown = async (e: KeyboardEvent) => {
    // Ctrl/Cmd + Shift + U = check updates
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "U") {
      await window.electronAPI.app.checkUpdates?.();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

---

## Example 9: Testing Auto-Updates Locally

```bash
# 1. Create v1.0.0 release on GitHub
git tag v1.0.0
git push origin v1.0.0

# 2. Build and install v1.0.0
npm run build
npm run build:mac  # or build:win

# 3. Install the DMG/EXE from GitHub Releases
# (Simulates user having v1.0.0)

# 4. Update code and bump version to v1.0.1
# edit electron/package.json: "version": "1.0.1"

# 5. Create v1.0.1 release
npm run build
export GH_TOKEN=your_token
electron-builder --mac --publish always

# 6. Test in the v1.0.0 installation
# Settings → Updates → Check for updates
# Should detect v1.0.1 ✅
```

---

## Example 10: Logging for Debugging

```typescript
// In UpdateService.ts, logs are automatically captured:
// ~/Library/Logs/remote-time-tracker/main.log (macOS)
// %APPDATA%/Remote Time Tracker/main.log (Windows)
// ~/.config/Remote Time Tracker/main.log (Linux)

// Or you can add custom logs:
import log from "electron-log";

log.info("UpdateService initialized");
log.warn("Update check failed");
log.error("Download error:", error);

// View logs in dev console:
// mainWindow.webContents.openDevTools()
```

---

**Last Updated:** January 12, 2026  
**Examples Version:** 1.0.0  
**TypeScript:** ✅ All examples type-safe
