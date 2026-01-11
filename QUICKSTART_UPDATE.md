# ⚡ Quick Start — Auto-Update Feature

## For the Impatient 😄

### What you got
✅ Complete auto-update system for Electron  
✅ Check for updates in Settings  
✅ Download & install with one click  
✅ Automatic checks on app start  
✅ Production-ready code  

### To use it right now

1. **Update `electron/package.json` line ~85:**
   ```json
   "owner": "YOUR_GITHUB_USERNAME"   // your GitHub account
   ```

2. **Get GitHub token:**
   - GitHub → Settings → Developer settings → Personal access tokens
   - Create token (scope: `repo`)
   - Copy token value

3. **Test release:**
   ```bash
   cd electron
   npm install   # Already done
   export GH_TOKEN=your_token_here
   npm run release
   ```

4. **Install first release:**
   - Download DMG/EXE from GitHub Releases
   - Install app (this is v1.0.0)

5. **Test update:**
   - Change code
   - Update version in `electron/package.json` (→ v1.0.1)
   - Run `npm run release` again
   - Open Settings → Updates → Check for updates
   - Download and install v1.0.1

Done! 🎉

---

## What Files Changed?

```
electron/
├── package.json                    // Added deps + publish config
├── src/main/
│   ├── main.ts                     // Added UpdateService setup + IPC
│   ├── preload.ts                  // Added updates API
│   └── services/
│       └── UpdateService.ts        // NEW: Update service
└── src/renderer/
    └── components/
        └── Settings.tsx            // Added UpdateSection component

Project Root/
├── UPGRADE_GUIDE.md                // Complete guide
├── IMPLEMENTATION_SUMMARY.md       // What was done
└── AUTO_UPDATE_CHECKLIST.md        // Detailed checklist
```

---

## How Users See It

**Settings → Updates Tab:**

```
┌──────────────────────────────────┐
│ UPDATES                          │
├──────────────────────────────────┤
│ Current: v1.0.0                  │
│ Status: Up to date               │
│                                  │
│ [Check Updates] [Download] [Install] │
│                                  │
│ ████████████░░░░░░░░ 65%         │
│ New version available: v1.0.1    │
└──────────────────────────────────┘
```

---

## Troubleshooting

**Q: Updates not detected?**  
A: Check `build.publish.owner` in package.json matches your GitHub username

**Q: Download fails?**  
A: Verify `GH_TOKEN` is set and releases exist on GitHub

**Q: App doesn't restart?**  
A: May require code signing on macOS; works on Windows/Linux by default

---

## Documentation

- 📖 Full guide: `UPGRADE_GUIDE.md`
- ✅ Checklist: `AUTO_UPDATE_CHECKLIST.md`
- 📝 Details: `electron/README.md`
- 🎯 Summary: `IMPLEMENTATION_SUMMARY.md`

---

## Code Examples

### In React component:
```typescript
// Check for updates
const result = await window.electronAPI.updates.check();

// Listen to events
const unsub = window.electronAPI.updates.onEvent((event) => {
  if (event.type === "update-available") {
    console.log("New version:", event.info.version);
  }
});
```

### From terminal:
```bash
# Check what version you have
npm run build
electron .

# Then open Settings → Updates
```

---

## Status

| Item | Status |
|------|--------|
| Code | ✅ Ready |
| Tests | ✅ Passed |
| Docs | ✅ Complete |
| Config | ⚠️ TODO: Update GitHub owner |

---

That's it! Questions? See the full docs. 🚀
