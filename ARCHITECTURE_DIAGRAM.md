# Architecture Diagram — Auto-Update System

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER EXPERIENCE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. App Start → UpdateService auto-checks (background)         │
│  2. User goes to Settings → Updates tab                        │
│  3. User clicks "Check Updates"                                │
│  4. App shows available version (if found)                     │
│  5. User clicks "Download" → Progress bar shows download       │
│  6. When done → Install dialog appears                         │
│  7. User clicks "Install & Restart" → App restarts            │
│  8. App runs with new version ✅                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB RELEASES                              │
│  • v1.0.0 (current)                                            │
│  • v1.0.1 (new)                                                │
│  • Assets: DMG, EXE, AppImage, etc.                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ CheckForUpdates() / DownloadUpdate()
                       │ (HTTPS via electron-updater)
                       ▼
         ┌─────────────────────────────────┐
         │  ELECTRON-UPDATER LIBRARY       │
         │  • Auto-detects latest release  │
         │  • Downloads delta/full updates │
         │  • Verifies signatures          │
         │  • Emits lifecycle events       │
         └──────────┬──────────────────────┘
                    │
              IPC (update-event)
                    │
         ┌──────────▼──────────────┐
         │  MAIN PROCESS           │
         │  (Node.js + Electron)   │
         │                         │
         │ UpdateService           │
         │ • Listens to updater    │
         │ • Routes logs           │
         │ • Sends IPC events      │
         │ • Shows dialogs         │
         │ • Calls install/restart │
         └──────────┬──────────────┘
                    │
              IPC (update-event)
                    │
         ┌──────────▼──────────────────────┐
         │  RENDERER (React)                │
         │  Settings Component              │
         │                                  │
         │ UpdateSection                    │
         │ • Shows version                  │
         │ • Displays status                │
         │ • Check/Download/Install buttons │
         │ • Progress bar                   │
         │ • Listens to IPC events          │
         └─────────────────────────────────┘
```

## File Structure

```
electron/
│
├── package.json
│   └── "electron-updater": "^6.1.1"
│   └── "publish": { "provider": "github", ... }
│
├── src/main/
│   │
│   ├── main.ts
│   │   ├── import UpdateService
│   │   ├── new UpdateService(mainWindow)
│   │   ├── updateService.checkForUpdatesAndNotify()
│   │   └── ipcMain.handle("update:*")
│   │
│   ├── preload.ts
│   │   └── contextBridge.exposeInMainWorld("electronAPI", {
│   │       └── updates: {
│   │           ├── check()
│   │           ├── download()
│   │           ├── install()
│   │           └── onEvent(callback)
│   │       }
│   │   })
│   │
│   └── services/
│       └── UpdateService.ts
│           ├── constructor(mainWindow)
│           ├── setWindow(win)
│           ├── checkForUpdates()
│           ├── downloadUpdate()
│           ├── installAndRestart()
│           └── setupAutoUpdater()
│               └── listens to 6 event types
│
└── src/renderer/
    └── components/
        └── Settings.tsx
            └── UpdateSection
                ├── useState(version, status, progress)
                ├── useEffect(() => subscribeToEvents)
                ├── handleCheck()
                ├── handleDownload()
                └── handleInstall()
```

## IPC Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  RENDERER → MAIN (User Actions)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ipcRenderer.invoke("update:check")                         │
│     → UpdateService.checkForUpdates()                          │
│     → autoUpdater.checkForUpdates()                            │
│     → GitHub API (check releases)                             │
│                                                                 │
│  2. ipcRenderer.invoke("update:download")                      │
│     → UpdateService.downloadUpdate()                           │
│     → autoUpdater.downloadUpdate()                             │
│     → Download to local cache                                 │
│                                                                 │
│  3. ipcRenderer.invoke("update:install")                       │
│     → UpdateService.installAndRestart()                        │
│     → autoUpdater.quitAndInstall()                             │
│     → Apply update + Restart                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  MAIN → RENDERER (Status Updates)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  mainWindow.webContents.send("update-event", event)           │
│                                                                 │
│  Event Types:                                                  │
│  • { type: "checking-for-update" }                            │
│  • { type: "update-available", info }                         │
│  • { type: "update-not-available" }                           │
│  • { type: "download-progress", progress }                    │
│  • { type: "update-downloaded", info }                        │
│  • { type: "error", error }                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Event Lifecycle

```
User Action: Click "Check for Updates"
    │
    ▼
ipcRenderer.invoke("update:check")
    │
    ▼
UpdateService.checkForUpdates()
    │
    ├─► send("checking-for-update")
    │   → UI shows "Checking..."
    │
    ▼
autoUpdater.checkForUpdates()
    │
    ├─► Found new version?
    │   │
    │   ├─ YES → emit("update-available")
    │   │        send("update-available", info)
    │   │        → UI shows "v1.0.1 available"
    │   │
    │   └─ NO  → emit("update-not-available")
    │           send("update-not-available")
    │           → UI shows "Up to date"
    │
    ▼
(Complete)

────────────────────────────────

User Action: Click "Download"
    │
    ▼
ipcRenderer.invoke("update:download")
    │
    ▼
UpdateService.downloadUpdate()
    │
    ├─► send("download-progress")
    │   → UI updates progress bar
    │
    ├─► (downloading...)
    │
    ▼
autoUpdater.on("update-downloaded")
    │
    ├─► send("update-downloaded", info)
    │
    ├─► dialog.showMessageBox()
    │   "Install and Restart?"
    │
    ├─► User clicks "Yes"
    │   → autoUpdater.quitAndInstall()
    │   → App restarts with new version

────────────────────────────────

App Start (Automatic)
    │
    ├─► UpdateService.checkForUpdatesAndNotify()
    │   (non-blocking, runs in background)
    │
    └─► Update check happens silently
        If found: User gets notification in UI
```

## State Machine

```
                    ┌─────────────────────────────────────┐
                    │  IDLE (App running normally)        │
                    │  • Waiting for user action           │
                    │  • Ready to check updates            │
                    └──┬──────────────────────────────────┘
                       │
          User clicks "Check Updates"
                       │
                       ▼
             ┌──────────────────────┐
             │ CHECKING             │
             │ for updates on       │
             │ GitHub               │
             └──┬──────────────────┘
                │
         ┌──────┴───────┐
         │              │
    Found│              │ Not Found
     New │              │
     Ver │              │
         ▼              ▼
    ┌─────────┐    ┌──────────────┐
    │ READY   │    │ UP TO DATE   │
    │ TO      │    │ Show message │
    │DOWNLOAD │    └──────────────┘
    └────┬────┘           ▲
         │                │
    User clicks        Return to
    "Download"        IDLE
         │
         ▼
    ┌──────────────┐
    │ DOWNLOADING  │
    │ Show progress│
    └────┬─────────┘
         │
         ▼
    ┌─────────────────┐
    │ READY TO INSTALL│
    │ Show dialog     │
    └────┬────────────┘
         │
    User clicks
    "Install &
     Restart"
         │
         ▼
    ┌──────────────────────┐
    │ INSTALLING           │
    │ App closes           │
    │ Update applied       │
    │ App restarts         │
    └────────────┬─────────┘
                 │
                 ▼
          ┌──────────────┐
          │ NEW VERSION  │
          │ RUNNING      │
          └──────────────┘
```

---

**Created:** January 12, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
