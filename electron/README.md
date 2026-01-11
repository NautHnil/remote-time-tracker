# Auto-update (Release / Upgrade) — Remote Time Tracker

This document explains how the Electron auto-update mechanism works in this project and how to publish new releases so your users can update from v1.x.y → v1.x.z automatically (or manually via the UI).

## Key points

- We use `electron-updater` (runtime) + `electron-builder` for publishing releases.
- Releases are published to **GitHub Releases** (recommended) via `electron-builder` `publish` configuration in `package.json`.
- On app start we perform a non-blocking check for updates. Users can also check for updates manually via Settings → Updates.

## Configuration steps

1. Set GitHub release target in `electron/package.json` `build.publish`:

   - Replace `YOUR_GITHUB_OWNER` with your GitHub organization or username.
   - Replace `remote-time-tracker` with the repository name.

2. Create a GitHub Personal Access Token with `repo` scope and set it as `GH_TOKEN` in your CI environment (or locally for publishing):

   - Linux/macOS (temporary): `export GH_TOKEN=your_token`
   - CI (GitHub Actions): add `GH_TOKEN` to repo secrets.

3. Publish a release using electron-builder (example for mac):

   - `npm run build && electron-builder --mac --publish always`

   This will build and upload artifacts (dmg, zip) to GitHub Releases. `electron-updater` will look for updates there.

## How auto-updates work in this app

- The main process contains an `UpdateService` that listens to `electron-updater` lifecycle events and forwards them to the renderer via IPC (`update-event`).
- `preload.ts` exposes `window.electronAPI.updates` methods: `check`, `download`, `install` and an `onEvent` subscription. The Settings page exposes a UI for users.
- By default, downloads are manual (app asks to download), and install restarts the app to apply updates. This reduces unexpected restarts.

## Testing updates locally

- The simplest approach is to create two releases on GitHub (v1.0.0 and v1.0.1) and test the update flow with the installed app: the app installed from v1.0.0 should detect v1.0.1 on GitHub and allow download.
- For advanced local testing, you can set a custom update server or host the release files on a static server and configure `autoUpdater.setFeedURL(...)` (not configured by default).

## Notes and caveats

- Code signing is often required for macOS auto-update flows and for Windows (NSIS). Ensure your app is properly signed for full automatic behavior on macOS.
- For private repositories or specific workflows you might prefer an S3/HTTP server or a custom update server.
- The README explains the default GitHub workflow; update as needed for your release pipeline.

## Troubleshooting

- Check application logs for `electron-updater` messages. Errors are forwarded to the renderer for display in Settings.
- If updates are not detected, confirm the `build.publish` fields (`owner`, `repo`) and that artifacts are present on GitHub Releases.

--

If you'd like, I can also add a GitHub Action workflow to automatically publish releases when you push a tag (recommended).