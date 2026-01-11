# Auto-Update / Upgrade Implementation Guide

## Overview

This guide explains how the auto-update feature works in Remote Time Tracker and how to test it locally or release updates to your users.

## What's New

The Electron app now has:
- **Auto-updater service** using `electron-updater` library
- **GitHub Releases** as the update source (recommended)
- **Settings UI** to check for updates, download, and install
- **IPC communication** between main and renderer processes for update events
- **Automatic check on app start** (non-blocking) + manual check in Settings

## Architecture

```
┌─────────────────────────────────────────┐
│  UpdateService (main process)           │
│  • Wraps electron-updater               │
│  • Listens to update lifecycle events   │
│  • Sends IPC events to renderer         │
│  • Shows install dialog when done       │
└──────────────┬──────────────────────────┘
               │
               │ IPC: update-event
               ▼
┌─────────────────────────────────────────┐
│  Renderer (React)                       │
│  • Settings → Updates tab               │
│  • Shows current version                │
│  • Check/Download/Install buttons       │
│  • Displays progress bar                │
└─────────────────────────────────────────┘
```

## Implementation Steps

### 1. Configure GitHub Repository

Set up your GitHub repo to host releases:

```bash
# Update electron/package.json with your repository
"build": {
  "publish": [
    {
      "provider": "github",
      "owner": "YOUR_GITHUB_OWNER",      # e.g., "beuphecan"
      "repo": "remote-time-tracker"
    }
  ]
}
```

### 2. Get GitHub Personal Access Token

Create a token on GitHub (Settings → Developer settings → Personal access tokens → Tokens (classic)):
- Select scope: `repo` (full control of private repositories)
- Copy the token

### 3. Release a New Version

#### Option A: Manual Release (Local Machine)

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Set GitHub token (temporary)
export GH_TOKEN=your_github_token_here

# Release for macOS (publishes to GitHub Releases)
electron-builder --mac --publish always

# Or release for Windows
electron-builder --win --publish always

# Or release for Linux
electron-builder --linux --publish always
```

The artifacts will be uploaded to GitHub Releases automatically.

#### Option B: Automated Release (GitHub Actions)

Create `.github/workflows/release.yml`:

```yaml
name: Release App

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        working-directory: ./electron
        run: |
          npm install
          npm run build
      
      - name: Release
        working-directory: ./electron
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: electron-builder --publish always
```

Then push a tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will automatically build and release.

## Test Auto-Updates Locally

### Scenario: Upgrade from v1.0.0 → v1.0.1

1. **Create two GitHub releases:**
   - Release v1.0.0 with the current build
   - Release v1.0.1 with your updated code

2. **Install v1.0.0** from the first release

3. **Open Settings → Updates**:
   - Click "Check for updates"
   - App should detect v1.0.1
   - Click "Download" to download
   - Click "Install & Restart" to apply

4. **Verify the app restarted** with v1.0.1

### Advanced Local Testing (Custom Server)

For advanced testing, you can point to a local HTTP server or custom server:

```typescript
// In UpdateService.ts setupAutoUpdater()
if (process.env.CUSTOM_UPDATE_URL) {
  autoUpdater.setFeedURL(process.env.CUSTOM_UPDATE_URL);
}
```

## Key Files Modified

- `electron/package.json` — Added `electron-updater`, `electron-log`, and GitHub `publish` config
- `electron/src/main/services/UpdateService.ts` — New service wrapping electron-updater
- `electron/src/main/main.ts` — Wired UpdateService into app lifecycle and IPC
- `electron/src/main/preload.ts` — Exposed update APIs (`window.electronAPI.updates`)
- `electron/src/renderer/components/Settings.tsx` — Added UpdateSection component
- `electron/README.md` — Documentation for releases

## Usage in UI

**Settings → Updates:**

```
┌────────────────────────────────┐
│ Current Version: v1.0.0         │
│ Status: Up to date              │
├────────────────────────────────┤
│ [Check] [Download] [Install]    │
│                                │
│ Progress: ████████░░ 75%        │
│                                │
│ New version available: v1.0.1   │
└────────────────────────────────┘
```

## IPC API

### Methods

```typescript
window.electronAPI.updates.check()          // Checks for updates (non-blocking)
window.electronAPI.updates.download()       // Downloads available update
window.electronAPI.updates.install()        // Installs and restarts app
window.electronAPI.app.getVersion()         // Gets current app version
```

### Events

```typescript
window.electronAPI.updates.onEvent((event) => {
  switch (event.type) {
    case "checking-for-update":     // Checking started
    case "update-available":        // Update found (event.info.version)
    case "update-not-available":    // Up to date
    case "download-progress":       // Downloading (event.progress.percent)
    case "update-downloaded":       // Downloaded, ready to install
    case "error":                   // Error occurred (event.error)
  }
});
```

## Troubleshooting

### Update not detected

- Check `build.publish` config has correct `owner` and `repo`
- Verify releases are on GitHub Releases (not Draft)
- Check logs: `/Users/xxx/Library/Logs/electron-builder.log` (macOS)
- Ensure version in `package.json` is less than release version

### Download fails

- Check network connection
- Verify GH_TOKEN was set during build
- Check GitHub rate limits (60 requests/hour public, 5000/hour authenticated)

### Install doesn't restart app

- Code signing issues on macOS (may require certificate)
- Windows NSIS installer requirements
- Check electron logs for specific error

## Next Steps (Optional)

1. **Add update notifications** — Show banner when update is available
2. **Delta updates** — Download only changed files (reduce bandwidth)
3. **Staged rollout** — Release to 10% of users first, then 100%
4. **Custom update server** — Self-host releases instead of GitHub

## References

- [electron-updater docs](https://www.electron.build/auto-update)
- [electron-builder docs](https://www.electron.build)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)

---

**Last Updated:** January 12, 2026  
**Version:** 1.0.0
